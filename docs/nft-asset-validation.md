# NFT Asset Validation

This document describes the `validate-nft-assets.js` script that runs before every Cloudflare
Pages deployment to ensure NFT metadata files, image references, and collection metadata are
correct. Validation errors fail the release workflow before any assets are deployed.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Running the Validator Locally](#2-running-the-validator-locally)
3. [Checks Performed](#3-checks-performed)
4. [Exit Codes and Output](#4-exit-codes-and-output)
5. [Example Failure Output](#5-example-failure-output)
6. [Workflow Integration](#6-workflow-integration)
7. [How to Fix Common Errors](#7-how-to-fix-common-errors)

---

## 1. Overview

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
| Source images | All `sourceImage` files referenced by the manifest exist in `images/source/` |

The validator distinguishes between **authoritative manifests** (stored in
`deployments/config/{env}/nft-manifest.json`) and **sample manifests** (files that contain
a `_note` field, such as those in `nft-assets/manifests/`). Full structural validation and
manifest-to-output consistency checks run only on authoritative manifests.

---

## 2. Running the Validator Locally

```bash
# Validate nft-assets/ without a manifest (checks collection + existing metadata/images)
npm run validate:assets

# Validate against an environment's authoritative manifest
npm run validate:assets -- --env ethereum-mainnet
npm run validate:assets -- --env polygon-amoy

# Validate against an explicit manifest path
npm run validate:assets -- --manifest deployments/config/polygon-mainnet/nft-manifest.json

# Validate a custom nft-assets directory
npm run validate:assets -- --nft-assets /path/to/nft-assets --env ethereum-mainnet
```

The script uses only Node.js built-ins — no `npm install` is required to run it.

---

## 3. Checks Performed

### 3.1 Collection metadata

**File:** `nft-assets/contract/collection.json`

Checks:
- File exists (this is the target of `contractURI()` in the deployed contract).
- `name` is present and non-empty.
- `description` is present and non-empty.
- `image` is present, non-empty, and an HTTPS URL.

### 3.2 Token metadata files

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

### 3.3 Token image files

For every valid token ID found in the metadata directory, the script checks that
`nft-assets/images/{tokenId}.png` exists.

### 3.4 Manifest structure (authoritative manifests only)

When an authoritative manifest is found (no `_note` field), the following rules from
[`docs/nft-asset-manifest-spec.md` §9](nft-asset-manifest-spec.md#9-validation-rules) are checked:

| Rule | Check |
|---|---|
| 1 | `manifestVersion` is `"1.0"` |
| 2 | `chain`, `chainKey`, `network` are present; `network` starts with `{chainKey}-` |
| 3 | `supply.total` equals `supply.coin + supply.dice + supply.rps` |
| 4 | Token IDs are sequential starting from `1` with no gaps or duplicates |
| 5 | Theme grouping order is coin → dice → rps |
| 6 | Token count per theme matches declared `supply.{theme}` |
| 7 | `theme` is one of `coin`, `dice`, `rps` |
| 8 | `variant` is valid for its `theme` |
| 9 | `tier` is one of `2x`, `3x`, `5x` |
| 10 | `sourceImage` matches `{theme}-{variant}-{tier}.png` |
| 11 | `imagePath` equals `images/{tokenId}.png` |
| 12 | `metadataPath` equals `metadata/{tokenId}.json` |
| 14 | All `sourceImage` files exist in `nft-assets/images/source/` |

> **Note:** Rule 13 (`displayName` matches the token name convention) is not checked by the
> validator — it is validated at generation time by the metadata generation tooling.

### 3.5 Manifest-to-output consistency (authoritative manifests only)

For every token entry in the manifest:
- `nft-assets/metadata/{tokenId}.json` must exist.
- `nft-assets/images/{tokenId}.png` must exist.

---

## 4. Exit Codes and Output

| Exit code | Meaning |
|---|---|
| `0` | All checks passed (warnings are non-fatal) |
| `1` | One or more validation errors |

The script prints a structured summary at the end of its run:

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

## 5. Example Failure Output

### Missing required metadata field

```
--- Token metadata ---
  ✗ metadata/42.json: missing required field "description"
  ✗ metadata/42.json: invalid "Game" value "CoinX"; expected one of: Coin, Dice, Rock Paper Scissors
  ✗ metadata/42.json: "Booster" ("2x Booster") and "Multiplier" ("3x") are inconsistent; expected Multiplier "2x"
```

### Missing image file

```
--- Token images ---
  ✗ images/7.png: file not found (required for token 7)
```

### Manifest-to-output mismatch

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

---

## 6. Workflow Integration

The validator runs as the `validate-assets` job in `.github/workflows/release-deploy.yml`,
between the `test` job and the `deploy-metadata` job. The job graph is:

```
resolve-environment
  └── test
        └── validate-assets      ← validates nft-assets/ and optional manifest
              └── deploy-metadata  ← deploys to Cloudflare Pages only if validation passes
                    └── deploy-contracts
```

The `validate-assets` job does **not** require environment secrets — it reads only files
committed to the repository and the `deploy_env` output from `resolve-environment` (used to
locate the authoritative manifest at `deployments/config/{env}/nft-manifest.json`).

If `validate-assets` fails:
- `deploy-metadata` is skipped.
- `deploy-contracts` is skipped.
- No assets are deployed; no contracts are deployed.

---

## 7. How to Fix Common Errors

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
`images/source/` to `images/{id}.png`) or add the missing file.

### `manifest token {id}: metadata/{id}.json does not exist`

The authoritative manifest lists token `{id}` but the generated metadata file is missing.
Run the metadata generation step to produce the missing file.

### `{manifest}: supply.total does not equal coin + dice + rps`

The `supply` object fields are inconsistent. Ensure `supply.total` equals the sum of
`supply.coin + supply.dice + supply.rps`.

### `{manifest}: token IDs are not sequential starting from 1`

Token IDs in the manifest must be sequential integers starting at `1` with no gaps or
duplicates. Re-generate or fix the manifest's `tokens` array.

---

## Related Documents

| Document | Description |
|---|---|
| [`docs/nft-asset-manifest-spec.md`](nft-asset-manifest-spec.md) | Full manifest format specification and all validation rules |
| [`docs/nft-metadata-schema.md`](nft-metadata-schema.md) | Token metadata attribute schema, valid values, and examples |
| [`docs/nft-assets-spec.md`](nft-assets-spec.md) | Asset taxonomy, token ID mapping, and source image naming |
| [`nft-assets/README.md`](../nft-assets/README.md) | Static asset hosting structure and Cloudflare Pages URL conventions |
| [`docs/cloudflare-pages-setup.md`](cloudflare-pages-setup.md) | Cloudflare Pages setup and multi-chain deployment strategy |
| [`scripts/validate-nft-assets.js`](../scripts/validate-nft-assets.js) | The validation script itself |
