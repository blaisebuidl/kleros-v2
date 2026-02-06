/**
 * KIP (Kleros Improvement Proposal) Template Generator
 * 
 * Generates markdown templates for governance proposals when non-owners
 * want to propose court parameter changes, policy updates, or new courts.
 */

import { formatEther } from "viem";
import type { CourtNode, CourtParams, CourtTimePeriods } from "./CourtManagerContext";
import { getDeployment, type Deployment } from "consts/index";

// --- Types ---

export type KIPType = "parameter-change" | "policy-change" | "new-court";

interface BaseKIPData {
  author: string;
  courtId: number;
  courtName: string;
}

export interface ParameterChangeKIP extends BaseKIPData {
  type: "parameter-change";
  currentParams: CourtParams;
  currentTimePeriods: CourtTimePeriods;
  proposedParams: Partial<CourtParams>;
  proposedTimePeriods: Partial<CourtTimePeriods>;
  rationale: string;
}

export interface PolicyChangeKIP extends BaseKIPData {
  type: "policy-change";
  currentPolicyUri: string;
  proposedPolicyUri: string;
  proposedPolicyName: string;
  rationale: string;
}

export interface NewCourtKIP {
  type: "new-court";
  author: string;
  courtName: string;
  parentCourtId: number;
  parentCourtName: string;
  params: CourtParams;
  timePeriods: CourtTimePeriods;
  policyUri: string;
  rationale: string;
}

export type KIPData = ParameterChangeKIP | PolicyChangeKIP | NewCourtKIP;

// --- Helpers ---

const formatDuration = (seconds: bigint): string => {
  const s = Number(seconds);
  if (s < 60) return `${s} seconds`;
  if (s < 3600) return `${Math.floor(s / 60)} minutes`;
  if (s < 86400) return `${Math.floor(s / 3600)} hours ${Math.floor((s % 3600) / 60)} minutes`;
  return `${Math.floor(s / 86400)} days ${Math.floor((s % 86400) / 3600)} hours`;
};

const formatBasisPoints = (bp: bigint): string => {
  return `${Number(bp) / 100}%`;
};

const getNetworkName = (deployment: Deployment): string => {
  switch (deployment) {
    case "mainnet":
      return "Arbitrum One (Production)";
    case "testnet":
      return "Arbitrum Sepolia (Testnet)";
    case "devnet":
      return "Arbitrum Sepolia Devnet";
  }
};

const getForumUrl = (): string => {
  return "https://forum.kleros.io/c/proposal/";
};

const getDate = (): string => {
  return new Date().toISOString().split("T")[0];
};

// --- Generators ---

