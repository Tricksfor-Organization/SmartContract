# Metadata Examples

This folder contains example metadata documents for Tricksfor Booster NFTs. These examples show how token and collection metadata should be structured to conform to the OpenSea metadata standard.

## Token Metadata

Each token's metadata is served from the URI returned by `tokenURI(tokenId)`. The base URI is set by the contract owner via `setBaseURI`. Token URI format: `{baseURI}{tokenId}`.

With chain-specific paths, `baseURI = https://nft.tricksfor.com/{chainKey}/metadata/` and
`tokenURI(1) = https://nft.tricksfor.com/ethereum/metadata/1` for Ethereum.

See [`token-example.json`](token-example.json) for a reference token metadata document.

## Collection Metadata

Collection-level metadata is served from the URI returned by `contractURI()`. This is an OpenSea extension and is not part of the ERC-721 standard.

Each chain has its own `collection.json` at `https://nft.tricksfor.com/{chainKey}/contract/collection.json`.
The collection name follows the pattern `Tricksfor Boosters - {Chain}` (e.g. `Tricksfor Boosters - Ethereum`).

See [`contract-example.json`](contract-example.json) for a reference collection metadata document returned by `contractURI()`.

### `contractURI()` per chain

The table below lists the `contractURI()` URL and the chain-specific fields for each supported deployment.
`description`, `external_link`, and `seller_fee_basis_points` are identical across all chains.

| Chain | `contractURI()` URL | Collection `name` | Collection `image` |
|---|---|---|---|
| Ethereum | `https://nft.tricksfor.com/ethereum/contract/collection.json` | `Tricksfor Boosters - Ethereum` | `https://nft.tricksfor.com/ethereum/images/collection.png` |
| Polygon | `https://nft.tricksfor.com/polygon/contract/collection.json` | `Tricksfor Boosters - Polygon` | `https://nft.tricksfor.com/polygon/images/collection.png` |
| Optimism | `https://nft.tricksfor.com/optimism/contract/collection.json` | `Tricksfor Boosters - Optimism` | `https://nft.tricksfor.com/optimism/images/collection.png` |
| BSC | `https://nft.tricksfor.com/bsc/contract/collection.json` | `Tricksfor Boosters - BSC` | `https://nft.tricksfor.com/bsc/images/collection.png` |
| Avalanche | `https://nft.tricksfor.com/avalanche/contract/collection.json` | `Tricksfor Boosters - Avalanche` | `https://nft.tricksfor.com/avalanche/images/collection.png` |

The files are intended for Cloudflare Pages hosting. `TricksforBoosterNFT.setContractURI()` (admin-only)
sets the URI returned by `contractURI()` to the appropriate chain-specific URL at deployment time.

> **Note:** Replace `0xREPLACE_WITH_ROYALTY_RECIPIENT_ADDRESS` in `contract-example.json` **and in every file under `nft-assets/samples/contract/`** with the actual royalty recipient address before publishing. Using the zero address causes royalties to be permanently lost.

> **Warning:** `collection-example.json` is a legacy alias for the same format and is kept only for historical reference. It may still contain an unsafe zero `fee_recipient`, so do **not** copy it as-is for production use. Prefer `contract-example.json` and replace the royalty recipient placeholder before publishing.

Chain-specific sample collection metadata files ready for review are in
[`nft-assets/samples/contract/`](../../nft-assets/samples/contract/).

## Attribute Schema

The finalized token attribute schema — including all required attributes (`Game`, `Option`,
`Booster`, `Multiplier`), valid values, optional attributes, and example JSON for all game
themes — is documented in [`docs/nft-metadata-schema.md`](../nft-metadata-schema.md).

## OpenSea Metadata Standard

Token metadata must include the following fields:

| Field | Required | Description |
|---|---|---|
| `name` | ✅ | Display name of the token |
| `description` | ✅ | Human-readable description |
| `image` | ✅ | URI to the token image (IPFS or HTTPS) |
| `attributes` | ✅ | Array of trait objects with `trait_type` and `value` |

For full OpenSea metadata documentation, see: https://docs.opensea.io/docs/metadata-standards
