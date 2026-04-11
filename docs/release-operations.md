# Release Operations Guide

This guide is the single operator reference for configuring, triggering, and recovering the
Tricksfor SmartContract release pipeline. It covers everything an operator needs to deploy
contracts, verify them on block explorers, and publish the NuGet integration package.

For the underlying architecture and design decisions, see
[`docs/release-deployment-architecture.md`](release-deployment-architecture.md).  
For per-step GitHub repository configuration, see
[`docs/github-environments-setup.md`](github-environments-setup.md).

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [GitHub Environments](#2-github-environments)
3. [Required Secrets](#3-required-secrets)
4. [Required Variables](#4-required-variables)
5. [Deployment Parameters](#5-deployment-parameters)
6. [Release Tag Conventions](#6-release-tag-conventions)
7. [Release-to-Network Mapping](#7-release-to-network-mapping)
8. [Approval Model](#8-approval-model)
9. [Triggering a Deployment](#9-triggering-a-deployment)
10. [Workflow Job Graph](#10-workflow-job-graph)
11. [Failure Recovery](#11-failure-recovery)
12. [Artifacts](#12-artifacts)

---

## 1. Prerequisites

Before triggering any release, confirm that the following are in place:

| Prerequisite | Where to verify |
|---|---|
| Target GitHub Environment exists | **Settings → Environments** |
| All required Environment Secrets are set (including `CLOUDFLARE_API_TOKEN`) | **Settings → Environments → {env} → Secrets** |
| All required Environment Variables are set (including `CLOUDFLARE_ACCOUNT_ID`, `CF_PAGES_PROJECT`) | **Settings → Environments → {env} → Variables** |
| Repository variable `DEPLOY_ENV` is set | **Settings → Secrets and variables → Actions → Variables** |
| `NUGET_API_KEY` repository secret is set (if publishing) | **Settings → Secrets and variables → Actions → Secrets** |
| Token metadata JSON files present under `nft-assets/metadata/` | `nft-assets/metadata/` directory in the repository |
| Token image files present under `nft-assets/images/` | `nft-assets/images/` directory in the repository |
| Collection metadata present at `nft-assets/contract/collection.json` | `nft-assets/contract/collection.json` |
| Deployment params file exists for the target environment | `deployments/config/{env}/deployment-params.json` |
| Hardhat network and explorer config exists for the target | `hardhat.config.ts` |
| Cloudflare Pages project created and custom domain bound (if applicable) | [`docs/cloudflare-pages-setup.md`](cloudflare-pages-setup.md) |

If any of these are missing, the workflow will fail fast with a clear error message rather than
attempting a partial deployment.

---

## 2. GitHub Environments

Create one GitHub Environment per deploy target under **Settings → Environments**. Environment
names follow a strict `{chain}-{stage}` convention:

| Environment name   | Chain             | Stage   | Chain ID (mainnet) | Chain ID (testnet) |
|--------------------|-------------------|---------|--------------------|---------------------|
| `ethereum-sepolia` | Ethereum          | Testnet | —                  | 11155111            |
| `ethereum-mainnet` | Ethereum          | Mainnet | 1                  | —                   |
| `polygon-amoy`     | Polygon           | Testnet | —                  | 80002               |
| `polygon-mainnet`  | Polygon           | Mainnet | 137                | —                   |
| `optimism-sepolia` | Optimism          | Testnet | —                  | 11155420            |
| `optimism-mainnet` | Optimism          | Mainnet | 10                 | —                   |
| `bsc-testnet`      | BNB Smart Chain   | Testnet | —                  | 97                  |
| `bsc-mainnet`      | BNB Smart Chain   | Mainnet | 56                 | —                   |
| `avalanche-fuji`   | Avalanche         | Testnet | —                  | 43113               |
| `avalanche-mainnet`| Avalanche         | Mainnet | 43114              | —                   |

### Protection rules for mainnet environments

All `*-mainnet` environments must be configured with:

- **Required reviewers** — at least one named approver; the deployment is paused until approved.
- **Deployment branches** — restrict to the repository's default branch.
- **Wait timer** (optional) — 5 minutes provides a review and cancellation window.

### Protection rules for testnet environments

Testnet environments (`*-sepolia`, `*-amoy`, `*-testnet`, `*-fuji`) do not require approvals and
auto-deploy on every matching release event.

---

## 3. Required Secrets

### Environment secrets (per environment)

Set the following under **Settings → Environments → {env-name} → Secrets**:

| Secret name           | Required              | Description                                      |
|-----------------------|-----------------------|--------------------------------------------------|
| `RPC_URL`             | Always                | JSON-RPC endpoint URL for the target network     |
| `DEPLOYER_PRIVATE_KEY`| Always                | Hex-encoded private key of the deployer wallet   |
| `CLOUDFLARE_API_TOKEN`| Always                | Cloudflare API token with **Cloudflare Pages: Edit** permission |
| `EXPLORER_API_KEY`    | When `VERIFY_ENABLED=true` | API key for the block explorer's verification API |

> **Security rule:** These values must never be committed, logged, or passed as workflow inputs.
> They are injected exclusively via the GitHub Environment secrets mechanism and are only available
> to jobs that run within the matching environment scope. The raw `RPC_URL` must never appear in
> log output — log only non-secret metadata (environment name, chain ID) at startup.

### Repository secrets

Set the following under **Settings → Secrets and variables → Actions → Secrets**:

| Secret name    | Required              | Description                                              |
|----------------|-----------------------|----------------------------------------------------------|
| `NUGET_API_KEY`| When publishing to nuget.org | API key for pushing packages to nuget.org         |

`GITHUB_TOKEN` is provided automatically by GitHub Actions and is sufficient for pushing to
GitHub Packages (pre-release packages). No additional secret is needed for that path.

---

## 4. Required Variables

### Environment variables (per environment)

Set the following under **Settings → Environments → {env-name} → Variables**:

| Variable name          | Required | Description                                                        | Example value          |
|------------------------|----------|--------------------------------------------------------------------|------------------------|
| `CHAIN_ID`             | Yes      | EVM chain ID for the target network                                | `11155111`             |
| `NETWORK_KEY`          | Yes      | Hardhat network name for the `--network` flag during verification  | `sepolia`              |
| `CLOUDFLARE_ACCOUNT_ID`| Yes      | Cloudflare account ID (visible in the dashboard URL)               | `a1b2c3d4e5f6...`      |
| `CF_PAGES_PROJECT`     | Yes      | Cloudflare Pages project name for NFT asset hosting                | `tricksfor-nft`        |
| `NFT_BASE_DOMAIN`      | No       | Custom domain for the Pages site (no protocol or trailing slash)   | `nft.tricksfor.com`    |
| `VERIFY_ENABLED`       | No       | Set to `true` to enable block-explorer verification                | `true`                 |
| `NUGET_PUBLISH_ENABLED`| No       | Set to `true` to publish the NuGet package on deploy               | `false`                |
| `EXPLORER_NAME`        | No       | Human-readable explorer name — written to the deployment manifest  | `Etherscan`            |
| `EXPLORER_BASE_URL`    | No       | Explorer contract browser URL prefix (no trailing slash)           | `https://etherscan.io/address` |

`EXPLORER_NAME` and `EXPLORER_BASE_URL` are optional. If not set, the `verification.explorerName`
and `verification.explorerUrl` fields in the deployment manifest will be empty strings. They have
no impact on whether verification succeeds.

For Cloudflare Pages setup instructions see [`docs/cloudflare-pages-setup.md`](cloudflare-pages-setup.md).

### Repository variable

Set the following under **Settings → Secrets and variables → Actions → Variables**:

| Variable name | Required | Description |
|---|---|---|
| `DEPLOY_ENV` | Yes | Target GitHub Environment for deployments. The `resolve-environment` job runs without an environment scope and reads this repository-level variable to determine which environment to activate. Must match one of the environment names listed in [Section 2](#2-github-environments). |

> **Why a repository variable?** The `resolve-environment` job must execute before any
> environment is activated (it decides *which* environment to use). Repository variables are
> the only variables available to that job.

### Recommended variable values per environment

| Environment name    | `CHAIN_ID` | `NETWORK_KEY`      | `CF_PAGES_PROJECT` | `NFT_BASE_DOMAIN`   | `VERIFY_ENABLED` | `NUGET_PUBLISH_ENABLED` | `EXPLORER_NAME`               | `EXPLORER_BASE_URL`                             |
|---------------------|------------|--------------------|--------------------|---------------------|------------------|-------------------------|-------------------------------|--------------------------------------------------|
| `ethereum-sepolia`  | `11155111` | `sepolia`          | `tricksfor-nft`    | `nft.tricksfor.com` | `true`           | `false`                 | `Etherscan (Sepolia)`         | `https://sepolia.etherscan.io/address`          |
| `ethereum-mainnet`  | `1`        | `mainnet`          | `tricksfor-nft`    | `nft.tricksfor.com` | `true`           | `true`                  | `Etherscan`                   | `https://etherscan.io/address`                  |
| `polygon-amoy`      | `80002`    | `polygon_amoy`     | `tricksfor-nft`    | `nft.tricksfor.com` | `true`           | `false`                 | `PolygonScan (Amoy)`          | `https://amoy.polygonscan.com/address`          |
| `polygon-mainnet`   | `137`      | `polygon`          | `tricksfor-nft`    | `nft.tricksfor.com` | `true`           | `true`                  | `PolygonScan`                 | `https://polygonscan.com/address`               |
| `optimism-sepolia`  | `11155420` | `optimism_sepolia` | `tricksfor-nft`    | `nft.tricksfor.com` | `true`           | `false`                 | `Optimism Explorer (Sepolia)` | `https://sepolia-optimism.etherscan.io/address` |
| `optimism-mainnet`  | `10`       | `optimism`         | `tricksfor-nft`    | `nft.tricksfor.com` | `true`           | `true`                  | `Optimism Explorer`           | `https://optimistic.etherscan.io/address`       |
| `bsc-testnet`       | `97`       | `bsc_testnet`      | `tricksfor-nft`    | `nft.tricksfor.com` | `true`           | `false`                 | `BscScan (Testnet)`           | `https://testnet.bscscan.com/address`           |
| `bsc-mainnet`       | `56`       | `bsc`              | `tricksfor-nft`    | `nft.tricksfor.com` | `true`           | `true`                  | `BscScan`                     | `https://bscscan.com/address`                   |
| `avalanche-fuji`    | `43113`    | `avalanche_fuji`   | `tricksfor-nft`    | `nft.tricksfor.com` | `true`           | `false`                 | `Snowtrace (Fuji)`            | `https://testnet.snowtrace.io/address`          |
| `avalanche-mainnet` | `43114`    | `avalanche`        | `tricksfor-nft`    | `nft.tricksfor.com` | `true`           | `true`                  | `Snowtrace`                   | `https://snowtrace.io/address`                  |

---

## 5. Deployment Parameters

Non-secret constructor arguments (NFT name, symbol, URIs, royalty config) are stored in
checked-in JSON files — one file per target environment:

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

### File schema

```json
{
  "Deployment": {
    "Network": "ethereum-mainnet",
    "ChainId": 1,
    "DeploymentsOutputPath": "deployments",
    "Nft": {
      "Name": "TricksforBooster",
      "Symbol": "TFB",
      "BaseUri": "https://nft.tricksfor.com/metadata/",
      "ContractMetadataUri": "https://nft.tricksfor.com/contract/collection.json",
      "RoyaltyReceiver": "0xYOUR_ROYALTY_RECEIVER_ADDRESS",
      "RoyaltyFeeBasisPoints": 500
    }
  }
}
```

> **Note:** `BaseUri` and `ContractMetadataUri` in `deployment-params.json` serve as
> documentation defaults. During a release, the `deploy-metadata` workflow job resolves the
> final values from Cloudflare Pages and overrides them via environment variables
> (`Deployment__Nft__BaseUri`, `Deployment__Nft__ContractMetadataUri`). The contract is
> always deployed with the live Pages URLs regardless of what is written in this file.

### Parameter reference

| Parameter | Description | Secret? | Source |
|---|---|---|---|
| `Deployment.Network` | Deployment target name — should match `DEPLOY_ENV` | No | deployment-params.json |
| `Deployment.ChainId` | EVM chain ID — can also be set via `CHAIN_ID` env variable | No | deployment-params.json or `CHAIN_ID` variable |
| `Deployment.DeploymentsOutputPath` | Root folder where manifests are written | No | deployment-params.json |
| `Deployment.Nft.Name` | ERC-721 token name | No | deployment-params.json |
| `Deployment.Nft.Symbol` | ERC-721 token symbol | No | deployment-params.json |
| `Deployment.Nft.BaseUri` | Base URI for token metadata — **overridden at runtime** by `deploy-metadata` | No | `deploy-metadata` job output (falls back to deployment-params.json) |
| `Deployment.Nft.ContractMetadataUri` | OpenSea `contractURI()` value — **overridden at runtime** by `deploy-metadata` | No | `deploy-metadata` job output (falls back to deployment-params.json) |
| `Deployment.Nft.RoyaltyReceiver` | ERC-2981 royalty receiver address; leave `""` to use deployer address | No | deployment-params.json |
| `Deployment.Nft.RoyaltyFeeBasisPoints` | ERC-2981 royalty fee in basis points (500 = 5%) | No | deployment-params.json |
| RPC endpoint URL | JSON-RPC provider URL | **Secret** | `RPC_URL` environment secret |
| Deployer private key | Deployer wallet key | **Secret** | `DEPLOYER_PRIVATE_KEY` environment secret |
| Explorer API key | Block explorer API key | **Secret** | `EXPLORER_API_KEY` environment secret |

> **Admin and minter addresses:** The current deployment runner uses the deployer wallet as the
> default admin. If your contract supports explicit admin or minter parameters, add them to the
> `Deployment.Nft` section of the params file. These addresses are not secrets and can be committed.

### Priority order

When the same value is present in multiple sources, the highest-priority source wins:

1. Environment variables (`Deployment__RpcUrl`, `Deployment__PrivateKey`, `Deployment__ChainId`, `Deployment__Network`, `Deployment__Nft__BaseUri`, `Deployment__Nft__ContractMetadataUri`)
2. `appsettings.{DEPLOY_ENV}.json` (the per-environment params file copied into the runner output directory)
3. `appsettings.json` (default values bundled with the runner)

Secrets and workflow-resolved values injected as environment variables always take precedence
over any file-based value. `BaseUri` and `ContractMetadataUri` are always injected by the
`deploy-metadata` job, so the values in `deployment-params.json` are treated as documentation
defaults only.

---

## 6. Release Tag Conventions

The workflow is triggered by publishing a GitHub Release. The release tag determines:

- whether the release is stable or pre-release
- which environments it is allowed to target
- the NuGet package version

### Tag format rules

| Tag pattern | Channel | Allowed deploy targets | NuGet version |
|---|---|---|---|
| `v1.2.3` (exact: `^v\d+\.\d+\.\d+$`) | **Stable** | Any environment, including all mainnet | `1.2.3` |
| `v1.2.3-rc.1` | Release candidate | Testnet environments only | `1.2.3-rc.1` |
| `v1.2.3-beta.2` | Beta | Testnet environments only | `1.2.3-beta.2` |
| `v1.2.3-alpha.1` | Alpha | Testnet environments only | `1.2.3-alpha.1` |

Any tag that does not match the stable regex (`^v\d+\.\d+\.\d+$`) is treated as a pre-release
and is blocked from targeting `*-mainnet` environments. The workflow fails fast if this rule
is violated.

### NuGet version derivation

The NuGet version is the release tag with the leading `v` stripped:

```
v1.2.3       → NuGet version 1.2.3     (stable; published to nuget.org)
v1.2.3-rc.1  → NuGet version 1.2.3-rc.1  (pre-release; published to GitHub Packages only)
```

### Publishing channel by tag type

| Tag type | nuget.org | GitHub Packages |
|---|---|---|
| Stable (`v1.2.3`) | ✅ Published (when `NUGET_PUBLISH_ENABLED=true`) | — |
| Pre-release (`v1.2.3-rc.1`, etc.) | ❌ Not published | ✅ Published (when `NUGET_PUBLISH_ENABLED=true`) |

### Tagging conventions

- Always use the `v` prefix: `v1.0.0`, not `1.0.0`.
- Use semantic versioning (`MAJOR.MINOR.PATCH`) strictly.
- A MAJOR bump is required for any breaking change to an event schema, event parameter order,
  or indexed flag. See [`docs/nuget-packaging.md`](nuget-packaging.md#breaking-change-strategy-for-event-and-interface-changes) for the full breaking-change checklist.
- Do not reuse tags. If a release needs to be corrected, cut a new patch release.

---

## 7. Release-to-Network Mapping

The target network is determined entirely by the `DEPLOY_ENV` repository variable. The value
must match a GitHub Environment name exactly.

### Network reference table

| `DEPLOY_ENV` value  | Chain             | Stage   | Chain ID | Block explorer                   |
|---------------------|-------------------|---------|----------|----------------------------------|
| `ethereum-sepolia`  | Ethereum          | Testnet | 11155111 | sepolia.etherscan.io             |
| `ethereum-mainnet`  | Ethereum          | Mainnet | 1        | etherscan.io                     |
| `polygon-amoy`      | Polygon           | Testnet | 80002    | amoy.polygonscan.com             |
| `polygon-mainnet`   | Polygon           | Mainnet | 137      | polygonscan.com                  |
| `optimism-sepolia`  | Optimism          | Testnet | 11155420 | sepolia-optimism.etherscan.io    |
| `optimism-mainnet`  | Optimism          | Mainnet | 10       | optimistic.etherscan.io          |
| `bsc-testnet`       | BNB Smart Chain   | Testnet | 97       | testnet.bscscan.com              |
| `bsc-mainnet`       | BNB Smart Chain   | Mainnet | 56       | bscscan.com                      |
| `avalanche-fuji`    | Avalanche         | Testnet | 43113    | testnet.snowtrace.io             |
| `avalanche-mainnet` | Avalanche         | Mainnet | 43114    | snowtrace.io                     |

### Changing the deployment target

To change which network the next release targets, update the `DEPLOY_ENV` repository variable:

1. Go to **Settings → Secrets and variables → Actions → Variables**.
2. Edit `DEPLOY_ENV` and set it to the desired environment name (e.g. `polygon-mainnet`).
3. Ensure the target environment exists and is fully configured.
4. Publish the GitHub Release.

Only one network is targeted per release. To deploy to multiple networks, publish separate
releases with the target `DEPLOY_ENV` repository variable updated between them.

### Adding a new network

1. Create a GitHub Environment named `{chain}-{stage}` with the required secrets and variables.
2. Add the entry to the reference table above in this document.
3. Add the entry to [`docs/github-environments-setup.md`](github-environments-setup.md).
4. Create `deployments/config/{chain}-{stage}/deployment-params.json` with the correct constructor arguments.
5. Ensure `hardhat.config.ts` has a matching `networks` entry and `etherscan.apiKey` / `customChains` entry.
6. No changes to the workflow file are required.

---

## 8. Approval Model

### Testnet environments

No approval is required. Deployments proceed automatically when a release is published.

### Mainnet environments

All `*-mainnet` environments must be configured with **Required reviewers** in GitHub's
environment protection rules. When a stable release is published and `DEPLOY_ENV` points to a
mainnet environment:

1. The `resolve-environment` and `test` jobs run automatically.
2. The `deploy-contracts` job is paused at the **environment approval gate** until at least one
   required reviewer approves via the GitHub Actions UI.
3. If approval is not given within the configured timeout (default: 30 days), the workflow
   expires. Publish a new release to restart the pipeline.
4. Once approved, `deploy-contracts`, `verify-contracts`, and `publish-nuget` run without further
   approval prompts (the gate fires once per environment, not per job).

### Recommended reviewer configuration

| Environment type | Recommended required reviewers |
|---|---|
| `*-mainnet` | At least 2 named individuals from the core team |
| `*-testnet`/`*-sepolia`/etc. | None required |

> The `publish-nuget` job does not hold its own environment scope. It receives
> `NUGET_PUBLISH_ENABLED` from `deploy-contracts` as a job output, so no second approval gate
> is triggered for NuGet publishing on mainnet environments.

---

## 9. Triggering a Deployment

### End-to-end checklist

Before publishing the release:

- [ ] Confirm `DEPLOY_ENV` repository variable points to the correct environment
- [ ] Confirm the target environment exists and is fully configured (secrets + variables, including `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `CF_PAGES_PROJECT`)
- [ ] Confirm `nft-assets/metadata/` contains all token metadata JSON files for the collection
- [ ] Confirm `nft-assets/images/` contains all token image files
- [ ] Confirm `nft-assets/contract/collection.json` has the correct collection metadata (royalty recipient address must not be the zero address for mainnet)
- [ ] Confirm `deployments/config/{env}/deployment-params.json` has the correct NFT name, symbol, and royalty parameters
- [ ] Choose the correct tag type for the target:
  - Testnet → pre-release tag (`v1.2.3-rc.1`) or stable tag (`v1.2.3`) both work
  - Mainnet → stable tag only (`v1.2.3`)
- [ ] Draft or compose the release notes

### Publishing the release

1. Go to **Releases → Draft a new release**.
2. Enter the tag (e.g. `v1.2.3` for mainnet, `v1.2.3-rc.1` for testnet).
3. Select the target branch (default branch for mainnet; any for testnet).
4. For pre-release tags, check **This is a pre-release**.
5. Click **Publish release**.

The `release-deploy.yml` workflow starts automatically.

### Monitoring the deployment

1. Go to **Actions → Release — Deploy Contracts** to view the running workflow.
2. Monitor the `resolve-environment` job for tag validation errors.
3. Monitor the `test` job for any test failures.
4. Monitor the `deploy-metadata` job — if this fails, `deploy-contracts` will not run.
5. If deploying to mainnet, approve the pending deployment in the `deploy-metadata` and `deploy-contracts` jobs.
6. Check the `verify-contracts` and `publish-nuget` jobs after `deploy-contracts` completes.

---

## 10. Workflow Job Graph

```
GitHub Release published
        │
        ▼
┌─────────────────────────┐
│   resolve-environment   │  Reads DEPLOY_ENV; validates tag format;
│                         │  blocks pre-release tags from mainnet.
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│         test            │  Runs Hardhat tests + .NET integration tests.
│                         │  Fails fast; does not consume secrets.
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│    deploy-metadata      │  Environment-scoped. Deploys nft-assets/ to
│    (environment gate    │  Cloudflare Pages. Resolves BASE_TOKEN_URI
│     for mainnet)        │  and CONTRACT_URI. Blocking.
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│    deploy-contracts     │  Environment-scoped. Injects RPC_URL,
│    (environment gate    │  DEPLOYER_PRIVATE_KEY, resolved metadata URLs.
│     for mainnet)        │  Runs deployment runner.
│                         │  Writes deployment manifests. Uploads as artifacts.
└───────┬─────────────────┘
        │                 │
        ▼                 ▼
┌──────────────┐  ┌───────────────────┐
│  verify-     │  │  publish-nuget    │
│  contracts   │  │                   │
│              │  │  Packs + pushes   │
│  non-blocking│  │  Tricksfor.Smart  │
│  continue-on │  │  Contracts NuGet  │
│  -error      │  │  package.         │
└──────────────┘  └───────────────────┘
```

| Job | Environment scope | Blocks others | continue-on-error |
|---|---|---|---|
| `resolve-environment` | None | Yes | No |
| `test` | None | Yes | No |
| `deploy-metadata` | `{DEPLOY_ENV}` | Yes | No |
| `deploy-contracts` | `{DEPLOY_ENV}` | Yes | No |
| `verify-contracts` | `{DEPLOY_ENV}` | No | Yes |
| `publish-nuget` | None | No | Yes |

---

## 11. Failure Recovery

### Metadata deployment fails (`deploy-metadata`)

When `deploy-metadata` fails, `deploy-contracts` is automatically skipped. No on-chain state
is changed — this is a safe failure point.

**Recovery steps:**

1. Open the failed workflow run in **Actions**.
2. Check the `deploy-metadata` job logs for the root cause:
   - `CF_PAGES_PROJECT not set` → configure the `CF_PAGES_PROJECT` environment variable.
   - Cloudflare authentication error → verify `CLOUDFLARE_API_TOKEN` has **Cloudflare Pages: Edit** permission.
   - `CLOUDFLARE_ACCOUNT_ID` mismatch → confirm the account ID value in the environment variables.
3. Fix the root cause, then re-run the `deploy-metadata` job (if the issue was transient) or
   publish a new release.

### Deployment fails (`deploy-contracts`)

`verify-contracts` and `publish-nuget` are automatically skipped when `deploy-contracts` fails.

**Recovery steps:**

1. Open the failed workflow run in **Actions**.
2. Check the `deploy-contracts` job logs for the root cause:
   - `DEPLOY_ENV` not set → update the repository variable and re-publish the release.
   - `deployment-params.json` not found → create the missing file and re-publish the release.
   - RPC error / connection refused → check `RPC_URL` in the environment secrets; re-run the job.
   - Transaction revert → check constructor arguments in the params file; fix and re-publish.
3. Once the root cause is fixed, re-run the `deploy-contracts` job (if the issue was transient)
   or publish a new release (if the params or config needed changing).

> Contracts deployed on EVM chains cannot be undeployed. A failed mid-deployment run may have
> deployed one contract but not the other. Check the workflow log and any uploaded artifacts
> for partial manifests before re-deploying.

### Verification fails (`verify-contracts`)

Verification failure does **not** roll back the deployment. Contracts are live and correct.

**Recovery steps:**

1. Download the `verify-transcript-{env}-{tag}` artifact to read the `hardhat verify` output.
2. Fix the root cause:
   - `Invalid API Key` → update `EXPLORER_API_KEY` in the environment secrets.
   - `Unknown network` → update `NETWORK_KEY` in the environment variables.
   - Explorer outage → wait for recovery; check the explorer's status page.
3. Re-run only the `verify-contracts` job: open the failed workflow run → **Re-run failed jobs**.

For detailed per-scenario guidance, see [`docs/verification-troubleshooting.md`](verification-troubleshooting.md).

**Manual verification (if the workflow run has expired):**

```bash
npm ci
export RPC_URL="<rpc-url>"
export ETHERSCAN_API_KEY="<explorer-api-key>"

./node_modules/.bin/hardhat verify --no-compile \
  --network <NETWORK_KEY> \
  <CONTRACT_ADDRESS> \
  [CONSTRUCTOR_ARG_1] [CONSTRUCTOR_ARG_2] ...
```

Constructor arguments are recorded in the deployment manifest under `constructorArgs`.

### NuGet publish fails (`publish-nuget`)

NuGet publish failure does **not** roll back the deployment or verification.

**Recovery steps:**

1. Check the `publish-nuget` job logs for the root cause:
   - `Unauthorized` → update `NUGET_API_KEY` in the repository secrets.
   - `Package already exists` → the package was already pushed; no action needed.
   - `Invalid version format` → the release tag does not produce a valid NuGet version; re-tag.
2. Re-run only the `publish-nuget` job in the failed workflow run.

**Manual NuGet push (using the retained artifact):**

1. Download the `nuget-package-{tag}` artifact from the failed workflow run.
2. Push manually:

```bash
dotnet nuget push Tricksfor.SmartContracts.{version}.nupkg \
  --api-key $NUGET_API_KEY \
  --source https://api.nuget.org/v3/index.json

dotnet nuget push Tricksfor.SmartContracts.{version}.snupkg \
  --api-key $NUGET_API_KEY \
  --source https://api.nuget.org/v3/index.json
```

### Pre-release tag accidentally sent to mainnet

The workflow blocks this at the `resolve-environment` step and exits with an error:

```
Pre-release tag 'v1.2.3-rc.1' cannot deploy to mainnet environment 'ethereum-mainnet'.
Only stable tags (vMAJOR.MINOR.PATCH) are allowed on mainnet.
```

**Recovery:** No deployment occurred. Update `DEPLOY_ENV` to a testnet environment and
re-publish, or cut a stable tag and re-publish to mainnet.

### Wrong `DEPLOY_ENV` set

If `DEPLOY_ENV` points to the wrong environment:

1. The workflow has already run (or partially run) against the wrong target.
2. Fix `DEPLOY_ENV` in **Settings → Secrets and variables → Actions → Variables**.
3. Publish a new release with the correct tag.

---

## 12. Artifacts

All artifacts are uploaded under **Actions → {workflow run} → Artifacts**.

### Deployment manifests

| Artifact name | Job | Retention | Contents |
|---|---|---|---|
| `deployment-manifests-{env}-{tag}` | `deploy-contracts` | 90 days | `deployments/{env}/TricksforBoosterNFT.json`, `deployments/{env}/TricksforBoosterStaking.json` — contract addresses, transaction hashes, block numbers, constructor args |

Manifests are uploaded with `if: always()` — they are retained even when the job fails, so
partial deployment information is never lost.

### Verification artifacts

| Artifact name | Job | Retention | Contents |
|---|---|---|---|
| `verify-transcript-{env}-{tag}` | `verify-contracts` | 30 days | Raw stdout/stderr from both `hardhat verify` runs |
| `verify-manifests-{env}-{tag}` | `verify-contracts` | 90 days | Updated manifests with `verification.status`, `verification.explorerUrl`, `verification.verifiedAt` fields |

### NuGet package

| Artifact name | Job | Retention | Contents |
|---|---|---|---|
| `nuget-package-{tag}` | `publish-nuget` | 90 days | `Tricksfor.SmartContracts.{version}.nupkg` + `Tricksfor.SmartContracts.{version}.snupkg` |

The `.nupkg` and `.snupkg` are always uploaded regardless of whether the nuget.org push succeeded.
This allows manual recovery using `dotnet nuget push` without re-running the full pipeline.

### Deployment manifest schema

```json
{
  "contractName": "TricksforBoosterNFT",
  "address": "0x...",
  "transactionHash": "0x...",
  "blockNumber": 12345678,
  "deployedAt": "2025-01-01T00:00:00Z",
  "constructorArgs": ["arg1", "arg2"],
  "verification": {
    "explorerName": "Etherscan",
    "chainTarget": "ethereum-mainnet",
    "explorerUrl": "https://etherscan.io/address/0x...",
    "status": "verified",
    "verifiedAt": "2025-01-01T00:01:00Z"
  }
}
```

`verification` is added by the `verify-contracts` job and will be absent from manifests uploaded
by `deploy-contracts` directly. The `verify-manifests-*` artifact contains the updated version.

---

## Related documents

| Document | Purpose |
|---|---|
| [`docs/github-environments-setup.md`](github-environments-setup.md) | Step-by-step GitHub UI configuration reference |
| [`docs/release-deployment-architecture.md`](release-deployment-architecture.md) | Architecture design reference and decision record |
| [`docs/nuget-packaging.md`](nuget-packaging.md) | NuGet versioning strategy, breaking-change guidance, and publishing flow |
| [`docs/verification-troubleshooting.md`](verification-troubleshooting.md) | Detailed verification failure scenarios and recovery steps |
