"use client";
import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { useAccount } from "wagmi";

import { responsiveSize } from "styles/responsiveSize";
import ConnectWallet from "components/ConnectWallet";

import Header from "./Header";
import CourtTree from "./CourtTree";
import CourtDetails from "./CourtDetails";
import { CourtManagerProvider } from "./CourtManagerContext";

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

const CourtManager: React.FC = () => {
  const { isConnected } = useAccount();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => setIsClient(true), []);

  if (!isClient) return null;

  return (
    <CourtManagerProvider>
      <Container>
        <Header />
        {!isConnected && <StyledConnectWallet />}
        <MainContent>
          <CourtTree />
          <CourtDetails />
        </MainContent>
      </Container>
    </CourtManagerProvider>
  );
};

export default CourtManager;
