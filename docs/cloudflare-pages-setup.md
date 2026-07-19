# Cloudflare Pages Setup

This guide describes the Cloudflare configuration consumed by the current reusable deployment
workflow. Contract deployment instructions are in the
[Deployment Operator Runbook](deployment.md).

## 1. Current publishing model

When `deploy_metadata=true`, `.github/workflows/_deploy.yml`:

1. validates the selected environment manifest;
2. generates its chain output under `nft-assets/{chainKey}/`;
3. validates the generated output;
4. stages only `{chainKey}/`, `_headers`, and `_redirects` under `site/`;
5. uses `cloudflare/wrangler-action@v3` to run:

   ```text
   pages deploy site --project-name={CF_PAGES_PROJECT} --branch={deploy_env}
   ```

The workflow does not use `cloudflare/pages-action`, upload the full `nft-assets` tree, or derive
contract URIs from the Pages response.

## 2. Known routing requirement

The checked-in contract and metadata configurations use fixed custom-domain URLs:

| Stage   | URL pattern                                        |
| ------- | -------------------------------------------------- |
| Testnet | `https://nft-preview.tricksfor.com/{chainKey}/...` |
| Mainnet | `https://nft.tricksfor.com/{chainKey}/...`         |

The workflow uploads a branch named after the environment, for example `ethereum-sepolia`, while
the contract preflight requests the fixed custom-domain URL.

Before relying on metadata deployment, explicitly prove how the custom domain serves the selected
branch. A Pages preview deployment is not automatically equivalent to the production custom domain.
If the fixed URL continues serving an older production branch, the upload can succeed while the
contract receives stale metadata.

This repository does not currently document or provision a Worker/router that maps chain paths to
different Pages branches. Treat the Pages branch/custom-domain mapping as an operational blocker
until one of these designs is implemented and tested:

- publish a complete multi-chain site atomically to the production branch;
- use separate hostnames/projects and configure each contract URI accordingly; or
- place an explicitly managed Cloudflare Worker/router in front of branch deployments.

Do not assume `_redirects` selects a Pages deployment branch; it only rewrites paths within the site
that is already serving the request.

## 3. Prerequisites

- A Cloudflare account with Pages enabled.
- DNS for the intended metadata hostname managed in the relevant Cloudflare zone.
- Permission to create a Pages project and bind a custom domain.
- A scoped API token with Pages edit permission.
- An approved branch/domain routing design from Section 2.

## 4. Create a Direct Upload project

1. Open the Cloudflare dashboard.
2. Select **Workers & Pages → Create application → Pages**.
3. Select **Direct Upload** rather than Git integration.
4. Enter the approved project name.
5. Complete the initial project creation.
6. Record the project name exactly; it becomes `CF_PAGES_PROJECT`.
7. Record the account ID; it becomes `CLOUDFLARE_ACCOUNT_ID`.

The current GitHub workflow, rather than Cloudflare Git integration, owns uploads.

## 5. Create the API token

1. Open **Cloudflare dashboard → My Profile → API Tokens → Create Token**.
2. Create a custom token scoped to the specific account.
3. Grant only the permission required to edit/deploy Cloudflare Pages projects.
4. Restrict account and resource scope as tightly as the deployment design permits.
5. Create the token and copy it once.
6. Store it as the selected GitHub Environment secret `CLOUDFLARE_API_TOKEN`.

Do not store the token in repository files, workflow inputs, or shell scripts.

## 6. Bind custom domains

After the routing model is selected:

1. Open the Pages project.
2. Select **Custom domains → Set up a custom domain**.
3. Enter the approved hostname.
4. Complete the DNS ownership checks.
5. Wait for the domain to become active.
6. Confirm HTTPS is valid.
7. Confirm the expected branch/site is serving the hostname.

At minimum, keep preview/testnet metadata isolated from production metadata. A testnet upload must
never replace content used by a mainnet contract.

## 7. Configure the GitHub Environment

Under **Settings → Environments → {environment}**, add:

| Name                    | Type     | Required for metadata deployment |
| ----------------------- | -------- | -------------------------------- |
| `CLOUDFLARE_API_TOKEN`  | Secret   | Yes                              |
| `CLOUDFLARE_ACCOUNT_ID` | Variable | Yes                              |
| `CF_PAGES_PROJECT`      | Variable | Yes                              |

`NFT_BASE_DOMAIN` is not consumed by the current workflow. Base and contract metadata URLs come
from the checked-in deployment parameter files and NFT manifests.

## 8. Validate before contract deployment

For the selected environment:

1. Run metadata generation and validation locally or in CI.
2. Confirm the source image and collection image policy for the target stage.
3. Dispatch a metadata-enabled testnet deployment only after the branch routing design is in place.
4. Inspect the Wrangler output and record its deployment URL.
5. Request the exact configured token URL, for example:

   ```bash
   curl --fail --show-error --silent \
     https://nft-preview.tricksfor.com/ethereum/metadata/1
   ```

6. Request the exact configured collection URL:

   ```bash
   curl --fail --show-error --silent \
     https://nft-preview.tricksfor.com/ethereum/contract/collection.json
   ```

7. Confirm both responses come from the newly uploaded content, not only that they return HTTP 200.
8. Confirm token JSON image URLs resolve.
9. Confirm `_headers` and `_redirects` behave as expected.

The Nethereum runner performs reachability checks before transactions, but it does not prove that a
200 response contains the intended release. Operators must compare content as well.

## 9. Production asset gate

Mainnet metadata must not be published until:

- all 33 source PNGs are final artwork rather than placeholders;
- `nft-assets/images/collection.png` exists and is final;
- every generated token and collection document validates;
- the collection `fee_recipient` matches the explicit on-chain royalty receiver;
- production and preview hosting are isolated;
- rollback and cache-purge procedures are documented;
- the exact production content is archived with the release.

The current generator's placeholder `fee_recipient` is a mainnet blocker. Do not work around it by
manually editing generated output; update the source configuration/generator atomically and test it.

## 10. Failure handling

### Upload fails

Check token scope, account ID, project name, and Pages service availability. No contract transaction
has been sent if the workflow stopped at the upload step.

### Upload succeeds but fixed URL is stale

Stop the deployment. Fix branch/custom-domain routing or publish the correct production site. Do not
disable metadata reachability or change contract URIs ad hoc during an approved release.

### Wrong content is served

Stop all deployments and minting. Preserve the bad deployment URL and workflow logs, restore the
approved content through the documented hosting process, purge caches when necessary, and verify
exact response bodies before resuming.

### Metadata publication is intentionally skipped

Set `deploy_metadata=false` only when the exact URIs already contain the approved content. The
contract runner will still require token ID `1` and collection metadata to be reachable.
