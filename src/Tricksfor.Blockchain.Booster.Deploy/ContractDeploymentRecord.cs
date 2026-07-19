using System.Text.Json.Serialization;

namespace Tricksfor.Blockchain.Booster.Deploy;

/// <summary>
/// Deployment record for a single contract.
/// Serialized to JSON and written to <c>deployments/{network}/{contractName}.json</c>.
///
/// Schema matches the format documented in <c>deployments/README.md</c>.
/// </summary>
public class ContractDeploymentRecord
{
    /// <summary>Solidity contract name (e.g. "TricksforBoosterNFT").</summary>
    [JsonPropertyName("contractName")]
    public string ContractName { get; init; } = string.Empty;

    /// <summary>Deployed contract address (checksummed hex).</summary>
    [JsonPropertyName("address")]
    public string Address { get; init; } = string.Empty;

    /// <summary>Deployment transaction hash.</summary>
    [JsonPropertyName("transactionHash")]
    public string TransactionHash { get; init; } = string.Empty;

    /// <summary>Block number at which the contract was deployed.</summary>
    [JsonPropertyName("blockNumber")]
    public long BlockNumber { get; init; }

    /// <summary>UTC timestamp when this deployment record was created by the deployment runner.</summary>
    [JsonPropertyName("deployedAt")]
    public DateTimeOffset DeployedAt { get; init; }

    /// <summary>
    /// Constructor arguments in declaration order.
    /// Stored for reproducibility and on-chain contract verification.
    /// </summary>
    [JsonPropertyName("constructorArgs")]
    public object[] ConstructorArgs { get; init; } = Array.Empty<object>();

    [JsonPropertyName("chainId")]
    public long ChainId { get; init; }

    [JsonPropertyName("deployer")]
    public string Deployer { get; init; } = string.Empty;

    [JsonPropertyName("transactionStatus")]
    public string TransactionStatus { get; init; } = string.Empty;

    [JsonPropertyName("gasUsed")]
    public string GasUsed { get; init; } = string.Empty;

    [JsonPropertyName("sourceCommit")]
    public string SourceCommit { get; init; } = string.Empty;

    [JsonPropertyName("compiler")]
    public string Compiler { get; init; } = "solc 0.8.26";

    [JsonPropertyName("compilerSettings")]
    public string CompilerSettings { get; init; } = "optimizer=true,runs=200,evmVersion=cancun";

    [JsonPropertyName("creationCodeHash")]
    public string CreationCodeHash { get; init; } = string.Empty;

    [JsonPropertyName("runtimeCodeHash")]
    public string RuntimeCodeHash { get; init; } = string.Empty;

    [JsonPropertyName("finalAdmin")]
    public string FinalAdmin { get; init; } = string.Empty;

    [JsonPropertyName("finalMinter")]
    public string FinalMinter { get; init; } = string.Empty;

    [JsonPropertyName("finalOwner")]
    public string FinalOwner { get; init; } = string.Empty;
}
