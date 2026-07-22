# Deployment Operator Runbook

This is the source of truth for building, configuring, deploying, verifying, and recording the
Tricksfor Booster contracts. The checked-in workflows are authoritative when this document and an
older design document disagree.

The repository deploys two contracts per network:

1. `TricksforBoosterNFT`
2. `TricksforBoosterStaking`, constructed with the deployed NFT address

Deployment and bulk minting are separate operations. A contract deployment must never be treated as
authorization to mint the documented 600-token allocation.

## 1. Current deployment status

### Testnets

The protected testnet workflow is suitable for controlled rollout, starting with Ethereum Sepolia.
It deploys metadata optionally, deploys or resumes both contracts, verifies them optionally, and
runs a state-changing mint/stake/unstake smoke flow.

For the current smoke implementation, the testnet `MINTER_ADDRESS` must be the address derived from
`DEPLOYER_PRIVATE_KEY`. The smoke runner mints token ID `1` with that account.

### Mainnets: blocked pending two corrections

Do not execute `Deploy mainnet` until both of these issues are resolved and revalidated on every
testnet:

1. The reusable deployment workflow currently runs the state-changing smoke command on mainnet.
   It either mints production token ID `1` to the deployer or fails after deployment when the
   configured minter is a different account. Mainnet needs a read-only smoke path.
2. Every deployment parameter file currently leaves `RoyaltyReceiver` empty, which makes the runner
   use the deployer, while generated collection metadata uses a placeholder burn address for
   `fee_recipient`. The explicit intended royalty receiver must drive both values.

Mainnet metadata is also blocked until all 33 placeholder source images are replaced and
`nft-assets/images/collection.png` is supplied.

## 2. Toolchain and validation

Use Node.js 22, .NET 8, and the repository-pinned Solidity compiler 0.8.26.

```bash
npm ci
npm run artifacts:check
npm test
npm run test:coverage
dotnet restore SmartContract.sln
dotnet build SmartContract.sln --configuration Release --no-restore
dotnet test SmartContract.sln --configuration Release --no-build
```

`npm run compile` is the artifact-generation command. It refreshes the Hardhat build information,
ABI, bytecode, and Nethereum bindings together. CI rejects artifact drift.

Before any remote deployment, require a green `CI` run for the exact commit or release tag being
deployed. Do not deploy from a local dirty worktree.

## 3. Supported environments

| GitHub Environment  | Chain                   | Chain ID | `NETWORK_KEY`      | Admin delay |
| ------------------- | ----------------------- | -------: | ------------------ | ----------: |
| `ethereum-sepolia`  | Ethereum Sepolia        | 11155111 | `sepolia`          |           0 |
| `ethereum-mainnet`  | Ethereum                |        1 | `mainnet`          |      172800 |
| `polygon-amoy`      | Polygon Amoy            |    80002 | `polygon_amoy`     |           0 |
| `polygon-mainnet`   | Polygon                 |      137 | `polygon`          |      172800 |
| `optimism-sepolia`  | OP Sepolia              | 11155420 | `optimism_sepolia` |           0 |
| `optimism-mainnet`  | Optimism                |       10 | `optimism`         |      172800 |
| `bsc-testnet`       | BNB Smart Chain Testnet |       97 | `bsc_testnet`      |           0 |
| `bsc-mainnet`       | BNB Smart Chain         |       56 | `bsc`              |      172800 |
| `avalanche-fuji`    | Avalanche Fuji          |    43113 | `avalanche_fuji`   |           0 |
| `avalanche-mainnet` | Avalanche C-Chain       |    43114 | `avalanche`        |      172800 |

Chain IDs and admin delays come from `deployments/config/{environment}/deployment-params.json`.
Hardhat network keys come from `hardhat.config.ts`.

## 4. One-time GitHub configuration

Follow [GitHub Environments Setup](github-environments-setup.md) for the click-by-click procedure.

Create all ten environments under **Settings → Environments**. Mainnet environments must have:

- required reviewers;
- deployment branch/tag restrictions appropriate to the repository release policy;
- an optional wait timer and a documented cancellation contact.

### Environment secrets

| Name                   | Required                    | Purpose                                        |
| ---------------------- | --------------------------- | ---------------------------------------------- |
| `RPC_URL`              | Always                      | Exact JSON-RPC endpoint for the selected chain |
| `DEPLOYER_PRIVATE_KEY` | Always                      | Funded transaction-signing account             |
| `EXPLORER_API_KEY`     | When `VERIFY_ENABLED=true`  | Etherscan API V2-compatible verification key   |
| `CLOUDFLARE_API_TOKEN` | When `deploy_metadata=true` | Pages direct-upload credential                 |

