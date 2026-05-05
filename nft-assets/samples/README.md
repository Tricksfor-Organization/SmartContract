# Sample Token Metadata — Review Set

This directory contains representative sample token metadata JSON files for the Tricksfor
Booster NFT collection. They are committed here for team review and marketplace-format
review before bulk generation is treated as final.

---

## Coverage

The nine samples cover all three game themes, all three booster tiers, and a representative
spread of options within each theme.

| File                    | Token ID | Theme               | Option   | Tier         |
|-------------------------|----------|---------------------|----------|--------------|
| `coin-heads-2x.json`    | 1        | Coin                | Heads    | 2x Booster   |
| `coin-tails-3x.json`    | 136      | Coin                | Tails    | 3x Booster   |
| `coin-heads-5x.json`    | 171      | Coin                | Heads    | 5x Booster   |
| `dice-1-2x.json`        | 201      | Dice                | 1        | 2x Booster   |
| `dice-4-3x.json`        | 337      | Dice                | 4        | 3x Booster   |
| `dice-6-5x.json`        | 396      | Dice                | 6        | 5x Booster   |
| `rps-rock-2x.json`      | 401      | Rock Paper Scissors | Rock     | 2x Booster   |
| `rps-paper-3x.json`     | 525      | Rock Paper Scissors | Paper    | 3x Booster   |
| `rps-scissors-5x.json`  | 591      | Rock Paper Scissors | Scissors | 5x Booster   |

Token IDs are the first ID of each respective allocation block, derived from the
deterministic allocation rules in [`docs/nft-token-allocation-spec.md`](../../docs/nft-token-allocation-spec.md).

---

## Metadata Format

Each file follows the OpenSea metadata standard with the four required Tricksfor attributes:

```json
{
  "name": "Tricksfor {Game} {Option} {multiplier} Booster #{tokenId}",
  "description": "A Tricksfor {Game} Booster NFT for the {Option} outcome. Stake this NFT to activate a {multiplier} reward boost during eligible Tricksfor gameplay. An unstaked Booster confers no in-game advantage. Subject to platform rules.",
  "image": "https://nft.tricksfor.com/ethereum/images/{tokenId}.png",
  "external_url": "https://tricksfor.com/boosters/{tokenId}",
  "attributes": [
    { "trait_type": "Game",       "value": "{Game}"       },
    { "trait_type": "Option",     "value": "{Option}"     },
    { "trait_type": "Booster",    "value": "{multiplier} Booster" },
    { "trait_type": "Multiplier", "value": "{multiplier}" }
  ]
}
```

Image URLs use `ethereum` as the representative chain key. The full collection uses the
appropriate chain key for each deployment — one of: `ethereum`, `polygon`, `bsc`, `avalanche`,
`optimism`.

---

## Token ID Allocation Reference

Token IDs follow the deterministic layout from [`docs/nft-token-allocation-spec.md`](../../docs/nft-token-allocation-spec.md):

| Theme               | 2x Booster block | 3x Booster block | 5x Booster block |
|---------------------|-----------------|-----------------|-----------------|
| Coin                | 1 – 100         | 101 – 170       | 171 – 200       |
| Dice                | 201 – 300       | 301 – 370       | 371 – 400       |
| Rock Paper Scissors | 401 – 500       | 501 – 570       | 571 – 600       |

---

## Related Documents

| Document | Description |
|---|---|
| [`docs/nft-metadata-schema.md`](../../docs/nft-metadata-schema.md) | Full attribute schema and metadata field rules |
| [`docs/nft-copy-spec.md`](../../docs/nft-copy-spec.md) | Authoritative token name and description templates |
| [`docs/nft-token-allocation-spec.md`](../../docs/nft-token-allocation-spec.md) | Deterministic token ID allocation rules |
| [`nft-assets/sample/`](../sample/) | Full Coin-theme Ethereum validation sample (200 tokens) |
