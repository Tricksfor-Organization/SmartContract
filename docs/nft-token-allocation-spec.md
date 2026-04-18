# NFT Token ID Allocation Specification

This document defines the exact, deterministic token ID allocation rules for the Tricksfor
Booster NFT collection. It covers token ID ranges per theme, tier distribution, per-option
distribution (including the remainder rule for uneven splits), the canonical ordering strategy,
and worked per-token examples.

This specification is derived from and consistent with
[`docs/nft-collection-spec.md`](nft-collection-spec.md), which is the authoritative source of
truth for the overall collection structure. The allocation rules in this document mirror the
token allocation and per-ID range content defined there (notably the allocation sections that
describe theme ranges, tier distribution, option splitting, and ordering) and must be updated
together with `nft-collection-spec.md` whenever those rules change. In the event of any
conflict between this document and `nft-collection-spec.md`, `nft-collection-spec.md` takes
precedence.

---

## 1. Scope and Purpose

This document answers:

- Which token IDs belong to which theme?
- How many tokens of each tier exist per theme?
- How are tier totals split across theme options when the division is uneven?
- In what order are token IDs assigned within a theme?

The rules defined here are intended to be implemented directly by manifest-generation tooling.
A generation script that follows this specification must produce exactly the same token IDs and
attribute assignments on every run, for every chain deployment.

---

## 2. Chain-Specific Token Ranges

Each chain has one ERC-721 contract containing all three game themes. Token IDs start at `1`
and run sequentially to `600` with no gaps. Token IDs are not shared across chains; two
different chain contracts may each have a token with ID `1`.

### 2.1 Theme Grouping

Token IDs are grouped by theme in this fixed order:

| Theme                  | Token ID Range | Count |
|------------------------|----------------|-------|
| Coin                   | 1 – 200        | 200   |
| Dice                   | 201 – 400      | 200   |
| Rock Paper Scissors    | 401 – 600      | 200   |
| **Total per chain**    |                | **600** |

The grouping order (Coin → Dice → RPS) is fixed and must not change once minting begins on
a contract.

---

## 3. Ordering Strategy

Token IDs are assigned using the following ordering:

```
theme → tier → option
```

This means:

1. All Coin tokens come first (IDs 1–200).
2. Within Coin, all `2x Booster` tokens come first, then `3x Booster`, then `5x Booster`.
3. Within each tier block, tokens are assigned option by option in canonical option order.

The same pattern repeats for Dice (IDs 201–400) and RPS (IDs 401–600).

This ordering is deterministic and makes the layout easy to inspect and debug.

---

## 4. Tier Distribution

The tier split below applies identically to all three themes and to all chain deployments at
the default supply of 200 tokens per theme:

| Tier          | Count per theme | Theme ID offset |
|---------------|-----------------|-----------------|
| `2x Booster`  | 100             | +0 through +99  |
| `3x Booster`  | 70              | +100 through +169 |
| `5x Booster`  | 30              | +170 through +199 |
| **Total**     | **200**         |                 |

The tier offset is applied from each theme's start ID:

| Theme | Theme Start ID | `2x` Block  | `3x` Block  | `5x` Block  |
|-------|---------------|-------------|-------------|-------------|
| Coin  | 1             | 1 – 100     | 101 – 170   | 171 – 200   |
| Dice  | 201           | 201 – 300   | 301 – 370   | 371 – 400   |
| RPS   | 401           | 401 – 500   | 501 – 570   | 571 – 600   |

---

## 5. Deterministic Remainder-Distribution Rule

Within each (theme, tier) block, the tier's token count is split across the theme's options
using the following deterministic algorithm:

```
base      = floor(tierCount / optionCount)
remainder = tierCount mod optionCount
```

- The first `remainder` options in canonical order each receive `base + 1` tokens.
- The remaining `optionCount − remainder` options each receive `base` tokens.

"Canonical order" is the order in which options are listed in § 6–8 below.

This rule is deterministic: the same inputs always produce the same output, and it can be
implemented as a simple loop in any language.

---

## 6. Coin Allocation

### 6.1 Options (canonical order)

