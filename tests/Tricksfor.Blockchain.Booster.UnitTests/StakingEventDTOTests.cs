using System.Numerics;
using Nethereum.ABI.FunctionEncoding.Attributes;
using Nethereum.Contracts;
using Tricksfor.Blockchain.Booster.Contracts.Deployment;
using Tricksfor.Blockchain.Booster.Contracts.Events;
using Tricksfor.Blockchain.Booster.Contracts.Functions;
using Tricksfor.Blockchain.Booster.Contracts.Outputs;
using Xunit;

namespace Tricksfor.Blockchain.Booster.UnitTests;

/// <summary>
/// Unit tests for the integration-critical staking event DTOs.
/// These tests guard against accidental rename, reorder, or re-indexing of event fields
/// that would silently break the Tricksfor backend indexer.
/// </summary>
public class StakingEventDTOTests
{
    // -------------------------------------------------------------------------
    // TokenStakedEventDTO
    // -------------------------------------------------------------------------

    [Fact]
    public void TokenStakedEventDTO_HasCorrectEventName()
    {
        var attr = typeof(TokenStakedEventDTO)
            .GetCustomAttributes(typeof(EventAttribute), false)
            .Cast<EventAttribute>()
            .Single();

        Assert.Equal("TokenStaked", attr.Name);
    }

    [Fact]
    public void TokenStakedEventDTO_Staker_IsIndexedAddressAtPosition1()
    {
        var prop = typeof(TokenStakedEventDTO).GetProperty(nameof(TokenStakedEventDTO.Staker))!;
        var attr = prop.GetCustomAttributes(typeof(ParameterAttribute), false)
            .Cast<ParameterAttribute>()
            .Single();

        Assert.Equal("address", attr.Type);
        Assert.Equal("staker", attr.Name);
        Assert.Equal(1, attr.Order);
        Assert.True(attr.Parameter.Indexed);
    }

    [Fact]
    public void TokenStakedEventDTO_TokenId_IsIndexedUint256AtPosition2()
    {
        var prop = typeof(TokenStakedEventDTO).GetProperty(nameof(TokenStakedEventDTO.TokenId))!;
        var attr = prop.GetCustomAttributes(typeof(ParameterAttribute), false)
            .Cast<ParameterAttribute>()
            .Single();

        Assert.Equal("uint256", attr.Type);
        Assert.Equal("tokenId", attr.Name);
        Assert.Equal(2, attr.Order);
        Assert.True(attr.Parameter.Indexed);
    }

    [Fact]
    public void TokenStakedEventDTO_StakedAt_IsNonIndexedUint256AtPosition3()
    {
        var prop = typeof(TokenStakedEventDTO).GetProperty(nameof(TokenStakedEventDTO.StakedAt))!;
        var attr = prop.GetCustomAttributes(typeof(ParameterAttribute), false)
            .Cast<ParameterAttribute>()
            .Single();

        Assert.Equal("uint256", attr.Type);
        Assert.Equal("stakedAt", attr.Name);
        Assert.Equal(3, attr.Order);
        Assert.False(attr.Parameter.Indexed);
    }

    // -------------------------------------------------------------------------
    // TokenUnstakedEventDTO
    // -------------------------------------------------------------------------

    [Fact]
    public void TokenUnstakedEventDTO_HasCorrectEventName()
    {
        var attr = typeof(TokenUnstakedEventDTO)
            .GetCustomAttributes(typeof(EventAttribute), false)
            .Cast<EventAttribute>()
            .Single();

        Assert.Equal("TokenUnstaked", attr.Name);
    }

    [Fact]
    public void TokenUnstakedEventDTO_Staker_IsIndexedAddressAtPosition1()
    {
        var prop = typeof(TokenUnstakedEventDTO).GetProperty(nameof(TokenUnstakedEventDTO.Staker))!;
        var attr = prop.GetCustomAttributes(typeof(ParameterAttribute), false)
            .Cast<ParameterAttribute>()
            .Single();

        Assert.Equal("address", attr.Type);
        Assert.Equal("staker", attr.Name);
        Assert.Equal(1, attr.Order);
        Assert.True(attr.Parameter.Indexed);
    }

