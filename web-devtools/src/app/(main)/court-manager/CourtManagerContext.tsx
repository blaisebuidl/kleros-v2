"use client";
import React, { createContext, useContext, useState, useMemo, useCallback, type ReactNode } from "react";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { type Address, formatEther } from "viem";

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
        message: `minStake (${formatEther(params.minStake)} ETH) must be ≥ parent court's minStake (${formatEther(parent.params.minStake)} ETH)`,
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
        message: `minStake (${formatEther(params.minStake)} ETH) must be ≤ child court "${childId}" minStake (${formatEther(child.params.minStake)} ETH)`,
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
  courts: Map<number, CourtNode>;
  selectedCourtId: number | null;
  selectCourt: (id: number) => void;
  isLoading: boolean;
  isOwner: boolean;
  ownerAddress: Address | undefined;
  pendingChanges: PendingChange[];
  addPendingChange: (change: PendingChange) => void;
  clearPendingChanges: () => void;
  validationErrors: ValidationError[];
}

const CourtManagerContext = createContext<CourtManagerContextType>({
  courts: new Map(),
  selectedCourtId: null,
  selectCourt: () => {},
  isLoading: true,
  isOwner: false,
  ownerAddress: undefined,
  pendingChanges: [],
  addPendingChange: () => {},
  clearPendingChanges: () => {},
  validationErrors: [],
});

export const useCourtManager = () => useContext(CourtManagerContext);

// --- Provider ---

interface CourtManagerProviderProps {
  children: ReactNode;
}

export const CourtManagerProvider: React.FC<CourtManagerProviderProps> = ({ children }) => {
  const { address } = useAccount();
  const [selectedCourtId, setSelectedCourtId] = useState<number | null>(1); // Default to General Court
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);

  // TODO: Replace with actual wagmi contract reads once hooks are generated
  // For now, this is the structure. The actual implementation will use:
  // - useReadContract for KlerosCore.owner()
  // - useReadContract for KlerosCore.courts(id) for each court
  // - useReadContract for KlerosCore.getTimesPerPeriod(id)
  // - useReadContract for PolicyRegistry.policies(id)

  const courts = useMemo(() => new Map<number, CourtNode>(), []);
  const isLoading = false;
  const isOwner = false;
  const ownerAddress = undefined as Address | undefined;

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

  const validationErrors = useMemo(() => {
    const errors: ValidationError[] = [];
    for (const [, court] of courts) {
      errors.push(...validateCourtParams(court, courts));
    }
    return errors;
  }, [courts]);

  const value = useMemo(
    () => ({
      courts,
      selectedCourtId,
      selectCourt,
      isLoading,
      isOwner,
      ownerAddress,
      pendingChanges,
      addPendingChange,
      clearPendingChanges,
      validationErrors,
    }),
    [courts, selectedCourtId, selectCourt, isLoading, isOwner, ownerAddress, pendingChanges, addPendingChange, clearPendingChanges, validationErrors]
  );

  return <CourtManagerContext.Provider value={value}>{children}</CourtManagerContext.Provider>;
};
