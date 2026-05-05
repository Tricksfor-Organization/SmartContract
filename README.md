# SmartContract

Tricksfor Booster NFT smart contracts — ERC-721 collection + staking.

## Generating NFT Metadata

Use `generate-assets` to produce chain-specific token metadata and collection metadata
into `nft-assets/generated/`:

```bash
# Install dependencies
npm install

# Generate metadata for a single chain
npm run generate-assets -- --chain polygon

# Generate from a manifest file
npm run generate-assets -- --manifest nft-assets/manifests/polygon.full.json

# Generate for all 5 mainnet chains
npm run generate-assets -- --all-mainnet --force
```

Output:
```
nft-assets/generated/{chain}/metadata/{tokenId}.json   ← token metadata (1–600)
nft-assets/generated/{chain}/contract/collection.json  ← collection metadata
```

See [`docs/generate-assets.md`](docs/generate-assets.md) for the full option reference,
examples, and CI integration guide.