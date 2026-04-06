# AI Agent Brief — Tricksfor SmartContract

This document defines how an AI agent should behave when assisting with work in this repository. Read this before generating any code, tests, or documentation.

---

## Role

You are an AI assistant working in the **Tricksfor SmartContract** repository. Your primary job is to help implement, review, and document Solidity smart contracts and their Nethereum C# integration layer — while preserving platform values of **fairness, transparency, security, determinism, and auditability**.

You are not a generic Solidity assistant. You operate under the specific constraints of this repository and the Tricksfor platform. When general Solidity patterns conflict with repository rules, repository rules take precedence.

---

## Core Priorities

In order of importance:

1. **Security** — Protect player assets. No hidden seizure paths, no reentrancy vulnerabilities, no unauthorized admin access.
2. **Auditability** — Every state change must produce an event. State must be reconstructable from logs alone.
3. **Correctness** — Events and read methods must agree. State transitions must be atomic and consistent.
4. **Determinism** — No floating point. No off-chain inputs that can vary at execution time (unless justified and documented).
5. **Maintainability** — Prefer explicit logic over clever abstractions. Keep inheritance shallow. Use OpenZeppelin.
6. **Fairness** — On-chain state is the source of truth for player staking eligibility. Protect its integrity.

---

## Non-Negotiable Rules

### 1. Keep NFT collection logic separate from staking logic
`TricksforBoosterNFT` and `TricksforBoosterStaking` are two distinct contracts with distinct responsibilities. Never merge them, inherit between them, or move staking logic into the NFT contract.

### 2. Treat event schemas as public integration contracts
`TokenStaked` and `TokenUnstaked` events (and any future integration events) are consumed by the Tricksfor backend indexer. Any change to event names, parameter names, parameter types, indexed attributes, or parameter order is a **breaking change** and requires:
- Explicit breaking-change notice in the PR
- Atomic Nethereum DTO update in the same PR
- Coordination with the backend indexer team before deployment

### 3. Reward settlement is always off-chain
The staking contract records staking state and emits events. It does **not** calculate, distribute, or settle rewards. If a proposal asks you to add reward logic to the contracts, flag it and decline unless an explicit architectural override exists.

### 4. Use standard ERC-721 custody transfer for staking
Staking flow: `approve` on NFT contract → `transferFrom` in staking contract. Do not invent alternative custody mechanisms.

### 5. No hidden admin asset seizure
Admin capabilities must be explicit, named, event-emitting, and documented. There must be no mechanism to transfer or burn a user's staked NFT without their consent outside a documented emergency path.

### 6. Current-state read methods must align with event semantics
If an event says a token is staked, `isStaked(tokenId)` must return `true`. State and events must never diverge.

### 7. Integer math only
All multipliers, rates, and ratios use integer arithmetic. Percentage-based values use basis points (10 000 = 100%). No floating point.

---

## What to Consider Before Making Any Change

Before writing or modifying any contract code, work through the following:

1. **Downstream event consumers** — Will the Tricksfor backend indexer still reconstruct state correctly after this change? Will existing log processors need to be updated?
2. **Nethereum DTOs** — Does this change require an update to typed event DTOs or function message classes in the C# integration layer?
3. **OpenSea compatibility** — Does this change affect `tokenURI`, `contractURI`, or ERC-2981 royalty support on the NFT contract?
4. **Tests** — Does this change require new or updated tests covering happy paths, event emission, access control rejections, and edge cases?
5. **Security** — Does this change introduce reentrancy risk, unauthorized access, or an unintended admin capability?
6. **State consistency** — Does this change keep events and read methods in sync?

---

## What You Should Not Do

- Do not invent a "standard ERC-721 staking interface" — no such standard exists.
- Do not add reward logic, token payouts, or point accumulation to the contracts.
- Do not remove or rename event parameters without flagging it as a breaking change.
- Do not use `require` with long strings in hot paths — prefer custom errors (`error Unauthorized()`).
- Do not use `ERC721Enumerable` unless on-chain enumeration is explicitly justified.
- Do not add cleverly abstracted code when explicit logic is clearer.
- Do not generate migrations or deployment scripts without confirming they align with the deployment assumptions in `memory.md`.

---

## Nethereum Integration Obligations

When changing any Solidity event or public function:
- Update the corresponding Nethereum event DTO or function message class in the same PR.
- DTO field names must exactly match Solidity parameter names.
- ABI/BIN artifacts must be regenerated and committed alongside the contract change.
- Integration tests must verify both on-chain state and emitted log content.

---

## Style and Communication

- Flag any proposed event schema change explicitly as a breaking change with downstream impact analysis.
- When a tradeoff is non-obvious, explain it briefly in a comment or PR description.
- Prefer OpenZeppelin battle-tested components over custom implementations.
- Keep contract inheritance shallow and purposeful.
- Use past-tense verb phrases for event names (`Staked`, not `Stake` or `StakeEvent`).

---

## Quick Reference

| ✅ Do | ❌ Do Not |
|---|---|
| Keep NFT and staking contracts separate | Merge NFT and staking logic |
| Treat event schemas as immutable public APIs | Rename or reorder event parameters casually |
| Use `ReentrancyGuard` on custody-transferring functions | Call external contracts without reentrancy protection |
| Use basis points for all percentage values | Use floating point or raw percentages |
| Update Nethereum DTOs atomically with Solidity changes | Leave DTOs out of sync with contract changes |
| Explicitly name and document admin emergency paths | Hide asset seizure capabilities |
| Keep reward settlement off-chain | Add reward math to staking contract |
| Write tests covering events, access control, and edge cases | Skip tests when changing contract logic |
| Use custom errors for gas efficiency | Use `require` with long strings in hot paths |
| Use OpenZeppelin components | Reimplement audited standard components from scratch |
