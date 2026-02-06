# Court Manager

Admin tool for managing Kleros court hierarchy, parameters, and policies.

## Features

### MVP (Phase 1)
- [x] View court hierarchy (tree structure)
- [x] View court parameters (minStake, alpha, feeForJuror, etc.)
- [x] View time periods (evidence, commit, vote, appeal)
- [x] View court policies (from PolicyRegistry)
- [x] Client-side validation (minStake invariants, alpha bounds, etc.)
- [x] EOA vs Multisig detection
- [ ] Edit court parameters (changeCourtParameters)
- [ ] Edit court policy (PolicyRegistry.setPolicy)
- [ ] Create new courts (createCourt)
- [ ] **IPFS upload** for policies (via Atlas API)
- [ ] **Safe Transaction Service API** submission (not just JSON export)
- [ ] **KIP template export** for non-owners (governance proposal markdown)

### Phase 2
- [ ] **Tenderly simulation integration** — simulate tx batch before submission
  - If simulation passes → option to submit directly to Safe API
  - If simulation fails → show detailed errors, block submission
  - Reduces signing fatigue by catching issues before alerting signers
- [ ] Diff view — show what's changing before execution
- [ ] Batch operations — edit multiple courts in one transaction
- [ ] Court disable/enable toggle

### Phase 3
- [ ] Arbitrable Explorer integration
- [ ] Dispute Kit management per court
- [ ] Historical parameter changes (from events)
- [ ] Gas estimation

## Networks

| Network | Chain | Deployment |
|---------|-------|------------|
| Mainnet | Arbitrum One (42161) | Production beta |
| Testnet | Arbitrum Sepolia (421614) | arbitrumSepolia |
| Devnet | Arbitrum Sepolia (421614) | arbitrumSepoliaDevnet |

## User Roles

| User | Can View | Can Edit | Submit Method |
|------|----------|----------|---------------|
| Owner (EOA) | ✅ | ✅ | Direct on-chain tx |
| Owner (Multisig) | ✅ | ✅ | Safe Transaction Service API |
| Non-owner | ✅ (read-only) | ❌ | Copy KIP template to clipboard |

**KIP = Kleros Improvement Proposal** — markdown governance template for proposing parameter/policy/court changes through governance.

## Architecture

```
page.tsx                    # Main page, wallet connection
├── Header.tsx              # Title, description
├── CourtTree.tsx           # Recursive tree view
├── CourtDetails.tsx        # Parameter view/edit panel
├── CourtManagerContext.tsx # State, validation, contract reads
├── CreateCourtModal.tsx    # (TODO) New court form
├── PolicyEditor.tsx        # (TODO) Policy URI management
└── SafeBatchExport.tsx     # (TODO) JSON export for multisig
```

## Contracts

- **KlerosCore** (Arbitrum: `0x991d2df165670b9cac3B022f4B68D65b664222ea`)
  - `courts(uint256)` — get court params
  - `getTimesPerPeriod(uint96)` — get time periods
  - `createCourt(...)` — create new court (owner only)
  - `changeCourtParameters(...)` — update court (owner only)
  - `owner()` — get owner address

- **PolicyRegistry** (`0x553dcbF6aB3aE06a1064b5200Df1B5A9fB403d3c`)
  - `policies(uint256)` — get policy URI
  - `setPolicy(uint256, string, string)` — set policy (owner only)
  - `owner()` — get owner address

## Validation Rules

Enforced client-side before transaction submission:

| Rule | Severity | Description |
|------|----------|-------------|
| `minStake >= parent.minStake` | Error | Children must have higher min stake |
| `minStake <= children.minStake` | Error | Parent can't exceed children |
| `alpha ∈ [0, 10000]` | Error | Basis points range |
| `timesPerPeriod[i] > 0` | Error | All periods must be positive |
| `feeForJuror > 0` | Warning | Should be set for incentives |
| `jurorsForCourtJump > 0` | Warning | Should be set for appeals |

## Safe Transaction Builder Integration

When owner is a multisig (Safe):
1. Build transaction calldata for each change
2. Package as Safe Transaction Builder JSON
3. Either:
   - **Current**: Export JSON file → import manually into Safe UI → simulate → sign
   - **Future (Tenderly)**: Simulate via API → if pass, submit directly to Safe Transaction Service API

## Development

```bash
cd web-devtools
yarn install
yarn wagmi generate  # Generate contract hooks
yarn dev            # Start dev server
```

## Related Files

- `contracts/scripts/populateCourts.ts` — Reference for court parameter management
- `contracts/scripts/populatePolicyRegistry.ts` — Reference for policy management
- `contracts/scripts/utils/execution.ts` — EOA vs multisig detection pattern
- `contracts/scripts/utils/tx-builder.ts` — Safe TX Builder JSON format
- `contracts/config/courts.v2.mainnet.json` — Current mainnet court config
