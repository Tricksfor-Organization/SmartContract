using Nethereum.Web3;
using Nethereum.Web3.Accounts;
using Tricksfor.Blockchain.Booster.Contracts.Deployment;
using Tricksfor.Blockchain.Booster.Services;

namespace Tricksfor.Blockchain.Booster.Deploy;

/// <summary>
/// Orchestrates the full deployment flow for TricksforBoosterNFT and TricksforBoosterStaking.
///
/// Deployment flow:
///   1. Config is provided by the caller (already loaded from appsettings / env vars)
///   2. Deploy TricksforBoosterNFT
///   3. Deploy TricksforBoosterStaking (receives the NFT contract address as constructor arg)
///   4. Persist deployment manifests to deployments/{network}/
///   5. Run post-deploy sanity checks against the live contracts
///   6. Print deployment summary
/// </summary>
public sealed class DeploymentRunner
{
    private readonly DeploymentConfig _config;
    private readonly TextWriter _output;

    /// <param name="config">Fully bound deployment configuration.</param>
    /// <param name="output">
    /// Where progress and summary lines are written.
    /// Defaults to <see cref="Console.Out"/> when <c>null</c>.
    /// </param>
    public DeploymentRunner(DeploymentConfig config, TextWriter? output = null)
    {
        _config = config;
        _output = output ?? Console.Out;
    }

    /// <summary>
    /// Executes the full deployment flow and returns the deployment result.
    /// Throws <see cref="DeploymentException"/> on configuration or chain errors.
    /// </summary>
    public async Task<DeploymentResult> RunAsync()
    {
        ValidateConfig();

        var account = new Account(_config.PrivateKey, _config.ChainId);
        var web3 = new Web3(account, _config.RpcUrl);
        var deployerAddress = account.Address;

        // ---- Step 2: Deploy TricksforBoosterNFT ----------------------------------------
        _output.WriteLine("[1/4] Deploying TricksforBoosterNFT...");

        var royaltyReceiver = string.IsNullOrWhiteSpace(_config.Nft.RoyaltyReceiver)
            ? deployerAddress
            : _config.Nft.RoyaltyReceiver;

        var nftDeployment = new TricksforBoosterNFTDeployment
        {
            Name = _config.Nft.Name,
            Symbol = _config.Nft.Symbol,
            BaseUri = _config.Nft.BaseUri,
            ContractMetadataUri = _config.Nft.ContractMetadataUri,
            RoyaltyReceiver = royaltyReceiver,
            RoyaltyFeeBasisPoints = _config.Nft.RoyaltyFeeBasisPoints,
        };

        var nftReceipt = await BoosterNFTService.DeployContractAndWaitForReceiptAsync(
            web3, nftDeployment);

        var nftAddress = nftReceipt.ContractAddress
            ?? throw new DeploymentException(
                "NFT deployment receipt did not contain a contract address.");

        _output.WriteLine($"      TricksforBoosterNFT deployed at {nftAddress}");

        // ---- Step 3: Deploy TricksforBoosterStaking (requires NFT address) ---------------
        _output.WriteLine("[2/4] Deploying TricksforBoosterStaking...");

        var stakingDeployment = new TricksforBoosterStakingDeployment
        {
            NftContract = nftAddress,
        };

        var stakingReceipt = await BoosterStakingService.DeployContractAndWaitForReceiptAsync(
            web3, stakingDeployment);

        var stakingAddress = stakingReceipt.ContractAddress
            ?? throw new DeploymentException(
                "Staking deployment receipt did not contain a contract address.");

        _output.WriteLine($"      TricksforBoosterStaking deployed at {stakingAddress}");

        var deployedAt = DateTimeOffset.UtcNow;

        var nftRecord = new ContractDeploymentRecord
        {
            ContractName = "TricksforBoosterNFT",
            Address = nftAddress,
            TransactionHash = nftReceipt.TransactionHash,
            BlockNumber = (long)nftReceipt.BlockNumber.Value,
            DeployedAt = deployedAt,
            ConstructorArgs = new object[]
            {
                _config.Nft.Name,
                _config.Nft.Symbol,
                _config.Nft.BaseUri,
                _config.Nft.ContractMetadataUri,
                royaltyReceiver,
                _config.Nft.RoyaltyFeeBasisPoints,
            },
        };

        var stakingRecord = new ContractDeploymentRecord
        {
            ContractName = "TricksforBoosterStaking",
            Address = stakingAddress,
            TransactionHash = stakingReceipt.TransactionHash,
            BlockNumber = (long)stakingReceipt.BlockNumber.Value,
            DeployedAt = deployedAt,
            ConstructorArgs = new object[] { nftAddress },
        };

        // ---- Step 4: Persist manifests --------------------------------------------------
        _output.WriteLine("[3/4] Writing deployment manifests...");

        var nftPath = ManifestWriter.Write(nftRecord, _config.DeploymentsOutputPath, _config.Network);
        var stakingPath = ManifestWriter.Write(stakingRecord, _config.DeploymentsOutputPath, _config.Network);

        _output.WriteLine($"      {nftPath}");
        _output.WriteLine($"      {stakingPath}");

        // ---- Step 5: Post-deploy sanity checks ------------------------------------------
        _output.WriteLine("[4/4] Running sanity checks...");

        var checker = new PostDeploySanityChecker(web3);
        var sanityResults = await checker.RunAsync(_config, nftAddress, stakingAddress);

        foreach (var check in sanityResults)
        {
            var status = check.Passed ? "✓" : "✗";
            _output.WriteLine($"      {check.Label}: {check.Actual} {status}");
        }

        var failed = sanityResults.Where(r => !r.Passed).ToList();
        if (failed.Count > 0)
        {
            var details = failed.Select(r => $"  {r.Label}: expected '{r.Expected}', got '{r.Actual}'");
            throw new DeploymentException(
                $"One or more sanity checks failed:{Environment.NewLine}" +
                string.Join(Environment.NewLine, details));
        }

        // ---- Step 6: Summary ------------------------------------------------------------
        PrintSummary(nftRecord, stakingRecord, deployerAddress);

        return new DeploymentResult(nftRecord, stakingRecord, sanityResults);
    }

