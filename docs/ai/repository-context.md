# Repository Context — Tricksfor SmartContract

This document describes the domain, purpose, structure, and integration context of the Tricksfor SmartContract repository. It is intended to help AI tools, new contributors, and auditors quickly understand what this repository is, what it is not, and what constraints govern its design.

---

## Domain Summary

**Tricksfor** is a transparency-first blockchain gaming platform. Players participate in games where fairness, verifiability, and auditability are core promises. Blockchain infrastructure is used to provide tamper-resistant ownership records, publicly verifiable staking states, and audit trails that players and third parties can independently verify.

Key platform values:
- **Fairness** — outcomes and states are verifiable by anyone
- **Security** — player assets are protected; admin powers are limited and explicit
- **Transparency** — all state transitions are recorded as on-chain events
- **Auditability** — the full history of a wallet's staking activity can be reconstructed from logs alone

---

## Repository Purpose

This repository contains the Solidity smart contracts and Nethereum integration layer for the Tricksfor platform's NFT and staking infrastructure. Specifically, it implements:

1. **Booster NFT Collection Contract** — an ERC-721 NFT collection representing in-game "Booster" items. Players own Booster NFTs, which can be staked to gain game advantages. This contract must remain OpenSea-compatible.

2. **Staking Contract** — a separate contract that accepts Booster NFTs from players, records staking state, and emits integration-critical events. It does **not** calculate or distribute rewards.

3. **Nethereum Integration Layer** — C# typed DTOs, event handlers, and ABI/BIN artifacts that allow the Tricksfor backend to interact with the contracts and process on-chain events.

---

## Main Contracts

| Contract | Responsibility |
|---|---|
| `BoosterNFT` (ERC-721) | Minting, ownership, metadata, royalties, OpenSea compatibility |
| `BoosterStaking` | NFT custody during staking period, stake/unstake event emission |

These contracts are **intentionally separate**. Do not merge them.

---

## Known Downstream Consumers

### 1. Tricksfor Backend Indexer (separate project)
A separate backend service processes blockchain logs emitted by the staking contract. It:
- Listens for `Staked` and `Unstaked` events
- Reconstructs per-wallet, per-token staking state from the event stream
- Uses this state to determine eligibility and context for game actions

**This indexer is the primary reason event schemas are treated as a public integration contract.** Any change to event names, field names, field types, or indexed attributes is a breaking change for the indexer.

### 2. Nethereum Integration Layer (this repository)
The C# Nethereum layer in this repository consumes the same contracts and events. DTOs must exactly match Solidity definitions.

### 3. OpenSea and NFT Marketplaces
The `BoosterNFT` contract must remain compatible with OpenSea's metadata standards (`tokenURI`, `contractURI`) and royalty standard (ERC-2981).

---

## Key Constraints

| Constraint | Reason |
|---|---|
| No reward logic in contracts | Reward settlement is off-chain; keeping it there preserves flexibility and reduces attack surface |
| No floating point | EVM does not support floating point; integer math with basis points is required |
| Event schemas are stable | Downstream indexer reconstructs state from logs; schema changes break reconstruction |
| Current-state read methods must match event semantics | Indexer and UI consumers rely on consistency between events and on-chain state |
| NFT and staking contracts must be separate | Separation of concerns, independent upgradeability, auditability |
| No hidden admin seizure paths | Tricksfor's transparency promise requires all admin capabilities to be visible and documented |
| OpenZeppelin components preferred | Battle-tested, audited, widely understood; reduces custom-code risk |

---

## OpenSea Compatibility Expectations

The `BoosterNFT` contract must:
- Implement `tokenURI(uint256 tokenId)` returning a valid metadata URI
- Implement `contractURI()` returning collection-level metadata (OpenSea extension)
- Implement ERC-2981 (`royaltyInfo`) for on-chain royalty information
- Emit `Transfer` events on all ownership changes (standard ERC-721 requirement)
- Not use `ERC721Enumerable` by default unless on-chain enumeration is justified — it increases gas costs without benefiting OpenSea compatibility

---

## Nethereum Integration Expectations

The Nethereum layer in this repository must:
- Use **typed function message classes** for all contract calls
- Use **typed event DTO classes** for all event decoding — no raw ABI string parsing
- Match every event DTO field name, type, and `[Parameter]` attribute **exactly** to the Solidity event definition
- Version ABI and BIN artifacts alongside the contracts that produce them
- Include integration tests that verify **both state reads and event logs**
- Be updated atomically when contract interfaces change — a Solidity change and its Nethereum DTO change are a single unit of work

---

## What Is Explicitly Out of Scope

The following are **not** part of this repository and must not be added:

- Reward calculation, accumulation, or distribution logic
- Token payouts or ERC-20 transfers initiated by the staking contract
- Game logic, scoring, or match result processing
- Player account management or off-chain identity
- Any fictional "standard ERC-721 staking interface" — no such standard exists
