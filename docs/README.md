# Documentation Index — Tricksfor SmartContract

This index provides a single entry point to all implementation guidance, reference documents, AI instructions, and contributor checklists in this repository. If you are new to the project, start with the [Repository Context](ai/repository-context.md).

---

## Contracts

| Document | Description |
|---|---|
| Booster NFT Staking Specification *(planned)* | A dedicated full specification has not yet been added; use the contract source, backend integration contract, architecture guardrails, and security review meanwhile |
| [Backend Integration Contract](backend-integration-contract.md) | How backend services consume on-chain staking state: event semantics, read methods, consistency rules, and worked examples |

---

## Deployment

| Document | Description |
|---|---|
| [Deployment Operator Runbook](deployment.md) | Current source of truth, exact setup, testnet rollout, mainnet blockers/readiness, recovery, verification, NuGet, and minting |
| [Archived Release Operations Guide](release-operations.md) | Compatibility pointer explaining which former workflow assumptions are obsolete |
| [GitHub Environments Setup](github-environments-setup.md) | Step-by-step GitHub UI configuration reference for environment secrets, variables, and protection rules |
| [Archived Release Deployment Architecture](release-deployment-architecture.md) | Compatibility pointer from the deleted all-in-one workflow to the current architecture |
| [Cloudflare Pages Setup](cloudflare-pages-setup.md) | Current Wrangler selected-chain upload model and unresolved branch/custom-domain routing requirement |
| [Verification Troubleshooting](verification-troubleshooting.md) | Current blocking verification behavior, safe reruns, and exact manual verification commands |

---

## NFT Assets

| Document | Description |
|---|---|
| [NFT Asset Taxonomy and Token ID Mapping](nft-assets-spec.md) | Source-of-truth for asset naming, token ID mapping, static file layout, and supply manifest format — §§ 1–3 define the canonical identifiers used across all asset layers |
| [NFT Source Image Naming Specification](nft-image-naming-spec.md) | Deterministic naming convention for all 33 source image files: pattern, canonical keys, full file enumeration, and alignment rules with manifest and metadata fields |
| [NFT Asset Manifest Specification](nft-asset-manifest-spec.md) | Full manifest format for metadata generation, image pipeline, collection metadata, and validation |
| [NFT Asset Validation](nft-asset-validation.md) | Validation script usage and rule catalogue for manifest and generated asset checks |
| [NFT Metadata Generation](nft-metadata-generation.md) | Generation script usage, output format, and release workflow integration |
| [NFT Token Allocation Specification](nft-token-allocation-spec.md) | Per-theme token supply allocation rules and tier/variant distribution strategy |

---

## Metadata

| Document | Description |
|---|---|
| [NFT Copy Specification](nft-copy-spec.md) | Authoritative display names and description templates for all Booster NFT metadata: collection names, token names, and per-theme/option/tier descriptions |
| [NFT Token Metadata Schema](nft-metadata-schema.md) | Authoritative token metadata attribute schema: required fields, valid values, and per-theme examples |
| [Metadata Examples README](metadata/README.md) | Overview of token and collection metadata format, field requirements, and links to example JSON documents |
| [Token Metadata Example](metadata/token-example.json) | Reference token metadata JSON conforming to the OpenSea metadata standard |
| [Contract Metadata Example](metadata/contract-example.json) | Reference collection metadata JSON returned by `contractURI()` |

---

## Indexing

| Document | Description |
|---|---|
| [Indexing Specification](indexing-spec.md) | Detailed specification for how the Tricksfor backend indexer processes `TokenStaked`, `TokenUnstaked`, and `EmergencyWithdrawn` events, reconstructs state, handles reorgs, and reconciles indexed state against on-chain reads |

---

## OpenSea Readiness

| Document | Description |
|---|---|
| [OpenSea Readiness Checklist](opensea-readiness-checklist.md) | Deployment-ready checklist covering ERC-721 compliance, metadata output, `tokenURI` / `contractURI` / ERC-2981 royalty configuration, staking UX implications, and pre-launch smoke tests |
| [OpenSea Compatibility Skill](ai/skills/opensea-compatibility-skill.md) | Pre-PR checklist covering ERC-721 compliance, metadata output, `tokenURI` / `contractURI` / ERC-2981 royalty support, and staking UX implications for marketplace listings |

---

## AI Instructions

| Document | Description |
|---|---|
| [Copilot Instructions](../.github/copilot-instructions.md) | Repository-specific rules for GitHub Copilot and AI coding assistants: what to do, what to avoid, and platform-specific constraints |
| [AI Agent Brief](ai/agent-brief.md) | Detailed AI agent guidance: role, core priorities, non-negotiable rules, Nethereum obligations, and a quick-reference table |
| [Repository Context](ai/repository-context.md) | Domain overview, contract responsibilities, known downstream consumers, and key constraints for AI tools and new contributors |
| [Repository Memory](ai/memory.md) | Stable facts about the repository: event signatures, read methods, deployment assumptions, metadata assumptions, OpenSea compatibility expectations, and access control summary |

---

## Architecture Guardrails

| Document | Description |
|---|---|
| [Architecture Guardrails](ai/architecture-guardrails.md) | Architectural separation rules, event stability expectations, state model rules, testing expectations, security review expectations, and indexing compatibility requirements |
| [Automated Security Review — 2026-07-19](security-review-2026-07-19.md) | Reproducible Slither results, state-machine invariants, reviewed properties, and residual operational risks |

---

## AI Task Templates

Use these templates when opening issues or requesting AI-assisted work. Fill in the relevant sections before submitting.

| Template | When to Use |
|---|---|
| [Solidity Task Template](ai/task-templates/solidity-task-template.md) | Adding or modifying Solidity contract logic, events, or access control |
| [Nethereum Task Template](ai/task-templates/nethereum-task-template.md) | Adding or updating C# Nethereum DTOs, function messages, or integration tests |
| [Indexing Task Template](ai/task-templates/indexing-task-template.md) | Reviewing event schema changes for indexer impact, or defining log processing logic |
| [Security Review Template](ai/task-templates/security-review-template.md) | Performing a security review of contract changes before merging |

---

## AI Skills and Checklists

Apply these skills as part of every PR review. Each skill is a focused checklist for a specific area of risk.

| Skill | When to Apply |
|---|---|
| [Contract Change Skill](ai/skills/contract-change-skill.md) | Any change to a Solidity contract |
| [Event Change Skill](ai/skills/event-change-skill.md) | Any change to an emitted event (breaking-change risk) |
| [Nethereum Integration Skill](ai/skills/nethereum-integration-skill.md) | Any change that affects Nethereum DTOs or the C# integration layer |
| [OpenSea Compatibility Skill](ai/skills/opensea-compatibility-skill.md) | Any change to `TricksforBoosterNFT` metadata, royalties, or transfer logic |
| [Indexing Compatibility Skill](ai/skills/indexing-compatibility-skill.md) | Any change that could affect the backend indexer's ability to reconstruct state |
