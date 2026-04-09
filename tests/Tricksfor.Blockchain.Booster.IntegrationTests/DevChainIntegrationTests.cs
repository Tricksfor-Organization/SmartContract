using System.Numerics;
using Nethereum.Contracts;
using Nethereum.Web3;
using Tricksfor.Blockchain.Booster.Contracts.Deployment;
using Tricksfor.Blockchain.Booster.Contracts.Functions;
using Tricksfor.Blockchain.Booster.Services;
using Xunit;

namespace Tricksfor.Blockchain.Booster.IntegrationTests;

/// <summary>
/// End-to-end integration tests for the TricksforBoosterNFT and TricksforBoosterStaking
/// contracts, executed against a local Hardhat node via Nethereum.
///
/// Each test deploys fresh contract instances to guarantee isolation.
/// The Hardhat node itself is started once for the collection (see HardhatNodeFixture).
///
/// Coverage:
///   Happy path  — full deploy → mint → approve → stake → verify → unstake → verify cycle.
///   Negative    — all error paths documented in the contract are exercised.
/// </summary>
[Collection(HardhatNodeCollection.Name)]
public class DevChainIntegrationTests
{
    private readonly HardhatNodeFixture _node;

    public DevChainIntegrationTests(HardhatNodeFixture node)
    {
        _node = node;
    }

    // -------------------------------------------------------------------------
    // Deployment helper
    // -------------------------------------------------------------------------

    /// <summary>
    /// Deploys TricksforBoosterNFT and TricksforBoosterStaking to the local chain using
    /// <paramref name="web3"/> as the deployer. Returns typed service wrappers together
    /// with the deployed contract addresses.
    /// </summary>
    private static async Task<(
        BoosterNFTService NftService,
        BoosterStakingService StakingService,
        string NftAddress,
        string StakingAddress)>
        DeployContractsAsync(IWeb3 web3)
    {
        var deployerAddress = ((Nethereum.Web3.Web3)web3).TransactionManager.Account!.Address;

        // Deploy NFT contract
        var nftDeployment = new TricksforBoosterNFTDeployment
        {
            Name = "TricksforBooster",
            Symbol = "TFB",
            BaseUri = "https://meta.tricksfor.gg/booster/",
            ContractMetadataUri = "https://meta.tricksfor.gg/booster/contract.json",
            RoyaltyReceiver = deployerAddress,
            RoyaltyFeeBasisPoints = 500, // 5%
        };

        var nftReceipt = await BoosterNFTService.DeployContractAndWaitForReceiptAsync(web3, nftDeployment);
        var nftAddress = nftReceipt.ContractAddress!;
        var nftService = new BoosterNFTService(web3, nftAddress);

        // Deploy Staking contract (requires the NFT contract address)
        var stakingDeployment = new TricksforBoosterStakingDeployment
        {
            NftContract = nftAddress,
        };

        var stakingReceipt = await BoosterStakingService.DeployContractAndWaitForReceiptAsync(web3, stakingDeployment);
        var stakingAddress = stakingReceipt.ContractAddress!;
        var stakingService = new BoosterStakingService(web3, stakingAddress);

        return (nftService, stakingService, nftAddress, stakingAddress);
    }

    // =========================================================================
    // Happy path — full flow (issue steps 1 – 13)
    // =========================================================================

