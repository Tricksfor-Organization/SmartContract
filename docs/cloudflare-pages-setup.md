# Cloudflare Pages Setup

This guide describes how to create and configure a Cloudflare Pages project for hosting
Tricksfor Booster NFT metadata and images, and how to connect it to the release workflow.

The static files live under [`nft-assets/`](../nft-assets/README.md) in this repository.
They are deployed to Cloudflare Pages by the `deploy-metadata` job in `release-deploy.yml`
before the smart contracts are deployed.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Create the Cloudflare Pages Project](#2-create-the-cloudflare-pages-project)
3. [Bind a Custom Domain](#3-bind-a-custom-domain)
4. [Configure GitHub Environments](#4-configure-github-environments)
5. [Variable and Secret Reference](#5-variable-and-secret-reference)
6. [How the Workflow Uses These Values](#6-how-the-workflow-uses-these-values)
7. [Manual Deployment (Optional)](#7-manual-deployment-optional)
8. [Multi-Chain Deployment Strategy](#8-multi-chain-deployment-strategy)

---

## 1. Prerequisites

- A Cloudflare account with Pages enabled.
- DNS for `nft.tricksfor.com` (or your custom domain) managed through Cloudflare.
- A Cloudflare API token with **Cloudflare Pages: Edit** permission.

---

## 2. Create the Cloudflare Pages Project

1. Log in to [Cloudflare dashboard](https://dash.cloudflare.com/).
2. Open **Workers & Pages → Create application → Pages**.
3. Choose **Direct Upload** (the workflow pushes files directly — do not connect via Git here).
4. Name the project (e.g. `tricksfor-nft`).  
   This name becomes `CF_PAGES_PROJECT` in your GitHub Environment variables.
5. Complete the wizard. The initial upload can be empty; the workflow will populate it.

---

## 3. Bind a Custom Domain

1. In the Cloudflare Pages project, open **Custom domains → Set up a custom domain**.
2. Enter `nft.tricksfor.com` (or your chosen domain).
3. Follow the DNS verification steps. Because the domain is managed by Cloudflare, a CNAME
   record pointing to `{project-name}.pages.dev` is created automatically.
4. Wait for the domain to become active (usually a few minutes).

The custom domain value (`nft.tricksfor.com`) becomes `NFT_BASE_DOMAIN` in your GitHub
Environment variables.

> **Note:** Custom domains are optional. Without one, assets are served from
> `https://{project-name}.pages.dev`. The workflow falls back to this URL if `NFT_BASE_DOMAIN`
> is not set. However, custom domain URLs are stable and recommended for mainnet deployments.

---

## 4. Configure GitHub Environments

Add the following values to each GitHub Environment that will deploy to this Pages project
(see [`docs/github-environments-setup.md`](github-environments-setup.md) for the full
environment setup guide).

### New Environment Secret

| Secret name            | Description                                                     |
|------------------------|-----------------------------------------------------------------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token with **Cloudflare Pages: Edit** permission |

Add this under **Settings → Environments → {env-name} → Secrets**.

### New Environment Variables

| Variable name          | Required | Description                                                          | Example                      |
|------------------------|----------|----------------------------------------------------------------------|------------------------------|
| `CLOUDFLARE_ACCOUNT_ID`| Yes      | Cloudflare account ID (visible in the dashboard URL or account home) | `a1b2c3d4e5f6...`            |
| `CF_PAGES_PROJECT`     | Yes      | Cloudflare Pages project name                                        | `tricksfor-nft`              |
| `NFT_BASE_DOMAIN`      | No       | Custom domain for the Pages site (without protocol or trailing slash)| `nft.tricksfor.com`          |

Add these under **Settings → Environments → {env-name} → Variables**.

> **Why `CLOUDFLARE_ACCOUNT_ID` as a variable and not a secret?**  
> The account ID is not sensitive — it is visible in the Cloudflare dashboard URL and does
> not grant any access on its own. Storing it as a variable keeps it auditable and avoids
> treating non-sensitive values as secrets.

---

## 5. Variable and Secret Reference

### Summary table

| Name                   | Type     | Scope       | Required | Purpose                                              |
|------------------------|----------|-------------|----------|------------------------------------------------------|
| `CLOUDFLARE_API_TOKEN` | Secret   | Environment | Yes      | Authenticates the Pages deployment action            |
| `CLOUDFLARE_ACCOUNT_ID`| Variable | Environment | Yes      | Identifies the Cloudflare account                    |
| `CF_PAGES_PROJECT`     | Variable | Environment | Yes      | Names the Cloudflare Pages project to deploy to      |
| `NFT_BASE_DOMAIN`      | Variable | Environment | No       | Resolves the final base URI; falls back to `*.pages.dev` |

### Creating the Cloudflare API token

1. Go to **Cloudflare dashboard → My Profile → API Tokens → Create Token**.
2. Use the **Edit Cloudflare Workers** template, or create a custom token with:
   - **Account** → **Cloudflare Pages: Edit**
   - Account Resource → include the specific account
3. Copy the token value and store it as the `CLOUDFLARE_API_TOKEN` environment secret in
   GitHub.

---

## 6. How the Workflow Uses These Values

When a GitHub Release is published, the `release-deploy.yml` workflow:

1. **Runs tests** (`test` job).
2. **Deploys NFT assets** (`deploy-metadata` job):
   - Checks out the repository.
   - Validates that `CF_PAGES_PROJECT` is set.
   - Runs `cloudflare/pages-action@v1` to deploy the `nft-assets/` directory, including
     `_headers`, `_redirects`, `metadata/`, `images/`, and `contract/`.
   - Resolves the final base URI and contract URI:
     - If `NFT_BASE_DOMAIN` is set: `https://{NFT_BASE_DOMAIN}/metadata/`
     - Otherwise: `https://{CF_PAGES_PROJECT}.pages.dev/metadata/`
   - Outputs `base_token_uri` and `contract_uri`.
3. **Deploys contracts** (`deploy-contracts` job):
   - Receives `base_token_uri` and `contract_uri` from `deploy-metadata`.
   - Overrides the deployment runner config via `Deployment__Nft__BaseUri` and
     `Deployment__Nft__ContractMetadataUri` environment variables.
   - These resolved URLs are used as the NFT contract constructor arguments.

The `deploy-contracts` job only runs if `deploy-metadata` succeeds. This ensures contracts
are never deployed with unresolved or incorrect metadata URLs.

### tokenURI and the `_redirects` rewrite

The NFT contract uses the OpenZeppelin default `tokenURI(id) = {baseURI}{id}` — no `.json`
suffix. Static metadata files are named `{tokenId}.json`. The `nft-assets/_redirects` file
includes a Cloudflare Pages proxy rewrite:

```
/metadata/:id  /metadata/:id.json  200
```

This serves the `.json` file transparently at the extensionless URL the contract produces,
so `tokenURI(1) → https://{domain}/metadata/1` resolves to the content of `metadata/1.json`.

### URL flow diagram

```
NFT_BASE_DOMAIN (env var)
        │
        ▼
deploy-metadata job
        ├── cloudflare/pages-action  (deploys nft-assets/ including _redirects)
        └── resolve-urls step
              ├── base_token_uri = https://{domain}/metadata/
              └── contract_uri   = https://{domain}/contract/collection.json
                    │
                    ▼
              deploy-contracts job
                    ├── Deployment__Nft__BaseUri         = base_token_uri
                    └── Deployment__Nft__ContractMetadataUri = contract_uri
                          │
                          ▼
                    TricksforBoosterNFT constructor
                          ├── tokenURI(id)  → https://{domain}/metadata/{id}
                          │                   (rewritten to /metadata/{id}.json via _redirects)
                          └── contractURI() → https://{domain}/contract/collection.json
```

---

## 7. Manual Deployment (Optional)

To deploy the `nft-assets/` directory manually without triggering a full release, use the
[Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/):

```bash
npm install -g wrangler

# Authenticate
wrangler login

# Deploy nft-assets/ to your Pages project
wrangler pages deploy nft-assets/ \
  --project-name tricksfor-nft
```

Or use the Cloudflare dashboard: **Workers & Pages → {project} → Deployments → Upload**.

> Manual deployments are useful for verifying metadata before a release. The release
> workflow will overwrite manual uploads with the committed `nft-assets/` contents when
> a GitHub Release is published.

---

## 8. Multi-Chain Deployment Strategy

The Tricksfor Booster collection is deployed as a separate NFT contract on each supported
chain (Ethereum, Polygon, Optimism, BNB Smart Chain, Avalanche). Each chain's contract
references the same static metadata hosted on Cloudflare Pages. The release workflow
targets one GitHub Environment per chain/stage, and each environment can be configured
with its own Cloudflare Pages project and custom domain.

### Testnet/mainnet isolation

> **Every release deploys `nft-assets/` to Cloudflare Pages before deploying contracts.**
> If all environments share the same project (`tricksfor-nft`) and domain
> (`nft.tricksfor.com`), a testnet release will overwrite the metadata that production
> contracts are pointing to. Use a dedicated project and domain for non-production
> environments.

| Category         | `CF_PAGES_PROJECT`       | `NFT_BASE_DOMAIN`             |
|------------------|--------------------------|-------------------------------|
| All mainnet envs | `tricksfor-nft`          | `nft.tricksfor.com`           |
| All testnet envs | `tricksfor-nft-preview`  | `nft-preview.tricksfor.com`   |

This isolation guarantees that:
- testnet releases never overwrite production metadata
- each mainnet chain's contract resolves to the same, authoritative `nft.tricksfor.com` URLs
- pre-release metadata can be verified on the preview domain before the contract is deployed

### How per-chain URLs are resolved

Because all mainnet environments share the same Cloudflare Pages project
(`tricksfor-nft`) and custom domain (`nft.tricksfor.com`), all mainnet contracts
produce identical metadata URLs regardless of which chain they are deployed to:

| Contract parameter | Resolved value (mainnet)                                  |
|--------------------|-----------------------------------------------------------|
| `BASE_TOKEN_URI`   | `https://nft.tricksfor.com/metadata/`                     |
| `CONTRACT_URI`     | `https://nft.tricksfor.com/contract/collection.json`      |

For testnet environments the same pattern applies using the preview domain:

| Contract parameter | Resolved value (testnet)                                         |
|--------------------|------------------------------------------------------------------|
| `BASE_TOKEN_URI`   | `https://nft-preview.tricksfor.com/metadata/`                    |
| `CONTRACT_URI`     | `https://nft-preview.tricksfor.com/contract/collection.json`     |

### Creating a second Pages project for testnet

Repeat the steps in [Section 2](#2-create-the-cloudflare-pages-project) and
[Section 3](#3-bind-a-custom-domain) for the testnet project:

1. Create a new Pages project named `tricksfor-nft-preview`.
2. Bind the custom domain `nft-preview.tricksfor.com`.
3. Set `CF_PAGES_PROJECT=tricksfor-nft-preview` and
   `NFT_BASE_DOMAIN=nft-preview.tricksfor.com` in every testnet GitHub Environment
   (`ethereum-sepolia`, `polygon-amoy`, `optimism-sepolia`, `bsc-testnet`, `avalanche-fuji`).

The `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` values can be reused across all
environments — a single API token with **Cloudflare Pages: Edit** scope covers both projects.

### Recommended per-environment configuration

See [`docs/release-operations.md`](release-operations.md#4-required-variables) — the
"Recommended variable values per environment" table — for the complete list of `CF_PAGES_PROJECT`,
`NFT_BASE_DOMAIN`, and other variable values for all ten supported environments.
