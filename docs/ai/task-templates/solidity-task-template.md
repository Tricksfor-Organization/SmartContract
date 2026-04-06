# Solidity Task Template

Use this template when requesting AI-assisted Solidity contract work in the Tricksfor SmartContract repository. Fill in the bracketed sections before submitting. Remove sections that do not apply.

---

## Task Type

<!-- Select one or more: -->
- [ ] Implement new contract feature
- [ ] Modify existing contract logic
- [ ] Add or modify an event
- [ ] Update access control
- [ ] Add or update tests
- [ ] Refactor for gas optimization
- [ ] Bug fix

---

## Context

**Contract(s) affected:**
<!-- e.g., TricksforBoosterNFT, TricksforBoosterStaking, or both -->

**Related issue or PR:**
<!-- Link to the GitHub issue or PR, if applicable -->

**Brief description of the change:**
<!-- 1–3 sentences describing what needs to change and why -->

---

## Requirement

<!-- Describe the change in detail. Be specific about inputs, outputs, state changes, and expected behavior. -->

---

## Event Changes

<!-- Complete this section if any events are being added, modified, or removed. -->

**Is this change adding, modifying, or removing an event?**
- [ ] Adding a new event
- [ ] Modifying an existing event ← **this is a breaking change**
- [ ] Removing an event ← **this is a breaking change**
- [ ] No event changes

**If modifying or removing:** Describe the breaking change and its downstream impact on the backend indexer and Nethereum DTOs.

**New or changed event signature:**
```solidity
// e.g., event TokenStaked(address indexed staker, uint256 indexed tokenId, uint256 stakedAt);
```

---

## Access Control

<!-- Describe who should be allowed to call the new or modified function(s). -->

**Caller restrictions:**
- [ ] Any address (public)
- [ ] Token owner only
- [ ] Contract owner (`onlyOwner`)
- [ ] Specific role (describe: ____________)

---

## State Changes

<!-- List all storage variables that will be read or written by this change. -->

| Variable | Type | Read/Write | Description |
|---|---|---|---|
| | | | |

---

## Tests Required

List the test cases that must be written or updated for this change:

- [ ] Happy path: [describe expected flow]
- [ ] Event emission: verify event name, indexed fields, and non-indexed values
- [ ] Access control rejection: unauthorized caller receives correct error
- [ ] Edge case: [describe edge case, e.g., token already staked, zero address input]
- [ ] Edge case: [describe another edge case]

---

## Downstream Impact Checklist

Before implementing, confirm the following:

- [ ] **Indexer impact**: Will the backend indexer still reconstruct staking state correctly after this change?
- [ ] **Nethereum DTO impact**: Does this change require updating typed event DTOs or function message classes?
- [ ] **OpenSea impact**: Does this change affect `tokenURI`, `contractURI`, or ERC-2981 royalty support?
- [ ] **ABI/BIN artifact**: Does this change require regenerating and committing updated ABI/BIN artifacts?
- [ ] **Read method alignment**: Are all `isStaked` / `stakedOwnerOf` / other read methods still consistent with the new event semantics?

---

## Security Checklist

Before finalizing the implementation, verify:

- [ ] Functions calling external contracts (`transferFrom`, etc.) use `ReentrancyGuard` or checks-effects-interactions
- [ ] All admin functions are protected by `onlyOwner` or an appropriate role check
- [ ] No hidden mechanism exists for the owner to seize user assets without consent
- [ ] Integer arithmetic uses `uint256` with Solidity 0.8.x overflow protection; no unchecked blocks without explicit justification
- [ ] No reward logic, token payouts, or point accumulation has been added

---

## Additional Notes

<!-- Any other context, constraints, or tradeoffs the AI should be aware of when implementing this task. -->
