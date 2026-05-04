# Validation Sample — Coin Theme · Ethereum Chain

This directory contains the validation sample for the Tricksfor Booster NFT collection.
It covers the complete **Coin** theme (token IDs 1–200) on the **Ethereum** chain, which is
the recommended scope for pre-rollout inspection because Coin has the simplest even-split
distribution (2 options × 3 tiers = 6 blocks).

Use this sample to validate the generation pipeline — naming templates, descriptions,
attribute schema, image URL pattern, and token ID allocation — before full-scale output
is treated as final.

---

## What This Sample Covers

| Dimension        | Value                                           |
|------------------|-------------------------------------------------|
| Chain            | Ethereum (`ethereum`)                           |
| Theme            | Coin (`coin`)                                   |
| Options          | Heads, Tails (2 options)                        |
| Tiers            | 2x Booster, 3x Booster, 5x Booster (3 tiers)   |
| Token IDs        | 1–200 (all Coin tokens in the full collection)  |
| Total files      | 200 token metadata JSON + 1 collection JSON     |

---

## Token ID Allocation

Token IDs follow the deterministic allocation algorithm documented in
[`docs/nft-token-allocation-spec.md`](../../docs/nft-token-allocation-spec.md).

For the Coin theme on any chain, the allocation is:

| Block          | Option | Tier | Count | Token IDs |
|----------------|--------|------|-------|-----------|
| Coin·Heads·2x  | Heads  | 2x   | 50    | 1–50      |
| Coin·Tails·2x  | Tails  | 2x   | 50    | 51–100    |
| Coin·Heads·3x  | Heads  | 3x   | 35    | 101–135   |
| Coin·Tails·3x  | Tails  | 3x   | 35    | 136–170   |
| Coin·Heads·5x  | Heads  | 5x   | 15    | 171–185   |
| Coin·Tails·5x  | Tails  | 5x   | 15    | 186–200   |
| **Total**      |        |      | **200** | **1–200** |

The 2x tier splits evenly (100 ÷ 2 = 50 each).
The 3x tier splits evenly (70 ÷ 2 = 35 each).
The 5x tier splits evenly (30 ÷ 2 = 15 each).

---

## Directory Structure

```
nft-assets/sample/
├── README.md                     ← this file
├── ethereum/
│   ├── metadata/                 ← token metadata JSON files (IDs 1–200)
│   │   ├── 1.json                   Coin · Heads · 2x  (first in block)
│   │   ├── 50.json                  Coin · Heads · 2x  (last in block)
│   │   ├── 51.json                  Coin · Tails · 2x  (first in block)
│   │   ├── 100.json                 Coin · Tails · 2x  (last in block)
│   │   ├── 101.json                 Coin · Heads · 3x  (first in block)
│   │   ├── 135.json                 Coin · Heads · 3x  (last in block)
│   │   ├── 136.json                 Coin · Tails · 3x  (first in block)
│   │   ├── 170.json                 Coin · Tails · 3x  (last in block)
│   │   ├── 171.json                 Coin · Heads · 5x  (first in block)
│   │   ├── 185.json                 Coin · Heads · 5x  (last in block)
│   │   ├── 186.json                 Coin · Tails · 5x  (first in block)
│   │   └── 200.json                 Coin · Tails · 5x  (last in block)
│   └── contract/
│       └── collection.json       ← Ethereum collection metadata (contractURI output)
├── _redirects                    ← Cloudflare Pages rewrite rules (extensionless → .json)
└── _headers                      ← Cloudflare Pages response headers (CORS, content-type)
```

---

## Metadata Format

Each token metadata file (`ethereum/metadata/{tokenId}.json`) follows the OpenSea standard:

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

---

## Validation Checklist

Use the following checklist when inspecting the sample. Cross-reference each rule against
the relevant specification document.

### Naming template (`docs/nft-copy-spec.md`)

- [ ] Name format is `Tricksfor {Game} {Option} {tier} Booster #{tokenId}`
- [ ] `Game` = `Coin` for all tokens in this sample
- [ ] `Option` alternates between `Heads` (IDs 1–50, 101–135, 171–185) and
      `Tails` (IDs 51–100, 136–170, 186–200)
