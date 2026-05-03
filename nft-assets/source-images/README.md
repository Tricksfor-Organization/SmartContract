# NFT Source Images

This directory contains the source image files used as the visual basis for all Tricksfor Booster
NFT tokens. Each file is copied (one copy per token ID) by the metadata generation pipeline into
the per-chain `images/` output directory.

---

## Directory layout

```
nft-assets/source-images/
  coin/        ← Coin theme (6 files)
  dice/        ← Dice theme (18 files)
  rps/         ← Rock Paper Scissors theme (9 files)
```

## File naming

All source images follow the pattern:

```
nft-assets/source-images/{theme}/{variant}-{tier}.png
```

The relative path `{theme}/{variant}-{tier}.png` is the value stored in the `sourceImage` field
of every manifest token entry. See [`docs/nft-image-naming-spec.md`](../../docs/nft-image-naming-spec.md)
for the full specification.

---

## Placeholder status

The 33 PNG files currently present are **1×1 pixel grey placeholders**. They exist to:

- satisfy the expected file structure referenced by manifests and validation scripts
- allow the metadata generation pipeline (`node scripts/generate-nft-assets.js`) to run in
  non-dry-run mode without failing on missing source images
- give asset artists a concrete file list to replace with final artwork

**No placeholder file should be deployed or minted against.** Replace every file with final
production artwork before running a live minting or deployment operation.

---

## Replacing a placeholder with final artwork

1. Replace the file **in place** at `nft-assets/source-images/{theme}/{variant}-{tier}.png`.
   The file name must not change.
2. Re-run the metadata generation pipeline to propagate the updated image to all per-token image
   files that reference this source:
   ```
   node scripts/generate-nft-assets.js --env <env>
   ```
3. Do **not** change the `sourceImage` field in any manifest — the logical assignment of source
   image to token is stable once minting begins.

---

## All 33 expected source image files

### Coin — 6 files (`coin/`)

| File              | `sourceImage` manifest field |
|-------------------|------------------------------|
| `heads-2x.png`    | `coin/heads-2x.png`          |
| `heads-3x.png`    | `coin/heads-3x.png`          |
| `heads-5x.png`    | `coin/heads-5x.png`          |
| `tails-2x.png`    | `coin/tails-2x.png`          |
| `tails-3x.png`    | `coin/tails-3x.png`          |
| `tails-5x.png`    | `coin/tails-5x.png`          |

### Dice — 18 files (`dice/`)

| File        | `sourceImage` manifest field |
|-------------|------------------------------|
| `1-2x.png`  | `dice/1-2x.png`              |
| `1-3x.png`  | `dice/1-3x.png`              |
| `1-5x.png`  | `dice/1-5x.png`              |
| `2-2x.png`  | `dice/2-2x.png`              |
| `2-3x.png`  | `dice/2-3x.png`              |
| `2-5x.png`  | `dice/2-5x.png`              |
| `3-2x.png`  | `dice/3-2x.png`              |
| `3-3x.png`  | `dice/3-3x.png`              |
| `3-5x.png`  | `dice/3-5x.png`              |
| `4-2x.png`  | `dice/4-2x.png`              |
| `4-3x.png`  | `dice/4-3x.png`              |
| `4-5x.png`  | `dice/4-5x.png`              |
| `5-2x.png`  | `dice/5-2x.png`              |
| `5-3x.png`  | `dice/5-3x.png`              |
| `5-5x.png`  | `dice/5-5x.png`              |
| `6-2x.png`  | `dice/6-2x.png`              |
| `6-3x.png`  | `dice/6-3x.png`              |
| `6-5x.png`  | `dice/6-5x.png`              |

### Rock Paper Scissors — 9 files (`rps/`)

| File              | `sourceImage` manifest field |
|-------------------|------------------------------|
| `rock-2x.png`     | `rps/rock-2x.png`            |
| `rock-3x.png`     | `rps/rock-3x.png`            |
| `rock-5x.png`     | `rps/rock-5x.png`            |
| `paper-2x.png`    | `rps/paper-2x.png`           |
| `paper-3x.png`    | `rps/paper-3x.png`           |
| `paper-5x.png`    | `rps/paper-5x.png`           |
| `scissors-2x.png` | `rps/scissors-2x.png`        |
| `scissors-3x.png` | `rps/scissors-3x.png`        |
| `scissors-5x.png` | `rps/scissors-5x.png`        |
