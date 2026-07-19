# Archived Release Operations Guide

The all-in-one `release-deploy.yml` workflow documented here was removed. Its former procedures are
not valid for the current repository.

Use these current references instead:

- [Deployment Operator Runbook](deployment.md) — testnet and mainnet operating procedure
- [GitHub Environments Setup](github-environments-setup.md) — current secrets, variables, and approvals
- [Cloudflare Pages Setup](cloudflare-pages-setup.md) — current Wrangler upload and routing requirement
- [Verification Troubleshooting](verification-troubleshooting.md) — current blocking verification behavior
- [NuGet Packaging](nuget-packaging.md) — independent release-package workflow
- [`deployments/mint-plans/README.md`](../deployments/mint-plans/README.md) — reviewed mint plans

The following former assumptions are explicitly obsolete:

- publishing a GitHub Release no longer automatically deploys contracts;
- repository variable `DEPLOY_ENV` no longer selects a deployment;
- `CHAIN_ID`, `NFT_BASE_DOMAIN`, `NUGET_PUBLISH_ENABLED`, `EXPLORER_NAME`, and
  `EXPLORER_BASE_URL` are not consumed by current deployment workflows;
- verification is not a separate non-blocking job;
- NuGet publication is independent of contract deployment;
- Cloudflare upload uses Wrangler and selected-chain staging rather than the archived Pages action
  and full-tree upload.

Current contract deployments are manual, one environment at a time, through `Deploy testnet` or
`Deploy mainnet`. Mainnet remains blocked by the readiness issues recorded in the deployment
runbook.
