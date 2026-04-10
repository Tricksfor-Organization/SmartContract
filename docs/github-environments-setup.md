# GitHub Environments Setup

This document describes the required GitHub configuration for the release deployment workflow (`release-deploy.yml`).

For the deployment architecture and design decisions, see [`docs/release-deployment-architecture.md`](release-deployment-architecture.md).

---

## Required GitHub Environments

Create one GitHub Environment per deploy target under **Settings → Environments**:

| Environment name  | Chain             | Stage   |
|-------------------|-------------------|---------|
| `ethereum-sepolia` | Ethereum          | Testnet |
| `ethereum-mainnet` | Ethereum          | Mainnet |
| `polygon-amoy`    | Polygon           | Testnet |
| `polygon-mainnet` | Polygon           | Mainnet |
| `optimism-sepolia` | Optimism          | Testnet |
| `optimism-mainnet` | Optimism          | Mainnet |
| `bsc-testnet`     | BNB Smart Chain   | Testnet |
| `bsc-mainnet`     | BNB Smart Chain   | Mainnet |
| `avalanche-fuji`  | Avalanche         | Testnet |
| `avalanche-mainnet` | Avalanche       | Mainnet |

---

## Environment Protection Rules

### All `*-mainnet` environments

Configure the following protections under **Settings → Environments → {env-name}**:

- **Required reviewers**: add at least one named approver; the deployment will be paused until approved.
- **Deployment branches**: restrict to the repository's default branch (or a specific release branch pattern).
- **Wait timer** (optional): 5 minutes provides a cancellation window.

### Testnet environments

No approvals required. Auto-deploy on release.

---

## Secrets (per environment)

Set the following **Environment Secrets** for each environment:

| Secret name          | Description                                       |
|----------------------|---------------------------------------------------|
| `RPC_URL`            | JSON-RPC endpoint URL for the target network      |
| `DEPLOYER_PRIVATE_KEY` | Hex-encoded private key of the deployer wallet  |
| `EXPLORER_API_KEY`   | Block explorer API key (required if `VERIFY_ENABLED=true`) |

> **Security:** These values must never be committed, logged, or passed as workflow inputs. They are injected exclusively via the GitHub Environment secrets mechanism.

---

## Variables (per environment)

Set the following **Environment Variables** for each environment:

| Variable name         | Required | Description                                                    | Example                |
|-----------------------|----------|----------------------------------------------------------------|------------------------|
| `CHAIN_ID`            | Yes      | EVM chain ID for the target network                           | `11155111`             |
| `DEPLOY_ENV`          | Yes      | GitHub Environment name (must match the environment name exactly) | `ethereum-sepolia`  |
| `NETWORK_KEY`         | Yes      | Hardhat network name for the `--network` flag during verification | `sepolia`          |
| `VERIFY_ENABLED`      | No       | Set to `true` to enable block-explorer verification           | `true`                 |
| `NUGET_PUBLISH_ENABLED` | No     | Set to `true` to publish the NuGet package on deploy          | `false`                |

### NETWORK_KEY values per environment

| Environment name   | `NETWORK_KEY` value |
|--------------------|---------------------|
| `ethereum-sepolia`  | `sepolia`           |
| `ethereum-mainnet`  | `mainnet`           |
| `polygon-amoy`      | `polygon_amoy`      |
| `polygon-mainnet`   | `polygon`           |
| `optimism-sepolia`  | `optimism_sepolia`  |
| `optimism-mainnet`  | `optimism`          |
| `bsc-testnet`       | `bsc_testnet`       |
| `bsc-mainnet`       | `bsc`               |
| `avalanche-fuji`    | `avalanche_fuji`    |
| `avalanche-mainnet` | `avalanche`         |

---

## Repository-Level Secrets

Set the following **Repository Secrets** under **Settings → Secrets and variables → Actions**:

| Secret name    | Description                                                         |
|----------------|---------------------------------------------------------------------|
| `NUGET_API_KEY` | nuget.org API key for publishing `Tricksfor.Blockchain.Nethereum` |

---

## Repository-Level Variables

Set the following **Repository Variable** under **Settings → Secrets and variables → Actions → Variables**:

| Variable name | Required | Description                                                                    |
|---------------|----------|--------------------------------------------------------------------------------|
| `DEPLOY_ENV`  | Yes      | The target GitHub Environment for deployments (e.g. `ethereum-sepolia`). Must be set as a repository-level variable — the `resolve-environment` job runs without an environment scope and can only read repository-level variables. |

---

## Deployment Parameter Files

Non-secret constructor arguments (NFT name, symbol, URIs, royalty config) are stored in checked-in JSON files:

```
deployments/config/
├── ethereum-sepolia/deployment-params.json
├── ethereum-mainnet/deployment-params.json
├── polygon-amoy/deployment-params.json
├── polygon-mainnet/deployment-params.json
├── optimism-sepolia/deployment-params.json
├── optimism-mainnet/deployment-params.json
├── bsc-testnet/deployment-params.json
├── bsc-mainnet/deployment-params.json
├── avalanche-fuji/deployment-params.json
└── avalanche-mainnet/deployment-params.json
```

Edit the appropriate file before deploying to update NFT name, symbol, base URI, contract URI, or royalty configuration for that network. See [`docs/release-deployment-architecture.md`](release-deployment-architecture.md#6-deployment-parameter-model) for the full parameter schema.

---

## Triggering a Deployment

1. Ensure the target GitHub Environment is configured with all required secrets and variables.
2. Ensure the `DEPLOY_ENV` repository variable (or the target environment's `DEPLOY_ENV` variable) is set to the desired environment name.
3. Update `deployments/config/{env}/deployment-params.json` if NFT parameters need to change.
4. Publish a GitHub Release with the appropriate tag:
   - Stable releases (`v1.2.3`) can target any environment, including mainnet.
   - Pre-release tags (`v1.2.3-rc.1`, `v1.2.3-beta.1`) are restricted to testnet environments.
5. If the target is a mainnet environment, approve the deployment when prompted by GitHub's required reviewers gate.

---

## Adding a New Network

1. Create a GitHub Environment named `{chain}-{stage}` and populate its secrets and variables using the tables above.
2. Add an entry to the network tables in this document.
3. Add a new `deployments/config/{chain}-{stage}/deployment-params.json` file.
4. Ensure the Hardhat network and verification configuration in `hardhat.config.ts` includes the new chain.
5. No changes to the workflow file are required.
