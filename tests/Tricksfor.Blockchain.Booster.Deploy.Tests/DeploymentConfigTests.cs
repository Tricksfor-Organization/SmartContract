using Tricksfor.Blockchain.Booster.Deploy;
using Xunit;

namespace Tricksfor.Blockchain.Booster.Deploy.Tests;

/// <summary>
/// Verifies default values and structure of <see cref="DeploymentConfig"/>
/// and <see cref="NftConstructorArgs"/>.
/// </summary>
public class DeploymentConfigTests
{
    // -------------------------------------------------------------------------
    // DeploymentConfig defaults
    // -------------------------------------------------------------------------

    [Fact]
    public void DefaultNetwork_IsEmpty()
    {
        // Network has no hard-coded C# default; it is populated from
        // appsettings.{env}.json at runtime or falls back to DEPLOY_ENV in Program.cs.
        var config = new DeploymentConfig();
        Assert.Equal(string.Empty, config.Network);
    }

    [Fact]
    public void DefaultRpcUrl_IsLocalhost8545()
    {
        var config = new DeploymentConfig();
        Assert.Equal("http://127.0.0.1:8545", config.RpcUrl);
    }

    [Fact]
    public void DefaultChainId_IsHardhatChainId()
    {
        var config = new DeploymentConfig();
        Assert.Equal(31337L, config.ChainId);
    }

    [Fact]
    public void DefaultPrivateKey_IsEmpty()
    {
        var config = new DeploymentConfig();
        Assert.Equal(string.Empty, config.PrivateKey);
    }

    [Fact]
    public void DefaultDeploymentsOutputPath_IsDeployments()
    {
        var config = new DeploymentConfig();
        Assert.Equal("deployments", config.DeploymentsOutputPath);
    }

    [Fact]
    public void DefaultNft_IsNotNull()
    {
        var config = new DeploymentConfig();
        Assert.NotNull(config.Nft);
    }

    // -------------------------------------------------------------------------
    // NftConstructorArgs defaults
    // -------------------------------------------------------------------------

    [Fact]
    public void DefaultNftRoyaltyFeeBasisPoints_Is500()
    {
        var args = new NftConstructorArgs();
        Assert.Equal(500L, args.RoyaltyFeeBasisPoints);
    }

    [Fact]
    public void DefaultNftRoyaltyReceiver_IsEmpty()
    {
        var args = new NftConstructorArgs();
        Assert.Equal(string.Empty, args.RoyaltyReceiver);
    }

    // -------------------------------------------------------------------------
    // DeploymentRunner config validation
    // -------------------------------------------------------------------------

    [Fact]
    public void ValidateConfig_ThrowsDeploymentException_WhenChainIdIsZero()
    {
        var config = BuildValidConfig();
        config.ChainId = 0;

        var runner = new DeploymentRunner(config);
        var ex = Assert.Throws<DeploymentException>(() => InvokeValidate(runner));
        Assert.Contains("ChainId", ex.Message);
    }

    [Fact]
    public void ValidateConfig_ThrowsDeploymentException_WhenChainIdIsNegative()
    {
        var config = BuildValidConfig();
        config.ChainId = -1;

        var runner = new DeploymentRunner(config);
        var ex = Assert.Throws<DeploymentException>(() => InvokeValidate(runner));
        Assert.Contains("ChainId", ex.Message);
    }

    [Fact]
    public void ValidateConfig_ThrowsDeploymentException_WhenRoyaltyBasisPointsTooHigh()
    {
        var config = BuildValidConfig();
        config.Nft.RoyaltyFeeBasisPoints = 10_001;

        var runner = new DeploymentRunner(config);
        var ex = Assert.Throws<DeploymentException>(() => InvokeValidate(runner));
        Assert.Contains("RoyaltyFeeBasisPoints", ex.Message);
    }

    [Fact]
    public void ValidateConfig_ThrowsDeploymentException_WhenRoyaltyBasisPointsNegative()
    {
        var config = BuildValidConfig();
        config.Nft.RoyaltyFeeBasisPoints = -1;

        var runner = new DeploymentRunner(config);
        var ex = Assert.Throws<DeploymentException>(() => InvokeValidate(runner));
        Assert.Contains("RoyaltyFeeBasisPoints", ex.Message);
    }

    [Fact]
    public void ValidateConfig_ThrowsDeploymentException_WhenRoyaltyReceiverIsZeroAddress()
    {
        var config = BuildValidConfig();
        config.Nft.RoyaltyReceiver = "0x0000000000000000000000000000000000000000";

        var runner = new DeploymentRunner(config);
        var ex = Assert.Throws<DeploymentException>(() => InvokeValidate(runner));
        Assert.Contains("RoyaltyReceiver", ex.Message);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(500)]
    [InlineData(10_000)]
    public void ValidateConfig_DoesNotThrow_WhenRoyaltyBasisPointsIsValid(long basisPoints)
    {
        var config = BuildValidConfig();
        config.Nft.RoyaltyFeeBasisPoints = basisPoints;

        var runner = new DeploymentRunner(config);
        // Should not throw
        InvokeValidate(runner);
    }

    // -------------------------------------------------------------------------
    // SanityCheckResult
    // -------------------------------------------------------------------------

    [Fact]
    public void SanityCheckResult_PassedTrue_WhenValuesMatch()
    {
        var result = new SanityCheckResult("NFT name()", true, "TricksforBooster", "TricksforBooster");
        Assert.True(result.Passed);
    }

    [Fact]
    public void SanityCheckResult_PassedFalse_WhenValuesMismatch()
    {
        var result = new SanityCheckResult("NFT paused()", false, "false", "true");
        Assert.False(result.Passed);
        Assert.Equal("false", result.Expected);
        Assert.Equal("true", result.Actual);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private static DeploymentConfig BuildValidConfig() => new()
    {
        Network = "localhost",
        RpcUrl = "http://127.0.0.1:8545",
        ChainId = 31337,
        PrivateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
        Nft = new NftConstructorArgs
        {
            Name = "TricksforBooster",
            Symbol = "TFB",
            RoyaltyFeeBasisPoints = 500,
        },
    };

    /// <summary>
    /// Calls the private <c>ValidateConfig()</c> method via the runner by
    /// triggering <c>RunAsync()</c> and catching only the config-validation exception.
    /// Since RunAsync is async and we're not awaiting a chain call, we use a
    /// synchronous reflection-based invoke instead to keep tests fast.
    /// </summary>
    private static void InvokeValidate(DeploymentRunner runner)
    {
        var method = typeof(DeploymentRunner)
            .GetMethod("ValidateConfig",
                System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)!;
        try
        {
            method.Invoke(runner, null);
        }
        catch (System.Reflection.TargetInvocationException ex) when (ex.InnerException is DeploymentException)
        {
            throw ex.InnerException;
        }
    }
}
