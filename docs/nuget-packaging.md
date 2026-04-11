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
        │  (propagates NUGET_PUBLISH_ENABLED from environment variable)
        └─► publish-nuget job
                  │
                  ├── validate version format (fail fast on bad tag)
                  ├── dotnet pack → .nupkg + .snupkg (version from release tag)
                  ├── upload .nupkg + .snupkg as workflow artifacts (always)
                  ├── dotnet nuget push .nupkg → nuget.org   (stable releases)
                  ├── dotnet nuget push .snupkg → nuget.org symbol server   (stable releases)
                  └── dotnet nuget push .nupkg → GitHub Packages   (pre-release)
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

This produces both `Tricksfor.SmartContracts.1.0.0-local.nupkg` (the main package) and
`Tricksfor.SmartContracts.1.0.0-local.snupkg` (the symbol package).

Inspect the produced `.nupkg` with [NuGet Package Explorer](https://github.com/NuGetPackageExplorer/NuGetPackageExplorer)
or by extracting the zip archive to verify contents.

---

## Symbol packages

The project is configured to produce a `.snupkg` symbol package alongside the main `.nupkg`:

```xml
<IncludeSymbols>true</IncludeSymbols>
<SymbolPackageFormat>snupkg</SymbolPackageFormat>
```

The `.snupkg` contains the PDB file, which helps consumers debug the package and resolve symbols.
Source-level step-into debugging typically also requires SourceLink metadata to be configured during
the build; the symbol package alone does not guarantee that experience.

It is pushed to the nuget.org symbol server as part of the stable release workflow and uploaded as a
workflow artifact on every run regardless of publish outcome.

GitHub Packages does not support the `.snupkg` format; only the main `.nupkg` is pushed to GitHub
Packages for pre-release versions.

---

## Required secrets and variables

| Name | Type | Scope | Purpose |
|---|---|---|---|
| `NUGET_API_KEY` | Secret | Repository | API key for nuget.org push |
| `GITHUB_TOKEN` | Automatic | Repository | API key for GitHub Packages push |
| `NUGET_PUBLISH_ENABLED` | Variable | Environment | Set `true` to enable publishing for a given environment |

`NUGET_PUBLISH_ENABLED` is read from the GitHub Environment associated with the `deploy-contracts`
job. The `publish-nuget` job receives the value as a job output, so it honours the per-environment
setting without needing its own environment scope (and without triggering an extra approval gate on
mainnet environments).

See [github-environments-setup.md](./github-environments-setup.md) for configuration instructions.
