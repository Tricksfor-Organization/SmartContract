# Repository Memory — Tricksfor SmartContract

This document captures stable knowledge about the Tricksfor SmartContract repository. It is intended to give AI tools, new contributors, and auditors a fast-load reference for facts that don't change often but are critical for making correct decisions.

---

## Repository Purpose

This repository implements the Solidity smart contracts and Nethereum C# integration layer for the Tricksfor blockchain gaming platform's NFT and staking infrastructure.

---

## Domain Facts

- **Booster NFTs** are in-game items that activate a reward boost **only when staked**. An unstaked Booster NFT confers no in-game advantage.
- **Game settlement is fully off-chain.** The Tricksfor backend determines game outcomes and applies reward boosts based on indexer-reconstructed staking state.
- **For gameplay and reward-settlement purposes, the contracts expose two primary truths:** NFT ownership (who owns which Booster NFT) and staking state (which NFTs are currently staked by which wallets).
- **Booster classification and reward multipliers** are managed in a separate backend project. They are not stored or computed on-chain.
- Players interact with the contracts via standard ERC-721 `approve` → staking contract `stake(tokenId)` flow.

---

## Contracts

| Contract | Full Name | Responsibility |
|---|---|---|
| NFT Collection | `TricksforBoosterNFT` | ERC-721 minting, ownership, metadata, royalties, OpenSea compatibility |
| Staking | `TricksforBoosterStaking` | NFT custody during staking, stake/unstake event emission, current staking state |

These two contracts are **always deployed separately** and must remain architecturally separate.

---

## Event Signatures (Integration-Critical)

These events are the public integration contract with the Tricksfor backend indexer. **Do not change without a breaking-change notice and downstream coordination.**

```solidity
event TokenStaked(address indexed staker, uint256 indexed tokenId, uint256 stakedAt);
event TokenUnstaked(address indexed staker, uint256 indexed tokenId, uint256 unstakedAt);
```

| Field | Type | Indexed | Description |
|---|---|---|---|
| `staker` | `address` | ✅ | Wallet that owns and staked the token |
| `tokenId` | `uint256` | ✅ | The staked/unstaked NFT token ID |
| `stakedAt` / `unstakedAt` | `uint256` | ❌ | Block timestamp at the moment of the state change |

---

## Current Read Methods (Staking Contract)

These methods provide current on-chain state and must remain in sync with event semantics:

| Method | Return | Description |
|---|---|---|
| `isStaked(uint256 tokenId)` | `bool` | Returns `true` if the token is currently staked |
| `stakedOwnerOf(uint256 tokenId)` | `address` | Returns the original owner of a currently staked token; reverts or returns zero address if not staked |

If events say a token is staked, these methods must reflect that. State and events must never diverge.

---

## Important Non-Goals

The following are explicitly **out of scope** for this repository:

- Reward calculation, accumulation, or distribution logic
- Token payouts or ERC-20 transfers initiated by the staking contract
- Game logic, scoring, or match result processing
- Player account management or off-chain identity systems
- Any fictional "standard ERC-721 staking interface" — no such standard exists
- Booster tier or multiplier definitions (these live in the backend project)

---

## Indexing Assumptions

The Tricksfor backend indexer relies on the following assumptions. Changes that violate these require indexer-team coordination:

1. **Event completeness** — Every staking state change produces exactly one `TokenStaked` or `TokenUnstaked` event.
2. **No silent mutations** — There are no state changes that do not emit an event.
3. **Reconstructability** — Replaying all `TokenStaked` and `TokenUnstaked` events from block 0 produces the correct current staking state for every wallet and token.
4. **Indexed fields for efficient filtering** — `staker` and `tokenId` are indexed, enabling efficient log queries by wallet or token.
5. **Stable event schema** — The indexer is not designed to handle multiple event schema versions simultaneously. Schema changes require a coordinated migration.
6. **Idempotency awareness** — The indexer handles blockchain reorgs by replaying events. The contract must not emit duplicate events for the same logical state transition.

---

## Deployment Assumptions

- The NFT contract is deployed first; its address is passed to the staking contract constructor.
- The staking contract holds a reference to the NFT contract address for custody validation.
- The dependency is one-way: staking contract knows the NFT contract; NFT contract does not know the staking contract.
- Both contracts use `Ownable` (OpenZeppelin). The deployer is the initial owner.
- ABI and BIN artifacts are committed to the repository alongside contracts and must be regenerated on any interface change.

---

## Metadata Assumptions

- Each token's metadata is served from a base URI set by the contract owner via `setBaseURI`.
- Token URI format: `{baseURI}{tokenId}` (standard OpenZeppelin pattern).
- Collection-level metadata is served from `contractURI()` (OpenSea extension).
- Metadata is hosted off-chain; the contract stores only the base URI pointer.
- Metadata structure follows the OpenSea metadata standard (name, description, image, attributes).

---

## OpenSea Compatibility Assumptions

The `TricksforBoosterNFT` contract must maintain the following for marketplace compatibility:

- `tokenURI(uint256 tokenId)` — returns a valid metadata URI per ERC-721 standard
- `contractURI()` — returns collection-level metadata URI (OpenSea extension)
- `royaltyInfo(uint256 tokenId, uint256 salePrice)` — returns royalty recipient and amount (ERC-2981)
- `Transfer` events on all ownership changes — required by ERC-721 and indexed by marketplaces
- `supportsInterface` correctly advertises ERC-721, ERC-165, and ERC-2981 support
- `ERC721Enumerable` is **not** used by default (adds gas cost without OpenSea benefit)

---

## Access Control Summary

| Function | Who Can Call |
|---|---|
| `mint` | Contract owner |
| `setBaseURI` | Contract owner |
| `setContractURI` | Contract owner |
| `setRoyaltyInfo` | Contract owner |
| `pause` / `unpause` | Contract owner |
| `stake(tokenId)` | Token owner (after `approve`) |
| `unstake(tokenId)` | Original staker only |
| `emergencyWithdraw` (if present) | Contract owner — must emit dedicated event, must be documented |

---

## Nethereum Integration Summary

- All contract interactions use typed function message classes and event DTO classes.
- No raw ABI string decoding.
- Nethereum DTO bindings must match Solidity parameter definitions exactly where it matters: the `ParameterAttribute` name value must use the exact Solidity parameter name. C# property names may remain idiomatic PascalCase.
- Integration tests deploy real contracts to a local test node and verify both state and logs.
- DTOs and contract changes are always updated atomically in the same PR.
