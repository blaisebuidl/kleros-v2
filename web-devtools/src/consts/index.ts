export type Deployment = "mainnet" | "testnet" | "devnet";

export const getDeployment = (): Deployment => {
  const deployment = process.env.NEXT_PUBLIC_DEPLOYMENT;
  if (deployment === "mainnet" || deployment === "testnet" || deployment === "devnet") {
    return deployment;
  }
  return "devnet"; // default
};

export const isProductionDeployment = () => getDeployment() === "mainnet";
export const isTestnetDeployment = () => getDeployment() === "testnet";
export const isDevnetDeployment = () => getDeployment() === "devnet";

export const IPFS_GATEWAY = process.env.NEXT_PUBLIC_IPFS_GATEWAY || "https://cdn.kleros.link";

export const INVALID_DISPUTE_DATA_ERROR = `The dispute data is not valid, please vote "Refuse to arbitrate"`;
export const RPC_ERROR = `RPC Error: Unable to fetch dispute data. Please avoid voting.`;

export enum RULING_MODE {
  Uninitialized,
  Manual,
  AutomaticRandom,
  AutomaticPreset,
}
