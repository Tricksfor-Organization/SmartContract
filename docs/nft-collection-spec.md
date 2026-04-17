# Tricksfor Boosters — NFT Collection Specification

This document is the authoritative source of truth for the Tricksfor Booster NFT collection
structure. Metadata generation, image organisation, mint preparation, and Cloudflare Pages
deployment must all derive from this specification.

Where this document conflicts with distribution rules described in other documents (such as
the even-distribution shorthand in `docs/nft-assets-spec.md` § 5.3), this document takes
precedence.

---

## 1. Collection Naming

Each supported blockchain has its own ERC-721 contract deployment and its own named collection.
The collection name follows the pattern:

```
Tricksfor Boosters - [Chain Name]
```

| Chain          | Collection name                      |
|----------------|--------------------------------------|
| Ethereum       | `Tricksfor Boosters - Ethereum`      |
| Polygon        | `Tricksfor Boosters - Polygon`       |
| Optimism       | `Tricksfor Boosters - Optimism`      |
| BSC            | `Tricksfor Boosters - BSC`           |
| Avalanche      | `Tricksfor Boosters - Avalanche`     |

The chain name in the collection title is the short display name used in user-facing contexts
(e.g. `BSC` rather than `BNB Smart Chain`). For deployment configuration identifiers and
optional metadata `Chain` attributes, refer to the chain naming table in
[`docs/nft-assets-spec.md` § 7](nft-assets-spec.md#7-canonical-chain-names).

---

## 2. Contract Model

- One ERC-721 contract is deployed per supported chain.
- Each contract contains tokens from **all three game themes**: `coin`, `dice`, and `rps`.
- Contracts are independent. There is no cross-chain bridging or token sharing.
- Token IDs start at `1` and run sequentially to `600` within each contract.

---

## 3. Theme Taxonomy

Three game themes are supported. Each theme is identified by a canonical lowercase identifier
used in file names, metadata manifests, and asset directories.

| Canonical identifier | Metadata `Game` attribute value |
|----------------------|---------------------------------|
| `coin`               | `"Coin"`                        |
| `dice`               | `"Dice"`                        |
| `rps`                | `"Rock Paper Scissors"`         |

Use the canonical identifier in all scripts, file names, directory names, and manifest fields.
Use the metadata display value only inside token metadata JSON `attributes`.

---

## 4. Option Taxonomy

Each theme has a fixed set of options. Options map to the `Option` attribute in token metadata.

### 4.1 Coin

| Canonical identifier | Metadata `Option` value |
|----------------------|-------------------------|
| `heads`              | `"Heads"`               |
| `tails`              | `"Tails"`               |

### 4.2 Dice

| Canonical identifier | Metadata `Option` value |
|----------------------|-------------------------|
| `1`                  | `"1"`                   |
| `2`                  | `"2"`                   |
| `3`                  | `"3"`                   |
| `4`                  | `"4"`                   |
| `5`                  | `"5"`                   |
| `6`                  | `"6"`                   |

### 4.3 Rock Paper Scissors

| Canonical identifier | Metadata `Option` value |
|----------------------|-------------------------|
| `rock`               | `"Rock"`                |
| `paper`              | `"Paper"`               |
| `scissors`           | `"Scissors"`            |

---

## 5. Tier Taxonomy

Three booster tiers exist for every theme. The tier is identified by a canonical identifier
and maps to two metadata attributes.

| Canonical identifier | Metadata `Booster` value | Metadata `Multiplier` value |
|----------------------|--------------------------|-----------------------------|
| `2x`                 | `"2x Booster"`           | `"2x"`                      |
| `3x`                 | `"3x Booster"`           | `"3x"`                      |
| `5x`                 | `"5x Booster"`           | `"5x"`                      |

Do not use ordinal labels such as `tier1` / `tier2` / `tier3`. The multiplier values are the
stable, unambiguous identifiers.

---

## 6. Supply Rules

### 6.1 Per-theme supply

The **default planned supply** is 200 NFTs per theme per chain contract.
Actual deployment-specific supply values are configurable and must be recorded in
`deployments/config/{env}/nft-manifest.json`, which is the source of truth for the final
per-theme counts for a given deployment.

| Theme | Default planned supply per chain |
|-------|----------------------------------|
| Coin  | 200                              |
| Dice  | 200                              |
| RPS   | 200                              |
| **Default total per chain** | **600**         |

### 6.2 Tier split per theme

The tier split below is defined for the default supply of 200 tokens per theme and must be
recalculated proportionally if a deployment uses a different per-theme count.
With the default supply the split across tiers is:

| Tier          | Count per theme |
|---------------|-----------------|
| `2x Booster`  | 100             |
| `3x Booster`  | 70              |
| `5x Booster`  | 30              |
| **Total**     | **200**         |

This split applies identically to all three themes and to all chain deployments.

---

## 7. Per-Option Distribution Rule

### 7.1 Remainder-distribution rule

Within each (theme, tier) block, the tier's token count is distributed across the theme's
options using the following deterministic rule:

1. Compute the base count: `base = floor(tierCount / optionCount)`
2. Compute the remainder: `r = tierCount mod optionCount`
3. The first `r` options in canonical order each receive `base + 1` tokens.
4. The remaining `optionCount - r` options each receive `base` tokens.

"Canonical order" is the order in which options appear in § 4.

This rule is deterministic and scriptable. The same input always produces the same output.

### 7.2 Coin distribution

Coin has **2 options** (heads, tails). All tier counts divide evenly by 2.

| Tier         | Total | Heads | Tails |
|--------------|-------|-------|-------|
| `2x Booster` | 100   | 50    | 50    |
| `3x Booster` | 70    | 35    | 35    |
| `5x Booster` | 30    | 15    | 15    |

### 7.3 Dice distribution

Dice has **6 options** (1, 2, 3, 4, 5, 6). Tier counts of 100 and 70 do not divide evenly
by 6; the remainder rule distributes extras to options `1` through `r` first.

| Tier         | Total | Opt 1 | Opt 2 | Opt 3 | Opt 4 | Opt 5 | Opt 6 | Remainder |
|--------------|-------|-------|-------|-------|-------|-------|-------|-----------|
| `2x Booster` | 100   | 17    | 17    | 17    | 17    | 16    | 16    | r = 4     |
| `3x Booster` | 70    | 12    | 12    | 12    | 12    | 11    | 11    | r = 4     |
| `5x Booster` | 30    | 5     | 5     | 5     | 5     | 5     | 5     | r = 0     |

Verification: `4×17 + 2×16 = 100` ✓  `4×12 + 2×11 = 70` ✓  `6×5 = 30` ✓

### 7.4 Rock Paper Scissors distribution

RPS has **3 options** (rock, paper, scissors). Tier counts of 100 and 70 do not divide evenly
by 3; the remainder rule distributes extras to `rock` first.

| Tier         | Total | Rock | Paper | Scissors | Remainder |
|--------------|-------|------|-------|----------|-----------|
| `2x Booster` | 100   | 34   | 33    | 33       | r = 1     |
| `3x Booster` | 70    | 24   | 23    | 23       | r = 1     |
| `5x Booster` | 30    | 10   | 10    | 10       | r = 0     |

Verification: `34 + 33 + 33 = 100` ✓  `24 + 23 + 23 = 70` ✓  `3×10 = 30` ✓

---

## 8. Token ID Allocation

### 8.1 Scope

Token IDs are scoped to a single contract deployment. For each chain deployment, the
collection manifest and minting process define token IDs `1` through `600` sequentially
with no gaps. IDs are not shared or coordinated across chains, so two different chain
contracts may each have a token with ID `1`.

### 8.2 Theme grouping

Token IDs are grouped by theme in this fixed order:

1. **Coin** — IDs `1` through `200`
2. **Dice** — IDs `201` through `400`
3. **Rock Paper Scissors** — IDs `401` through `600`

| Theme | Token ID range |
|-------|---------------|
| Coin  | 1 – 200       |
| Dice  | 201 – 400     |
| RPS   | 401 – 600     |

The grouping order (coin → dice → rps) must not change once minting begins on a contract.

### 8.3 Intra-theme ordering

Within each theme's token ID range, tokens are ordered by tier then by option, both in
canonical order:

1. All `2x Booster` tokens for that theme (IDs `themeStart` through `themeStart + 99`)
2. All `3x Booster` tokens for that theme (IDs `themeStart + 100` through `themeStart + 169`)
3. All `5x Booster` tokens for that theme (IDs `themeStart + 170` through `themeStart + 199`)

Within each tier block, tokens are distributed across options in canonical order using the
counts from § 7.

The exact per-token (theme, option, tier) assignment is recorded in the supply manifest at
`deployments/config/{env}/nft-manifest.json`. The manifest is the authoritative record; do not
infer token attributes from token ID alone.

### 8.4 Token ID assignment method

Token IDs are assigned sequentially in the manifest (not remapped after generation). There is
no intermediate ID space. The manifest generator produces final IDs directly, starting at `1`.

---

## 9. Worked Examples

### 9.1 Coin token range

| Token ID range | Theme | Tier         | Option |
|----------------|-------|--------------|--------|
| 1 – 50         | Coin  | `2x Booster` | Heads  |
| 51 – 100       | Coin  | `2x Booster` | Tails  |
| 101 – 135      | Coin  | `3x Booster` | Heads  |
| 136 – 170      | Coin  | `3x Booster` | Tails  |
| 171 – 185      | Coin  | `5x Booster` | Heads  |
| 186 – 200      | Coin  | `5x Booster` | Tails  |

### 9.2 Dice token range

| Token ID range | Theme | Tier         | Option |
|----------------|-------|--------------|--------|
| 201 – 217      | Dice  | `2x Booster` | 1      |
| 218 – 234      | Dice  | `2x Booster` | 2      |
| 235 – 251      | Dice  | `2x Booster` | 3      |
| 252 – 268      | Dice  | `2x Booster` | 4      |
| 269 – 284      | Dice  | `2x Booster` | 5      |
| 285 – 300      | Dice  | `2x Booster` | 6      |
| 301 – 312      | Dice  | `3x Booster` | 1      |
| 313 – 324      | Dice  | `3x Booster` | 2      |
| 325 – 336      | Dice  | `3x Booster` | 3      |
| 337 – 348      | Dice  | `3x Booster` | 4      |
| 349 – 359      | Dice  | `3x Booster` | 5      |
| 360 – 370      | Dice  | `3x Booster` | 6      |
| 371 – 375      | Dice  | `5x Booster` | 1      |
| 376 – 380      | Dice  | `5x Booster` | 2      |
| 381 – 385      | Dice  | `5x Booster` | 3      |
| 386 – 390      | Dice  | `5x Booster` | 4      |
| 391 – 395      | Dice  | `5x Booster` | 5      |
| 396 – 400      | Dice  | `5x Booster` | 6      |

### 9.3 Rock Paper Scissors token range

| Token ID range | Theme | Tier         | Option   |
|----------------|-------|--------------|----------|
| 401 – 434      | RPS   | `2x Booster` | Rock     |
| 435 – 467      | RPS   | `2x Booster` | Paper    |
| 468 – 500      | RPS   | `2x Booster` | Scissors |
| 501 – 524      | RPS   | `3x Booster` | Rock     |
| 525 – 547      | RPS   | `3x Booster` | Paper    |
| 548 – 570      | RPS   | `3x Booster` | Scissors |
| 571 – 580      | RPS   | `5x Booster` | Rock     |
| 581 – 590      | RPS   | `5x Booster` | Paper    |
| 591 – 600      | RPS   | `5x Booster` | Scissors |

---

## 10. Summary Table

| Theme | Tier         | Option count | Count per option    | Theme tier total | Theme total |
|-------|--------------|-------------|---------------------|-----------------|-------------|
| Coin  | `2x Booster` | 2           | 50 each             | 100             |             |
| Coin  | `3x Booster` | 2           | 35 each             | 70              |             |
| Coin  | `5x Booster` | 2           | 15 each             | 30              | **200**     |
| Dice  | `2x Booster` | 6           | 17, 17, 17, 17, 16, 16 | 100         |             |
| Dice  | `3x Booster` | 6           | 12, 12, 12, 12, 11, 11 | 70          |             |
| Dice  | `5x Booster` | 6           | 5 each              | 30              | **200**     |
| RPS   | `2x Booster` | 3           | 34, 33, 33          | 100             |             |
| RPS   | `3x Booster` | 3           | 24, 23, 23          | 70              |             |
| RPS   | `5x Booster` | 3           | 10 each             | 30              | **200**     |
| **Total per chain** | | | | | **600** |

---

## 11. Related Documents

| Document | Description |
|---|---|
| [`docs/nft-assets-spec.md`](nft-assets-spec.md) | Asset taxonomy, image file naming, static file layout, token ID mapping, and supply manifest format |
| [`docs/nft-asset-manifest-spec.md`](nft-asset-manifest-spec.md) | Full asset manifest specification with generation-tooling fields, global cross-chain format, and validation rules |
| [`docs/nft-metadata-schema.md`](nft-metadata-schema.md) | Authoritative token metadata attribute schema (required fields, valid values, token name convention) |
| [`nft-assets/README.md`](../nft-assets/README.md) | Static asset hosting structure and Cloudflare Pages URL conventions |
| [`docs/opensea-readiness-checklist.md`](opensea-readiness-checklist.md) | Pre-launch OpenSea compatibility checklist |
