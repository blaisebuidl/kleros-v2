/**
 * Contract ABIs and addresses for Court Manager
 *
 * These are extracted from the deployment files to avoid full wagmi generate.
 * For production, consider using generated hooks from wagmi.config.ts
 */

import { arbitrum, arbitrumSepolia } from "viem/chains";
import { getDeployment, type Deployment } from "consts/index";

// --- Addresses by Deployment ---

const KLEROS_CORE_ADDRESSES: Record<Deployment, `0x${string}`> = {
  mainnet: "0x991d2df165670b9cac3B022f4B68D65b664222ea", // Arbitrum One
  testnet: "0xE8442307d36e9bf6aB27F1A009F95CE8E11C3479", // Arbitrum Sepolia
  devnet: "0x53451933006f5CbcCdb33fcDd6AC9A00b641C474", // Arbitrum Sepolia Devnet (KlerosCoreUniversity)
};

const POLICY_REGISTRY_ADDRESSES: Record<Deployment, `0x${string}`> = {
  mainnet: "0x553dcbF6aB3aE06a1064b5200Df1B5A9fB403d3c", // Arbitrum One
  testnet: "0x2668c46A14af8997417138B064ca1bEB70769585", // Arbitrum Sepolia
  devnet: "0x6445F57d2Bd2AD5BC23bC899731f7D5184d6e893", // Arbitrum Sepolia Devnet
};

// Chain IDs by deployment
export const CHAIN_ID_BY_DEPLOYMENT: Record<Deployment, number> = {
  mainnet: arbitrum.id, // 42161
  testnet: arbitrumSepolia.id, // 421614
  devnet: arbitrumSepolia.id, // 421614 (same chain, different deployment)
};

// Get addresses for current deployment
export const getKlerosCoreAddress = (): `0x${string}` => KLEROS_CORE_ADDRESSES[getDeployment()];
export const getPolicyRegistryAddress = (): `0x${string}` => POLICY_REGISTRY_ADDRESSES[getDeployment()];
export const getChainId = (): number => CHAIN_ID_BY_DEPLOYMENT[getDeployment()];

// Legacy exports for backward compatibility
export const KLEROS_CORE_ADDRESS = getKlerosCoreAddress();
export const POLICY_REGISTRY_ADDRESS = getPolicyRegistryAddress();

// --- ABIs ---

// Owner/Governor ABI (beta uses "governor", new code uses "owner")
// Try owner() first, fall back to governor() for beta deployments
export const ownerAbi = [
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const governorAbi = [
  {
    inputs: [],
    name: "governor",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// KlerosCore ABI for court management
// Targets current version (KlerosCoreUniversity on devnet): 6 fields, no "disabled"
// Legacy testnet/mainnet deployments are outdated and will be redeployed
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
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint96", name: "_courtID", type: "uint96" }],
    name: "getTimesPerPeriod",
    outputs: [{ internalType: "uint256[4]", name: "timesPerPeriod", type: "uint256[4]" }],
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
