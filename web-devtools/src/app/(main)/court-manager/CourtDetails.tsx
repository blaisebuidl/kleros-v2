"use client";
import React, { useState, useMemo, useEffect, useCallback } from "react";
import styled from "styled-components";
import { formatEther, parseEther } from "viem";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";

import MarkdownRenderer from "../../../components/MarkdownRenderer";
import { useCourtManager, validateCourtParams, type CourtParams, type CourtTimePeriods } from "./CourtManagerContext";
import { klerosCoreCourtsAbi } from "./contracts";
import { generateKIP, copyKIPToClipboard, type ParameterChangeKIP } from "./kipGenerator";

// ─── Styled Components ───

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 24px;
  background-color: ${({ theme }) => theme.klerosUIComponentsWhiteBackground};
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.klerosUIComponentsStroke};
`;

const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const SectionTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: ${({ theme }) => theme.klerosUIComponentsPrimaryText};
  border-bottom: 1px solid ${({ theme }) => theme.klerosUIComponentsStroke};
  padding-bottom: 8px;
`;

const FieldGroup = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const FieldLabel = styled.label`
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.klerosUIComponentsSecondaryText};
  text-transform: uppercase;
`;

const FieldValue = styled.span`
  font-size: 14px;
  color: ${({ theme }) => theme.klerosUIComponentsPrimaryText};
`;

const Input = styled.input`
  padding: 8px 12px;
  border: 1px solid ${({ theme }) => theme.klerosUIComponentsStroke};
  border-radius: 4px;
  font-size: 14px;
  color: ${({ theme }) => theme.klerosUIComponentsPrimaryText};
  background-color: ${({ theme }) => theme.klerosUIComponentsWhiteBackground};

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.klerosUIComponentsSecondaryPurple};
  }

  &:disabled {
    background-color: ${({ theme }) => theme.klerosUIComponentsLightBackground};
    cursor: not-allowed;
  }
`;

const TextArea = styled.textarea`
  padding: 8px 12px;
  border: 1px solid ${({ theme }) => theme.klerosUIComponentsStroke};
  border-radius: 4px;
  font-size: 13px;
  font-family: monospace;
  color: ${({ theme }) => theme.klerosUIComponentsPrimaryText};
  background-color: ${({ theme }) => theme.klerosUIComponentsWhiteBackground};
  resize: vertical;
  min-height: 120px;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.klerosUIComponentsSecondaryPurple};
  }
`;

const Checkbox = styled.input`
  width: 16px;
  height: 16px;
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
  }
`;

const ErrorBanner = styled.div`
  padding: 12px;
  background-color: #fee2e2;
  border: 1px solid #fca5a5;
  border-radius: 4px;
  color: #dc2626;
  font-size: 14px;
`;

const WarningBanner = styled.div`
  padding: 12px;
  background-color: #fef3c7;
  border: 1px solid #fcd34d;
  border-radius: 4px;
  color: #d97706;
  font-size: 14px;
`;

const SuccessBanner = styled.div`
  padding: 12px;
  background-color: #d1fae5;
  border: 1px solid #6ee7b7;
  border-radius: 4px;
  color: #059669;
  font-size: 14px;
`;

const InfoBanner = styled.div`
  padding: 12px;
  background-color: #ede9fe;
  border: 1px solid #c4b5fd;
  border-radius: 4px;
  color: #7c3aed;
  font-size: 14px;
`;

const Button = styled.button<{ $variant?: "primary" | "secondary" | "danger" }>`
  padding: 12px 24px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  background-color: ${({ $variant, theme }) =>
    $variant === "primary"
      ? theme.klerosUIComponentsSecondaryPurple
      : $variant === "danger"
        ? "#dc2626"
        : "transparent"};
  color: ${({ $variant, theme }) =>
    $variant === "primary" || $variant === "danger" ? "#fff" : theme.klerosUIComponentsSecondaryPurple};
  border: 1px solid
    ${({ $variant, theme }) => ($variant === "danger" ? "#dc2626" : theme.klerosUIComponentsSecondaryPurple)};

  &:hover:not(:disabled) {
    opacity: 0.8;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const SmallButton = styled(Button)`
  padding: 6px 12px;
  font-size: 12px;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  flex-wrap: wrap;
