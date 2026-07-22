# Automated Security Review — 2026-07-19

## Scope

This review covers `TricksforBoosterNFT.sol` and `TricksforBoosterStaking.sol` at commit parent
`9208089`, plus the Nethereum artifact synchronization and deployment validation relevant to those
contracts. Imported OpenZeppelin dependencies and the deliberately malicious test double are
compiled but excluded from project finding counts.

## Automated analysis

- Compiler: solc 0.8.26, optimizer enabled with 200 runs, Cancun EVM target.
- Slither: 0.11.5, 33 compiled contracts, 101 detectors, zero findings.
- Slither uses the exact split Hardhat build information produced by `npm run compile`, adapted to
  the read-only combined shape expected by crytic-compile. It does not recompile the contracts.
- Hardhat: 98 passing tests.
- Coverage: NFT 100% lines/statements; staking 98.15% lines and 98.55% statements.
- State-machine test: 100 deterministic mixed operations over 12 tokens and four wallets, checking
  custody, staking records, wallet-list uniqueness, pause rejection, transfers, both staking paths,
  unstaking, emergency recovery, and repeated staking after every operation.

## Security properties reviewed

- `TokenStaked`, `TokenUnstaked`, and `EmergencyWithdrawn` retain their exact event ABI.
- Only `MINTER_ROLE` can mint; only the delayed default admin can change metadata, royalties,
  minting pause state, or roles.
- Staking ownership transfer requires explicit acceptance through `Ownable2Step`.
- New staking is pauseable, while users can always unstake during a pause.
- State is recorded before ERC-721 custody transfer and every external custody path is protected by
  `nonReentrant`; a malicious configured NFT callback is rejected and rolls state back.
- Emergency withdrawal can return a tracked NFT only to its recorded original staker.
- Untracked rescue is available only when the staking contract owns the NFT and no staking record
  exists; it cannot be used against a tracked stake.
- Wallet token arrays use indexed swap-and-pop removal and remain unique under repeated mixed flows.

## Residual and operational risks

- The NFT administrator can change metadata and royalties, pause minting, and manage minters. Use a
  reviewed multisig and a non-zero admin-transfer delay on mainnet.
- The staking owner can pause new stakes and choose the recipient of an untracked-token rescue.
  This is necessary because a direct `transferFrom` does not expose a recoverable original sender.
- The 600-token limit, recipient policy, reward calculation, and game settlement remain off-chain
  controls by design. Production minting therefore depends on review of the committed mint plan.
- The contracts are not upgradeable. Fixes require a new deployment and downstream address update.
- Metadata integrity remains operational: mainnet publication is blocked while placeholder artwork
  or the collection image is missing, but administrators can later update the configured URIs.
- Automated analysis does not replace a third-party audit, economic review, key-management review,
  or public-testnet rehearsal.

## Reproduction

```bash
npm ci
npm run compile
npm test
npm run test:coverage
npm run security:prepare
slither . \
  --hardhat-ignore-compile \
  --hardhat-artifacts-directory .slither-artifacts \
  --exclude-dependencies \
  --filter-paths 'contracts/test|node_modules' \
  --fail-medium \
  --json slither-report.json
```

## Post-review change — ERC-721 Enumerable (2026-07-22)

`TricksforBoosterNFT` now inherits OpenZeppelin `ERC721Enumerable` to support direct frontend
wallet and collection discovery. This adds standard enumerable storage writes to mint and transfer
operations, so those operations cost more gas than the reviewed non-enumerable version. The
contract still uses explicit single-token minting; OpenZeppelin's unsupported batch-mint path is
not exposed.

Tests cover interface detection, global and per-owner enumeration, transfer updates, out-of-range
indexes, and Nethereum enumeration across stake/unstake custody. Enumeration order is explicitly
unspecified. The updated run passed 102 Hardhat tests with 95.83% NFT line coverage and all 76 .NET
tests (31 package unit, 37 deployment, and 8 Nethereum integration). This addendum records the
focused change and does not claim a new full Slither or third-party audit until the reproduction
commands above are rerun on the updated commit.
