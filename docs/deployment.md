# Hardened Deployment Guide

This is the operator source of truth for compiling, packaging, deploying, verifying, smoke-testing,
and minting the Tricksfor Booster contracts. Older release architecture documents describe the
superseded all-in-one release workflow and are retained only for historical context.

## Build and validation

Use Node 22 and .NET 8. Solidity is pinned to 0.8.26.

```bash
npm ci
npm run artifacts:check
npm test
npm run test:coverage
dotnet restore SmartContract.sln
dotnet build SmartContract.sln --configuration Release --no-restore
dotnet test SmartContract.sln --configuration Release --no-build
```

`npm run compile` is the only artifact-generation command. It writes deterministic Hardhat
artifacts/build information and atomically refreshes the ABI and bytecode embedded in
`Tricksfor.SmartContracts`. CI rejects any drift with `artifacts:check`.

## Protected environments

Create a GitHub Environment for every key under `deployments/config/`. Testnets are
`ethereum-sepolia`, `polygon-amoy`, `optimism-sepolia`, `bsc-testnet`, and `avalanche-fuji`.
Mainnets use the corresponding `*-mainnet` name and must require reviewers.

Environment secrets:

- `RPC_URL`: exact RPC endpoint, including the Alchemy key where applicable.
- `DEPLOYER_PRIVATE_KEY`: funded deploy/smoke account; never commit it.
- `EXPLORER_API_KEY`: Etherscan API V2 key when verification is enabled.
- `CLOUDFLARE_API_TOKEN`: required only when publishing metadata.

Environment variables:

- `ADMIN_ADDRESS`: initial delayed NFT default administrator.
- `MINTER_ADDRESS`: initial NFT `MINTER_ROLE` holder.
- `STAKING_OWNER_ADDRESS`: initial two-step staking owner.
- `NETWORK_KEY`: matching key in `hardhat.config.ts`.
- `VERIFY_ENABLED`: `true` to run explorer verification.
- `CLOUDFLARE_ACCOUNT_ID` and `CF_PAGES_PROJECT`: required for metadata publication.

On mainnet, administrator and staking-owner addresses must differ from the deployer and should be
reviewed multisigs. GitHub cannot prove an address is a multisig, so required reviewers remain an
operator control.

## Workflows

- `CI`: artifact equality, Hardhat tests/coverage, .NET tests, metadata checks, package inspection
  and consumer compilation, workflow linting, and dependency audits.
- `Deploy testnet`: manual one-testnet deployment, optional selected-chain metadata upload,
  deployment/resume, verification, and state-changing smoke test.
- `Deploy mainnet`: manual one-mainnet deployment from a stable `vMAJOR.MINOR.PATCH` release, with
  permanent records attached to that release.
- `Release NuGet package`: publishes the package once, independently of network deployments.
- `Execute reviewed mainnet mint plan`: defaults to dry-run and requires a committed recipient plan.

Every environment has a concurrency lock. Reruns reuse manifest addresses only if live bytecode is
present. Replacements require the explicit `force` input.

## Artwork and metadata gate

Source validation reads the common `nft-assets/source-images` tree; generated-output validation runs against the
selected chain directory after generation. The current 33 PNGs are placeholders, so production
metadata publication intentionally fails until final artwork replaces them and
`nft-assets/images/collection.png` is supplied. Only the selected chain
directory plus `_headers` and `_redirects` is staged for Cloudflare Pages.

Protected testnet workflows may publish the placeholder preview assets with explicit warnings so
the Alchemy smoke rollout is not blocked. Mainnet metadata uses strict validation and cannot do so.

Deployment with `deploy_metadata=false` is valid only if the configured metadata URLs are already
reachable; the runner performs that preflight before sending a transaction.

## Real testnets through Alchemy

1. Put the selected Alchemy endpoint in the protected environment's `RPC_URL`.
2. Fund the protected deployer from the network faucet.
3. Set all role/owner variables and enable verification.
4. Run `Deploy testnet` for Ethereum Sepolia first.
5. Review the manifests, verification transcripts, and `smoke-result.json` artifact.
6. Repeat for Polygon Amoy, OP Sepolia, BNB Testnet, and Avalanche Fuji.

The runner refuses to transact on a chain-ID mismatch, empty balance, failed fee estimate, malformed
or zero privileged address, or unreachable metadata. The smoke flow mints token 1, approves, stakes,
decodes `TokenStaked`, unstakes, decodes `TokenUnstaked`, and reconciles final custody.

## Local commands

Start `npx hardhat node`, export `DEPLOY_ENV=localhost`, provide the local key through
`Deployment__PrivateKey`, and run:

```bash
dotnet run --project src/Tricksfor.Blockchain.Booster.Deploy -- deploy
dotnet run --project src/Tricksfor.Blockchain.Booster.Deploy -- smoke
dotnet run --project src/Tricksfor.Blockchain.Booster.Deploy -- mint --dry-run
```

Mint plans use `deployments/mint-plans/README.md`. Production bulk minting is separate from contract
deployment and remains disabled until a recipient plan is committed and approved.

## Permanent records

Each manifest records chain, addresses, transaction status/hash/block/gas, deployer, source commit,
constructor arguments, compiler/settings, creation/runtime hashes, and final roles/owner. Smoke
records add transaction hashes, decoded events, and final state. Preserve these files with releases;
they are also the resumability inputs.
