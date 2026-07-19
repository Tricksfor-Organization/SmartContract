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
| `v1.2.3-rc.1` | `1.2.3-rc.1` | Not accepted by the current release workflow |
| `v1.2.3-beta.2` | `1.2.3-beta.2` | Not accepted by the current release workflow |
| `v1.2.3-alpha.1` | `1.2.3-alpha.1` | Not accepted by the current release workflow |

The current `Release NuGet package` workflow accepts only stable `vMAJOR.MINOR.PATCH` tags and
publishes them to nuget.org. It does not publish pre-release packages or use an environment-level
publish flag.

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

Publishing is independent of contract deployment. The workflow is defined in
`.github/workflows/release-package.yml` and runs when a GitHub Release is published or is manually
dispatched with an existing stable tag.

```
published GitHub Release or manual stable tag
  → validate vMAJOR.MINOR.PATCH
  → test SmartContract.sln
  → pack .nupkg and .snupkg
  → push to nuget.org with --skip-duplicate
  → upload workflow artifact
  → attach packages to the GitHub Release
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

It is included in the pack output, uploaded with the workflow artifact, and attached to the GitHub
Release. The current workflow pushes only the `.nupkg`; it does not separately push the `.snupkg` to
the nuget.org symbol server. Add and validate that publication step if hosted symbols are required.

The current workflow does not publish to GitHub Packages.

---

## Required secrets and variables

| Name | Type | Scope | Purpose |
|---|---|---|---|
| `NUGET_API_KEY` | Secret | Repository | API key for nuget.org push |
| `GITHUB_TOKEN` | Automatic | Repository | Read the tag/release and attach package files |

No GitHub Environment or `NUGET_PUBLISH_ENABLED` variable is involved in package publication.

See [github-environments-setup.md](./github-environments-setup.md) for configuration instructions.
