/**
 * Atlas Integration Hook for Court Manager
 *
 * Provides SIWE authentication and IPFS upload functionality
 * for court policy management.
 */

"use client";
import { useState, useCallback, useMemo, useEffect } from "react";
import { useAccount, useSignMessage, useChainId } from "wagmi";
import { GraphQLClient, gql } from "graphql-request";
import { createSiweMessage } from "viem/siwe";

// --- Types ---

export enum Products {
  CourtV1 = "CourtV1",
  CourtV2 = "CourtV2",
}

export enum Roles {
  Policy = "policy",
  Generic = "generic",
}

// --- GraphQL Queries ---

const GET_NONCE_MUTATION = gql`
  mutation GetNonce($address: Address!) {
    nonce(address: $address)
  }
`;

const LOGIN_MUTATION = gql`
  mutation Login($message: String!, $signature: String!) {
    login(message: $message, signature: $signature)
  }
`;

// --- Atlas URI ---

const getAtlasUri = (): string => {
  return process.env.NEXT_PUBLIC_ATLAS_URI || "https://atlas.kleros.link";
};

// --- JWT Helpers ---

const STORAGE_KEY = "atlas-auth-token";

const decodeJwtPayload = (token: string): { sub?: string; exp?: number } | null => {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
};

const isTokenValid = (token: string | null): boolean => {
  if (!token) return false;
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return false;
  // Consider expired 30s early to avoid edge cases
  return payload.exp * 1000 > Date.now() + 30_000;
};

// --- Hook ---

interface UseAtlasReturn {
  // State
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  isUploading: boolean;
  authError: string | null;
  uploadError: string | null;

  // Actions
  authenticate: () => Promise<boolean>;
  uploadToIpfs: (file: File, filename: string, role?: Roles) => Promise<string | null>;
  uploadJsonToIpfs: (data: object, filename: string, role?: Roles) => Promise<string | null>;
  clearErrors: () => void;
}

export const useAtlas = (): UseAtlasReturn => {
  const { address } = useAccount();
  const chainId = useChainId();
  const { signMessageAsync } = useSignMessage();

  // sessionStorage-backed token state
  const [authToken, setAuthTokenState] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const stored = sessionStorage.getItem(STORAGE_KEY);
    return isTokenValid(stored) ? stored : null;
  });

  const setAuthToken = useCallback((token: string | null) => {
    setAuthTokenState(token);
    if (typeof window === "undefined") return;
    if (token) {
      sessionStorage.setItem(STORAGE_KEY, token);
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const atlasUri = useMemo(() => getAtlasUri(), []);

  const graphqlClient = useMemo(() => new GraphQLClient(`${atlasUri}/graphql`), [atlasUri]);

  const isAuthenticated = useMemo(() => isTokenValid(authToken), [authToken]);

  // Clear expired tokens on mount / token change
  useEffect(() => {
    if (authToken && !isTokenValid(authToken)) {
      setAuthToken(null);
    }
  }, [authToken, setAuthToken]);

  // --- Authentication ---

  const authenticate = useCallback(async (): Promise<boolean> => {
    if (!address) {
      setAuthError("Wallet not connected");
      return false;
    }

    setIsAuthenticating(true);
    setAuthError(null);

    try {
      // Step 1: Get nonce from Atlas
      const nonceResponse = await graphqlClient.request<{ nonce: string }>(GET_NONCE_MUTATION, { address });
      const nonce = nonceResponse.nonce;

      // Step 2: Create SIWE message
      const message = createSiweMessage({
        domain: typeof window !== "undefined" ? window.location.host : "localhost",
        address: address as `0x${string}`,
        statement: "Sign In to Kleros with Ethereum.",
        uri: typeof window !== "undefined" ? window.location.origin : "http://localhost",
        version: "1",
        chainId,
        nonce,
        expirationTime: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      });

      // Step 3: Sign message with wallet
      const signature = await signMessageAsync({ message });

      // Step 4: Login to Atlas
      const loginResponse = await graphqlClient.request<{ login: { accessToken: string } }>(LOGIN_MUTATION, {
        message,
        signature,
      });

      const token = loginResponse.login.accessToken;
      setAuthToken(token);
      setIsAuthenticating(false);
      return true;
    } catch (error: any) {
      console.error("Atlas authentication error:", error);
      const errorMessage = error?.response?.errors?.[0]?.message || error?.message || "Authentication failed";
      setAuthError(errorMessage);
      setIsAuthenticating(false);
      return false;
    }
  }, [address, chainId, graphqlClient, signMessageAsync, setAuthToken]);

  // --- IPFS Upload (auto-authenticates if needed) ---

  const uploadToIpfs = useCallback(
    async (file: File, filename: string, role: Roles = Roles.Policy): Promise<string | null> => {
      let token = authToken;

      // Auto-authenticate if token is missing or expired
      if (!isTokenValid(token)) {
        setIsUploading(true);
        const success = await authenticate();
        if (!success) {
          setIsUploading(false);
          setUploadError("Authentication required. Please sign in first.");
          return null;
        }
        // Grab the fresh token from sessionStorage
        token = typeof window !== "undefined" ? sessionStorage.getItem(STORAGE_KEY) : null;
      }

      setIsUploading(true);
      setUploadError(null);

      try {
        const formData = new FormData();
        formData.append("file", file, filename);
        formData.append("name", filename);
        formData.append("product", Products.CourtV2);
        formData.append("role", role);

        const response = await fetch(`${atlasUri}/ipfs/file`, {
          method: "POST",
          headers: {
            authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({ message: "Upload failed" }));

          if (response.status === 401) {
            // Token expired, clear auth and retry once
            setAuthToken(null);
            throw new Error("Session expired. Please try again.");
          }

          throw new Error(error.message || "Upload failed");
        }

        const ipfsPath = await response.text();
        setIsUploading(false);
        return ipfsPath; // Returns IPFS path like "/ipfs/Qm..."
      } catch (error: any) {
        console.error("IPFS upload error:", error);
        setUploadError(error?.message || "Upload failed");
        setIsUploading(false);
        return null;
      }
    },
    [authToken, atlasUri, authenticate, setAuthToken]
  );

  // --- JSON Upload Helper ---

  const uploadJsonToIpfs = useCallback(
    async (data: object, filename: string, role: Roles = Roles.Policy): Promise<string | null> => {
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: "application/octet-stream" });
      const file = new File([blob], filename, { type: "application/octet-stream" });
      return uploadToIpfs(file, filename, role);
    },
    [uploadToIpfs]
  );

  // --- Clear Errors ---

  const clearErrors = useCallback(() => {
    setAuthError(null);
    setUploadError(null);
  }, []);

  return {
    isAuthenticated,
    isAuthenticating,
    isUploading,
    authError,
    uploadError,
    authenticate,
    uploadToIpfs,
    uploadJsonToIpfs,
    clearErrors,
  };
};

// --- Policy Document Types ---

export interface CourtPolicy {
  name: string;
  description: string;
  summary: string;
  court: string;
  uri: string;
  requiredSkills: string[];
  [key: string]: any;
}

/**
 * Creates a court policy document ready for IPFS upload
 */
export const createPolicyDocument = (
  courtName: string,
  description: string,
  summary: string,
  requiredSkills: string[] = []
): CourtPolicy => {
  return {
    name: courtName,
    description,
    summary,
    court: courtName,
    uri: "", // Will be set after upload
    requiredSkills,
  };
};
