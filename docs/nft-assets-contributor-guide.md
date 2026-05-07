# NFT Assets Contributor Guide

This guide explains the end-to-end workflow for working with Tricksfor Booster NFT assets:
adding or replacing source images, updating manifests, regenerating metadata, validating
outputs, and preparing the final Cloudflare Pages output. Follow the steps here whenever you
modify anything under `nft-assets/` or `deployments/config/`.

---

## Table of Contents

1. [Source Images](#1-source-images)
2. [Manifests](#2-manifests)
3. [Generation](#3-generation)
4. [Validation](#4-validation)
5. [Cloudflare Pages Preparation](#5-cloudflare-pages-preparation)
6. [Release Integration](#6-release-integration)
7. [Quick Reference](#7-quick-reference)

---

## 1. Source Images

### Where source images live

All 33 canonical source PNG files are in:

```
nft-assets/source-images/
├── coin/        6 files  — 2 variants (heads, tails)  × 3 tiers (2x, 3x, 5x)
├── dice/        18 files — 6 variants (1–6)           × 3 tiers (2x, 3x, 5x)
└── rps/         9 files  — 3 variants (rock, paper, scissors) × 3 tiers (2x, 3x, 5x)
```

Each file is used as the visual basis for every token in that (theme × variant × tier) slot
across all chains. The generator copies each source image to
`nft-assets/{chainKey}/images/{tokenId}.png` during the release build.

### Naming rules

Source images follow the pattern:

```
nft-assets/source-images/{theme}/{variant}-{tier}.png
```

| Segment   | Rules | Examples |
|-----------|-------|---------|
| `{theme}` | Lowercase directory name | `coin`, `dice`, `rps` |
| `{variant}` | Lowercase, `a-z0-9` only | `heads`, `tails`, `1`–`6`, `rock`, `paper`, `scissors` |
| `{tier}` | Multiplier key only | `2x`, `3x`, `5x` |
| File Extension | `.png` only; no other formats | `heads-2x.png` |

Use only the canonical identifiers above. Do not use display-name forms (`2x-booster`),
ordinal labels (`tier1`), spaces, or uppercase letters.

The `sourceImage` field in every manifest token entry stores the relative path from
`nft-assets/source-images/`, i.e. `{theme}/{variant}-{tier}.png`.

### Adding or replacing a source image

**To add a new image** (e.g. updating artwork for an existing slot):

1. Prepare the replacement PNG at the correct dimensions and quality.
2. Place it at the exact path it replaces:
   ```
   nft-assets/source-images/{theme}/{variant}-{tier}.png
   ```
3. Commit the file. No manifest changes are required for a straight image replacement.
4. Run `npm run validate:assets -- --env {env}` (or `--manifest ...`) to confirm the file is
   found by the validator. Running without `--env`/`--manifest` skips source-image existence
   checks because those checks are driven by manifest `sourceImage` references.
5. Regenerate metadata with `--force` (see [§ 3](#3-generation)) to distribute the updated
   image across all token slots.

**Do not** rename an existing source image without also updating the `sourceImage` field in
every manifest token entry that references it and re-running validation.

All 33 source image slots must be present before running the release-pipeline generator
(`generate:assets`). Missing source images cause `validate-assets` to fail.

---

## 2. Manifests

### Where manifest files live

| Type | Location | Purpose |
|------|----------|---------|
| **Authoritative deployment manifest** | `deployments/config/{env}/nft-manifest.json` | Single source of truth for a live or planned deployment. Used by CI to generate and validate output. |
| **Full chain-wide sample** | `nft-assets/manifests/{chainKey}.sample.json` | Format reference containing all 600 tokens for one chain. No `_note` field — validators treat it as authoritative and run all consistency checks. Do not use as a deployment manifest; the `contract` address is the zero address. |
| **Theme excerpt sample** | `nft-assets/manifests/{chainKey}.{theme}.sample.json` | Narrow format example for a single theme (e.g. `ethereum.dice.sample.json`). Contains a `_note` field and fewer tokens than `supply.total`; validators skip sequential-ID, theme-grouping, and source-image checks for these files. |
| **Global template** | `nft-assets/manifests/global.sample.json` | Cross-chain template showing all 5 chains. |

For any real deployment, edit or create the authoritative manifest at
`deployments/config/{env}/nft-manifest.json`. Full chain-wide samples can be used as a
complete field-by-field format reference, but they use the zero contract address and must
not be deployed as-is.

### Manifest fields

#### Top-level fields

| Field | Required | Description |
|-------|----------|-------------|
| `manifestVersion` | ✅ | Always `"1.0"` |
| `chain` | ✅ | Display name, e.g. `"Polygon"` |
| `chainKey` | ✅ | Lowercase key used in directory and URL paths: `ethereum`, `polygon`, `bsc`, `avalanche`, `optimism` |
| `network` | ✅ | Deployment environment key matching `deployments/config/{env}`. Must start with `{chainKey}-`. |
| `contract` | ✅ | Deployed contract address (EIP-55 checksum form). Use the zero address before deployment. |
| `baseImageUri` | ✅ | Base URI for token images: `https://nft.tricksfor.com/{chainKey}/images/` |
| `baseMetadataUri` | ✅ | Base URI for token metadata: `https://nft.tricksfor.com/{chainKey}/metadata/` |
| `supply.total` | ✅ | Must equal `supply.coin + supply.dice + supply.rps` (always 600) |
| `tokens` | ✅ | Array of 600 token entries, one per token ID |

#### Per-token entry fields

| Field | Required | Description |
|-------|----------|-------------|
| `tokenId` | ✅ | On-chain token ID (sequential from `1`) |
| `displayName` | ✅ | Human-readable name: `Tricksfor {Game} {Option} {tier} Booster #{tokenId}` — becomes the `name` field in generated token metadata |
| `theme` | ✅ | `coin`, `dice`, or `rps` |
| `variant` | ✅ | Canonical variant key for the theme (see [§ 1](#1-source-images)) |
| `tier` | ✅ | `2x`, `3x`, or `5x` |
| `sourceImage` | ✅ | Relative path from `source-images/`: `{theme}/{variant}-{tier}.png` |
| `imagePath` | ✅ | Output path: `images/{tokenId}.png` |
| `metadataPath` | ✅ | Output path: `metadata/{tokenId}.json` |
| `name` | optional | Legacy alias for `displayName`; present in some sample manifests but not required by the spec |
| `description` | optional | Per-token description; falls back to `descriptionTemplate` if absent |
| `collectionName` | optional | Collection display name |
| `option` | optional | Display value of the variant (convenience field for generation scripts) |
| `multiplierDisplay` | optional | Display value of the tier multiplier (convenience field) |

### How to update a manifest safely

1. **Edit the authoritative manifest** at `deployments/config/{env}/nft-manifest.json`.
2. Keep token IDs sequential from `1` to `supply.total` with no gaps or duplicates.
3. Keep theme grouping order: all Coin tokens first (IDs 1–200), then Dice (201–400),
   then RPS (401–600).
4. Ensure `supply.total` equals `supply.coin + supply.dice + supply.rps`.
5. Run `npm run validate:assets -- --env {env}` to check the manifest structure and source
   images against `nft-assets/`. To also check the generated metadata output, run
   `npm run validate:output` separately (see [§ 4](#4-validation)). Fix any reported errors
   before proceeding.
6. Re-run generation if the manifest changes affect token metadata content
   (see [§ 3](#3-generation)).

**Never** manually edit generated files in `nft-assets/generated/` — they are overwritten on
every generation run. All meaningful changes belong in the manifest or source images.

---

## 3. Generation

There are two generation pathways. Choose the right one for your task.

### Pathway A — Standalone metadata generator (contributor workflow)

Use `generate-assets` (alias: `generate:metadata`) for local review, testing manifests, or
preparing the `nft-assets/generated/` directory for review or Cloudflare Pages deployment.
It does **not** require source images or a deployment manifest.

```bash
# Generate metadata for a single chain
npm run generate-assets -- --chain polygon

# Generate from a manifest file
npm run generate-assets -- --manifest nft-assets/manifests/polygon.sample.json

# Generate for all 5 mainnet chains at once
npm run generate-assets -- --all-mainnet --force

# Preview what would be written without creating files
npm run generate-assets -- --chain ethereum --dry-run

# Regenerate a single chain, overwriting existing output
npm run generate-assets -- --chain bsc --force
```

Output is written to `nft-assets/generated/{chainKey}/metadata/` and
`nft-assets/generated/{chainKey}/contract/`. The `_redirects` and `_headers` files are also
written so the directory is self-contained and directly deployable to Cloudflare Pages.

**Chain keys:** `ethereum`, `polygon`, `bsc`, `avalanche`, `optimism`

### Pathway B — Release-pipeline generator (manifest-driven, with images)

Use `generate:assets` for the release pipeline only. It reads an authoritative deployment
manifest and copies source images alongside the metadata.

```bash
# Generate from a deployment manifest
node scripts/generate-nft-assets.js --manifest deployments/config/ethereum-mainnet/nft-manifest.json

# Generate from an environment name (auto-locates the manifest)
node scripts/generate-nft-assets.js --env ethereum-mainnet

# Dry-run (preview what would be generated without writing files)
node scripts/generate-nft-assets.js --env ethereum-mainnet --dry-run

# Overwrite existing files
node scripts/generate-nft-assets.js --env ethereum-mainnet --force
```

This script writes to `nft-assets/{chainKey}/metadata/`, `nft-assets/{chainKey}/contract/`,
and `nft-assets/{chainKey}/images/`. It is used by CI automatically on release — you rarely
need to run it manually.

### Expected output locations

| Pathway | Metadata | Collection metadata | Images |
|---------|----------|---------------------|--------|
| A (standalone) | `nft-assets/generated/{chainKey}/metadata/{1-600}.json` | `nft-assets/generated/{chainKey}/contract/collection.json` | _(not generated)_ |
| B (release) | `nft-assets/{chainKey}/metadata/{1-600}.json` | `nft-assets/{chainKey}/contract/collection.json` | `nft-assets/{chainKey}/images/{1-600}.png` |

The standalone generator also writes:
- `nft-assets/generated/_redirects` — extensionless-to-.json rewrites
- `nft-assets/generated/_headers` — CORS and content-type headers

### Validation sample

A pre-built Coin theme sample for Ethereum (IDs 1–200) lives in `nft-assets/sample/`. Use it
to verify naming templates and the attribute schema without regenerating all 600 tokens.

```bash
# Regenerate the sample
npm run generate:sample
```

---

## 4. Validation

### Running the validators

Two validators must pass before any deployment.

#### validate-nft-assets.js — single-chain structure check

```bash
# Validate nft-assets/ without a manifest (structure and file naming only)
npm run validate:assets

# Validate against an environment's authoritative manifest
npm run validate:assets -- --env ethereum-mainnet
npm run validate:assets -- --env polygon-amoy

# Validate against an explicit manifest file
npm run validate:assets -- --manifest deployments/config/polygon-mainnet/nft-manifest.json
```

This validator checks collection metadata, token metadata fields, image files, manifest
structure, manifest-to-output consistency, and source image existence.

#### validate-nft-output.js — all-chain generated output check

```bash
# Validate all chains in nft-assets/generated/
npm run validate:output

# Validate a single chain only
npm run validate:output -- --chain ethereum

# Validate a custom output directory
npm run validate:output -- --output /path/to/generated
```

This validator checks token counts (exactly 600 per chain), token ID ranges (1–600 with no
gaps), theme allocation (IDs 1–200 = Coin, 201–400 = Dice, 401–600 = RPS), tier distribution,
option distribution, metadata completeness, and image URL patterns.

Both scripts use only Node.js built-ins — no `npm install` is required.

### Common failure cases and how to fix them

#### `contractURI target file not found: contract/collection.json`

The collection metadata file is missing. Regenerate it with `npm run generate-assets` or
`npm run generate:assets`, or create it manually following
[`docs/nft-metadata-schema.md`](nft-metadata-schema.md).

#### `metadata/{id}.json: missing required field "{field}"`

The token metadata file is missing one of `name`, `description`, `image`, or `attributes`.
Regenerate the affected chain's output. If the manifest is the source of bad data, fix the
manifest first.

#### `metadata/{id}.json: invalid "Game" value "{value}"`

Valid values are exactly `Coin`, `Dice`, and `Rock Paper Scissors` (case-sensitive). Correct
the manifest `theme` field for the affected token (or fix a bad template) and regenerate.

#### `metadata/{id}.json: "Booster" and "Multiplier" are inconsistent`

`Booster` and `Multiplier` attributes must be paired correctly:

| `Booster` value | Required `Multiplier` |
|-----------------|-----------------------|
| `2x Booster`    | `2x`                  |
| `3x Booster`    | `3x`                  |
| `5x Booster`    | `5x`                  |

Correct the manifest `tier` field and regenerate.

#### `images/{id}.png: file not found`

A metadata file exists for token `{id}` but the corresponding image does not. Copy the
appropriate source image from `nft-assets/source-images/{theme}/` to
`nft-assets/{chainKey}/images/{id}.png`, or run the full generation step.

#### `manifest token {id}: metadata/{id}.json does not exist`

The authoritative manifest lists token `{id}` but the generated file is absent. Regenerate
the chain's output:

```bash
node scripts/generate-nft-assets.js --env {env} --force
```

#### `[{chain}] Expected 600 token metadata files, found {n}`

The generated output is incomplete. Regenerate all chains:

```bash
npm run generate-assets -- --all-mainnet --force
```

Or regenerate a single chain:

```bash
npm run generate-assets -- --chain {chainKey} --force
```

#### `[{chain}] {Theme} {Tier} option "{opt}": expected {n}, got {m}`

The token distribution does not match the deterministic remainder-distribution rule. This
typically means generated files were manually edited or the wrong chain was generated into the
wrong directory. Regenerate cleanly:

```bash
npm run generate-assets -- --chain {chainKey} --force
```

#### `[{chain}] metadata/{id}.json: "image" must be "…{chain}…" (got: "…{other-chain}…")`

Metadata files from one chain were written into another chain's directory. Delete the affected
directory and regenerate:

```bash
npm run generate-assets -- --chain {chainKey} --force
```

#### `{manifest}: token IDs are not sequential starting from 1`

The manifest `tokens` array has gaps or duplicates. Fix the manifest so IDs start at 1 and
increase by 1 with no missing values. Run `npm run validate:assets -- --env {env}` to
confirm the fix.

### Snapshot tests

```bash
npm run test:snapshots
```

This runs `scripts/test-metadata-snapshots.js` to verify token metadata against committed
snapshots in `nft-assets/snapshots/`. Run this after any change to generation templates to
catch unintended output drift.

---

## 5. Cloudflare Pages Preparation

### Which output folder is deployable

There are two deployable outputs depending on the context:

**Contributor preview / standalone generator — `nft-assets/generated/`**

The `nft-assets/generated/` directory is self-contained and deployable to Cloudflare Pages
as-is. It contains its own `_redirects` and `_headers` files alongside the chain-specific
metadata trees (no images). Use this directory when setting up a preview Pages project or
reviewing generated output locally.

Set the build output directory to `nft-assets/generated/` for a contributor preview project.

**Release pipeline — `nft-assets/`**

The release workflow (`deploy-metadata` job) deploys the `nft-assets/` root directory, which
includes `nft-assets/_redirects`, `nft-assets/_headers`, and the per-chain trees
`nft-assets/{chainKey}/metadata/`, `nft-assets/{chainKey}/images/`, and
`nft-assets/{chainKey}/contract/` (populated by the `generate-nft-assets` job before
deployment). This is the production deployment path.

### How chain-specific paths are structured

Both deployment roots follow the same chain-subdirectory layout:

**`nft-assets/generated/`** (standalone/contributor preview):

```
nft-assets/generated/
├── _redirects
├── _headers
├── ethereum/
│   ├── metadata/          1.json ... 600.json
│   └── contract/
│       └── collection.json
├── polygon/
│   ├── metadata/
│   └── contract/
├── bsc/
├── avalanche/
└── optimism/
```

**`nft-assets/`** (release pipeline — includes images):

```
nft-assets/
├── _redirects
├── _headers
├── ethereum/
│   ├── metadata/          1.json ... 600.json
│   ├── images/            1.png ... 600.png
│   └── contract/
│       └── collection.json
├── polygon/
│   ├── metadata/
│   ├── images/
│   └── contract/
├── bsc/
├── avalanche/
└── optimism/
```

After deployment, assets are served at `https://nft.tricksfor.com/{chainKey}/...`.

The `_redirects` file rewrites extensionless requests to `.json` files so that
`tokenURI(id) = {baseURI}{id}` (no `.json` suffix) resolves correctly:

```
/ethereum/metadata/:id  ->  /ethereum/metadata/:id.json  (200)
/polygon/metadata/:id   ->  /polygon/metadata/:id.json   (200)
... (one rule per chain)
```

### How BASE_TOKEN_URI and CONTRACT_URI relate to generated output

| Chain | `BASE_TOKEN_URI` | `CONTRACT_URI` |
|-------|-----------------|----------------|
| Ethereum  | `https://nft.tricksfor.com/ethereum/metadata/`  | `https://nft.tricksfor.com/ethereum/contract/collection.json`  |
| Polygon   | `https://nft.tricksfor.com/polygon/metadata/`   | `https://nft.tricksfor.com/polygon/contract/collection.json`   |
| Optimism  | `https://nft.tricksfor.com/optimism/metadata/`  | `https://nft.tricksfor.com/optimism/contract/collection.json`  |
| BSC       | `https://nft.tricksfor.com/bsc/metadata/`       | `https://nft.tricksfor.com/bsc/contract/collection.json`       |
| Avalanche | `https://nft.tricksfor.com/avalanche/metadata/` | `https://nft.tricksfor.com/avalanche/contract/collection.json` |

- `BASE_TOKEN_URI` must end with a trailing slash. It is set in the contract via `setBaseURI`
  and is returned by `tokenURI(id)` as `{BASE_TOKEN_URI}{id}` (no `.json` suffix).
- `CONTRACT_URI` is set via `setContractURI` and returned by `contractURI()`. It points to the
  chain-specific `collection.json` file.

Both values are passed to the contract deployment as `Deployment__Nft__BaseUri` and
`Deployment__Nft__ContractMetadataUri`. The `generate-assets` command prints the exact values
at the end of each run:

```
BASE_TOKEN_URI : https://nft.tricksfor.com/polygon/metadata/
CONTRACT_URI   : https://nft.tricksfor.com/polygon/contract/collection.json
```

Use these printed values directly when configuring the contract deployment.

### Multi-chain setup

All chains share a single Cloudflare Pages project per environment tier:

| Environment tier | `CF_PAGES_PROJECT`      | `NFT_BASE_DOMAIN`           |
|------------------|-------------------------|-----------------------------|
| Mainnet          | `tricksfor-nft`         | `nft.tricksfor.com`         |
| Testnet/preview  | `tricksfor-nft-preview` | `nft-preview.tricksfor.com` |

Chain separation is achieved through the `/{chainKey}/` path prefix, not through separate
projects.

---

## 6. Release Integration

### How the asset pipeline ties into the release workflow

The release workflow (`release-deploy.yml`) enforces a strict job dependency chain:

```
resolve-environment
  └── test
        └── validate-assets            ← validates nft-assets/ and the deployment manifest
              └── validate-generated-output  ← validates all-chain counts and distribution
                    └── generate-nft-assets  ← generates chain-specific output tree
                          └── deploy-metadata  ← deploys nft-assets/ to Cloudflare Pages
                                └── deploy-contracts  ← deploys smart contracts
```

No step in this chain starts until all upstream steps succeed.

### What must succeed before smart contract deployment starts

The following must all pass before `deploy-contracts` runs:

1. **`test`** — all Hardhat tests pass.
2. **`validate-assets`** — `scripts/validate-nft-assets.js` exits 0 against the deployment
   manifest for the target environment.
3. **`validate-generated-output`** — `scripts/validate-nft-output.js` exits 0 against
   `nft-assets/generated/` across all chains.
4. **`generate-nft-assets`** — `scripts/generate-nft-assets.js --env {env} --force` completes
   without errors.
5. **`deploy-metadata`** — the generated asset tree is successfully deployed to Cloudflare Pages
   and live at `https://nft.tricksfor.com/{chainKey}/…`.

The contract deployment receives the `BASE_TOKEN_URI` and `CONTRACT_URI` values produced by
`generate-nft-assets`. These URLs are live on Cloudflare Pages by the time the contract is
deployed, ensuring the contract is initialised with URLs that already serve real content.

### What a contributor must do before opening a release PR

1. Ensure all source images are present in `nft-assets/source-images/`.
2. Ensure the authoritative manifest at `deployments/config/{env}/nft-manifest.json` is
   correct and complete.
3. Run `npm run validate:assets -- --env {env}` and resolve all errors.
4. Run `npm run generate-assets -- --all-mainnet --force` to regenerate
   `nft-assets/generated/`.
5. Run `npm run validate:output` and resolve all errors.
6. Run `npm run test:snapshots` to confirm no unexpected metadata drift.
7. Commit all changes (source images, manifest, generated output) in the same PR.

CI repeats steps 2–5 automatically on every release trigger. If CI validation fails, no
deployment occurs — the release must be fixed and re-triggered.

---

## 7. Quick Reference

### npm scripts

| Command | What it does |
|---------|-------------|
| `npm run generate-assets -- --chain {key}` | Generate metadata for one chain into `nft-assets/generated/` |
| `npm run generate-assets -- --all-mainnet --force` | Regenerate all 5 chains into `nft-assets/generated/` |
| `npm run generate-assets -- --chain {key} --dry-run` | Preview generation without writing files |
| `npm run generate:assets -- --env {env}` | Release-pipeline generator: generates with images from deployment manifest |
| `npm run validate:assets` | Validate `nft-assets/` structure (no manifest) |
| `npm run validate:assets -- --env {env}` | Validate against a deployment manifest |
| `npm run validate:output` | Validate all chains in `nft-assets/generated/` |
| `npm run validate:output -- --chain {key}` | Validate a single chain in `nft-assets/generated/` |
| `npm run generate:sample` | Regenerate the Coin/Ethereum validation sample |
| `npm run test:snapshots` | Run metadata snapshot tests |

### File locations at a glance

| What | Where |
|------|-------|
| Source images | `nft-assets/source-images/{theme}/{variant}-{tier}.png` |
| Sample manifests | `nft-assets/manifests/` |
| Authoritative deployment manifest | `deployments/config/{env}/nft-manifest.json` |
| Generated metadata (contributor/standalone) | `nft-assets/generated/{chainKey}/metadata/{id}.json` |
| Generated metadata (release pipeline) | `nft-assets/{chainKey}/metadata/{id}.json` |
| Collection metadata (contributor/standalone) | `nft-assets/generated/{chainKey}/contract/collection.json` |
| Collection metadata (release pipeline) | `nft-assets/{chainKey}/contract/collection.json` |
| Cloudflare Pages config (contributor/standalone) | `nft-assets/generated/_redirects`, `nft-assets/generated/_headers` |
| Cloudflare Pages config (release pipeline) | `nft-assets/_redirects`, `nft-assets/_headers` |

### Related documents

| Document | Description |
|----------|-------------|
| [`docs/nft-image-naming-spec.md`](nft-image-naming-spec.md) | Full source image naming rules and complete enumeration of all 33 files |
| [`docs/nft-asset-manifest-spec.md`](nft-asset-manifest-spec.md) | Complete manifest format specification and all validation rules |
| [`docs/nft-asset-validation.md`](nft-asset-validation.md) | Detailed validation script documentation and all error codes |
| [`docs/generate-assets.md`](generate-assets.md) | Full option reference and CI integration guide for `generate-assets` |
| [`docs/nft-metadata-generation.md`](nft-metadata-generation.md) | Full metadata generation guide covering both generation pathways |
| [`docs/nft-metadata-schema.md`](nft-metadata-schema.md) | Token metadata attribute schema, valid values, and examples |
| [`docs/nft-token-allocation-spec.md`](nft-token-allocation-spec.md) | Deterministic token ID allocation rules and distribution algorithm |
| [`docs/cloudflare-pages-setup.md`](cloudflare-pages-setup.md) | Cloudflare Pages project setup and GitHub Environment configuration |
| [`nft-assets/README.md`](../nft-assets/README.md) | `nft-assets/` directory structure and URL conventions |
