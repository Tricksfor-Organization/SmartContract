using System.Text.Json;
using Tricksfor.Blockchain.Booster.Deploy;
using Xunit;

namespace Tricksfor.Blockchain.Booster.Deploy.Tests;

/// <summary>
/// Verifies that <see cref="ContractDeploymentRecord"/> serializes to the JSON schema
/// documented in deployments/README.md.
/// </summary>
public class ContractDeploymentRecordTests
{
    // -------------------------------------------------------------------------
    // JSON key names (must match README schema exactly)
    // -------------------------------------------------------------------------

    [Fact]
    public void Serializes_ContractName_AsCamelCase()
    {
        var record = new ContractDeploymentRecord { ContractName = "TricksforBoosterNFT" };
        var json = JsonSerializer.Serialize(record);

        Assert.Contains("\"contractName\"", json);
        Assert.DoesNotContain("\"ContractName\"", json);
    }

    [Fact]
    public void Serializes_Address_AsCamelCase()
    {
        var record = new ContractDeploymentRecord { Address = "0xABC" };
        var json = JsonSerializer.Serialize(record);

        Assert.Contains("\"address\"", json);
        Assert.DoesNotContain("\"Address\"", json);
    }

    [Fact]
    public void Serializes_TransactionHash_AsCamelCase()
    {
        var record = new ContractDeploymentRecord { TransactionHash = "0xDEF" };
        var json = JsonSerializer.Serialize(record);

        Assert.Contains("\"transactionHash\"", json);
        Assert.DoesNotContain("\"TransactionHash\"", json);
    }

    [Fact]
    public void Serializes_BlockNumber_AsCamelCase()
    {
        var record = new ContractDeploymentRecord { BlockNumber = 42 };
        var json = JsonSerializer.Serialize(record);

        Assert.Contains("\"blockNumber\"", json);
        Assert.DoesNotContain("\"BlockNumber\"", json);
    }

    [Fact]
    public void Serializes_DeployedAt_AsCamelCase()
    {
        var record = new ContractDeploymentRecord
        {
            DeployedAt = new DateTimeOffset(2025, 1, 1, 0, 0, 0, TimeSpan.Zero),
        };
        var json = JsonSerializer.Serialize(record);

        Assert.Contains("\"deployedAt\"", json);
        Assert.DoesNotContain("\"DeployedAt\"", json);
    }

    [Fact]
    public void Serializes_ConstructorArgs_AsCamelCase()
    {
        var record = new ContractDeploymentRecord
        {
            ConstructorArgs = new object[] { "arg1", 500L },
        };
        var json = JsonSerializer.Serialize(record);

        Assert.Contains("\"constructorArgs\"", json);
        Assert.DoesNotContain("\"ConstructorArgs\"", json);
    }

    // -------------------------------------------------------------------------
    // Round-trip
    // -------------------------------------------------------------------------

    [Fact]
    public void RoundTrip_PreservesAllFields()
    {
        var original = new ContractDeploymentRecord
        {
            ContractName = "TricksforBoosterNFT",
            Address = "0x1234567890123456789012345678901234567890",
            TransactionHash = "0xabcdef",
            BlockNumber = 99,
            DeployedAt = new DateTimeOffset(2025, 6, 15, 12, 0, 0, TimeSpan.Zero),
            ConstructorArgs = Array.Empty<object>(),
        };

        var json = JsonSerializer.Serialize(original);
        var restored = JsonSerializer.Deserialize<ContractDeploymentRecord>(json)!;

        Assert.Equal(original.ContractName, restored.ContractName);
        Assert.Equal(original.Address, restored.Address);
        Assert.Equal(original.TransactionHash, restored.TransactionHash);
        Assert.Equal(original.BlockNumber, restored.BlockNumber);
        Assert.Equal(original.DeployedAt, restored.DeployedAt);
        Assert.Empty(restored.ConstructorArgs);
    }

    // -------------------------------------------------------------------------
    // Default values
    // -------------------------------------------------------------------------

    [Fact]
    public void DefaultConstructorArgs_IsEmptyArray()
    {
        var record = new ContractDeploymentRecord();
        Assert.NotNull(record.ConstructorArgs);
        Assert.Empty(record.ConstructorArgs);
    }
}