- [ ] `tier` is `2x`, `3x`, or `5x` (exact string, not `"2x Booster"`)
- [ ] `tokenId` suffix matches the filename (e.g. `1.json` → `#1`)

### Description template (`docs/nft-copy-spec.md` § 5.1)

- [ ] Description begins: `"A Tricksfor Coin Booster NFT for the {Option} outcome."`
- [ ] Middle clause: `"Stake this NFT to activate a {tier} reward boost during eligible
      Tricksfor gameplay."`
- [ ] Ends: `"An unstaked Booster confers no in-game advantage. Subject to platform rules."`

### Attribute schema (`docs/nft-metadata-schema.md`)

- [ ] `"Game"` attribute present and equals `"Coin"` for all tokens
- [ ] `"Option"` attribute present; value is `"Heads"` or `"Tails"`
- [ ] `"Booster"` attribute present; value is `"2x Booster"`, `"3x Booster"`, or `"5x Booster"`
- [ ] `"Multiplier"` attribute present; value is `"2x"`, `"3x"`, or `"5x"`
- [ ] `"Chain"` attribute present and equals `"Ethereum"` for all tokens in this sample
- [ ] Attribute order: Game → Option → Booster → Multiplier → Chain

### Image URL pattern

- [ ] Image URL format: `https://nft.tricksfor.com/ethereum/images/{tokenId}.png`
- [ ] Token ID in URL matches the file's token ID (e.g. ID 1 → `.../images/1.png`)
- [ ] No `.json` suffix in the image URL

### Token ID allocation (`docs/nft-token-allocation-spec.md`)

- [ ] IDs 1–50: Coin · Heads · 2x (50 tokens; 100 ÷ 2 = 50)
- [ ] IDs 51–100: Coin · Tails · 2x (50 tokens)
- [ ] IDs 101–135: Coin · Heads · 3x (35 tokens; 70 ÷ 2 = 35)
- [ ] IDs 136–170: Coin · Tails · 3x (35 tokens)
- [ ] IDs 171–185: Coin · Heads · 5x (15 tokens; 30 ÷ 2 = 15)
- [ ] IDs 186–200: Coin · Tails · 5x (15 tokens)
- [ ] No gaps or overlaps: IDs 1–200 are contiguous and complete

### Collection metadata (`ethereum/contract/collection.json`)

- [ ] `"name"` = `"Tricksfor Boosters - Ethereum"`
- [ ] `"image"` = `"https://nft.tricksfor.com/ethereum/images/collection.png"`
- [ ] `"external_link"` = `"https://tricksfor.com/boosters"`
- [ ] `"seller_fee_basis_points"` = `500` (5% royalty)
- [ ] `"fee_recipient"` is the placeholder (`0x…dEaD`) — **must be replaced before mainnet**

---

## Regenerating This Sample

```bash
# Regenerate from scratch (overwrites existing files)
npm run generate:sample

# Or equivalently:
node scripts/generate-nft-metadata.js --chain ethereum --theme coin --output nft-assets/sample --force
```

The `--theme coin` flag restricts output to the Coin theme's 200 tokens while preserving
globally consistent token IDs (IDs remain 1–200, matching the full-collection ordering).

---

## Relation to Full Generated Output

This sample is a strict subset of the full generated output at
[`nft-assets/generated/`](../generated/). Every file in this sample directory
is byte-for-byte identical to the corresponding file in
`nft-assets/generated/ethereum/metadata/`.

The full generated output covers all five chains × 600 tokens = 3,000 token metadata files.
This sample covers only the Coin theme on Ethereum (200 files) to keep the review scope
manageable before full-scale rollout.

---

## Related Documents

| Document | Description |
|---|---|
| [`docs/nft-token-allocation-spec.md`](../../docs/nft-token-allocation-spec.md) | Token ID assignment rules |
| [`docs/nft-metadata-schema.md`](../../docs/nft-metadata-schema.md) | Attribute schema and valid values |
| [`docs/nft-copy-spec.md`](../../docs/nft-copy-spec.md) | Naming and description templates |
| [`docs/nft-metadata-generation.md`](../../docs/nft-metadata-generation.md) | Generation script reference |
| [`nft-assets/generated/`](../generated/) | Full pre-generated output (all chains) |
