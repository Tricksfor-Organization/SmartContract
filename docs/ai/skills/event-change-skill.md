# Event Change Skill — Tricksfor SmartContract

Use this checklist whenever a Solidity event in this repository is being added, modified, or removed. Work through every item before opening a PR and before approving one.

---

## When to Use This Skill

- Adding a new event to either contract
- Modifying an existing event's name, parameters, types, or indexed attributes
- Removing an existing event

> **Modifying or removing an existing event is a breaking change.**
> It requires an explicit breaking-change notice in the PR, an atomic Nethereum DTO update in the same PR, and coordination with the backend indexer team before deployment.

---

## Integration-Critical Events

The following events are the public integration contract with the Tricksfor backend indexer. Extra care is required for any change to these:

```solidity
event TokenStaked(address indexed staker, uint256 indexed tokenId, uint256 stakedAt);
event TokenUnstaked(address indexed staker, uint256 indexed tokenId, uint256 unstakedAt);
```

---

## Event Change Checklist

### Event Signature
- [ ] The event name follows the past-tense verb convention used in this repository (e.g., `TokenStaked`, not `StakeToken` or `StakeEvent`)
- [ ] If the event name changed, this is flagged as a breaking change in the PR description
- [ ] If the event was removed, this is flagged as a breaking change in the PR description and removal is explicitly justified

### Indexed Fields
- [ ] All fields that downstream consumers filter by (wallet address, token ID) are marked `indexed`
- [ ] No field was moved from `indexed` to non-indexed, or vice versa, without explicit breaking-change notice
- [ ] The number and order of indexed fields has not changed without a breaking-change notice
- [ ] `staker` (address) and `tokenId` (uint256) remain indexed on `TokenStaked` and `TokenUnstaked` if those events are present

### Non-Indexed Fields
- [ ] All non-indexed fields (e.g., timestamps) are still present with the same names and types
- [ ] Parameter names have not been renamed without a breaking-change notice (Nethereum `ParameterAttribute` bindings depend on exact Solidity parameter names)
- [ ] Parameter order has not changed without a breaking-change notice (ABI encoding depends on parameter order)

### Nethereum DTO Impact
- [ ] The corresponding Nethereum event DTO class has been updated to match the new event signature exactly
- [ ] `ParameterAttribute` names in the C# DTO exactly match the Solidity parameter names (not the C# property names)
- [ ] The DTO `indexed` flags match the Solidity `indexed` attributes
- [ ] `nethereum-integration-skill.md` was applied
- [ ] ABI/BIN artifacts were regenerated and committed

### Log Processor Impact
- [ ] The Nethereum log processor or event handler that processes this event has been reviewed and updated if needed
- [ ] Receipt decoding logic still works correctly with the new event shape
- [ ] Block-range log querying still works correctly with the new event shape

### Database Schema Impact
- [ ] If the backend indexer persists event data to a database, the schema impact of this change has been assessed
- [ ] A migration plan exists if the schema needs to change
- [ ] The indexer team has been notified if this is a breaking change

### Replay and Migration
- [ ] The need for a historical log replay or re-indexing migration has been assessed
- [ ] If a replay is needed, the plan is documented in the PR description
- [ ] If both old and new event schemas will coexist during a migration window, the indexer's handling of both versions has been confirmed

### Downstream System Impact
- [ ] The Tricksfor backend indexer team has been informed if this is a breaking change
- [ ] Any other downstream systems consuming this event (analytics, monitoring, dashboards) have been identified and notified
- [ ] The change does not silently drop events that downstream consumers rely on to reconstruct state

### Current-State Read Method Alignment
- [ ] `isStaked(uint256 tokenId)` still returns the correct value given the new event semantics
- [ ] `stakedOwnerOf(uint256 tokenId)` still returns the correct value given the new event semantics
- [ ] If new events were added, corresponding read methods have been added or updated to remain in sync
- [ ] State and events do not diverge — if an event says a token is staked, the read method must agree

---

## Breaking Change Notice Template

If this change modifies or removes an existing event, include the following block in the PR description:

```
## ⚠️ Breaking Event Schema Change

**Event affected:** `<EventName>`
**Change type:** Modified / Removed

**What changed:**
- <describe the specific change — renamed field, reordered parameter, removed event, etc.>

**Downstream impact:**
- Backend indexer: <describe impact>
- Nethereum DTOs: <describe what was updated>
- Historical log replay needed: Yes / No

**Coordination:**
- [ ] Backend indexer team notified
- [ ] Nethereum DTO updated in this PR
- [ ] ABI/BIN artifacts regenerated in this PR
```

---

## Related Skills

- [`contract-change-skill.md`](./contract-change-skill.md) — apply for all contract changes
- [`nethereum-integration-skill.md`](./nethereum-integration-skill.md) — apply when any event or function signature changes
- [`indexing-compatibility-skill.md`](./indexing-compatibility-skill.md) — apply when events or state transitions change
