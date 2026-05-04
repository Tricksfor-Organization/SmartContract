# NFT Asset Validation

This document describes the two validation scripts that run before every Cloudflare
Pages deployment to ensure NFT metadata files, image references, collection metadata,
and distribution counts are correct. Validation errors fail the release workflow before
any assets are deployed.

- **`validate-nft-assets.js`** — validates a single chain's asset directory against an
  authoritative deployment manifest (structure, file existence, manifest consistency).
- **`validate-nft-output.js`** — validates the entire `nft-assets/generated/` output
  across all supported chains (supply totals, tier distribution, option distribution,
  token ID ranges, metadata completeness, image URL patterns).

---

## Table of Contents

1. [Overview — validate-nft-assets.js](#1-overview--validate-nft-assetsjs)
2. [Overview — validate-nft-output.js](#2-overview--validate-nft-outputjs)
3. [Running the Validators Locally](#3-running-the-validators-locally)
4. [Checks Performed — validate-nft-assets.js](#4-checks-performed--validate-nft-assetsjs)
5. [Checks Performed — validate-nft-output.js](#5-checks-performed--validate-nft-outputjs)
6. [Exit Codes and Output](#6-exit-codes-and-output)
7. [Example Failure Output](#7-example-failure-output)
8. [Workflow Integration](#8-workflow-integration)
9. [How to Fix Common Errors](#9-how-to-fix-common-errors)

---

## 1. Overview — validate-nft-assets.js

The script `scripts/validate-nft-assets.js` validates the NFT static asset set before it is
deployed to Cloudflare Pages.

It checks:

| Category | What is checked |
|---|---|
| Collection metadata | `nft-assets/contract/collection.json` exists and contains `name`, `description`, `image` |
| Token metadata files | Each `nft-assets/metadata/{id}.json` has required fields and valid attribute values |
| Token image files | `nft-assets/images/{id}.png` exists for every token metadata file |
| File naming | Metadata files are named `{integer}.json`; image files are named `{integer}.png` |
| Attribute vocabulary | `Game`, `Option`, `Booster`, `Multiplier` values match the approved schema |
| Token ID uniqueness | No duplicate token IDs exist in the metadata directory |
| Manifest structure | If an authoritative manifest is found, its fields and supply totals are validated |
| Manifest consistency | All tokens referenced in the manifest have corresponding metadata and image files |
| Source images | All `sourceImage` files referenced by the manifest exist in `source-images/{theme}/` |

The validator distinguishes between **authoritative manifests** (stored in
`deployments/config/{env}/nft-manifest.json`) and **sample/excerpt manifests**. A manifest is
treated as a sample/excerpt if it contains a `_note` field (such as those in
`nft-assets/manifests/`) or if its number of token entries is less than `supply.total`
(`tokenCount < supply.total`). Full structural validation and manifest-to-output consistency
checks (spec §9 rules 4–6 and 11–14) run only on authoritative manifests; those checks are
skipped for sample/excerpt manifests in either case.

---

## 2. Overview — validate-nft-output.js

The script `scripts/validate-nft-output.js` validates the generated NFT metadata output in
`nft-assets/generated/` across all supported chains. It enforces the deterministic distribution
rules from [`docs/nft-token-allocation-spec.md`](nft-token-allocation-spec.md) and is designed
to catch generation errors before any deployment.

It checks (per chain):

| Category | What is checked |
|---|---|
| Collection metadata | `contract/collection.json` exists and contains `name`, `description`, `image` |
| Token count | Exactly 600 token metadata files exist |
| Token ID uniqueness | No duplicate token IDs within the chain's metadata directory |
| Token ID range | IDs span exactly 1–600 with no gaps |
| Theme allocation ranges | IDs 1–200 = Coin, 201–400 = Dice, 401–600 = RPS |
| Per-theme counts | Coin=200, Dice=200, RPS=200 |
| Per-tier counts | 2x Booster=100, 3x Booster=70, 5x Booster=30 (per theme) |
| Per-option counts | Exact expected counts from the remainder-distribution algorithm |
| Metadata completeness | Each token has `name`, `description`, `image`, `attributes` |
| Image URL pattern | `image` is `https://nft.tricksfor.com/{chainKey}/images/{tokenId}.png` |

### Expected per-option counts

Counts are derived from the deterministic remainder-distribution algorithm
(`base = floor(tierCount / optionCount)`, first `r` options get `base + 1`):

| Theme | Tier | Option counts (canonical order) |
|---|---|---|
| Coin (2 opts) | 2x Booster (100) | Heads=50, Tails=50 |
| Coin (2 opts) | 3x Booster (70) | Heads=35, Tails=35 |
| Coin (2 opts) | 5x Booster (30) | Heads=15, Tails=15 |
| Dice (6 opts) | 2x Booster (100) | 1=17, 2=17, 3=17, 4=17, 5=16, 6=16 |
| Dice (6 opts) | 3x Booster (70) | 1=12, 2=12, 3=12, 4=12, 5=11, 6=11 |
| Dice (6 opts) | 5x Booster (30) | 1=5, 2=5, 3=5, 4=5, 5=5, 6=5 |
| RPS (3 opts) | 2x Booster (100) | Rock=34, Paper=33, Scissors=33 |
| RPS (3 opts) | 3x Booster (70) | Rock=24, Paper=23, Scissors=23 |
| RPS (3 opts) | 5x Booster (30) | Rock=10, Paper=10, Scissors=10 |

---

## 3. Running the Validators Locally

```bash
# validate-nft-assets.js — validate nft-assets/ without a manifest
npm run validate:assets

# Validate against an environment's authoritative manifest
npm run validate:assets -- --env ethereum-mainnet
npm run validate:assets -- --env polygon-amoy

# Validate against an explicit manifest path
npm run validate:assets -- --manifest deployments/config/polygon-mainnet/nft-manifest.json

# Validate a custom nft-assets directory
npm run validate:assets -- --nft-assets /path/to/nft-assets --env ethereum-mainnet
```

```bash
# validate-nft-output.js — validate all chains in nft-assets/generated/
npm run validate:output

# Validate a single chain only
npm run validate:output -- --chain ethereum

# Validate a custom output directory
npm run validate:output -- --output /path/to/generated
```

Both scripts use only Node.js built-ins — no `npm install` is required to run them.

---

## 4. Checks Performed — validate-nft-assets.js

### 4.1 Collection metadata

**File:** `nft-assets/contract/collection.json`

Checks:
- File exists (this is the target of `contractURI()` in the deployed contract).
- `name` is present and non-empty.
- `description` is present and non-empty.
- `image` is present, non-empty, and an HTTPS URL.

### 4.2 Token metadata files

**Directory:** `nft-assets/metadata/`

Each `{id}.json` file is checked for:

| Field | Check |
|---|---|
| `name` | Present and non-empty string |
| `description` | Present and non-empty string |
| `image` | Present, non-empty, HTTPS URL |
| `attributes` | Present, must be an array |
| `Game` attribute | Present; value must be `Coin`, `Dice`, or `Rock Paper Scissors` |
| `Option` attribute | Present; value must be valid for the declared `Game` |
| `Booster` attribute | Present; value must be `2x Booster`, `3x Booster`, or `5x Booster` |
| `Multiplier` attribute | Present; value must be `2x`, `3x`, or `5x` |
| `Booster` ↔ `Multiplier` pairing | Must be consistent (e.g. `2x Booster` with `2x`) |

**Valid `Option` values per `Game`:**

| `Game` | Valid `Option` values |
|---|---|
| `Coin` | `Heads`, `Tails` |
| `Dice` | `1`, `2`, `3`, `4`, `5`, `6` |
| `Rock Paper Scissors` | `Rock`, `Paper`, `Scissors` |

**File naming:** The file name must be `{tokenId}.json` where `{tokenId}` is a positive integer.

**Token ID uniqueness:** Duplicate token IDs across multiple files in the directory are an error.

If the metadata directory contains no `.json` files, the check emits a warning rather than an error
(the assets may not yet have been generated). The collection metadata check still runs.

### 4.3 Token image files

For every valid token ID found in the metadata directory, the script checks that
`nft-assets/images/{tokenId}.png` exists.

### 4.4 Manifest structure (authoritative manifests only)

When an authoritative manifest is found (no `_note` field), the following rules from
[`docs/nft-asset-manifest-spec.md` §9](nft-asset-manifest-spec.md#9-validation-rules) are checked:

| Rule | Check |
|---|---|
| 1 | `manifestVersion` is `"1.0"` |
| 2 | `contract` is present and a `0x`-prefixed 40-hex-character address; `chain`, `chainKey`, `network` are present; `network` starts with `{chainKey}-` |
| 3 | `supply.total` equals `supply.coin + supply.dice + supply.rps` |
| 4 | Token IDs are sequential starting from `1` with no gaps or duplicates (**skipped for excerpt manifests**) |
| 5 | Theme grouping order is coin → dice → rps (**skipped for excerpt manifests**) |
| 6 | Token count per theme matches declared `supply.{theme}` (**skipped for excerpt manifests**) |
| 7 | `theme` is one of `coin`, `dice`, `rps` |
| 8 | `variant` is valid for its `theme` |
| 9 | `tier` is one of `2x`, `3x`, `5x` |
| 10 | `sourceImage` matches `{theme}/{variant}-{tier}.png` |
| 11 | `imagePath` equals `images/{tokenId}.png` (**skipped for excerpt manifests**) |
| 12 | `metadataPath` equals `metadata/{tokenId}.json` (**skipped for excerpt manifests**) |
| 13 | `displayName` matches the token name convention: `Tricksfor {Game} {Option} {tier} Booster #{tokenId}` (**skipped for excerpt manifests**) |
| 14 | All `sourceImage` files exist in `nft-assets/source-images/{theme}/` (**skipped for excerpt manifests**) |

### 4.5 Manifest-to-output consistency (authoritative manifests only)

For every token entry in the manifest:
- `nft-assets/metadata/{tokenId}.json` must exist.
- `nft-assets/images/{tokenId}.png` must exist.

---

## 5. Checks Performed — validate-nft-output.js

The script iterates over all supported chains (`ethereum`, `polygon`, `bsc`, `avalanche`,
`optimism`) in `nft-assets/generated/` and runs the following checks for each.

### 5.1 Collection metadata

**File:** `{chain}/contract/collection.json`

Checks:
- File exists.
- `name`, `description`, `image` are present and non-empty strings.

### 5.2 Token count

**Directory:** `{chain}/metadata/`

Exactly **600** `.json` files must exist.

### 5.3 Token ID uniqueness and range

- No duplicate token IDs.
- IDs span exactly `1–600` with no gaps (every integer 1–600 has a corresponding file).

### 5.4 Theme allocation ranges

Token IDs must align with the fixed theme ranges:

| Token ID range | Theme |
|---|---|
| 1–200 | Coin |
| 201–400 | Dice |
| 401–600 | Rock Paper Scissors |

A token whose `Game` attribute does not match its file's ID range is an error.

### 5.5 Per-theme counts

Each theme must have exactly **200** tokens.

### 5.6 Per-tier counts

Within each theme, tiers must have the following token counts:

| Tier | Count per theme |
|---|---|
| `2x Booster` | 100 |
| `3x Booster` | 70 |
| `5x Booster` | 30 |

### 5.7 Per-option counts

Within each (theme, tier) block, option counts follow the remainder-distribution rule.
See the expected counts table in [§ 2](#2-overview--validate-nft-outputjs).

### 5.8 Metadata completeness

Each token file must contain:
- `name` — non-empty string
- `description` — non-empty string
- `image` — non-empty string
- `attributes` — non-empty array

Required attributes: `Game`, `Option`, `Booster`.

### 5.9 Image URL pattern

Each token's `image` field must match exactly:

```
https://nft.tricksfor.com/{chainKey}/images/{tokenId}.png
```

---

## 6. Exit Codes and Output

| Exit code | Meaning |
|---|---|
| `0` | All checks passed (warnings are non-fatal) |
| `1` | One or more validation errors |

The scripts print a structured summary at the end of their run:

```
============================================================
Validation Summary
============================================================
  Checks passed:  N
  Warnings:       N
  Errors:         N
```

Warnings (⚠) are informational — for example, when no metadata files exist yet because the
generation step has not been run. They do not cause a non-zero exit code.

Errors (✗) cause exit code `1` and block the release workflow.

---

## 7. Example Failure Output

### Missing required metadata field (validate-nft-assets.js)

```
--- Token metadata ---
  ✗ metadata/42.json: missing required field "description"
  ✗ metadata/42.json: invalid "Game" value "CoinX"; expected one of: Coin, Dice, Rock Paper Scissors
  ✗ metadata/42.json: "Booster" ("2x Booster") and "Multiplier" ("3x") are inconsistent; expected Multiplier "2x"
```

### Missing image file (validate-nft-assets.js)

```
--- Token images ---
  ✗ images/7.png: file not found (required for token 7)
```

### Manifest-to-output mismatch (validate-nft-assets.js)

```
--- Manifest-to-output consistency ---
  ✗ manifest token 123: metadata/123.json does not exist
  ✗ manifest token 123: images/123.png does not exist
```

### Missing collection metadata

```
--- Collection metadata ---
  ✗ contractURI target file not found: contract/collection.json
```

### Wrong token count (validate-nft-output.js)

```
  ✗ [polygon] Expected 600 token metadata files, found 598
```

### Option distribution mismatch (validate-nft-output.js)

```
  ✗ [bsc] Dice 2x Booster option "1": expected 17, got 16
  ✗ [bsc] Dice 2x Booster option "4": expected 17, got 18
```

### Image URL mismatch (validate-nft-output.js)

```
  ✗ [avalanche] metadata/1.json: "image" must be "https://nft.tricksfor.com/avalanche/images/1.png" (got: "https://nft.tricksfor.com/ethereum/images/1.png")
```

---

## 8. Workflow Integration

Both validators run as jobs in `.github/workflows/release-deploy.yml`, before any deployment.
The job graph is:

```
resolve-environment
  └── test
        └── validate-assets            ← validates nft-assets/ and optional manifest
              └── validate-generated-output  ← validates all-chain counts and distribution
                    └── generate-nft-assets  ← generates chain-specific output
                          └── deploy-metadata  ← deploys to Cloudflare Pages only if validation passes
                                └── deploy-contracts
```

Neither validation job requires environment secrets — they read only files committed to the
repository (and the `deploy_env` output from `resolve-environment` for `validate-assets`).

If `validate-assets` or `validate-generated-output` fails:
- `generate-nft-assets` is skipped.
- `deploy-metadata` is skipped.
- `deploy-contracts` is skipped.
- No assets are deployed; no contracts are deployed.

---

## 9. How to Fix Common Errors

### `contractURI target file not found: contract/collection.json`

The collection metadata file is missing. Create `nft-assets/contract/collection.json` following
the format in [`docs/nft-metadata-schema.md`](nft-metadata-schema.md#cloudflare-pages-url-model).
See [`nft-assets/contract/collection.json`](../nft-assets/contract/collection.json) for the
current file.

### `metadata/{id}.json: missing required field "{field}"`

The token metadata file is missing one of the four required top-level fields (`name`,
`description`, `image`, `attributes`). Add the missing field following the format in
[`docs/nft-metadata-schema.md`](nft-metadata-schema.md#example-token-metadata-json).

### `metadata/{id}.json: invalid "Game" value "{value}"`

The `Game` attribute contains an unsupported value. Valid values are exactly `Coin`, `Dice`,
and `Rock Paper Scissors` (case-sensitive).

### `metadata/{id}.json: "Booster" and "Multiplier" are inconsistent`

The `Booster` and `Multiplier` attributes must be paired correctly:

| `Booster` | Required `Multiplier` |
|---|---|
| `2x Booster` | `2x` |
| `3x Booster` | `3x` |
| `5x Booster` | `5x` |

### `images/{id}.png: file not found`

The metadata file `metadata/{id}.json` exists but the corresponding image `images/{id}.png`
does not. Run the image generation step (copy the appropriate source image from
`source-images/{theme}/` to `images/{id}.png`) or add the missing file.

### `manifest token {id}: metadata/{id}.json does not exist`

The authoritative manifest lists token `{id}` but the generated metadata file is missing.
Run the metadata generation step to produce the missing file.

### `{manifest}: supply.total does not equal coin + dice + rps`

The `supply` object fields are inconsistent. Ensure `supply.total` equals the sum of
`supply.coin + supply.dice + supply.rps`.

### `{manifest}: token IDs are not sequential starting from 1`

Token IDs in the manifest must be sequential integers starting at `1` with no gaps or
duplicates. Re-generate or fix the manifest's `tokens` array.

### `[{chain}] Expected 600 token metadata files, found {n}` (validate-nft-output.js)

The generated output for this chain is incomplete. Run:

```bash
node scripts/generate-nft-metadata.js --chain <chainKey> --force
```

### `[{chain}] {Theme} {Tier} option "{opt}": expected {n}, got {m}` (validate-nft-output.js)

The generated metadata does not match the deterministic remainder-distribution rule. This
indicates a bug in the generation script or a manual edit to generated files. Re-run the
generation step:

```bash
node scripts/generate-nft-metadata.js --all-mainnet --force
```

### `[{chain}] metadata/{id}.json: "image" must be "{expected}"` (validate-nft-output.js)

The image URL in the token metadata does not match the expected chain-specific pattern.
This can happen if files were generated for the wrong chain or if a template was misconfigured.
Re-run the generation step for the affected chain.

---

## Related Documents

| Document | Description |
|---|---|
| [`docs/nft-asset-manifest-spec.md`](nft-asset-manifest-spec.md) | Full manifest format specification and all validation rules |
| [`docs/nft-metadata-schema.md`](nft-metadata-schema.md) | Token metadata attribute schema, valid values, and examples |
| [`docs/nft-token-allocation-spec.md`](nft-token-allocation-spec.md) | Deterministic token ID allocation rules and distribution algorithm |
| [`docs/nft-assets-spec.md`](nft-assets-spec.md) | Asset taxonomy, token ID mapping, and source image naming |
| [`nft-assets/README.md`](../nft-assets/README.md) | Static asset hosting structure and Cloudflare Pages URL conventions |
| [`docs/cloudflare-pages-setup.md`](cloudflare-pages-setup.md) | Cloudflare Pages setup and multi-chain deployment strategy |
| [`scripts/validate-nft-assets.js`](../scripts/validate-nft-assets.js) | Single-chain asset validator (structure, manifest, file existence) |
| [`scripts/validate-nft-output.js`](../scripts/validate-nft-output.js) | All-chain output validator (counts, distribution, image URLs) |
