using System.Numerics;
using Nethereum.ABI.FunctionEncoding.Attributes;
using Nethereum.Contracts;
using Tricksfor.Blockchain.Booster.Contracts.Deployment;
using Tricksfor.Blockchain.Booster.Contracts.Functions;
using Tricksfor.Blockchain.Booster.Contracts.Outputs;
using Xunit;

namespace Tricksfor.Blockchain.Booster.UnitTests;

/// <summary>
/// Unit tests verifying that deployment messages and function message types carry
/// the correct Nethereum ABI encoding attributes.
/// These tests guard against parameter renames, reordering, and type mismatches.
/// </summary>
public class ContractDefinitionTests
{
    // -------------------------------------------------------------------------
    // NFT deployment
    // -------------------------------------------------------------------------

    [Fact]
    public void TricksforBoosterNFTDeployment_ABI_IsNotEmpty()
    {
        Assert.NotEmpty(TricksforBoosterNFTDeployment.ABI);
    }

    [Fact]
    public void TricksforBoosterNFTDeployment_HasAllConstructorParameters()
    {
        var props = typeof(TricksforBoosterNFTDeployment)
            .GetProperties()
            .Select(p => p.GetCustomAttributes(typeof(ParameterAttribute), false)
                          .Cast<ParameterAttribute>()
                          .FirstOrDefault())
            .Where(a => a != null)
            .Select(a => a!.Order)
            .OrderBy(o => o)
            .ToList();

        Assert.Equal(new[] { 1, 2, 3, 4, 5, 6 }, props);
    }

    [Fact]
    public void TricksforBoosterNFTDeployment_RoyaltyFeeBasisPoints_IsUint96()
    {
        var prop = typeof(TricksforBoosterNFTDeployment)
            .GetProperty(nameof(TricksforBoosterNFTDeployment.RoyaltyFeeBasisPoints))!;
        var attr = prop.GetCustomAttributes(typeof(ParameterAttribute), false)
            .Cast<ParameterAttribute>()
            .Single();

        Assert.Equal("uint96", attr.Type);
        Assert.Equal("royaltyFeeBasisPoints_", attr.Name);
        Assert.Equal(6, attr.Order);
    }

    // -------------------------------------------------------------------------
    // Staking deployment
    // -------------------------------------------------------------------------

    [Fact]
    public void TricksforBoosterStakingDeployment_ABI_IsNotEmpty()
    {
        Assert.NotEmpty(TricksforBoosterStakingDeployment.ABI);
    }

    [Fact]
    public void TricksforBoosterStakingDeployment_NftContract_IsAddressAtPosition1()
    {
        var prop = typeof(TricksforBoosterStakingDeployment)
            .GetProperty(nameof(TricksforBoosterStakingDeployment.NftContract))!;
        var attr = prop.GetCustomAttributes(typeof(ParameterAttribute), false)
            .Cast<ParameterAttribute>()
            .Single();

        Assert.Equal("address", attr.Type);
        Assert.Equal("nftContract_", attr.Name);
        Assert.Equal(1, attr.Order);
    }

    // -------------------------------------------------------------------------
    // NFT read functions
    // -------------------------------------------------------------------------

    [Fact]
    public void SafeMintFunction_HasCorrectFunctionName()
    {
        var attr = typeof(SafeMintFunction)
            .GetCustomAttributes(typeof(FunctionAttribute), false)
            .Cast<FunctionAttribute>()
            .Single();

        Assert.Equal("safeMint", attr.Name);
    }

    [Fact]
    public void ApproveFunction_To_IsAddressAtPosition1()
    {
        var prop = typeof(ApproveFunction).GetProperty(nameof(ApproveFunction.To))!;
        var attr = prop.GetCustomAttributes(typeof(ParameterAttribute), false)
            .Cast<ParameterAttribute>()
            .Single();

        Assert.Equal("address", attr.Type);
        Assert.Equal("to", attr.Name);
        Assert.Equal(1, attr.Order);
    }

    [Fact]
    public void ApproveFunction_TokenId_IsUint256AtPosition2()
    {
        var prop = typeof(ApproveFunction).GetProperty(nameof(ApproveFunction.TokenId))!;
        var attr = prop.GetCustomAttributes(typeof(ParameterAttribute), false)
            .Cast<ParameterAttribute>()
            .Single();

        Assert.Equal("uint256", attr.Type);
        Assert.Equal("tokenId", attr.Name);
        Assert.Equal(2, attr.Order);
    }

    // -------------------------------------------------------------------------
    // Staking write functions
    // -------------------------------------------------------------------------

    [Fact]
    public void StakeFunction_HasCorrectFunctionName()
    {
        var attr = typeof(StakeFunction)
            .GetCustomAttributes(typeof(FunctionAttribute), false)
            .Cast<FunctionAttribute>()
            .Single();

        Assert.Equal("stake", attr.Name);
    }

    [Fact]
    public void StakeFunction_TokenId_IsUint256AtPosition1()
    {
        var prop = typeof(StakeFunction).GetProperty(nameof(StakeFunction.TokenId))!;
        var attr = prop.GetCustomAttributes(typeof(ParameterAttribute), false)
            .Cast<ParameterAttribute>()
            .Single();

        Assert.Equal("uint256", attr.Type);
        Assert.Equal("tokenId", attr.Name);
        Assert.Equal(1, attr.Order);
    }

    [Fact]
    public void UnstakeFunction_HasCorrectFunctionName()
    {
        var attr = typeof(UnstakeFunction)
            .GetCustomAttributes(typeof(FunctionAttribute), false)
            .Cast<FunctionAttribute>()
            .Single();

        Assert.Equal("unstake", attr.Name);
    }

    [Fact]
    public void EmergencyWithdrawFunction_HasCorrectParameters()
    {
        var tokenIdProp = typeof(EmergencyWithdrawFunction)
            .GetProperty(nameof(EmergencyWithdrawFunction.TokenId))!;
        var tokenIdAttr = tokenIdProp.GetCustomAttributes(typeof(ParameterAttribute), false)
            .Cast<ParameterAttribute>()
            .Single();

        Assert.Equal("uint256", tokenIdAttr.Type);
        Assert.Equal(1, tokenIdAttr.Order);

        var recipientProp = typeof(EmergencyWithdrawFunction)
            .GetProperty(nameof(EmergencyWithdrawFunction.Recipient))!;
        var recipientAttr = recipientProp.GetCustomAttributes(typeof(ParameterAttribute), false)
            .Cast<ParameterAttribute>()
            .Single();

        Assert.Equal("address", recipientAttr.Type);
        Assert.Equal(2, recipientAttr.Order);
    }

    // -------------------------------------------------------------------------
    // Output DTOs
    // -------------------------------------------------------------------------

    [Fact]
    public void RoyaltyInfoOutputDTO_HasFunctionOutputAttribute()
    {
        Assert.NotNull(
            typeof(RoyaltyInfoOutputDTO)
                .GetCustomAttributes(typeof(FunctionOutputAttribute), false)
                .FirstOrDefault());
    }

    [Fact]
    public void GetWalletStakedTokensOutputDTO_TokenIds_IsUint256ArrayAtPosition1()
    {
        var prop = typeof(GetWalletStakedTokensOutputDTO)
            .GetProperty(nameof(GetWalletStakedTokensOutputDTO.TokenIds))!;
        var attr = prop.GetCustomAttributes(typeof(ParameterAttribute), false)
            .Cast<ParameterAttribute>()
            .Single();

        Assert.Equal("uint256[]", attr.Type);
        Assert.Equal(1, attr.Order);
    }
}
