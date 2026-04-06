# OpenSea Compatibility Skill — Tricksfor SmartContract

Use this checklist whenever a change to `TricksforBoosterNFT` (or any future NFT contract in this repository) might affect marketplace compatibility. Work through every item before opening a PR and before approving one.

---

## When to Use This Skill

- Any change to `TricksforBoosterNFT` contract logic
- Any change to metadata URI handling (`tokenURI`, `contractURI`, base URI)
- Any change to royalty configuration or `ERC-2981` support
- Any change to ERC-721 transfer, approval, or ownership logic
- Any change to `supportsInterface` or inherited interface implementations
- Any change to staking behavior that has a user-visible effect in marketplace UIs

---

## Core Rule

The `TricksforBoosterNFT` contract must remain compatible with OpenSea and equivalent EVM-compatible marketplaces at all times. **Do not remove or break `tokenURI`, `contractURI`, or ERC-2981 royalty support without explicit justification and stakeholder sign-off.**

---

## OpenSea Compatibility Checklist

### ERC-721 Compatibility
- [ ] The contract still correctly implements the ERC-721 standard interface (`IERC721`)
- [ ] `supportsInterface(bytes4 interfaceId)` correctly returns `true` for ERC-721 (`0x80ac58cd`), ERC-165 (`0x01ffc9a7`), ERC-721 Metadata (`IERC721Metadata`, `0x5b5e139f`), and ERC-2981 (`0x2a55205a`) so marketplace metadata detection continues to work as expected
- [ ] `Transfer` events are emitted on all ownership changes (mint, transfer, burn) — required by ERC-721 and indexed by marketplaces
- [ ] `Approval` and `ApprovalForAll` events are emitted correctly
- [ ] The staking contract's use of `transferFrom` does not break marketplace approval flows (the NFT contract itself remains standard)
- [ ] `ERC721Enumerable` is not added without explicit justification (it increases gas cost without OpenSea benefit)

### Metadata Output
- [ ] Token metadata follows the OpenSea metadata standard: `name`, `description`, `image`, and `attributes` fields are present and correctly populated
- [ ] Metadata is served from a reachable URI — the base URI is set correctly and the off-chain metadata host is operational
- [ ] Metadata attributes are valid JSON and do not contain values that would cause OpenSea to reject or misrender the token
- [ ] Any new token attributes have been documented and the off-chain metadata generation has been updated to include them

### `tokenURI()` Behavior
- [ ] `tokenURI(uint256 tokenId)` returns a valid metadata URI for every minted token
- [ ] The URI format follows the existing pattern: `{baseURI}{tokenId}` (standard OpenZeppelin pattern)
- [ ] `tokenURI` reverts (or returns an empty string per contract design) for unminted token IDs — behavior is consistent with existing contract logic
- [ ] If the base URI was changed, existing token URIs still resolve correctly (or the migration plan is documented)
- [ ] The `setBaseURI` admin function is still protected by `onlyOwner`

### `contractURI()` Behavior
- [ ] `contractURI()` returns a valid collection-level metadata URI
- [ ] The collection metadata at the returned URI is accessible and contains the expected fields (name, description, image, external_link, seller_fee_basis_points, fee_recipient)
- [ ] If `contractURI` was changed, the new URI resolves correctly and the collection metadata is up to date
- [ ] The `setContractURI` admin function (if present) is protected by `onlyOwner`

### Staking UX Implications
- [ ] The implications of staking on the marketplace UX are understood and documented:
  - When a Booster NFT is staked, it is held by the staking contract, not the player's wallet — it may appear under the staking contract address in marketplace UIs
  - Players may not be able to list or transfer a staked NFT on a marketplace while it is staked (this is expected and correct behavior)
  - The staking flow (approve → stake) is documented for players who want to understand why their NFT appears to leave their wallet
- [ ] If staking behavior changes in a way that alters the UX for staked tokens on marketplaces, this is documented in the PR and communicated to the player-facing team

### Operator Documentation
- [ ] If new operator permissions (e.g., `setApprovalForAll`, approved operator logic) were introduced or changed, the implications for marketplace operators are documented
- [ ] No change blocks OpenSea (or other standard marketplace) from operating as an approved operator using standard ERC-721 flows
- [ ] If operator filtering (e.g., OpenSea's `OperatorFilterRegistry`) is used or removed, the decision is documented with its tradeoffs (royalty enforcement vs. composability)

### Collection Contract Marketplace Friendliness
- [ ] The collection contract remains deployable and operable without any non-standard tooling
- [ ] Royalty configuration (`setRoyaltyInfo` or equivalent) is functional and the current royalty recipient and basis points are confirmed correct
- [ ] Royalty info is returned correctly by `royaltyInfo(uint256 tokenId, uint256 salePrice)` for all token IDs
- [ ] Royalty basis points use integer arithmetic — no floating point, no raw percentages (10 000 basis points = 100%)
- [ ] The contract's `pause` behavior does not permanently block transfers in a way that would lock tokens in marketplace escrow without a recovery path

---

## Staking and Marketplace Interaction Summary

| Scenario | Expected Behavior |
|---|---|
| Player stakes an NFT | NFT is transferred to the staking contract; it leaves the player's wallet |
| Staked NFT on a marketplace | May appear under the staking contract address; player cannot list it while staked |
| Player unstakes an NFT | NFT is returned to the player's wallet; they can then list it on a marketplace |
| Marketplace tries to transfer a staked NFT | Will fail — the staking contract holds the NFT, not the player |
| Royalties on secondary sale | Paid per ERC-2981 `royaltyInfo` return value; unaffected by staking |

---

## Related Skills

- [`contract-change-skill.md`](./contract-change-skill.md) — apply for all contract changes
- [`event-change-skill.md`](./event-change-skill.md) — apply when events change
- [`nethereum-integration-skill.md`](./nethereum-integration-skill.md) — apply when any integration layer changes
- [`indexing-compatibility-skill.md`](./indexing-compatibility-skill.md) — apply when events or state transitions change
