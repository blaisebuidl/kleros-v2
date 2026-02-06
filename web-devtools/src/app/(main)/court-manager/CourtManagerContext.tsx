"use client";
import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { useAccount, useReadContract, useReadContracts, usePublicClient } from "wagmi";
import { type Address, formatEther, encodeFunctionData, type Hex } from "viem";

import {
  getKlerosCoreAddress,
  getPolicyRegistryAddress,
  getChainId,
  klerosCoreCourtsAbi,
  policyRegistryAbi,
  ownerAbi,
  governorAbi,
  createSafeTransaction,
  createSafeTransactionBatch,
  type SafeTransaction,
  type CourtData,
  type TimesPerPeriod,
} from "./contracts";
import { getDeployment, type Deployment } from "consts/index";

// --- Types ---

export interface CourtParams {
  parent: number;
  hiddenVotes: boolean;
  minStake: bigint;
  alpha: bigint;
  feeForJuror: bigint;
  jurorsForCourtJump: bigint;
  disabled: boolean;
}

export interface CourtTimePeriods {
  evidence: bigint;
  commit: bigint;
  vote: bigint;
  appeal: bigint;
}

export interface CourtPolicy {
  name: string;
  uri: string;
}

export interface CourtNode {
  id: number;
  params: CourtParams;
  timePeriods: CourtTimePeriods;
  policy?: CourtPolicy;
  children: number[];
}

export interface PendingChange {
  courtId: number;
  field: string;
  oldValue: string;
  newValue: string;
}

export interface ValidationError {
  courtId: number;
  field: string;
  message: string;
  severity: "error" | "warning";
}

// --- Validation ---

export function validateCourtParams(
  court: CourtNode,
  allCourts: Map<number, CourtNode>,
  pendingEdits?: Partial<CourtParams>
): ValidationError[] {
  const errors: ValidationError[] = [];
  const params = { ...court.params, ...pendingEdits };

  // minStake >= parent.minStake (unless General Court, id=1, which is self-parent)
  if (court.id !== 1) {
    const parent = allCourts.get(court.params.parent);
    if (parent && params.minStake < parent.params.minStake) {
      errors.push({
        courtId: court.id,
        field: "minStake",
        message: `minStake (${formatEther(params.minStake)} PNK) must be ≥ parent court's minStake (${formatEther(parent.params.minStake)} PNK)`,
        severity: "error",
      });
    }
  }

  // minStake <= min(children.minStake)
  for (const childId of court.children) {
    const child = allCourts.get(childId);
    if (child && params.minStake > child.params.minStake) {
      errors.push({
        courtId: court.id,
        field: "minStake",
        message: `minStake (${formatEther(params.minStake)} PNK) must be ≤ child court #${childId} minStake (${formatEther(child.params.minStake)} PNK)`,
        severity: "error",
      });
    }
  }

  // alpha ∈ [0, 10000] (basis points)
  if (params.alpha < 0n || params.alpha > 10000n) {
    errors.push({
      courtId: court.id,
      field: "alpha",
      message: "alpha must be between 0 and 10000 (basis points)",
      severity: "error",
    });
  }

  // timesPerPeriod > 0
  const times = court.timePeriods;
  if (times.evidence === 0n || times.commit === 0n || times.vote === 0n || times.appeal === 0n) {
    errors.push({
      courtId: court.id,
      field: "timesPerPeriod",
      message: "All time periods must be greater than 0",
      severity: "error",
    });
  }

  // feeForJuror > 0
  if (params.feeForJuror === 0n) {
    errors.push({
      courtId: court.id,
      field: "feeForJuror",
      message: "feeForJuror should be greater than 0",
      severity: "warning",
    });
  }

  // jurorsForCourtJump > 0
  if (params.jurorsForCourtJump === 0n) {
    errors.push({
      courtId: court.id,
      field: "jurorsForCourtJump",
      message: "jurorsForCourtJump should be greater than 0",
      severity: "warning",
    });
  }

  return errors;
}

// --- Context ---

interface CourtManagerContextType {
  // Data
  courts: Map<number, CourtNode>;
  selectedCourtId: number | null;
  selectCourt: (id: number) => void;
  
  // Loading states
  isLoading: boolean;
  error: string | null;
  
  // Chain/deployment info
  deployment: Deployment;
  expectedChainId: number;
  isCorrectChain: boolean;
  
  // Owner info
  isOwner: boolean;
  ownerAddress: Address | undefined;
  isOwnerMultisig: boolean;
  
  // Editing
  pendingChanges: PendingChange[];
  addPendingChange: (change: PendingChange) => void;
  clearPendingChanges: () => void;
  
  // Validation
  validationErrors: ValidationError[];
  
  // Actions
  buildChangeCourtTx: (courtId: number, params: Partial<CourtParams & CourtTimePeriods>) => SafeTransaction | null;
  exportSafeBatch: (transactions: SafeTransaction[], name: string) => void;
  
  // Contract info
  klerosCorAddress: Address;
  policyRegistryAddress: Address;
}

const CourtManagerContext = createContext<CourtManagerContextType | null>(null);