`;

const NoSelection = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 300px;
  color: ${({ theme }) => theme.klerosUIComponentsSecondaryText};
  font-size: 14px;
`;

const PolicyLink = styled.a`
  color: ${({ theme }) => theme.klerosUIComponentsSecondaryPurple};
  text-decoration: underline;

  &:hover {
    opacity: 0.8;
  }
`;

const TxHash = styled.a`
  font-family: monospace;
  font-size: 12px;
  color: ${({ theme }) => theme.klerosUIComponentsSecondaryPurple};
  word-break: break-all;
`;

const PreviewBlock = styled.pre`
  padding: 12px;
  background-color: ${({ theme }) => theme.klerosUIComponentsLightBackground};
  color: ${({ theme }) => theme.klerosUIComponentsPrimaryText};
  border: 1px solid ${({ theme }) => theme.klerosUIComponentsStroke};
  border-radius: 4px;
  font-size: 12px;
  font-family: monospace;
  overflow-x: auto;
  max-height: 300px;
  white-space: pre-wrap;
  word-break: break-word;
`;

// ─── Helpers ───

const formatDuration = (seconds: bigint): string => {
  const s = Number(seconds);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  return `${Math.floor(s / 86400)}d ${Math.floor((s % 86400) / 3600)}h`;
};

const getExplorerTxUrl = (hash: string): string => `https://sepolia.arbiscan.io/tx/${hash}`;

// ─── Policy Editor Sub-component ───

interface PolicyEditorProps {
  courtId: number;
  currentPolicy?: { name: string; uri: string };
  isEditing: boolean;
}

const PolicyTextarea = styled(TextArea)`
  font-family: inherit;
  font-size: 14px;
  line-height: 1.5;
`;

const PolicyPreviewSection = styled.div`
  padding: 12px;
  background-color: ${({ theme }) => theme.klerosUIComponentsLightBackground};
  border: 1px solid ${({ theme }) => theme.klerosUIComponentsStroke};
  border-radius: 4px;

  h4 {
    font-size: 13px;
    font-weight: 600;
    color: ${({ theme }) => theme.klerosUIComponentsSecondaryText};
    text-transform: uppercase;
    margin: 16px 0 4px 0;

    &:first-child {
      margin-top: 0;
    }
  }

  p {
    font-size: 14px;
    color: ${({ theme }) => theme.klerosUIComponentsPrimaryText};
    margin: 0 0 16px 0;
    white-space: pre-wrap;
    line-height: 1.5;
  }

  p:last-child {
    margin-bottom: 0;
  }
`;

