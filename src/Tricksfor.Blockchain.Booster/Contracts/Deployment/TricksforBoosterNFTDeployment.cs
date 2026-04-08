using System.Numerics;
using Nethereum.ABI.FunctionEncoding.Attributes;
using Nethereum.Contracts;
using Tricksfor.Blockchain.Booster.Abis;

namespace Tricksfor.Blockchain.Booster.Contracts.Deployment
{
    /// <summary>
    /// Deployment message for TricksforBoosterNFT.
    /// Constructor parameters must match the Solidity constructor exactly.
    /// </summary>
    public class TricksforBoosterNFTDeployment : ContractDeploymentMessage
    {
        public static string ABI => TricksforBoosterNFTAbi.Abi;

        public TricksforBoosterNFTDeployment() : base(TricksforBoosterNFTAbi.Bytecode) { }

        [Parameter("string", "name_", 1)]
        public string Name { get; set; } = string.Empty;

        [Parameter("string", "symbol_", 2)]
        public string Symbol { get; set; } = string.Empty;

        [Parameter("string", "baseURI_", 3)]
        public string BaseUri { get; set; } = string.Empty;

        [Parameter("string", "contractMetadataURI_", 4)]
        public string ContractMetadataUri { get; set; } = string.Empty;

        [Parameter("address", "royaltyReceiver_", 5)]
        public string RoyaltyReceiver { get; set; } = string.Empty;

        /// <summary>
        /// Royalty fee in basis points (10 000 = 100%).
        /// </summary>
        [Parameter("uint96", "royaltyFeeBasisPoints_", 6)]
        public BigInteger RoyaltyFeeBasisPoints { get; set; }
    }
}
