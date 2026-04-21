# NFT Asset Manifest Specification

This document defines the **NFT asset manifest** format — the single source of truth for
generating token metadata JSON files, static image file references, collection metadata, and
mint definitions for the Tricksfor Booster NFT collection across all supported chains.

The manifest format described here extends the supply manifest introduced in
[`docs/nft-assets-spec.md` § 6](nft-assets-spec.md#6-supply-manifest) with additional fields
required by generation tooling, Cloudflare Pages publication, and validation scripts.

---

## 1. Purpose and Scope

A Tricksfor Booster NFT asset manifest serves the following consumers:

| Consumer | What it reads from the manifest |
|---|---|
| Metadata generation script | Per-token fields to produce `metadata/{tokenId}.json` |
| Image pipeline | `sourceImage` to copy or link `images/{tokenId}.png` from `images/source/` |
| Collection metadata writer | Collection-level fields to produce `contract/collection.json` |
| Cloudflare Pages publisher | `baseImageUri` / `baseMetadataUri` to validate published URLs |
| Mint-definition exporter | Token ID range and contract address to produce mint calldata |
| Validation script | All fields to cross-check metadata files, image files, and on-chain state |

---

## 2. Relationship to Existing Specifications

| Document | Relationship |
|---|---|
| [`docs/nft-assets-spec.md`](nft-assets-spec.md) | Defines taxonomy, token ID mapping rules, image naming, and the minimal supply manifest format. The asset manifest is a superset of the § 6 supply manifest. |
| [`docs/nft-metadata-schema.md`](nft-metadata-schema.md) | Defines all valid values for `theme`, `variant`, `tier`, and the token `name` and `description` format used in generated metadata files. |
| `deployments/config/{env}/nft-manifest.json` | The authoritative per-deployment manifest committed for each live environment. It must conform to this spec. |

---

## 3. Manifest Types

### 3.1 Chain-specific manifest

A chain-specific manifest describes a single contract deployment (one chain, one contract
address) and all tokens within it. It is the primary format used by generation tooling.
An authoritative manifest must contain the complete token set for the deployment — every
token ID from `1` to `supply.total`.

**Stored at:** `deployments/config/{env}/nft-manifest.json`

**Sample excerpts** (intentionally non-authoritative — see [§ 9](#9-validation-rules) for
how validators treat these files):
- `nft-assets/manifests/ethereum.sample.json`,
  `nft-assets/manifests/polygon.sample.json`,
  `nft-assets/manifests/bsc.sample.json` — chain-wide samples covering all three themes.
  Each contains the first and last token ID of every (theme, tier, variant) block as a
  format reference. Use these as the primary example of the chain-specific field set.
- `nft-assets/manifests/polygon.coin.sample.json` (coin tokens only),
  `nft-assets/manifests/ethereum.dice.sample.json` (dice tokens only).

All sample files carry a `"_note"` field and have fewer tokens than `supply.total`.
Per § 9, validation scripts skip rules 4–6 and 11–14 for these files (sequential ID,
theme grouping, and per-theme count checks). They are non-authoritative excerpts and
must not be used in place of the authoritative manifest at
`deployments/config/{env}/nft-manifest.json`.

### 3.2 Global (cross-chain) template

A global manifest describes the full multi-chain deployment plan: all supported chains,
their supply breakdowns, and shared configuration. It is used as a template to generate
or validate chain-specific manifests.

**Sample:** `nft-assets/manifests/global.sample.json`

---

## 4. Chain-Specific Manifest Format

### 4.1 Top-level fields

```json
{
  "manifestVersion": "1.0",
  "collectionName": "Tricksfor Booster NFT",
  "chain": "Polygon",
  "chainKey": "polygon",
  "network": "polygon-mainnet",
  "contract": "0x0000000000000000000000000000000000000000",
  "edition": "Genesis",
  "baseImageUri": "https://nft.tricksfor.com/images/",
  "baseMetadataUri": "https://nft.tricksfor.com/metadata/",
  "descriptionTemplate": "A Tricksfor Booster NFT. Stake this NFT to activate a reward boost during gameplay. An unstaked Booster confers no in-game advantage.",
  "supply": {
    "coin": 200,
    "dice": 200,
    "rps": 200,
    "total": 600
  },
  "tokens": [ ... ]
}
```

| Field | Required | Type | Description |
|---|---|---|---|
| `manifestVersion` | ✅ | string | Manifest schema version. Always `"1.0"` for this format. |
| `collectionName` | optional | string | Human-readable name of the NFT collection, e.g. `"Tricksfor Booster NFT"`. Useful for generation scripts and display tooling. |
| `chain` | ✅ | string | Chain display name — see [§ 7 Canonical Chain Names](#7-canonical-chain-names). |
| `chainKey` | ✅ | string | Lowercase chain key used in directory prefixes — see [§ 7](#7-canonical-chain-names). |
| `network` | ✅ | string | Environment identifier matching the `deployments/config/{env}` directory name. |
| `contract` | ✅ | string | Deployed contract address (EIP-55 checksum form). Use the zero address (`0x000...000`) before deployment. |
| `edition` | optional | string | Edition or supply group label, e.g. `"Genesis"`. Used in the optional `Edition` metadata attribute. |
| `baseImageUri` | ✅ | string | Base URI for token images, e.g. `"https://nft.tricksfor.com/images/"`. Combined with `{tokenId}.png` to form the `image` field in token metadata. |
| `baseMetadataUri` | ✅ | string | Base URI for token metadata, e.g. `"https://nft.tricksfor.com/metadata/"`. Must match the `BASE_TOKEN_URI` set in the deployed contract. |
| `descriptionTemplate` | optional | string | Default description string applied to every token. If omitted, each token entry must supply its own `description`. Supports template variables — see [§ 4.4](#44-description-template-variables). |
| `supply` | ✅ | object | Per-theme supply counts and total. See [§ 4.2](#42-supply-object). |
| `tokens` | ✅ | array | Ordered array of token entries, one per token ID — see [§ 4.3](#43-token-entry-fields). |

### 4.2 Supply object

```json
"supply": {
  "coin": 200,
  "dice": 200,
  "rps":  200,
  "total": 600
}
```

| Field | Required | Type | Description |
|---|---|---|---|
| `coin` | ✅ | integer | Number of coin-theme tokens in this deployment. |
| `dice` | ✅ | integer | Number of dice-theme tokens in this deployment. |
| `rps` | ✅ | integer | Number of rps-theme tokens in this deployment. |
| `total` | ✅ | integer | Must equal `coin + dice + rps`. Validated by the generation script. |

The default planned supply is **200 tokens per theme** (600 total per chain). The supply object
must be present even when all themes share the same count so that tooling can skip the arithmetic.

### 4.3 Token entry fields

```json
{
  "tokenId": 1,
  "chainKey": "polygon",
  "theme": "coin",
  "variant": "heads",
  "option": "Heads",
  "tier": "2x",
  "multiplierDisplay": "2x Booster",
  "displayName": "Tricksfor Coin Heads 2x Booster #1",
  "description": "A Tricksfor Booster NFT. Stake this NFT to activate a reward boost during gameplay. An unstaked Booster confers no in-game advantage.",
  "sourceImage": "coin-heads-2x.png",
  "imagePath": "images/1.png",
  "metadataPath": "metadata/1.json"
}
```

| Field | Required | Type | Description |
|---|---|---|---|
| `tokenId` | ✅ | integer | On-chain token ID (sequential from `1`). |
| `chainKey` | optional | string | Chain key for the token. Redundant when the manifest is chain-specific, but useful when tokens are embedded in a global manifest. Must match the collection-level `chainKey`. |
| `theme` | ✅ | string | Canonical theme identifier: `coin`, `dice`, or `rps`. |
| `variant` | ✅ | string | Canonical variant identifier — see [`docs/nft-assets-spec.md` § 1.2](nft-assets-spec.md#12-image-variants-per-theme). |
| `option` | optional | string | Pre-computed display form of `variant` for use in metadata generation (e.g. `"Heads"`, `"Rock"`, `"3"`). When present, must equal the `"Option"` metadata attribute value derived from `variant`. |
| `tier` | ✅ | string | Canonical tier identifier: `2x`, `3x`, or `5x`. |
| `multiplierDisplay` | optional | string | Pre-computed booster label derived from `tier` (e.g. `"2x Booster"`, `"3x Booster"`, `"5x Booster"`). When present, must equal the `"Booster"` metadata attribute value derived from `tier`. |
| `displayName` | ✅ | string | The resolved `name` field for the token's metadata JSON. Must follow the pattern defined in [`docs/nft-metadata-schema.md` — Token Name Convention](nft-metadata-schema.md#token-name-convention). |
| `description` | optional | string | Resolved description for this specific token. If absent, the collection-level `descriptionTemplate` is used. |
| `sourceImage` | ✅ | string | File name of the source image in `nft-assets/images/source/`, e.g. `"coin-heads-2x.png"`. |
| `imagePath` | ✅ | string | Relative path to the per-token image within the `nft-assets/` directory, e.g. `"images/1.png"`. The generation script copies `sourceImage` here. |
| `metadataPath` | ✅ | string | Relative path to the per-token metadata file within the `nft-assets/` directory, e.g. `"metadata/1.json"`. The generation script writes the metadata JSON here. |

**Computed by generation tooling from the token entry:**

The generation script derives the four required metadata attributes from token entry fields
using the lookup tables in `docs/nft-metadata-schema.md` and `docs/nft-assets-spec.md`:

| Metadata attribute | Derived from |
|---|---|
| `"Game"` value | `theme` → display name (`coin` → `"Coin"`, `rps` → `"Rock Paper Scissors"`) |
| `"Option"` value | `variant` → display name (`heads` → `"Heads"`, `1` → `"1"`, `rock` → `"Rock"`) |
| `"Booster"` value | `tier` → label (`2x` → `"2x Booster"`, `3x` → `"3x Booster"`, `5x` → `"5x Booster"`) |
| `"Multiplier"` value | `tier` → value (`2x` → `"2x"`, `3x` → `"3x"`, `5x` → `"5x"`) |
| `"Chain"` value (optional) | Collection-level `chain` display name |
| `"Edition"` value (optional) | Collection-level `edition` |

### 4.4 Description template variables

When `descriptionTemplate` is used instead of per-token `description`, the following
placeholder variables may be embedded in the template string and will be resolved per token:

| Variable | Replaced with |
|---|---|
| `{tokenId}` | The token's `tokenId` value |
| `{theme}` | The token's `theme` value (canonical identifier, e.g. `coin`) |
| `{variant}` | The token's `variant` value (canonical identifier, e.g. `heads`) |
| `{tier}` | The token's `tier` value (e.g. `2x`) |
| `{chain}` | The collection's `chain` display name (e.g. `Polygon`) |

The current standard description does not use manifest `descriptionTemplate` variables beyond
those listed above. The per-token description template defined in
[`docs/nft-copy-spec.md` § 5](nft-copy-spec.md#5-token-description-template) refers to
conceptual copy placeholders `{Game}`, `{Option}`, and `{multiplier}` for per-token
description generation; in manifest terms these correspond to the token's `theme`,
`variant`, and `tier` values, respectively, and are not additional supported
`descriptionTemplate` variables. Using the plain generic string
`"A Tricksfor Booster NFT. Stake this NFT to activate a reward boost during gameplay. An unstaked Booster confers no in-game advantage."`
is acceptable as a fallback when per-token generation is not available.

---

## 5. Global Manifest Format

A global manifest describes all chain deployments in a single file and acts as the source
of truth for generating or seeding chain-specific manifests.

### 5.1 Top-level fields

```json
{
  "manifestVersion": "1.0",
  "global": true,
  "edition": "Genesis",
  "descriptionTemplate": "A Tricksfor Booster NFT. Stake this NFT to activate a reward boost during gameplay. An unstaked Booster confers no in-game advantage.",
  "defaultSupply": {
    "coin": 200,
    "dice": 200,
    "rps": 200,
    "total": 600
  },
  "collections": [ ... ]
}
```

| Field | Required | Type | Description |
|---|---|---|---|
| `manifestVersion` | ✅ | string | Always `"1.0"`. |
| `global` | ✅ | boolean | Always `true` to distinguish from chain-specific manifests. |
| `edition` | optional | string | Edition label applied to all collections unless overridden per collection. |
| `descriptionTemplate` | optional | string | Default description template (see [§ 4.4](#44-description-template-variables)) applied to all collections unless overridden. |
| `defaultSupply` | ✅ | object | Default per-theme supply counts applied to all collections unless a collection overrides them. |
| `collections` | ✅ | array | Ordered array of collection descriptors, one per chain deployment. |

### 5.2 Collection descriptor fields

```json
{
  "chain": "Polygon",
  "chainKey": "polygon",
  "network": "polygon-mainnet",
  "contract": "0x0000000000000000000000000000000000000000",
  "baseImageUri": "https://nft.tricksfor.com/images/",
  "baseMetadataUri": "https://nft.tricksfor.com/metadata/",
  "supply": {
    "coin": 200,
    "dice": 200,
    "rps": 200,
    "total": 600
  }
}
```

| Field | Required | Type | Description |
|---|---|---|---|
| `chain` | ✅ | string | Chain display name — see [§ 7](#7-canonical-chain-names). |
| `chainKey` | ✅ | string | Lowercase chain key — see [§ 7](#7-canonical-chain-names). |
| `network` | ✅ | string | Environment identifier matching `deployments/config/{env}/`. |
| `contract` | ✅ | string | Deployed contract address, or zero address before deployment. |
| `baseImageUri` | ✅ | string | Base image URI for this deployment. |
| `baseMetadataUri` | ✅ | string | Base metadata URI for this deployment. |
| `supply` | optional | object | Per-chain supply override. If absent, `defaultSupply` from the global header is used. |
| `edition` | optional | string | Per-chain edition override. If absent, the global `edition` is used. |
| `descriptionTemplate` | optional | string | Per-chain description override. If absent, the global `descriptionTemplate` is used. |

The global manifest does **not** contain a `tokens` array. Token entries are generated by
expanding the `supply` object using the distribution algorithm in
[`docs/nft-assets-spec.md` § 5.3](nft-assets-spec.md#53-distribution-across-varianttier-combinations).

---

## 6. File Location and Naming

### 6.1 Authoritative per-deployment manifests

Authoritative manifests are stored alongside other deployment configuration:

```
deployments/
└── config/
    └── {env}/
        ├── deployment-params.json    # Contract constructor parameters
        └── nft-manifest.json         # Asset manifest for this deployment
```

Where `{env}` is the GitHub Environment name, e.g. `polygon-mainnet`, `ethereum-sepolia`.

### 6.2 Sample manifests

Sample manifests demonstrate the format and serve as templates for generating authoritative
manifests. They are stored under `nft-assets/manifests/`:

```
nft-assets/
└── manifests/
    ├── ethereum.sample.json          # Ethereum chain — all three themes, representative entries
    ├── polygon.sample.json           # Polygon chain — all three themes, representative entries
    ├── bsc.sample.json               # BNB Smart Chain — all three themes, representative entries
    ├── polygon.coin.sample.json      # Polygon chain, coin theme — representative token entries
    ├── ethereum.dice.sample.json     # Ethereum chain, dice theme — representative token entries
    └── global.sample.json            # Cross-chain global template
```

**Naming convention:**
- `{chainKey}.sample.json` — chain-wide samples covering all three themes. Use these as the
  primary reference for understanding the full manifest format and field vocabulary. These
  samples contain representative entries from every theme and every booster tier.
- `{chainKey}.{theme}.sample.json` — chain+theme-scoped samples illustrating a single theme's
  entry structure.
- `global.sample.json` — cross-chain template with no `tokens` array.

Remove the `.sample` segment for authoritative manifests stored under
`deployments/config/{env}/`.

---

## 7. Canonical Chain Names

The following identifiers must be used consistently across manifests, directory names,
and optional metadata attributes. This table is the single source of truth for chain
naming within manifest files; see also
[`docs/nft-assets-spec.md` § 7](nft-assets-spec.md#7-canonical-chain-names).

| `chain` display name | `chainKey` | Environment prefix | Optional `Chain` metadata value |
|---|---|---|---|
| `"Ethereum"` | `ethereum` | `ethereum-` | `"Ethereum"` |
| `"Polygon"` | `polygon` | `polygon-` | `"Polygon"` |
| `"BNB Smart Chain"` | `bsc` | `bsc-` | `"BNB Chain"` |
| `"Avalanche"` | `avalanche` | `avalanche-` | `"Avalanche"` |
| `"Optimism"` | `optimism` | `optimism-` | `"Optimism"` |

> **Note:** Use `"BNB Smart Chain"` for the manifest's `chain` display field and in
> deployment documentation. Use `"BNB Chain"` only for the optional `Chain` metadata attribute
> written into token metadata JSON files.

---

## 8. Generation Tooling Integration

The manifest is designed to be consumed directly by generation scripts. The expected workflow
for a generation run is:

1. **Read** the authoritative manifest from `deployments/config/{env}/nft-manifest.json`.
2. **Validate** that all token entries are present and consistent (see [§ 9](#9-validation-rules)).
3. **Generate** `nft-assets/metadata/{tokenId}.json` for each token entry, deriving metadata
   attributes from the table in [§ 4.3](#43-token-entry-fields).
4. **Copy** `nft-assets/images/source/{sourceImage}` to `nft-assets/images/{tokenId}.png`
   for each token entry.
5. **Write** `nft-assets/contract/collection.json` using collection-level manifest fields.
6. **Verify** that no source image files are missing (all 33 slots — see
   [`docs/nft-assets-spec.md` § 2](nft-assets-spec.md#2-distinct-image-asset-slots)).

### Mint-definition export

To export mint calldata for a deployment:

1. Read token IDs and supply from the authoritative manifest.
2. Pair each token ID with the contract address from `contract`.
3. Output one `safeMint(address, tokenId)` call per token.

The manifest does not encode a mint order — the generation script determines the order
based on the `tokens` array sequence.

---

## 9. Validation Rules

The rules below apply to **authoritative per-deployment manifests** stored at
`deployments/config/{env}/nft-manifest.json`. Sample and excerpt manifests (files with
`.sample.json` in their name, or any manifest whose `tokens` array covers only a theme
subset) are intentionally non-conforming and are exempt from rules 4–6 and 11–14.
Validation scripts should skip these checks when a `"_note"` field is present in the
manifest or when the manifest's token count is less than `supply.total`.

Validation scripts should check every applicable rule and report failures before any
generation or minting run begins.

1. **`manifestVersion` is present and equals `"1.0"`.**
2. **`chain`, `chainKey`, and `network` are present** and `chainKey` matches the environment
   prefix in `network` (e.g. `chainKey: "polygon"` → `network` starts with `"polygon-"`).
3. **`supply.total` equals `supply.coin + supply.dice + supply.rps`.**
4. **Token IDs are sequential**, starting from `1`, with no gaps or duplicates.
5. **Token theme grouping order is coin → dice → rps.** All coin tokens precede all dice
   tokens, which precede all rps tokens.
6. **Token count per theme matches the declared supply.** The count of entries with
   `theme: "coin"` equals `supply.coin`, and so on.
7. **`theme` is one of `coin`, `dice`, `rps`.**
8. **`variant` is valid for its `theme`** — see
   [`docs/nft-assets-spec.md` § 1.2](nft-assets-spec.md#12-image-variants-per-theme).
9. **`tier` is one of `2x`, `3x`, `5x`.**
10. **`sourceImage` matches the naming pattern `{theme}-{variant}-{tier}.png`** as defined in
    [`docs/nft-assets-spec.md` § 3](nft-assets-spec.md#3-image-source-file-naming-convention).
11. **`imagePath` equals `images/{tokenId}.png`.**
12. **`metadataPath` equals `metadata/{tokenId}.json`.**
13. **`displayName` matches the token name convention** defined in
    [`docs/nft-metadata-schema.md`](nft-metadata-schema.md#token-name-convention).
14. **All 33 source image files referenced by `sourceImage` exist** in
    `nft-assets/images/source/`.

---

## 10. Consistency Rules

These rules govern the relationship between the manifest and other repository artifacts.
They extend the consistency rules in [`docs/nft-assets-spec.md` § 9](nft-assets-spec.md#9-consistency-rules).

1. **The manifest is the authoritative record.** Metadata files and image files are derived
   outputs. Regenerate them from the manifest; do not edit them manually.
2. **The manifest `contract` address must match `deployment-params.json`** in the same
   `deployments/config/{env}/` directory once the contract is deployed.
3. **`baseMetadataUri` must match the `BASE_TOKEN_URI` in the deployed contract.** The
   release workflow validates this before publishing assets.
4. **Token IDs are stable once minted.** Never reassign a token ID to a different
   (theme, variant, tier) combination after the contract has minted that ID.
5. **`chainKey` in token entries must match the collection-level `chainKey`** in
   chain-specific manifests.
6. **Sample manifests must not be used as authoritative manifests.** Copy and rename the
   `.sample.json` file, populate all fields, and store it at
   `deployments/config/{env}/nft-manifest.json`.

---

## 11. Example: End-to-End Token Entry

The following shows how a single manifest token entry drives the full generation pipeline.

### Manifest entry

```json
{
  "tokenId": 255,
  "chainKey": "polygon",
  "theme": "dice",
  "variant": "4",
  "tier": "3x",
  "displayName": "Tricksfor Dice 4 3x Booster #255",
  "description": "A Tricksfor Booster NFT. Stake this NFT to activate a reward boost during gameplay. An unstaked Booster confers no in-game advantage.",
  "sourceImage": "dice-4-3x.png",
  "imagePath": "images/255.png",
  "metadataPath": "metadata/255.json"
}
```

### Generated token metadata (`nft-assets/metadata/255.json`)

```json
{
  "name": "Tricksfor Dice 4 3x Booster #255",
  "description": "A Tricksfor Booster NFT. Stake this NFT to activate a reward boost during gameplay. An unstaked Booster confers no in-game advantage.",
  "image": "https://nft.tricksfor.com/images/255.png",
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

### Resulting image file

```
nft-assets/images/255.png   ← copy of nft-assets/images/source/dice-4-3x.png
```

---

## 12. Related Documents

| Document | Description |
|---|---|
| [`docs/nft-assets-spec.md`](nft-assets-spec.md) | Asset taxonomy, token ID mapping, image naming, and the minimal supply manifest format |
| [`docs/nft-metadata-schema.md`](nft-metadata-schema.md) | Authoritative token metadata attribute schema (valid values, name convention, examples) |
| [`nft-assets/manifests/ethereum.sample.json`](../nft-assets/manifests/ethereum.sample.json) | Chain-wide sample manifest: Ethereum chain, all three themes |
| [`nft-assets/manifests/polygon.sample.json`](../nft-assets/manifests/polygon.sample.json) | Chain-wide sample manifest: Polygon chain, all three themes |
| [`nft-assets/manifests/bsc.sample.json`](../nft-assets/manifests/bsc.sample.json) | Chain-wide sample manifest: BNB Smart Chain, all three themes |
| [`nft-assets/manifests/polygon.coin.sample.json`](../nft-assets/manifests/polygon.coin.sample.json) | Sample manifest: Polygon chain, coin theme |
| [`nft-assets/manifests/ethereum.dice.sample.json`](../nft-assets/manifests/ethereum.dice.sample.json) | Sample manifest: Ethereum chain, dice theme |
| [`nft-assets/manifests/global.sample.json`](../nft-assets/manifests/global.sample.json) | Sample manifest: global cross-chain template |
| [`nft-assets/README.md`](../nft-assets/README.md) | Static asset hosting structure and Cloudflare Pages URL conventions |
| [`docs/cloudflare-pages-setup.md`](cloudflare-pages-setup.md) | Cloudflare Pages setup and multi-chain deployment strategy |
| [`docs/release-operations.md`](release-operations.md) | Release workflow including manifest-driven asset publication |
