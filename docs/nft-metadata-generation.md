# NFT Metadata Generation

This document describes how to generate static NFT metadata and collection metadata from a
finalized collection manifest, and how the generated output integrates with the Cloudflare
Pages deployment and contract deployment pipeline.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Output Structure](#2-output-structure)
3. [URL Conventions](#3-url-conventions)
4. [Generation Script](#4-generation-script)
5. [Manifest Requirements](#5-manifest-requirements)
6. [Generated File Formats](#6-generated-file-formats)
7. [Release Workflow Integration](#7-release-workflow-integration)
8. [Multi-Chain Deployment](#8-multi-chain-deployment)
9. [Related Documents](#9-related-documents)

---

## 1. Overview

NFT token metadata and collection metadata for the Tricksfor Booster collection are generated
from an authoritative asset manifest and deployed as static files to Cloudflare Pages.

The generation pipeline is:

```
nft-manifest.json (deployments/config/{env}/)
        │
        ▼
scripts/generate-nft-assets.js
        │
        ├─► nft-assets/{chainKey}/metadata/{tokenId}.json   (one per token, 1–600)
        ├─► nft-assets/{chainKey}/contract/collection.json  (one per chain)
        └─► nft-assets/{chainKey}/images/{tokenId}.png      (one per token, copied from source)
        │
        ▼
Cloudflare Pages deployment (deploy-metadata job)
        │
        ▼
BASE_TOKEN_URI and CONTRACT_URI → contract deployment (deploy-contracts job)
```

Generation runs before contract deployment. The contract is deployed with the exact URLs
that are live on Cloudflare Pages.

---

## 2. Output Structure

One subdirectory per chain within `nft-assets/`:

```
nft-assets/
├── ethereum/
│   ├── metadata/
│   │   ├── 1.json        ← Coin / Heads / 2x
│   │   ├── 2.json
│   │   ├── ...
│   │   └── 600.json      ← RPS / Scissors / 5x
│   ├── images/
│   │   ├── 1.png
│   │   ├── ...
│   │   └── 600.png
│   └── contract/
│       └── collection.json
├── polygon/
│   ├── metadata/
│   ├── images/
│   └── contract/
│       └── collection.json
├── optimism/
├── bsc/
└── avalanche/
```

Each chain directory is independent. Multiple chains can coexist in the same `nft-assets/`
tree and are served under their own path prefix by the single shared Cloudflare Pages project.

---

## 3. URL Conventions

### Token metadata

| Element | Pattern |
|---|---|
| On-chain `tokenURI` | `https://nft.tricksfor.com/{chainKey}/metadata/{tokenId}` |
| Direct file URL | `https://nft.tricksfor.com/{chainKey}/metadata/{tokenId}.json` |

The `_redirects` rule rewrites extensionless requests to the `.json` file, so the on-chain URI
resolves correctly without renaming the files.

### Collection metadata and images

| Element | Pattern |
|---|---|
| Collection metadata | `https://nft.tricksfor.com/{chainKey}/contract/collection.json` |
| Token image | `https://nft.tricksfor.com/{chainKey}/images/{tokenId}.png` |
| Collection image | `https://nft.tricksfor.com/{chainKey}/images/collection.png` |

### Contract parameters derived from the output structure

| Contract parameter | Value (mainnet Ethereum example) |
|---|---|
| `BASE_TOKEN_URI` | `https://nft.tricksfor.com/ethereum/metadata/` |
| `CONTRACT_URI` | `https://nft.tricksfor.com/ethereum/contract/collection.json` |

For testnet environments the domain is `nft-preview.tricksfor.com`.

### Supported chains

| Chain | `chainKey` | Example `BASE_TOKEN_URI` |
|---|---|---|
| Ethereum | `ethereum` | `https://nft.tricksfor.com/ethereum/metadata/` |
| Polygon | `polygon` | `https://nft.tricksfor.com/polygon/metadata/` |
| Optimism | `optimism` | `https://nft.tricksfor.com/optimism/metadata/` |
| BNB Smart Chain | `bsc` | `https://nft.tricksfor.com/bsc/metadata/` |
| Avalanche | `avalanche` | `https://nft.tricksfor.com/avalanche/metadata/` |

---

## 4. Generation Script

`scripts/generate-nft-assets.js` reads an authoritative chain-specific manifest and writes
token metadata files, the collection metadata file, and per-token images.

### Usage

```bash
# Load manifest from a deployment environment directory
node scripts/generate-nft-assets.js --env ethereum-mainnet

# Load manifest from an explicit path
node scripts/generate-nft-assets.js --manifest deployments/config/ethereum-mainnet/nft-manifest.json

# Dry-run: preview what would be generated without writing any files
node scripts/generate-nft-assets.js --env ethereum-mainnet --dry-run

# Skip image copying (when source images are not yet available)
node scripts/generate-nft-assets.js --env ethereum-mainnet --skip-images

# Overwrite existing output files
node scripts/generate-nft-assets.js --env ethereum-mainnet --force
```

### Options

| Option | Default | Description |
|---|---|---|
| `--manifest <path>` | — | Explicit path to nft-manifest.json |
| `--env <env>` | — | Environment name; loads `deployments/config/<env>/nft-manifest.json` |
| `--nft-assets <path>` | `./nft-assets` | Path to the nft-assets directory |
| `--dry-run` | false | Print what would be written without creating files |
| `--skip-images` | false | Skip the image copy step |
| `--force` | false | Overwrite existing output files |

### What the script generates

For each token entry in the manifest:

1. Writes `nft-assets/{chainKey}/metadata/{tokenId}.json` — token metadata JSON
2. Copies `nft-assets/images/source/{sourceImage}` to `nft-assets/{chainKey}/images/{tokenId}.png`

After processing all tokens:

3. Writes `nft-assets/{chainKey}/contract/collection.json` — collection metadata

The script also prints the derived `BASE_TOKEN_URI` and `CONTRACT_URI` at the end of each
run for use in the contract deployment step.

### Exit codes

| Code | Meaning |
|---|---|
| 0 | Generation completed successfully |
| 1 | One or more errors prevented generation |

---

## 5. Manifest Requirements

The generation script reads an authoritative chain-specific manifest stored at
`deployments/config/{env}/nft-manifest.json`. The manifest must conform to
[`docs/nft-asset-manifest-spec.md`](nft-asset-manifest-spec.md).

### Required top-level fields

| Field | Description |
|---|---|
| `manifestVersion` | Must be `"1.0"` |
| `chainKey` | Lowercase chain key (`ethereum`, `polygon`, `bsc`, `avalanche`, `optimism`) |
| `chain` | Chain display name (e.g. `"Ethereum"`, `"BNB Smart Chain"`) |
| `baseImageUri` | Base URL for token images, e.g. `"https://nft.tricksfor.com/ethereum/images/"` |
| `baseMetadataUri` | Base URL for token metadata, e.g. `"https://nft.tricksfor.com/ethereum/metadata/"` |
| `supply.total` | Total number of tokens (must equal `supply.coin + supply.dice + supply.rps`) |
| `tokens` | Array of token entries (one per token ID, all 600 for an authoritative manifest) |

### Required token entry fields

| Field | Description |
|---|---|
| `tokenId` | On-chain token ID (positive integer, 1–600) |
| `theme` | Canonical theme identifier: `coin`, `dice`, or `rps` |
| `variant` | Canonical variant identifier (e.g. `heads`, `tails`, `1`–`6`, `rock`) |
| `tier` | Booster tier: `2x`, `3x`, or `5x` |
| `sourceImage` | Source image file name in `nft-assets/images/source/` |

Optional token entry fields that override script-derived values:

| Field | Overrides |
|---|---|
| `displayName` | Token `name` field in metadata (default: derived from theme/variant/tier) |
| `description` | Token `description` field (default: derived from nft-copy-spec.md § 5.1 template) |

### `baseImageUri` and `baseMetadataUri` conventions

These fields must point to the chain-specific paths in the deployed Pages project:

```json
"baseImageUri":    "https://nft.tricksfor.com/ethereum/images/",
"baseMetadataUri": "https://nft.tricksfor.com/ethereum/metadata/"
```

The generation script derives `CONTRACT_URI` from `baseMetadataUri` by replacing
`/metadata/` with `/contract/` and appending `collection.json`.

---

## 6. Generated File Formats

### Token metadata (`{chainKey}/metadata/{tokenId}.json`)

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

Attribute derivation:

| Metadata attribute | Source in manifest token entry |
|---|---|
| `"name"` | `displayName` field, or derived as `Tricksfor {Game} {Option} {tier} Booster #{tokenId}` |
| `"description"` | `description` field, or derived from nft-copy-spec.md § 5.1 template |
| `"image"` | `{baseImageUri}{tokenId}.png` |
| `"external_url"` | `https://tricksfor.com/boosters/{tokenId}` |
| `"Game"` attribute | `theme` → display name (`coin` → `"Coin"`, `rps` → `"Rock Paper Scissors"`) |
| `"Option"` attribute | `variant` → display name (`heads` → `"Heads"`, `rock` → `"Rock"`) |
| `"Booster"` attribute | `tier` → `"{tier} Booster"` (e.g. `"2x"` → `"2x Booster"`) |
| `"Multiplier"` attribute | `tier` value directly (e.g. `"2x"`, `"3x"`, `"5x"`) |
| `"Chain"` attribute | `chainKey` → display value (`ethereum` → `"Ethereum"`, `bsc` → `"BNB Chain"`) |

### Collection metadata (`{chainKey}/contract/collection.json`)

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

> **⚠ Important:** The `fee_recipient` field is a placeholder burn address. Replace it with the
> actual royalty recipient address before mainnet deployment. Using the burn address means OpenSea
> royalty payments are permanently lost.

Collection name derivation per [`docs/nft-copy-spec.md` § 1](nft-copy-spec.md#1-collection-naming):

| `chainKey` | Collection `name` |
|---|---|
| `ethereum` | `Tricksfor Boosters - Ethereum` |
| `polygon` | `Tricksfor Boosters - Polygon` |
| `optimism` | `Tricksfor Boosters - Optimism` |
| `bsc` | `Tricksfor Boosters - BSC` |
| `avalanche` | `Tricksfor Boosters - Avalanche` |

---

## 7. Release Workflow Integration

Metadata generation fits into the release workflow between the `test` job and the
`deploy-metadata` job:

```
test
 └── [generate metadata] ← run locally or as pre-deploy CI step
       └── deploy-metadata   (Cloudflare Pages deployment)
             └── deploy-contracts   (contract deployment)
                   ├── verify-contracts
                   └── publish-nuget
```

### Step-by-step release sequence

1. **Finalise the manifest** — ensure `deployments/config/{env}/nft-manifest.json` is complete
   and passes validation (`node scripts/validate-nft-assets.js --env {env}`).

2. **Generate static files** — run the generation script to produce the output tree:
   ```bash
   node scripts/generate-nft-assets.js --env {env} --force
   ```

3. **Validate the manifest/assets inputs** — run the validation script as a consistency check
   before deployment:
   ```bash
   node scripts/validate-nft-assets.js --nft-assets nft-assets --env {env}
   ```
   Note: the current validator still checks the legacy flat layout under `nft-assets/metadata/`,
   `nft-assets/images/`, and `nft-assets/contract/`. It does **not** validate the generated
   chain-specific output under `nft-assets/{chainKey}/...`.

4. **Commit and push** — commit all generated files under `nft-assets/{chainKey}/` to the
   release branch. The `deploy-metadata` job in `release-deploy.yml` deploys them to Cloudflare
   Pages.

5. **Derive contract parameters** — the `deploy-metadata` job resolves the final `BASE_TOKEN_URI`
   and `CONTRACT_URI` from the Cloudflare Pages deployment and passes them as environment variable
   overrides to `deploy-contracts`:
   ```yaml
   Deployment__Nft__BaseUri:             https://nft.tricksfor.com/{chainKey}/metadata/
   Deployment__Nft__ContractMetadataUri: https://nft.tricksfor.com/{chainKey}/contract/collection.json
   ```

The contract is always deployed with the URLs that are live on Cloudflare Pages, ensuring
on-chain URIs and hosted metadata are consistent from the moment the contract is deployed.

### Pre-commit checklist

Before committing generated files for a release:

- [ ] `node scripts/validate-nft-assets.js --env {env}` passes with no errors
- [ ] All 600 token metadata files exist under `nft-assets/{chainKey}/metadata/`
- [ ] `nft-assets/{chainKey}/contract/collection.json` exists and `fee_recipient` is correct
- [ ] All 600 per-token images exist under `nft-assets/{chainKey}/images/`
- [ ] `nft-assets/{chainKey}/images/collection.png` exists
- [ ] `baseImageUri` and `baseMetadataUri` in the manifest point to the correct chain-specific paths

---

## 8. Multi-Chain Deployment

Each supported chain deployment generates its own output tree inside `nft-assets/`. All chains
share a single Cloudflare Pages project per environment tier; chain separation is achieved
through the per-chain subdirectory path prefix.

| Environment tier | Pages project | Domain | Chains served |
|---|---|---|---|
| All mainnet | `tricksfor-nft` | `nft.tricksfor.com` | `ethereum`, `polygon`, `optimism`, `bsc`, `avalanche` |
| All testnet | `tricksfor-nft-preview` | `nft-preview.tricksfor.com` | Same |

To generate output for multiple chains in one repo state:

```bash
node scripts/generate-nft-assets.js --env ethereum-mainnet  --force
node scripts/generate-nft-assets.js --env polygon-mainnet   --force
node scripts/generate-nft-assets.js --env bsc-mainnet       --force
```

Each run writes to `nft-assets/{chainKey}/` without affecting other chains.

### Determinism guarantee

The output is deterministic: the same manifest always produces the same set of files with
the same content. Generation can be re-run at any time to regenerate or verify files. Use
`--force` to overwrite existing files.

---

## 9. Related Documents

| Document | Description |
|---|---|
| [`docs/nft-asset-manifest-spec.md`](nft-asset-manifest-spec.md) | Manifest format, field reference, and validation rules |
| [`docs/nft-assets-spec.md`](nft-assets-spec.md) | Asset taxonomy, token ID mapping, and static file layout |
| [`docs/nft-metadata-schema.md`](nft-metadata-schema.md) | Token metadata attribute schema and valid values |
| [`docs/nft-token-allocation-spec.md`](nft-token-allocation-spec.md) | Token ID allocation rules (theme ranges, tier distribution) |
| [`docs/nft-asset-validation.md`](nft-asset-validation.md) | Validation script documentation |
| [`docs/nft-copy-spec.md`](nft-copy-spec.md) | Collection names, token names, and description templates |
| [`docs/cloudflare-pages-setup.md`](cloudflare-pages-setup.md) | Cloudflare Pages project configuration |
| [`docs/release-deployment-architecture.md`](release-deployment-architecture.md) | Full release pipeline architecture |
| [`nft-assets/README.md`](../nft-assets/README.md) | nft-assets directory overview |
