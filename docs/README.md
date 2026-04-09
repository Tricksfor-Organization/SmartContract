# Documentation Index — Tricksfor SmartContract

This index provides a single entry point to all implementation guidance, reference documents, AI instructions, and contributor checklists in this repository. If you are new to the project, start with the [Repository Context](ai/repository-context.md).

---

## Contracts

| Document | Description |
|---|---|
| [Booster NFT Staking Specification](booster-nft-staking-spec.md) *(coming soon)* | Full specification for the Booster NFT and staking contracts: state model, custody flow, event schema, and invariants |
| [Backend Integration Contract](backend-integration-contract.md) | How backend services consume on-chain staking state: event semantics, read methods, consistency rules, and worked examples |

---

## Deployment

| Document | Description |
|---|---|
| [Deployment Instructions](deployment.md) *(coming soon)* | Step-by-step instructions for deploying both contracts to a target network, including constructor arguments, verification, and post-deployment checks |

---

## Metadata

| Document | Description |
|---|---|
| [Metadata Examples](metadata-examples.md) *(coming soon)* | Example token and collection metadata JSON documents conforming to the OpenSea metadata standard |

---

## Indexing

| Document | Description |
|---|---|
| [Indexing Specification](indexing-spec.md) | Detailed specification for how the Tricksfor backend indexer processes `TokenStaked`, `TokenUnstaked`, and `EmergencyWithdrawn` events, reconstructs state, handles reorgs, and reconciles indexed state against on-chain reads |

---

## OpenSea Readiness

| Document | Description |
|---|---|
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
