# Backend Integration Contract — Tricksfor Booster NFT Staking

This document defines the integration contract between the Tricksfor smart contracts and backend systems that consume Booster NFT staking state. It specifies the business-facing interface and behavioral contract expected by backend services — including how to interpret stake/unstake logs, query current on-chain state, handle consistency windows, and resolve booster classification and multiplier logic.

This document is complementary to the indexing specification. Where the indexing specification focuses on log reconstruction mechanics, this document focuses on how backend services translate reconstructed and live state into business decisions.

---

## Smart Contract Responsibilities

The smart contracts are the authoritative source of truth for the following:

| Responsibility | Contract |
|---|---|
| Booster NFT ownership (who holds which token) | `TricksforBoosterNFT` (ERC-721) |
| Stake / unstake state transitions | `TricksforBoosterStaking` |
| Event emission on every state change | `TricksforBoosterStaking` |
| Current-state read methods (`isStaked`, `stakedOwnerOf`) | `TricksforBoosterStaking` |
| Active wallet / token relationship (who staked what, and when) | `TricksforBoosterStaking` (via events and read methods) |

The contracts do **not** calculate rewards, apply multipliers, classify booster types, or make game settlement decisions. These responsibilities belong entirely to the backend.

### Events emitted by the staking contract

```solidity
event TokenStaked(address indexed staker, uint256 indexed tokenId, uint256 stakedAt);
event TokenUnstaked(address indexed staker, uint256 indexed tokenId, uint256 unstakedAt);
```

Both events are emitted exactly once per state transition. There are no silent state mutations. Every staking state change is traceable to a log entry.

### Current-state read methods on the staking contract

| Method | Return type | Description |
|---|---|---|
| `isStaked(uint256 tokenId)` | `bool` | `true` if the token is currently held by the staking contract |
| `stakedOwnerOf(uint256 tokenId)` | `address` | Original owner (staker) of a currently staked token; reverts or returns zero address if not staked |

These read methods always reflect on-chain truth at the queried block. They are guaranteed to be consistent with the event log: if a `TokenStaked` event exists for a token with no subsequent `TokenUnstaked` event, `isStaked(tokenId)` will return `true`.

---

## Backend Responsibilities

The backend is responsible for all business logic that the contracts deliberately exclude. This is by design: keeping business logic off-chain preserves flexibility, reduces gas cost, and reduces the attack surface of the contracts.

| Responsibility | Notes |
|---|---|
| **Game settlement** | Determining game outcomes and applying any booster effects |
| **Reward calculation** | Computing reward amounts based on staking state and booster multipliers |
| **Winner calculation** | Identifying eligible wallets and resolving game outcomes |
| **Booster classification** | Mapping token IDs to booster types (e.g., tier, category, rarity) — not stored on-chain |
| **Reward multiplier calculation** | Applying the correct multiplier for a given booster type — not computed on-chain |
| **Database persistence** | Storing indexed staking state, wallet state snapshots, and historical analytics |
| **Historical analytics** | Reconstructing and querying the full history of staking activity per wallet or token |
| **Reconciliation scheduling** | Periodically cross-checking indexed state against live on-chain reads |
| **Confirmation window management** | Deciding when a recently observed event is sufficiently confirmed to act on |

---

## Verification Rules

### Is a token currently staked?

**Primary method:** Check the indexed state reconstructed from event logs.

**Cross-check (reconciliation):** Call `isStaked(tokenId)` on the staking contract at the current (or a specific) block height.

The token is considered actively staked if and only if the most recent event for that token in the log is a `TokenStaked` event (i.e., a `TokenStaked` event exists with no subsequent `TokenUnstaked` event for the same `tokenId`).

### Who staked a token?

The `staker` field in the `TokenStaked` event is the authoritative record of who initiated the stake. This is the wallet address that called `stake(tokenId)` and that holds the NFT at the time of staking.

For on-chain cross-checking, use `stakedOwnerOf(tokenId)`. This returns the same address that was emitted as `staker` in the corresponding `TokenStaked` event.

### What tokens does a wallet currently have staked?

Reconstruct from the event log: collect all `TokenStaked` events where `staker == walletAddress`, then subtract all token IDs for which a subsequent `TokenUnstaked` event exists (with the same `staker`).

The result is the set of token IDs that the wallet currently has staked.

For fresh-block accuracy (see below), cross-check individual tokens using `isStaked(tokenId)` or by requesting a live read from the staking contract.

### Can indexed state be trusted for freshly confirmed blocks?

