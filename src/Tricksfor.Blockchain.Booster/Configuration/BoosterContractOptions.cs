namespace Tricksfor.Blockchain.Booster.Configuration
{
    /// <summary>
    /// Configuration options for connecting to and interacting with the
    /// TricksforBoosterNFT and TricksforBoosterStaking contracts.
    /// Bind this from appsettings.json or environment variables.
    /// </summary>
    public class BoosterContractOptions
    {
        /// <summary>
        /// JSON-RPC endpoint for the target EVM network (e.g. "https://mainnet.infura.io/v3/...").
        /// </summary>
        public string RpcUrl { get; set; } = string.Empty;

        /// <summary>
        /// EVM chain ID (e.g. 1 for Ethereum mainnet, 137 for Polygon).
        /// </summary>
        public long ChainId { get; set; }

        /// <summary>
        /// Deployed address of the TricksforBoosterNFT contract.
        /// Leave empty when deploying for the first time.
        /// </summary>
        public string NftContractAddress { get; set; } = string.Empty;

        /// <summary>
        /// Deployed address of the TricksforBoosterStaking contract.
        /// Leave empty when deploying for the first time.
        /// </summary>
        public string StakingContractAddress { get; set; } = string.Empty;

        /// <summary>
        /// Hex-encoded private key used to sign transactions.
        /// Keep this value out of source control; use secrets management in production.
        /// </summary>
        public string PrivateKey { get; set; } = string.Empty;
    }
}
