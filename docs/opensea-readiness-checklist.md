# OpenSea Readiness Checklist — Tricksfor Booster NFT Collection

This checklist must be completed before deploying the `TricksforBoosterNFT` collection to mainnet and listing it on OpenSea or any equivalent EVM NFT marketplace. Work through every section in order.

---

## 1. ERC-721 Compliance

- [ ] `supportsInterface` returns `true` for all required interface IDs:
  - ERC-165: `0x01ffc9a7`
  - ERC-721: `0x80ac58cd`
  - ERC-721 Metadata: `0x5b5e139f`
  - ERC-2981 (royalties): `0x2a55205a`
- [ ] `Transfer` events are emitted for every ownership change (mint, transfer, burn) as required by ERC-721 and expected by marketplace indexers
- [ ] `Approval` and `ApprovalForAll` events are emitted correctly
- [ ] `ownerOf(tokenId)` returns the correct current owner for every minted token
- [ ] `balanceOf(address)` returns the correct token count per wallet
- [ ] `tokenURI(tokenId)` reverts for unminted token IDs (OpenZeppelin default behaviour; behaviour is consistent with contract design)

---

## 2. `tokenURI` Configuration

- [ ] The base URI is set to the correct value in the constructor (or via `setBaseURI`) before the first token is minted
- [ ] Token metadata is served at `{baseURI}{tokenId}` — this is the standard OpenZeppelin `ERC721` URI pattern
- [ ] The metadata host (IPFS gateway, CDN, or server) is live and reachable from the public internet
- [ ] Each token's metadata JSON conforms to the OpenSea metadata standard (see [token-example.json](metadata/token-example.json)):
  - `name` — display name of the token (e.g., `"Tricksfor Booster #1"`)
  - `description` — human-readable description of the token
  - `image` — URI to the token image (IPFS `ipfs://` or HTTPS)
  - `attributes` — array of trait objects, each with `trait_type` and `value`
  - `external_url` — optional link to the token's page on the Tricksfor website
- [ ] Metadata for every token ID that will be minted at launch is already published and accessible
- [ ] Metadata URIs have been spot-checked: fetch at least five token URIs to confirm they return valid JSON with the expected fields

---

## 3. `contractURI` Configuration

- [ ] The collection metadata URI is set in the constructor (or via `setContractURI`) before launch
- [ ] The URI resolves to a valid JSON document conforming to the OpenSea collection metadata standard (see [contract-example.json](metadata/contract-example.json)):
  - `name` — the collection name (e.g., `"Tricksfor Boosters"`)
  - `description` — collection-level description
  - `image` — URI to the collection banner or logo image
  - `external_link` — link to the collection's page on the Tricksfor website
  - `seller_fee_basis_points` — royalty fee in basis points (e.g., `500` = 5%)
  - `fee_recipient` — royalty recipient address (must match `royaltyInfo` on-chain)
- [ ] The collection image is accessible and renders correctly in a browser
- [ ] `contractURI()` has been called on the deployed contract and the returned URI resolves to the expected JSON

---

## 4. ERC-2981 Royalty Configuration

- [ ] `royaltyInfo(tokenId, salePrice)` returns the correct `(receiver, royaltyAmount)` pair for a representative set of token IDs and sale prices
- [ ] `royaltyAmount` is correctly calculated as `salePrice * feeBasisPoints / 10000` using integer arithmetic
- [ ] The royalty receiver address is a live, accessible wallet or multi-sig (not the zero address) — replace `0xREPLACE_WITH_ROYALTY_RECIPIENT_ADDRESS` in [contract-example.json](metadata/contract-example.json) with the actual address before publishing
- [ ] `seller_fee_basis_points` in the collection metadata JSON matches the on-chain `feeBasisPoints` value
- [ ] `fee_recipient` in the collection metadata JSON matches the on-chain royalty receiver address returned by `royaltyInfo`
- [ ] Royalty configuration has been tested with a representative sale price (e.g., 1 ETH) to confirm the returned amount is as expected

---

## 5. Access Control and Admin Configuration

- [ ] `DEFAULT_ADMIN_ROLE` is held by the intended deployer or multi-sig wallet — not by a throwaway deployment key
- [ ] `MINTER_ROLE` is granted only to the intended minting backend service or authorized wallet
- [ ] `setBaseURI`, `setContractURI`, and `setRoyaltyInfo` are all protected by `DEFAULT_ADMIN_ROLE` (confirmed by code review and test coverage)
- [ ] Pausing minting does not affect transfers — players can always move their unstaked NFTs on a marketplace while the contract is paused
- [ ] The contract owner (admin) has been confirmed and documented; there is no single point of failure if the admin key is lost

