# Architecture Guardrails — Tricksfor SmartContract

This document defines the architectural rules, event stability requirements, state model rules, testing expectations, security review expectations, and indexing compatibility requirements for the Tricksfor SmartContract repository. These guardrails apply to all contributors and AI tools working in this repository.

---

## Architectural Separation Rules

### Rule 1: NFT collection and staking are separate contracts
`BoosterNFT` and `BoosterStaking` are two distinct deployed contracts. They must remain separate.

- Do not add staking methods to the NFT contract.
- Do not add minting or metadata methods to the staking contract.
- The staking contract may hold a reference to the NFT contract address for validation, but this is a one-way dependency only.

### Rule 2: Reward settlement is always off-chain
The staking contract's responsibility ends at recording staking state and emitting events. It does not:
- Calculate staking rewards or multipliers applied to game outcomes
- Distribute tokens, points, or any form of compensation
- Store reward balances or accruals

Reward logic belongs in the off-chain Tricksfor backend. Any proposal to add reward logic to the contracts must be explicitly rejected unless a separate, well-justified architectural decision overrides this rule.

### Rule 3: Use standard ERC-721 custody transfer for staking
When a player stakes an NFT:
1. The player calls `approve(stakingContractAddress, tokenId)` on the NFT contract (standard ERC-721).
2. The staking contract calls `transferFrom(player, stakingContract, tokenId)` to take custody.
3. The staking contract records the original owner and emits a `Staked` event.

When a player unstakes:
1. The staking contract transfers the NFT back to the original owner.
2. The staking contract clears the staking record and emits an `Unstaked` event.

Do not invent alternative custody mechanisms. Do not require special NFT contract modifications to enable staking.

### Rule 4: Keep inheritance shallow
Contract inheritance chains must be kept short and purposeful. Prefer composition (internal helper libraries, OpenZeppelin base contracts) over deep inheritance. Avoid multiple inheritance that introduces ambiguity about which parent's function is called.

### Rule 5: Use OpenZeppelin battle-tested components
Always prefer OpenZeppelin contracts over custom implementations for:
- `ERC721` base contract
- `Ownable` / `AccessControl` for admin functions
- `ReentrancyGuard` for external call protection
- `Pausable` for emergency stop
- `ERC2981` for royalty standard

Only deviate from OpenZeppelin when there is a documented, justified reason.

---

## Event Stability Expectations

Events emitted by the staking contract are part of the **public integration contract** between this repository and the Tricksfor backend indexer. Treat them with the same discipline as a versioned REST API.

### What must not change without a breaking-change notice
- Event names
- Event parameter names
- Event parameter types
- Which parameters are `indexed`
- Parameter order

### What constitutes a breaking change
Any of the above. A breaking change requires:
1. Explicit documentation in the PR describing the change and its downstream impact
2. Corresponding updates to Nethereum DTOs in the same PR
3. Coordination with the backend indexer team before deployment

### Adding new events
New events are additive and non-breaking, but must still:
- Use consistent naming conventions with existing events
- Include an `indexed` owner address and `indexed` tokenId where applicable
- Include a timestamp where the event records a time-sensitive state change

### Event naming conventions
- Past-tense verb phrases: `Staked`, `Unstaked`, `Paused`, `Unpaused`, `OwnershipTransferred`
- Do not use present tense (`Stake`, `Unstake`) or noun forms (`StakeEvent`)

---

## State Model Rules

### Rule 1: Current-state read methods must align with event semantics
For every state transition recorded as an event, there must be a corresponding read method that reflects the current state. Examples:

| Event | Required Read Method |
|---|---|
| `Staked(owner, tokenId, timestamp)` | `isStaked(tokenId) → bool`, `stakedOwnerOf(tokenId) → address` |
| `Unstaked(owner, tokenId, timestamp)` | `isStaked(tokenId)` must return `false` |

If an event says a token is staked, the read method must agree. State and events must never diverge.

### Rule 2: Wallet and token state must be reconstructable from events alone
Design state transitions such that a backend service replaying all historical events from block 0 can reconstruct the current state for any wallet or token. This means:
- Every state change must produce an event
- Events must carry enough information to reconstruct state without additional context
- There must be no silent state mutations (state changes without events)

