"use client";
import React, { useState, useMemo } from "react";
import styled from "styled-components";
import { formatEther, parseEther } from "viem";

import { useCourtManager, validateCourtParams, type ValidationError } from "./CourtManagerContext";
import LabeledInput from "components/LabeledInput";

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

const Button = styled.button<{ $variant?: "primary" | "secondary" }>`
  padding: 12px 24px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  background-color: ${({ $variant, theme }) =>
    $variant === "primary" ? theme.klerosUIComponentsSecondaryPurple : "transparent"};
  color: ${({ $variant, theme }) =>
    $variant === "primary" ? "#fff" : theme.klerosUIComponentsSecondaryPurple};
  border: 1px solid ${({ theme }) => theme.klerosUIComponentsSecondaryPurple};

  &:hover:not(:disabled) {
    opacity: 0.8;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
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

// Helper to format seconds as human-readable duration
const formatDuration = (seconds: bigint): string => {
  const s = Number(seconds);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  return `${Math.floor(s / 86400)}d ${Math.floor((s % 86400) / 3600)}h`;
};

const CourtDetails: React.FC = () => {
  const { courts, selectedCourtId, isOwner, validationErrors } = useCourtManager();
  const [isEditing, setIsEditing] = useState(false);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});

  const selectedCourt = selectedCourtId !== null ? courts.get(selectedCourtId) : null;

  const courtErrors = useMemo(() => {
    if (!selectedCourtId) return [];
    return validationErrors.filter((e) => e.courtId === selectedCourtId);
  }, [validationErrors, selectedCourtId]);

  if (!selectedCourt) {
    return (
      <Container>
        <NoSelection>Select a court from the hierarchy to view details</NoSelection>
      </Container>
    );
  }

  const { params, timePeriods, policy } = selectedCourt;

  return (
    <Container>
      {/* Header */}
      <Section>
        <SectionTitle>
          {policy?.name || `Court #${selectedCourtId}`}
          {params.disabled && " (Disabled)"}
        </SectionTitle>

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
            <FieldValue>
              {params.parent === selectedCourtId
                ? "Self (Root Court)"
                : `#${params.parent}`}
            </FieldValue>
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
              <FieldValue>{params.alpha.toString()} ({Number(params.alpha) / 100}%)</FieldValue>
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
                checked={editedValues.hiddenVotes === "true" || (editedValues.hiddenVotes === undefined && params.hiddenVotes)}
                onChange={(e) => setEditedValues((v) => ({ ...v, hiddenVotes: e.target.checked.toString() }))}
              />
            ) : (
              <FieldValue>{params.hiddenVotes ? "Yes (Commit-Reveal)" : "No (Open Voting)"}</FieldValue>
            )}
          </Field>
        </FieldGroup>
      </Section>

      {/* Policy */}
      <Section>
        <SectionTitle>📜 Court Policy</SectionTitle>
        {policy ? (
          <FieldGroup>
            <Field>
              <FieldLabel>Policy Name</FieldLabel>
              <FieldValue>{policy.name}</FieldValue>
            </Field>
            <Field>
              <FieldLabel>Policy URI</FieldLabel>
              <FieldValue>
                <PolicyLink href={policy.uri} target="_blank" rel="noopener noreferrer">
                  {policy.uri.length > 50 ? `${policy.uri.slice(0, 50)}...` : policy.uri}
                </PolicyLink>
              </FieldValue>
            </Field>
          </FieldGroup>
        ) : (
          <FieldValue>No policy set for this court</FieldValue>
        )}
      </Section>

      {/* Action Buttons */}
      {isOwner && (
        <ButtonGroup>
          {isEditing ? (
            <>
              <Button $variant="secondary" onClick={() => { setIsEditing(false); setEditedValues({}); }}>
                Cancel
              </Button>
              <Button $variant="primary" disabled={courtErrors.filter((e) => e.severity === "error").length > 0}>
                Save Changes
              </Button>
            </>
          ) : (
            <Button $variant="primary" onClick={() => setIsEditing(true)}>
              Edit Parameters
            </Button>
          )}
        </ButtonGroup>
      )}
    </Container>
  );
};

export default CourtDetails;