export const generateParameterChangeKIP = (data: ParameterChangeKIP): string => {
  const deployment = getDeployment();
  const changes: string[] = [];

  // Compare and list changes
  if (data.proposedParams.minStake !== undefined && data.proposedParams.minStake !== data.currentParams.minStake) {
    changes.push(`- **minStake**: ${formatEther(data.currentParams.minStake)} PNK → ${formatEther(data.proposedParams.minStake)} PNK`);
  }
  if (data.proposedParams.feeForJuror !== undefined && data.proposedParams.feeForJuror !== data.currentParams.feeForJuror) {
    changes.push(`- **feeForJuror**: ${formatEther(data.currentParams.feeForJuror)} ETH → ${formatEther(data.proposedParams.feeForJuror)} ETH`);
  }
  if (data.proposedParams.alpha !== undefined && data.proposedParams.alpha !== data.currentParams.alpha) {
    changes.push(`- **alpha**: ${formatBasisPoints(data.currentParams.alpha)} → ${formatBasisPoints(data.proposedParams.alpha)}`);
  }
  if (data.proposedParams.jurorsForCourtJump !== undefined && data.proposedParams.jurorsForCourtJump !== data.currentParams.jurorsForCourtJump) {
    changes.push(`- **jurorsForCourtJump**: ${data.currentParams.jurorsForCourtJump} → ${data.proposedParams.jurorsForCourtJump}`);
  }
  if (data.proposedParams.hiddenVotes !== undefined && data.proposedParams.hiddenVotes !== data.currentParams.hiddenVotes) {
    changes.push(`- **hiddenVotes**: ${data.currentParams.hiddenVotes} → ${data.proposedParams.hiddenVotes}`);
  }

  // Time period changes
  if (data.proposedTimePeriods.evidence !== undefined && data.proposedTimePeriods.evidence !== data.currentTimePeriods.evidence) {
    changes.push(`- **evidencePeriod**: ${formatDuration(data.currentTimePeriods.evidence)} → ${formatDuration(data.proposedTimePeriods.evidence)}`);
  }
  if (data.proposedTimePeriods.commit !== undefined && data.proposedTimePeriods.commit !== data.currentTimePeriods.commit) {
    changes.push(`- **commitPeriod**: ${formatDuration(data.currentTimePeriods.commit)} → ${formatDuration(data.proposedTimePeriods.commit)}`);
  }
  if (data.proposedTimePeriods.vote !== undefined && data.proposedTimePeriods.vote !== data.currentTimePeriods.vote) {
    changes.push(`- **votePeriod**: ${formatDuration(data.currentTimePeriods.vote)} → ${formatDuration(data.proposedTimePeriods.vote)}`);
  }
  if (data.proposedTimePeriods.appeal !== undefined && data.proposedTimePeriods.appeal !== data.currentTimePeriods.appeal) {
    changes.push(`- **appealPeriod**: ${formatDuration(data.currentTimePeriods.appeal)} → ${formatDuration(data.proposedTimePeriods.appeal)}`);
  }

  return `---
kip: <TBD>
title: Update ${data.courtName} Court Parameters
author: ${data.author}
discussions-to: ${getForumUrl()}
status: Draft
type: Parameter
created: ${getDate()}
---

## Summary

This proposal updates the parameters of the **${data.courtName}** court (ID: ${data.courtId}) on ${getNetworkName(deployment)}.

## Proposed Changes

${changes.join("\n")}

## Motivation

${data.rationale || "_[Please explain why these changes are needed]_"}

## Technical Specification

The following function call should be executed by the KlerosCore owner/governor:

\`\`\`solidity
KlerosCore.changeCourtParameters(
    ${data.courtId},                           // courtID
    ${data.proposedParams.hiddenVotes ?? data.currentParams.hiddenVotes},                          // hiddenVotes
    ${data.proposedParams.minStake ?? data.currentParams.minStake},  // minStake
    ${data.proposedParams.alpha ?? data.currentParams.alpha},                         // alpha
    ${data.proposedParams.feeForJuror ?? data.currentParams.feeForJuror},   // feeForJuror
    ${data.proposedParams.jurorsForCourtJump ?? data.currentParams.jurorsForCourtJump},                          // jurorsForCourtJump
    [${data.proposedTimePeriods.evidence ?? data.currentTimePeriods.evidence}, ${data.proposedTimePeriods.commit ?? data.currentTimePeriods.commit}, ${data.proposedTimePeriods.vote ?? data.currentTimePeriods.vote}, ${data.proposedTimePeriods.appeal ?? data.currentTimePeriods.appeal}]  // timesPerPeriod [evidence, commit, vote, appeal]
);
\`\`\`

## Rationale

${data.rationale || "_[Please provide detailed rationale for each change]_"}

## Implementation

Implementation requires the KlerosCore owner to execute the \`changeCourtParameters\` function via:
- Direct transaction (if owner is EOA)
- Safe multisig transaction (if owner is a Safe)

## Backwards Compatibility

Parameter changes take effect immediately for new disputes. Existing disputes will continue with their original parameters.

## Security Considerations

- **minStake invariant**: The proposed minStake must be ≥ parent court minStake and ≤ all child court minStakes.
- **alpha range**: Alpha must be between 0 and 10000 basis points.
- **Time periods**: All time periods must be > 0 to prevent stuck disputes.

---
*Generated by Kleros Court Manager*
`;
};

export const generatePolicyChangeKIP = (data: PolicyChangeKIP): string => {
  const deployment = getDeployment();

  return `---
kip: <TBD>
title: Update ${data.courtName} Court Policy
author: ${data.author}
discussions-to: ${getForumUrl()}
status: Draft
type: Parameter
created: ${getDate()}
---

## Summary

This proposal updates the policy document of the **${data.courtName}** court (ID: ${data.courtId}) on ${getNetworkName(deployment)}.

## Proposed Changes

- **Current Policy**: ${data.currentPolicyUri || "_None set_"}
- **Proposed Policy**: ${data.proposedPolicyUri}
- **Policy Name**: ${data.proposedPolicyName}

## Motivation

${data.rationale || "_[Please explain why the policy needs to be updated]_"}

## Technical Specification

The following function call should be executed by the PolicyRegistry owner:

\`\`\`solidity
PolicyRegistry.setPolicy(
    ${data.courtId},                    // courtID
    "${data.proposedPolicyName}",       // courtName
    "${data.proposedPolicyUri}"         // policy URI (IPFS)
);
\`\`\`

## Policy Content

_[Please include a summary of the policy content or link to the full document]_

## Rationale

${data.rationale || "_[Please provide detailed rationale for the policy change]_"}

## Implementation

Implementation requires the PolicyRegistry owner to execute the \`setPolicy\` function.

## Backwards Compatibility

Policy changes apply to all future disputes in this court. Jurors should review the new policy before staking.

## Security Considerations

- The policy URI should point to an immutable IPFS document.
- Policy content should be reviewed for clarity and completeness.

---
*Generated by Kleros Court Manager*
`;
};

