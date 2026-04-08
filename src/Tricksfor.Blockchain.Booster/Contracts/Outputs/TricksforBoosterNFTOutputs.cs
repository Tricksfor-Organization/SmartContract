using System.Numerics;
using Nethereum.ABI.FunctionEncoding.Attributes;

namespace Tricksfor.Blockchain.Booster.Contracts.Outputs
{
    /// <summary>
    /// Output DTO for <c>royaltyInfo(uint256 tokenId, uint256 salePrice)</c>.
    /// Returns the royalty receiver address and the royalty amount for a given sale price.
    /// </summary>
    [FunctionOutput]
    public class RoyaltyInfoOutputDTO : IFunctionOutputDTO
    {
        [Parameter("address", "receiver", 1)]
        public string Receiver { get; set; } = string.Empty;

        [Parameter("uint256", "royaltyAmount", 2)]
        public BigInteger RoyaltyAmount { get; set; }
    }
}