| Position | Canonical identifier | Metadata `Option` value |
|----------|----------------------|-------------------------|
| 1        | `heads`              | `"Heads"`               |
| 2        | `tails`              | `"Tails"`               |

### 6.2 Per-option distribution

Coin has **2 options**. All tier counts divide evenly by 2 (remainder = 0), so every option
in every tier receives an equal share.

| Tier         | Tier total | Heads | Tails | Remainder (r) |
|--------------|-----------|-------|-------|---------------|
| `2x Booster` | 100       | 50    | 50    | 0             |
| `3x Booster` | 70        | 35    | 35    | 0             |
| `5x Booster` | 30        | 15    | 15    | 0             |

Verification: `50 + 50 = 100` ✓  `35 + 35 = 70` ✓  `15 + 15 = 30` ✓

### 6.3 Token ID ranges (Coin)

| Token ID range | Tier         | Option |
|----------------|--------------|--------|
| 1 – 50         | `2x Booster` | Heads  |
| 51 – 100       | `2x Booster` | Tails  |
| 101 – 135      | `3x Booster` | Heads  |
| 136 – 170      | `3x Booster` | Tails  |
| 171 – 185      | `5x Booster` | Heads  |
| 186 – 200      | `5x Booster` | Tails  |

---

## 7. Dice Allocation

### 7.1 Options (canonical order)

| Position | Canonical identifier | Metadata `Option` value |
|----------|----------------------|-------------------------|
| 1        | `1`                  | `"1"`                   |
| 2        | `2`                  | `"2"`                   |
| 3        | `3`                  | `"3"`                   |
| 4        | `4`                  | `"4"`                   |
| 5        | `5`                  | `"5"`                   |
| 6        | `6`                  | `"6"`                   |

### 7.2 Per-option distribution

Dice has **6 options**. Tier totals of 100 and 70 do not divide evenly by 6; the remainder
rule distributes the extra tokens to options 1 through `r` first.

| Tier         | Tier total | Opt 1 | Opt 2 | Opt 3 | Opt 4 | Opt 5 | Opt 6 | Remainder (r) |
|--------------|-----------|-------|-------|-------|-------|-------|-------|---------------|
| `2x Booster` | 100       | 17    | 17    | 17    | 17    | 16    | 16    | 4             |
| `3x Booster` | 70        | 12    | 12    | 12    | 12    | 11    | 11    | 4             |
| `5x Booster` | 30        | 5     | 5     | 5     | 5     | 5     | 5     | 0             |

Verification: `4 × 17 + 2 × 16 = 100` ✓  `4 × 12 + 2 × 11 = 70` ✓  `6 × 5 = 30` ✓

### 7.3 Token ID ranges (Dice)

| Token ID range | Tier         | Option |
|----------------|--------------|--------|
| 201 – 217      | `2x Booster` | 1      |
| 218 – 234      | `2x Booster` | 2      |
| 235 – 251      | `2x Booster` | 3      |
| 252 – 268      | `2x Booster` | 4      |
| 269 – 284      | `2x Booster` | 5      |
| 285 – 300      | `2x Booster` | 6      |
| 301 – 312      | `3x Booster` | 1      |
| 313 – 324      | `3x Booster` | 2      |
| 325 – 336      | `3x Booster` | 3      |
| 337 – 348      | `3x Booster` | 4      |
| 349 – 359      | `3x Booster` | 5      |
| 360 – 370      | `3x Booster` | 6      |
| 371 – 375      | `5x Booster` | 1      |
| 376 – 380      | `5x Booster` | 2      |
| 381 – 385      | `5x Booster` | 3      |
| 386 – 390      | `5x Booster` | 4      |
| 391 – 395      | `5x Booster` | 5      |
| 396 – 400      | `5x Booster` | 6      |

---

## 8. Rock Paper Scissors Allocation

### 8.1 Options (canonical order)

| Position | Canonical identifier | Metadata `Option` value |
|----------|----------------------|-------------------------|
| 1        | `rock`               | `"Rock"`                |
| 2        | `paper`              | `"Paper"`               |
| 3        | `scissors`           | `"Scissors"`            |

