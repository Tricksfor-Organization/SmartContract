# Indexing Specification — Tricksfor Booster NFT Staking

This document defines the event-processing contract between the Tricksfor smart contracts and the backend indexer that reconstructs Booster NFT staking state from on-chain logs using Nethereum Log Processor.

It is the authoritative reference for:

- how blockchain events are ingested and persisted
- how current token and wallet staking state is reconstructed from raw logs
- how idempotency is ensured
- how blockchain reorganisations are handled
- how indexed state is reconciled against live on-chain reads

This document is complementary to the [Backend Integration Contract](backend-integration-contract.md). Where the integration contract describes how backend services consume and act on staking state, this document describes how the indexer produces that state from raw event logs.

---

## Events Consumed

The indexer processes the following events emitted by the `TricksforBoosterStaking` contract.

### Primary staking events

```solidity
event TokenStaked(
    address indexed staker,
    uint256 indexed tokenId,
    uint256 stakedAt
);

event TokenUnstaked(
    address indexed staker,
    uint256 indexed tokenId,
    uint256 unstakedAt
);
```

These two events are sufficient to reconstruct the complete staking history and current staking state for every wallet and token. Every staking state change emits exactly one of these two events. There are no silent state mutations.

### Admin emergency path

```solidity
event EmergencyWithdrawn(
    address indexed originalStaker,
    uint256 indexed tokenId,
    address indexed recipient,
    uint256 withdrawnAt
);
```

This event is emitted when the contract owner performs an emergency withdrawal of a staked token. It clears the staking state for the affected token, just as `TokenUnstaked` does, but without the original staker's direct action. The indexer must treat this event as a token leaving staking state, analogous to `TokenUnstaked`.

### Optional: ERC-721 Transfer events

The `TricksforBoosterNFT` contract emits standard ERC-721 `Transfer` events on every ownership change. The indexer does **not** need to process these events to reconstruct staking state. They are available for:

- Cross-checking that a `TokenStaked` event corresponds to an actual transfer of custody to the staking contract
- Tracing the full ownership history of a token
- Audit and debugging purposes

---

## Event Identity

Every persisted event must be uniquely identified. The natural key for any on-chain log entry is the tuple:

| Field | Type | Description |
|---|---|---|
| `chainId` | integer | EVM chain identifier (e.g., `1` for Ethereum mainnet, `137` for Polygon) |
| `contractAddress` | address | Address of the contract that emitted the event (staking contract address) |
| `transactionHash` | bytes32 | Hash of the transaction that produced the log |
| `logIndex` | integer | Position of this log entry within the block's log array |

This four-field tuple is guaranteed to be unique across all log entries on a given network. No two distinct log entries can share all four values.