### Rule 3: Use integer math and basis points
- All on-chain arithmetic must use integer types (`uint256`, etc.)
- Percentage-based values (multipliers, fees, rates) must be expressed in basis points (10 000 = 100%)
- Do not use fixed-point libraries unless justified and well-understood by the team
- Document the basis-point scale in comments adjacent to the variable declaration

### Rule 4: No silent state changes
Every function that modifies contract state must emit at least one event that fully describes the change. Pure view/pure functions are exempt.

---

## Testing Expectations

### Coverage requirements
Every pull request that changes contract logic must include or update tests covering:

1. **Happy-path state transitions** — the expected flow works correctly
2. **Event emission** — verify event name, indexed fields, and non-indexed values
3. **Access-control rejections** — unauthorized callers are rejected with the correct error
4. **Edge cases** — token already staked, unstaking by non-owner, zero address inputs, etc.

### Test structure
- Use the test framework already present in the repository (Hardhat/Ethers or equivalent)
- Tests for the NFT contract and staking contract must be in separate test files
- Test file names should mirror contract names: `BoosterNFT.test.js`, `BoosterStaking.test.js`

### Nethereum integration tests
- Must deploy contracts to a local test network (Hardhat node or Ganache)
- Must submit transactions and read both state and logs
- Must assert that decoded event DTO fields match expected values
- Must not mock the contract — test against real ABI/BIN artifacts

### What is not acceptable
- Tests that only check happy paths and skip access control
- Tests that do not verify event emission
- PRs that remove or weaken existing tests to make new code pass

---

## Security Review Expectations

Before merging any contract change, review for the following:

### Reentrancy
- Any function that calls an external contract (including `transferFrom` on ERC-721) must be protected with `ReentrancyGuard` or follow checks-effects-interactions strictly.
- The staking and unstaking functions are particularly sensitive — they transfer NFT custody.

### Access control
- All admin functions must be protected by `onlyOwner` or an appropriate role check.
- Admin functions must be enumerable and documented — there must be no hidden admin capabilities.
- Emergency withdrawal or forced unstake paths (if they exist) must be explicitly named, emit dedicated events, and be documented.

### Pause behavior
- If `Pausable` is used, document what is and is not gated behind the pause.
- Pausing must not prevent users from withdrawing their assets (a paused staking contract must still allow unstaking, or have a documented emergency path).

### Asset seizure
- There must be no mechanism for the contract owner or any admin to transfer a user's staked NFT to an arbitrary address without the user's consent, except through a documented, named, event-emitting emergency path.
- Proposals that introduce hidden seizure paths must be rejected.

### Integer overflow/underflow
- Use Solidity 0.8.x (built-in overflow checks) or OpenZeppelin `SafeMath` for older versions.
- Do not cast between integer types without explicit bounds checks.

---

## Indexing Compatibility Expectations

The Tricksfor backend indexer is a separate project that processes blockchain logs to reconstruct game state. The following rules protect its ability to operate correctly.

### Before changing any event
Ask: "Will the backend indexer still be able to reconstruct state correctly after this change?" If the answer is "no" or "maybe", the change is a breaking change and requires coordination.

### Before changing any public read method
Ask: "Does the backend indexer or Nethereum layer call this method? Will it still work?" Update callers atomically.

### Before adding a new state transition
Ask: "Will this state transition be visible to the indexer as an event?" If not, the indexer will have an incomplete view of state.

### ABI/BIN artifact versioning
- ABI and BIN artifacts must be committed to the repository alongside the contracts.
- When a contract changes, the corresponding artifact must be regenerated and committed in the same PR.
- Artifacts must not be .gitignored if they are consumed by the Nethereum integration layer.

### Nethereum DTO changes
- When a Solidity event changes, the corresponding Nethereum event DTO must be updated in the same PR.
- When a Solidity function changes, the corresponding Nethereum function message class must be updated in the same PR.
- DTO field names must match Solidity parameter names exactly (case-sensitive where the Nethereum binding requires it).
