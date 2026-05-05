# generate-assets — NFT Metadata Generator

`generate-assets` is the primary command-line entry point for producing chain-specific NFT
token metadata and collection metadata from a manifest or built-in chain configuration.

Running `generate-assets` is the documented, repeatable way for contributors and CI to produce
the static asset tree deployed to Cloudflare Pages.

---

## Table of Contents

1. [Quick Start](#1-quick-start)
2. [Output Structure](#2-output-structure)
3. [Options Reference](#3-options-reference)
4. [Usage Examples](#4-usage-examples)
5. [Example Command Output](#5-example-command-output)
6. [Generated File Formats](#6-generated-file-formats)
7. [CI Integration](#7-ci-integration)
8. [Related Documents](#8-related-documents)

---

## 1. Quick Start

```bash
# Install dependencies (one-time)
npm install

# Generate metadata for a single chain
npm run generate-assets -- --chain polygon

# Generate from an approved manifest file
npm run generate-assets -- --manifest nft-assets/manifests/polygon.full.json

# Generate for all 5 mainnet chains at once
npm run generate-assets -- --all-mainnet --force

# Or invoke the script directly (equivalent)
node scripts/generate-nft-metadata.js --chain polygon
```

---

## 2. Output Structure

The command writes into `nft-assets/generated/` — a self-contained, Cloudflare Pages-deployable
directory:

```
nft-assets/generated/
├── _redirects                   Cloudflare Pages extensionless-to-.json rewrites
├── _headers                     Cloudflare Pages content-type and CORS headers
├── ethereum/
│   ├── metadata/
│   │   ├── 1.json               Token metadata — Coin / Heads / 2x (ID 1)
│   │   ├── 2.json
│   │   └── ... (600 files total)
│   └── contract/
│       └── collection.json      Collection metadata (contractURI target)
├── polygon/
│   ├── metadata/
│   └── contract/
│       └── collection.json
├── bsc/
├── avalanche/
└── optimism/
```

Each chain's output is independent. Multiple chains can coexist and are deployed under their
own path prefix by the shared Cloudflare Pages project.

---

## 3. Options Reference

| Option | Default | Description |
|---|---|---|
| `--chain <chainKey>` | — | Generate for a single chain: `ethereum`, `polygon`, `bsc`, `avalanche`, `optimism` |
| `--manifest <path>` | — | Load chain config from a manifest file; takes precedence over `--chain` |
| `--all-mainnet` | false | Generate for all 5 mainnet chains in one run |
| `--all` | false | Alias for `--all-mainnet` |
| `--output <path>` | `./nft-assets/generated` | Root directory for generated output |
| `--theme <themeId>` | — | Restrict to one theme: `coin`, `dice`, or `rps`; token IDs remain globally consistent |
| `--dry-run` | false | Print what would be written without creating any files |
| `--force` | false | Overwrite existing output files (default: error if files exist) |

One of `--chain`, `--manifest`, or `--all-mainnet` / `--all` is required.

### Exit codes

| Code | Meaning |
|---|---|
| 0 | Generation completed successfully |
| 1 | One or more errors prevented generation |

---

## 4. Usage Examples

### Generate for one chain

```bash
npm run generate-assets -- --chain polygon
```

Writes 600 token metadata files and `collection.json` to `nft-assets/generated/polygon/`.

### Generate from a manifest file

```bash
npm run generate-assets -- --manifest nft-assets/manifests/polygon.full.json
```

Reads chain identity (`chainKey`, `baseImageUri`) from the manifest and uses the built-in
token allocation rules to produce all 600 token metadata files.

```bash
npm run generate-assets -- --manifest deployments/config/ethereum-mainnet/nft-manifest.json
```

Works with any manifest file that conforms to `docs/nft-asset-manifest-spec.md`.

### Generate for all mainnet chains

```bash
npm run generate-assets -- --all-mainnet --force
```

Generates 600 metadata files per chain (3 000 total) across all 5 mainnet chains. `--force`
is required when output files already exist.

### Preview without writing files

```bash
npm run generate-assets -- --chain ethereum --dry-run
```

Prints the files that would be created without writing anything to disk.

### Regenerate a single chain (overwriting existing files)

```bash
npm run generate-assets -- --chain bsc --force
```

### Specify a custom output directory

```bash
npm run generate-assets -- --chain avalanche --output /tmp/preview-output --force
```

---

## 5. Example Command Output

Running `npm run generate-assets -- --chain polygon` produces:

```
Output root: /path/to/repo/nft-assets/generated
  ✓ wrote nft-assets/generated/_redirects
  ✓ wrote nft-assets/generated/_headers

Generating token metadata for chain: polygon (Polygon)
  Output: nft-assets/generated/polygon
  BASE_TOKEN_URI : https://nft.tricksfor.com/polygon/metadata/
  CONTRACT_URI   : https://nft.tricksfor.com/polygon/contract/collection.json
  ✓ wrote nft-assets/generated/polygon/metadata/1.json
  ✓ wrote nft-assets/generated/polygon/metadata/2.json
  ...
  ✓ wrote nft-assets/generated/polygon/metadata/600.json
  ✓ wrote nft-assets/generated/polygon/contract/collection.json
  Done. Generated 600 token metadata file(s) and collection.json.

Done. Generated metadata for 1 chain(s).
```

The printed `BASE_TOKEN_URI` and `CONTRACT_URI` values are the exact URLs that must be
passed to the contract deployment as `Deployment__Nft__BaseUri` and
`Deployment__Nft__ContractMetadataUri`.

---

## 6. Generated File Formats

### Token metadata — `{chain}/metadata/{tokenId}.json`

```json
{
  "name": "Tricksfor Coin Heads 2x Booster #1",
  "description": "A Tricksfor Coin Booster NFT for the Heads outcome. Stake this NFT to activate a 2x reward boost during eligible Tricksfor gameplay. An unstaked Booster confers no in-game advantage. Subject to platform rules.",
  "image": "https://nft.tricksfor.com/polygon/images/1.png",
  "external_url": "https://tricksfor.com/boosters/1",
  "attributes": [
    { "trait_type": "Game",       "value": "Coin"       },
    { "trait_type": "Option",     "value": "Heads"      },
    { "trait_type": "Booster",    "value": "2x Booster" },
    { "trait_type": "Multiplier", "value": "2x"         },
    { "trait_type": "Chain",      "value": "Polygon"    }
  ]
}
```

Token IDs 1–600 are deterministic and fixed across all chains:
- IDs 1–200: Coin theme
- IDs 201–400: Dice theme
- IDs 401–600: Rock Paper Scissors theme

### Collection metadata — `{chain}/contract/collection.json`

```json
{
  "name": "Tricksfor Boosters - Polygon",
  "description": "Tricksfor Booster NFTs are in-game items that activate a reward boost when staked. Stake your Booster to earn enhanced rewards during gameplay.",
  "image": "https://nft.tricksfor.com/polygon/images/collection.png",
  "external_link": "https://tricksfor.com/boosters",
  "seller_fee_basis_points": 500,
  "fee_recipient": "0x000000000000000000000000000000000000dEaD"
}
```

> **⚠ Important:** `fee_recipient` uses a placeholder burn address. Replace it with the actual
> royalty recipient address before mainnet deployment.

---

## 7. CI Integration

### Validating generated output in CI

The `validate-generated-output` job in `release-deploy.yml` validates the pre-committed
`nft-assets/generated/` content automatically on every release:

```yaml
- name: Validate generated NFT output
  run: node scripts/validate-nft-output.js
```

### Regenerating output in CI

To regenerate the `nft-assets/generated/` directory in a CI workflow, add a step such as:

```yaml
- name: Generate NFT metadata (all chains)
  run: npm run generate-assets -- --all-mainnet --force
```

Or for a single chain driven by a manifest committed to the repository:

```yaml
- name: Generate NFT metadata
  run: npm run generate-assets -- --manifest deployments/config/${{ env.DEPLOY_ENV }}/nft-manifest.json --force
```

### Release pipeline

The release pipeline (`release-deploy.yml`) uses `scripts/generate-nft-assets.js` for the
full manifest-driven release build (which also copies token images). The `generate-assets`
command produces the `nft-assets/generated/` metadata tree used for Cloudflare Pages and
contributor review.

For a full description of the release pipeline see
[`docs/release-deployment-architecture.md`](release-deployment-architecture.md).

---

## 8. Related Documents

| Document | Description |
|---|---|
| [`docs/nft-metadata-generation.md`](nft-metadata-generation.md) | Full metadata generation guide including both Pathway A (release) and Pathway B (standalone) |
| [`docs/nft-asset-manifest-spec.md`](nft-asset-manifest-spec.md) | Manifest format and field reference |
| [`docs/nft-metadata-schema.md`](nft-metadata-schema.md) | Token metadata attribute schema and valid values |
| [`docs/nft-token-allocation-spec.md`](nft-token-allocation-spec.md) | Token ID allocation rules (theme ranges, tier distribution) |
| [`docs/nft-asset-validation.md`](nft-asset-validation.md) | Validation script documentation |
| [`nft-assets/README.md`](../nft-assets/README.md) | nft-assets directory structure and URL conventions |
| [`nft-assets/manifests/`](../nft-assets/manifests/) | Sample and approved manifest files |
