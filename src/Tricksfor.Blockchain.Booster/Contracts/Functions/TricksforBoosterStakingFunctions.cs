using System.Numerics;
using Nethereum.ABI.FunctionEncoding.Attributes;
using Nethereum.Contracts;

namespace Tricksfor.Blockchain.Booster.Contracts.Functions
{
    // -------------------------------------------------------------------------
    // Read (view/pure) function messages
    // -------------------------------------------------------------------------

    [Function("nftContract", "address")]
    public class NftContractFunction : FunctionMessage { }

    [Function("owner", "address")]
    public class StakingOwnerFunction : FunctionMessage { }

    [Function("paused", "bool")]
    public class StakingPausedFunction : FunctionMessage { }

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
    public class StakingPauseFunction : FunctionMessage { }

    [Function("unpause")]
    public class StakingUnpauseFunction : FunctionMessage { }

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