The `blockNumber` and `blockHash` fields should also be recorded alongside the identity tuple to support reorg detection (see [Reorg Handling](#reorg-handling)).

---

## Persistence Model

The indexer maintains three tables (or equivalent storage entities).

### `booster_nft_stake_events`

Stores every raw staking event log entry, exactly as observed on-chain. This is the append-only audit trail.

| Column | Type | Description |
|---|---|---|
| `id` | serial / UUID | Internal row identifier |
| `chain_id` | integer | EVM chain ID |
| `contract_address` | text | Staking contract address (checksummed) |
| `transaction_hash` | text | Transaction hash |
| `log_index` | integer | Log index within the block |
| `block_number` | bigint | Block number |
| `block_hash` | text | Block hash (used for reorg detection) |
| `block_timestamp` | bigint | Block timestamp in Unix seconds |
| `event_type` | text | `TokenStaked`, `TokenUnstaked`, or `EmergencyWithdrawn` |
| `staker` | text | Wallet address that staked the token (from `staker` / `originalStaker` field) |
| `token_id` | text | NFT token ID (stored as decimal string to avoid integer overflow on large IDs) |
| `recipient` | text | Recipient address — populated only for `EmergencyWithdrawn`; null for other event types |
| `created_at` | timestamp | Wall-clock time at which the indexer persisted this row |

**Unique constraint:** `(chain_id, contract_address, transaction_hash, log_index)`

This unique constraint enforces idempotency at the persistence layer: attempting to insert the same event twice is a no-op (or a constraint error that the indexer treats as "already processed").

---

### `booster_nft_token_status`

Stores the current derived staking state for each token ID. Updated each time a relevant event is processed.

| Column | Type | Description |
|---|---|---|
| `chain_id` | integer | EVM chain ID |
| `contract_address` | text | Staking contract address |
| `token_id` | text | NFT token ID |
| `is_staked` | boolean | `true` if the token is currently staked |
| `staked_by` | text | Wallet address of current staker; null if not staked |
| `staked_at` | bigint | Block timestamp from the most recent `TokenStaked` event; null if never staked |
| `staked_in_tx` | text | Transaction hash of the most recent `TokenStaked` event |
| `staked_in_block` | bigint | Block number of the most recent `TokenStaked` event |
| `last_unstaked_at` | bigint | Block timestamp from the most recent `TokenUnstaked` or `EmergencyWithdrawn` event; null if never unstaked |
| `last_unstake_tx` | text | Transaction hash of the most recent unstake or emergency-withdraw event |
| `last_unstake_block` | bigint | Block number of the most recent unstake or emergency-withdraw event |
| `last_event_block` | bigint | Block number of the most recently processed event for this token |
| `last_event_log_index` | integer | Log index of the most recently processed event for this token |
| `updated_at` | timestamp | Wall-clock time of the most recent update to this row |

**Primary key:** `(chain_id, contract_address, token_id)`

---

### `booster_nft_wallet_status`

Stores the current set of staked token IDs for each wallet. Updated each time a relevant event is processed.

| Column | Type | Description |
|---|---|---|
| `chain_id` | integer | EVM chain ID |
| `contract_address` | text | Staking contract address |
| `wallet_address` | text | Wallet address |
| `staked_token_ids` | text[] / JSON array | Current set of token IDs staked by this wallet |
| `has_active_stake` | boolean | `true` if `staked_token_ids` is non-empty |
| `last_event_block` | bigint | Block number of the most recently processed event for this wallet |
| `last_event_log_index` | integer | Log index of the most recently processed event for this wallet |
| `updated_at` | timestamp | Wall-clock time of the most recent update to this row |

**Primary key:** `(chain_id, contract_address, wallet_address)`

---

## Event Ingestion Pipeline

The indexer processes events in the following sequence.

1. **Subscribe** to logs from the `TricksforBoosterStaking` contract address using Nethereum Log Processor.
2. **For each log entry received:**
   - a. Decode the event type and fields using the appropriate Nethereum event DTO (`TokenStakedEventDTO`, `TokenUnstakedEventDTO`, or `EmergencyWithdrawnEventDTO`).
   - b. Derive the event identity tuple: `(chainId, contractAddress, transactionHash, logIndex)`.
   - c. Begin a database transaction. Attempt to insert a new row into `booster_nft_stake_events`. If the unique constraint fires (event already persisted), roll back and skip to the next event — this is the idempotency guard (see [Idempotency](#idempotency)).
   - d. Update `booster_nft_token_status` according to the [Token State Rules](#token-state-reconstruction-rules).
   - e. Update `booster_nft_wallet_status` according to the [Wallet State Rules](#wallet-state-reconstruction-rules).
   - f. Commit the database transaction.
3. **Advance the indexer's checkpoint** (the highest confirmed block processed) after all events in a block are committed.

Steps c through f must execute atomically within a single database transaction per event. A partial failure must leave neither the event log table nor the derived state tables in an inconsistent state.

---

## Token State Reconstruction Rules

These rules define how `booster_nft_token_status` is updated for each event.

### On `TokenStaked(staker, tokenId, stakedAt)`

Upsert a row for `(chainId, contractAddress, tokenId)`:

| Column | New value |
|---|---|
| `is_staked` | `true` |
| `staked_by` | `staker` |
| `staked_at` | `stakedAt` (block timestamp) |
| `staked_in_tx` | `transactionHash` |
| `staked_in_block` | `blockNumber` |
| `last_event_block` | `blockNumber` |
| `last_event_log_index` | `logIndex` |

### On `TokenUnstaked(staker, tokenId, unstakedAt)`

Upsert a row for `(chainId, contractAddress, tokenId)`:

| Column | New value |
|---|---|
| `is_staked` | `false` |
| `staked_by` | null |
| `last_unstaked_at` | `unstakedAt` (block timestamp) |
| `last_unstake_tx` | `transactionHash` |
| `last_unstake_block` | `blockNumber` |
| `last_event_block` | `blockNumber` |
| `last_event_log_index` | `logIndex` |

The `staked_at`, `staked_in_tx`, and `staked_in_block` columns are **not cleared**; they retain the values from the most recent staking for historical reference.

### On `EmergencyWithdrawn(originalStaker, tokenId, recipient, withdrawnAt)`

Apply the same column updates as `TokenUnstaked`, using `withdrawnAt` as the timestamp and `originalStaker` for audit purposes (the `staker` column in the raw event row is set to `originalStaker`). The token status row is updated identically:

| Column | New value |
|---|---|
| `is_staked` | `false` |
| `staked_by` | null |
| `last_unstaked_at` | `withdrawnAt` |
| `last_unstake_tx` | `transactionHash` |
| `last_unstake_block` | `blockNumber` |
| `last_event_block` | `blockNumber` |
| `last_event_log_index` | `logIndex` |

The reconciliation invariant — **a token is staked if and only if a `TokenStaked` event exists for it with no subsequent `TokenUnstaked` or `EmergencyWithdrawn` event** — holds across all three event types.

---

## Wallet State Reconstruction Rules

These rules define how `booster_nft_wallet_status` is updated for each event.

### On `TokenStaked(staker, tokenId, stakedAt)`

Upsert a row for `(chainId, contractAddress, staker)`:

- Add `tokenId` to `staked_token_ids` (if not already present).
- Set `has_active_stake` to `true`.
- Update `last_event_block` and `last_event_log_index`.

### On `TokenUnstaked(staker, tokenId, unstakedAt)`

Upsert a row for `(chainId, contractAddress, staker)`:

- Remove `tokenId` from `staked_token_ids`.
- Set `has_active_stake` to `true` if `staked_token_ids` is non-empty after removal; otherwise `false`.
- Update `last_event_block` and `last_event_log_index`.

### On `EmergencyWithdrawn(originalStaker, tokenId, recipient, withdrawnAt)`

Upsert a row for `(chainId, contractAddress, originalStaker)`:

- Remove `tokenId` from `staked_token_ids`.
- Set `has_active_stake` to `true` if `staked_token_ids` is non-empty after removal; otherwise `false`.
- Update `last_event_block` and `last_event_log_index`.

### Full replay (state rebuild from scratch)

To rebuild wallet state from zero (e.g., after a reorg or during initial sync):

1. Delete all rows in `booster_nft_wallet_status` for the relevant `(chainId, contractAddress)`.
2. Query `booster_nft_stake_events` ordered by `(block_number ASC, log_index ASC)`.
3. For each event row in order, apply the rules above.

After processing all events, the derived wallet state is equivalent to processing all events in real time from genesis.

---

## Idempotency

The indexer must be safe to run multiple times over the same block range without corrupting state. This is guaranteed by the following mechanisms.

### Raw event deduplication

The unique constraint on `booster_nft_stake_events (chain_id, contract_address, transaction_hash, log_index)` prevents the same raw event from being inserted twice. If the indexer replays a block (e.g., after a restart), the insert for any already-persisted event will fail the constraint. The indexer treats this as "already processed" and skips the derived-state updates for that event.

### Derived state is last-write-wins

The `booster_nft_token_status` and `booster_nft_wallet_status` tables are updated using upserts. If the indexer replays events in strict chronological order (ascending `block_number`, then `log_index`), the final derived state after a replay is identical to the state produced during the original processing run.

The `last_event_block` and `last_event_log_index` columns in both derived-state tables can be used by the indexer to skip updates for events that are older than what is already persisted:

- If the incoming event's `(blockNumber, logIndex)` is less than or equal to the row's `(last_event_block, last_event_log_index)`, the derived-state update may be skipped (the raw event row was already deduplicated by the constraint above).

### Contract-level idempotency guarantees

The staking contract enforces:

- A token cannot be staked if it is already staked (`TokenAlreadyStaked` error).
- A token cannot be unstaked if it is not staked (`TokenNotStaked` error).

Therefore, a valid on-chain event sequence can never contain two consecutive `TokenStaked` events (or two consecutive `TokenUnstaked` events) for the same token without an intervening event of the opposite type. The indexer can rely on this invariant.

---

## Reorg Handling

A blockchain reorganisation (reorg) occurs when the canonical chain switches to a fork that replaces one or more previously observed blocks. Events in replaced blocks are no longer part of the canonical chain and must be removed from the index.

### Reorg detection

The indexer detects reorgs by comparing the `blockHash` it has on record for a given `blockNumber` against the hash reported by the node for that block number in the new canonical chain. If the hashes differ, the block has been reorganised.

### Reorg response

When a reorg affecting block `N` is detected:

1. Identify all rows in `booster_nft_stake_events` with `block_number >= N` (i.e., all events from the reorganised blocks onwards).
2. Delete those rows from `booster_nft_stake_events`.
3. Rebuild `booster_nft_token_status` and `booster_nft_wallet_status` from the events that remain (see [Full replay](#full-replay-state-rebuild-from-scratch) above), or apply the inverse operations for each deleted event in reverse chronological order.
4. Re-process events from block `N` onwards from the new canonical chain.

The full-replay approach (step 3) is simpler to implement correctly and is recommended unless performance requirements make it impractical. The incremental inverse approach requires careful handling of the `staked_at` and related historical columns.

### Confirmation window

The indexer should maintain a configurable confirmation window (number of blocks). Events in blocks within the confirmation window are considered provisional and may be subject to reorg. The backend integration contract requires that business decisions (e.g., game settlement) are not based on provisional indexed state; live on-chain reads must be used instead. See the [Backend Integration Contract](backend-integration-contract.md) for details.

Typical confirmation window values: 1–12 blocks, depending on the target chain's finality characteristics and the risk tolerance of the application.

---

## Reconciliation

Reconciliation is the process of cross-checking indexed state against live on-chain reads to detect and correct any divergence. Reconciliation should be performed periodically and after any detected reorg.

### Available on-chain read methods

| Method | Returns | Use in reconciliation |
|---|---|---|
| `isStaked(uint256 tokenId)` | `bool` | Cross-check `booster_nft_token_status.is_staked` for a specific token |
| `stakedOwnerOf(uint256 tokenId)` | `address` | Cross-check `booster_nft_token_status.staked_by` for a specific token |
| `stakedAtOf(uint256 tokenId)` | `uint256` | Cross-check `booster_nft_token_status.staked_at` for a specific token |
| `getWalletStakedTokens(address wallet)` | `uint256[]` | Cross-check `booster_nft_wallet_status.staked_token_ids` for a specific wallet |

### Token-level reconciliation

For each token of interest:

1. Read `booster_nft_token_status` for the token.
2. Call `isStaked(tokenId)` on the staking contract at the current (or a specific confirmed) block.
3. If `booster_nft_token_status.is_staked != isStaked(tokenId)`, a divergence exists.
4. If divergence is confirmed, call `stakedOwnerOf(tokenId)` and `stakedAtOf(tokenId)` to retrieve authoritative current state.
5. Update `booster_nft_token_status` to reflect the live on-chain state and flag the discrepancy for investigation.

A divergence between indexed and live state outside the confirmation window indicates an indexing gap or reorg that was not handled. The live on-chain state is authoritative.

### Wallet-level reconciliation

For each wallet of interest:

1. Read `booster_nft_wallet_status.staked_token_ids` from the index.
2. Call `getWalletStakedTokens(walletAddress)` on the staking contract at the current confirmed block.
3. Compare the two sets. Any token present in one but not the other is a divergence.
4. For each divergent token, perform a token-level reconciliation (above) to determine the authoritative state and correct the index.

Note: `getWalletStakedTokens` returns the live on-chain set without ordering guarantees (the contract uses swap-and-pop removal). Compare as sets, not ordered lists.

### Reconciliation rule

The invariant that reconciliation verifies:

> A token is staked (i.e., `booster_nft_token_status.is_staked == true`) if and only if a `TokenStaked` event exists for that token with no subsequent `TokenUnstaked` or `EmergencyWithdrawn` event, **and** `isStaked(tokenId)` returns `true` on the staking contract at the queried block.

If the event log satisfies the condition but `isStaked` returns `false`, either:
- The event is in a block within the confirmation window and the indexer has not yet processed the unstake event, or
- There is an indexing error or reorg that has not been handled.

If `isStaked` returns `true` but the event log does not satisfy the condition, the indexer has missed an event — this is a critical error and should trigger an alert and a re-index.

---

## State Rebuild from Scratch

To fully rebuild all derived state tables from the raw event log:

1. Truncate `booster_nft_token_status` and `booster_nft_wallet_status` for the target `(chainId, contractAddress)`.
2. Query all rows from `booster_nft_stake_events` for the target `(chainId, contractAddress)`, ordered by `(block_number ASC, log_index ASC)`.
3. Apply the token state rules and wallet state rules in order for each event row.
4. After all rows are processed, the derived state tables are equivalent to the state produced by real-time ingestion.

This procedure is also used after a full re-index from the chain (e.g., when deploying the indexer against a new contract address or a new chain).

---

## Worked Examples

### Example 1: Wallet stakes two tokens, both remain staked

**Events (in chain order):**

| Block | Log index | Event | staker | tokenId | timestamp |
|---|---|---|---|---|---|
| 100 | 0 | `TokenStaked` | `0xABC` | `1` | `T1` |
| 101 | 0 | `TokenStaked` | `0xABC` | `2` | `T2` |

**`booster_nft_token_status` after processing:**

| token_id | is_staked | staked_by | staked_at | last_unstaked_at |
|---|---|---|---|---|
| `1` | `true` | `0xABC` | `T1` | null |
| `2` | `true` | `0xABC` | `T2` | null |

**`booster_nft_wallet_status` after processing:**

| wallet_address | staked_token_ids | has_active_stake |
|---|---|---|
| `0xABC` | `[1, 2]` | `true` |

---

### Example 2: Wallet stakes two tokens; one is later unstaked

**Events (in chain order):**

| Block | Log index | Event | staker | tokenId | timestamp |
|---|---|---|---|---|---|
| 100 | 0 | `TokenStaked` | `0xABC` | `1` | `T1` |
| 101 | 0 | `TokenStaked` | `0xABC` | `2` | `T2` |
| 105 | 1 | `TokenUnstaked` | `0xABC` | `1` | `T3` |

**`booster_nft_token_status` after processing:**

| token_id | is_staked | staked_by | staked_at | last_unstaked_at |
|---|---|---|---|---|
| `1` | `false` | null | `T1` | `T3` |
| `2` | `true` | `0xABC` | `T2` | null |

**`booster_nft_wallet_status` after processing:**

| wallet_address | staked_token_ids | has_active_stake |
|---|---|---|
| `0xABC` | `[2]` | `true` |

---

### Example 3: Token staked, unstaked, then re-staked

**Events (in chain order):**

| Block | Log index | Event | staker | tokenId | timestamp |
|---|---|---|---|---|---|
| 100 | 0 | `TokenStaked` | `0xABC` | `5` | `T1` |
| 110 | 0 | `TokenUnstaked` | `0xABC` | `5` | `T2` |
| 120 | 0 | `TokenStaked` | `0xABC` | `5` | `T3` |

**`booster_nft_token_status` after processing:**

| token_id | is_staked | staked_by | staked_at | last_unstaked_at |
|---|---|---|---|---|
| `5` | `true` | `0xABC` | `T3` | `T2` |

Note that `staked_at` reflects the **most recent** stake (`T3`), and `last_unstaked_at` retains the timestamp of the previous unstake (`T2`).

**`booster_nft_wallet_status` after processing:**

| wallet_address | staked_token_ids | has_active_stake |
|---|---|---|
| `0xABC` | `[5]` | `true` |

---

### Example 4: Emergency withdrawal clears staking state

**Events (in chain order):**

| Block | Log index | Event | originalStaker | tokenId | recipient | timestamp |
|---|---|---|---|---|---|---|
| 200 | 0 | `TokenStaked` | `0xDEF` | `9` | — | `T1` |
| 250 | 3 | `EmergencyWithdrawn` | `0xDEF` | `9` | `0xOWNER` | `T2` |

**`booster_nft_token_status` after processing:**

| token_id | is_staked | staked_by | staked_at | last_unstaked_at |
|---|---|---|---|---|
| `9` | `false` | null | `T1` | `T2` |

**`booster_nft_wallet_status` after processing:**

| wallet_address | staked_token_ids | has_active_stake |
|---|---|---|
| `0xDEF` | `[]` | `false` |

---

### Example 5: Reorg removes a stake event

**Before reorg (indexed state):**

Block 300 contained `TokenStaked(0xABC, 7, T1)`. Indexed `booster_nft_token_status.is_staked = true` for token `7`.

**Reorg:** Block 300 is replaced by a new block 300 that does not contain this transaction.

**Reorg response:**

1. Delete the `booster_nft_stake_events` row for the replaced event.
2. Rebuild derived state: no `TokenStaked` event exists for token `7`, so `booster_nft_token_status.is_staked = false` (or the row is absent).
3. Re-process the new block 300 — no staking event is present, so no new row is inserted.

**Result:** Token `7` is correctly recorded as not staked.

---

## Nethereum Event DTO Reference

The Nethereum DTOs used to decode the events above must match the Solidity event definitions exactly. The following C# class structure is expected (property names may use PascalCase; the `ParameterAttribute` name must match the Solidity parameter name exactly):

```csharp
[Event("TokenStaked")]
public class TokenStakedEventDTO : IEventDTO
{
    [Parameter("address", "staker", 1, true)]
    public string Staker { get; set; }

    [Parameter("uint256", "tokenId", 2, true)]
    public BigInteger TokenId { get; set; }

    [Parameter("uint256", "stakedAt", 3, false)]
    public BigInteger StakedAt { get; set; }
}

[Event("TokenUnstaked")]
public class TokenUnstakedEventDTO : IEventDTO
{
    [Parameter("address", "staker", 1, true)]
    public string Staker { get; set; }

    [Parameter("uint256", "tokenId", 2, true)]
    public BigInteger TokenId { get; set; }

    [Parameter("uint256", "unstakedAt", 3, false)]
    public BigInteger UnstakedAt { get; set; }
}

[Event("EmergencyWithdrawn")]
public class EmergencyWithdrawnEventDTO : IEventDTO
{
    [Parameter("address", "originalStaker", 1, true)]
    public string OriginalStaker { get; set; }

    [Parameter("uint256", "tokenId", 2, true)]
    public BigInteger TokenId { get; set; }

    [Parameter("address", "recipient", 3, true)]
    public string Recipient { get; set; }

    [Parameter("uint256", "withdrawnAt", 4, false)]
    public BigInteger WithdrawnAt { get; set; }
}
```

Any change to event parameter names, types, or indexed attributes in the Solidity contract is a breaking change for the indexer and requires coordinated DTO and indexer logic updates.

---

## Summary of Invariants

The following invariants must hold at all times for the indexer to be correct:

1. **Event completeness** — Every staking state change on-chain produces exactly one event in `booster_nft_stake_events`.
2. **No silent mutations** — No staking state change occurs on-chain without a corresponding event.
3. **Reconstructability** — Replaying all rows in `booster_nft_stake_events` in ascending `(block_number, log_index)` order produces the correct current state in `booster_nft_token_status` and `booster_nft_wallet_status`.
4. **Idempotency** — Processing the same event twice (e.g., after a restart) produces the same final derived state as processing it once.
5. **Reorg safety** — After a reorg affecting block N and a subsequent replay, the derived state reflects only the events in the canonical chain.
6. **Reconciliation consistency** — `booster_nft_token_status.is_staked` agrees with `isStaked(tokenId)` on-chain for all blocks outside the confirmation window, after reconciliation has been performed.