    /// <summary>
    /// Executes the complete stake / unstake flow in order:
    /// deploy → mint #1 → mint #2 → approve → stake #1 → stake #2 →
    /// unstake #2 → unstake #1 → verify no active stakes remain.
    ///
    /// Each step asserts both on-chain state (via read methods) and emitted log content
    /// (via Nethereum event decoding), proving the full integration layer works correctly.
    /// </summary>
    [Fact]
    public async Task HappyPath_FullStakeUnstakeFlow()
    {
        // ---- Step 1 & 2: deploy contracts ----
        var (nftService, stakingService, _, stakingAddress) =
            await DeployContractsAsync(_node.Web3Account0);

        var wallet = HardhatNodeFixture.Account0Address;
        var token1 = new BigInteger(1);
        var token2 = new BigInteger(2);

        // ---- Steps 3 & 4: mint NFT #1 and #2 to the test wallet ----
        await nftService.SafeMintRequestAndWaitForReceiptAsync(wallet, token1);
        await nftService.SafeMintRequestAndWaitForReceiptAsync(wallet, token2);

        Assert.Equal(wallet, await nftService.OwnerOfQueryAsync(token1), StringComparer.OrdinalIgnoreCase);
        Assert.Equal(wallet, await nftService.OwnerOfQueryAsync(token2), StringComparer.OrdinalIgnoreCase);

        // ---- Step 5: approve staking contract for all tokens (setApprovalForAll) ----
        await nftService.SetApprovalForAllRequestAndWaitForReceiptAsync(stakingAddress, approved: true);

        // ---- Step 6: stake NFT #1 ----
        var stakeReceipt1 = await stakingService.StakeRequestAndWaitForReceiptAsync(token1);

        // ---- Step 7: verify state after staking #1 ----

        // Owner of token #1 is now the staking contract
        var ownerAfterStake1 = await nftService.OwnerOfQueryAsync(token1);
        Assert.Equal(stakingAddress, ownerAfterStake1, StringComparer.OrdinalIgnoreCase);

        // isStaked returns true
        Assert.True(await stakingService.IsStakedQueryAsync(token1));

        // stakedOwnerOf returns the original wallet
        var stakedOwner1 = await stakingService.StakedOwnerOfQueryAsync(token1);
        Assert.Equal(wallet, stakedOwner1, StringComparer.OrdinalIgnoreCase);

        // getWalletStakedTokens includes token #1
        var walletTokensAfterStake1 = await stakingService.GetWalletStakedTokensQueryAsync(wallet);
        Assert.Contains(token1, walletTokensAfterStake1.TokenIds);

        // TokenStaked event decodes correctly
        var stakedEvents1 = stakingService.DecodeTokenStakedEvents(stakeReceipt1);
        Assert.Single(stakedEvents1);
        Assert.Equal(wallet, stakedEvents1[0].Event.Staker, StringComparer.OrdinalIgnoreCase);
        Assert.Equal(token1, stakedEvents1[0].Event.TokenId);
        Assert.True(stakedEvents1[0].Event.StakedAt > 0, "StakedAt timestamp must be non-zero");

        // ---- Step 8: stake NFT #2 ----
        var stakeReceipt2 = await stakingService.StakeRequestAndWaitForReceiptAsync(token2);

        // ---- Step 9: verify both tokens are staked ----
        Assert.True(await stakingService.IsStakedQueryAsync(token1));
        Assert.True(await stakingService.IsStakedQueryAsync(token2));

        var walletTokensBoth = await stakingService.GetWalletStakedTokensQueryAsync(wallet);
        Assert.Contains(token1, walletTokensBoth.TokenIds);
        Assert.Contains(token2, walletTokensBoth.TokenIds);

        // Token #2 staked event also decodes correctly
        var stakedEvents2 = stakingService.DecodeTokenStakedEvents(stakeReceipt2);
        Assert.Single(stakedEvents2);
        Assert.Equal(token2, stakedEvents2[0].Event.TokenId);

        // ---- Step 10: unstake NFT #2 ----
        var unstakeReceipt2 = await stakingService.UnstakeRequestAndWaitForReceiptAsync(token2);

        // ---- Step 11: verify TokenUnstaked for #2 decodes correctly ----
        var unstakedEvents2 = stakingService.DecodeTokenUnstakedEvents(unstakeReceipt2);
        Assert.Single(unstakedEvents2);
        Assert.Equal(wallet, unstakedEvents2[0].Event.Staker, StringComparer.OrdinalIgnoreCase);
        Assert.Equal(token2, unstakedEvents2[0].Event.TokenId);
        Assert.True(unstakedEvents2[0].Event.UnstakedAt > 0, "UnstakedAt timestamp must be non-zero");

        // Token #2 is no longer staked and is back with the wallet
        Assert.False(await stakingService.IsStakedQueryAsync(token2));
        var ownerOfToken2AfterUnstake = await nftService.OwnerOfQueryAsync(token2);
        Assert.Equal(wallet, ownerOfToken2AfterUnstake, StringComparer.OrdinalIgnoreCase);

        // Token #1 is still staked
        Assert.True(await stakingService.IsStakedQueryAsync(token1));

        // ---- Step 12: unstake NFT #1 ----
        var unstakeReceipt1 = await stakingService.UnstakeRequestAndWaitForReceiptAsync(token1);

        // ---- Step 13: verify no active stakes remain ----
        Assert.False(await stakingService.IsStakedQueryAsync(token1));
        Assert.False(await stakingService.IsStakedQueryAsync(token2));

        var finalWalletTokens = await stakingService.GetWalletStakedTokensQueryAsync(wallet);
        Assert.Empty(finalWalletTokens.TokenIds);

        // Both tokens are back with the wallet
        Assert.Equal(wallet, await nftService.OwnerOfQueryAsync(token1), StringComparer.OrdinalIgnoreCase);
        Assert.Equal(wallet, await nftService.OwnerOfQueryAsync(token2), StringComparer.OrdinalIgnoreCase);

        // TokenUnstaked event for #1 also decodes correctly
        var unstakedEvents1 = stakingService.DecodeTokenUnstakedEvents(unstakeReceipt1);
        Assert.Single(unstakedEvents1);
        Assert.Equal(token1, unstakedEvents1[0].Event.TokenId);
    }

