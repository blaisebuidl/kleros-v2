"use client";
import React from "react";
import styled from "styled-components";
import { formatEther } from "viem";

import { useCourtManager, type CourtNode } from "./CourtManagerContext";

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  background-color: ${({ theme }) => theme.klerosUIComponentsWhiteBackground};
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.klerosUIComponentsStroke};
  height: fit-content;
`;

const Title = styled.h2`
  font-size: 16px;
  font-weight: 600;
  color: ${({ theme }) => theme.klerosUIComponentsPrimaryText};
  margin-bottom: 8px;
`;

const TreeContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const CourtItem = styled.div<{ $selected: boolean; $level: number }>`
  display: flex;
  flex-direction: column;
  padding: 8px 12px;
  margin-left: ${({ $level }) => $level * 16}px;
  border-radius: 4px;
  cursor: pointer;
  background-color: ${({ $selected, theme }) =>
    $selected ? theme.klerosUIComponentsLightBlue : "transparent"};
  border: 1px solid ${({ $selected, theme }) =>
    $selected ? theme.klerosUIComponentsSecondaryPurple : "transparent"};
  transition: all 0.2s ease;

  &:hover {
    background-color: ${({ theme }) => theme.klerosUIComponentsLightBackground};
  }
`;

const CourtName = styled.span`
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.klerosUIComponentsPrimaryText};
`;

const CourtMeta = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.klerosUIComponentsSecondaryText};
`;

const LoadingText = styled.div`
  font-size: 14px;
  color: ${({ theme }) => theme.klerosUIComponentsSecondaryText};
  padding: 16px;
  text-align: center;
`;

const EmptyState = styled.div`
  font-size: 14px;
  color: ${({ theme }) => theme.klerosUIComponentsSecondaryText};
  padding: 16px;
  text-align: center;
`;

// Recursive component for rendering court tree
interface CourtTreeNodeProps {
  courtId: number;
  level: number;
}

const CourtTreeNode: React.FC<CourtTreeNodeProps> = ({ courtId, level }) => {
  const { courts, selectedCourtId, selectCourt } = useCourtManager();
  const court = courts.get(courtId);

  if (!court) return null;

  return (
    <>
      <CourtItem
        $selected={selectedCourtId === courtId}
        $level={level}
        onClick={() => selectCourt(courtId)}
      >
        <CourtName>
          {court.policy?.name || `Court #${courtId}`}
          {court.params.disabled && " (disabled)"}
        </CourtName>
        <CourtMeta>
          ID: {courtId} • Min Stake: {formatEther(court.params.minStake)} PNK
        </CourtMeta>
      </CourtItem>
      {court.children.map((childId) => (
        <CourtTreeNode key={childId} courtId={childId} level={level + 1} />
      ))}
    </>
  );
};

const CourtTree: React.FC = () => {
  const { courts, isLoading } = useCourtManager();

  if (isLoading) {
    return (
      <Container>
        <Title>🏛️ Court Hierarchy</Title>
        <LoadingText>Loading courts...</LoadingText>
      </Container>
    );
  }

  if (courts.size === 0) {
    return (
      <Container>
        <Title>🏛️ Court Hierarchy</Title>
        <EmptyState>
          No courts found. Make sure you&apos;re connected to the correct network.
        </EmptyState>
      </Container>
    );
  }

  // Find the root court (General Court, id=1, which has parent=1)
  // Court 0 is the Forking Court (special, not displayed usually)
  const rootCourtId = 1;

  return (
    <Container>
      <Title>🏛️ Court Hierarchy</Title>
      <TreeContainer>
        <CourtTreeNode courtId={rootCourtId} level={0} />
      </TreeContainer>
    </Container>
  );
};

export default CourtTree;
