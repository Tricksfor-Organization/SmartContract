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
}
