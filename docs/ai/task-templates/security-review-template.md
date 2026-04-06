# Security Review Template

Use this template when requesting a security review of Solidity contract changes in the Tricksfor SmartContract repository. Fill in the bracketed sections before submitting. Work through every checklist item before considering the review complete.

---

## Review Scope

**Contract(s) under review:**
<!-- e.g., TricksforBoosterNFT, TricksforBoosterStaking, or both -->

**PR or commit under review:**
<!-- Link to the GitHub PR or commit -->

**Brief description of the change:**
<!-- 1–3 sentences summarising what changed -->

---

## 1. Access Control

- [ ] All admin functions are protected by `onlyOwner` or an appropriate role check
- [ ] No function that modifies sensitive state is callable by an arbitrary address without authorisation
- [ ] The set of admin functions is fully enumerable — there are no hidden admin capabilities
- [ ] Emergency paths (e.g., `emergencyWithdraw`) are:
  - [ ] Explicitly named with a descriptive function name
  - [ ] Protected by an access control modifier
  - [ ] Emitting a dedicated event (not reusing a standard event)
  - [ ] Documented in the contract or supporting documentation
- [ ] Role assignments (if using `AccessControl`) cannot be self-escalated without owner consent
- [ ] Ownership transfer (if using `Ownable`) follows a safe two-step pattern or is otherwise safe

**Findings:**
<!-- Describe any access control issues found, or write "None." -->

---

## 2. External Calls and Reentrancy

- [ ] Every function that calls an external contract (`transferFrom`, `safeTransferFrom`, etc.) is protected by `ReentrancyGuard` or strictly follows checks-effects-interactions
- [ ] State changes (storage writes, event emissions) occur **before** external calls where possible
- [ ] No external call result is silently ignored — return values and reverts are handled
- [ ] The staking and unstaking functions, which transfer NFT custody, have been specifically reviewed for reentrancy
- [ ] No callback or receive function introduces an unexpected reentrancy vector

**Findings:**
<!-- Describe any reentrancy or external call issues found, or write "None." -->

---

## 3. Asset Seizure and Admin Power Review

- [ ] No mechanism exists for the contract owner or any admin to transfer a user's staked NFT to an arbitrary address without the user's consent, **except** through a documented, named, event-emitting emergency path
- [ ] No mechanism exists for the contract owner to burn a user's staked NFT without the user's consent
- [ ] The `pause` function (if present) does not prevent users from unstaking their assets
- [ ] If `pause` blocks unstaking, a clearly documented emergency withdrawal path exists and is reviewed here
- [ ] Admin capabilities are consistent with Tricksfor's transparency promise: all capabilities are visible and auditable

**Findings:**
<!-- Describe any asset seizure or admin power concerns found, or write "None." -->

---

## 4. Integer Arithmetic

- [ ] Solidity version is 0.8.x (built-in overflow/underflow protection) or OpenZeppelin `SafeMath` is used for older versions
- [ ] All `unchecked` blocks are explicitly justified with a comment
- [ ] No cast between integer types without explicit bounds validation
- [ ] Percentage-based values use basis points (10 000 = 100%) — no floating point, no raw percentages
- [ ] Arithmetic operations that could approach `type(uint256).max` have been considered

**Findings:**
<!-- Describe any integer arithmetic issues found, or write "None." -->

---

## 5. Event Completeness

- [ ] Every function that modifies contract state emits at least one event fully describing the change
- [ ] No silent state mutations exist (state changes without events)
- [ ] New events follow the naming convention: past-tense verb phrases (`Staked`, not `Stake`)
- [ ] All events that are part of the indexer integration contract (`TokenStaked`, `TokenUnstaked`) remain unchanged, or this change has been flagged as a breaking change
- [ ] New integration-critical events include `indexed` attributes on owner address and tokenId fields
- [ ] Timestamps are included in events that record time-sensitive state changes

**Findings:**
<!-- Describe any event completeness issues found, or write "None." -->

---

## 6. Pause Behaviour

- [ ] If `Pausable` is used, the scope of the pause is documented: what is gated and what is not
- [ ] Users can always recover their assets (unstake) even when the contract is paused, or a documented emergency path exists
- [ ] The `pause` and `unpause` functions are access-controlled
- [ ] Pause state does not cause unexpected lockout of non-admin users for an indefinite period

**Findings:**
<!-- Describe any pause behaviour issues found, or write "None." -->

---

## 7. Failure Modes

- [ ] The contract behaves correctly when called with boundary inputs (zero tokenId, zero address, max uint256)
- [ ] Re-staking an already-staked token is handled gracefully (reverts with a clear error)
- [ ] Unstaking a token by a non-owner reverts with a clear error
- [ ] Calling functions on a paused contract reverts with a clear error
- [ ] Custom errors are used in preference to long `require` strings in hot paths
- [ ] The contract does not become permanently locked in an unexpected state due to any single transaction failure

**Findings:**
<!-- Describe any failure mode issues found, or write "None." -->

---

## 8. Test Adequacy

- [ ] Tests cover all happy-path state transitions
- [ ] Tests verify event emission: event name, indexed field values, and non-indexed field values
- [ ] Tests verify access control rejections for every restricted function
- [ ] Tests cover edge cases: re-staking, unstaking by non-owner, zero address inputs, boundary tokenIds
- [ ] No existing tests have been removed or weakened to make new code pass
- [ ] Integration tests (if applicable) verify both on-chain state and emitted log content against real ABI artifacts

**Findings:**
<!-- Describe any test adequacy issues found, or write "None." -->

---

## 9. Integration Impact

- [ ] No event parameter name, type, indexed attribute, or order has changed (or this change is explicitly flagged as a breaking change)
- [ ] If this is a breaking change, Nethereum DTOs have been updated in the same PR
- [ ] If this is a breaking change, the backend indexer team has been notified
- [ ] ABI/BIN artifacts have been regenerated and committed if the contract interface changed
- [ ] `tokenURI`, `contractURI`, and `royaltyInfo` on the NFT contract remain intact (or changes are explicitly justified)
- [ ] The staking contract remains the sole source of truth for active staking state

**Findings:**
<!-- Describe any integration impact issues found, or write "None." -->

---

## 10. Out-of-Scope Checks

The following must **not** be present. Flag immediately if found:

- [ ] Reward calculation, accumulation, or distribution logic in any contract
- [ ] Token payouts or ERC-20 transfers initiated by the staking contract
- [ ] Any fictional "standard ERC-721 staking interface" claim
- [ ] Hidden admin functions not visible in the public ABI
- [ ] Floating-point arithmetic or percentage values expressed as raw fractions

**Findings:**
<!-- Describe any out-of-scope logic found, or write "None." -->

---

## Summary

**Overall assessment:**
- [ ] ✅ No issues found — ready to merge
- [ ] ⚠️ Minor issues found — address before merging (list below)
- [ ] 🚫 Blocking issues found — must be resolved before merging (list below)

**Issues to resolve:**
<!-- List all issues requiring action, referencing the section numbers above. -->

**Approved by:**
<!-- Reviewer name/handle and date -->
