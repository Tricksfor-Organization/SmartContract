# NFT Source Image Naming Specification

This document defines the deterministic naming convention for all 33 source image files used as
the visual basis for Tricksfor Booster NFT collections across all supported chains. It is the
single authoritative reference for image file names, directory layout, and their alignment with
manifest and metadata fields.

For the broader asset taxonomy and token ID mapping rules, see
[`docs/nft-assets-spec.md`](nft-assets-spec.md). For the manifest format that references these
files, see [`docs/nft-asset-manifest-spec.md`](nft-asset-manifest-spec.md).

---

## 1. Naming Convention

### 1.1 Pattern

Source image files are named using the pattern:

```
{variant}-{tier}.png
```

They are organised into per-theme subdirectories under `nft-assets/source-images/`:

```
nft-assets/source-images/{theme}/{variant}-{tier}.png
```

The relative path from `nft-assets/source-images/` — i.e. `{theme}/{variant}-{tier}.png` — is
the value stored in the `sourceImage` field of every manifest token entry.

### 1.2 Rules

| Rule | Requirement |
|------|-------------|
| **Lowercase only** | All path segments, including `{theme}`, `{variant}`, and `{tier}`, are lowercase. |
| **Hyphen separator** | `{variant}` and `{tier}` are joined by a single hyphen (`-`). |
| **PNG format** | All source images use the `.png` extension. No other formats are accepted. |
| **No spaces or special characters** | File names must be file-system and URL safe. Use only `a-z`, `0-9`, and `-`. |
| **Theme in directory, not in file name** | The theme (`coin`, `dice`, `rps`) appears as the parent directory, not in the file name itself. |
| **Canonical identifiers only** | Only the identifiers defined in §§ 2–4 are valid. Do not introduce synonyms, abbreviations, or display-name forms in file names. |

---

## 2. Canonical Theme Keys

| Theme key | Metadata `Game` attribute value | Directory |
|-----------|----------------------------------|-----------|
| `coin`    | `"Coin"`                         | `nft-assets/source-images/coin/` |
| `dice`    | `"Dice"`                         | `nft-assets/source-images/dice/` |
| `rps`     | `"Rock Paper Scissors"`          | `nft-assets/source-images/rps/`  |

Use the theme key everywhere files, directories, and manifest fields reference a theme by name.
Use the metadata `Game` attribute value only inside token metadata JSON.

---

## 3. Canonical Variant Keys

### Coin

| Variant key | Metadata `Option` attribute value |
|-------------|-----------------------------------|
| `heads`     | `"Heads"`                         |
| `tails`     | `"Tails"`                         |

### Dice

| Variant key | Metadata `Option` attribute value |
|-------------|-----------------------------------|
| `1`         | `"1"`                             |
| `2`         | `"2"`                             |
| `3`         | `"3"`                             |
| `4`         | `"4"`                             |
| `5`         | `"5"`                             |
| `6`         | `"6"`                             |

### Rock Paper Scissors

| Variant key | Metadata `Option` attribute value |
|-------------|-----------------------------------|
| `rock`      | `"Rock"`                          |
| `paper`     | `"Paper"`                         |
| `scissors`  | `"Scissors"`                      |

---

## 4. Canonical Tier Keys

| Tier key | Metadata `Booster` attribute value | Metadata `Multiplier` attribute value |
|----------|------------------------------------|---------------------------------------|
| `2x`     | `"2x Booster"`                     | `"2x"`                                |
| `3x`     | `"3x Booster"`                     | `"3x"`                                |
| `5x`     | `"5x Booster"`                     | `"5x"`                                |

> **Note:** The tier key is the multiplier identifier (`2x`, `3x`, `5x`). Do not use ordinal
> labels such as `tier1` / `tier2` / `tier3` or display strings such as `2x-booster` in file
> names. The multiplier value is the stable, unambiguous identifier across all layers.

---

## 5. Full Enumeration of All 33 Source Images

Every unique combination of (theme, variant, tier) maps to exactly one source image file.
All 33 files must be present before any metadata generation or contract minting run.

### Coin — 6 files (in `source-images/coin/`)

| File name      | `sourceImage` manifest field |
|----------------|------------------------------|
| `heads-2x.png` | `coin/heads-2x.png`          |
| `heads-3x.png` | `coin/heads-3x.png`          |
| `heads-5x.png` | `coin/heads-5x.png`          |
| `tails-2x.png` | `coin/tails-2x.png`          |
| `tails-3x.png` | `coin/tails-3x.png`          |
| `tails-5x.png` | `coin/tails-5x.png`          |

### Dice — 18 files (in `source-images/dice/`)

| File name   | `sourceImage` manifest field |
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

### Rock Paper Scissors — 9 files (in `source-images/rps/`)

| File name        | `sourceImage` manifest field |
|------------------|------------------------------|
| `rock-2x.png`    | `rps/rock-2x.png`            |
| `rock-3x.png`    | `rps/rock-3x.png`            |
| `rock-5x.png`    | `rps/rock-5x.png`            |
| `paper-2x.png`   | `rps/paper-2x.png`           |
| `paper-3x.png`   | `rps/paper-3x.png`           |
| `paper-5x.png`   | `rps/paper-5x.png`           |
| `scissors-2x.png`| `rps/scissors-2x.png`        |
| `scissors-3x.png`| `rps/scissors-3x.png`        |
| `scissors-5x.png`| `rps/scissors-5x.png`        |