export const generateNewCourtKIP = (data: NewCourtKIP): string => {
  const deployment = getDeployment();

  return `---
kip: <TBD>
title: Create New Court: ${data.courtName}
author: ${data.author}
discussions-to: ${getForumUrl()}
status: Draft
type: Core
created: ${getDate()}
---

## Summary

This proposal creates a new court called **${data.courtName}** as a child of the **${data.parentCourtName}** court (ID: ${data.parentCourtId}) on ${getNetworkName(deployment)}.

## Proposed Parameters

| Parameter | Value |
|-----------|-------|
| Parent Court | ${data.parentCourtName} (ID: ${data.parentCourtId}) |
| Hidden Votes | ${data.params.hiddenVotes ? "Yes (commit-reveal)" : "No (open voting)"} |
| Min Stake | ${formatEther(data.params.minStake)} PNK |
| Alpha | ${formatBasisPoints(data.params.alpha)} |
| Fee per Juror | ${formatEther(data.params.feeForJuror)} ETH |
| Jurors for Court Jump | ${data.params.jurorsForCourtJump} |
| Evidence Period | ${formatDuration(data.timePeriods.evidence)} |
| Commit Period | ${formatDuration(data.timePeriods.commit)} |
| Vote Period | ${formatDuration(data.timePeriods.vote)} |
| Appeal Period | ${formatDuration(data.timePeriods.appeal)} |
| Policy URI | ${data.policyUri || "_TBD_"} |

## Motivation

${data.rationale || "_[Please explain why this new court is needed]_"}

## Technical Specification

### Step 1: Create Court

\`\`\`solidity
KlerosCore.createCourt(
    ${data.parentCourtId},               // parent
    ${data.params.hiddenVotes},          // hiddenVotes
    ${data.params.minStake},             // minStake
    ${data.params.alpha},                // alpha
    ${data.params.feeForJuror},          // feeForJuror
    ${data.params.jurorsForCourtJump},   // jurorsForCourtJump
    [${data.timePeriods.evidence}, ${data.timePeriods.commit}, ${data.timePeriods.vote}, ${data.timePeriods.appeal}],  // timesPerPeriod
    0x05,                                // sortitionExtraData (default)
    [1]                                  // supportedDisputeKits (Classic)
);
\`\`\`

### Step 2: Set Policy

\`\`\`solidity
PolicyRegistry.setPolicy(
    <newCourtId>,           // courtID (assigned after creation)
    "${data.courtName}",    // courtName
    "${data.policyUri}"     // policy URI
);
\`\`\`

## Rationale

${data.rationale || "_[Please provide detailed rationale for the new court and its parameters]_"}

## Use Cases

_[Please describe the types of disputes this court is intended to handle]_

## Implementation

Implementation requires two transactions:
1. \`KlerosCore.createCourt()\` - Creates the court with specified parameters
2. \`PolicyRegistry.setPolicy()\` - Sets the court policy document

## Backwards Compatibility

Creating a new court has no impact on existing courts or disputes.

## Security Considerations

- **minStake invariant**: The new court's minStake (${formatEther(data.params.minStake)} PNK) must be ≥ parent court minStake.
- **Dispute Kit**: The court must support the Classic Dispute Kit (ID: 1).
- **Policy**: A clear policy should be set before the court receives disputes.

---
*Generated by Kleros Court Manager*
`;
};

// --- Main Generator ---

export const generateKIP = (data: KIPData): string => {
  switch (data.type) {
    case "parameter-change":
      return generateParameterChangeKIP(data);
    case "policy-change":
      return generatePolicyChangeKIP(data);
    case "new-court":
      return generateNewCourtKIP(data);
  }
};

// --- Clipboard Helper ---

export const copyKIPToClipboard = async (data: KIPData): Promise<boolean> => {
  const markdown = generateKIP(data);
  try {
    await navigator.clipboard.writeText(markdown);
    return true;
  } catch (err) {
    console.error("Failed to copy KIP to clipboard:", err);
    return false;
  }
};
