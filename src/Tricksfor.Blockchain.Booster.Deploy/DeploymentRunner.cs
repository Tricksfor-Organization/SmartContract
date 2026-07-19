using Nethereum.Web3;
using Nethereum.Web3.Accounts;
using Nethereum.RPC.Eth.DTOs;
using Nethereum.Util;
using System.Text.RegularExpressions;
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
    private static readonly Regex AddressPattern = new("^0x[0-9a-fA-F]{40}$", RegexOptions.Compiled);
    private static readonly Regex PrivateKeyPattern = new("^(0x)?[0-9a-fA-F]{64}$", RegexOptions.Compiled);
    private const string ZeroAddress = "0x0000000000000000000000000000000000000000";
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

        if (_config.Network.EndsWith("-mainnet", StringComparison.OrdinalIgnoreCase) &&
            (_config.AdminAddress.Equals(deployerAddress, StringComparison.OrdinalIgnoreCase) ||
             _config.StakingOwnerAddress.Equals(deployerAddress, StringComparison.OrdinalIgnoreCase)))
            throw new DeploymentException(
                "Mainnet AdminAddress and StakingOwnerAddress must be governance/multisig addresses, not the deployer.");

        _output.WriteLine("[1/6] Running RPC and account preflight checks...");
        await DeploymentPreflight.RunAsync(_config, web3, deployerAddress, _output);

        // ---- Step 2: Deploy TricksforBoosterNFT ----------------------------------------
        _output.WriteLine("[2/6] Deploying TricksforBoosterNFT...");

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
            InitialAdmin = _config.AdminAddress,
            InitialMinter = _config.MinterAddress,
            DefaultAdminDelay = _config.DefaultAdminDelay,
        };

        var nftRecord = await TryGetReusableRecordAsync(web3, "TricksforBoosterNFT");
        if (nftRecord is null)
        {
            var nftReceipt = await BoosterNFTService.DeployContractAndWaitForReceiptAsync(web3, nftDeployment);
            var nftAddressFromReceipt = nftReceipt.ContractAddress
                ?? throw new DeploymentException("NFT deployment receipt did not contain a contract address.");
            nftRecord = await CreateRecordAsync(
                web3,
                "TricksforBoosterNFT",
                nftAddressFromReceipt,
                nftReceipt,
                deployerAddress,
                TricksforBoosterNFTDeployment.BYTECODE,
                _config.AdminAddress,
                _config.MinterAddress,
                string.Empty,
                new object[]
                {
                    _config.Nft.Name,
                    _config.Nft.Symbol,
                    _config.Nft.BaseUri,
                    _config.Nft.ContractMetadataUri,
                    royaltyReceiver,
                    _config.Nft.RoyaltyFeeBasisPoints,
                    _config.AdminAddress,
                    _config.MinterAddress,
                    _config.DefaultAdminDelay,
                });
            var nftManifest = ManifestWriter.Write(nftRecord, _config.DeploymentsOutputPath, _config.Network);
            _output.WriteLine($"      Deployed at {nftRecord.Address}; receipt saved to {nftManifest}");
        }

        var nftAddress = nftRecord.Address;

        // ---- Step 3: Deploy TricksforBoosterStaking (requires NFT address) ---------------
        _output.WriteLine("[3/6] Deploying TricksforBoosterStaking...");

        var stakingDeployment = new TricksforBoosterStakingDeployment
        {
            NftContract = nftAddress,
            InitialOwner = _config.StakingOwnerAddress,
        };

        var stakingRecord = await TryGetReusableRecordAsync(web3, "TricksforBoosterStaking");
        if (stakingRecord is null)
        {
            var stakingReceipt = await BoosterStakingService.DeployContractAndWaitForReceiptAsync(web3, stakingDeployment);
            var stakingAddressFromReceipt = stakingReceipt.ContractAddress
                ?? throw new DeploymentException("Staking deployment receipt did not contain a contract address.");
            stakingRecord = await CreateRecordAsync(
                web3,
                "TricksforBoosterStaking",
                stakingAddressFromReceipt,
                stakingReceipt,
                deployerAddress,
                TricksforBoosterStakingDeployment.BYTECODE,
                string.Empty,
                string.Empty,
                _config.StakingOwnerAddress,
                new object[] { nftAddress, _config.StakingOwnerAddress });
            var stakingManifest = ManifestWriter.Write(stakingRecord, _config.DeploymentsOutputPath, _config.Network);
            _output.WriteLine($"      Deployed at {stakingRecord.Address}; receipt saved to {stakingManifest}");
        }

        var stakingAddress = stakingRecord.Address;

        // ---- Step 4: Persist manifests --------------------------------------------------
        _output.WriteLine("[4/6] Writing deployment manifests...");

        var nftPath = ManifestWriter.Write(nftRecord, _config.DeploymentsOutputPath, _config.Network);
        var stakingPath = ManifestWriter.Write(stakingRecord, _config.DeploymentsOutputPath, _config.Network);

        _output.WriteLine($"      {nftPath}");
        _output.WriteLine($"      {stakingPath}");

        // ---- Step 5: Post-deploy sanity checks ------------------------------------------
        _output.WriteLine("[5/6] Running sanity checks...");

        var checker = new PostDeploySanityChecker(web3);
        var sanityResults = await checker.RunAsync(
            _config, nftAddress, stakingAddress, royaltyReceiver);

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

        // ---- Step 6: Deployment summary -------------------------------------------------
        _output.WriteLine("[6/6] Deployment summary...");
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

    private async Task<ContractDeploymentRecord?> TryGetReusableRecordAsync(IWeb3 web3, string contractName)
    {
        if (_config.Force)
        {
            _output.WriteLine($"      Force enabled; a replacement {contractName} will be deployed.");
            return null;
        }

        var existing = ManifestWriter.Read(_config.DeploymentsOutputPath, _config.Network, contractName);
        if (existing is null || !IsValidNonZeroAddress(existing.Address))
            return null;

        var code = await web3.Eth.GetCode.SendRequestAsync(existing.Address);
        if (string.IsNullOrWhiteSpace(code) || code == "0x" || code == "0x0")
        {
            _output.WriteLine($"      Existing {contractName} manifest has no live bytecode; redeploying.");
            return null;
        }

        _output.WriteLine($"      Reusing {contractName} at {existing.Address} from its deployment manifest.");
        return existing;
    }

    private async Task<ContractDeploymentRecord> CreateRecordAsync(
        IWeb3 web3,
        string contractName,
        string address,
        TransactionReceipt receipt,
        string deployerAddress,
        string creationCode,
        string finalAdmin,
        string finalMinter,
        string finalOwner,
        object[] constructorArgs)
    {
        var runtimeCode = await web3.Eth.GetCode.SendRequestAsync(address);
        return new ContractDeploymentRecord
        {
            ContractName = contractName,
            Address = address,
            TransactionHash = receipt.TransactionHash,
            BlockNumber = receipt.BlockNumber is null ? 0 : (long)receipt.BlockNumber.Value,
            DeployedAt = DateTimeOffset.UtcNow,
            ConstructorArgs = constructorArgs,
            ChainId = _config.ChainId,
            Deployer = deployerAddress,
            TransactionStatus = receipt.Status?.Value == 1 ? "success" : "failed",
            GasUsed = receipt.GasUsed?.Value.ToString() ?? string.Empty,
            SourceCommit = _config.SourceCommit,
            CreationCodeHash = HashHex(creationCode),
            RuntimeCodeHash = HashHex(runtimeCode),
            FinalAdmin = finalAdmin,
            FinalMinter = finalMinter,
            FinalOwner = finalOwner,
        };
    }

    private static string HashHex(string value)
    {
        if (string.IsNullOrWhiteSpace(value) || value is "0x" or "0x0")
            return string.Empty;
        return $"0x{Sha3Keccack.Current.CalculateHashFromHex(value)}";
    }

    private void ValidateConfig()
    {
        var errors = new List<string>();

        if (string.IsNullOrWhiteSpace(_config.RpcUrl))
            errors.Add("Deployment:RpcUrl is required.");

        if (string.IsNullOrWhiteSpace(_config.Network))
            errors.Add("Deployment:Network is required.");

        if (_config.ChainId <= 0)
            errors.Add("Deployment:ChainId must be a positive integer.");

        if (string.IsNullOrWhiteSpace(_config.PrivateKey))
            errors.Add("Deployment:PrivateKey is required. " +
                       "Set the Deployment__PrivateKey environment variable.");
        else if (!PrivateKeyPattern.IsMatch(_config.PrivateKey))
            errors.Add("Deployment:PrivateKey must be a 32-byte hexadecimal key.");

        ValidateAddress(_config.AdminAddress, "Deployment:AdminAddress", errors);
        ValidateAddress(_config.MinterAddress, "Deployment:MinterAddress", errors);
        ValidateAddress(_config.StakingOwnerAddress, "Deployment:StakingOwnerAddress", errors);

        if (_config.DefaultAdminDelay < 0 || _config.DefaultAdminDelay > 281_474_976_710_655L)
            errors.Add("Deployment:DefaultAdminDelay must fit in uint48.");

        if (string.IsNullOrWhiteSpace(_config.Nft.Name))
            errors.Add("Deployment:Nft:Name is required.");

        if (string.IsNullOrWhiteSpace(_config.Nft.Symbol))
            errors.Add("Deployment:Nft:Symbol is required.");

        if (_config.Nft.RoyaltyFeeBasisPoints < 0 || _config.Nft.RoyaltyFeeBasisPoints > 10_000)
            errors.Add("Deployment:Nft:RoyaltyFeeBasisPoints must be between 0 and 10 000 (inclusive).");

        if (!string.IsNullOrWhiteSpace(_config.Nft.RoyaltyReceiver))
            ValidateAddress(_config.Nft.RoyaltyReceiver, "Deployment:Nft:RoyaltyReceiver", errors);

        if (string.IsNullOrWhiteSpace(_config.Nft.BaseUri))
            errors.Add("Deployment:Nft:BaseUri is required.");

        if (string.IsNullOrWhiteSpace(_config.Nft.ContractMetadataUri))
            errors.Add("Deployment:Nft:ContractMetadataUri is required.");

        if (errors.Count > 0)
            throw new DeploymentException(
                $"Configuration is invalid:{Environment.NewLine}" +
                string.Join(Environment.NewLine, errors));
    }

    private static void ValidateAddress(string address, string label, List<string> errors)
    {
        if (!IsValidNonZeroAddress(address))
            errors.Add($"{label} must be a non-zero 20-byte hexadecimal address.");
    }

    private static bool IsValidNonZeroAddress(string address)
        => !string.IsNullOrWhiteSpace(address) &&
           AddressPattern.IsMatch(address) &&
           !address.Equals(ZeroAddress, StringComparison.OrdinalIgnoreCase);
}