---

## 6. Alignment with Manifest and Metadata Fields

The table below shows how the file name components map to the corresponding fields across the
manifest and token metadata layers for a representative token.

| Layer | Field | Example value | Derived from |
|-------|-------|---------------|--------------|
| **File system** | Directory path | `nft-assets/source-images/dice/` | Theme key (`dice`) |
| **File system** | File name | `4-3x.png` | Variant key (`4`) + tier key (`3x`) |
| **Manifest** | `theme` | `"dice"` | Theme key |
| **Manifest** | `variant` | `"4"` | Variant key |
| **Manifest** | `tier` | `"3x"` | Tier key |
| **Manifest** | `sourceImage` | `"dice/4-3x.png"` | `{theme}/{variant}-{tier}.png` |
| **Metadata** | `Game` attribute | `"Dice"` | Theme display name |
| **Metadata** | `Option` attribute | `"4"` | Variant display value |
| **Metadata** | `Booster` attribute | `"3x Booster"` | Tier display value |
| **Metadata** | `Multiplier` attribute | `"3x"` | Tier key |
| **Metadata** | `name` | `"Tricksfor Dice 4 3x Booster #255"` | Theme + variant + tier + token ID |
| **Metadata** | `image` URL | `"https://nft.tricksfor.com/polygon/images/255.png"` | Chain key + token ID |

The per-token image file (`{chainKey}/images/{tokenId}.png`) is a copy of the source image
for that token's (theme, variant, tier) combination, produced by the metadata generation
pipeline. Multiple token IDs may share the same source image; the combination is recorded
in the token metadata attributes.

---

## 7. Examples Mapped to Metadata

The following examples each show the source file, the manifest entry, and the corresponding
token metadata attributes, demonstrating how all layers align.

### Example 1 — Coin / Heads / 2x Booster

**Source image path:**
```
nft-assets/source-images/coin/heads-2x.png
```

**Manifest token entry:**
```json
{
  "tokenId": 1,
  "theme": "coin",
  "variant": "heads",
  "tier": "2x",
  "sourceImage": "coin/heads-2x.png"
}
```

**Token metadata attributes (excerpt):**
```json
[
  { "trait_type": "Game",       "value": "Coin"       },
  { "trait_type": "Option",     "value": "Heads"      },
  { "trait_type": "Booster",    "value": "2x Booster" },
  { "trait_type": "Multiplier", "value": "2x"         }
]
```

---

### Example 2 — Coin / Tails / 5x Booster

**Source image path:**
```
nft-assets/source-images/coin/tails-5x.png
```

**Manifest token entry:**
```json
{
  "tokenId": 2,
  "theme": "coin",
  "variant": "tails",
  "tier": "5x",
  "sourceImage": "coin/tails-5x.png"
}
```

**Token metadata attributes (excerpt):**
```json
[
  { "trait_type": "Game",       "value": "Coin"       },
  { "trait_type": "Option",     "value": "Tails"      },
  { "trait_type": "Booster",    "value": "5x Booster" },
  { "trait_type": "Multiplier", "value": "5x"         }
]
```

---

### Example 3 — Dice / 1 / 3x Booster

**Source image path:**
```
nft-assets/source-images/dice/1-3x.png
```

**Manifest token entry:**
```json
{
  "tokenId": 201,
  "theme": "dice",
  "variant": "1",
  "tier": "3x",
  "sourceImage": "dice/1-3x.png"
}
```

**Token metadata attributes (excerpt):**
```json
[
  { "trait_type": "Game",       "value": "Dice"       },
  { "trait_type": "Option",     "value": "1"          },
  { "trait_type": "Booster",    "value": "3x Booster" },
  { "trait_type": "Multiplier", "value": "3x"         }
]
```

---

### Example 4 — RPS / Rock / 2x Booster

**Source image path:**
```
nft-assets/source-images/rps/rock-2x.png
```

**Manifest token entry:**
```json
{
  "tokenId": 401,
  "theme": "rps",
  "variant": "rock",
  "tier": "2x",
  "sourceImage": "rps/rock-2x.png"
}
```

**Token metadata attributes (excerpt):**
```json
[
  { "trait_type": "Game",       "value": "Rock Paper Scissors" },
  { "trait_type": "Option",     "value": "Rock"                },
  { "trait_type": "Booster",    "value": "2x Booster"          },
  { "trait_type": "Multiplier", "value": "2x"                  }
]
```

---

### Example 5 — RPS / Scissors / 5x Booster

**Source image path:**
```
nft-assets/source-images/rps/scissors-5x.png
```

**Manifest token entry:**
```json
{
  "tokenId": 402,
  "theme": "rps",
  "variant": "scissors",
  "tier": "5x",
  "sourceImage": "rps/scissors-5x.png"
}
```