const PolicyEditor: React.FC<PolicyEditorProps> = ({ courtId, currentPolicy, isEditing }) => {
  const [policyName, setPolicyName] = useState(currentPolicy?.name || "");
  const [policyPurpose, setPolicyPurpose] = useState("");
  const [policyRules, setPolicyRules] = useState("");
  const [policyRequiredSkills, setPolicyRequiredSkills] = useState("");
  const [fetchedContent, setFetchedContent] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Fetch policy content from IPFS and parse into individual fields
  useEffect(() => {
    if (!currentPolicy?.uri) return;

    const uri = currentPolicy.uri;
    if (!uri.startsWith("/ipfs/") && !uri.startsWith("ipfs://")) return;

    const ipfsPath = uri.startsWith("ipfs://") ? uri.replace("ipfs://", "/ipfs/") : uri;
    const gatewayUrl = `https://cdn.kleros.link${ipfsPath}`;

    setIsFetching(true);
    console.log(`[CourtManager] Fetching policy from ${gatewayUrl}`);

    fetch(gatewayUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((text) => {
        setFetchedContent(text);
        try {
          const parsed = JSON.parse(text);
          if (parsed.name) setPolicyName(parsed.name);
          if (parsed.purpose) setPolicyPurpose(parsed.purpose);
          if (parsed.rules) setPolicyRules(parsed.rules);
          if (parsed.requiredSkills) setPolicyRequiredSkills(parsed.requiredSkills);
        } catch {
          console.warn("[CourtManager] Policy content is not valid JSON, fields left empty");
        }
        console.log(`[CourtManager] Policy content fetched (${text.length} chars)`);
      })
      .catch((err) => {
        console.error("[CourtManager] Failed to fetch policy:", err);
        setFetchedContent(null);
      })
      .finally(() => setIsFetching(false));
  }, [currentPolicy?.uri]);

  // Reconstruct JSON from individual fields
  const reconstructedJson = useMemo(() => {
    const obj: Record<string, unknown> = {
      name: policyName,
      purpose: policyPurpose,
      rules: policyRules,
      court: courtId,
      uri: currentPolicy?.uri || "",
    };
    if (policyRequiredSkills.trim()) {
      obj.requiredSkills = policyRequiredSkills;
    }
    return obj;
  }, [policyName, policyPurpose, policyRules, policyRequiredSkills, courtId, currentPolicy?.uri]);

  if (!isEditing) {
    // Read-only view
    return (
      <Section>
        <SectionTitle>📜 Court Policy</SectionTitle>
        {currentPolicy ? (
          <>
            <FieldGroup>
              <Field>
                <FieldLabel>Policy Name</FieldLabel>
                <FieldValue>{currentPolicy.name}</FieldValue>
              </Field>
              <Field>
                <FieldLabel>Policy URI</FieldLabel>
                <FieldValue>
                  <PolicyLink href={currentPolicy.uri} target="_blank" rel="noopener noreferrer">
                    {currentPolicy.uri.length > 50 ? `${currentPolicy.uri.slice(0, 50)}...` : currentPolicy.uri}
                  </PolicyLink>
                </FieldValue>
              </Field>
            </FieldGroup>
            {fetchedContent && (
              <>
                <SmallButton $variant="secondary" onClick={() => setShowPreview(!showPreview)}>
                  {showPreview ? "Hide Policy Content" : "Show Policy Content"}
                </SmallButton>
                {showPreview && (
                  <PolicyPreviewSection>
                    <h4>Name</h4>
                    <p>{policyName || "—"}</p>
                    <h4>Purpose</h4>
                    {policyPurpose ? <MarkdownRenderer content={policyPurpose} /> : <p>—</p>}
                    <h4>Rules</h4>
                    {policyRules ? <MarkdownRenderer content={policyRules} /> : <p>—</p>}
                    {policyRequiredSkills && (
                      <>
                        <h4>Required Skills</h4>
                        <MarkdownRenderer content={policyRequiredSkills} />
                      </>
                    )}
                  </PolicyPreviewSection>
                )}
              </>
            )}
          </>
        ) : (
          <FieldValue>No policy set for this court</FieldValue>
        )}
      </Section>
    );
  }

  // Edit mode
  return (
    <Section>
      <SectionTitle>📜 Court Policy (Edit)</SectionTitle>
      <InfoBanner>
        ℹ️ Policy upload requires Atlas authentication (coming soon). You can preview and prepare policy content below.
      </InfoBanner>

      {isFetching ? (
        <FieldValue>Loading policy content from IPFS...</FieldValue>
      ) : (
        <>
          <FieldGroup>
            <Field>
              <FieldLabel>Policy Name</FieldLabel>
              <Input
                type="text"
                value={policyName}
                onChange={(e) => setPolicyName(e.target.value)}
                placeholder="e.g., General Court Policy"
              />
            </Field>
            <Field>
              <FieldLabel>Court ID</FieldLabel>
              <FieldValue>{courtId}</FieldValue>
            </Field>
          </FieldGroup>

          <Field>
            <FieldLabel>Purpose</FieldLabel>
            <PolicyTextarea
              rows={4}
              value={policyPurpose}
              onChange={(e) => setPolicyPurpose(e.target.value)}
              placeholder="Describe the court's purpose (supports markdown)"
            />
          </Field>

          <Field>
            <FieldLabel>Rules</FieldLabel>
            <PolicyTextarea
              rows={6}
              value={policyRules}
              onChange={(e) => setPolicyRules(e.target.value)}
              placeholder="Rules and guidelines for jurors (supports markdown)"
            />
          </Field>

          <Field>
            <FieldLabel>Required Skills</FieldLabel>
            <PolicyTextarea
              rows={3}
              value={policyRequiredSkills}
              onChange={(e) => setPolicyRequiredSkills(e.target.value)}
              placeholder="Optional"
            />
          </Field>

          <Field>
            <FieldLabel>Current URI</FieldLabel>
            <FieldValue style={{ fontSize: 12, fontFamily: "monospace" }}>{currentPolicy?.uri || "None"}</FieldValue>
          </Field>
        </>
      )}

      <SmallButton $variant="secondary" onClick={() => setShowPreview(!showPreview)}>
        {showPreview ? "Hide Preview" : "Preview Policy"}
      </SmallButton>
      {showPreview && (
        <PolicyPreviewSection>
          <h4>Name</h4>
          <p>{policyName || "—"}</p>
          <h4>Purpose</h4>
          {policyPurpose ? <MarkdownRenderer content={policyPurpose} /> : <p>—</p>}
          <h4>Rules</h4>
          {policyRules ? <MarkdownRenderer content={policyRules} /> : <p>—</p>}
          {policyRequiredSkills.trim() && (
            <>
              <h4>Required Skills</h4>
              <MarkdownRenderer content={policyRequiredSkills} />
            </>
          )}
          <h4>JSON Output</h4>
          <PreviewBlock>{JSON.stringify(reconstructedJson, null, 2)}</PreviewBlock>
        </PolicyPreviewSection>
      )}
    </Section>
  );
};

// ─── Main Component ───

const CourtDetails: React.FC = () => {
  const {
    courts,
    selectedCourtId,
    isOwner,
    isOwnerMultisig,
    validationErrors,
    buildChangeCourtTx,
    exportSafeBatch,
    klerosCorAddress,
  } = useCourtManager();

  const [isEditing, setIsEditing] = useState(false);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [kipCopied, setKipCopied] = useState(false);

  // --- Write contract hook for EOA ---
  const { writeContract, data: txHash, isPending: isTxPending, error: txError, reset: resetTx } = useWriteContract();

  // --- Wait for tx receipt ---
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const selectedCourt = selectedCourtId !== null ? courts.get(selectedCourtId) : null;

  const courtErrors = useMemo(() => {
    if (!selectedCourtId) return [];
    return validationErrors.filter((e) => e.courtId === selectedCourtId);
  }, [validationErrors, selectedCourtId]);

  // Build merged params from current + edited values
  const buildMergedParams = useCallback((): {
    params: Partial<CourtParams & CourtTimePeriods>;
    hasChanges: boolean;
  } => {
    if (!selectedCourt) return { params: {}, hasChanges: false };

    const merged: Partial<CourtParams & CourtTimePeriods> = {};
    let hasChanges = false;

    if (editedValues.hiddenVotes !== undefined) {
      const newVal = editedValues.hiddenVotes === "true";
      if (newVal !== selectedCourt.params.hiddenVotes) {
        merged.hiddenVotes = newVal;
        hasChanges = true;
      }
    }
    if (editedValues.minStake !== undefined) {
      try {
        const newVal = parseEther(editedValues.minStake);
        if (newVal !== selectedCourt.params.minStake) {
          merged.minStake = newVal;
          hasChanges = true;
        }
      } catch {
        /* invalid input, skip */
      }
    }
    if (editedValues.feeForJuror !== undefined) {
      try {
        const newVal = parseEther(editedValues.feeForJuror);
        if (newVal !== selectedCourt.params.feeForJuror) {
          merged.feeForJuror = newVal;
          hasChanges = true;
        }
      } catch {
        /* invalid input */
      }
    }
    if (editedValues.alpha !== undefined) {
      const newVal = BigInt(editedValues.alpha || "0");
      if (newVal !== selectedCourt.params.alpha) {
        merged.alpha = newVal;
        hasChanges = true;
      }
    }
    if (editedValues.jurorsForCourtJump !== undefined) {
      const newVal = BigInt(editedValues.jurorsForCourtJump || "0");
      if (newVal !== selectedCourt.params.jurorsForCourtJump) {
        merged.jurorsForCourtJump = newVal;
        hasChanges = true;
      }
    }
    // Time periods
    for (const key of ["evidence", "commit", "vote", "appeal"] as const) {
      if (editedValues[key] !== undefined) {
        const newVal = BigInt(editedValues[key] || "0");
        if (newVal !== selectedCourt.timePeriods[key]) {
          merged[key] = newVal;
          hasChanges = true;
        }
      }
    }

    return { params: merged, hasChanges };
  }, [selectedCourt, editedValues]);

  const { hasChanges } = buildMergedParams();

  // Reset tx state when switching courts or cancelling edit
  useEffect(() => {
    resetTx();
  }, [selectedCourtId, isEditing, resetTx]);

  // --- Save Handler (EOA direct tx) ---
  const handleSave = useCallback(() => {
    if (!selectedCourt || selectedCourtId === null) return;

    const { params: merged } = buildMergedParams();
    const court = selectedCourt;

    const hiddenVotes = merged.hiddenVotes ?? court.params.hiddenVotes;
    const minStake = merged.minStake ?? court.params.minStake;
    const alpha = merged.alpha ?? court.params.alpha;
    const feeForJuror = merged.feeForJuror ?? court.params.feeForJuror;
    const jurorsForCourtJump = merged.jurorsForCourtJump ?? court.params.jurorsForCourtJump;
    const timesPerPeriod: readonly [bigint, bigint, bigint, bigint] = [
      merged.evidence ?? court.timePeriods.evidence,
      merged.commit ?? court.timePeriods.commit,
      merged.vote ?? court.timePeriods.vote,
      merged.appeal ?? court.timePeriods.appeal,
    ] as const;

    console.log("[CourtManager] Sending changeCourtParameters tx:", {
      courtId: selectedCourtId,
      hiddenVotes,
      minStake: minStake.toString(),
      alpha: alpha.toString(),
      feeForJuror: feeForJuror.toString(),
      jurorsForCourtJump: jurorsForCourtJump.toString(),
      timesPerPeriod: timesPerPeriod.map((t) => t.toString()),
    });

    writeContract({
      address: klerosCorAddress,
      abi: klerosCoreCourtsAbi,
      functionName: "changeCourtParameters",
      args: [selectedCourtId, hiddenVotes, minStake, alpha, feeForJuror, jurorsForCourtJump, timesPerPeriod],
    });
  }, [selectedCourt, selectedCourtId, buildMergedParams, writeContract, klerosCorAddress]);

  // --- Safe Batch Download Handler ---
  const handleDownloadSafeBatch = useCallback(() => {
    if (!selectedCourt || selectedCourtId === null) return;

    const { params: merged } = buildMergedParams();
    const tx = buildChangeCourtTx(selectedCourtId, merged);
    if (!tx) return;

    const courtName = selectedCourt.policy?.name || `Court #${selectedCourtId}`;
    exportSafeBatch([tx], `Update ${courtName} Parameters`);
    console.log("[CourtManager] Safe batch JSON downloaded");
  }, [selectedCourt, selectedCourtId, buildMergedParams, buildChangeCourtTx, exportSafeBatch]);

  // --- KIP Generator Handler ---
  const handleGenerateKIP = useCallback(async () => {
    if (!selectedCourt || selectedCourtId === null) return;

    const { params: merged } = buildMergedParams();

    const kipData: ParameterChangeKIP = {
      type: "parameter-change",
      author: "[Your Name/Address]",
      courtId: selectedCourtId,
      courtName: selectedCourt.policy?.name || `Court #${selectedCourtId}`,
      currentParams: selectedCourt.params,
      currentTimePeriods: selectedCourt.timePeriods,
      proposedParams: merged,
      proposedTimePeriods: merged,
      rationale: "",
    };

    const copied = await copyKIPToClipboard(kipData);
    if (copied) {
      setKipCopied(true);
      setTimeout(() => setKipCopied(false), 3000);
      console.log("[CourtManager] KIP template copied to clipboard");
    }
  }, [selectedCourt, selectedCourtId, buildMergedParams]);

  if (!selectedCourt) {
    return (
      <Container>
        <NoSelection>Select a court from the hierarchy to view details</NoSelection>
      </Container>
    );
  }

  const { params, timePeriods, policy } = selectedCourt;
  const hasErrors = courtErrors.filter((e) => e.severity === "error").length > 0;

  return (
    <Container>
      {/* Header */}
      <Section>
        <SectionTitle>{policy?.name || `Court #${selectedCourtId}`}</SectionTitle>

        {courtErrors.filter((e) => e.severity === "error").length > 0 && (
          <ErrorBanner>
            <strong>Validation Errors:</strong>
            <ul style={{ margin: "8px 0 0 16px", padding: 0 }}>
              {courtErrors
                .filter((e) => e.severity === "error")
                .map((e, i) => (
                  <li key={i}>{e.message}</li>
                ))}
            </ul>
          </ErrorBanner>
        )}

        {courtErrors.filter((e) => e.severity === "warning").length > 0 && (
          <WarningBanner>
            <strong>Warnings:</strong>
            <ul style={{ margin: "8px 0 0 16px", padding: 0 }}>
              {courtErrors
                .filter((e) => e.severity === "warning")
                .map((e, i) => (
                  <li key={i}>{e.message}</li>
                ))}
            </ul>
          </WarningBanner>
        )}

        {/* Tx feedback */}
        {txHash && (
          <SuccessBanner>
            ✅ Transaction submitted!{" "}
            <TxHash href={getExplorerTxUrl(txHash)} target="_blank" rel="noopener noreferrer">
              {txHash}
            </TxHash>
            {isConfirming && " — Waiting for confirmation..."}
            {isConfirmed && " — Confirmed!"}
          </SuccessBanner>
        )}
        {txError && <ErrorBanner>❌ Transaction failed: {txError.message.slice(0, 200)}</ErrorBanner>}
      </Section>

      {/* Basic Info */}
      <Section>
        <SectionTitle>📋 Basic Info</SectionTitle>
        <FieldGroup>
          <Field>
            <FieldLabel>Court ID</FieldLabel>
            <FieldValue>{selectedCourtId}</FieldValue>
          </Field>
          <Field>
            <FieldLabel>Parent Court</FieldLabel>
            <FieldValue>{params.parent === selectedCourtId ? "Self (Root Court)" : `#${params.parent}`}</FieldValue>
          </Field>
        </FieldGroup>
      </Section>

      {/* Staking Parameters */}
      <Section>
        <SectionTitle>💰 Staking & Fees</SectionTitle>
        <FieldGroup>
          <Field>
            <FieldLabel>Min Stake (PNK)</FieldLabel>
            {isEditing ? (
              <Input
                type="text"
                value={editedValues.minStake ?? formatEther(params.minStake)}
                onChange={(e) => setEditedValues((v) => ({ ...v, minStake: e.target.value }))}
              />
            ) : (
              <FieldValue>{formatEther(params.minStake)}</FieldValue>
            )}
          </Field>
          <Field>
            <FieldLabel>Fee Per Juror (ETH)</FieldLabel>
            {isEditing ? (
              <Input
                type="text"
                value={editedValues.feeForJuror ?? formatEther(params.feeForJuror)}
                onChange={(e) => setEditedValues((v) => ({ ...v, feeForJuror: e.target.value }))}
              />
            ) : (
              <FieldValue>{formatEther(params.feeForJuror)}</FieldValue>
            )}
          </Field>
          <Field>
            <FieldLabel>Alpha (Basis Points)</FieldLabel>
            {isEditing ? (
              <Input
                type="number"
                value={editedValues.alpha ?? params.alpha.toString()}
                onChange={(e) => setEditedValues((v) => ({ ...v, alpha: e.target.value }))}
              />
            ) : (
              <FieldValue>
                {params.alpha.toString()} ({Number(params.alpha) / 100}%)
              </FieldValue>
            )}
          </Field>
          <Field>
            <FieldLabel>Jurors for Court Jump</FieldLabel>
            {isEditing ? (
              <Input
                type="number"
                value={editedValues.jurorsForCourtJump ?? params.jurorsForCourtJump.toString()}
                onChange={(e) => setEditedValues((v) => ({ ...v, jurorsForCourtJump: e.target.value }))}
              />
            ) : (
              <FieldValue>{params.jurorsForCourtJump.toString()}</FieldValue>
            )}
          </Field>
        </FieldGroup>
      </Section>

      {/* Time Periods */}
      <Section>
        <SectionTitle>⏱️ Time Periods</SectionTitle>
        <FieldGroup>
          <Field>
            <FieldLabel>Evidence Period</FieldLabel>
            {isEditing ? (
              <Input
                type="number"
                placeholder="seconds"
                value={editedValues.evidence ?? timePeriods.evidence.toString()}
                onChange={(e) => setEditedValues((v) => ({ ...v, evidence: e.target.value }))}
              />
            ) : (
              <FieldValue>{formatDuration(timePeriods.evidence)}</FieldValue>
            )}
          </Field>
          <Field>
            <FieldLabel>Commit Period</FieldLabel>
            {isEditing ? (
              <Input
                type="number"
                placeholder="seconds"
                value={editedValues.commit ?? timePeriods.commit.toString()}
                onChange={(e) => setEditedValues((v) => ({ ...v, commit: e.target.value }))}
              />
            ) : (
              <FieldValue>{formatDuration(timePeriods.commit)}</FieldValue>
            )}
          </Field>
          <Field>
            <FieldLabel>Vote Period</FieldLabel>
            {isEditing ? (
              <Input
                type="number"
                placeholder="seconds"
                value={editedValues.vote ?? timePeriods.vote.toString()}
                onChange={(e) => setEditedValues((v) => ({ ...v, vote: e.target.value }))}
              />
            ) : (
              <FieldValue>{formatDuration(timePeriods.vote)}</FieldValue>
            )}
          </Field>
          <Field>
            <FieldLabel>Appeal Period</FieldLabel>
            {isEditing ? (
              <Input
                type="number"
                placeholder="seconds"
                value={editedValues.appeal ?? timePeriods.appeal.toString()}
                onChange={(e) => setEditedValues((v) => ({ ...v, appeal: e.target.value }))}
              />
            ) : (
              <FieldValue>{formatDuration(timePeriods.appeal)}</FieldValue>
            )}
          </Field>
        </FieldGroup>
      </Section>

      {/* Voting Settings */}
      <Section>
        <SectionTitle>🗳️ Voting Settings</SectionTitle>
        <FieldGroup>
          <Field>
            <FieldLabel>Hidden Votes</FieldLabel>
            {isEditing ? (
              <Checkbox
                type="checkbox"
                checked={
                  editedValues.hiddenVotes === "true" || (editedValues.hiddenVotes === undefined && params.hiddenVotes)
                }
                onChange={(e) => setEditedValues((v) => ({ ...v, hiddenVotes: e.target.checked.toString() }))}
              />
            ) : (
              <FieldValue>{params.hiddenVotes ? "Yes (Commit-Reveal)" : "No (Open Voting)"}</FieldValue>
            )}
          </Field>
        </FieldGroup>
      </Section>

      {/* Policy Section */}
      <PolicyEditor courtId={selectedCourtId!} currentPolicy={policy} isEditing={isEditing} />

      {/* Action Buttons */}
      <ButtonGroup>
        {/* KIP Generator — always visible for non-owners, visible in edit mode for owners */}
        {(!isOwner || isEditing) && (
          <Button
            $variant="secondary"
            onClick={handleGenerateKIP}
            disabled={isEditing && !hasChanges}
            title={kipCopied ? "Copied!" : "Generate a KIP template and copy to clipboard"}
          >
            {kipCopied ? "✅ KIP Copied!" : "📋 Generate KIP Template"}
          </Button>
        )}

        {isOwner && (
          <>
            {isEditing ? (
              <>
                <Button
                  $variant="secondary"
                  onClick={() => {
                    setIsEditing(false);
                    setEditedValues({});
                    resetTx();
                  }}
                >
                  Cancel
                </Button>

                {isOwnerMultisig ? (
                  <Button $variant="primary" onClick={handleDownloadSafeBatch} disabled={!hasChanges || hasErrors}>
                    📥 Download Safe Batch
                  </Button>
                ) : (
                  <Button
                    $variant="primary"
                    onClick={handleSave}
                    disabled={!hasChanges || hasErrors || isTxPending || isConfirming}
                  >
                    {isTxPending ? "Confirm in Wallet..." : isConfirming ? "Confirming..." : "Save Changes"}
                  </Button>
                )}
              </>
            ) : (
              <Button $variant="primary" onClick={() => setIsEditing(true)}>
                Edit Parameters
              </Button>
            )}
          </>
        )}
      </ButtonGroup>
    </Container>
  );
};

export default CourtDetails;
