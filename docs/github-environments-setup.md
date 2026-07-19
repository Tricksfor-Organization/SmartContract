# GitHub Environments Setup

This page is the current GitHub configuration reference for the manual testnet and mainnet
deployment workflows. The full operating sequence is in the
[Deployment Operator Runbook](deployment.md).

## 1. Create the environments

Open **Repository → Settings → Environments → New environment** and create:

| Environment         | Stage   | Chain ID | `NETWORK_KEY`      |
| ------------------- | ------- | -------: | ------------------ |
| `ethereum-sepolia`  | Testnet | 11155111 | `sepolia`          |
| `ethereum-mainnet`  | Mainnet |        1 | `mainnet`          |
| `polygon-amoy`      | Testnet |    80002 | `polygon_amoy`     |
| `polygon-mainnet`   | Mainnet |      137 | `polygon`          |
| `optimism-sepolia`  | Testnet | 11155420 | `optimism_sepolia` |
| `optimism-mainnet`  | Mainnet |       10 | `optimism`         |
| `bsc-testnet`       | Testnet |       97 | `bsc_testnet`      |
| `bsc-mainnet`       | Mainnet |       56 | `bsc`              |
| `avalanche-fuji`    | Testnet |    43113 | `avalanche_fuji`   |
| `avalanche-mainnet` | Mainnet |    43114 | `avalanche`        |

Environment names must match the `deploy_env` choices in `deploy-testnet.yml`,
`deploy-mainnet.yml`, and `mint-mainnet.yml` exactly.

## 2. Configure protection rules

For each mainnet environment:

1. Open **Settings → Environments → {environment}**.
2. Enable **Required reviewers** and add the approved contract-release reviewers.
3. Prevent self-review when repository policy supports it.
4. Restrict deployment branches/tags to the approved release policy.
5. Optionally configure a wait timer as a cancellation window.
6. Save the protection rules.

Testnet environments may omit reviewers, but they should still restrict deployments to trusted
branches. The `Deploy testnet` workflow is manual; testnets are not automatically deployed when a
release is published.

## 3. Add environment secrets

In each environment, select **Environment secrets → Add secret**.

| Secret                 | Required                   | Description                                           |
| ---------------------- | -------------------------- | ----------------------------------------------------- |
| `RPC_URL`              | Always                     | Full JSON-RPC URL, including provider key             |
| `DEPLOYER_PRIVATE_KEY` | Always                     | 32-byte private key for the funded deployment account |
| `EXPLORER_API_KEY`     | If verification is enabled | Etherscan API V2-compatible key                       |
| `CLOUDFLARE_API_TOKEN` | If metadata is published   | Token scoped for Pages direct upload                  |

Security requirements:

- Never store these values as workflow inputs or repository files.
- Use a separate deployment account from personal and treasury accounts.
- Do not reuse a mainnet deployment key on testnets.
- Rotate a credential immediately if it appears in logs or shell history.
- Review provider/API-token scope before each mainnet release.

## 4. Add environment variables

In each environment, select **Environment variables → Add variable**.

| Variable                | Required                   | Description                                 |
| ----------------------- | -------------------------- | ------------------------------------------- |
| `ADMIN_ADDRESS`         | Always                     | Initial delayed NFT default administrator   |
| `MINTER_ADDRESS`        | Always                     | Initial NFT `MINTER_ROLE` holder            |
| `STAKING_OWNER_ADDRESS` | Always                     | Initial staking owner                       |
| `NETWORK_KEY`           | If verification is enabled | Exact value from the environment table      |
| `VERIFY_ENABLED`        | Recommended                | Exact lowercase `true` enables verification |
| `CLOUDFLARE_ACCOUNT_ID` | If metadata is published   | Cloudflare account ID                       |
| `CF_PAGES_PROJECT`      | If metadata is published   | Pages project receiving the staged site     |

Address rules:

- All three addresses must be non-zero, 20-byte hexadecimal addresses.
- For the current state-changing testnet smoke flow, `MINTER_ADDRESS` must equal the address derived
  from `DEPLOYER_PRIVATE_KEY`.
- On mainnet, `ADMIN_ADDRESS` and `STAKING_OWNER_ADDRESS` must differ from the deployer and should be
  independently reviewed multisigs.
- Do not configure mainnet until the state-changing mainnet smoke and royalty-receiver blockers in
  the deployment runbook are closed.

## 5. Values not used by current workflows

Do not add these values for the current workflow unless another integration independently requires
them:

| Obsolete deployment value        | Current source                          |
| -------------------------------- | --------------------------------------- |
| Repository variable `DEPLOY_ENV` | Manual workflow `deploy_env` input      |
| Environment variable `CHAIN_ID`  | Checked-in deployment parameter file    |
| `NFT_BASE_DOMAIN`                | Checked-in metadata/deployment URLs     |
| `NUGET_PUBLISH_ENABLED`          | NuGet publishing is a separate workflow |
| `EXPLORER_NAME`                  | Not consumed by the current workflow    |
| `EXPLORER_BASE_URL`              | Not consumed by the current workflow    |

## 6. Repository-level NuGet secret

Open **Settings → Secrets and variables → Actions → Secrets → New repository secret** and add:

| Secret          | Required                 | Description                                  |
| --------------- | ------------------------ | -------------------------------------------- |
| `NUGET_API_KEY` | When publishing releases | nuget.org key for `Tricksfor.SmartContracts` |

This secret is consumed only by `release-package.yml`. `GITHUB_TOKEN` is supplied automatically by
GitHub Actions.

## 7. Cloudflare configuration

If `deploy_metadata=true`, complete [Cloudflare Pages Setup](cloudflare-pages-setup.md) and add the
Cloudflare secret and variables to the selected environment.

The workflow deploys to a Pages branch named exactly after the environment. Confirm that the Pages
project and custom-domain routing serve that branch at the fixed URLs in the selected
`deployment-params.json` and `nft-manifest.json`. A successful upload alone does not prove that the
contract URLs resolve to the new deployment.

## 8. Configuration review checklist

Before the first deployment to an environment:

- [ ] Environment name exactly matches a workflow choice.
- [ ] RPC URL returns the expected chain ID.
- [ ] Deployer public address is recorded without exposing its key.
- [ ] Deployer has enough native currency.
- [ ] Admin, minter, and staking owner addresses were independently checked.
- [ ] Current testnet minter/deployer requirement is satisfied.
- [ ] Mainnet reviewer protection is enabled where applicable.
- [ ] `NETWORK_KEY` matches the table.
- [ ] Explorer key is configured when verification is enabled.
- [ ] Cloudflare project/branch/custom-domain routing is proven when metadata is published.
- [ ] Repository `NUGET_API_KEY` is configured only if package publication is intended.

## 9. Adding a network

Adding a network requires code and documentation changes; creating an environment alone is not
enough.

1. Add the Hardhat network and chain ID.
2. Add the environment choice to the appropriate workflows.
3. Add `deployments/config/{environment}/deployment-params.json`.
4. Add `deployments/config/{environment}/nft-manifest.json`.
5. Add metadata routing and validation coverage.
6. Add the environment and network key to this guide.
7. Test compilation, verification, deployment, resume, and smoke behavior before enabling mainnet.
