# NFT Assets

This directory contains the static NFT metadata and images deployed to Cloudflare Pages.
Files here are served at `https://nft.tricksfor.com/` (or the configured custom domain).

---

## Directory Structure

Each supported chain has its own subdirectory. Token metadata, images, and collection metadata
are generated into the chain-specific directory by `scripts/generate-nft-assets.js`.

```
nft-assets/
├── ethereum/                  Chain-specific output for Ethereum
│   ├── metadata/              Token metadata JSON files — one file per token ID (1–600)
│   │   ├── 1.json
│   │   ├── 2.json
│   │   └── ...
│   ├── images/                NFT image assets — one file per token ID
│   │   ├── 1.png
│   │   ├── 2.png
│   │   └── ...
│   └── contract/              Collection-level metadata
│       └── collection.json
├── polygon/                   Chain-specific output for Polygon
│   ├── metadata/
│   ├── images/
│   └── contract/
│       └── collection.json
├── optimism/                  Chain-specific output for Optimism
├── bsc/                       Chain-specific output for BNB Smart Chain
├── avalanche/                 Chain-specific output for Avalanche
├── source-images/             Canonical source images, organised by theme
│   ├── coin/                  6 images — heads/tails × 2x/3x/5x
│   ├── dice/                  18 images — 1–6 × 2x/3x/5x
│   └── rps/                   9 images — rock/paper/scissors × 2x/3x/5x
├── generated/                 Pre-generated metadata output (self-contained, Pages-deployable)
│   ├── _redirects             Cloudflare Pages rewrite rules for the generated directory
│   ├── _headers               Cloudflare Pages response headers for the generated directory
│   ├── ethereum/              Generated metadata for Ethereum (600 tokens)
│   │   ├── metadata/
│   │   └── contract/
│   ├── polygon/               Generated metadata for Polygon
│   ├── bsc/                   Generated metadata for BSC
│   ├── avalanche/             Generated metadata for Avalanche
│   └── optimism/              Generated metadata for Optimism
├── sample/                    Validation sample — Coin theme on Ethereum (200 tokens)
│   ├── README.md              Validation checklist and sample documentation
│   ├── ethereum/
│   │   ├── metadata/          Token metadata for IDs 1–200 (all Coin tokens)
│   │   └── contract/          Collection metadata
│   ├── _redirects
│   └── _headers
├── images/                    Shared image assets (e.g. collection banner)
│   └── collection.png
├── manifests/                 Manifest samples and templates
├── _headers                   Cloudflare Pages response headers (CORS, content-type, cache)
└── _redirects                 Cloudflare Pages rewrite rules (extensionless → .json)
```

---

## URL Paths After Deployment

The NFT contract uses the OpenZeppelin default `tokenURI` pattern: `tokenURI(id) = {baseURI}{id}`.
With `baseURI = https://nft.tricksfor.com/{chain}/metadata/`, the contract returns extensionless URIs.
The `_redirects` file rewrites extensionless requests to the corresponding `.json` file.

| Asset                                    | URL                                                                |
|------------------------------------------|--------------------------------------------------------------------|
| Token metadata — on-chain URI (Ethereum) | `https://nft.tricksfor.com/ethereum/metadata/1` *(from tokenURI)* |
| Token metadata — direct file (Ethereum)  | `https://nft.tricksfor.com/ethereum/metadata/1.json`              |
| Collection metadata (Ethereum)           | `https://nft.tricksfor.com/ethereum/contract/collection.json`     |
| Token image (Ethereum, token 1)          | `https://nft.tricksfor.com/ethereum/images/1.png`                 |
| Token metadata — on-chain URI (Polygon)  | `https://nft.tricksfor.com/polygon/metadata/1`                    |
| Collection metadata (Polygon)            | `https://nft.tricksfor.com/polygon/contract/collection.json`      |

The extensionless-to-`.json` rewrite in `_redirects` means requests to the on-chain URI
transparently serve the `.json` file without redirecting the caller's browser.

---

## Contract Parameters Derived from These Paths

Each chain deployment consumes its own chain-specific base URLs:

| Chain     | `BASE_TOKEN_URI`                                   | `CONTRACT_URI`                                               |
|-----------|----------------------------------------------------|--------------------------------------------------------------|
| Ethereum  | `https://nft.tricksfor.com/ethereum/metadata/`     | `https://nft.tricksfor.com/ethereum/contract/collection.json`|
| Polygon   | `https://nft.tricksfor.com/polygon/metadata/`      | `https://nft.tricksfor.com/polygon/contract/collection.json` |
| Optimism  | `https://nft.tricksfor.com/optimism/metadata/`     | `https://nft.tricksfor.com/optimism/contract/collection.json`|
| BSC       | `https://nft.tricksfor.com/bsc/metadata/`          | `https://nft.tricksfor.com/bsc/contract/collection.json`     |
| Avalanche | `https://nft.tricksfor.com/avalanche/metadata/`    | `https://nft.tricksfor.com/avalanche/contract/collection.json`|

Contract deployments must pass these chain-specific values as `Deployment__Nft__BaseUri` and
`Deployment__Nft__ContractMetadataUri`. The configured URLs must include the `/{chainKey}/`
path segment shown above so they match the generated Cloudflare Pages asset layout.

The `deploy-metadata` job in `release-deploy.yml` reads the `chainKey` from
`deployments/config/{env}/nft-manifest.json` and constructs the chain-specific URLs
automatically, then passes them as output variables to the `deploy-contracts` job.

---

## Generating Static Assets

Use `scripts/generate-nft-assets.js` to generate token metadata and collection metadata from
an authoritative manifest:

