# Indexing Compatibility Skill — Tricksfor SmartContract

Use this checklist whenever a Solidity contract change might affect the Tricksfor backend indexer's ability to reconstruct staking state from on-chain event logs. Work through every item before opening a PR and before approving one.

---

## When to Use This Skill

- Any event was added, modified, or removed
- Any state transition logic was changed (stake, unstake, emergency withdraw, etc.)
- A new admin path was added that can change staking state
- Any change that might affect the sequence, completeness, or deduplication of events

---

## Indexing Model Summary

The Tricksfor backend indexer reconstructs the current staking state entirely from on-chain event logs. Its correctness depends on the following invariants being preserved by the contracts:

1. **Event completeness** — Every staking state change produces exactly one `TokenStaked` or `TokenUnstaked` event.
2. **No silent mutations** — There are no state changes that do not emit an event.
3. **Reconstructability** — Replaying all `TokenStaked` and `TokenUnstaked` events from block 0 produces the correct current staking state for every wallet and token.
4. **Indexed fields for efficient filtering** — `staker` and `tokenId` are indexed, enabling efficient log queries by wallet or token.
5. **Stable event schema** — The indexer is not designed to handle multiple event schema versions simultaneously.
6. **Idempotency awareness** — The indexer handles blockchain reorgs by replaying events. The contract must not emit duplicate events for the same logical state transition.

---

## Indexing Compatibility Checklist

### Event Ordering Assumptions
- [ ] The relative ordering of `TokenStaked` and `TokenUnstaked` events for the same token is still meaningful and deterministic
- [ ] The change does not introduce a scenario where a `TokenUnstaked` event could appear before the corresponding `TokenStaked` event in the log
- [ ] If multiple events are emitted in a single transaction, their relative order is predictable and documented

### Idempotency
- [ ] The contract still prevents duplicate events for the same logical state transition (e.g., staking an already-staked token is rejected, not silently ignored with a duplicate event)
- [ ] The change does not introduce any path that could emit a `TokenStaked` event for a token that is already indexed as staked
- [ ] The change does not introduce any path that could emit a `TokenUnstaked` event for a token that is already indexed as unstaked
- [ ] Reorg-safety is preserved — if the indexer replays events after a chain reorganization, the final reconstructed state is still correct

### Current Token-State Rebuild
- [ ] After replaying all events, `isStaked(tokenId)` returns `true` for every token currently indexed as staked
- [ ] After replaying all events, `isStaked(tokenId)` returns `false` for every token currently indexed as not staked
- [ ] No new state transition exists that would put a token into a staking state not reflected by any event
- [ ] No new state transition exists that would take a token out of staking state without emitting a `TokenUnstaked` (or equivalent) event

### Current Wallet-State Rebuild
- [ ] After replaying all events, the set of tokens staked by a given wallet address can be correctly reconstructed
- [ ] If a token changes hands during staking (not currently possible, but verify it remains impossible), the indexer's wallet attribution would still be correct
- [ ] The `staker` field in events correctly identifies the wallet that initiated the stake (not the contract, not a relayer)

### Reorg Handling Assumptions
- [ ] The indexer's reorg handling (event replay) still produces correct state after this change
- [ ] The contract does not emit events that are not idempotent under replay (i.e., replaying the same event twice should not corrupt the reconstructed state)
- [ ] No state transition depends on the absolute block number in a way that would produce different results when replayed after a reorg

### Reconciliation Rules
- [ ] The reconciliation rule "a token is staked if and only if a `TokenStaked` event exists for it with no subsequent `TokenUnstaked` event" still holds after this change
- [ ] No new event type or admin path violates this reconciliation rule without a documented and communicated update to the indexer
- [ ] If a new event type is introduced (e.g., `EmergencyWithdrawExecuted`), the reconciliation rule has been extended to account for it, and the indexer team has been notified

### Logs-Only Reconstruction
- [ ] The current staking state for every wallet and token can still be reconstructed using only event logs, without any additional off-chain data or read-method calls
- [ ] The change does not introduce any "hidden" state mutation that would require read-method polling to keep the index accurate
- [ ] If the contracts are ever redeployed, historical events from the old deployment can still be used to seed the initial state of the index (or the migration plan is documented)

---

## Indexer Impact Notice Template

If this change affects any indexer assumption, include the following block in the PR description:

```
## ⚠️ Indexer Compatibility Impact

**Change type:** Event added / Event modified / Event removed / New state transition / New admin path

**Affected indexer assumptions:**
- <list the specific assumptions from the indexer model above that are affected>

**Reconciliation rule update needed:** Yes / No
If yes: <describe the updated rule>

**Replay / re-indexing needed:** Yes / No
If yes: <describe the migration plan>

**Coordination:**
- [ ] Backend indexer team notified
- [ ] Reconciliation rule updated in indexer codebase
- [ ] Historical replay plan confirmed
```

---

## Related Skills

- [`contract-change-skill.md`](./contract-change-skill.md) — apply for all contract changes
- [`event-change-skill.md`](./event-change-skill.md) — apply when events change
- [`nethereum-integration-skill.md`](./nethereum-integration-skill.md) — apply when any integration layer changes