Indexed state should be treated as **eventually consistent** relative to the chain tip. Events observed in very recent blocks (within the confirmation window chosen by the backend — typically 1–12 blocks depending on risk tolerance) should be treated as **provisional** until the confirmation threshold is reached.

For time-sensitive business decisions (e.g., determining staking eligibility immediately before game settlement), the backend **must** cross-check against live on-chain reads rather than relying solely on the indexed state.

### When to cross-check against live read methods

Cross-check against `isStaked` and `stakedOwnerOf` in the following circumstances:

- During game settlement, to confirm that each participating wallet's staked tokens are still active at settlement time
- When the indexed state for a token was last updated within the confirmation window
- When a discrepancy is suspected between indexed state and live state (e.g., during a reconciliation run)
- After any detected chain reorganization affecting blocks that contained staking events

---

## Consistency Rules

### Event logs are authoritative for historical event history

The event log is the canonical source for the **sequence** of staking state changes. If the backend needs to reconstruct what happened (when a token was staked, when it was unstaked, by whom), the event log is the definitive record. On-chain read methods do not provide history — they provide only current state.

### Current-state reads are authoritative for current on-chain truth

For the **current** staking state of any token, the on-chain read methods (`isStaked`, `stakedOwnerOf`) are the definitive source. When indexed state and live read methods disagree for a block that is outside the confirmation window, the live read method takes precedence and the indexed state should be updated accordingly.

### Confirmation windows before finalising state

The backend may apply a confirmation window before treating an observed event as final. During this window, state derived from those events is provisional. The confirmation window is a backend policy decision, not a contract constraint. Typical values are 1–12 blocks. Events from blocks older than the confirmation window may be treated as confirmed.

### Logs and reads must be interpreted consistently

The backend must not use event logs to answer historical questions and live reads to answer current-state questions in a way that produces contradictory results. If a `TokenStaked` event exists for token A at block N and `isStaked(A)` returns `false` at a block greater than N, that is a signal of either an intervening `TokenUnstaked` event (consistent) or an indexing/query error (inconsistent — investigate).

### Booster type and multiplier are resolved outside the smart contracts

The smart contracts have no knowledge of booster tiers, categories, or multipliers. The backend is responsible for:

1. Maintaining a mapping from token ID to booster classification (e.g., loaded from a configuration store or a separate service)
2. Applying the appropriate multiplier for each booster type when calculating rewards
3. Ensuring this classification is consistent across all backend services that consume staking state

Booster classification must be treated as backend-managed configuration. Changes to classification or multiplier values do not require contract changes and do not emit on-chain events.

---

## Wallet Status Model

The following is the expected backend-facing model for a wallet's staking status.

```
WalletStakingStatus {
  walletAddress:    address                  // The wallet being queried
  stakedTokenIds:   uint256[]               // IDs of all tokens currently staked by this wallet
  hasActiveStake:   bool                    // true if stakedTokenIds is non-empty
  asOf:             block number or timestamp  // The point in time this status reflects
}
```

### Deriving wallet status

1. Query the indexed event log for all `TokenStaked` events where `staker == walletAddress`.
2. For each token ID found, check whether a subsequent `TokenUnstaked` event exists for that token ID and the same staker.
3. Tokens with a `TokenStaked` event and no subsequent `TokenUnstaked` event are in the `stakedTokenIds` set.
4. `hasActiveStake` is `true` if the set is non-empty.

For settlement-time accuracy, validate each token in `stakedTokenIds` using `isStaked(tokenId)` on the staking contract.

---

## Token Status Model

The following is the expected backend-facing model for a token's staking status.

```
TokenStakingStatus {
  tokenId:          uint256      // The token being queried
  isStaked:         bool         // Whether the token is currently staked
  stakedBy:         address      // Wallet that staked the token; zero address if not staked
  stakedAt:         uint256      // Block timestamp from TokenStaked event; 0 if not staked
  lastUnstakedAt:   uint256      // Block timestamp from most recent TokenUnstaked event; 0 if never unstaked
}
```

### Deriving token status

1. Query the indexed event log for all `TokenStaked` and `TokenUnstaked` events filtered by `tokenId`.
2. Sort events by block number and log index (ascending).
3. Walk the sorted events:
   - On `TokenStaked`: set `isStaked = true`, record `stakedBy` and `stakedAt`.
   - On `TokenUnstaked`: set `isStaked = false`, clear `stakedBy`, record `lastUnstakedAt`.
4. The result of walking all events is the current `TokenStakingStatus`.