### Environment variables

| Name                    | Required                     | Purpose                                            |
| ----------------------- | ---------------------------- | -------------------------------------------------- |
| `ADMIN_ADDRESS`         | Always                       | Initial delayed NFT default administrator          |
| `MINTER_ADDRESS`        | Always                       | Initial NFT `MINTER_ROLE` holder                   |
| `STAKING_OWNER_ADDRESS` | Always                       | Initial `Ownable2Step` staking owner               |
| `NETWORK_KEY`           | When verification is enabled | Matching key from the supported-environments table |
| `VERIFY_ENABLED`        | Recommended                  | Exact lowercase `true` enables verification        |
| `CLOUDFLARE_ACCOUNT_ID` | When `deploy_metadata=true`  | Cloudflare account identifier                      |
| `CF_PAGES_PROJECT`      | When `deploy_metadata=true`  | Target Pages project                               |

All three privileged addresses must be non-zero, 20-byte hexadecimal addresses. On mainnet,
`ADMIN_ADDRESS` and `STAKING_OWNER_ADDRESS` must differ from the deployer and should be reviewed
multisigs. GitHub cannot determine whether an address is a multisig; reviewers must verify it.

The current workflows do not use repository variable `DEPLOY_ENV`, environment variable `CHAIN_ID`,
`NFT_BASE_DOMAIN`, `NUGET_PUBLISH_ENABLED`, `EXPLORER_NAME`, or `EXPLORER_BASE_URL`.

### Repository secret

`NUGET_API_KEY` is required only by `Release NuGet package`. Contract deployment does not publish a
NuGet package.

## 5. One-time Cloudflare configuration

Follow [Cloudflare Pages Setup](cloudflare-pages-setup.md) before selecting
`deploy_metadata=true`.

The current workflow:

1. validates the common source image manifest;
2. generates only the selected chain output;
3. validates that output;
4. stages only `{chainKey}/`, `_headers`, and `_redirects`;
5. uploads `site/` with Wrangler to a branch named after the GitHub Environment.

The checked-in contract parameters use fixed URLs under:

- `https://nft-preview.tricksfor.com/{chainKey}/...` for testnets;
- `https://nft.tricksfor.com/{chainKey}/...` for mainnets.

Before deploying contracts, prove that the Pages project, branch, custom domain, and routing setup
serves the newly uploaded branch at those exact URLs. The runner checks token ID `1` metadata and
collection metadata before it sends a transaction. Do not bypass this check outside isolated local
development.

## 6. Wallet and balance preparation

For each environment:

1. Create a dedicated deployment account; never reuse a personal wallet.
2. Store its private key only as `DEPLOYER_PRIVATE_KEY` in the matching protected environment.
3. Derive and independently record its public address.
4. Fund it with enough native currency for two deployments plus the smoke transactions and margin.
5. Confirm the RPC endpoint returns the expected chain ID.
6. Confirm the privileged addresses with a second reviewer.

The runner rejects a chain-ID mismatch, zero balance, failed fee estimation, malformed privileged
address, zero privileged address, and unreachable metadata.

For testnets, obtain native tokens from a network-supported faucet. Faucet availability changes, so
the operator should use the network/provider's current official faucet documentation rather than a
hard-coded repository URL.

## 7. Deployment parameter review

Review `deployments/config/{environment}/deployment-params.json` at the exact source revision being
deployed. Confirm:

- `Network` matches the selected GitHub Environment;
- `ChainId` matches the supported-environments table;
- collection name is `Tricksfor Boosters - {Chain}`;
- symbol is `TFB`;
- base URI and contract URI use the intended chain key and stage domain;
- royalty fee basis points are approved;
- default-admin delay is appropriate for the environment;
- the royalty receiver issue described in Section 1 has been resolved before mainnet.

The checked-in admin, minter, and staking-owner fields are intentionally overridden by protected
environment variables. `RoyaltyReceiver` is not currently overridden by the workflow; an empty
value falls back to the deployer. Do not commit a private key.

## 8. Ethereum Sepolia rollout

Use Ethereum Sepolia as the first real deployment.

### Pre-deployment checklist

