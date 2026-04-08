using System.Numerics;
using Nethereum.ABI.FunctionEncoding.Attributes;
using Nethereum.Contracts;

namespace Tricksfor.Blockchain.Nethereum.Contracts.TricksforBoosterStaking.ContractDefinition
{
    /// <summary>
    /// Deployment message for TricksforBoosterStaking.
    /// Constructor parameters must match the Solidity constructor exactly.
    /// </summary>
    public class TricksforBoosterStakingDeployment : ContractDeploymentMessage
    {
        public static string ABI => TricksforBoosterStakingAbi.Abi;

        public TricksforBoosterStakingDeployment() : base(TricksforBoosterStakingAbi.Bytecode) { }

        [Parameter("address", "nftContract_", 1)]
        public string NftContract { get; set; } = string.Empty;
    }

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

    // -------------------------------------------------------------------------
    // Read (view/pure) function messages
    // -------------------------------------------------------------------------

    [Function("nftContract", "address")]
    public class NftContractFunction : FunctionMessage { }

    [Function("owner", "address")]
    public class OwnerFunction : FunctionMessage { }

    [Function("paused", "bool")]
    public class PausedFunction : FunctionMessage { }

    /// <summary>
    /// Returns true if the given token is currently staked.
    /// Must stay in sync with event semantics: if TokenStaked was emitted, this returns true.
    /// </summary>
    [Function("isStaked", "bool")]
    public class IsStakedFunction : FunctionMessage
    {
        [Parameter("uint256", "tokenId", 1)]
        public BigInteger TokenId { get; set; }
    }

    /// <summary>
    /// Returns the original staker address for a currently staked token.
    /// Returns the zero address if the token is not staked.
    /// Must stay in sync with event semantics: the address matches the staker field in TokenStaked.
    /// </summary>
    [Function("stakedOwnerOf", "address")]
    public class StakedOwnerOfFunction : FunctionMessage
    {
        [Parameter("uint256", "tokenId", 1)]
        public BigInteger TokenId { get; set; }
    }

    /// <summary>
    /// Returns the block timestamp at which the given token was staked.
    /// Returns zero if the token is not currently staked.
    /// </summary>
    [Function("stakedAtOf", "uint256")]
    public class StakedAtOfFunction : FunctionMessage
    {
        [Parameter("uint256", "tokenId", 1)]
        public BigInteger TokenId { get; set; }
    }

    /// <summary>
    /// Returns all token IDs currently staked by the given wallet address.
    /// <para>
    /// <b>Ordering is not guaranteed.</b> The contract uses a swap-and-pop strategy for
    /// O(1) removal; when a token is unstaked or emergency-withdrawn, the last element
    /// in the array takes its position. Do not rely on index stability across
    /// state-changing transactions.
    /// </para>
    /// </summary>
    [Function("getWalletStakedTokens")]
    public class GetWalletStakedTokensFunction : FunctionMessage
    {
        [Parameter("address", "wallet", 1)]
        public string Wallet { get; set; } = string.Empty;
    }

    /// <summary>
    /// Output DTO for <see cref="GetWalletStakedTokensFunction"/>.
    /// </summary>
    [FunctionOutput]
    public class GetWalletStakedTokensOutputDTO : IFunctionOutputDTO
    {
        /// <summary>
        /// The token IDs currently staked by the queried wallet.
        /// Ordering is not guaranteed — see <see cref="GetWalletStakedTokensFunction"/>.
        /// </summary>
        [Parameter("uint256[]", "", 1)]
        public List<BigInteger> TokenIds { get; set; } = new();
    }

    // -------------------------------------------------------------------------
    // Write (transaction) function messages
    // -------------------------------------------------------------------------

    /// <summary>
    /// Stakes a Booster NFT. The caller must have first approved the staking contract
    /// on the NFT contract (ERC-721 approve or setApprovalForAll).
    /// </summary>
    [Function("stake")]
    public class StakeFunction : FunctionMessage
    {
        [Parameter("uint256", "tokenId", 1)]
        public BigInteger TokenId { get; set; }
    }

    /// <summary>
    /// Unstakes a Booster NFT and returns it to the original staker.
    /// Only callable by the original staker. Always available — not paused.
    /// </summary>
    [Function("unstake")]
    public class UnstakeFunction : FunctionMessage
    {
        [Parameter("uint256", "tokenId", 1)]
        public BigInteger TokenId { get; set; }
    }

    /// <summary>
    /// Emergency withdrawal of a staked token by the contract owner.
    /// Only callable by the owner. Emits EmergencyWithdrawn.
    /// </summary>
    [Function("emergencyWithdraw")]
    public class EmergencyWithdrawFunction : FunctionMessage
    {
        [Parameter("uint256", "tokenId", 1)]
        public BigInteger TokenId { get; set; }

        [Parameter("address", "recipient", 2)]
        public string Recipient { get; set; } = string.Empty;
    }

    [Function("pause")]
    public class PauseFunction : FunctionMessage { }

    [Function("unpause")]
    public class UnpauseFunction : FunctionMessage { }

    [Function("transferOwnership")]
    public class TransferOwnershipFunction : FunctionMessage
    {
        [Parameter("address", "newOwner", 1)]
        public string NewOwner { get; set; } = string.Empty;
    }

    [Function("renounceOwnership")]
    public class RenounceOwnershipFunction : FunctionMessage { }

    /// <summary>
    /// Called by an ERC-721 contract when a token is transferred to this contract via safeTransferFrom.
    /// Only tokens from the configured nftContract are accepted; all others are rejected.
    /// Records the from address (the previous owner) as the staker and emits TokenStaked.
    /// </summary>
    [Function("onERC721Received", "bytes4")]
    public class OnERC721ReceivedFunction : FunctionMessage
    {
        [Parameter("address", "", 1)]
        public string Operator { get; set; } = string.Empty;

        [Parameter("address", "from", 2)]
        public string From { get; set; } = string.Empty;

        [Parameter("uint256", "tokenId", 3)]
        public BigInteger TokenId { get; set; }

        [Parameter("bytes", "", 4)]
        public byte[] Data { get; set; } = Array.Empty<byte>();
    }
}