    [Fact]
    public void TokenUnstakedEventDTO_TokenId_IsIndexedUint256AtPosition2()
    {
        var prop = typeof(TokenUnstakedEventDTO).GetProperty(nameof(TokenUnstakedEventDTO.TokenId))!;
        var attr = prop.GetCustomAttributes(typeof(ParameterAttribute), false)
            .Cast<ParameterAttribute>()
            .Single();

        Assert.Equal("uint256", attr.Type);
        Assert.Equal("tokenId", attr.Name);
        Assert.Equal(2, attr.Order);
        Assert.True(attr.Parameter.Indexed);
    }

    [Fact]
    public void TokenUnstakedEventDTO_UnstakedAt_IsNonIndexedUint256AtPosition3()
    {
        var prop = typeof(TokenUnstakedEventDTO).GetProperty(nameof(TokenUnstakedEventDTO.UnstakedAt))!;
        var attr = prop.GetCustomAttributes(typeof(ParameterAttribute), false)
            .Cast<ParameterAttribute>()
            .Single();

        Assert.Equal("uint256", attr.Type);
        Assert.Equal("unstakedAt", attr.Name);
        Assert.Equal(3, attr.Order);
        Assert.False(attr.Parameter.Indexed);
    }

    // -------------------------------------------------------------------------
    // EmergencyWithdrawnEventDTO
    // -------------------------------------------------------------------------

    [Fact]
    public void EmergencyWithdrawnEventDTO_HasCorrectEventName()
    {
        var attr = typeof(EmergencyWithdrawnEventDTO)
            .GetCustomAttributes(typeof(EventAttribute), false)
            .Cast<EventAttribute>()
            .Single();

        Assert.Equal("EmergencyWithdrawn", attr.Name);
    }

    [Fact]
    public void EmergencyWithdrawnEventDTO_OriginalStaker_IsIndexedAddressAtPosition1()
    {
        var prop = typeof(EmergencyWithdrawnEventDTO)
            .GetProperty(nameof(EmergencyWithdrawnEventDTO.OriginalStaker))!;
        var attr = prop.GetCustomAttributes(typeof(ParameterAttribute), false)
            .Cast<ParameterAttribute>()
            .Single();

        Assert.Equal("address", attr.Type);
        Assert.Equal("originalStaker", attr.Name);
        Assert.Equal(1, attr.Order);
        Assert.True(attr.Parameter.Indexed);
    }

    [Fact]
    public void EmergencyWithdrawnEventDTO_TokenId_IsIndexedUint256AtPosition2()
    {
        var prop = typeof(EmergencyWithdrawnEventDTO)
            .GetProperty(nameof(EmergencyWithdrawnEventDTO.TokenId))!;
        var attr = prop.GetCustomAttributes(typeof(ParameterAttribute), false)
            .Cast<ParameterAttribute>()
            .Single();

        Assert.Equal("uint256", attr.Type);
        Assert.Equal("tokenId", attr.Name);
        Assert.Equal(2, attr.Order);
        Assert.True(attr.Parameter.Indexed);
    }

    [Fact]
    public void EmergencyWithdrawnEventDTO_Recipient_IsIndexedAddressAtPosition3()
    {
        var prop = typeof(EmergencyWithdrawnEventDTO)
            .GetProperty(nameof(EmergencyWithdrawnEventDTO.Recipient))!;
        var attr = prop.GetCustomAttributes(typeof(ParameterAttribute), false)
            .Cast<ParameterAttribute>()
            .Single();

        Assert.Equal("address", attr.Type);
        Assert.Equal("recipient", attr.Name);
        Assert.Equal(3, attr.Order);
        Assert.True(attr.Parameter.Indexed);
    }

    [Fact]
    public void EmergencyWithdrawnEventDTO_WithdrawnAt_IsNonIndexedUint256AtPosition4()
    {
        var prop = typeof(EmergencyWithdrawnEventDTO)
            .GetProperty(nameof(EmergencyWithdrawnEventDTO.WithdrawnAt))!;
        var attr = prop.GetCustomAttributes(typeof(ParameterAttribute), false)
            .Cast<ParameterAttribute>()
            .Single();

        Assert.Equal("uint256", attr.Type);
        Assert.Equal("withdrawnAt", attr.Name);
        Assert.Equal(4, attr.Order);
        Assert.False(attr.Parameter.Indexed);
    }
}