### 8.2 Per-option distribution

RPS has **3 options**. Tier totals of 100 and 70 do not divide evenly by 3; the remainder
rule distributes the extra token to `rock` first.

| Tier         | Tier total | Rock | Paper | Scissors | Remainder (r) |
|--------------|-----------|------|-------|----------|---------------|
| `2x Booster` | 100       | 34   | 33    | 33       | 1             |
| `3x Booster` | 70        | 24   | 23    | 23       | 1             |
| `5x Booster` | 30        | 10   | 10    | 10       | 0             |

Verification: `34 + 33 + 33 = 100` ✓  `24 + 23 + 23 = 70` ✓  `3 × 10 = 30` ✓

### 8.3 Token ID ranges (RPS)

| Token ID range | Tier         | Option   |
|----------------|--------------|----------|
| 401 – 434      | `2x Booster` | Rock     |
| 435 – 467      | `2x Booster` | Paper    |
| 468 – 500      | `2x Booster` | Scissors |
| 501 – 524      | `3x Booster` | Rock     |
| 525 – 547      | `3x Booster` | Paper    |
| 548 – 570      | `3x Booster` | Scissors |
| 571 – 580      | `5x Booster` | Rock     |
| 581 – 590      | `5x Booster` | Paper    |
| 591 – 600      | `5x Booster` | Scissors |

---

## 9. Complete Token Count Summary

| Theme | Tier         | Option count | Counts per option           | Tier total | Theme total |
|-------|--------------|--------------|-----------------------------|-----------|-------------|
| Coin  | `2x Booster` | 2            | 50, 50                      | 100       |             |
| Coin  | `3x Booster` | 2            | 35, 35                      | 70        |             |
| Coin  | `5x Booster` | 2            | 15, 15                      | 30        | **200**     |
| Dice  | `2x Booster` | 6            | 17, 17, 17, 17, 16, 16      | 100       |             |
| Dice  | `3x Booster` | 6            | 12, 12, 12, 12, 11, 11      | 70        |             |
| Dice  | `5x Booster` | 6            | 5, 5, 5, 5, 5, 5            | 30        | **200**     |
| RPS   | `2x Booster` | 3            | 34, 33, 33                  | 100       |             |
| RPS   | `3x Booster` | 3            | 24, 23, 23                  | 70        |             |
| RPS   | `5x Booster` | 3            | 10, 10, 10                  | 30        | **200**     |
| **Total per chain** | | | | | **600** |

---

## 10. Generation Algorithm (Pseudocode)

The following pseudocode demonstrates how a manifest-generation tool applies these rules:

```
THEMES = [("coin", ["heads","tails"]), ("dice", ["1","2","3","4","5","6"]), ("rps", ["rock","paper","scissors"])]
TIERS  = [("2x", 100), ("3x", 70), ("5x", 30)]

nextId = 1

for (theme, options) in THEMES:
    for (tier, tierCount) in TIERS:
        optionCount = len(options)
        base        = tierCount // optionCount
        remainder   = tierCount  % optionCount
        for (i, option) in enumerate(options):
            count = base + (1 if i < remainder else 0)
            for _ in range(count):
                emit token(id=nextId, theme=theme, tier=tier, option=option)
                nextId += 1
```

Running this algorithm produces token IDs 1–600 with attributes exactly matching the tables in
§ 6–8. No randomness, no lookup tables, and no post-generation remapping is required.

---

## 11. Related Documents

| Document | Description |
|---|---|
| [`docs/nft-collection-spec.md`](nft-collection-spec.md) | Authoritative full collection specification; defines taxonomy, supply rules, and worked examples |
| [`docs/nft-assets-spec.md`](nft-assets-spec.md) | Asset taxonomy, image file naming, static file layout, token ID mapping, and supply manifest format |
| [`docs/nft-asset-manifest-spec.md`](nft-asset-manifest-spec.md) | Full asset manifest specification with generation-tooling fields and validation rules |
| [`docs/nft-metadata-schema.md`](nft-metadata-schema.md) | Authoritative token metadata attribute schema |
