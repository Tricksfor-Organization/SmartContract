# Release-Driven Deployment Architecture

This document is the source-of-truth design reference for the Tricksfor SmartContract deployment and NuGet publishing pipeline. All implementation issues for GitHub Actions workflows should reference this document directly.

---

## Table of Contents

1. [Trigger Model](#1-trigger-model)
2. [Versioning Model](#2-versioning-model)
3. [Environment Model](#3-environment-model)
4. [Secrets Model](#4-secrets-model)
5. [Network Model](#5-network-model)
6. [Deployment Parameter Model](#6-deployment-parameter-model)
7. [Verification Model](#7-verification-model)
8. [NuGet Publishing Model](#8-nuget-publishing-model)
9. [Failure Handling Model](#9-failure-handling-model)

---

## 1. Trigger Model

### Primary trigger

Workflows are triggered by the `release.published` GitHub event. No deployment or publishing action runs on push, pull-request, or manual dispatch unless explicitly required for a specific maintenance scenario.

```
GitHub Release published
        │
        ▼
  release-deploy.yml
        │
        ├─► deploy-contracts job (environment-scoped)
        ├─► verify-contracts job (depends on deploy-contracts)
        └─► publish-nuget job (depends on deploy-contracts)
```

### Release pattern rules

| Tag pattern | Channel | Allowed deploy targets |
|---|---|---|
| `v*.*.*` (e.g. `v1.2.3`) | Stable | Any environment, including mainnet |
| `v*.*.*-rc.*` (e.g. `v1.2.3-rc.1`) | Release candidate | Testnet environments only |
| `v*.*.*-beta.*` | Beta | Testnet environments only |
| `v*.*.*-alpha.*` | Alpha | Testnet environments only |

Mainnet environments (`ethereum-mainnet`, `polygon-mainnet`, `optimism-mainnet`, `bsc-mainnet`, `avalanche-mainnet`) must only be targeted by stable releases (tags matching `v*.*.*` without a pre-release suffix). Workflows must enforce this by checking the GitHub release `prerelease` property and failing fast if a pre-release tag targets a mainnet environment.

### Non-secret workflow selectors

The following inputs are acceptable as release-level selectors (none of these are secrets):

| Input | Source | Description |
|---|---|---|
| `target_environment` | Release title convention or tag-mapped config | Identifies which GitHub Environment to activate |
| `network_key` | Derived from `target_environment` | Short name identifying the target chain (e.g. `ethereum-mainnet`) |
| `enable_nuget_publish` | Environment variable `NUGET_PUBLISH_ENABLED` | Whether to publish the NuGet package |
| `enable_verify` | Environment variable `VERIFY_ENABLED` | Whether to run block-explorer verification |
| Version/tag | GitHub release tag | Version string used for manifests and NuGet package |

---

## 2. Versioning Model

### Source of version

The version comes exclusively from the Git tag attached to the GitHub Release. The workflow extracts the version with:

```yaml
version: ${{ github.ref_name }}            # e.g. v1.2.3
nuget_version: ${{ github.ref_name }}      # used directly as NuGet package version
```

The `v` prefix is retained in the Git tag but stripped when needed for NuGet SemVer:

```bash
NUGET_VERSION="${GITHUB_REF_NAME#v}"       # strips leading 'v' → 1.2.3
```

### Pre-release NuGet versions

Pre-release tags (e.g. `v1.2.3-rc.1`) produce NuGet package versions with the pre-release suffix intact (e.g. `1.2.3-rc.1`), which NuGet interprets as pre-release and will not install by default without opting in.

### Deployment manifest versioning

Each deployment manifest file (`deployments/{network}/{ContractName}.json`) includes:
- `releaseTag`: the full Git tag (e.g. `v1.2.3`)
- `deployedAt`: ISO-8601 UTC timestamp
- `contractAddress`
- `transactionHash`
- `blockNumber`
- `constructorArgs`

---

## 3. Environment Model

### One GitHub Environment per deploy target

Each deployable target has a dedicated [GitHub Environment](https://docs.github.com/en/actions/deployment/targeting-different-environments). Environment names follow a strict `{chain}-{stage}` convention.

| Environment name | Chain | Stage |
|---|---|---|
| `ethereum-sepolia` | Ethereum | Testnet |
| `ethereum-mainnet` | Ethereum | Mainnet |
| `polygon-amoy` | Polygon | Testnet |
| `polygon-mainnet` | Polygon | Mainnet |
| `optimism-sepolia` | Optimism | Testnet |
| `optimism-mainnet` | Optimism | Mainnet |
| `bsc-testnet` | BNB Smart Chain | Testnet |
| `bsc-mainnet` | BNB Smart Chain | Mainnet |
| `avalanche-fuji` | Avalanche | Testnet (Fuji) |
| `avalanche-mainnet` | Avalanche | Mainnet |

### Environment protection rules

All `*-mainnet` environments must be configured with:
- **Required reviewers**: at least one named approver must approve before the workflow runs
- **Deployment branches**: restricted to the repository's default branch
- **Wait timer**: optional (recommended: 5 minutes for a review window)

Testnet environments do not require approvals and can auto-deploy.

### How the target environment is resolved

The release title or tag suffix maps to a target environment name. The mapping is maintained in a checked-in configuration file (see [Section 6](#6-deployment-parameter-model)):

```
deployments/config/{environment-name}/deployment-params.json
```

The workflow reads the `target_environment` selector from the release metadata or from a convention-based lookup. The environment name is passed directly to the `environment:` key of the GitHub Actions job.

---

## 4. Secrets Model

### Principle

**No secret value is ever passed as a release input, workflow input, or workflow variable.**

All sensitive values are stored exclusively in GitHub Environment secrets and accessed only within the job scoped to that environment.

### Secret classification

| Value | Classification | Storage location |
|---|---|---|
| Deployer wallet private key | **Secret** | GitHub Environment secret: `DEPLOYER_PRIVATE_KEY` |
| RPC endpoint URL | **Secret** | GitHub Environment secret: `RPC_URL` |
| Block explorer API key | **Secret** | GitHub Environment secret: `EXPLORER_API_KEY` |
| NuGet API key | **Secret** | GitHub Repository secret: `NUGET_API_KEY` |
| GitHub Packages token | **Secret** | GitHub-provided: `GITHUB_TOKEN` |

### Non-secret configuration variables

| Value | Classification | Storage location |
|---|---|---|
| Chain ID | **Non-secret** | GitHub Environment variable: `CHAIN_ID` |
| Explorer base URL | **Non-secret** | GitHub Environment variable: `EXPLORER_BASE_URL` |
| Whether verification is enabled | **Non-secret** | GitHub Environment variable: `VERIFY_ENABLED` |
| Whether NuGet publish is enabled | **Non-secret** | GitHub Environment variable: `NUGET_PUBLISH_ENABLED` |
| NFT name, symbol, URIs, royalty config | **Non-secret** | Checked-in deployment params file (see Section 6) |
| Admin/minter wallet addresses | **Non-secret** | Checked-in deployment params file (see Section 6) |

### Repository-level vs. environment-level secrets

- **Environment secrets** are preferred for all chain-specific secrets. They are only available during workflow runs that target the matching environment, limiting blast radius.
- **Repository secrets** are used only for values shared across all environments (e.g. `NUGET_API_KEY`).
- Organization secrets must not be used without explicit documentation of scope and justification.

### Audit trail

Every workflow run must emit a non-secret summary log that includes:
- target environment name
- chain ID (non-secret)
- deployer address (derived from private key but not the key itself)
- contract addresses deployed

Secrets must never appear in log output. Workflows must not print secret values even in masked form.

---

## 5. Network Model

### Supported chains

| Chain | Chain ID (mainnet) | Chain ID (testnet) | Testnet name | Explorer (mainnet) | Explorer (testnet) |
|---|---|---|---|---|---|
| Ethereum | 1 | 11155111 | Sepolia | etherscan.io | sepolia.etherscan.io |
| Polygon | 137 | 80002 | Amoy | polygonscan.com | amoy.polygonscan.com |
| Optimism | 10 | 11155420 | OP Sepolia | optimistic.etherscan.io | sepolia-optimism.etherscan.io |
| BNB Smart Chain | 56 | 97 | BSC Testnet | bscscan.com | testnet.bscscan.com |
| Avalanche | 43114 | 43113 | Fuji | snowtrace.io | testnet.snowtrace.io |

### Chain-specific value resolution

Chain-specific secrets and variables are resolved entirely through the GitHub Environment mapped to the deploy target. The workflow does not contain any hardcoded chain parameters. Chain configuration flows through the following path:

```
GitHub Environment secrets/variables
        │
        ▼
  Workflow job (environment: <name>)
        │
        ▼
  Deployment runner (env vars: RPC_URL, CHAIN_ID, DEPLOYER_PRIVATE_KEY)
```

The deployment runner (`src/Tricksfor.Blockchain.Booster.Deploy`) reads all chain-specific values from environment variables using the `Deployment__*` prefix convention already implemented in `Program.cs`:

- `Deployment__RpcUrl` → from `RPC_URL` environment secret
- `Deployment__ChainId` → from `CHAIN_ID` environment variable
- `Deployment__PrivateKey` → from `DEPLOYER_PRIVATE_KEY` environment secret
- `DEPLOY_ENV` → set to the environment name (e.g. `polygon-mainnet`)

### Adding a new chain

To add a new supported chain:
1. Create a GitHub Environment named `{chain}-{stage}` and populate its secrets and variables.
2. Add an entry to the network table in this document.
3. Add a corresponding `deployments/config/{environment-name}/deployment-params.json` file.
4. Add the explorer verification configuration for the new chain in the Hardhat config.

No workflow file changes are required if the deployment runner and environment strategy are followed.

---

## 6. Deployment Parameter Model

### Strategy: checked-in parameter files + environment secrets

Deployment parameters are split into two categories:

| Category | Examples | Where stored |
|---|---|---|
| **Non-secret constructor args** | NFT name, symbol, base URI, contract URI, royalty receiver address, royalty basis points | Checked-in JSON file per environment |
| **Admin / role addresses** | Admin wallet, minter wallet, pauser wallet | Checked-in JSON file per environment |
| **Secrets** | Private key, RPC URL, explorer API key | GitHub Environment secrets (never committed) |

### Parameter file location and format

```
deployments/config/
├── ethereum-sepolia/
│   └── deployment-params.json
├── ethereum-mainnet/
│   └── deployment-params.json
├── polygon-amoy/
│   └── deployment-params.json
├── polygon-mainnet/
│   └── deployment-params.json
├── optimism-sepolia/
│   └── deployment-params.json
├── optimism-mainnet/
│   └── deployment-params.json
├── bsc-testnet/
│   └── deployment-params.json
├── bsc-mainnet/
│   └── deployment-params.json
├── avalanche-fuji/
│   └── deployment-params.json
└── avalanche-mainnet/
    └── deployment-params.json
```

### Parameter file schema

```json
{
  "Deployment": {
    "Network": "ethereum-mainnet",
    "ChainId": 1,
    "DeploymentsOutputPath": "deployments",
    "Nft": {
      "Name": "TricksforBooster",
      "Symbol": "TFB",
      "BaseUri": "https://meta.tricksfor.gg/booster/",
      "ContractMetadataUri": "https://meta.tricksfor.gg/booster/contract.json",
      "RoyaltyReceiver": "0xYOUR_ROYALTY_RECEIVER_ADDRESS",
      "RoyaltyFeeBasisPoints": 500
    }
  }
}
```

`RoyaltyReceiver` may be left empty (`""`) if the deployer address should be used; `DeploymentRunner` already handles this default.

### Workflow integration

The workflow copies (not symlinks — symlinks are unreliable across CI runners) the parameter file to the runner's working directory as `appsettings.{DEPLOY_ENV}.json` before running the deployment:

```yaml
- name: Copy deployment params
  run: cp deployments/config/${{ env.DEPLOY_ENV }}/deployment-params.json \
          src/Tricksfor.Blockchain.Booster.Deploy/appsettings.${{ env.DEPLOY_ENV }}.json
```

Secrets are injected via environment variables and take highest priority, overriding any appsettings value:

```yaml
env:
  DEPLOY_ENV: ${{ vars.ENVIRONMENT_NAME }}
  Deployment__RpcUrl: ${{ secrets.RPC_URL }}
  Deployment__PrivateKey: ${{ secrets.DEPLOYER_PRIVATE_KEY }}
  Deployment__ChainId: ${{ vars.CHAIN_ID }}
```

---

## 7. Verification Model

### When verification runs

Verification runs as a separate job that depends on the `deploy-contracts` job. It can be skipped per environment by setting `VERIFY_ENABLED=false` in the GitHub Environment variables. Verification is always skipped when deploying to `localhost` or any environment with `VERIFY_ENABLED` unset or set to `false`.

### Tooling

Contract verification uses [Hardhat Verify](https://hardhat.org/hardhat-runner/plugins/nomicfoundation-hardhat-verify) (via `@nomicfoundation/hardhat-verify`), which supports all five target chains through their Etherscan-compatible API endpoints.

### Compiler artifact preservation

The `artifacts/` directory (containing compiled contract JSON with ABI, bytecode, and compiler metadata) must be committed to the repository and used as-is during verification. The workflow must not recompile contracts during verification — it must use the same artifact that was used during deployment.

Constructor arguments must be captured from the deployment manifest produced by step 4 of the deployment flow and passed to the verification command. The `ManifestWriter` already records `constructorArgs` in the manifest JSON.

### Verification flow

```
deploy-contracts job completes
        │
        ▼
verify-contracts job starts
        ├── npm ci (restore node_modules)
        ├── Read contract addresses from deployment manifests
        ├── Read constructor args from deployment manifests
        ├── Run: npx hardhat verify --network {NETWORK_KEY} {NFT_ADDRESS} {NFT_ARGS...}
        └── Run: npx hardhat verify --network {NETWORK_KEY} {STAKING_ADDRESS} {STAKING_ARGS...}
```

### Explorer endpoints per chain

| Environment | Hardhat network name | Explorer API base URL |
|---|---|---|
| `ethereum-sepolia` | `sepolia` | `https://api-sepolia.etherscan.io/api` |
| `ethereum-mainnet` | `mainnet` | `https://api.etherscan.io/api` |
| `polygon-amoy` | `polygon_amoy` | `https://api-amoy.polygonscan.com/api` |
| `polygon-mainnet` | `polygon` | `https://api.polygonscan.com/api` |
| `optimism-sepolia` | `optimism_sepolia` | `https://api-sepolia-optimism.etherscan.io/api` |
| `optimism-mainnet` | `optimism` | `https://api-optimistic.etherscan.io/api` |
| `bsc-testnet` | `bsc_testnet` | `https://api-testnet.bscscan.com/api` |
| `bsc-mainnet` | `bsc` | `https://api.bscscan.com/api` |
| `avalanche-fuji` | `avalanche_fuji` | `https://api-testnet.snowtrace.io/api` |
| `avalanche-mainnet` | `avalanche` | `https://api.snowtrace.io/api` |

`EXPLORER_API_KEY` is provided from the GitHub Environment secret and passed to Hardhat verify as `ETHERSCAN_API_KEY` (the Hardhat Verify plugin reads this environment variable by default for all Etherscan-compatible explorers).

### What must be preserved for verification

- Solidity compiler version (`0.8.26`)
- EVM target (`cancun`)
- Optimizer settings (must match `hardhat.config.ts`)
- Compiled `artifacts/` directory (committed to repository)
- Constructor arguments (from deployment manifest)

---

## 8. NuGet Publishing Model

### Package identity

| Property | Value |
|---|---|
| Package ID | `Tricksfor.Blockchain.Nethereum` |
| Target framework | `net8.0` |
| Package source | nuget.org (primary) and/or GitHub Packages |

### What is included in the package

| Included | Description |
|---|---|
| Nethereum event DTOs | C# classes matching all `Staked`, `Unstaked`, `EmergencyWithdrawn` event signatures |
| Nethereum function message types | C# classes for all public contract functions |
| Contract definition classes | ABI-encoded contract definitions used by `Nethereum.Contracts` |
| ABI artifacts | The compiled ABI JSON embedded as resources (optional, if required by consumers) |

The package does **not** include:
- Deployment runner (`Tricksfor.Blockchain.Booster.Deploy`)
- Deployment manifests
- Private keys, RPC URLs, or any secrets

### Versioning

The NuGet package version is derived from the Git tag of the triggering release, with the leading `v` stripped:

| Git tag | NuGet version |
|---|---|
| `v1.2.3` | `1.2.3` |
| `v1.2.3-rc.1` | `1.2.3-rc.1` |
| `v1.2.3-beta.2` | `1.2.3-beta.2` |

The workflow injects the version at pack time:

```bash
dotnet pack src/Tricksfor.Blockchain.Nethereum/Tricksfor.Blockchain.Nethereum.csproj \
  --configuration Release \
  --output ./nupkg \
  /p:PackageVersion="${GITHUB_REF_NAME#v}"
```

### Publishing targets

**Primary target: nuget.org**

```bash
dotnet nuget push ./nupkg/*.nupkg \
  --api-key ${{ secrets.NUGET_API_KEY }} \
  --source https://api.nuget.org/v3/index.json
```

`NUGET_API_KEY` is a repository-level secret (not environment-scoped, as the same package serves all chains).

**Secondary target: GitHub Packages (optional)**

GitHub Packages may be used as a fallback or for pre-release packages. The `GITHUB_TOKEN` provided automatically by Actions is sufficient for publishing to GitHub Packages.

### Trusted Publishing

When nuget.org supports OIDC Trusted Publishing for GitHub Actions, this workflow should migrate to Trusted Publishing to eliminate the long-lived `NUGET_API_KEY` secret. The migration is a forward-compatible change and does not affect consumers.

### Publish gate

NuGet publishing is controlled by the `NUGET_PUBLISH_ENABLED` environment variable stored per-environment in GitHub Environment variables. This allows test environments to run the full pipeline without publishing a package.

The `publish-nuget` job additionally checks:

1. The `NUGET_PUBLISH_ENABLED` variable is `true`.
2. The triggering release is not a GitHub draft release.
3. The triggering release tag matches the stable pattern (`v*.*.*` without pre-release suffix) when publishing to nuget.org.
   - Pre-release packages may be published to GitHub Packages but not to nuget.org unless explicitly enabled.

---

## 9. Failure Handling Model

### Job dependency graph

```
test
 └── deploy-contracts
       ├── verify-contracts
       └── publish-nuget
```

All jobs are separate and independently retryable. `verify-contracts` and `publish-nuget` are set to `needs: [deploy-contracts]` but are independent of each other (`verify-contracts` does not block `publish-nuget`).

### Deployment succeeds, verification fails

Verification failure does **not** roll back the deployment. Contracts deployed on EVM chains cannot be undeployed. The workflow:

1. Marks the `verify-contracts` job as failed.
2. Uploads the deployment manifest as a workflow artifact so addresses are recoverable.
3. Allows the operator to re-run only the `verify-contracts` job manually once the issue is resolved (e.g. missing API key, explorer outage).

### Deployment succeeds, NuGet publish fails

NuGet publish failure does **not** roll back the deployment. The workflow:

1. Marks the `publish-nuget` job as failed.
2. Uploads the `.nupkg` file as a workflow artifact so the package can be pushed manually.
3. Allows the operator to re-run only the `publish-nuget` job manually.

### Deployment fails

If `deploy-contracts` fails, all dependent jobs (`verify-contracts`, `publish-nuget`) are automatically skipped. The workflow:

1. Marks the `deploy-contracts` job as failed.
2. Retains any partial output artifacts (e.g. partially written manifests, transaction hashes) as workflow artifacts for post-mortem analysis.

### Artifacts retained on every run

Regardless of job outcome, the following artifacts are always uploaded:

| Artifact | Job | Retention |
|---|---|---|
| Deployment manifests (`deployments/{network}/*.json`) | `deploy-contracts` | 90 days |
| NuGet package (`.nupkg`) | `publish-nuget` | 90 days |
| Verification transcript (stdout/stderr of verify commands) | `verify-contracts` | 30 days |

### Manual retry guidance

| Scenario | Action |
|---|---|
| Re-run verification after API key fix | Re-run `verify-contracts` job in the failed workflow run |
| Re-run NuGet publish after auth fix | Re-run `publish-nuget` job in the failed workflow run, or push the retained `.nupkg` artifact manually via `dotnet nuget push` |
| Re-deploy after RPC failure | Create a new release or trigger a manual deploy workflow if defined |
| Explorer outage during verification | Wait for explorer recovery, then re-run `verify-contracts` job |

---

## Summary: Decision Table

| Concern | Decision |
|---|---|
| Workflow trigger | `release.published` event only |
| Pre-release → mainnet | **Blocked** (enforced in workflow) |
| Stable → testnet | Allowed |
| Secret injection | GitHub Environment secrets only |
| Non-secret config | Checked-in `deployment-params.json` per environment |
| Chain selection | One GitHub Environment per chain/stage |
| Mainnet approval | Required reviewers on all `*-mainnet` environments |
| Contract verification | Hardhat Verify, separate job, skippable per environment |
| NuGet package ID | `Tricksfor.Blockchain.Nethereum` |
| NuGet version source | Git tag (strip leading `v`) |
| NuGet publish target | nuget.org (primary), GitHub Packages (optional) |
| Verification failure | Non-blocking, artifact retained, job retryable |
| NuGet publish failure | Non-blocking, `.nupkg` retained, job retryable |
| Deployment failure | Blocks dependent jobs, artifacts retained |
