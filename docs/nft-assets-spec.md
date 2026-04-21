# NFT Asset Taxonomy and Token ID Mapping Specification

This document is the source-of-truth for all Tricksfor Booster NFT asset naming, token ID
mapping, and static file layout rules. Metadata generation, image export, contract minting,
and downstream UI usage must all derive from this specification.

---

## 1. Collection Taxonomy

### 1.1 Game Themes

Three game themes are supported. The table below shows the canonical identifier used in file
names and directory paths alongside the display name used in token metadata attributes.

| Canonical identifier | Metadata display name   |
|----------------------|-------------------------|
| `coin`               | `"Coin"`                |
| `dice`               | `"Dice"`                |
| `rps`                | `"Rock Paper Scissors"` |

Use the canonical identifier everywhere files, directories, or scripts reference a theme by
name. Use the metadata display name only inside token metadata JSON attributes.

### 1.2 Image Variants per Theme

Each theme has a fixed set of image variants. The table below maps each variant to its canonical
identifier (used in file names) and its metadata display value (used in the `Option` attribute).

#### Coin

| Canonical identifier | Metadata `Option` value |
|----------------------|-------------------------|
| `heads`              | `"Heads"`               |
| `tails`              | `"Tails"`               |

#### Dice

| Canonical identifier | Metadata `Option` value |
|----------------------|-------------------------|
| `1`                  | `"1"`                   |
| `2`                  | `"2"`                   |
| `3`                  | `"3"`                   |
| `4`                  | `"4"`                   |
| `5`                  | `"5"`                   |
| `6`                  | `"6"`                   |

#### Rock Paper Scissors

| Canonical identifier | Metadata `Option` value |
|----------------------|-------------------------|
| `rock`               | `"Rock"`                |
| `paper`              | `"Paper"`               |
| `scissors`           | `"Scissors"`            |

### 1.3 Booster Tiers

Three booster tiers exist for every theme. The table below maps each tier's canonical identifier
to its metadata display values. Booster multiplier logic lives in the off-chain reward settlement
system; this repository uses tier names only for asset labelling.

| Canonical identifier | Metadata `Booster` value | Metadata `Multiplier` value |
|----------------------|--------------------------|-----------------------------|
| `2x`                 | `"2x Booster"`           | `"2x"`                      |
| `3x`                 | `"3x Booster"`           | `"3x"`                      |
| `5x`                 | `"5x Booster"`           | `"5x"`                      |

The canonical identifiers `2x`, `3x`, and `5x` are used in image source file names (see
§ 3) and in supply manifests (see § 6). Do not use ordinal labels such as `tier1` / `tier2` /
`tier3` — the multiplier values are the stable, unambiguous identifiers.

---

## 2. Distinct Image Asset Slots

Every unique combination of (theme, variant, tier) requires one distinct source image.

| Theme | Variant count | Tier count | Image slots |
|-------|--------------|------------|-------------|
| coin  | 2            | 3          | 6           |
| dice  | 6            | 3          | 18          |
| rps   | 3            | 3          | 9           |
| **Total** |          |            | **33**      |

All 33 slots must be filled before any metadata generation or contract minting run.

---

## 3. Image Source File Naming Convention

Source image files are named using the pattern:

```
{theme}-{variant}-{tier}.png
```

Where:
- `{theme}` is the canonical identifier from § 1.1 (`coin`, `dice`, `rps`)
- `{variant}` is the canonical identifier from § 1.2 (`heads`, `tails`, `1`–`6`, `rock`, `paper`, `scissors`)
- `{tier}` is the canonical identifier from § 1.3 (`2x`, `3x`, `5x`)

### Full enumeration of all 33 source image file names

#### Coin (6 files)

```
coin-heads-2x.png
coin-heads-3x.png
coin-heads-5x.png
coin-tails-2x.png
coin-tails-3x.png
coin-tails-5x.png
```

#### Dice (18 files)

```
dice-1-2x.png
dice-1-3x.png
dice-1-5x.png
dice-2-2x.png
dice-2-3x.png
dice-2-5x.png
dice-3-2x.png
dice-3-3x.png
dice-3-5x.png
dice-4-2x.png
dice-4-3x.png
dice-4-5x.png
dice-5-2x.png
dice-5-3x.png
dice-5-5x.png
dice-6-2x.png
dice-6-3x.png
dice-6-5x.png
```

#### Rock Paper Scissors (9 files)

```
rps-rock-2x.png
rps-rock-3x.png
rps-rock-5x.png
rps-paper-2x.png
rps-paper-3x.png
rps-paper-5x.png
rps-scissors-2x.png
rps-scissors-3x.png
rps-scissors-5x.png
```

