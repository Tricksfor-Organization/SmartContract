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
    public void DefaultNetwork_IsLocalhost()
    {
        var config = new DeploymentConfig();
        Assert.Equal("localhost", config.Network);
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
}
