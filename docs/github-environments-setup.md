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
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token with **Cloudflare Pages: Edit** permission |

> **Security:** These values must never be committed, logged, or passed as workflow inputs. They are injected exclusively via the GitHub Environment secrets mechanism.

---

## Variables (per environment)

Set the following **Environment Variables** for each environment:

| Variable name         | Required | Description                                                    | Example                |
|-----------------------|----------|----------------------------------------------------------------|------------------------|
| `CHAIN_ID`            | Yes      | EVM chain ID for the target network                           | `11155111`             |
| `DEPLOY_ENV`          | Yes      | GitHub Environment name (must match the environment name exactly) | `ethereum-sepolia`  |
| `NETWORK_KEY`         | Yes      | Hardhat network name for the `--network` flag during verification | `sepolia`          |
| `CLOUDFLARE_ACCOUNT_ID` | Yes    | Cloudflare account ID (visible in the dashboard URL)          | `a1b2c3d4e5f6...`      |
| `CF_PAGES_PROJECT`    | Yes      | Cloudflare Pages project name for NFT asset hosting           | `tricksfor-nft`        |
| `NFT_BASE_DOMAIN`     | No       | Custom domain for the Pages site (without protocol or trailing slash); falls back to `{project}.pages.dev` | `nft.tricksfor.com` |
| `VERIFY_ENABLED`      | No       | Set to `true` to enable block-explorer verification           | `true`                 |
| `NUGET_PUBLISH_ENABLED` | No     | Set to `true` to publish the NuGet package on deploy          | `false`                |
| `EXPLORER_NAME`       | No       | Human-readable block explorer name, written to the deployment manifest's `verification.explorerName` field | `Etherscan` |
| `EXPLORER_BASE_URL`   | No       | Block explorer contract browser URL prefix (without trailing slash), used to build `verification.explorerUrl` | `https://etherscan.io/address` |

`EXPLORER_NAME` and `EXPLORER_BASE_URL` are optional convenience fields. If not set, `verification.explorerName` and `verification.explorerUrl` in the manifest will be empty strings. They are useful for operators who want rich manifest output and have no impact on whether verification succeeds or fails.

For Cloudflare Pages setup details, see [`docs/cloudflare-pages-setup.md`](cloudflare-pages-setup.md).

### NETWORK_KEY values per environment

| Environment name   | `NETWORK_KEY` value | `EXPLORER_NAME`              | `EXPLORER_BASE_URL`                         |
|--------------------|---------------------|------------------------------|---------------------------------------------|
| `ethereum-sepolia`  | `sepolia`           | `Etherscan (Sepolia)`        | `https://sepolia.etherscan.io/address`      |
| `ethereum-mainnet`  | `mainnet`           | `Etherscan`                  | `https://etherscan.io/address`              |
| `polygon-amoy`      | `polygon_amoy`      | `PolygonScan (Amoy)`         | `https://amoy.polygonscan.com/address`      |
| `polygon-mainnet`   | `polygon`           | `PolygonScan`                | `https://polygonscan.com/address`           |
| `optimism-sepolia`  | `optimism_sepolia`  | `Optimism Explorer (Sepolia)`| `https://sepolia-optimism.etherscan.io/address` |
| `optimism-mainnet`  | `optimism`          | `Optimism Explorer`          | `https://optimistic.etherscan.io/address`   |
| `bsc-testnet`       | `bsc_testnet`       | `BscScan (Testnet)`          | `https://testnet.bscscan.com/address`       |
| `bsc-mainnet`       | `bsc`               | `BscScan`                    | `https://bscscan.com/address`               |
| `avalanche-fuji`    | `avalanche_fuji`    | `Snowtrace (Fuji)`           | `https://testnet.snowtrace.io/address`      |
| `avalanche-mainnet` | `avalanche`         | `Snowtrace`                  | `https://snowtrace.io/address`              |

---

## Repository-Level Secrets

Set the following **Repository Secrets** under **Settings → Secrets and variables → Actions**:

| Secret name    | Description                                                         |
|----------------|---------------------------------------------------------------------|
| `NUGET_API_KEY` | nuget.org API key for publishing `Tricksfor.SmartContracts` |

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

1. Ensure the target GitHub Environment is configured with all required secrets and variables (including Cloudflare Pages credentials — see [`docs/cloudflare-pages-setup.md`](cloudflare-pages-setup.md)).
2. Ensure the `DEPLOY_ENV` repository variable (or the target environment's `DEPLOY_ENV` variable) is set to the desired environment name.
3. Ensure all token metadata JSON files and images are present under `nft-assets/` before publishing the release.
4. Update `deployments/config/{env}/deployment-params.json` if NFT name, symbol, or royalty parameters need to change (base URI and contract URI are resolved from the `deploy-metadata` job automatically).
5. Publish a GitHub Release with the appropriate tag:
   - Stable releases (`v1.2.3`) can target any environment, including mainnet.
   - Pre-release tags (`v1.2.3-rc.1`, `v1.2.3-beta.1`) are restricted to testnet environments.
6. If the target is a mainnet environment, approve the deployment when prompted by GitHub's required reviewers gate.

---

## Adding a New Network

1. Create a GitHub Environment named `{chain}-{stage}` and populate its secrets and variables using the tables above (including `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `CF_PAGES_PROJECT`, and optionally `NFT_BASE_DOMAIN`).
2. Add an entry to the network tables in this document.
3. Add a new `deployments/config/{chain}-{stage}/deployment-params.json` file.
4. Ensure the Hardhat network and verification configuration in `hardhat.config.ts` includes the new chain.
5. No changes to the workflow file are required.
