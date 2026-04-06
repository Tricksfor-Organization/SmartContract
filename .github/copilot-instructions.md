# GitHub Copilot Instructions — Tricksfor SmartContract Repository

This file provides repository-specific guidance for GitHub Copilot and other AI coding assistants working in this repository. Read it carefully before generating any code, tests, or documentation.

---

## What This Repository Is

This is the **Tricksfor blockchain gaming** smart-contract repository. It implements:

- A **Booster NFT collection contract** (ERC-721, OpenSea-compatible)
- A **staking contract** that accepts Booster NFTs and emits integration-critical events
- **Nethereum integration** layer (C# DTOs, event handlers, ABI/BIN artifacts)

Tricksfor is a **transparency-first** platform. Fairness, security, auditability, and verifiability are non-negotiable design priorities, not nice-to-haves.

---

## What This Repository Is NOT

- It is **not** a generic NFT starter template.
- It is **not** a self-contained game engine — game logic lives elsewhere.
- It is **not** responsible for reward settlement — that happens off-chain in a separate system.
- It does **not** contain a "standard ERC-721 staking API" — no such standard exists. Do not invent one.

---

## Core Rules (Read Before Writing Any Code)

### 1. Do not invent a "standard ERC-721 stake/unstake API"
There is no ERC standard for staking. The staking contract uses:
- **Standard ERC-721 `approve` / `transferFrom`** for custody transfer
- **Custom `stake(tokenId)` and `unstake(tokenId)` methods** defined in this repository

Do not reference or implement any fictional `IERC721Staking` interface or similar.

### 2. Keep NFT collection and staking contracts separate
These are two distinct contracts with distinct responsibilities. Do not merge them, inherit between them, or put staking logic inside the NFT contract.

### 3. Treat stake/unstake events as integration-critical
`Staked(address indexed owner, uint256 indexed tokenId, uint256 timestamp)` and `Unstaked(address indexed owner, uint256 indexed tokenId, uint256 timestamp)` (or their equivalents in this repo) are part of the **public integration contract**. Downstream indexers and Nethereum consumers depend on these events to reconstruct state.

- Do **not** rename event fields.
- Do **not** remove indexed attributes.
- Do **not** change parameter order.
- If you must change an event shape, call it out explicitly as a breaking change.

### 4. Keep current-state read methods in sync with event semantics
Every state change emitted as an event must be queryable via a corresponding read method. If an event says a token is staked, `isStaked(tokenId)` must reflect that. Do not let events and state diverge.

### 5. Do not hide admin asset seizure logic
There must be no hidden mechanism for an admin to transfer or burn a user's staked NFT without that user's consent, outside of a clearly documented and auditable emergency path. If such a path is needed, it must:
- Be explicitly named (e.g., `emergencyWithdraw`)
- Emit a dedicated event
- Be documented

### 6. Reward settlement is off-chain — keep it out of the contracts
The staking contract records **staking state** and emits **events**. It does not calculate, distribute, or settle rewards. Do not add reward logic, token payouts, or point accumulation to these contracts.

### 7. Use integer math only — no floating point
All multipliers, rates, and ratios must use integer arithmetic. Use **basis points** (1 basis point = 0.01%, 10 000 basis points = 100%) for any percentage-based values.

### 8. Optimize for auditability and maintainability over cleverness
- Prefer explicit logic over clever abstractions.
- Keep contract inheritance shallow.
- Prefer OpenZeppelin battle-tested components over custom implementations.
- Avoid `ERC721Enumerable` unless there is a justified on-chain enumeration need — it adds gas cost.
- Use custom errors (`error Unauthorized()`) where useful for gas and clarity.

### 9. OpenSea compatibility matters
The NFT collection contract must remain compatible with OpenSea's metadata and royalty standards. Do not remove or break `tokenURI`, `contractURI`, or ERC-2981 royalty support without explicit justification.

### 10. Think about security on every change
Before generating contract code, consider:
- Reentrancy risks (use `ReentrancyGuard` or checks-effects-interactions)
- Pause/unpause behavior and what it gates
- Unauthorized access to admin functions (use `Ownable` or role-based access control)
- Whether state changes are atomic and consistent

---

## Nethereum Integration Rules

- Use **typed event DTOs and function message types** — do not use raw ABI decoding strings.
- Event DTO field names and types must **exactly match** the Solidity event definition (name, type, indexed attribute).
- ABI and BIN artifacts must be **versioned** alongside the contracts that produce them.
- Integration tests must verify **both on-chain state and emitted log content**.
- When changing any event or public method signature, update the corresponding Nethereum DTO and handler immediately — treat them as a single atomic change.
- Do not assume there is a "standard Nethereum staking handler" — the integration layer is custom to this repository.

---

## Testing Expectations

- Every change to contract logic must include or update tests.
- Tests must cover:
  - Happy-path state transitions
  - Event emission (name, indexed fields, values)
  - Access-control rejections
  - Edge cases and boundary conditions
- Use Hardhat (or the test framework already in this repository) — do not introduce a new test runner without discussion.

---

## AI Output Expectations

When generating code or documentation in this repository, AI tools should:

- **Not** mix game logic into smart contracts
- **Not** add reward/points/settlement logic to the staking contract
- **Preserve** existing public interfaces unless the issue explicitly asks to change them
- **Include** tests when changing contract logic
- **Consider** downstream indexing and Nethereum effects before changing events or method signatures
- **Explain** tradeoffs briefly in PR text or inline comments where the choice is non-obvious
- **Prefer** explicitness over abstraction in contract and event-driven code
- **Flag** any proposed event schema change as a potential breaking change for downstream consumers

---

## Quick Reference: What Copilot Should and Should Not Do

| ✅ Do | ❌ Do Not |
|---|---|
| Use OpenZeppelin ERC-721, Ownable, ReentrancyGuard | Invent a "standard staking API" |
| Keep NFT and staking contracts separate | Merge NFT and staking logic |
| Use basis points for multipliers | Use floating point or percentages |
| Emit stable, named events with indexed fields | Rename or reorder event parameters |
| Keep `isStaked` / read methods in sync with events | Let state and events diverge |
| Use custom errors for gas efficiency | Use `require` with long strings in hot paths |
| Add Nethereum DTOs matching Solidity exactly | Use raw ABI decoding in Nethereum layer |
| Document admin emergency paths explicitly | Hide asset seizure logic |
| Keep reward settlement off-chain | Add reward math to staking contract |
| Write tests covering events and access control | Skip tests when changing contract logic |