---

## 6. Staking Contract Interaction

### For operators and support teams

When a player stakes a Booster NFT:

1. The player calls `approve(stakingContractAddress, tokenId)` (or `setApprovalForAll`) on the NFT contract.
2. The player calls `stake(tokenId)` on `TricksforBoosterStaking`.
3. `TricksforBoosterStaking` calls the NFT contract's `transferFrom` to move the token from the player's wallet to the staking contract address.
4. The staking contract emits `TokenStaked(staker, tokenId, stakedAt)`.

**The token is now held by the staking contract, not the player's wallet.**

When a player unstakes:

1. The player calls `unstake(tokenId)` on `TricksforBoosterStaking`.
2. The staking contract transfers the token back to the player's wallet.
3. The staking contract emits `TokenUnstaked(staker, tokenId, unstakedAt)`.

**The token is returned to the player's wallet.**

### Marketplace visibility while staked

| State | Token owner on-chain | Marketplace display |
|---|---|---|
| Not staked | Player's wallet | Visible in player's collection |
| Staked | Staking contract address | May appear under the staking contract address, not the player's wallet |
| After unstaking | Player's wallet | Visible in player's collection again |

**This is expected behaviour.** A staked token leaves the player's wallet by design. Players should be informed of this before staking.

### Support escalation guidance

If a player reports that their NFT has "disappeared" from their marketplace profile:

1. Check whether the token is currently staked: call `isStaked(tokenId)` on the staking contract.
2. If staked, confirm the original staker: call `stakedOwnerOf(tokenId)` — it must return the player's wallet address.
3. Inform the player that their NFT is safely held by the staking contract and can be retrieved by calling `unstake(tokenId)`.
4. If `isStaked` returns `false` and the token is not in the player's wallet, escalate to engineering — this indicates an unexpected state.

### Staking contract read methods

| Method | Returns | Description |
|---|---|---|
| `isStaked(tokenId)` | `bool` | `true` if the token is currently held by the staking contract |
| `stakedOwnerOf(tokenId)` | `address` | Original staker's wallet; zero address if not staked |
| `stakedAtOf(tokenId)` | `uint256` | Block timestamp when the token was staked; zero if not staked |
| `getWalletStakedTokens(wallet)` | `uint256[]` | All token IDs currently staked by the given wallet |

---

## 7. Pre-Launch Smoke Tests

Run these checks against the deployed contract on a testnet before deploying to mainnet.

- [ ] Mint a test token (token ID 1) to a test wallet
- [ ] Call `tokenURI(1)` — confirm it returns the expected URI and the URI resolves to valid metadata JSON
- [ ] Call `contractURI()` — confirm it returns the expected URI and the URI resolves to valid collection metadata JSON
- [ ] Call `royaltyInfo(1, 10000)` — confirm the result is `(royaltyReceiver, 500)` for a 5% royalty (or the configured value)
- [ ] Call `supportsInterface(0x2a55205a)` — confirm it returns `true` (ERC-2981)
- [ ] Call `supportsInterface(0x80ac58cd)` — confirm it returns `true` (ERC-721)
- [ ] Import the collection on OpenSea testnet and confirm the collection and token metadata render correctly
- [ ] Transfer the test token to a second wallet and confirm `ownerOf(1)` reflects the new owner
- [ ] Stake the test token and confirm `isStaked(1)` returns `true` and the token no longer shows in the original wallet on OpenSea
- [ ] Unstake the test token and confirm `isStaked(1)` returns `false` and the token reappears in the original wallet

---

## 8. Related Documentation

| Document | Description |
|---|---|
| [token-example.json](metadata/token-example.json) | Reference token metadata JSON conforming to the OpenSea metadata standard |
| [contract-example.json](metadata/contract-example.json) | Reference collection metadata JSON returned by `contractURI()` |
| [Backend Integration Contract](backend-integration-contract.md) | How backend services consume staking events and on-chain read methods |
| [Indexing Specification](indexing-spec.md) | How the backend indexer reconstructs staking state from `TokenStaked` and `TokenUnstaked` events |
| [OpenSea Metadata Standard](https://docs.opensea.io/docs/metadata-standards) | OpenSea's authoritative metadata documentation |