- [ ] CI is green for the selected commit.
- [ ] `ethereum-sepolia` exists as a GitHub Environment.
- [ ] `RPC_URL` is an Ethereum Sepolia endpoint.
- [ ] The deployer is funded with Sepolia ETH.
- [ ] `ADMIN_ADDRESS` is reviewed.
- [ ] `MINTER_ADDRESS` equals the deployer address for the current state-changing smoke flow.
- [ ] `STAKING_OWNER_ADDRESS` is reviewed.
- [ ] `NETWORK_KEY=sepolia`.
- [ ] `VERIFY_ENABLED=true` and `EXPLORER_API_KEY` is configured, or verification is explicitly waived.
- [ ] Cloudflare values are configured if metadata will be published.
- [ ] Token ID `1` and collection metadata URLs will be reachable after upload.
- [ ] No production private key or production address is being used.

### Dispatch

1. Open **GitHub → Actions → Deploy testnet**.
2. Select **Run workflow** from the intended source branch. Use the protected default branch for an
   auditable rollout.
3. Select `ethereum-sepolia`.
4. Set `deploy_metadata=true` only when the Cloudflare branch/domain routing has been checked.
5. Leave `force=false` for a first deployment or ordinary resumable rerun.
6. Start the workflow and complete any configured environment approval.

Testnet metadata currently permits placeholder images with explicit warnings. This is for technical
rollout only and does not make those assets production-ready.

### Expected workflow sequence

1. Checkout the selected commit.
2. Install Node.js and .NET dependencies.
3. Compile synchronized Solidity/Nethereum artifacts.
4. Build the .NET solution.
5. Optionally validate, generate, stage, and upload selected metadata.
6. Copy the selected deployment parameter file into the runner output.
7. Deploy or resume the NFT contract.
8. Deploy or resume the staking contract linked to the NFT.
9. Verify both contracts when enabled.
10. Mint token ID `1`, approve, stake, decode `TokenStaked`, unstake, decode `TokenUnstaked`, and
    reconcile final custody.
11. Upload the environment deployment directory as a workflow artifact.

### Review results

Do not call the deployment successful until all of these are checked:

- workflow summary contains both non-zero addresses;
- both deployment transaction receipts succeeded;
- deployed runtime bytecode exists at both addresses;
- NFT name, symbol, URIs, ERC-165/ERC-721/ERC-721 Enumerable/ERC-2981 interfaces, royalty result,
  admin, minter, and pause state are correct;
- staking owner and NFT linkage are correct;
- verification transcripts show success when verification was enabled;
- `smoke-result.json` contains mint/approve/stake/unstake transaction hashes;
- exactly one matching `TokenStaked` and `TokenUnstaked` event was decoded;
- final token owner is the deployer and `isStaked(1)` is false;
- downloaded artifacts are stored with the test deployment record.

## 9. Remaining testnet rollout

After Ethereum Sepolia passes, repeat Section 8 one environment at a time:

1. `polygon-amoy`
2. `optimism-sepolia`
3. `bsc-testnet`
4. `avalanche-fuji`

Change the RPC endpoint, native faucet funding, and `NETWORK_KEY` for each environment. Never reuse a
previous environment's RPC URL without confirming the returned chain ID.

Mainnet remains disabled until the same source revision succeeds on all five testnets and the
mainnet blockers in Section 1 are closed.

## 10. Mainnet release procedure

This procedure is a readiness checklist only while Section 1 remains unresolved.

### Release prerequisites

- [ ] State-changing mainnet smoke has been replaced by a read-only smoke command or excluded from mainnet.
- [ ] Explicit royalty receiver drives both on-chain royalty configuration and collection metadata.
- [ ] All 33 final source images are present and no placeholder is accepted.
- [ ] `nft-assets/images/collection.png` is present and final.
- [ ] Generated metadata validates for the selected mainnet.
- [ ] All five testnet rollouts passed using the release candidate source.
- [ ] CI is green for the exact stable tag commit.
- [ ] Contract/package version reflects the constructor breaking change.
- [ ] Mainnet admin and staking owner are approved multisigs and differ from the deployer.
- [ ] Minter and royalty recipient policies are approved.
- [ ] Deployment account contains only the native currency required for deployment plus margin.
- [ ] Incident contact, pause authority, and ownership-acceptance procedure are documented.

### Create the stable release

1. Create an annotated tag matching exactly `vMAJOR.MINOR.PATCH` on the approved commit.
2. Push the tag.
3. Create and publish the corresponding GitHub Release.
4. Confirm `Release NuGet package` succeeds or is intentionally handled before contract deployment.
5. Confirm the release contains the intended source commit and immutable release notes.

