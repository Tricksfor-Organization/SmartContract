# Indexing Task Template

Use this template when requesting AI-assisted work related to the Tricksfor backend indexer's interaction with on-chain events. Fill in the bracketed sections before submitting. Remove sections that do not apply.

---

## Task Type

<!-- Select one or more: -->
- [ ] Review impact of an event schema change on the indexer
- [ ] Define log processing logic for a new or changed event
- [ ] Update state reconstruction behavior
- [ ] Check idempotency and reorg handling
- [ ] Verify alignment between event data and contract read methods
- [ ] Document indexing assumptions for a new contract feature

---

## Context

**Contract(s) involved:**
<!-- e.g., TricksforBoosterStaking -->

**Related Solidity change (if any):**
<!-- Link to the PR, commit, or issue that triggered this indexing work -->

**Brief description:**
<!-- 1–3 sentences describing what indexing work is needed and why -->

---

## Event Schema Under Review

<!-- Provide the current and/or proposed event signature(s) being reviewed. -->

**Current event signature:**
```solidity
// e.g., event TokenStaked(address indexed staker, uint256 indexed tokenId, uint256 stakedAt);
```

**Proposed event signature (if changing):**
```solidity
// Describe the change, or leave blank if not changing
```

**Is this a breaking change?**
- [ ] Yes — field name, type, indexed attribute, or parameter order changed
- [ ] No — this is an additive change only
- [ ] Unsure — needs analysis

---

## Log Processing Logic

<!-- Describe the log processing behavior that should be implemented or reviewed. -->

**On `TokenStaked` event:**
<!-- Describe what the indexer should do when it receives this event. Example: -->
<!-- - Record that tokenId is staked by staker as of stakedAt block timestamp -->
<!-- - Overwrite any previous unstaked record for the same tokenId -->
<!-- - Associate staker wallet with the active stake -->

**On `TokenUnstaked` event:**
<!-- Describe what the indexer should do when it receives this event. Example: -->
<!-- - Mark tokenId as no longer staked -->
<!-- - Record unstakedAt timestamp for historical audit trail -->
<!-- - Dissociate staker wallet from the active stake -->

**On unexpected or unknown events:**
<!-- Describe how the indexer should handle events it does not recognise. -->

---

## State Reconstruction Verification

For the indexer to correctly reconstruct state from logs:

- [ ] Every staking state change emits exactly one event (no silent mutations)
- [ ] Replaying all events from block 0 produces the correct current state
- [ ] There are no state transitions visible only through read methods that are not also reflected in events
- [ ] New state fields added to the contract have corresponding events covering their transitions

**State fields and their covering events:**

| State Field | Covering Event | Event Field |
|---|---|---|
| `isStaked[tokenId]` | `TokenStaked` / `TokenUnstaked` | `tokenId` |
| `stakedOwnerOf[tokenId]` | `TokenStaked` / `TokenUnstaked` | `staker` / cleared |

---

## Idempotency and Reorg Handling

<!-- Describe how the indexer should handle replayed or reorganised blocks. -->

The indexer must handle blockchain reorgs by replaying events. Verify the following:

- [ ] Processing the same `TokenStaked` event twice produces the same final state as processing it once
- [ ] Processing a `TokenUnstaked` event for a token that the indexer already has as unstaked does not corrupt state
- [ ] Block numbers and transaction hashes are recorded alongside state changes to enable reorg detection
- [ ] Reorg handling does not require any contract changes (reorg resilience is an indexer concern)

**Describe any edge cases that could cause idempotency issues:**
<!-- e.g., two stake events for the same tokenId without an intervening unstake event -->

---

## Alignment with Contract Read Methods

<!-- Verify that the indexer's reconstructed state would match what the contract's read methods return. -->

| Contract Read Method | Expected Result After `TokenStaked` | Expected Result After `TokenUnstaked` |
|---|---|---|
| `isStaked(tokenId)` | `true` | `false` |
| `stakedOwnerOf(tokenId)` | staker address | zero address or reverts |

- [ ] Indexer-reconstructed state agrees with `isStaked(tokenId)` result
- [ ] Indexer-reconstructed state agrees with `stakedOwnerOf(tokenId)` result
- [ ] Any new read methods added to the contract have corresponding indexer state fields

---

## Breaking Change Impact Assessment

<!-- Complete this section if any event schema change is involved. -->

**What indexer logic would break?**
<!-- Describe which log processors, state models, or queries would fail with the new event schema. -->

**Migration plan:**
<!-- Describe how the indexer will handle the transition. Options include: -->
<!-- - Deploy new contract at new address and re-index from genesis on the new address -->
<!-- - Add a schema version flag and handle both old and new schemas during a transition window -->
<!-- - Treat old contract as read-only historical and new contract as the live source -->

**Coordination required before deployment:**
- [ ] Indexer team has reviewed and acknowledged the breaking change
- [ ] Nethereum DTOs have been updated in the same PR as the contract change
- [ ] A deployment plan exists that prevents an indexing gap during migration

---

## Additional Notes

<!-- Any other context, constraints, or tradeoffs the AI should be aware of. -->
