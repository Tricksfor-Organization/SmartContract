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
and ERC-2981 royalties. Minting is role-gated (`MINTER_ROLE`), administration uses delayed
`AccessControlDefaultAdminRules`, and minting can be paused by the default admin. The documented
collection policy is 600 tokens across three game themes (Coin, Dice, Rock
Paper Scissors) — a project specification constraint, not an on-chain enforced supply cap.

### `TricksforBoosterStaking`

Custodial staking contract. Players transfer their Booster NFTs into this contract to stake them.
Emits integration-critical events consumed by the Tricksfor backend indexer:

```solidity
event TokenStaked(address indexed staker, uint256 indexed tokenId, uint256 stakedAt);
event TokenUnstaked(address indexed staker, uint256 indexed tokenId, uint256 unstakedAt);
event EmergencyWithdrawn(address indexed originalStaker, uint256 indexed tokenId, address indexed recipient, uint256 withdrawnAt);
```

Read methods (`isStaked`, `stakedOwnerOf`) reflect on-chain custody and event state. Ownership uses
`Ownable2Step`; emergency withdrawals can only return tracked tokens to their original staker, and
`rescueUntrackedToken` recovers only NFTs accidentally sent with direct `transferFrom`. Reward
calculation and game settlement remain off-chain.

---

## Repository Structure

```
contracts/                     Solidity source (TricksforBoosterNFT, TricksforBoosterStaking)
interfaces/                    Solidity interfaces
libraries/                     Solidity library helpers
test/                          Hardhat contract tests
tests/                         .NET test projects (unit, integration, deployment)
scripts/                       Asset generation, validation, and deployment scripts
SmartContract.sln              Root .NET solution used by CI and operators
src/
  Tricksfor.Blockchain.Booster/          NuGet package — Nethereum DTOs, services, ABI/BIN
  Tricksfor.Blockchain.Booster.Deploy/   Deployment runner (not packaged)
nft-assets/
  source-images/               33 canonical PNG source images (coin/dice/rps × variant × tier)
  manifests/                   Chain-specific asset manifests
  {chain}/                     Generated Cloudflare Pages output for each chain
deployments/config/            Per-environment deployment parameters
docs/                          All implementation guides and specifications
```

---

## Quick Start

```bash
# Node.js 22 LTS is required
npm ci

# Compile contracts
npm run compile

# Run tests
npm run test

# Run tests with coverage
npm run test:coverage

# Prepare the exact build information consumed by Slither 0.11.5
npm run security:prepare

# Build and test every retained .NET project
dotnet test SmartContract.sln
```

---

## NFT Metadata Generation

Use the environment manifest to produce chain-specific token and collection metadata:

```bash
node scripts/generate-nft-assets.js --env ethereum-sepolia --force
```

Output:

```
nft-assets/{chain}/metadata/{tokenId}.json   ← token metadata (1–600)
nft-assets/{chain}/contract/collection.json  ← collection metadata
```

See [`docs/generate-assets.md`](docs/generate-assets.md) for the full option reference,
examples, and CI integration guide.

### Validate generated assets

```bash
node scripts/validate-nft-assets.js --env ethereum-sepolia --manifest-only
node scripts/validate-nft-assets.js --env ethereum-sepolia --chain-key ethereum --output-only
npm run validate:output    # validate generated metadata output
npm run test:snapshots     # snapshot tests for NFT metadata
```

---

## Deployment Pipeline

Automation is split by responsibility:

| Workflow | Purpose |
|---|---|
| `CI` | Exact artifact check, Solidity/.NET tests, metadata checks, package inspection, workflow lint, audits |
| `Deploy testnet` | Manual, protected, one Alchemy-backed testnet at a time, followed by verification and smoke flow |
| `Deploy mainnet` | Manual stable-tag workflow; currently blocked by the production smoke and royalty issues in the runbook |
| `Release NuGet package` | Publishes one package per release, independently of network deployment |
| `Execute reviewed mainnet mint plan` | Dry-run or resumable minting from a separately reviewed token-recipient plan |

The current reusable deployment targets exactly one network and:

1. Deploys NFT metadata and images to Cloudflare Pages (`nft.tricksfor.com`)
2. Deploys both contracts to the target network
3. Verifies contracts on the block explorer (if `VERIFY_ENABLED=true`)
4. Runs a mint/approve/stake/event-decode/unstake smoke flow and publishes records

The state-changing smoke flow is appropriate for controlled testnets but currently also runs in the
mainnet workflow. Mainnet deployment is therefore blocked until it is replaced by a read-only path.
Generated collection metadata also needs an explicit fee recipient synchronized with the on-chain
royalty receiver.

All 33 committed source PNGs are placeholders. Testnets can publish them with warnings for technical
validation; mainnet metadata is blocked until final artwork and the collection image are supplied.
Contract deployment without metadata publication is valid only when the configured URLs already
contain the intended content and pass preflight.

See the current [`docs/deployment.md`](docs/deployment.md) operator guide for protected environment
configuration, workflow behavior, Alchemy testnet rollout, recovery, and artifacts.

---

## Nethereum / NuGet Package

The `Tricksfor.SmartContracts` NuGet package (project:
`src/Tricksfor.Blockchain.Booster/`) provides the C# integration layer for .NET consumers:

- Typed event DTOs, including the three preserved staking events and additive admin/rescue events
- Function message types for staking and NFT interactions
- Deployment message types (`TricksforBoosterNFTDeployment`, `TricksforBoosterStakingDeployment`)
- `BoosterStakingService` and `BoosterNFTService` high-level wrappers
- Embedded ABI and bytecode for both contracts

The hardened constructors are a breaking deployment-message change and are released as package 2.x.

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
| Automated security review | [`docs/security-review-2026-07-19.md`](docs/security-review-2026-07-19.md) |
| Hardened deployment | [`docs/deployment.md`](docs/deployment.md) |
| OpenSea readiness checklist | [`docs/opensea-readiness-checklist.md`](docs/opensea-readiness-checklist.md) |
| NuGet packaging | [`docs/nuget-packaging.md`](docs/nuget-packaging.md) |
| Cloudflare Pages setup | [`docs/cloudflare-pages-setup.md`](docs/cloudflare-pages-setup.md) |
