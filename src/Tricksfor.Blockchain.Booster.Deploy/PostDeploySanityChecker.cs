using Nethereum.Web3;
using Tricksfor.Blockchain.Booster.Services;

namespace Tricksfor.Blockchain.Booster.Deploy;

/// <summary>
/// Runs post-deploy sanity checks against the freshly deployed contracts.
/// Each check queries the chain and compares the result against an expected value derived
/// from the deployment configuration.
///
/// Checks performed:
///   - NFT name()           matches config.Nft.Name
///   - NFT symbol()         matches config.Nft.Symbol
///   - NFT paused()         is false
///   - Staking nftContract() matches the deployed NFT address
///   - Staking paused()     is false
/// </summary>
public sealed class PostDeploySanityChecker
{
    private readonly IWeb3 _web3;

    public PostDeploySanityChecker(IWeb3 web3)
    {
        _web3 = web3;
    }

    /// <summary>
    /// Runs all sanity checks and returns one result per assertion.
    /// </summary>
    public async Task<IReadOnlyList<SanityCheckResult>> RunAsync(
        DeploymentConfig config,
        string nftAddress,
        string stakingAddress)
    {
        var nftService = new BoosterNFTService(_web3, nftAddress);
        var stakingService = new BoosterStakingService(_web3, stakingAddress);

        var results = new List<SanityCheckResult>();

        // NFT name()
        var nftName = await nftService.NameQueryAsync();
        results.Add(new SanityCheckResult(
            "NFT name()",
            string.Equals(nftName, config.Nft.Name, StringComparison.Ordinal),
            config.Nft.Name,
            nftName));

        // NFT symbol()
        var nftSymbol = await nftService.SymbolQueryAsync();
        results.Add(new SanityCheckResult(
            "NFT symbol()",
            string.Equals(nftSymbol, config.Nft.Symbol, StringComparison.Ordinal),
            config.Nft.Symbol,
            nftSymbol));

        // NFT paused()
        var nftPaused = await nftService.PausedQueryAsync();
        results.Add(new SanityCheckResult(
            "NFT paused()",
            !nftPaused,
            "false",
            nftPaused.ToString().ToLowerInvariant()));

        // Staking nftContract() — case-insensitive address comparison
        var linkedNft = await stakingService.NftContractQueryAsync();
        results.Add(new SanityCheckResult(
            "Staking nftContract()",
            string.Equals(linkedNft, nftAddress, StringComparison.OrdinalIgnoreCase),
            nftAddress,
            linkedNft));

        // Staking paused()
        var stakingPaused = await stakingService.PausedQueryAsync();
        results.Add(new SanityCheckResult(
            "Staking paused()",
            !stakingPaused,
            "false",
            stakingPaused.ToString().ToLowerInvariant()));

        return results;
    }
}
