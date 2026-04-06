# Contract Change Skill — Tricksfor SmartContract

Use this checklist whenever a Solidity contract in this repository is being added, modified, or refactored. Work through every item before opening a PR and before approving one.

---

## When to Use This Skill

- Implementing a new contract feature
- Modifying existing contract logic
- Refactoring for gas optimization
- Fixing a contract bug

---

## Pre-Implementation Questions

Before writing a single line of code, answer the following:

1. Which contract(s) are affected — `TricksforBoosterNFT`, `TricksforBoosterStaking`, or both?
2. Will this change require an event schema change? (If yes, also apply `event-change-skill.md`.)
3. Will this change affect Nethereum integration? (If yes, also apply `nethereum-integration-skill.md`.)
4. Will this change affect OpenSea compatibility? (If yes, also apply `opensea-compatibility-skill.md`.)
5. Will this change affect the backend indexer's ability to reconstruct staking state? (If yes, also apply `indexing-compatibility-skill.md`.)

---

## Implementation Checklist

### State Model
- [ ] All storage variables affected by this change are identified and documented
- [ ] No unnecessary storage additions — every stored field has a clear purpose
- [ ] Storage layout is not changed in a way that would break an upgradeable proxy (if applicable)
- [ ] Storage changes are reviewed for gas cost implications

### Access Control
- [ ] Every new or modified function has explicit access control (`onlyOwner`, role check, or documented as public)
- [ ] No function allows an unauthorized caller to modify state or transfer assets
- [ ] Admin-only paths are named clearly and consistently (e.g., `emergencyWithdraw`, not `withdraw`)
- [ ] No hidden mechanism exists for an admin to seize user assets without their consent outside an explicitly documented emergency path
- [ ] Emergency paths, if added, emit a dedicated event and are documented in `memory.md`

### Custom Errors
- [ ] `require` with long strings is not used in hot paths — custom errors (`error Unauthorized()`) are preferred
- [ ] Custom errors are named descriptively and consistently with existing errors in the contract

### Event Emissions
- [ ] Every state change that downstream consumers need is covered by an event emission
- [ ] No silent mutations exist — there are no state changes without a corresponding event
- [ ] Event emissions follow the naming convention used in this repository (past-tense verb, e.g., `TokenStaked`)
- [ ] If events were added or changed, `event-change-skill.md` was applied

### Reentrancy
- [ ] Any function that calls an external contract (`transferFrom`, token payouts, callbacks) is protected by `ReentrancyGuard` or uses checks-effects-interactions
- [ ] Custody-transferring functions always update internal state before calling external contracts

### Pause and Emergency Behavior
- [ ] Pause behavior is reviewed — what is gated behind `whenNotPaused` and what remains callable while paused?
- [ ] Emergency paths are explicit, named, event-emitting, and documented
- [ ] Pausing the contract does not leave user assets permanently locked without a documented recovery mechanism

### Test Coverage
- [ ] Happy-path state transitions are covered by tests
- [ ] Event emission is verified in tests (name, indexed fields, non-indexed values)
- [ ] Access-control rejections are verified (unauthorized callers receive the correct custom error)
- [ ] Edge cases and boundary conditions are tested (e.g., token already staked, zero address, double unstake)
- [ ] Tests use the existing Hardhat test framework — no new test runner introduced without discussion

### Nethereum Impact
- [ ] Nethereum ABI/BIN artifacts are regenerated and committed if any public interface changed
- [ ] Function message classes are updated if any public function signature changed
- [ ] Event DTOs are updated if any event signature changed
- [ ] `nethereum-integration-skill.md` was applied if any integration layer change was needed

### Indexing Impact
- [ ] The backend indexer can still reconstruct staking state correctly from events after this change
- [ ] `indexing-compatibility-skill.md` was applied if any event or state change might affect indexer assumptions

### OpenSea Impact
- [ ] `tokenURI`, `contractURI`, and ERC-2981 royalty support are unaffected, or changes are explicitly justified
- [ ] `opensea-compatibility-skill.md` was applied if the NFT contract was modified

### Contract Responsibilities
- [ ] `TricksforBoosterNFT` and `TricksforBoosterStaking` remain architecturally separate — no staking logic in the NFT contract, no NFT logic in the staking contract
- [ ] The change does not introduce Booster classification, reward multipliers, or tier logic into either contract (these belong in the off-chain backend)
- [ ] Reward settlement logic has not been added — the staking contract records state and emits events only

---

## Quick Reference: What This Repository Does Not Do

| Out of Scope | Where It Lives |
|---|---|
| Reward calculation and distribution | Off-chain backend |
| Booster classification and multiplier definitions | Off-chain backend |
| Player account management | Off-chain backend |
| Game logic and match results | Off-chain backend |
| Any fictional "standard ERC-721 staking interface" | Does not exist — do not invent one |

---

## Related Skills

- [`event-change-skill.md`](./event-change-skill.md) — apply when adding or changing events
- [`nethereum-integration-skill.md`](./nethereum-integration-skill.md) — apply when any public interface changes
- [`indexing-compatibility-skill.md`](./indexing-compatibility-skill.md) — apply when events or state transitions change
- [`opensea-compatibility-skill.md`](./opensea-compatibility-skill.md) — apply when the NFT contract is modified
