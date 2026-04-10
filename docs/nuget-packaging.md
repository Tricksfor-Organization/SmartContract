# NuGet Packaging Guide — Tricksfor.SmartContracts

This document describes how the `Tricksfor.SmartContracts` NuGet package is versioned, structured,
and published from this repository.

---

## Package identity

| Property | Value |
|---|---|
| Package ID | `Tricksfor.SmartContracts` |
| Project | `src/Tricksfor.Blockchain.Booster/Tricksfor.Blockchain.Booster.csproj` |
| Target framework | `net8.0` |
| Primary feed | [nuget.org](https://www.nuget.org/packages/Tricksfor.SmartContracts) |
| Pre-release feed | [GitHub Packages](https://github.com/orgs/Tricksfor-Organization/packages) |

---

## What is packaged

The package contains the public integration surface of the Tricksfor on-chain ecosystem:

| Path in project | Contents |
|---|---|
| `Contracts/Events/` | `TokenStakedEventDTO`, `TokenUnstakedEventDTO`, `EmergencyWithdrawnEventDTO` |
| `Contracts/Functions/` | Staking and NFT function message types |
| `Contracts/Deployment/` | `TricksforBoosterNFTDeployment`, `TricksforBoosterStakingDeployment` |
| `Contracts/Outputs/` | Output DTOs for multi-value function results |
| `Services/` | `BoosterStakingService`, `BoosterNFTService` |
| `Abis/` | Embedded ABI JSON and bytecode for both contracts |
| `Configuration/` | `BoosterContractOptions` |

The package does **not** include:

- `Tricksfor.Blockchain.Booster.Deploy` — deployment runner; that is an operational tool, not a consumer library
- Deployment manifests under `deployments/`
- Private keys, RPC URLs, or any secrets
- Reward logic or game mechanics (settlement is off-chain)

---

## Versioning strategy

### Semantic versioning

This package follows [Semantic Versioning 2.0](https://semver.org/) strictly.

| Change type | Version bump | Examples |
|---|---|---|
| Bug fix, documentation, non-breaking refactor | PATCH | `1.0.0` → `1.0.1` |
| New event DTO, new function message, new service method | MINOR | `1.0.0` → `1.1.0` |
| Breaking change to existing event, function, or service | MAJOR | `1.0.0` → `2.0.0` |

### Version source

The package version comes **exclusively from the Git tag** attached to the GitHub Release. It is
never hard-coded in the `.csproj`. The CI workflow injects it at pack time:

```bash
NUGET_VERSION="${GITHUB_REF_NAME#v}"   # strips leading 'v'; v1.2.3 → 1.2.3
dotnet pack src/Tricksfor.Blockchain.Booster/Tricksfor.Blockchain.Booster.csproj \
  --configuration Release \
  --output ./nupkg \
  /p:PackageVersion="$NUGET_VERSION"
```

### Pre-release suffix strategy

| Git tag | NuGet version | Meaning |
|---|---|---|
| `v1.2.3` | `1.2.3` | Stable release — published to nuget.org |
| `v1.2.3-rc.1` | `1.2.3-rc.1` | Release candidate — published to GitHub Packages only |
| `v1.2.3-beta.2` | `1.2.3-beta.2` | Beta — published to GitHub Packages only |
| `v1.2.3-alpha.1` | `1.2.3-alpha.1` | Alpha — published to GitHub Packages only |

Pre-release packages are not published to nuget.org unless `NUGET_PUBLISH_ENABLED` is explicitly
configured and the tag matches the stable pattern. See
[release-deployment-architecture.md §8](./release-deployment-architecture.md#8-nuget-publishing-model)
for the publish gate logic.

---

## Breaking-change strategy for event and interface changes

The integration-critical events `TokenStaked`, `TokenUnstaked`, and `EmergencyWithdrawn` are part of
the **public integration contract**. Downstream indexers and log processors decode these events from
on-chain logs. Any mismatch between the on-chain event definition and the C# DTO causes **silent
decoding failures** — decoded values will be wrong or zero.

### What constitutes a breaking change

The following changes are **always breaking** and require a MAJOR version bump:

- Renaming a Solidity event parameter (`staker`, `tokenId`, `stakedAt`, …)
- Changing a parameter's Solidity type (e.g. `uint256` → `uint128`)
- Changing a parameter's indexed flag
- Changing the parameter order
- Removing a parameter
- Renaming the C# property that maps to a parameter (the `[Parameter]` attribute name must match)
- Adding a new required parameter to an existing event

The following changes are **not** breaking (MINOR or PATCH):

- Adding a brand-new event DTO for a new Solidity event
- Adding a new function message type
- Adding a new service method
- Updating XML documentation comments
- Adding a new optional configuration property

### Checklist before publishing a breaking change

1. Bump the MAJOR version in the release tag (e.g. `v2.0.0`).
2. Update the Solidity contract and its Nethereum DTO together as a single atomic change.
3. Update all integration tests that reference the affected event.
4. Add a `BREAKING CHANGE` section to the GitHub Release notes describing:
   - What changed and why
   - Which event or function is affected
   - Migration steps for consumers
5. Notify downstream teams (log processor, indexer) before publishing.

---

## Publishing flow

Publishing is fully automated and triggered by a GitHub Release. The workflow is defined in
`.github/workflows/release-deploy.yml`.

```
GitHub Release published
        │
        ▼
  test job
        │
        ▼
  deploy-contracts job (environment-scoped)
        │
        └─► publish-nuget job
                  │
                  ├── dotnet pack (version injected from release tag)
                  ├── dotnet nuget push → nuget.org   (stable releases)
                  └── dotnet nuget push → GitHub Packages   (pre-release)
```

### Manual pack (local verification)

To pack the package locally without publishing:

```bash
cd /path/to/SmartContract
dotnet pack src/Tricksfor.Blockchain.Booster/Tricksfor.Blockchain.Booster.csproj \
  --configuration Release \
  --output ./nupkg \
  /p:PackageVersion="1.0.0-local"
```

Inspect the produced `.nupkg` with [NuGet Package Explorer](https://github.com/NuGetPackageExplorer/NuGetPackageExplorer)
or by extracting the zip archive to verify contents.

---

## Required secrets and variables

| Name | Type | Scope | Purpose |
|---|---|---|---|
| `NUGET_API_KEY` | Secret | Repository | API key for nuget.org push |
| `GITHUB_TOKEN` | Automatic | Repository | API key for GitHub Packages push |
| `NUGET_PUBLISH_ENABLED` | Variable | Environment | Set `true` to enable publishing for a given environment |

See [github-environments-setup.md](./github-environments-setup.md) for configuration instructions.
