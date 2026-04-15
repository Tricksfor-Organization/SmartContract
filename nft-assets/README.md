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
├── _headers           Cloudflare Pages response headers (CORS, content-type, cache)
└── _redirects         Cloudflare Pages rewrite rules (extensionless → .json for tokenURI compatibility)
```

---

## URL Paths After Deployment

The NFT contract uses the OpenZeppelin default `tokenURI` pattern: `tokenURI(id) = {baseURI}{id}`.
With `baseURI = https://nft.tricksfor.com/metadata/`, the contract returns extensionless URIs.
Static metadata files are named `{tokenId}.json`. The `_redirects` file rewrites extensionless
requests to the corresponding `.json` file, so both forms resolve correctly:

| Asset                              | URL                                                    |
|------------------------------------|--------------------------------------------------------|
| Token metadata — on-chain URI      | `https://nft.tricksfor.com/metadata/1` *(from tokenURI)* |
| Token metadata — direct file       | `https://nft.tricksfor.com/metadata/1.json`            |
| Collection metadata                | `https://nft.tricksfor.com/contract/collection.json`   |
| Token image (token 1)              | `https://nft.tricksfor.com/images/1.png`               |

The `_redirects` rewrite rule (`/metadata/:id → /metadata/:id.json 200`) means requests
to the extensionless on-chain URI transparently serve the `.json` file without redirecting
the caller's browser.

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

Each `metadata/{tokenId}.json` file must follow the OpenSea metadata standard and include the
four required attributes defined in the [NFT Metadata Attribute Schema](../docs/nft-metadata-schema.md):

```json
{
  "name": "Tricksfor Coin Heads 2x Booster #1",
  "description": "A Tricksfor Booster NFT. Stake this NFT to activate a reward boost during gameplay. An unstaked Booster confers no in-game advantage.",
  "image": "https://nft.tricksfor.com/images/1.png",
  "external_url": "https://tricksfor.com/boosters/1",
  "attributes": [
    { "trait_type": "Game",       "value": "Coin"       },
    { "trait_type": "Option",     "value": "Heads"      },
    { "trait_type": "Booster",    "value": "2x Booster" },
    { "trait_type": "Multiplier", "value": "2x"         }
  ]
}
```

See [`docs/nft-metadata-schema.md`](../docs/nft-metadata-schema.md) for the full attribute schema,
all valid values, and examples covering every game theme and booster tier.
See [`docs/metadata/token-example.json`](../docs/metadata/token-example.json) for a standalone reference file.
See [`docs/nft-assets-spec.md`](../docs/nft-assets-spec.md) for the asset taxonomy, token ID mapping rules,
image naming convention, and static file layout specification.

---

## Collection Metadata Format

`contract/collection.json` is the collection-level metadata returned by `contractURI()`.
The `fee_recipient` field is part of the **OpenSea collection metadata** format (not the
contract's ERC-2981 royalty receiver). The file currently uses `0x000000000000000000000000000000000000dEaD`
as a placeholder. **Before publishing to mainnet, replace it with the actual royalty recipient
address. Using the burn address (`0xdEaD`) means OpenSea royalty payments will be permanently
lost — they cannot be recovered.**

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

The same `nft-assets/` directory is deployed to Cloudflare Pages on every release,
regardless of which chain is being targeted. Each GitHub Environment can point to a
different Cloudflare Pages project and custom domain so that testnet deployments never
overwrite production metadata:

| Environments        | `CF_PAGES_PROJECT`      | `NFT_BASE_DOMAIN`             |
|---------------------|-------------------------|-------------------------------|
| All mainnet envs    | `tricksfor-nft`         | `nft.tricksfor.com`           |
| All testnet envs    | `tricksfor-nft-preview` | `nft-preview.tricksfor.com`   |

See [`docs/cloudflare-pages-setup.md` § Multi-Chain Deployment Strategy](../docs/cloudflare-pages-setup.md#8-multi-chain-deployment-strategy)
and [`docs/release-operations.md` § Required Variables](../docs/release-operations.md#4-required-variables)
for the recommended per-environment configuration.
