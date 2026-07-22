using System.Numerics;
using System.Text.Json;
using Nethereum.Web3;
using Nethereum.Web3.Accounts;
using Tricksfor.Blockchain.Booster.Services;

namespace Tricksfor.Blockchain.Booster.Deploy;

/// <summary>Executes the protected testnet mint, stake, event-decode, and unstake smoke flow.</summary>
public sealed class SmokeRunner
{
    private readonly DeploymentConfig _config;
    private readonly TextWriter _output;

    public SmokeRunner(DeploymentConfig config, TextWriter? output = null)
    {
        _config = config;
        _output = output ?? Console.Out;
    }

    public async Task RunAsync()
    {
        if (_config.SmokeTokenId <= 0)
            throw new DeploymentException("Deployment:SmokeTokenId must be positive.");

        var nftRecord = RequireRecord("TricksforBoosterNFT");
        var stakingRecord = RequireRecord("TricksforBoosterStaking");
        var account = new Account(_config.PrivateKey, _config.ChainId);
        var web3 = new Web3(account, _config.RpcUrl);
        await DeploymentPreflight.RunAsync(_config, web3, account.Address, _output);

        var nft = new BoosterNFTService(web3, nftRecord.Address);
        var staking = new BoosterStakingService(web3, stakingRecord.Address);
        var tokenId = new BigInteger(_config.SmokeTokenId);
        var transactions = new Dictionary<string, string>();

        var isStaked = await staking.IsStakedQueryAsync(tokenId);
        if (isStaked)
        {
            var recordedStaker = await staking.StakedOwnerOfQueryAsync(tokenId);
            if (!recordedStaker.Equals(account.Address, StringComparison.OrdinalIgnoreCase))
                throw new DeploymentException($"Smoke token {tokenId} is staked by another account: {recordedStaker}.");
            var recovery = await staking.UnstakeRequestAndWaitForReceiptAsync(tokenId);
            transactions["recoveryUnstake"] = recovery.TransactionHash;
        }

        string? owner = null;
        try { owner = await nft.OwnerOfQueryAsync(tokenId); } catch { /* not minted */ }
        if (owner is null)
        {
            var mint = await nft.SafeMintRequestAndWaitForReceiptAsync(account.Address, tokenId);
            transactions["mint"] = mint.TransactionHash;
        }
        else if (!owner.Equals(account.Address, StringComparison.OrdinalIgnoreCase))
        {
            throw new DeploymentException($"Smoke token {tokenId} is owned by another account: {owner}.");
        }

        var tokenUri = await nft.TokenUriQueryAsync(tokenId);
        var expectedTokenUri = $"{_config.Nft.BaseUri}{tokenId}";
        if (!tokenUri.Equals(expectedTokenUri, StringComparison.Ordinal))
            throw new DeploymentException($"Smoke tokenURI mismatch: expected {expectedTokenUri}, got {tokenUri}.");

        var supportsErc165 = await nft.SupportsInterfaceQueryAsync(Convert.FromHexString("01ffc9a7"));
        var supportsErc721 = await nft.SupportsInterfaceQueryAsync(Convert.FromHexString("80ac58cd"));
        var supportsErc721Enumerable = await nft.SupportsInterfaceQueryAsync(Convert.FromHexString("780e9d63"));
        var supportsErc2981 = await nft.SupportsInterfaceQueryAsync(Convert.FromHexString("2a55205a"));
        if (!supportsErc165 || !supportsErc721 || !supportsErc721Enumerable || !supportsErc2981)
            throw new DeploymentException(
                "Smoke interface validation failed for ERC-165, ERC-721, ERC-721 Enumerable, or ERC-2981.");

        var totalSupply = await nft.TotalSupplyQueryAsync();
        var ownerBalance = await nft.BalanceOfQueryAsync(account.Address);
        var ownerEnumerationContainsToken = false;
        for (var index = BigInteger.Zero; index < ownerBalance; index++)
        {
            if (await nft.TokenOfOwnerByIndexQueryAsync(account.Address, index) == tokenId)
            {
                ownerEnumerationContainsToken = true;
                break;
            }
        }
        if (!ownerEnumerationContainsToken)
            throw new DeploymentException("Smoke token is missing from tokenOfOwnerByIndex enumeration.");

        var globalEnumerationContainsToken = false;
        for (var index = BigInteger.Zero; index < totalSupply; index++)
        {
            if (await nft.TokenByIndexQueryAsync(index) == tokenId)
            {
                globalEnumerationContainsToken = true;
                break;
            }
        }
        if (!globalEnumerationContainsToken)
            throw new DeploymentException("Smoke token is missing from tokenByIndex enumeration.");

        var royalty = await nft.RoyaltyInfoQueryAsync(tokenId, 10_000);
        var expectedRoyaltyReceiver = string.IsNullOrWhiteSpace(_config.Nft.RoyaltyReceiver)
            ? account.Address
            : _config.Nft.RoyaltyReceiver;
        if (!royalty.Receiver.Equals(expectedRoyaltyReceiver, StringComparison.OrdinalIgnoreCase) ||
            royalty.RoyaltyAmount != _config.Nft.RoyaltyFeeBasisPoints)
            throw new DeploymentException("Smoke royalty validation failed.");

        var approve = await nft.ApproveRequestAndWaitForReceiptAsync(stakingRecord.Address, tokenId);
        transactions["approve"] = approve.TransactionHash;

        var stake = await staking.StakeRequestAndWaitForReceiptAsync(tokenId);
        transactions["stake"] = stake.TransactionHash;
        var stakedEvents = staking.DecodeTokenStakedEvents(stake);
        if (stakedEvents.Count != 1 || stakedEvents[0].Event.TokenId != tokenId)
            throw new DeploymentException("Smoke stake transaction did not decode exactly one matching TokenStaked event.");

        var unstake = await staking.UnstakeRequestAndWaitForReceiptAsync(tokenId);
        transactions["unstake"] = unstake.TransactionHash;
        var unstakedEvents = staking.DecodeTokenUnstakedEvents(unstake);
        if (unstakedEvents.Count != 1 || unstakedEvents[0].Event.TokenId != tokenId)
            throw new DeploymentException("Smoke unstake transaction did not decode exactly one matching TokenUnstaked event.");

        var finalOwner = await nft.OwnerOfQueryAsync(tokenId);
        var finalStaked = await staking.IsStakedQueryAsync(tokenId);
        if (!finalOwner.Equals(account.Address, StringComparison.OrdinalIgnoreCase) || finalStaked)
            throw new DeploymentException("Smoke flow final custody/state reconciliation failed.");

        var result = new
        {
            network = _config.Network,
            chainId = _config.ChainId,
            tokenId = tokenId.ToString(),
            nft = nftRecord.Address,
            staking = stakingRecord.Address,
            transactions,
            readResults = new
            {
                tokenUri,
                supportsErc165,
                supportsErc721,
                supportsErc721Enumerable,
                supportsErc2981,
                totalSupply = totalSupply.ToString(),
                ownerEnumerationContainsToken,
                globalEnumerationContainsToken,
                royaltyReceiver = royalty.Receiver,
                royaltyAmount = royalty.RoyaltyAmount.ToString(),
            },
            tokenStaked = new
            {
                staker = stakedEvents[0].Event.Staker,
                tokenId = stakedEvents[0].Event.TokenId.ToString(),
                stakedAt = stakedEvents[0].Event.StakedAt.ToString(),
            },
            tokenUnstaked = new
            {
                staker = unstakedEvents[0].Event.Staker,
                tokenId = unstakedEvents[0].Event.TokenId.ToString(),
                unstakedAt = unstakedEvents[0].Event.UnstakedAt.ToString(),
            },
            finalOwner,
            finalStaked,
            completedAt = DateTimeOffset.UtcNow,
        };
        var path = Path.Combine(_config.DeploymentsOutputPath, _config.Network, "smoke-result.json");
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        File.WriteAllText(path, JsonSerializer.Serialize(result, new JsonSerializerOptions { WriteIndented = true }));
        _output.WriteLine($"Smoke flow passed. Results: {path}");
    }

    private ContractDeploymentRecord RequireRecord(string contractName)
        => ManifestWriter.Read(_config.DeploymentsOutputPath, _config.Network, contractName)
           ?? throw new DeploymentException($"Missing deployment manifest for {contractName}.");
}