    // =========================================================================
    // Negative scenarios
    // =========================================================================

    /// <summary>
    /// Staking a token without prior approval of the staking contract
    /// causes the ERC-721 transferFrom to revert.
    /// </summary>
    [Fact]
    public async Task Stake_WithoutApproval_Reverts()
    {
        var (nftService, stakingService, _, _) =
            await DeployContractsAsync(_node.Web3Account0);

        var wallet = HardhatNodeFixture.Account0Address;
        await nftService.SafeMintRequestAndWaitForReceiptAsync(wallet, 10);

        // No approval — stake must revert
        await Assert.ThrowsAnyAsync<Exception>(
            () => stakingService.StakeRequestAndWaitForReceiptAsync(10));
    }

    /// <summary>
    /// Staking a token that is owned by a different address reverts with NotTokenOwner.
    /// </summary>
    [Fact]
    public async Task Stake_TokenNotOwnedByCaller_Reverts()
    {
        // Deploy with account0 (minter)
        var (nftService, _, nftAddress, stakingAddress) =
            await DeployContractsAsync(_node.Web3Account0);

        // Mint token #20 to account0
        await nftService.SafeMintRequestAndWaitForReceiptAsync(
            HardhatNodeFixture.Account0Address, 20);

        // Account1 wraps the same staking contract and tries to stake a token it does not own
        var stakingServiceAsAccount1 = new BoosterStakingService(_node.Web3Account1, stakingAddress);

        // Account1 must approve the staking contract first (this succeeds, it's just an approval)
        var nftServiceAsAccount1 = new BoosterNFTService(_node.Web3Account1, nftAddress);
        await nftServiceAsAccount1.SetApprovalForAllRequestAndWaitForReceiptAsync(stakingAddress, approved: true);

        // Account1 tries to stake token #20 which is owned by account0 — must revert with NotTokenOwner
        var ex = await Assert.ThrowsAnyAsync<Exception>(
            () => stakingServiceAsAccount1.StakeRequestAndWaitForReceiptAsync(20));
        var customEx = Assert.IsType<SmartContractCustomErrorRevertException>(ex);
        Assert.Equal(ErrorSelector("NotTokenOwner()"), customEx.ExceptionEncodedData,
            StringComparer.OrdinalIgnoreCase);
    }

    /// <summary>
    /// Staking a token that is already staked reverts with TokenAlreadyStaked.
    /// </summary>
    [Fact]
    public async Task Stake_AlreadyStaked_Reverts()
    {
        var (nftService, stakingService, _, stakingAddress) =
            await DeployContractsAsync(_node.Web3Account0);

        var wallet = HardhatNodeFixture.Account0Address;
        await nftService.SafeMintRequestAndWaitForReceiptAsync(wallet, 30);
        await nftService.SetApprovalForAllRequestAndWaitForReceiptAsync(stakingAddress, approved: true);
        await stakingService.StakeRequestAndWaitForReceiptAsync(30);

        // Token #30 is already staked — second stake must revert with TokenAlreadyStaked
        var ex = await Assert.ThrowsAnyAsync<Exception>(
            () => stakingService.StakeRequestAndWaitForReceiptAsync(30));
        var customEx = Assert.IsType<SmartContractCustomErrorRevertException>(ex);
        Assert.Equal(ErrorSelector("TokenAlreadyStaked()"), customEx.ExceptionEncodedData,
            StringComparer.OrdinalIgnoreCase);
    }

