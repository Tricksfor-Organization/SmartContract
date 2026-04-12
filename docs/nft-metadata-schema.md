# NFT Token Metadata Attribute Schema

This document defines the final, authoritative token metadata attribute schema for all Tricksfor
Booster NFT collections. All token metadata JSON files must conform to this schema.

---

## Top-Level Metadata Fields

Every token metadata file must include the following top-level fields:

| Field          | Required | Type   | Description                                          |
|----------------|----------|--------|------------------------------------------------------|
| `name`         | ✅       | string | Display name of the token (e.g. `"Tricksfor Booster #1"`) |
| `description`  | ✅       | string | Human-readable description of the token              |
| `image`        | ✅       | string | URI to the token image (IPFS `ipfs://` or HTTPS)     |
| `external_url` | optional | string | Link to the token detail page on tricksfor.com       |
| `attributes`   | ✅       | array  | Array of trait objects (see below)                   |

### Token URI format

The NFT contract uses the OpenZeppelin default `tokenURI` pattern:
`tokenURI(id) = {baseURI}{id}` — **no `.json` suffix**.

With `baseURI = https://nft.tricksfor.com/metadata/`, `tokenURI(1)` returns
`https://nft.tricksfor.com/metadata/1`.

Static metadata files are named `{tokenId}.json` (e.g. `metadata/1.json`). A
Cloudflare Pages rewrite rule in `nft-assets/_redirects` transparently maps
extensionless requests (`/metadata/1`) to the corresponding file (`/metadata/1.json`),
so the on-chain URI resolves correctly without renaming the files.

---

## Required Attributes

Each token must include the following four attributes inside the `attributes` array. Each entry
is an object with `"trait_type"` and `"value"` keys.

### `Game` — Game Theme

Identifies which Tricksfor mini-game this Booster NFT belongs to.

| `trait_type` | Valid `value` options           |
|--------------|---------------------------------|
| `"Game"`     | `"Coin"`                        |
|              | `"Dice"`                        |
|              | `"Rock Paper Scissors"`         |

---

### `Option` — Game Option

Identifies the specific outcome or choice this Booster NFT is associated with. Valid values
depend on the `Game` attribute.

| `Game` value            | Valid `Option` values                                     |
|-------------------------|-----------------------------------------------------------|
| `"Coin"`                | `"Heads"`, `"Tails"`                                      |
| `"Dice"`                | `"1"`, `"2"`, `"3"`, `"4"`, `"5"`, `"6"`                 |
| `"Rock Paper Scissors"` | `"Rock"`, `"Paper"`, `"Scissors"`                         |

---

### `Booster` — Booster Tier

Identifies the booster tier, which determines how it is visually represented and described.

| `trait_type` | Valid `value` options |
|--------------|-----------------------|
| `"Booster"`  | `"2x Booster"`        |
|              | `"3x Booster"`        |
|              | `"5x Booster"`        |

---

### `Multiplier` — Display Multiplier Text

A short, human-readable label for the multiplier. This attribute exists for visual consistency
and OpenSea display purposes. It mirrors the multiplier tier embedded in the `Booster` attribute.

| `trait_type`   | Valid `value` options |
|----------------|-----------------------|
| `"Multiplier"` | `"2x"`                |
|                | `"3x"`                |
|                | `"5x"`                |

