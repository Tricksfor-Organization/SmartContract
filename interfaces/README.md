# Interfaces

This folder contains Solidity interface definitions used by the Tricksfor smart contracts.

Interfaces define the external API surface of contracts and can be shared across contracts or used by off-chain tools to interact with the contracts.

## Conventions

- Interface file names follow the `I<ContractName>.sol` pattern (e.g., `ITricksforBoosterNFT.sol`).
- Interfaces contain only function and event declarations — no implementation.
- Keep interfaces stable. Changes to an interface are breaking changes for all implementors and consumers.
