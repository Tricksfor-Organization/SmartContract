# Nethereum Integration Skill — Tricksfor SmartContract

Use this checklist whenever a Solidity contract change in this repository requires updating the Nethereum C# integration layer. Every contract interface change has a corresponding Nethereum obligation. Work through every item before opening a PR and before approving one.

---

## When to Use This Skill

- Any public Solidity function signature was added, modified, or removed
- Any Solidity event was added, modified, or removed
- ABI/BIN artifacts need to be regenerated
- Integration tests need to be added or updated

---

## Core Rule

Nethereum DTOs and contract changes are **always updated atomically in the same PR.** Do not merge a Solidity change that leaves the C# integration layer out of sync with the deployed contract.

---

## Nethereum Integration Checklist

### ABI and BIN Artifacts
- [ ] ABI artifact has been regenerated from the updated Solidity contract
- [ ] BIN artifact has been regenerated from the updated Solidity contract
- [ ] Both ABI and BIN files are committed in the same PR as the contract change
- [ ] Artifact file names and paths follow the existing conventions in this repository
- [ ] No stale or outdated ABI/BIN artifacts remain in the repository

### Deployment Messages
- [ ] `ContractDeploymentMessage` (or equivalent deployment class) has been reviewed
- [ ] If the constructor signature changed, the deployment message class has been updated
- [ ] Constructor parameter names in C# match the Solidity constructor parameter names exactly (via `ParameterAttribute`)

### Function Messages
- [ ] Every new or modified public Solidity function has a corresponding typed function message class in C#
- [ ] `FunctionMessage` subclasses use `[Function(...)]` attributes that match the Solidity function name exactly
- [ ] `ParameterAttribute` names in function message classes match the Solidity parameter names exactly
- [ ] Parameter types in C# correctly map to the corresponding Solidity types (e.g., `BigInteger` for `uint256`, `string` for `string`, `string` for `address`)
- [ ] Removed or renamed functions have had their corresponding C# classes removed or renamed
- [ ] No raw ABI string decoding is used — all interactions use typed message classes

### Event DTOs
- [ ] Every new or modified Solidity event has a corresponding typed event DTO class in C#
- [ ] `EventDTO` subclasses use `[Event(...)]` attributes that match the Solidity event name exactly
- [ ] `ParameterAttribute` names in event DTO classes match the Solidity parameter names exactly (not the C# property names)
- [ ] `indexed` flags in `ParameterAttribute` match the Solidity `indexed` attributes exactly
- [ ] Parameter types in C# correctly map to the corresponding Solidity types
- [ ] Removed or renamed events have had their corresponding C# DTO classes removed or renamed

### Contract Services
- [ ] Contract service classes have been updated to reflect new or changed functions
- [ ] Any new query functions have corresponding service methods that return decoded typed results
- [ ] Any new transaction functions have corresponding service methods that return typed receipt objects
- [ ] Contract service method names follow the existing naming conventions in this repository

### Integration Tests
- [ ] Integration tests have been added or updated for every changed or new contract function
- [ ] Integration tests deploy contracts to a local test node (not mock objects) and verify actual on-chain behavior
- [ ] Integration tests verify **both** on-chain state (via read method calls) **and** emitted log content (via event DTO decoding)
- [ ] Tests verify that event DTO fields match the expected values from the Solidity transaction
- [ ] Access-control rejections are tested (unauthorized callers produce the expected error)
- [ ] Edge cases are covered (e.g., token already staked, zero address, double unstake)

### Receipt Decoding
- [ ] Transaction receipt decoding has been verified for all new or modified functions that emit events
- [ ] `DecodeAllEvents` or typed event extraction from receipts produces correct DTO instances
- [ ] All expected events are present in the decoded receipt output
- [ ] No events are silently dropped or misinterpreted during decoding

### Block Log Querying
- [ ] Block-range log queries using the new or updated event DTOs have been verified
- [ ] Filtering by indexed fields (`staker`, `tokenId`) produces correct results
- [ ] Log querying works correctly when multiple events of the same type appear in the same block
- [ ] Historical log replay from block 0 still produces the correct reconstructed state

### Typed DTO Alignment
- [ ] All event DTO `ParameterAttribute` names exactly match Solidity parameter names (case-sensitive)
- [ ] All event DTO `indexed` flags exactly match Solidity `indexed` attributes
- [ ] All function message `ParameterAttribute` names exactly match Solidity parameter names (case-sensitive)
- [ ] C# types correctly represent the full range of the Solidity types (e.g., `BigInteger` not `int` for `uint256`)
- [ ] No DTO field was accidentally renamed to a C# idiomatic name that doesn't match the Solidity parameter name (PascalCase property names are fine; the `ParameterAttribute` name string must match Solidity exactly)

---

## Solidity ↔ C# Type Mapping Reference

| Solidity Type | C# Nethereum Type |
|---|---|
| `uint256` | `BigInteger` |
| `uint128`, `uint64`, `uint32`, `uint16`, `uint8` | `BigInteger` (or smaller integer if range is safe) |
| `address` | `string` |
| `bool` | `bool` |
| `bytes32` | `byte[]` |
| `string` | `string` |
| `bytes` | `byte[]` |

---

## Related Skills

- [`contract-change-skill.md`](./contract-change-skill.md) — apply for all contract changes
- [`event-change-skill.md`](./event-change-skill.md) — apply when events change
- [`indexing-compatibility-skill.md`](./indexing-compatibility-skill.md) — apply when events or state transitions change
