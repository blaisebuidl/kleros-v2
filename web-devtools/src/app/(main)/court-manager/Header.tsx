"use client";
import React from "react";
import styled from "styled-components";

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Title = styled.h1`
  font-size: 24px;
  font-weight: 600;
  color: ${({ theme }) => theme.klerosUIComponentsPrimaryText};
`;

const Subtitle = styled.p`
  font-size: 14px;
  color: ${({ theme }) => theme.klerosUIComponentsSecondaryText};
`;

const Header: React.FC = () => {
  return (
    <Container>
      <Title>⚖️ Court Manager</Title>
      <Subtitle>
        View the court hierarchy, edit parameters, manage policies, and create new courts.
        Supports both EOA and Safe multisig owners.
      </Subtitle>
    </Container>
  );
};

export default Header;