    private void PrintSummary(
        ContractDeploymentRecord nftRecord,
        ContractDeploymentRecord stakingRecord,
        string deployerAddress)
    {
        _output.WriteLine();
        _output.WriteLine("=== Deployment Summary ===");
        _output.WriteLine($"Network:          {_config.Network}");
        _output.WriteLine($"Chain ID:         {_config.ChainId}");
        _output.WriteLine($"Deployer:         {deployerAddress}");
        _output.WriteLine();
        _output.WriteLine("TricksforBoosterNFT");
        _output.WriteLine($"  Address:        {nftRecord.Address}");
        _output.WriteLine($"  Tx Hash:        {nftRecord.TransactionHash}");
        _output.WriteLine($"  Block:          {nftRecord.BlockNumber}");
        _output.WriteLine();
        _output.WriteLine("TricksforBoosterStaking");
        _output.WriteLine($"  Address:        {stakingRecord.Address}");
        _output.WriteLine($"  Tx Hash:        {stakingRecord.TransactionHash}");
        _output.WriteLine($"  Block:          {stakingRecord.BlockNumber}");
        _output.WriteLine();
        _output.WriteLine($"Manifests:        {Path.Combine(_config.DeploymentsOutputPath, _config.Network)}{Path.DirectorySeparatorChar}");
        _output.WriteLine("All sanity checks passed.");
    }

    private void ValidateConfig()
    {
        var errors = new List<string>();

        if (string.IsNullOrWhiteSpace(_config.RpcUrl))
            errors.Add("Deployment:RpcUrl is required.");

        if (string.IsNullOrWhiteSpace(_config.PrivateKey))
            errors.Add("Deployment:PrivateKey is required. " +
                       "Set the Deployment__PrivateKey environment variable.");

        if (string.IsNullOrWhiteSpace(_config.Nft.Name))
            errors.Add("Deployment:Nft:Name is required.");

        if (string.IsNullOrWhiteSpace(_config.Nft.Symbol))
            errors.Add("Deployment:Nft:Symbol is required.");

        if (errors.Count > 0)
            throw new DeploymentException(
                $"Configuration is invalid:{Environment.NewLine}" +
                string.Join(Environment.NewLine, errors));
    }
}
