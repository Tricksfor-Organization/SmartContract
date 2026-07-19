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
        string stakingAddress,
        string expectedRoyaltyReceiver)
    {
        var nftService = new BoosterNFTService(_web3, nftAddress);
        var stakingService = new BoosterStakingService(_web3, stakingAddress);

        var results = new List<SanityCheckResult>();

        var nftCode = await _web3.Eth.GetCode.SendRequestAsync(nftAddress);
        results.Add(new SanityCheckResult(
            "NFT bytecode",
            !string.IsNullOrWhiteSpace(nftCode) && nftCode is not "0x" and not "0x0",
            "present",
            string.IsNullOrWhiteSpace(nftCode) || nftCode is "0x" or "0x0" ? "missing" : "present"));

        var stakingCode = await _web3.Eth.GetCode.SendRequestAsync(stakingAddress);
        results.Add(new SanityCheckResult(
            "Staking bytecode",
            !string.IsNullOrWhiteSpace(stakingCode) && stakingCode is not "0x" and not "0x0",
            "present",
            string.IsNullOrWhiteSpace(stakingCode) || stakingCode is "0x" or "0x0" ? "missing" : "present"));

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

        var baseUri = await nftService.BaseUriQueryAsync();
        results.Add(new SanityCheckResult(
            "NFT baseURI()",
            string.Equals(baseUri, config.Nft.BaseUri, StringComparison.Ordinal),
            config.Nft.BaseUri,
            baseUri));

        var contractUri = await nftService.ContractUriQueryAsync();
        results.Add(new SanityCheckResult(
            "NFT contractURI()",
            string.Equals(contractUri, config.Nft.ContractMetadataUri, StringComparison.Ordinal),
            config.Nft.ContractMetadataUri,
            contractUri));

        foreach (var (label, interfaceId) in new[]
        {
            ("ERC-165", "01ffc9a7"),
            ("ERC-721", "80ac58cd"),
            ("ERC-2981", "2a55205a"),
        })
        {
            var supported = await nftService.SupportsInterfaceQueryAsync(Convert.FromHexString(interfaceId));
            results.Add(new SanityCheckResult($"NFT {label}", supported, "true", supported.ToString().ToLowerInvariant()));
        }

        var royalty = await nftService.RoyaltyInfoQueryAsync(1, 10_000);
        results.Add(new SanityCheckResult(
            "NFT royaltyInfo() receiver",
            string.Equals(royalty.Receiver, expectedRoyaltyReceiver, StringComparison.OrdinalIgnoreCase),
            expectedRoyaltyReceiver,
            royalty.Receiver));
        results.Add(new SanityCheckResult(
            "NFT royaltyInfo() amount",
            royalty.RoyaltyAmount == config.Nft.RoyaltyFeeBasisPoints,
            config.Nft.RoyaltyFeeBasisPoints.ToString(),
            royalty.RoyaltyAmount.ToString()));

        var defaultAdmin = await nftService.DefaultAdminQueryAsync();
        results.Add(new SanityCheckResult(
            "NFT defaultAdmin()",
            string.Equals(defaultAdmin, config.AdminAddress, StringComparison.OrdinalIgnoreCase),
            config.AdminAddress,
            defaultAdmin));

        var defaultAdminDelay = await nftService.DefaultAdminDelayQueryAsync();
        results.Add(new SanityCheckResult(
            "NFT defaultAdminDelay()",
            defaultAdminDelay == config.DefaultAdminDelay,
            config.DefaultAdminDelay.ToString(),
            defaultAdminDelay.ToString()));

        var minterRole = await nftService.MinterRoleQueryAsync();
        var hasMinterRole = await nftService.HasRoleQueryAsync(minterRole, config.MinterAddress);
        results.Add(new SanityCheckResult(
            "NFT configured minter role",
            hasMinterRole,
            "true",
            hasMinterRole.ToString().ToLowerInvariant()));

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

        var stakingOwner = await stakingService.OwnerQueryAsync();
        results.Add(new SanityCheckResult(
            "Staking owner()",
            string.Equals(stakingOwner, config.StakingOwnerAddress, StringComparison.OrdinalIgnoreCase),
            config.StakingOwnerAddress,
            stakingOwner));

        return results;
    }
}
