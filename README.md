# SmartContract

Tricksfor Booster NFT smart contracts — ERC-721 collection and staking, deployed across five
EVM chains (Ethereum, Polygon, Optimism, BNB Smart Chain, Avalanche).

---

## Contents

- [Contracts](#contracts)
- [Repository Structure](#repository-structure)
- [Quick Start](#quick-start)
- [NFT Metadata Generation](#nft-metadata-generation)
- [Deployment Pipeline](#deployment-pipeline)
- [Nethereum / NuGet Package](#nethereum--nuget-package)
- [Documentation](#documentation)

---

## Contracts

Two independent Solidity contracts are deployed per chain:

### `TricksforBoosterNFT`

ERC-721 NFT collection (OpenZeppelin). OpenSea-compatible: supports `tokenURI`, `contractURI`,
and ERC-2981 royalties. Minting is role-gated (`MINTER_ROLE`) and can be paused by the default
admin. Contains 600 tokens per chain across three game themes: Coin, Dice, and Rock Paper
Scissors.

### `TricksforBoosterStaking`

Custodial staking contract. Players transfer their Booster NFTs into this contract to stake them.
Emits integration-critical events consumed by the Tricksfor backend indexer:

```solidity
event TokenStaked(address indexed staker, uint256 indexed tokenId, uint256 stakedAt);
event TokenUnstaked(address indexed staker, uint256 indexed tokenId, uint256 unstakedAt);
event EmergencyWithdrawn(address indexed originalStaker, uint256 indexed tokenId, address indexed recipient, uint256 withdrawnAt);
```

Read methods (`isStaked`, `stakedOwnerOf`) always reflect on-chain truth and are guaranteed to
be consistent with the event log. Reward calculation and game settlement are off-chain.

---

## Repository Structure

```
contracts/                     Solidity source (TricksforBoosterNFT, TricksforBoosterStaking)
interfaces/                    Solidity interfaces
libraries/                     Solidity library helpers
test/ & tests/                 Hardhat tests
scripts/                       Asset generation, validation, and deployment scripts
src/
  Tricksfor.Blockchain.Booster/          NuGet package — Nethereum DTOs, services, ABI/BIN
  Tricksfor.Blockchain.Booster.Deploy/   Deployment runner (not packaged)
  Tricksfor.Blockchain.Nethereum/        Nethereum integration helpers
nft-assets/
  source-images/               33 canonical PNG source images (coin/dice/rps × variant × tier)
  manifests/                   Chain-specific asset manifests
  generated/                   Cloudflare Pages output (token + collection metadata)
deployments/config/            Per-environment deployment parameters
docs/                          All implementation guides and specifications
```

---

## Quick Start

```bash
# Install Node.js dependencies
npm install

# Compile contracts
npm run compile

# Run tests
npm run test

# Run tests with coverage
npm run test:coverage
```

---

## NFT Metadata Generation

Use `generate-assets` to produce chain-specific token metadata and collection metadata
into `nft-assets/generated/`:

```bash
# Generate metadata for a single chain
npm run generate-assets -- --chain polygon

# Generate from a manifest file
npm run generate-assets -- --manifest nft-assets/manifests/polygon.full.json

# Generate for all 5 mainnet chains
npm run generate-assets -- --all-mainnet --force
```

Output:

```
nft-assets/generated/{chain}/metadata/{tokenId}.json   ← token metadata (1–600)
nft-assets/generated/{chain}/contract/collection.json  ← collection metadata
```

See [`docs/generate-assets.md`](docs/generate-assets.md) for the full option reference,
examples, and CI integration guide.

### Validate generated assets

```bash
npm run validate:assets    # validate manifests and source images
npm run validate:output    # validate generated metadata output
npm run test:snapshots     # snapshot tests for NFT metadata
```

---

## Deployment Pipeline

Deployments are triggered by publishing a GitHub Release. The release tag controls the target
channel and networks:

| Tag pattern         | Channel            | Allowed targets       |
|---------------------|--------------------|-----------------------|
| `v1.2.3`            | Stable             | Mainnet or testnet    |
| `v1.2.3-rc.1`       | Release candidate  | Testnet only          |
| `v1.2.3-beta.1`     | Beta               | Testnet only          |
| `v1.2.3-alpha.1`    | Alpha              | Testnet only          |

The pipeline deploys to five mainnet chains (Ethereum, Polygon, Optimism, BSC, Avalanche) and
their corresponding testnets. Each deployment:

1. Deploys NFT metadata and images to Cloudflare Pages (`nft.tricksfor.com`)
2. Deploys both contracts to the target network
3. Verifies contracts on the block explorer (if `VERIFY_ENABLED=true`)
4. Publishes the `Tricksfor.SmartContracts` NuGet package (if `NUGET_PUBLISH_ENABLED=true`)

See [`docs/release-operations.md`](docs/release-operations.md) for the operator guide,
[`docs/release-deployment-architecture.md`](docs/release-deployment-architecture.md) for the
pipeline design, and [`docs/github-environments-setup.md`](docs/github-environments-setup.md)
for the GitHub Environments configuration reference.

---

## Nethereum / NuGet Package

The `Tricksfor.SmartContracts` NuGet package (project:
`src/Tricksfor.Blockchain.Booster/`) provides the C# integration layer for .NET consumers:

- Typed event DTOs (`TokenStakedEventDTO`, `TokenUnstakedEventDTO`, `EmergencyWithdrawnEventDTO`)
- Function message types for staking and NFT interactions
- Deployment message types (`TricksforBoosterNFTDeployment`, `TricksforBoosterStakingDeployment`)
- `BoosterStakingService` and `BoosterNFTService` high-level wrappers
- Embedded ABI and bytecode for both contracts

Published to [nuget.org](https://www.nuget.org/packages/Tricksfor.SmartContracts). Pre-release
builds are published to [GitHub Packages](https://github.com/orgs/Tricksfor-Organization/packages).

See [`docs/nuget-packaging.md`](docs/nuget-packaging.md) for versioning strategy and packaging
details.

---

## Documentation

Full documentation is indexed at [`docs/README.md`](docs/README.md). Key references:

| Area | Document |
|---|---|
| NFT collection structure | [`docs/nft-collection-spec.md`](docs/nft-collection-spec.md) |
| Token ID allocation | [`docs/nft-token-allocation-spec.md`](docs/nft-token-allocation-spec.md) |
| Token metadata schema | [`docs/nft-metadata-schema.md`](docs/nft-metadata-schema.md) |
| Asset manifest format | [`docs/nft-asset-manifest-spec.md`](docs/nft-asset-manifest-spec.md) |
| Asset validation | [`docs/nft-asset-validation.md`](docs/nft-asset-validation.md) |
| Metadata generation | [`docs/nft-metadata-generation.md`](docs/nft-metadata-generation.md) |
| NFT assets contributor guide | [`docs/nft-assets-contributor-guide.md`](docs/nft-assets-contributor-guide.md) |
| Indexing specification | [`docs/indexing-spec.md`](docs/indexing-spec.md) |
| Backend integration contract | [`docs/backend-integration-contract.md`](docs/backend-integration-contract.md) |
| Release operations | [`docs/release-operations.md`](docs/release-operations.md) |
| Deployment architecture | [`docs/release-deployment-architecture.md`](docs/release-deployment-architecture.md) |
| OpenSea readiness checklist | [`docs/opensea-readiness-checklist.md`](docs/opensea-readiness-checklist.md) |
| NuGet packaging | [`docs/nuget-packaging.md`](docs/nuget-packaging.md) |
| Cloudflare Pages setup | [`docs/cloudflare-pages-setup.md`](docs/cloudflare-pages-setup.md) |