---

## 4. Static File Layout

### 4.1 Chain Separation

Each supported blockchain has its own smart contract deployment and its own collection contract.
Metadata and image files are organised into **per-chain subdirectories** within `nft-assets/`,
one directory per chain. This allows each chain deployment to have its own collection metadata
and chain-specific image and metadata URLs, while all chains share a single Cloudflare Pages
project per environment tier.

Token ID `1` on Ethereum and token ID `1` on Polygon are separate NFTs with separate metadata
files at different paths. The per-chain distinction is recorded in the supply manifest (see § 6)
and is reflected in the token metadata via the `Chain` attribute
(see [`docs/nft-metadata-schema.md`](nft-metadata-schema.md)).

| Deployment type | Cloudflare Pages project  | Domain                       |
|-----------------|---------------------------|------------------------------|
| All mainnet     | `tricksfor-nft`           | `nft.tricksfor.com`          |
| All testnet     | `tricksfor-nft-preview`   | `nft-preview.tricksfor.com`  |

Chain separation is achieved through path prefixes within the shared project. Each chain's
`BASE_TOKEN_URI` includes the chain key:

| Chain | `BASE_TOKEN_URI` |
|---|---|
| Ethereum | `https://nft.tricksfor.com/ethereum/metadata/` |
| Polygon | `https://nft.tricksfor.com/polygon/metadata/` |
| Optimism | `https://nft.tricksfor.com/optimism/metadata/` |
| BNB Smart Chain | `https://nft.tricksfor.com/bsc/metadata/` |
| Avalanche | `https://nft.tricksfor.com/avalanche/metadata/` |

See [`docs/nft-metadata-generation.md`](nft-metadata-generation.md) for the generation
script and release workflow integration.

### 4.2 Directory Structure

```
nft-assets/
├── ethereum/                         # Chain-specific output for Ethereum
│   ├── metadata/
│   │   ├── 1.json                    # Per-token metadata JSON (token IDs 1–600)
│   │   ├── 2.json
│   │   └── ...
│   ├── images/
│   │   ├── 1.png                     # Per-token image (content = source image for that token)
│   │   ├── 2.png
│   │   └── ...
│   └── contract/
│       └── collection.json           # Collection-level metadata for Ethereum
├── polygon/                          # Chain-specific output for Polygon
│   ├── metadata/
│   ├── images/
│   └── contract/
│       └── collection.json
├── optimism/                         # Chain-specific output for Optimism
├── bsc/                              # Chain-specific output for BNB Smart Chain
├── avalanche/                        # Chain-specific output for Avalanche
├── images/
│   └── source/                       # 33 canonical source images (one per variant+tier combination)
│       ├── coin-heads-2x.png
│       ├── coin-heads-3x.png
│       ├── coin-heads-5x.png
│       ├── coin-tails-2x.png
│       ├── coin-tails-3x.png
│       ├── coin-tails-5x.png
│       ├── dice-1-2x.png
│       ├── ...                        # (all 33 files — see § 3 for full list)
│       └── rps-scissors-5x.png
├── _headers                           # Cloudflare Pages response headers (CORS, cache)
└── _redirects                         # Extensionless → .json rewrite for tokenURI compatibility
```

The source images in `images/source/` are the canonical master assets. Per-token image
files (`{chainKey}/images/{tokenId}.png`) are produced by the metadata generation pipeline,
which copies the appropriate source image for each token ID based on the manifest.

---

## 5. Token ID Mapping Strategy

### 5.1 Scope

Token IDs are scoped to a single contract deployment (one chain, one contract address).
Under the current minting process, IDs start at `1` and are assigned sequentially in mint
order. This is an off-chain minting policy — the contract accepts arbitrary explicit IDs via
`safeMint(address, uint256)`; sequential assignment is enforced by the minting process and the
supply manifest, not by the contract itself. Two separate contract deployments on different
chains may each have a token with ID `1`, but they resolve to different metadata files at
different chain-specific paths (e.g. `/ethereum/metadata/1.json` vs. `/polygon/metadata/1.json`).

### 5.2 Grouping by Theme

Within a single contract deployment, token IDs are grouped by theme in this fixed order:

1. **Coin** — IDs `1` through `{coinSupply}`
2. **Dice** — IDs `{coinSupply + 1}` through `{coinSupply + diceSupply}`
3. **Rock Paper Scissors** — IDs `{coinSupply + diceSupply + 1}` through the total supply

With the default supply of 200 tokens per theme:

| Theme | Token ID range |
|-------|---------------|
| Coin  | 1 – 200       |
| Dice  | 201 – 400     |
| RPS   | 401 – 600     |

