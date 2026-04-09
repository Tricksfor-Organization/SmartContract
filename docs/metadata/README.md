# Metadata Examples

This folder contains example metadata documents for Tricksfor Booster NFTs. These examples show how token and collection metadata should be structured to conform to the OpenSea metadata standard.

## Token Metadata

Each token's metadata is served from the URI returned by `tokenURI(tokenId)`. The base URI is set by the contract owner via `setBaseURI`. Token URI format: `{baseURI}{tokenId}`.

See [`token-example.json`](token-example.json) for a reference token metadata document.

## Collection Metadata

Collection-level metadata is served from the URI returned by `contractURI()`. This is an OpenSea extension and is not part of the ERC-721 standard.

See [`contract-example.json`](contract-example.json) for a reference collection metadata document returned by `contractURI()`.

> **Note:** Replace `0xREPLACE_WITH_ROYALTY_RECIPIENT_ADDRESS` in `contract-example.json` with the actual royalty recipient address before publishing. Using the zero address causes royalties to be permanently lost.

> `collection-example.json` is an earlier alias for the same format and is kept for reference.

## OpenSea Metadata Standard

Token metadata must include the following fields:

| Field | Required | Description |
|---|---|---|
| `name` | ✅ | Display name of the token |
| `description` | ✅ | Human-readable description |
| `image` | ✅ | URI to the token image (IPFS or HTTPS) |
| `attributes` | ✅ | Array of trait objects with `trait_type` and `value` |

For full OpenSea metadata documentation, see: https://docs.opensea.io/docs/metadata-standards