    /// <summary>
    /// Unstaking a token by a wallet that did not originally stake it reverts with NotOriginalStaker.
    /// </summary>
    [Fact]
    public async Task Unstake_ByDifferentWallet_Reverts()
    {
        var (nftService, stakingService, _, stakingAddress) =
            await DeployContractsAsync(_node.Web3Account0);

        var wallet = HardhatNodeFixture.Account0Address;
        await nftService.SafeMintRequestAndWaitForReceiptAsync(wallet, 40);
        await nftService.SetApprovalForAllRequestAndWaitForReceiptAsync(stakingAddress, approved: true);
        await stakingService.StakeRequestAndWaitForReceiptAsync(40);

        // Account1 tries to unstake a token staked by account0 — must revert with NotOriginalStaker
        var stakingServiceAsAccount1 = new BoosterStakingService(_node.Web3Account1, stakingAddress);
        var ex = await Assert.ThrowsAnyAsync<Exception>(
            () => stakingServiceAsAccount1.UnstakeRequestAndWaitForReceiptAsync(40));
        var customEx = Assert.IsType<SmartContractCustomErrorRevertException>(ex);
        Assert.Equal(ErrorSelector("NotOriginalStaker()"), customEx.ExceptionEncodedData,
            StringComparer.OrdinalIgnoreCase);
    }

    /// <summary>
    /// Querying an unknown (never-minted / never-staked) token returns the expected default
    /// values: isStaked = false, stakedOwnerOf = zero address, stakedAtOf = 0,
    /// and getWalletStakedTokens = empty list.
    /// </summary>
    [Fact]
    public async Task Query_UnknownToken_ReturnsDefaultValues()
    {
        var (_, stakingService, _, _) =
            await DeployContractsAsync(_node.Web3Account0);

        var unknownTokenId = new BigInteger(999);

        Assert.False(await stakingService.IsStakedQueryAsync(unknownTokenId));
        Assert.Equal(
            "0x0000000000000000000000000000000000000000",
            await stakingService.StakedOwnerOfQueryAsync(unknownTokenId),
            StringComparer.OrdinalIgnoreCase);
        Assert.Equal(
            BigInteger.Zero,
            await stakingService.StakedAtOfQueryAsync(unknownTokenId));

        var tokens = await stakingService.GetWalletStakedTokensQueryAsync(
            HardhatNodeFixture.Account0Address);
        Assert.Empty(tokens.TokenIds);
    }

    /// <summary>
    /// Sending a token from an unsupported NFT contract to the staking contract via
    /// <c>safeTransferFrom</c> triggers <c>onERC721Received</c>, which must revert with
    /// <c>UnsupportedNFTContract</c> because <c>msg.sender</c> is not the configured collection.
    ///
    /// A second NFT deployment simulates the unsupported collection.
    /// </summary>
    [Fact]
    public async Task OnERC721Received_UnsupportedNFTContract_Reverts()
    {
        // Deploy the "real" pair: staking contract accepts only nftA
        var (_, _, _, stakingAddress) =
            await DeployContractsAsync(_node.Web3Account0);

        // Deploy a second "unsupported" NFT contract (nftB)
        var (unsupportedNftService, _, unsupportedNftAddress, _) =
            await DeployContractsAsync(_node.Web3Account0);

        var wallet = HardhatNodeFixture.Account0Address;
        await unsupportedNftService.SafeMintRequestAndWaitForReceiptAsync(wallet, 50);

        // Call safeTransferFrom on nftB to push the token to the staking contract.
        // The staking contract's onERC721Received sees msg.sender = nftB != nftA and
        // must revert with UnsupportedNFTContract.
        var ex = await Assert.ThrowsAnyAsync<Exception>(
            () => _node.Web3Account0.Eth
                .GetContractTransactionHandler<SafeTransferFromFunction>()
                .SendRequestAndWaitForReceiptAsync(
                    unsupportedNftAddress,
                    new SafeTransferFromFunction
                    {
                        From = wallet,
                        To = stakingAddress,
                        TokenId = 50,
                    }));
        var customEx = Assert.IsType<SmartContractCustomErrorRevertException>(ex);
        Assert.Equal(ErrorSelector("UnsupportedNFTContract()"), customEx.ExceptionEncodedData,
            StringComparer.OrdinalIgnoreCase);
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    /// <summary>
    /// Computes the 4-byte ABI selector for a custom Solidity error, e.g.
    /// <c>"NotTokenOwner()"</c>. The result matches the format returned by
    /// <see cref="SmartContractCustomErrorRevertException.ExceptionEncodedData"/>.
    /// </summary>
    private static string ErrorSelector(string errorSignature)
    {
        var hash = new Nethereum.Util.Sha3Keccack().CalculateHash(errorSignature);
        return "0x" + hash[..8];
    }
}