```bash
# Generate from a deployment manifest
node scripts/generate-nft-assets.js --manifest deployments/config/ethereum-mainnet/nft-manifest.json

# Generate from an environment name (auto-locates the manifest)
node scripts/generate-nft-assets.js --env ethereum-mainnet

# Dry-run (preview what would be generated without writing files)
node scripts/generate-nft-assets.js --env ethereum-mainnet --dry-run

# Skip image copying (when source images are not yet available)
node scripts/generate-nft-assets.js --env ethereum-mainnet --skip-images
```

The script writes files to `nft-assets/{chainKey}/metadata/`, `nft-assets/{chainKey}/contract/`,
and `nft-assets/{chainKey}/images/`. It also prints the derived `BASE_TOKEN_URI` and
`CONTRACT_URI` values for use in the contract deployment.

See [`docs/nft-metadata-generation.md`](../docs/nft-metadata-generation.md) for the complete
generation guide including the release workflow integration.

---

## Standalone Metadata Generator

Use `scripts/generate-nft-metadata.js` to generate all 600 token metadata files per chain
directly from the built-in token allocation rules — no pre-existing deployment manifest required.

```bash
# Generate for a single chain
node scripts/generate-nft-metadata.js --chain polygon

# Generate for all 5 mainnet chains at once
node scripts/generate-nft-metadata.js --all-mainnet --force

# Generate for one chain, one theme only (token IDs remain globally consistent)
node scripts/generate-nft-metadata.js --chain ethereum --theme coin --output nft-assets/sample --force

# Load chain config from an approved manifest file
node scripts/generate-nft-metadata.js --manifest nft-assets/manifests/ethereum.sample.json

# npm shortcut
npm run generate:metadata -- --all-mainnet --force
```

The script writes files to `nft-assets/generated/{chainKey}/metadata/` and
`nft-assets/generated/{chainKey}/contract/`. It also writes `_redirects` and `_headers`
into `nft-assets/generated/` so the directory is self-contained and deployable to Cloudflare
Pages (set the build output directory to `nft-assets/generated/`).

See [`docs/nft-metadata-generation.md` § 5](../docs/nft-metadata-generation.md#5-standalone-metadata-generator)
for the full option reference.

---

## Validation Sample

A pre-generated validation sample covering the complete **Coin** theme on **Ethereum**
(200 tokens, IDs 1–200) lives in [`nft-assets/sample/`](./sample/).

Use it to verify naming templates, description templates, the attribute schema, image URL
patterns, and token ID allocation before reviewing the full generated output.

```bash
# Regenerate the sample from scratch
npm run generate:sample
```

See [`nft-assets/sample/README.md`](./sample/README.md) for a full validation checklist.

---

## Token Metadata Format

Each `{chainKey}/metadata/{tokenId}.json` file follows the OpenSea metadata standard:

```json
{
  "name": "Tricksfor Coin Heads 2x Booster #1",
  "description": "A Tricksfor Coin Booster NFT for the Heads outcome. Stake this NFT to activate a 2x reward boost during eligible Tricksfor gameplay. An unstaked Booster confers no in-game advantage. Subject to platform rules.",
  "image": "https://nft.tricksfor.com/ethereum/images/1.png",
  "external_url": "https://tricksfor.com/boosters/1",
  "attributes": [
    { "trait_type": "Game",       "value": "Coin"       },
    { "trait_type": "Option",     "value": "Heads"      },
    { "trait_type": "Booster",    "value": "2x Booster" },
    { "trait_type": "Multiplier", "value": "2x"         },
    { "trait_type": "Chain",      "value": "Ethereum"   }
  ]
}
```

See [`docs/nft-metadata-schema.md`](../docs/nft-metadata-schema.md) for the full attribute schema,
all valid values, and examples covering every game theme and booster tier.

---

## Collection Metadata Format

`{chainKey}/contract/collection.json` is the collection-level metadata returned by `contractURI()`:

```json
{
  "name": "Tricksfor Boosters - Ethereum",
  "description": "Tricksfor Booster NFTs are in-game items that activate a reward boost when staked. Stake your Booster to earn enhanced rewards during gameplay.",
  "image": "https://nft.tricksfor.com/ethereum/images/collection.png",
  "external_link": "https://tricksfor.com/boosters",
  "seller_fee_basis_points": 500,
  "fee_recipient": "0x000000000000000000000000000000000000dEaD"
}
```

The `fee_recipient` field uses `0x000000000000000000000000000000000000dEaD` as a placeholder.
**Before publishing to mainnet, replace it with the actual royalty recipient address.**

See [`docs/metadata/contract-example.json`](../docs/metadata/contract-example.json) for the field reference.

---

## Cloudflare Pages Setup

See [`docs/cloudflare-pages-setup.md`](../docs/cloudflare-pages-setup.md) for instructions
on creating the Cloudflare Pages project, binding the custom domain, and configuring the
required GitHub Environment secrets and variables.

The entire `nft-assets/` directory is deployed to Cloudflare Pages on every release.
Chain-specific subdirectories are served at their respective paths under the shared domain:

| Environments        | `CF_PAGES_PROJECT`      | `NFT_BASE_DOMAIN`             |
|---------------------|-------------------------|-------------------------------|
| All mainnet envs    | `tricksfor-nft`         | `nft.tricksfor.com`           |
| All testnet envs    | `tricksfor-nft-preview` | `nft-preview.tricksfor.com`   |

All chains share a single Cloudflare Pages project per environment tier. Chain separation is
achieved through the per-chain subdirectory structure (`/ethereum/`, `/polygon/`, etc.) within
that single project.

