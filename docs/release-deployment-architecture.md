# Archived Release-Driven Deployment Architecture

This file previously described the deleted all-in-one `release-deploy.yml` design. It is retained as
a compatibility link only; its workflow model is no longer implemented.

The current architecture is:

```text
pull request / push to main
  → CI validation, tests, security analysis, metadata checks, package inspection

manual Deploy testnet
  → one protected testnet → optional metadata → deploy/resume → optional verification → smoke

published stable GitHub Release
  → independent NuGet package workflow

manual Deploy mainnet
  → one protected mainnet from an existing stable release tag

manual Execute reviewed mainnet mint plan
  → dry-run or protected resumable mint execution
```

See:

- [Deployment Operator Runbook](deployment.md)
- [GitHub Environments Setup](github-environments-setup.md)
- [Cloudflare Pages Setup](cloudflare-pages-setup.md)
- [Verification Troubleshooting](verification-troubleshooting.md)
- [NuGet Packaging](nuget-packaging.md)

Do not recreate the old release-triggered deployment, repository-level `DEPLOY_ENV` selector,
environment-controlled NuGet publication, separate `verify-contracts` job, or archived Cloudflare
Pages action from old issue descriptions or external copies of this document.