**Token metadata attributes (excerpt):**
```json
[
  { "trait_type": "Game",       "value": "Rock Paper Scissors" },
  { "trait_type": "Option",     "value": "Scissors"            },
  { "trait_type": "Booster",    "value": "5x Booster"          },
  { "trait_type": "Multiplier", "value": "5x"                  }
]
```

---

## 8. Rules for Future Additions or Replacements

### Adding a new variant to an existing theme

1. Choose a canonical variant key: lowercase, hyphen-safe, file-system-friendly.
2. Add the file at `nft-assets/source-images/{theme}/{newVariant}-{tier}.png` for each tier.
3. Register the new key in `VALID_MANIFEST_VARIANTS_BY_THEME` in `scripts/validate-nft-assets.js`.
4. Update the `expectedSourceImagePath` logic if the new variant requires special handling.
5. Update the canonical variant tables in §§ 1.2 and 3 of [`docs/nft-assets-spec.md`](nft-assets-spec.md) and in § 3 of this document.
6. Add matching display-name entries to `VARIANT_TO_OPTION_DISPLAY` in `scripts/validate-nft-assets.js`.

### Adding a new theme

1. Choose a canonical theme key: lowercase, hyphen-safe.
2. Create the directory `nft-assets/source-images/{newTheme}/`.
3. Add all required `{variant}-{tier}.png` files for the new theme.
4. Register the theme and its variants in `scripts/validate-nft-assets.js` (`VALID_MANIFEST_VARIANTS_BY_THEME`, `THEME_ORDER`, `THEME_TO_GAME_DISPLAY`).
5. Update §§ 1.1, 1.2, and 2 of [`docs/nft-assets-spec.md`](nft-assets-spec.md) and §§ 2–3 of this document.

### Adding a new booster tier

1. Choose a canonical tier key matching the multiplier value (e.g. `10x`).
2. Add the file `{variant}-{newTier}.png` for every existing (theme, variant) combination.
3. Update the following constants in `scripts/validate-nft-assets.js`:
   - `VALID_MANIFEST_TIERS` — the set of canonical tier keys used in manifest `tier` fields and source image file names (e.g. `'2x'`, `'3x'`, `'5x'`)
   - `VALID_BOOSTERS` — the set of metadata `Booster` attribute values (e.g. `'2x Booster'`)
   - `VALID_MULTIPLIERS` — the set of metadata `Multiplier` attribute values (e.g. `'2x'`)
4. Update the tier table in § 1.3 of [`docs/nft-assets-spec.md`](nft-assets-spec.md) and in § 4 of this document.

### Replacing an existing source image

1. Replace the file at `nft-assets/source-images/{theme}/{variant}-{tier}.png` in place. The file name must not change.
2. Re-run the metadata generation pipeline (`node scripts/generate-nft-assets.js`) to propagate the updated image to all per-token image files that reference this source.
3. Do not change the `sourceImage` field in any manifest — the logical assignment of source image to token is stable once minting begins.

---

## 9. Consistency Rules

1. **All 33 source image slots must be present** before running metadata generation or any minting operation.
2. **File names and directory names are lowercase.** No uppercase letters, spaces, or underscores.
3. **Tier key in the file name is the multiplier identifier** (`2x`, `3x`, `5x`) — not a display string such as `2x-booster`.
4. **The theme appears in the directory, not in the file name.** `nft-assets/source-images/coin/heads-2x.png` is correct; `nft-assets/source-images/coin-heads-2x.png` is not.
5. **The `sourceImage` manifest field is the relative path** from `nft-assets/source-images/`, in the form `{theme}/{variant}-{tier}.png`.
6. **Scripts derive `sourceImage` programmatically** from `(theme, variant, tier)` using the function `expectedSourceImagePath(theme, variant, tier)` in `scripts/generate-nft-assets.js`. Manual edits to this field must match the output of that function.
7. **Canonical identifiers are the stable keys.** Display values (e.g. `"2x Booster"`, `"Rock Paper Scissors"`) appear only in token metadata JSON. They must never be used in file names, directory names, or manifest key fields.

---

## 10. Related Documents

| Document | Description |
|---|---|
| [`docs/nft-assets-spec.md`](nft-assets-spec.md) | Authoritative taxonomy, token ID mapping, static file layout, and supply manifest format — §§ 1–3 define the canonical identifiers referenced here |
| [`docs/nft-asset-manifest-spec.md`](nft-asset-manifest-spec.md) | Full manifest format including the `sourceImage` field and per-token generation fields |
| [`docs/nft-metadata-schema.md`](nft-metadata-schema.md) | Token metadata attribute schema — defines valid values for `Game`, `Option`, `Booster`, and `Multiplier` |
| [`scripts/generate-nft-assets.js`](../scripts/generate-nft-assets.js) | Metadata generation script — `expectedSourceImagePath` function implements this spec |
| [`scripts/validate-nft-assets.js`](../scripts/validate-nft-assets.js) | Asset validation script — enforces naming rules and checks that every `sourceImage` path referenced by the manifest exists under `source-images/`; a full collection manifest should reference all 33 unique source images |
| [`docs/nft-metadata-generation.md`](nft-metadata-generation.md) | Generation script usage and release workflow integration |