For live cross-checking:
- `isStaked(tokenId)` on the staking contract confirms the current staking flag.
- `stakedOwnerOf(tokenId)` on the staking contract confirms the current staker address.

---

## Integration Examples

### Example 1: Wallet stakes token A, then token B — both remain staked

**Event sequence:**
1. `TokenStaked(staker=0xABC, tokenId=1, stakedAt=T1)`
2. `TokenStaked(staker=0xABC, tokenId=2, stakedAt=T2)`

**Resulting wallet status for 0xABC:**
```
WalletStakingStatus {
  walletAddress:  0xABC
  stakedTokenIds: [1, 2]
  hasActiveStake: true
}
```

**Resulting token statuses:**
```
TokenStakingStatus { tokenId: 1, isStaked: true, stakedBy: 0xABC, stakedAt: T1, lastUnstakedAt: 0 }
TokenStakingStatus { tokenId: 2, isStaked: true, stakedBy: 0xABC, stakedAt: T2, lastUnstakedAt: 0 }
```

---

### Example 2: Wallet stakes token A and token B; token A is later unstaked

**Event sequence:**
1. `TokenStaked(staker=0xABC, tokenId=1, stakedAt=T1)`
2. `TokenStaked(staker=0xABC, tokenId=2, stakedAt=T2)`
3. `TokenUnstaked(staker=0xABC, tokenId=1, unstakedAt=T3)`

**Resulting wallet status for 0xABC:**
```
WalletStakingStatus {
  walletAddress:  0xABC
  stakedTokenIds: [2]
  hasActiveStake: true
}
```

**Resulting token statuses:**
```
TokenStakingStatus { tokenId: 1, isStaked: false, stakedBy: 0x0000000000000000000000000000000000000000, stakedAt: T1, lastUnstakedAt: T3 }
TokenStakingStatus { tokenId: 2, isStaked: true,  stakedBy: 0xABC, stakedAt: T2, lastUnstakedAt: 0 }
```

---

### Example 3: Indexed state temporarily differs from live state during fresh block window

**Scenario:** Token 3 is unstaked in block N. The backend indexer has not yet processed block N. Block N is within the confirmation window.

**Indexed state (stale):**
```
TokenStakingStatus { tokenId: 3, isStaked: true, stakedBy: 0xDEF, stakedAt: T_prev, lastUnstakedAt: 0 }
```

**Live on-chain read at block N:**
```
isStaked(3)        → false
stakedOwnerOf(3)   → 0x0000000000000000000000000000000000000000
```

**Backend behaviour:**

- The backend must not finalize game settlement decisions based on indexed state for blocks within the confirmation window.
- Before settlement, the backend queries `isStaked(3)` on-chain and finds `false`.
- The backend treats token 3 as not staked for this settlement, regardless of the stale indexed state.
- The indexer will process block N and update indexed state to reflect the unstake event; after that, indexed state and live reads will agree.

---

## Event Usage Guidance

### Primary events for staking state

Backend services should primarily subscribe to and process:

| Event | Purpose |
|---|---|
| `TokenStaked(address indexed staker, uint256 indexed tokenId, uint256 stakedAt)` | Record that a token has entered staking state under a specific wallet |
| `TokenUnstaked(address indexed staker, uint256 indexed tokenId, uint256 unstakedAt)` | Record that a token has exited staking state |

These two events are sufficient to reconstruct the complete staking history and current staking state for every wallet and token. They are the primary integration surface between the staking contract and backend systems.

### Optional: ERC-721 Transfer events

Backend services **may** optionally inspect ERC-721 `Transfer` events emitted by the `TricksforBoosterNFT` contract:

| Use case | Notes |
|---|---|
| **Reconciliation** | Cross-check that a `TokenStaked` event corresponds to an actual transfer of the NFT to the staking contract |
| **Debugging** | Trace ownership changes to understand why a wallet holds or does not hold a given token |
| **Audit** | Verify the full ownership history of a token independent of staking state |

`Transfer` events are **not required** for reconstructing staking state. The `TokenStaked` and `TokenUnstaked` events on the staking contract are the complete and authoritative record of staking state transitions. `Transfer` events are supplementary and most useful for validation and debugging workflows.

### Events that must not be used as a substitute for on-chain reads at settlement time

Event logs provide an eventually-consistent view of staking state. For business decisions that require current, authoritative staking state (e.g., game settlement, reward eligibility determination), the backend must validate staking state using the on-chain read methods (`isStaked`, `stakedOwnerOf`) rather than relying solely on indexed event data, unless the relevant blocks are outside the confirmation window and reconciliation has confirmed consistency.