### Dispatch one mainnet

After the blockers are closed:

1. Open **GitHub → Actions → Deploy mainnet**.
2. Select the protected default branch.
3. Select exactly one mainnet environment.
4. Enter the existing stable release tag.
5. Set `deploy_metadata=true` unless the exact production URLs are already populated and verified.
6. Leave `force=false`.
7. Start the workflow.
8. Required reviewers compare the selected environment, tag commit, chain ID, deployer, privileged
   addresses, royalty receiver, URIs, and balance before approving.
9. Review manifests, verification transcripts, read-only smoke results, and explorer pages.
10. Confirm permanent deployment records were attached to the GitHub Release.
11. Confirm the final staking owner directly. Any later ownership transfer must complete the
    `Ownable2Step` pending-owner acceptance process.

Deploy only one mainnet at a time. Do not approve the next network until the previous deployment has
been independently reconciled.

## 11. Resumability, reruns, and `force`

Each contract receipt is written to its environment manifest. On rerun, the runner reuses a manifest
address only when live bytecode is still present.

Use a normal rerun with `force=false` when:

- metadata upload or verification temporarily failed;
- the workflow stopped after the NFT deployment;
- the workflow stopped after both deployments but before smoke or artifact upload;
- an RPC or explorer outage has been resolved.

Use `force=true` only when all of the following are true:

- replacement deployment is intentional;
- the exact existing addresses and downstream consumers have been identified;
- reviewers approve abandoning or superseding those addresses;
- release notes will preserve both old and new deployment records;
- duplicate production contracts will not confuse the backend, marketplace, or users.

`force` creates replacement contracts; it does not upgrade or repair an existing deployment.

If deployment succeeded but a later step failed, download the artifact before rerunning whenever
possible. A successful on-chain transaction cannot be rolled back by GitHub Actions.

## 12. Verification

When `VERIFY_ENABLED=true`, verification runs inside the reusable deployment job after both
contracts deploy. It uses the synchronized Hardhat production build information and constructor
arguments from each manifest.

Verification is currently blocking: a failed verification step prevents the later smoke, summary,
and successful release attachment steps. The `always()` artifact upload should still preserve the
deployment directory. Follow [Verification Troubleshooting](verification-troubleshooting.md).

## 13. Deployment records

The workflow artifact contains `deployments/{environment}/`, including:

- `TricksforBoosterNFT.json`;
- `TricksforBoosterStaking.json`;
- verification transcripts when enabled;
- `smoke-result.json` after a successful smoke flow.

Manifests record chain, address, transaction status/hash/block/gas, deployer, source commit,
constructor arguments, compiler/settings, code hashes, and final roles/owner. They are also inputs to
resumability. Mainnet records are attached to the corresponding GitHub Release after a successful
run.

Never delete or overwrite a material deployment record without preserving an immutable copy.

## 14. NuGet release

`Release NuGet package` is independent of chain deployment. It runs when a GitHub Release is
published or can be dispatched manually with a stable tag. It tests the solution, packs
`Tricksfor.Blockchain.Booster`, publishes with `NUGET_API_KEY`, uploads the package artifact, and
attaches the package to the release.

Publishing the same stable release again is protected by `--skip-duplicate`, but operators should
still treat a published package version as immutable.

## 15. Production minting

Production minting uses **Execute reviewed mainnet mint plan**, not the deployment workflow.

1. Create a token-to-recipient plan following `deployments/mint-plans/README.md`.
2. Commit and review the plan.
3. Dispatch the mint workflow with `dry_run=true`.
4. Review `mint-results.json` and resolve every ownership mismatch.
5. Obtain protected-environment approval for execution.
6. Dispatch again with `dry_run=false` only after explicit mint approval.
7. Preserve the final mint results with the release records.

The runner skips an already-minted token only when its current owner matches the plan. Any mismatch
aborts the operation.

## 16. Local development

Start a local Hardhat node, then deploy with the local development key:

```bash
npx hardhat node

export DEPLOY_ENV=localhost
export Deployment__PrivateKey='<local-hardhat-private-key>'

dotnet run --project src/Tricksfor.Blockchain.Booster.Deploy -- deploy
dotnet run --project src/Tricksfor.Blockchain.Booster.Deploy -- smoke
dotnet run --project src/Tricksfor.Blockchain.Booster.Deploy -- mint --dry-run
```

Never use a production private key in local shell history or committed configuration.
