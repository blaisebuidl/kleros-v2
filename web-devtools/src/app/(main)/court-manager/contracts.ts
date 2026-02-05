/**
 * Contract ABIs and addresses for Court Manager
 * 
 * These are extracted from the deployment files to avoid full wagmi generate.
 * For production, consider using generated hooks from wagmi.config.ts
 */

import { arbitrum, arbitrumSepolia } from "viem/chains";
import { isProductionDeployment } from "consts/index";

// --- Addresses ---

export const KLEROS_CORE_ADDRESS = isProductionDeployment()
  ? "0x991d2df165670b9cac3B022f4B68D65b664222ea" // Arbitrum Mainnet
  : "0x33d0b8879368acD8ca868e656Ade97bB97b90468" as const; // Arbitrum Sepolia

export const POLICY_REGISTRY_ADDRESS = isProductionDeployment()
  ? "0x553dcbF6aB3aE06a1064b5200Df1B5A9fB403d3c" // Arbitrum Mainnet
  : "0x88954e4cC5B4f2A2E6EA1e77C92eA381eEDF5d0E" as const; // Arbitrum Sepolia

// --- ABIs ---

// Common owner function ABI (used by both contracts)
export const ownerAbi = [
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// KlerosCore ABI for court management
export const klerosCoreCourtsAbi = [
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "courts",
    outputs: [
      { internalType: "uint96", name: "parent", type: "uint96" },
      { internalType: "bool", name: "hiddenVotes", type: "bool" },
      { internalType: "uint256", name: "minStake", type: "uint256" },
      { internalType: "uint256", name: "alpha", type: "uint256" },
      { internalType: "uint256", name: "feeForJuror", type: "uint256" },
      { internalType: "uint256", name: "jurorsForCourtJump", type: "uint256" },
      { internalType: "bool", name: "disabled", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint96", name: "_courtID", type: "uint96" }],
    name: "getTimesPerPeriod",
    outputs: [
      { internalType: "uint256[4]", name: "timesPerPeriod", type: "uint256[4]" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint96", name: "_courtID", type: "uint96" },
      { internalType: "bool", name: "_hiddenVotes", type: "bool" },
      { internalType: "uint256", name: "_minStake", type: "uint256" },
      { internalType: "uint256", name: "_alpha", type: "uint256" },
      { internalType: "uint256", name: "_feeForJuror", type: "uint256" },
      { internalType: "uint256", name: "_jurorsForCourtJump", type: "uint256" },
      { internalType: "uint256[4]", name: "_timesPerPeriod", type: "uint256[4]" },
    ],
    name: "changeCourtParameters",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint96", name: "_parent", type: "uint96" },
      { internalType: "bool", name: "_hiddenVotes", type: "bool" },
      { internalType: "uint256", name: "_minStake", type: "uint256" },
      { internalType: "uint256", name: "_alpha", type: "uint256" },
      { internalType: "uint256", name: "_feeForJuror", type: "uint256" },
      { internalType: "uint256", name: "_jurorsForCourtJump", type: "uint256" },
      { internalType: "uint256[4]", name: "_timesPerPeriod", type: "uint256[4]" },
      { internalType: "bytes", name: "_sortitionExtraData", type: "bytes" },
      { internalType: "uint256[]", name: "_supportedDisputeKits", type: "uint256[]" },
    ],
    name: "createCourt",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  ...ownerAbi,
] as const;

// PolicyRegistry ABI
export const policyRegistryAbi = [
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "policies",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_courtID", type: "uint256" },
      { internalType: "string", name: "_courtName", type: "string" },
      { internalType: "string", name: "_policy", type: "string" },
    ],
    name: "setPolicy",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  ...ownerAbi,
] as const;

// --- Types ---

export interface CourtData {
  parent: bigint;
  hiddenVotes: boolean;
  minStake: bigint;
  alpha: bigint;
  feeForJuror: bigint;
  jurorsForCourtJump: bigint;
  disabled: boolean;
}

export type TimesPerPeriod = readonly [bigint, bigint, bigint, bigint];

// --- Safe Transaction Builder ---

export interface SafeTransaction {
  to: string;
  value: string;
  data: string;
  contractMethod: null;
  contractInputsValues: null;
}

export interface SafeTransactionBatch {
  version: string;
  chainId: string;
  createdAt: number;
  meta: {
    name: string;
    description: string;
    txBuilderVersion: string;
    createdFromSafeAddress: string;
    createdFromOwnerAddress: string;
  };
  transactions: SafeTransaction[];
}

export const createSafeTransactionBatch = ({
  name,
  chainId,
  safeAddress,
  creatorAddress,
  transactions,
}: {
  name: string;
  chainId: number;
  safeAddress: string;
  creatorAddress: string;
  transactions: SafeTransaction[];
}): SafeTransactionBatch => ({
  version: "1.0",
  chainId: chainId.toString(),
  createdAt: Date.now(),
  meta: {
    name,
    description: "",
    txBuilderVersion: "1.18.0",
    createdFromSafeAddress: safeAddress,
    createdFromOwnerAddress: creatorAddress,
  },
  transactions,
});

export const createSafeTransaction = ({
  to,
  data,
  value = 0n,
}: {
  to: string;
  data: string;
  value?: bigint;
}): SafeTransaction => ({
  to,
  value: value.toString(),
  data,
  contractMethod: null,
  contractInputsValues: null,
});

// --- Utilities ---

export const getSafeAppUrl = (chainId: number, safeAddress: string): string => {
  const chainPrefix = chainId === arbitrum.id ? "arb1" : "arb-sep";
  return `https://app.safe.global/apps/open?safe=${chainPrefix}:${safeAddress}&appUrl=https%3A%2F%2Fapps-portal.safe.global%2Ftx-builder`;
};