> **Note:** The `Multiplier` attribute is descriptive metadata only. It is **not** the source of
> truth for reward calculation. Reward multipliers are enforced off-chain by the reward settlement
> system, which reads staking events from the blockchain. See
> [Descriptive vs. Business-Logic Boundary](#descriptive-vs-business-logic-boundary) below.

---

## Optional Attributes

The following attributes may be included when producing metadata for multi-chain or multi-edition
deployments to make individual collections distinguishable.

| `trait_type`    | Example `value`                                        | Notes                                        |
|-----------------|--------------------------------------------------------|----------------------------------------------|
| `"Chain"`       | `"Ethereum"`, `"Polygon"`, `"BNB Chain"`, `"Avalanche"` | Name of the chain the token is deployed on  |
| `"Collection"`  | `"Tricksfor Booster — Season 1"`                       | Friendly name for the release group          |
| `"Edition"`     | `"Genesis"`, `"Season 1"`, `"Season 2"`                | Edition or supply group identifier           |

These attributes are informational. They do not affect staking behaviour or reward settlement.

---

## Descriptive vs. Business-Logic Boundary

**Metadata attributes are descriptive. They are not the source of truth for settlement logic.**

| Concern                        | Where it lives                                           |
|--------------------------------|----------------------------------------------------------|
| Multiplier display text        | Token metadata (`Multiplier` attribute)                  |
| Booster tier display label     | Token metadata (`Booster` attribute)                     |
| Game theme and option          | Token metadata (`Game` and `Option` attributes)          |
| Actual reward multiplier value | Off-chain reward settlement system (reads staking events)|
| Whether a boost is active      | Staking contract state (`isStaked`) + `TokenStaked` events |

The staking contract records **staking state** and emits **events** (`TokenStaked`,
`TokenUnstaked`). The reward settlement system is a separate off-chain component that:

1. Reads `TokenStaked` / `TokenUnstaked` events from the chain.
2. Determines the multiplier to apply from its own configuration, not from token metadata.
3. Settles rewards accordingly.

Token metadata is static. Changing a `Multiplier` value in a metadata JSON file does **not**
change how the reward system treats that token.

---

## Attribute Mapping: Booster Tier ↔ Multiplier

The `Booster` and `Multiplier` attributes are always paired. The valid combinations are:

| `Booster` value | `Multiplier` value |
|-----------------|--------------------|
| `"2x Booster"`  | `"2x"`             |
| `"3x Booster"`  | `"3x"`             |
| `"5x Booster"`  | `"5x"`             |

Do not mix a `Booster` tier with an inconsistent `Multiplier` value.

---

## Example Token Metadata JSON

### Coin — Heads — 2x Booster

```json
{
  "name": "Tricksfor Booster #1",
  "description": "A Tricksfor Booster NFT. Stake this NFT to activate a reward boost during gameplay. An unstaked Booster confers no in-game advantage.",
  "image": "https://nft.tricksfor.com/images/1.png",
  "external_url": "https://tricksfor.com/boosters/1",
  "attributes": [
    { "trait_type": "Game",       "value": "Coin"       },
    { "trait_type": "Option",     "value": "Heads"      },
    { "trait_type": "Booster",    "value": "2x Booster" },
    { "trait_type": "Multiplier", "value": "2x"         }
  ]
}
```

---

### Coin — Tails — 5x Booster

```json
{
  "name": "Tricksfor Booster #2",
  "description": "A Tricksfor Booster NFT. Stake this NFT to activate a reward boost during gameplay. An unstaked Booster confers no in-game advantage.",
  "image": "https://nft.tricksfor.com/images/2.png",
  "external_url": "https://tricksfor.com/boosters/2",
  "attributes": [
    { "trait_type": "Game",       "value": "Coin"       },
    { "trait_type": "Option",     "value": "Tails"      },
    { "trait_type": "Booster",    "value": "5x Booster" },
    { "trait_type": "Multiplier", "value": "5x"         }
  ]
}
```

---

### Dice — 4 — 3x Booster

```json
{
  "name": "Tricksfor Booster #3",
  "description": "A Tricksfor Booster NFT. Stake this NFT to activate a reward boost during gameplay. An unstaked Booster confers no in-game advantage.",
  "image": "https://nft.tricksfor.com/images/3.png",
  "external_url": "https://tricksfor.com/boosters/3",
  "attributes": [
    { "trait_type": "Game",       "value": "Dice"       },
    { "trait_type": "Option",     "value": "4"          },
    { "trait_type": "Booster",    "value": "3x Booster" },
    { "trait_type": "Multiplier", "value": "3x"         }
  ]
}
```

---

### Rock Paper Scissors — Rock — 2x Booster

```json
{
  "name": "Tricksfor Booster #4",
  "description": "A Tricksfor Booster NFT. Stake this NFT to activate a reward boost during gameplay. An unstaked Booster confers no in-game advantage.",
  "image": "https://nft.tricksfor.com/images/4.png",
  "external_url": "https://tricksfor.com/boosters/4",
  "attributes": [
    { "trait_type": "Game",       "value": "Rock Paper Scissors" },
    { "trait_type": "Option",     "value": "Rock"                },
    { "trait_type": "Booster",    "value": "2x Booster"          },
    { "trait_type": "Multiplier", "value": "2x"                  }
  ]
}
```

---

### Rock Paper Scissors — Scissors — 5x Booster

```json
{
  "name": "Tricksfor Booster #5",
  "description": "A Tricksfor Booster NFT. Stake this NFT to activate a reward boost during gameplay. An unstaked Booster confers no in-game advantage.",
  "image": "https://nft.tricksfor.com/images/5.png",
  "external_url": "https://tricksfor.com/boosters/5",
  "attributes": [
    { "trait_type": "Game",       "value": "Rock Paper Scissors" },
    { "trait_type": "Option",     "value": "Scissors"            },
    { "trait_type": "Booster",    "value": "5x Booster"          },
    { "trait_type": "Multiplier", "value": "5x"                  }
  ]
}
```

---

## Consistency Rules

1. **All four required attributes (`Game`, `Option`, `Booster`, `Multiplier`) must be present** in every token metadata file. Omitting any of them is invalid.
2. **`Option` must be valid for its `Game`.**  For example, `"Option": "Heads"` is only valid when `"Game": "Coin"`. Using `"Heads"` with `"Game": "Dice"` is invalid.
3. **`Booster` and `Multiplier` must be consistent.** `"2x Booster"` always pairs with `"2x"`, and so on.
4. **Attribute keys are case-sensitive.** Use the exact capitalisation shown: `"Game"`, `"Option"`, `"Booster"`, `"Multiplier"`.
5. **The `Multiplier` attribute is for display and metadata consistency only.** It does not drive reward logic. Off-chain settlement reads staking events, not metadata.
6. **Optional attributes (`Chain`, `Collection`, `Edition`) are informational** and do not affect contract behaviour or reward settlement.

---

## Related Documents

| Document | Description |
|---|---|
| [`docs/nft-assets-spec.md`](nft-assets-spec.md) | NFT asset taxonomy, token ID mapping, and static file layout specification |
| [`docs/metadata/token-example.json`](metadata/token-example.json) | Reference token metadata JSON using the finalised schema |
| [`docs/metadata/contract-example.json`](metadata/contract-example.json) | Reference collection metadata JSON returned by `contractURI()` |
| [`docs/metadata/README.md`](metadata/README.md) | Metadata folder overview and OpenSea standard reference |
| [`docs/opensea-readiness-checklist.md`](opensea-readiness-checklist.md) | Pre-launch OpenSea compatibility checklist |
| [`docs/backend-integration-contract.md`](backend-integration-contract.md) | How backend services consume staking events |
| [`nft-assets/README.md`](../nft-assets/README.md) | Static asset hosting and URL conventions |
