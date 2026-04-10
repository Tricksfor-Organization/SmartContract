# Tricksfor.SmartContracts

Nethereum contract definitions, event DTOs, function messages, deployment messages, and contract
service wrappers for the Tricksfor Booster NFT collection and staking contracts.

Use this package in any .NET application that needs to:

- Decode `TokenStaked` or `TokenUnstaked` events from on-chain logs
- Call staking or NFT contract functions via Nethereum
- Deploy the Booster NFT or staking contract to a local or live network

---

## Installation

```shell
dotnet add package Tricksfor.SmartContracts
```

---

## What is included

| Namespace | Contents |
|---|---|
| `Tricksfor.Blockchain.Booster.Contracts.Events` | `TokenStakedEventDTO`, `TokenUnstakedEventDTO`, `EmergencyWithdrawnEventDTO` |
| `Tricksfor.Blockchain.Booster.Contracts.Functions` | Staking and NFT function message types |
| `Tricksfor.Blockchain.Booster.Contracts.Deployment` | `TricksforBoosterNFTDeployment`, `TricksforBoosterStakingDeployment` |
| `Tricksfor.Blockchain.Booster.Contracts.Outputs` | Output DTOs for multi-value function results |
| `Tricksfor.Blockchain.Booster.Services` | `BoosterStakingService`, `BoosterNFTService` |
| `Tricksfor.Blockchain.Booster.Abis` | `TricksforBoosterNFTAbi`, `TricksforBoosterStakingAbi` (ABI + bytecode) |
| `Tricksfor.Blockchain.Booster.Configuration` | `BoosterContractOptions` |

What is **not** included:

- Deployment runner (`Tricksfor.Blockchain.Booster.Deploy`)
- Deployment manifests, environment config, or secrets
- Reward or game logic (settlement is handled off-chain)

---

## Usage

### Decode a `TokenStaked` event from a transaction receipt

```csharp
using Tricksfor.Blockchain.Booster.Contracts.Events;
using Nethereum.Web3;

var web3 = new Web3("https://your-rpc-endpoint");
var receipt = await web3.Eth.Transactions.GetTransactionReceipt.SendRequestAsync(txHash);

var events = receipt.DecodeAllEvents<TokenStakedEventDTO>();
foreach (var ev in events)
{
    Console.WriteLine($"Staker:    {ev.Event.Staker}");
    Console.WriteLine($"Token ID:  {ev.Event.TokenId}");
    Console.WriteLine($"Staked at: {ev.Event.StakedAt} (Unix seconds)");
}
```

### Query staking state from a log processor

```csharp
using Tricksfor.Blockchain.Booster.Contracts.Events;
using Nethereum.Web3;
using Nethereum.RPC.Eth.DTOs;

var web3 = new Web3("https://your-rpc-endpoint");

// Subscribe to all TokenStaked events from a given block range
var stakedFilter = web3.Eth
    .GetEvent<TokenStakedEventDTO>(stakingContractAddress)
    .CreateFilterInput(fromBlock: new BlockParameter(startBlock));

var logs = await web3.Eth
    .GetEvent<TokenStakedEventDTO>(stakingContractAddress)
    .GetAllChangesAsync(stakedFilter);

foreach (var log in logs)
{
    Console.WriteLine($"[Block {log.Log.BlockNumber}] " +
                      $"Staker={log.Event.Staker} TokenId={log.Event.TokenId}");
}
```

### Use the service wrapper

```csharp
using Tricksfor.Blockchain.Booster.Services;
using Nethereum.Web3;
using Nethereum.Web3.Accounts;

var account = new Account(privateKey, chainId);
var web3    = new Web3(account, "https://your-rpc-endpoint");
var service = new BoosterStakingService(web3, stakingContractAddress);

// Read state
bool isStaked = await service.IsStakedQueryAsync(tokenId);

// Send a transaction
var receipt = await service.StakeRequestAndWaitForReceiptAsync(tokenId);
var stakedEvents = service.DecodeTokenStakedEvents(receipt);
```

### Deploy a contract (testnet / local)

```csharp
using Tricksfor.Blockchain.Booster.Contracts.Deployment;
using Nethereum.Web3;
using Nethereum.Web3.Accounts;

var account = new Account(privateKey, chainId);
var web3    = new Web3(account, "https://localhost:8545");

var nftDeployment = new TricksforBoosterNFTDeployment
{
    Name                 = "Tricksfor Booster",
    Symbol               = "BOOST",
    BaseUri              = "https://api.tricksfor.com/metadata/",
    ContractMetadataUri  = "https://api.tricksfor.com/contract-metadata.json",
    RoyaltyReceiver      = royaltyWallet,
    RoyaltyFeeBasisPoints = 500   // 5 % (500 basis points)
};

var receipt = await web3.Eth
    .GetContractDeploymentHandler<TricksforBoosterNFTDeployment>()
    .SendRequestAndWaitForReceiptAsync(nftDeployment);

Console.WriteLine($"NFT contract deployed at: {receipt.ContractAddress}");
```

---

## Compatibility

| Package version | .NET | Nethereum | Solidity |
|---|---|---|---|
| 1.x | net8.0 | 6.1.x | 0.8.26 |

This package targets `net8.0`. It depends on `Nethereum.Web3` and `Nethereum.Contracts` (version 6.1.x).

---

## Versioning and breaking changes

Package versions follow [Semantic Versioning](https://semver.org/):

- **PATCH** — bug fixes, documentation updates, non-breaking changes
- **MINOR** — new event DTOs or function messages (backward-compatible additions)
- **MAJOR** — breaking changes to existing event signatures, parameter names, types, or indexed flags

The integration-critical events `TokenStaked`, `TokenUnstaked`, and `EmergencyWithdrawn` form part of
the public integration contract. Any change to their Solidity definitions or C# DTO shape is a
**breaking change** and requires a MAJOR version bump, a migration guide, and advance notice to
downstream consumers (indexers and log processors).

See [docs/nuget-packaging.md](https://github.com/Tricksfor-Organization/SmartContract/blob/main/docs/nuget-packaging.md)
for the full versioning strategy.

---

## Source

[https://github.com/Tricksfor-Organization/SmartContract](https://github.com/Tricksfor-Organization/SmartContract)
