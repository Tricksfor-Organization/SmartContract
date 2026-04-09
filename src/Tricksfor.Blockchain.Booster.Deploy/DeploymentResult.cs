namespace Tricksfor.Blockchain.Booster.Deploy;

/// <summary>
/// The outcome of a successful deployment run.
/// </summary>
/// <param name="Nft">Deployment record for TricksforBoosterNFT.</param>
/// <param name="Staking">Deployment record for TricksforBoosterStaking.</param>
/// <param name="SanityChecks">Results of all post-deploy sanity checks (all passed).</param>
public record DeploymentResult(
    ContractDeploymentRecord Nft,
    ContractDeploymentRecord Staking,
    IReadOnlyList<SanityCheckResult> SanityChecks);