The per-theme supply is configurable and recorded in the supply manifest (see § 6). The
grouping order (coin → dice → rps) must remain stable once minting begins on a contract.

### 5.3 Distribution Across Variant+Tier Combinations

Within each theme's token ID range, tokens are distributed as evenly as possible across
all variant+tier combinations for that theme. The distribution is defined by the supply manifest,
which assigns a specific source image to every token ID before minting.

**Default even distribution for 200 tokens per theme:**

- Coin (6 combinations): 34 tokens for the first 2 combinations, 33 for the remaining 4.
- Dice (18 combinations): 12 tokens for the first 2 combinations, 11 for the remaining 16.
- RPS (9 combinations): 23 tokens for the first 2 combinations, 22 for the remaining 7.

The exact per-combination counts are determined by the manifest generator. The rule is:
`floor(themeSupply / combinationCount)` tokens for every combination, with the remainder
distributed one extra token to the first `(themeSupply mod combinationCount)` combinations,
iterating through combinations in the order they appear in § 3.

### 5.4 Token ID to Image URL

Every token ID maps to exactly one image file, following the pattern:

```
https://nft.tricksfor.com/images/{tokenId}.png
```

The per-token image file is a copy of the source image for that token's (theme, variant, tier)
combination. This means multiple tokens may have visually identical images; the combination
is recorded in the token metadata attributes.

---

## 6. Supply Manifest

### 6.1 Purpose

The supply manifest is a JSON file that is the authoritative record of which (theme, variant,
tier) combination is assigned to each token ID within a specific contract deployment. It is
used to:

- Generate per-token metadata JSON files (`metadata/{tokenId}.json`)
- Generate per-token image files (`images/{tokenId}.png`) by copying the correct source image
- Verify consistency before minting

### 6.2 One Manifest per Deployment

There is one manifest file per contract deployment (one per chain + environment combination).
Chain-specific manifests are stored in the deployments directory:

```
deployments/
└── config/
    └── {env}/
        └── nft-manifest.json     # Supply manifest for this environment's contract
```

Where `{env}` matches the GitHub Environment name (e.g., `ethereum-mainnet`, `polygon-mainnet`,
`bsc-testnet`). The existing `deployment-params.json` in the same directory records the
corresponding contract deployment parameters.

### 6.3 Manifest Format

```json
{
  "chain": "Polygon",
  "network": "polygon-mainnet",
  "contract": "0x0000000000000000000000000000000000000000",
  "totalSupply": 600,
  "tokens": [
    {
      "tokenId": 1,
      "theme": "coin",
      "variant": "heads",
      "tier": "2x",
      "sourceImage": "coin-heads-2x.png"
    },
    {
      "tokenId": 2,
      "theme": "coin",
      "variant": "heads",
      "tier": "2x",
      "sourceImage": "coin-heads-2x.png"
    }
  ]
}
```

| Field         | Description                                                               |
|---------------|---------------------------------------------------------------------------|
| `chain`       | Display name of the chain (`"Ethereum"`, `"Polygon"`, `"BNB Chain"`, etc.) |
| `network`     | Environment identifier matching the `deployments/config/{env}` directory  |
| `contract`    | Deployed contract address (or zero address if not yet deployed)           |
| `totalSupply` | Total number of tokens in this manifest                                   |
| `tokens`      | Ordered array of token entries, one per token ID                          |
| `tokenId`     | On-chain token ID (sequential from 1)                                     |
| `theme`       | Canonical theme identifier (`coin`, `dice`, `rps`)                        |
| `variant`     | Canonical variant identifier (e.g., `heads`, `4`, `rock`)                |
| `tier`        | Canonical tier identifier (`2x`, `3x`, `5x`)                             |
| `sourceImage` | File name of the source image in `nft-assets/images/source/`             |

### 6.4 Global vs. Chain-Specific Manifests

The source-of-truth is the per-deployment manifest in `deployments/config/{env}/`. If multiple
chain deployments share the same token distribution design, a single template manifest may be
used as input to a generation script that produces chain-specific manifests. The generated
manifests — not the template — are committed to the repository.

---

## 7. Canonical Chain Names

The following canonical chain names and identifiers are used in manifests, optional metadata
attributes, and deployment configuration. To avoid ambiguity, this table distinguishes between
the chain display name used in deployment documentation, the environment prefix used for
directories under `deployments/config/`, and the optional `Chain` metadata value used in
generated token metadata.