export const useCourtManager = () => {
  const ctx = useContext(CourtManagerContext);
  if (!ctx) throw new Error("useCourtManager must be used within CourtManagerProvider");
  return ctx;
};

// --- Provider ---

// Number of courts to fetch (hardcoded for now, could be dynamic)
const MAX_COURTS = 30;

interface CourtManagerProviderProps {
  children: ReactNode;
}

export const CourtManagerProvider: React.FC<CourtManagerProviderProps> = ({ children }) => {
  const { address, chainId: walletChainId } = useAccount();
  const publicClient = usePublicClient();
  const [selectedCourtId, setSelectedCourtId] = useState<number | null>(1);
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);
  const [isOwnerMultisig, setIsOwnerMultisig] = useState(false);

  // --- Deployment-specific addresses ---
  const klerosCorAddress = useMemo(() => getKlerosCoreAddress(), []);
  const policyRegistryAddress = useMemo(() => getPolicyRegistryAddress(), []);
  const expectedChainId = useMemo(() => getChainId(), []);
  const deployment = useMemo(() => getDeployment(), []);

  // Debug logging
  useEffect(() => {
    console.log("[CourtManager] Config:", {
      deployment,
      klerosCorAddress,
      policyRegistryAddress,
      expectedChainId,
      walletChainId,
      envDeployment: process.env.NEXT_PUBLIC_DEPLOYMENT,
    });
  }, [deployment, klerosCorAddress, policyRegistryAddress, expectedChainId, walletChainId]);

  // Check if wallet is on the correct chain for this deployment
  const isCorrectChain = walletChainId === expectedChainId;

  // --- Contract Reads ---

  // Get KlerosCore owner (try "owner" first, fall back to "governor" for beta)
  const { data: klerosOwnerNew } = useReadContract({
    address: klerosCorAddress,
    abi: ownerAbi,
    functionName: "owner",
  });

  const { data: klerosOwnerLegacy } = useReadContract({
    address: klerosCorAddress,
    abi: governorAbi,
    functionName: "governor",
  });

  // Use whichever one returns a valid address
  const klerosOwner = klerosOwnerNew || klerosOwnerLegacy;

  // Get PolicyRegistry owner (same pattern)
  const { data: policyOwnerNew } = useReadContract({
    address: policyRegistryAddress,
    abi: ownerAbi,
    functionName: "owner",
  });

  const { data: policyOwnerLegacy } = useReadContract({
    address: policyRegistryAddress,
    abi: governorAbi,
    functionName: "governor",
  });

  const policyOwner = policyOwnerNew || policyOwnerLegacy;

  // Batch read all courts (0 to MAX_COURTS)
  const courtReads = useMemo(
    () =>
      Array.from({ length: MAX_COURTS }, (_, i) => ({
        address: klerosCorAddress,
        abi: klerosCoreCourtsAbi,
        functionName: "courts" as const,
        args: [BigInt(i)],
      })),
    [klerosCorAddress]
  );

  const { data: courtsData, isLoading: courtsLoading, error: courtsError } = useReadContracts({
    contracts: courtReads,
  });

  // Batch read time periods for all courts
  const timeReads = useMemo(
    () =>
      Array.from({ length: MAX_COURTS }, (_, i) => ({
        address: klerosCorAddress,
        abi: klerosCoreCourtsAbi,
        functionName: "getTimesPerPeriod" as const,
        args: [i],
      })),
    [klerosCorAddress]
  );

  const { data: timesData, isLoading: timesLoading } = useReadContracts({
    contracts: timeReads,
  });

  // Batch read policies for all courts
  const policyReads = useMemo(
    () =>
      Array.from({ length: MAX_COURTS }, (_, i) => ({
        address: policyRegistryAddress,
        abi: policyRegistryAbi,
        functionName: "policies" as const,
        args: [BigInt(i)],
      })),
    [policyRegistryAddress]
  );

  const { data: policiesData, isLoading: policiesLoading } = useReadContracts({
    contracts: policyReads,
  });

  // Check if owner is a multisig (contract)
  useEffect(() => {
    const checkOwnerType = async () => {
      if (!publicClient || !klerosOwner) return;
      try {
        const code = await publicClient.getCode({ address: klerosOwner as Address });
        setIsOwnerMultisig(code !== undefined && code !== "0x" && code.length > 2);
      } catch {
        setIsOwnerMultisig(false);
      }
    };
    checkOwnerType();
  }, [publicClient, klerosOwner]);

  // --- Build Courts Map ---

  // Debug logging for courts data
  useEffect(() => {
    console.log("[CourtManager] Courts data:", {
      courtsData: courtsData?.slice(0, 5), // First 5 courts
      courtsLoading,
      courtsError,
    });
  }, [courtsData, courtsLoading, courtsError]);

  const courts = useMemo(() => {
    const map = new Map<number, CourtNode>();
    if (!courtsData) return map;

    // First pass: create all court nodes
    for (let i = 0; i < courtsData.length; i++) {
      const result = courtsData[i];
      if (result.status !== "success" || !result.result) continue;

      const data = result.result as unknown as [bigint, boolean, bigint, bigint, bigint, bigint, boolean];
      const [parent, hiddenVotes, minStake, alpha, feeForJuror, jurorsForCourtJump, disabled] = data;

      // Skip courts that don't exist (parent = 0 for uninitialized)
      if (i !== 0 && parent === 0n) continue;

      const timeResult = timesData?.[i];
      const times =
        timeResult?.status === "success" && timeResult.result
          ? (timeResult.result as unknown as [bigint, bigint, bigint, bigint])
          : [0n, 0n, 0n, 0n];

      const policyResult = policiesData?.[i];
      const policyUri =
        policyResult?.status === "success" && policyResult.result
          ? (policyResult.result as string)
          : "";

      map.set(i, {
        id: i,
        params: {
          parent: Number(parent),
          hiddenVotes,
          minStake,
          alpha,
          feeForJuror,
          jurorsForCourtJump,
          disabled,
        },
        timePeriods: {
          evidence: times[0],
          commit: times[1],
          vote: times[2],
          appeal: times[3],
        },
        policy: policyUri ? { name: `Court #${i}`, uri: policyUri } : undefined,
        children: [],
      });
    }

    // Second pass: populate children arrays
    for (const [id, court] of map) {
      if (id !== court.params.parent) {
        const parent = map.get(court.params.parent);
        if (parent) {
          parent.children.push(id);
        }
      }
    }

    return map;
  }, [courtsData, timesData, policiesData]);

  // --- Computed values ---

  const isLoading = courtsLoading || timesLoading || policiesLoading;
  const error = courtsError ? courtsError.message : null;
  const isOwner = !!address && !!klerosOwner && address.toLowerCase() === klerosOwner.toLowerCase();

  const validationErrors = useMemo(() => {
    const errors: ValidationError[] = [];
    for (const [, court] of courts) {
      errors.push(...validateCourtParams(court, courts));
    }
    return errors;
  }, [courts]);

  // --- Actions ---

  const selectCourt = useCallback((id: number) => {
    setSelectedCourtId(id);
  }, []);

  const addPendingChange = useCallback((change: PendingChange) => {
    setPendingChanges((prev) => {
      const existing = prev.findIndex((c) => c.courtId === change.courtId && c.field === change.field);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = change;
        return updated;
      }
      return [...prev, change];
    });
  }, []);

  const clearPendingChanges = useCallback(() => {
    setPendingChanges([]);
  }, []);

  const buildChangeCourtTx = useCallback(
    (courtId: number, params: Partial<CourtParams & CourtTimePeriods>): SafeTransaction | null => {
      const court = courts.get(courtId);
      if (!court) return null;

      const data = encodeFunctionData({
        abi: klerosCoreCourtsAbi,
        functionName: "changeCourtParameters",
        args: [
          courtId,
          params.hiddenVotes ?? court.params.hiddenVotes,
          params.minStake ?? court.params.minStake,
          params.alpha ?? court.params.alpha,
          params.feeForJuror ?? court.params.feeForJuror,
          params.jurorsForCourtJump ?? court.params.jurorsForCourtJump,
          [
            params.evidence ?? court.timePeriods.evidence,
            params.commit ?? court.timePeriods.commit,
            params.vote ?? court.timePeriods.vote,
            params.appeal ?? court.timePeriods.appeal,
          ],
        ],
      });

      return createSafeTransaction({
        to: klerosCorAddress,
        data,
      });
    },
    [courts, klerosCorAddress]
  );

  const exportSafeBatch = useCallback(
    (transactions: SafeTransaction[], name: string) => {
      if (!expectedChainId || !klerosOwner || !address) return;

      const batch = createSafeTransactionBatch({
        name,
        chainId: expectedChainId,
        safeAddress: klerosOwner,
        creatorAddress: address,
        transactions,
      });

      // Download as JSON file
      const blob = new Blob([JSON.stringify(batch, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${name.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    [expectedChainId, klerosOwner, address]
  );

  // --- Context Value ---

  const value = useMemo(
    () => ({
      // Data
      courts,
      selectedCourtId,
      selectCourt,
      
      // Loading/error states
      isLoading,
      error,
      
      // Chain/deployment info
      deployment,
      expectedChainId,
      isCorrectChain,
      
      // Owner info
      isOwner,
      ownerAddress: klerosOwner as Address | undefined,
      isOwnerMultisig,
      
      // Editing
      pendingChanges,
      addPendingChange,
      clearPendingChanges,
      
      // Validation
      validationErrors,
      
      // Actions
      buildChangeCourtTx,
      exportSafeBatch,
      
      // Contract addresses (for display/debugging)
      klerosCorAddress,
      policyRegistryAddress,
    }),
    [
      courts,
      selectedCourtId,
      selectCourt,
      isLoading,
      error,
      deployment,
      expectedChainId,
      isCorrectChain,
      isOwner,
      klerosOwner,
      isOwnerMultisig,
      pendingChanges,
      addPendingChange,
      clearPendingChanges,
      validationErrors,
      buildChangeCourtTx,
      exportSafeBatch,
      klerosCorAddress,
      policyRegistryAddress,
    ]
  );

  return <CourtManagerContext.Provider value={value}>{children}</CourtManagerContext.Provider>;
};
