# Libraries

This folder contains Solidity library contracts used by the Tricksfor smart contracts.

Libraries provide reusable logic that can be linked into contracts. Prefer OpenZeppelin battle-tested libraries over custom implementations wherever possible. Only add a custom library here when there is no suitable existing library.

## Conventions

- Library file names follow the `<Name>Lib.sol` or `<Name>Library.sol` pattern.
- Libraries must be stateless (no mutable state) unless they are specifically designed as storage libraries.
- Libraries used by both `TricksforBoosterNFT` and `TricksforBoosterStaking` belong here rather than inside either contract file.
