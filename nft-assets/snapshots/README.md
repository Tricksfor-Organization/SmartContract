# NFT Metadata Snapshots — Golden Files

This directory contains **golden files** for the metadata snapshot tests.  Each
file is a committed, approved copy of the JSON document that `generate-nft-metadata.js`
must produce for a specific (chain, token) or (chain, collection) combination.

The snapshot test script (`scripts/test-metadata-snapshots.js`) regenerates each
document using the live builder functions and performs a deep-equal comparison against
the corresponding golden file here.  Any deviation — renamed field, changed value,
added or removed attribute — causes the test to fail and prints an exact diff.

---

## Directory layout

```
nft-assets/snapshots/
  ethereum/
    metadata/
      1.json    ← Coin Heads 2x Booster #1
      136.json  ← Coin Tails 3x Booster #136
      171.json  ← Coin Heads 5x Booster #171
      201.json  ← Dice 1 2x Booster #201
      337.json  ← Dice 4 3x Booster #337
      396.json  ← Dice 6 5x Booster #396
      401.json  ← RPS Rock 2x Booster #401
      525.json  ← RPS Paper 3x Booster #525
      591.json  ← RPS Scissors 5x Booster #591
    contract/
      collection.json  ← Ethereum collection metadata
  polygon/
    contract/
      collection.json  ← Polygon collection metadata
```

### Coverage

| Golden file | Token ID | Theme | Option | Tier | Notes |
|---|---|---|---|---|---|
| `ethereum/metadata/1.json` | 1 | Coin | Heads | 2x | First Coin token |
| `ethereum/metadata/136.json` | 136 | Coin | Tails | 3x | |
| `ethereum/metadata/171.json` | 171 | Coin | Heads | 5x | First 5x Coin token |
| `ethereum/metadata/201.json` | 201 | Dice | 1 | 2x | First Dice token |
| `ethereum/metadata/337.json` | 337 | Dice | 4 | 3x | |
| `ethereum/metadata/396.json` | 396 | Dice | 6 | 5x | Last Dice token |
| `ethereum/metadata/401.json` | 401 | RPS | Rock | 2x | First RPS token |
| `ethereum/metadata/525.json` | 525 | RPS | Paper | 3x | |
| `ethereum/metadata/591.json` | 591 | RPS | Scissors | 5x | Last RPS token |
| `ethereum/contract/collection.json` | — | — | — | — | Ethereum collection |
| `polygon/contract/collection.json` | — | — | — | — | Polygon collection |

Token IDs are the first ID of each respective allocation block, derived from the
deterministic allocation rules in
[`docs/nft-token-allocation-spec.md`](../../docs/nft-token-allocation-spec.md).

---

## Running the snapshot tests

```bash
# Run all snapshot comparisons
npm run test:snapshots

# or directly
node scripts/test-metadata-snapshots.js
```

A test failure means the current generator output no longer matches an approved golden
file.  Read the diff printed by the test to understand what changed.

---

## Updating golden files

If a metadata change is **intentional and approved** (e.g., a copy update, a schema
change, or a new attribute), regenerate the golden files with:

```bash
node scripts/test-metadata-snapshots.js --update
```

Then review the diff with `git diff nft-assets/snapshots/` before committing.
The updated golden files become the new approved baseline and must be included in the
same PR as the generator change that produced them.

> ⚠ **Never run `--update` to silence a failing test without understanding and approving
> the change.** The golden files are the source of truth for approved metadata output;
> they only change when metadata format or content decisions change intentionally.

---

## Related files

| File | Purpose |
|---|---|
| `scripts/test-metadata-snapshots.js` | Snapshot test runner |
| `scripts/generate-nft-metadata.js` | Metadata generator (source of builder functions) |
| `nft-assets/samples/` | Human-review drafts (not used by snapshot tests) |
| `docs/nft-metadata-schema.md` | Full attribute schema and field rules |
| `docs/nft-copy-spec.md` | Authoritative name and description templates |