| Chain display name | Environment prefix | Optional `Chain` metadata value | Notes |
|--------------------|--------------------|---------------------------------|-------|
| Ethereum           | `ethereum-`        | `"Ethereum"`                    |       |
| Polygon            | `polygon-`         | `"Polygon"`                     |       |
| BNB Smart Chain    | `bsc-`             | `"BNB Chain"`                   | Use "BNB Smart Chain" in deployment documentation; use `"BNB Chain"` only for the optional metadata attribute value. |
| Avalanche          | `avalanche-`       | `"Avalanche"`                   |       |
| Optimism           | `optimism-`        | `"Optimism"`                    |       |

---

## 8. Example: End-to-End Token Slot

The following example shows how all layers align for a single token (Polygon deployment, token 255).

### Source image

```
nft-assets/images/source/dice-4-3x.png
```

### Per-token image

```
nft-assets/polygon/images/255.png     ← copy of dice-4-3x.png
```

### Per-token metadata (`nft-assets/polygon/metadata/255.json`)

```json
{
  "name": "Tricksfor Dice 4 3x Booster #255",
  "description": "A Tricksfor Dice Booster NFT for the 4 outcome. Stake this NFT to activate a 3x reward boost during eligible Tricksfor gameplay. An unstaked Booster confers no in-game advantage. Subject to platform rules.",
  "image": "https://nft.tricksfor.com/polygon/images/255.png",
  "external_url": "https://tricksfor.com/boosters/255",
  "attributes": [
    { "trait_type": "Game",       "value": "Dice"       },
    { "trait_type": "Option",     "value": "4"          },
    { "trait_type": "Booster",    "value": "3x Booster" },
    { "trait_type": "Multiplier", "value": "3x"         },
    { "trait_type": "Chain",      "value": "Polygon"    }
  ]
}
```

### Manifest entry (`deployments/config/polygon-mainnet/nft-manifest.json`)

```json
{
  "tokenId": 255,
  "theme": "dice",
  "variant": "4",
  "tier": "3x",
  "sourceImage": "dice-4-3x.png"
}
```

### On-chain tokenURI

```
https://nft.tricksfor.com/polygon/metadata/255
```

The `_redirects` rewrite rule transparently serves `polygon/metadata/255.json` for this extensionless URI.

---

## 9. Consistency Rules

1. **All 33 source image slots must be filled** before running metadata generation or minting.
2. **Canonical identifiers are lowercase.** File names, directory names, and manifest fields use lowercase identifiers as defined in §§ 1–7.
3. **Display values use sentence case.** Metadata attributes use the display values from §§ 1.1–1.3.
4. **Token IDs are stable once minted.** Never reassign a token ID to a different (theme, variant, tier) combination after the contract has minted that ID.
5. **The manifest is the authoritative record.** Metadata files and image files must match the manifest. Regenerate them from the manifest rather than editing them manually.
6. **Theme grouping order (coin → dice → rps) must not change** within an active deployment.
7. **Chain separation is per-contract.** Do not mix tokens from different chain deployments in the same contract.
8. **Chain separation is per-directory.** Each chain's generated metadata and image files live under `nft-assets/{chainKey}/`. Do not mix chain outputs into a shared flat directory.

---

## 10. Related Documents

| Document | Description |
|---|---|
| [`docs/nft-asset-manifest-spec.md`](nft-asset-manifest-spec.md) | Full NFT asset manifest specification — extends the § 6 supply manifest with generation-tooling fields, global cross-chain format, and validation rules |
| [`docs/nft-metadata-schema.md`](nft-metadata-schema.md) | Authoritative token metadata attribute schema (required fields, valid values, examples) |
| [`docs/nft-metadata-generation.md`](nft-metadata-generation.md) | Generation script usage, output format, and release workflow integration |
| [`nft-assets/README.md`](../nft-assets/README.md) | Static asset hosting structure and Cloudflare Pages URL conventions |
| [`nft-assets/manifests/polygon.coin.sample.json`](../nft-assets/manifests/polygon.coin.sample.json) | Sample manifest: Polygon chain, coin theme |
| [`nft-assets/manifests/ethereum.dice.sample.json`](../nft-assets/manifests/ethereum.dice.sample.json) | Sample manifest: Ethereum chain, dice theme |
| [`nft-assets/manifests/global.sample.json`](../nft-assets/manifests/global.sample.json) | Sample manifest: global cross-chain template |
| [`docs/metadata/token-example.json`](metadata/token-example.json) | Reference token metadata JSON |
| [`docs/metadata/contract-example.json`](metadata/contract-example.json) | Reference collection metadata JSON |
| [`docs/opensea-readiness-checklist.md`](opensea-readiness-checklist.md) | Pre-launch OpenSea compatibility checklist |
| [`docs/cloudflare-pages-setup.md`](cloudflare-pages-setup.md) | Cloudflare Pages setup and multi-chain deployment strategy |
