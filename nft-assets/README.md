# NFT Assets

This directory contains the static NFT metadata and images deployed to Cloudflare Pages.
Files here are served at `https://nft.tricksfor.com/` (or the configured custom domain).

---

## Directory Structure

```
nft-assets/
├── metadata/          Token metadata JSON files — one file per token ID
│   ├── 1.json
│   ├── 2.json
│   └── ...
├── images/            NFT image assets — one file per token ID
│   ├── 1.png
│   ├── 2.png
│   └── ...
├── contract/          Collection-level metadata
│   └── collection.json
└── _headers           Cloudflare Pages response headers (CORS, content-type, cache)
```

---

## URL Paths After Deployment

| Asset                        | URL                                                  |
|------------------------------|------------------------------------------------------|
| Token metadata (token 1)     | `https://nft.tricksfor.com/metadata/1.json`          |
| Token metadata (token 2)     | `https://nft.tricksfor.com/metadata/2.json`          |
| Collection metadata          | `https://nft.tricksfor.com/contract/collection.json` |
| Token image (token 1)        | `https://nft.tricksfor.com/images/1.png`             |

---

## Contract Parameters Derived from These Paths

| Contract parameter       | Value                                                |
|--------------------------|------------------------------------------------------|
| `BASE_TOKEN_URI`         | `https://nft.tricksfor.com/metadata/`                |
| `CONTRACT_URI`           | `https://nft.tricksfor.com/contract/collection.json` |

The release workflow (`release-deploy.yml`) deploys these assets to Cloudflare Pages before
deploying the smart contracts. It resolves the final base URI and contract URI from the
deployment, then passes them to the contract deployment runner via environment variable
overrides (`Deployment__Nft__BaseUri` and `Deployment__Nft__ContractMetadataUri`).

---

## Token Metadata Format

Each `metadata/{tokenId}.json` file must follow the OpenSea metadata standard:

```json
{
  "name": "Tricksfor Booster #1",
  "description": "A Tricksfor Booster NFT. Stake this NFT to activate a reward boost during gameplay.",
  "image": "https://nft.tricksfor.com/images/1.png",
  "external_url": "https://tricksfor.com/boosters/1",
  "attributes": [
    { "trait_type": "Booster Type", "value": "Gold" },
    { "trait_type": "Multiplier",   "value": "2x"   },
    { "trait_type": "Rarity",       "value": "Rare"  }
  ]
}
```

See `docs/metadata/token-example.json` for a full reference example.

---

## Collection Metadata Format

`contract/collection.json` is the collection-level metadata returned by `contractURI()`.
The `fee_recipient` field is part of the **OpenSea collection metadata** format (not the
contract's ERC-2981 royalty receiver). Before publishing to mainnet, replace
`0xREPLACE_WITH_ROYALTY_RECIPIENT_ADDRESS` with the actual address. **Using the zero address
causes OpenSea royalty payments to be permanently lost.**

> Note: The contract's ERC-2981 royalty receiver is set separately via the `RoyaltyReceiver`
> field in `deployments/config/{env}/deployment-params.json`. When left empty (`""`), the
> deployment runner defaults to the deployer wallet address.

See `docs/metadata/contract-example.json` for the field reference.

---

## Adding Tokens Before a Release

1. Add `metadata/{tokenId}.json` for each token to be minted (e.g. `metadata/1.json`).
2. Add `images/{tokenId}.png` (or `.gif`, `.svg`) for each token.
3. Update `contract/collection.json` if collection-level metadata needs to change.
4. Commit and push to the release branch.
5. When the GitHub Release is published, `release-deploy.yml` deploys these files to
   Cloudflare Pages before deploying the smart contracts.

---

## Cloudflare Pages Setup

See [`docs/cloudflare-pages-setup.md`](../docs/cloudflare-pages-setup.md) for instructions
on creating the Cloudflare Pages project, binding the custom domain, and configuring the
required GitHub Environment secrets and variables.
