using Nethereum.ABI.FunctionEncoding.Attributes;
using Nethereum.Contracts;
using Tricksfor.Blockchain.Booster.Abis;

namespace Tricksfor.Blockchain.Booster.Contracts.Deployment
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
}
