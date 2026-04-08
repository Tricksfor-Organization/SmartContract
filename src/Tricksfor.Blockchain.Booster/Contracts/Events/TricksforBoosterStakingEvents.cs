using System.Numerics;
using Nethereum.ABI.FunctionEncoding.Attributes;
using Nethereum.Contracts;

namespace Tricksfor.Blockchain.Booster.Contracts.Events
{
    // -------------------------------------------------------------------------
    // Integration-critical event DTOs
    //
    // These DTOs are part of the public integration contract between this
    // repository and the Tricksfor backend indexer. Field names, types, and
    // indexed attributes MUST match the Solidity event definitions exactly.
    // Do not rename, reorder, or change indexed flags without a breaking-change
    // notice and downstream coordination.
    // -------------------------------------------------------------------------

    /// <summary>
    /// Emitted when a Booster NFT is staked.
    /// Matches: event TokenStaked(address indexed staker, uint256 indexed tokenId, uint256 stakedAt)
    /// </summary>
    [Event("TokenStaked")]
    public class TokenStakedEventDTO : IEventDTO
    {
        /// <summary>The wallet address that owns and staked the token.</summary>
        [Parameter("address", "staker", 1, true)]
        public string Staker { get; set; } = string.Empty;

        /// <summary>The staked NFT token ID.</summary>
        [Parameter("uint256", "tokenId", 2, true)]
        public BigInteger TokenId { get; set; }

        /// <summary>Block timestamp at the moment of staking (Unix seconds).</summary>
        [Parameter("uint256", "stakedAt", 3, false)]
        public BigInteger StakedAt { get; set; }
    }

    /// <summary>
    /// Emitted when a Booster NFT is unstaked.
    /// Matches: event TokenUnstaked(address indexed staker, uint256 indexed tokenId, uint256 unstakedAt)
    /// </summary>
    [Event("TokenUnstaked")]
    public class TokenUnstakedEventDTO : IEventDTO
    {
        /// <summary>The wallet address that originally staked (and receives back) the token.</summary>
        [Parameter("address", "staker", 1, true)]
        public string Staker { get; set; } = string.Empty;

        /// <summary>The unstaked NFT token ID.</summary>
        [Parameter("uint256", "tokenId", 2, true)]
        public BigInteger TokenId { get; set; }

        /// <summary>Block timestamp at the moment of unstaking (Unix seconds).</summary>
        [Parameter("uint256", "unstakedAt", 3, false)]
        public BigInteger UnstakedAt { get; set; }
    }

    /// <summary>
    /// Emitted when the contract owner performs an emergency withdrawal of a staked token.
    /// Matches: event EmergencyWithdrawn(address indexed originalStaker, uint256 indexed tokenId,
    ///                                    address indexed recipient, uint256 withdrawnAt)
    /// </summary>
    [Event("EmergencyWithdrawn")]
    public class EmergencyWithdrawnEventDTO : IEventDTO
    {
        /// <summary>The wallet that originally staked the token.</summary>
        [Parameter("address", "originalStaker", 1, true)]
        public string OriginalStaker { get; set; } = string.Empty;

        /// <summary>The affected NFT token ID.</summary>
        [Parameter("uint256", "tokenId", 2, true)]
        public BigInteger TokenId { get; set; }

        /// <summary>The address that received the token.</summary>
        [Parameter("address", "recipient", 3, true)]
        public string Recipient { get; set; } = string.Empty;

        /// <summary>Block timestamp at the moment of the withdrawal (Unix seconds).</summary>
        [Parameter("uint256", "withdrawnAt", 4, false)]
        public BigInteger WithdrawnAt { get; set; }
    }
}
