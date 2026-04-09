using System.Text.Json;
using Tricksfor.Blockchain.Booster.Deploy;
using Xunit;

namespace Tricksfor.Blockchain.Booster.Deploy.Tests;

/// <summary>
/// Verifies <see cref="ManifestWriter"/> path generation and file-writing behaviour.
/// </summary>
public class ManifestWriterTests : IDisposable
{
    private readonly string _tempRoot = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());

    // -------------------------------------------------------------------------
    // GetFilePath
    // -------------------------------------------------------------------------

    [Fact]
    public void GetFilePath_CombinesRootNetworkAndContractName()
    {
        var path = ManifestWriter.GetFilePath("deployments", "sepolia", "TricksforBoosterNFT");

        Assert.Equal(
            Path.Combine("deployments", "sepolia", "TricksforBoosterNFT.json"),
            path);
    }

    [Fact]
    public void GetFilePath_AppendsJsonExtension()
    {
        var path = ManifestWriter.GetFilePath("out", "mainnet", "MyContract");
        Assert.EndsWith(".json", path);
    }

    // -------------------------------------------------------------------------
    // Write — file creation and content
    // -------------------------------------------------------------------------

    [Fact]
    public void Write_CreatesFileAtExpectedPath()
    {
        var record = BuildRecord("TricksforBoosterNFT");

        var written = ManifestWriter.Write(record, _tempRoot, "localhost");

        var expected = Path.Combine(_tempRoot, "localhost", "TricksforBoosterNFT.json");
        Assert.Equal(expected, written);
        Assert.True(File.Exists(written));
    }

    [Fact]
    public void Write_CreatesNetworkSubdirectory()
    {
        var record = BuildRecord("TricksforBoosterStaking");
        var networkDir = Path.Combine(_tempRoot, "sepolia");

        Assert.False(Directory.Exists(networkDir));

        ManifestWriter.Write(record, _tempRoot, "sepolia");

        Assert.True(Directory.Exists(networkDir));
    }

    [Fact]
    public void Write_ProducesValidJson()
    {
        var record = BuildRecord("TricksforBoosterNFT");
        var path = ManifestWriter.Write(record, _tempRoot, "localhost");

        var content = File.ReadAllText(path);
        using var doc = JsonDocument.Parse(content); // throws if invalid JSON

        Assert.Equal("TricksforBoosterNFT", doc.RootElement.GetProperty("contractName").GetString());
        Assert.Equal("0xABC", doc.RootElement.GetProperty("address").GetString());
    }

    [Fact]
    public void Write_OverwritesExistingFile()
    {
        var recordV1 = new ContractDeploymentRecord
        {
            ContractName = "TricksforBoosterNFT",
            Address = "0x111",
            TransactionHash = "0xAAA",
            BlockNumber = 1,
            DeployedAt = DateTimeOffset.UtcNow,
        };
        var recordV2 = new ContractDeploymentRecord
        {
            ContractName = "TricksforBoosterNFT",
            Address = "0x222",
            TransactionHash = "0xBBB",
            BlockNumber = 2,
            DeployedAt = DateTimeOffset.UtcNow,
        };

        ManifestWriter.Write(recordV1, _tempRoot, "localhost");
        var path = ManifestWriter.Write(recordV2, _tempRoot, "localhost");

        using var doc = JsonDocument.Parse(File.ReadAllText(path));
        Assert.Equal("0x222", doc.RootElement.GetProperty("address").GetString());
    }

    // -------------------------------------------------------------------------
    // Helpers / teardown
    // -------------------------------------------------------------------------

    private static ContractDeploymentRecord BuildRecord(string contractName)
        => new()
        {
            ContractName = contractName,
            Address = "0xABC",
            TransactionHash = "0xDEF",
            BlockNumber = 42,
            DeployedAt = new DateTimeOffset(2025, 1, 1, 0, 0, 0, TimeSpan.Zero),
        };

    public void Dispose()
    {
        if (Directory.Exists(_tempRoot))
            Directory.Delete(_tempRoot, recursive: true);
    }
}
