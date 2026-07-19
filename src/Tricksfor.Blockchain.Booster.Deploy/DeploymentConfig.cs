namespace Tricksfor.Blockchain.Booster.Deploy;

/// <summary>
/// Top-level configuration for the deployment runner.
/// Bind the "Deployment" section from appsettings.json or environment variables.
/// </summary>
public class DeploymentConfig
{
    /// <summary>
    /// Short network name used for manifest folder naming (e.g. "localhost", "sepolia", "mainnet").
    /// Leave empty in the base appsettings.json; set it in the network-specific file
    /// (e.g. appsettings.localhost.json) or via the <c>Deployment__Network</c> environment
    /// variable. When still empty after binding, Program.cs defaults it to <c>DEPLOY_ENV</c>.
    /// </summary>
    public string Network { get; set; } = string.Empty;

    /// <summary>
    /// JSON-RPC endpoint for the target EVM network (e.g. "https://mainnet.infura.io/v3/...").
    /// </summary>
    public string RpcUrl { get; set; } = "http://127.0.0.1:8545";

    /// <summary>
    /// EVM chain ID (e.g. 31337 for local Hardhat, 11155111 for Sepolia).
    /// </summary>
    public long ChainId { get; set; } = 31337;

    /// <summary>
    /// Hex-encoded private key of the deployer account.
    /// Do NOT set this in committed config files.
    /// Provide it via the <c>Deployment__PrivateKey</c> environment variable.
    /// </summary>
    public string PrivateKey { get; set; } = string.Empty;

    /// <summary>
    /// Root directory where deployment manifests are written.
    /// Defaults to "deployments" (relative to the current working directory).
    /// </summary>
    public string DeploymentsOutputPath { get; set; } = "deployments";

    /// <summary>Initial delayed default administrator for the NFT contract.</summary>
    public string AdminAddress { get; set; } = string.Empty;

    /// <summary>Initial account holding MINTER_ROLE.</summary>
    public string MinterAddress { get; set; } = string.Empty;

    /// <summary>Initial owner of the staking contract. Use a multisig on mainnet.</summary>
    public string StakingOwnerAddress { get; set; } = string.Empty;

    /// <summary>Delay in seconds for NFT default-admin transfers.</summary>
    public long DefaultAdminDelay { get; set; }

    /// <summary>Allows replacing contracts even when an existing manifest points to live bytecode.</summary>
    public bool Force { get; set; }

    /// <summary>Skip HTTP metadata URL checks, intended only for isolated local development.</summary>
    public bool SkipMetadataReachability { get; set; }

    /// <summary>Source revision recorded in manifests. CI should set this to GITHUB_SHA.</summary>
    public string SourceCommit { get; set; } = string.Empty;

    /// <summary>Token ID used by the state-changing smoke test.</summary>
    public long SmokeTokenId { get; set; } = 1;

    /// <summary>Path to the separately reviewed token-to-recipient mint plan.</summary>
    public string MintPlanPath { get; set; } = string.Empty;

    /// <summary>Validate the mint plan without submitting transactions.</summary>
    public bool DryRun { get; set; }

    /// <summary>
    /// Constructor arguments for TricksforBoosterNFT.
    /// </summary>
    public NftConstructorArgs Nft { get; set; } = new();
}

/// <summary>
/// Constructor arguments for the TricksforBoosterNFT contract.
/// These values are passed verbatim to the Solidity constructor and recorded in the manifest.
/// </summary>
public class NftConstructorArgs
{
    /// <summary>
    /// Human-readable collection name passed to the ERC-721 constructor (e.g. "TricksforBooster").
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Collection symbol passed to the ERC-721 constructor (e.g. "TFB").
    /// </summary>
    public string Symbol { get; set; } = string.Empty;

    /// <summary>
    /// Base URI for token metadata (e.g. "https://meta.tricksfor.gg/booster/").
    /// </summary>
    public string BaseUri { get; set; } = string.Empty;

    /// <summary>
    /// URI for the collection-level contract metadata (OpenSea contractURI standard).
    /// </summary>
    public string ContractMetadataUri { get; set; } = string.Empty;

    /// <summary>
    /// Address that receives ERC-2981 royalty payments.
    /// Defaults to the deployer address when left empty.
    /// </summary>
    public string RoyaltyReceiver { get; set; } = string.Empty;

    /// <summary>
    /// Royalty fee in basis points (10 000 = 100%).
    /// </summary>
    public long RoyaltyFeeBasisPoints { get; set; } = 500;
}
