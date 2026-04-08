using System.Numerics;
using Nethereum.ABI.FunctionEncoding.Attributes;

namespace Tricksfor.Blockchain.Booster.Contracts.Outputs
{
    /// <summary>
    /// Output DTO for <c>getWalletStakedTokens(address wallet)</c>.
    /// </summary>
    [FunctionOutput]
    public class GetWalletStakedTokensOutputDTO : IFunctionOutputDTO
    {
        /// <summary>
        /// The token IDs currently staked by the queried wallet.
        /// Ordering is not guaranteed — the contract uses swap-and-pop removal.
        /// </summary>
        [Parameter("uint256[]", "", 1)]
        public List<BigInteger> TokenIds { get; set; } = new();
    }
}
