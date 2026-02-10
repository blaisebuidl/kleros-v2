"use client";
import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { useAccount, useDisconnect } from "wagmi";

import { responsiveSize } from "styles/responsiveSize";
import ConnectWallet from "components/ConnectWallet";

import Header from "./Header";
import CourtTree from "./CourtTree";
import CourtDetails from "./CourtDetails";
import { CourtManagerProvider, useCourtManager } from "./CourtManagerContext";

const Container = styled.div`
  min-height: calc(100vh - 160px);
  display: flex;
  flex-direction: column;
  gap: 32px;
  margin: 16px 32px;
  padding: ${responsiveSize(32, 72)} ${responsiveSize(16, 132)} ${responsiveSize(76, 96)};
`;

const MainContent = styled.div`
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 24px;
  width: 100%;

  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
  }
`;

const StyledConnectWallet = styled(ConnectWallet)`
  align-self: flex-start;
`;

const WalletStatusContainer = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  flex-wrap: wrap;
`;

const Address = styled.span`
  font-family: "Roboto Mono", monospace;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
`;

const Badge = styled.span<{ $bg: string; $color: string }>`
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  background: ${({ $bg }) => $bg};
  color: ${({ $color }) => $color};
  white-space: nowrap;
`;

const NetworkLabel = styled.span`
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
  margin-left: auto;
`;

const DisconnectButton = styled.button`
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  padding: 4px 10px;
  cursor: pointer;
  &:hover {
    color: rgba(255, 255, 255, 0.8);
    border-color: rgba(255, 255, 255, 0.3);
  }
`;

const truncateAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

const WalletStatusBar: React.FC = () => {
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const { isOwner, isOwnerMultisig, deployment } = useCourtManager();

  return (
    <WalletStatusContainer>
      <Address>{address ? truncateAddress(address) : ""}</Address>
      {isOwner ? (
        <Badge $bg="rgba(46,204,113,0.15)" $color="#2ecc71">
          Owner
        </Badge>
      ) : (
        <Badge $bg="rgba(255,255,255,0.1)" $color="rgba(255,255,255,0.6)">
          Read-only
        </Badge>
      )}
      {isOwner &&
        (isOwnerMultisig ? (
          <Badge $bg="rgba(52,152,219,0.15)" $color="#3498db">
            Multisig
          </Badge>
        ) : (
          <Badge $bg="rgba(255,255,255,0.08)" $color="rgba(255,255,255,0.5)">
            EOA
          </Badge>
        ))}
      {deployment && <NetworkLabel>{deployment}</NetworkLabel>}
      <DisconnectButton onClick={() => disconnect()}>Disconnect</DisconnectButton>
    </WalletStatusContainer>
  );
};

const CourtManagerContent: React.FC = () => {
  const { isConnected } = useAccount();

  return (
    <>
      <Header />
      {!isConnected ? <StyledConnectWallet /> : <WalletStatusBar />}
      <MainContent>
        <CourtTree />
        <CourtDetails />
      </MainContent>
    </>
  );
};

const CourtManager: React.FC = () => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => setIsClient(true), []);

  if (!isClient) return null;

  return (
    <CourtManagerProvider>
      <Container>
        <CourtManagerContent />
      </Container>
    </CourtManagerProvider>
  );
};

export default CourtManager;
