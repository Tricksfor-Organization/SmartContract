# NFT Copy Specification — Display Names and Description Templates

This document is the authoritative source of truth for all user-facing copy in Tricksfor
Booster NFT metadata: collection names, token names, and token descriptions.

Metadata generation scripts, marketplaces, and content pipelines must derive display text
from this specification. Where this document conflicts with draft text found in other documents,
this document takes precedence.

---

## 1. Collection Naming

Each blockchain deployment has its own named collection. The collection name follows the pattern:

```
Tricksfor Boosters - [Chain Name]
```

Where `[Chain Name]` is the short user-facing display name of the chain.

| Chain     | Collection name                     |
|-----------|-------------------------------------|
| Ethereum  | `Tricksfor Boosters - Ethereum`     |
| Polygon   | `Tricksfor Boosters - Polygon`      |
| Optimism  | `Tricksfor Boosters - Optimism`     |
| BSC       | `Tricksfor Boosters - BSC`          |
| Avalanche | `Tricksfor Boosters - Avalanche`    |

The chain name used here is the same short display name used in
[`docs/nft-collection-spec.md` § 1](nft-collection-spec.md#1-collection-naming). Use the
canonical chain identifier (e.g. `BSC`, not `BNB Smart Chain`) in the collection title.

---

## 2. Tier Display Labels

Three booster tiers exist across all themes. The table below shows the canonical identifier,
the metadata attribute value, and the user-facing label used in names and descriptions.

| Canonical identifier | `Booster` attribute value | User-facing label |
|----------------------|---------------------------|-------------------|
| `2x`                 | `"2x Booster"`            | `2x Booster`      |
| `3x`                 | `"3x Booster"`            | `3x Booster`      |
| `5x`                 | `"5x Booster"`            | `5x Booster`      |

Use the exact label (e.g. `2x Booster`) wherever the tier must appear in user-facing copy.
Do not use ordinal labels such as `Tier 1`, `Tier 2`, or `Bronze / Silver / Gold`.

---

## 3. Theme and Option Display Names

### 3.1 Theme display names

| Canonical identifier | Metadata `Game` value   | Display name used in token names |
|----------------------|-------------------------|----------------------------------|
| `coin`               | `"Coin"`                | `Coin`                           |
| `dice`               | `"Dice"`                | `Dice`                           |
| `rps`                | `"Rock Paper Scissors"` | `Rock Paper Scissors`            |

The full name `Rock Paper Scissors` is used verbatim in token names and descriptions.
The abbreviation `RPS` may appear in file names, code, and internal identifiers, but
**not** in user-facing metadata copy.

### 3.2 Option display names

| Theme                | Canonical identifier | Display name |
|----------------------|----------------------|--------------|
| Coin                 | `heads`              | `Heads`      |
| Coin                 | `tails`              | `Tails`      |
| Dice                 | `1`                  | `1`          |
| Dice                 | `2`                  | `2`          |
| Dice                 | `3`                  | `3`          |
| Dice                 | `4`                  | `4`          |
| Dice                 | `5`                  | `5`          |
| Dice                 | `6`                  | `6`          |
| Rock Paper Scissors  | `rock`               | `Rock`       |
| Rock Paper Scissors  | `paper`              | `Paper`      |
| Rock Paper Scissors  | `scissors`           | `Scissors`   |

---

## 4. Token Name Template

### 4.1 Final naming pattern

```
Tricksfor {Game} {Option} {multiplier} Booster #{tokenId}
```

Where:

| Placeholder    | Value source                                                               |
|----------------|----------------------------------------------------------------------------|
| `{Game}`       | Theme display name from § 3.1 (e.g. `Coin`, `Dice`, `Rock Paper Scissors`)|
| `{Option}`     | Option display name from § 3.2 (e.g. `Heads`, `6`, `Rock`)               |
| `{multiplier}` | Multiplier value from the `Multiplier` attribute (`2x`, `3x`, `5x`)       |
| `{tokenId}`    | On-chain token ID (integer, no padding)                                    |

### 4.2 Name examples

| Token ID | Theme               | Option   | Tier | Token name                                               |
|----------|---------------------|----------|------|----------------------------------------------------------|
| 1        | Coin                | Heads    | 2x   | `Tricksfor Coin Heads 2x Booster #1`                     |
| 51       | Coin                | Tails    | 3x   | `Tricksfor Coin Tails 3x Booster #51`                    |
| 186      | Coin                | Heads    | 5x   | `Tricksfor Coin Heads 5x Booster #186`                   |
| 201      | Dice                | 1        | 2x   | `Tricksfor Dice 1 2x Booster #201`                       |
| 278      | Dice                | 6        | 3x   | `Tricksfor Dice 6 3x Booster #278`                       |
| 395      | Dice                | 3        | 5x   | `Tricksfor Dice 3 5x Booster #395`                       |
| 401      | Rock Paper Scissors | Rock     | 2x   | `Tricksfor Rock Paper Scissors Rock 2x Booster #401`     |
| 423      | Rock Paper Scissors | Rock     | 5x   | `Tricksfor Rock Paper Scissors Rock 5x Booster #423`     |
| 530      | Rock Paper Scissors | Scissors | 3x   | `Tricksfor Rock Paper Scissors Scissors 3x Booster #530` |

### 4.3 Formatting rules

- The `#` prefix before the token ID is required. No space between `#` and the number.
- The word `Booster` always follows the multiplier (`2x Booster`, not `Booster 2x`).
- No punctuation between theme, option, multiplier, and token ID segments.
- The full `Rock Paper Scissors` name is used. Do not abbreviate to `RPS` in token names.
- Dice option values are bare digits (`1`–`6`), not words (`One`, `Six`) or prefixed forms (`Face 1`).

---

## 5. Token Description Template

### 5.1 Template

```
A Tricksfor {Game} Booster NFT for the {Option} outcome. Stake this NFT to activate a
{multiplier} reward boost during eligible Tricksfor gameplay. An unstaked Booster confers
no in-game advantage. Subject to platform rules.
```

Where:

| Placeholder    | Value source                                                               |
|----------------|----------------------------------------------------------------------------|
| `{Game}`       | Theme display name from § 3.1 (e.g. `Coin`, `Dice`, `Rock Paper Scissors`)|
| `{Option}`     | Option display name from § 3.2 (e.g. `Heads`, `6`, `Rock`)               |
| `{multiplier}` | Multiplier value from the `Multiplier` attribute (`2x`, `3x`, `5x`)       |

The description is a single paragraph rendered as one line in JSON. The line break above is
for readability in this document only.

### 5.2 Wording decisions

| Decision | Rationale |
|---|---|
| "eligible Tricksfor gameplay" | Scope-limits the boost to the Tricksfor platform without overpromising. |
| "can activate a … reward boost" is avoided — uses "activate" instead | "Can activate" implies uncertainty; staking is the definitive activation mechanism. |
| "Subject to platform rules." | Communicates that the platform retains control over reward conditions without detailing them in metadata. |
| "An unstaked Booster confers no in-game advantage." | Directly addresses marketplace buyers who may not know the staking requirement. |
| No reference to token ID or chain in the description | Keeps the description stable and reusable; token ID is in the name and chain is optional metadata. |
| Reward settlement not mentioned | Reward calculation is off-chain. Metadata describes the booster's function, not its settlement mechanics. |

### 5.3 Rendered description examples

#### Coin — Heads — 2x Booster

```
A Tricksfor Coin Booster NFT for the Heads outcome. Stake this NFT to activate a 2x reward boost during eligible Tricksfor gameplay. An unstaked Booster confers no in-game advantage. Subject to platform rules.
```

#### Coin — Tails — 3x Booster

```
A Tricksfor Coin Booster NFT for the Tails outcome. Stake this NFT to activate a 3x reward boost during eligible Tricksfor gameplay. An unstaked Booster confers no in-game advantage. Subject to platform rules.
```

#### Coin — Heads — 5x Booster

```
A Tricksfor Coin Booster NFT for the Heads outcome. Stake this NFT to activate a 5x reward boost during eligible Tricksfor gameplay. An unstaked Booster confers no in-game advantage. Subject to platform rules.
```

#### Dice — 1 — 2x Booster

```
A Tricksfor Dice Booster NFT for the 1 outcome. Stake this NFT to activate a 2x reward boost during eligible Tricksfor gameplay. An unstaked Booster confers no in-game advantage. Subject to platform rules.
```

#### Dice — 6 — 3x Booster

```
A Tricksfor Dice Booster NFT for the 6 outcome. Stake this NFT to activate a 3x reward boost during eligible Tricksfor gameplay. An unstaked Booster confers no in-game advantage. Subject to platform rules.
```

#### Dice — 3 — 5x Booster

```
A Tricksfor Dice Booster NFT for the 3 outcome. Stake this NFT to activate a 5x reward boost during eligible Tricksfor gameplay. An unstaked Booster confers no in-game advantage. Subject to platform rules.
```

#### Rock Paper Scissors — Rock — 2x Booster

```
A Tricksfor Rock Paper Scissors Booster NFT for the Rock outcome. Stake this NFT to activate a 2x reward boost during eligible Tricksfor gameplay. An unstaked Booster confers no in-game advantage. Subject to platform rules.
```

#### Rock Paper Scissors — Paper — 3x Booster

```
A Tricksfor Rock Paper Scissors Booster NFT for the Paper outcome. Stake this NFT to activate a 3x reward boost during eligible Tricksfor gameplay. An unstaked Booster confers no in-game advantage. Subject to platform rules.
```

#### Rock Paper Scissors — Scissors — 5x Booster

```
A Tricksfor Rock Paper Scissors Booster NFT for the Scissors outcome. Stake this NFT to activate a 5x reward boost during eligible Tricksfor gameplay. An unstaked Booster confers no in-game advantage. Subject to platform rules.
```

---

## 6. Complete Token Metadata Examples

The following examples show how name and description compose into a complete metadata JSON
for each theme. See [`docs/nft-metadata-schema.md`](nft-metadata-schema.md) for the full
attribute schema.

### Coin — Heads — 2x Booster

```json
{
  "name": "Tricksfor Coin Heads 2x Booster #1",
  "description": "A Tricksfor Coin Booster NFT for the Heads outcome. Stake this NFT to activate a 2x reward boost during eligible Tricksfor gameplay. An unstaked Booster confers no in-game advantage. Subject to platform rules.",
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

### Coin — Tails — 3x Booster

```json
{
  "name": "Tricksfor Coin Tails 3x Booster #51",
  "description": "A Tricksfor Coin Booster NFT for the Tails outcome. Stake this NFT to activate a 3x reward boost during eligible Tricksfor gameplay. An unstaked Booster confers no in-game advantage. Subject to platform rules.",
  "image": "https://nft.tricksfor.com/images/51.png",
  "external_url": "https://tricksfor.com/boosters/51",
  "attributes": [
    { "trait_type": "Game",       "value": "Coin"       },
    { "trait_type": "Option",     "value": "Tails"      },
    { "trait_type": "Booster",    "value": "3x Booster" },
    { "trait_type": "Multiplier", "value": "3x"         }
  ]
}
```

### Coin — Heads — 5x Booster

```json
{
  "name": "Tricksfor Coin Heads 5x Booster #186",
  "description": "A Tricksfor Coin Booster NFT for the Heads outcome. Stake this NFT to activate a 5x reward boost during eligible Tricksfor gameplay. An unstaked Booster confers no in-game advantage. Subject to platform rules.",
  "image": "https://nft.tricksfor.com/images/186.png",
  "external_url": "https://tricksfor.com/boosters/186",
  "attributes": [
    { "trait_type": "Game",       "value": "Coin"       },
    { "trait_type": "Option",     "value": "Heads"      },
    { "trait_type": "Booster",    "value": "5x Booster" },
    { "trait_type": "Multiplier", "value": "5x"         }
  ]
}
```

### Dice — 1 — 2x Booster

```json
{
  "name": "Tricksfor Dice 1 2x Booster #201",
  "description": "A Tricksfor Dice Booster NFT for the 1 outcome. Stake this NFT to activate a 2x reward boost during eligible Tricksfor gameplay. An unstaked Booster confers no in-game advantage. Subject to platform rules.",
  "image": "https://nft.tricksfor.com/images/201.png",
  "external_url": "https://tricksfor.com/boosters/201",
  "attributes": [
    { "trait_type": "Game",       "value": "Dice"       },
    { "trait_type": "Option",     "value": "1"          },
    { "trait_type": "Booster",    "value": "2x Booster" },
    { "trait_type": "Multiplier", "value": "2x"         }
  ]
}
```

### Dice — 6 — 3x Booster

```json
{
  "name": "Tricksfor Dice 6 3x Booster #278",
  "description": "A Tricksfor Dice Booster NFT for the 6 outcome. Stake this NFT to activate a 3x reward boost during eligible Tricksfor gameplay. An unstaked Booster confers no in-game advantage. Subject to platform rules.",
  "image": "https://nft.tricksfor.com/images/278.png",
  "external_url": "https://tricksfor.com/boosters/278",
  "attributes": [
    { "trait_type": "Game",       "value": "Dice"       },
    { "trait_type": "Option",     "value": "6"          },
    { "trait_type": "Booster",    "value": "3x Booster" },
    { "trait_type": "Multiplier", "value": "3x"         }
  ]
}
```

### Dice — 3 — 5x Booster

```json
{
  "name": "Tricksfor Dice 3 5x Booster #395",
  "description": "A Tricksfor Dice Booster NFT for the 3 outcome. Stake this NFT to activate a 5x reward boost during eligible Tricksfor gameplay. An unstaked Booster confers no in-game advantage. Subject to platform rules.",
  "image": "https://nft.tricksfor.com/images/395.png",
  "external_url": "https://tricksfor.com/boosters/395",
  "attributes": [
    { "trait_type": "Game",       "value": "Dice"       },
    { "trait_type": "Option",     "value": "3"          },
    { "trait_type": "Booster",    "value": "5x Booster" },
    { "trait_type": "Multiplier", "value": "5x"         }
  ]
}
```

### Rock Paper Scissors — Rock — 2x Booster

```json
{
  "name": "Tricksfor Rock Paper Scissors Rock 2x Booster #401",
  "description": "A Tricksfor Rock Paper Scissors Booster NFT for the Rock outcome. Stake this NFT to activate a 2x reward boost during eligible Tricksfor gameplay. An unstaked Booster confers no in-game advantage. Subject to platform rules.",
  "image": "https://nft.tricksfor.com/images/401.png",
  "external_url": "https://tricksfor.com/boosters/401",
  "attributes": [
    { "trait_type": "Game",       "value": "Rock Paper Scissors" },
    { "trait_type": "Option",     "value": "Rock"                },
    { "trait_type": "Booster",    "value": "2x Booster"          },
    { "trait_type": "Multiplier", "value": "2x"                  }
  ]
}
```

### Rock Paper Scissors — Paper — 3x Booster

```json
{
  "name": "Tricksfor Rock Paper Scissors Paper 3x Booster #468",
  "description": "A Tricksfor Rock Paper Scissors Booster NFT for the Paper outcome. Stake this NFT to activate a 3x reward boost during eligible Tricksfor gameplay. An unstaked Booster confers no in-game advantage. Subject to platform rules.",
  "image": "https://nft.tricksfor.com/images/468.png",
  "external_url": "https://tricksfor.com/boosters/468",
  "attributes": [
    { "trait_type": "Game",       "value": "Rock Paper Scissors" },
    { "trait_type": "Option",     "value": "Paper"               },
    { "trait_type": "Booster",    "value": "3x Booster"          },
    { "trait_type": "Multiplier", "value": "3x"                  }
  ]
}
```

### Rock Paper Scissors — Scissors — 5x Booster

```json
{
  "name": "Tricksfor Rock Paper Scissors Scissors 5x Booster #423",
  "description": "A Tricksfor Rock Paper Scissors Booster NFT for the Scissors outcome. Stake this NFT to activate a 5x reward boost during eligible Tricksfor gameplay. An unstaked Booster confers no in-game advantage. Subject to platform rules.",
  "image": "https://nft.tricksfor.com/images/423.png",
  "external_url": "https://tricksfor.com/boosters/423",
  "attributes": [
    { "trait_type": "Game",       "value": "Rock Paper Scissors" },
    { "trait_type": "Option",     "value": "Scissors"            },
    { "trait_type": "Booster",    "value": "5x Booster"          },
    { "trait_type": "Multiplier", "value": "5x"                  }
  ]
}
```

---

## 7. Consistency Rules

1. **Token names must exactly follow the template in § 4.1.** No abbreviations, no reordering,
   no alternate separators.
2. **Token descriptions must exactly follow the template in § 5.1.** Wording must not be changed
   per token beyond the three substitution variables (`{Game}`, `{Option}`, `{multiplier}`).
3. **Tier labels must use the exact form `2x Booster`, `3x Booster`, or `5x Booster`.** Do not
   use `Tier 1`, `Bronze`, or any other synonym.
4. **`Rock Paper Scissors` is never abbreviated to `RPS` in user-facing copy.** The abbreviation
   is for internal identifiers only.
5. **The `Booster` and `Multiplier` metadata attributes must remain consistent with the name
   and description.** A token named `…2x Booster…` must carry `"Booster": "2x Booster"` and
   `"Multiplier": "2x"`.
6. **Descriptions must not promise specific financial outcomes.** Phrases such as "you will
   receive", "guaranteed reward", or "earn X tokens" are prohibited. Use "activate a reward
   boost" and "subject to platform rules" to set correct expectations.
7. **Collection names must use the exact chain display name** from § 1. Do not substitute
   alternative chain names (e.g. `BNB Smart Chain` instead of `BSC`).

---

## 8. Related Documents

| Document | Description |
|---|---|
| [`docs/nft-metadata-schema.md`](nft-metadata-schema.md) | Attribute schema, field requirements, and attribute consistency rules |
| [`docs/nft-collection-spec.md`](nft-collection-spec.md) | Collection structure, theme taxonomy, tier taxonomy, and token ID allocation |
| [`docs/nft-assets-spec.md`](nft-assets-spec.md) | Asset taxonomy, token ID mapping, and static file layout |
| [`docs/nft-asset-manifest-spec.md`](nft-asset-manifest-spec.md) | Manifest format and description template variable reference |
| [`docs/metadata/token-example.json`](metadata/token-example.json) | Reference token metadata JSON |
