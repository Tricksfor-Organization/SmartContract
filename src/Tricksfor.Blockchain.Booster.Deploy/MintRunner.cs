using System.Numerics;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using Nethereum.Web3;
using Nethereum.Web3.Accounts;
using Tricksfor.Blockchain.Booster.Services;

namespace Tricksfor.Blockchain.Booster.Deploy;

public sealed record MintPlan(IReadOnlyList<MintPlanItem> Items);
public sealed record MintPlanItem(BigInteger TokenId, string Recipient);
public sealed record MintResult(BigInteger TokenId, string Recipient, string Status, string TransactionHash);

internal sealed class BigIntegerJsonConverter : JsonConverter<BigInteger>
{
    public override BigInteger Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        var raw = reader.TokenType switch
        {
            JsonTokenType.String => reader.GetString(),
            JsonTokenType.Number => JsonDocument.ParseValue(ref reader).RootElement.GetRawText(),
            _ => null,
        };
        return BigInteger.TryParse(raw, out var value)
            ? value
            : throw new JsonException("Token ID must be an integer or an integer string.");
    }

    public override void Write(Utf8JsonWriter writer, BigInteger value, JsonSerializerOptions options)
        => writer.WriteStringValue(value.ToString());
}

/// <summary>Validates and executes a separate, resumable token-to-recipient mint plan.</summary>
public sealed class MintRunner
{
    private static readonly Regex AddressPattern = new("^0x[0-9a-fA-F]{40}$", RegexOptions.Compiled);
    private readonly DeploymentConfig _config;
    private readonly TextWriter _output;

    public MintRunner(DeploymentConfig config, TextWriter? output = null)
    {
        _config = config;
        _output = output ?? Console.Out;
    }

    public async Task<IReadOnlyList<MintResult>> RunAsync()
    {
        if (string.IsNullOrWhiteSpace(_config.MintPlanPath) || !File.Exists(_config.MintPlanPath))
            throw new DeploymentException("Deployment:MintPlanPath must point to an approved mint-plan JSON file.");

        var plan = JsonSerializer.Deserialize<MintPlan>(File.ReadAllText(_config.MintPlanPath), JsonOptions())
            ?? throw new DeploymentException("Mint plan JSON is empty or invalid.");
        ValidatePlan(plan);

        var nftRecord = ManifestWriter.Read(
            _config.DeploymentsOutputPath, _config.Network, "TricksforBoosterNFT")
            ?? throw new DeploymentException("Missing TricksforBoosterNFT deployment manifest.");
        var account = new Account(_config.PrivateKey, _config.ChainId);
        var web3 = new Web3(account, _config.RpcUrl);
        var nft = new BoosterNFTService(web3, nftRecord.Address);
        var minterRole = await nft.MinterRoleQueryAsync();
        if (!await nft.HasRoleQueryAsync(minterRole, account.Address))
            throw new DeploymentException($"Configured deployer {account.Address} does not hold MINTER_ROLE.");

        var results = new List<MintResult>();
        foreach (var item in plan.Items)
        {
            string? currentOwner = null;
            try { currentOwner = await nft.OwnerOfQueryAsync(item.TokenId); } catch { /* not minted */ }

            if (currentOwner is not null)
            {
                if (!currentOwner.Equals(item.Recipient, StringComparison.OrdinalIgnoreCase))
                    throw new DeploymentException(
                        $"Token {item.TokenId} already exists and is owned by {currentOwner}, not {item.Recipient}.");
                results.Add(new MintResult(item.TokenId, item.Recipient, "already-minted", string.Empty));
            }
            else if (_config.DryRun)
            {
                results.Add(new MintResult(item.TokenId, item.Recipient, "dry-run", string.Empty));
            }
            else
            {
                var receipt = await nft.SafeMintRequestAndWaitForReceiptAsync(item.Recipient, item.TokenId);
                results.Add(new MintResult(item.TokenId, item.Recipient, "minted", receipt.TransactionHash));
            }

            WriteResults(results);
        }

        _output.WriteLine($"Mint plan processed: {results.Count} item(s), dry-run={_config.DryRun}.");
        return results;
    }

    private static void ValidatePlan(MintPlan plan)
    {
        if (plan.Items is null || plan.Items.Count == 0)
            throw new DeploymentException("Mint plan must contain at least one item.");

        var seen = new HashSet<BigInteger>();
        foreach (var item in plan.Items)
        {
            if (item.TokenId <= 0 || !seen.Add(item.TokenId))
                throw new DeploymentException($"Mint plan token IDs must be positive and unique: {item.TokenId}.");
            if (!AddressPattern.IsMatch(item.Recipient) ||
                item.Recipient.Equals("0x0000000000000000000000000000000000000000", StringComparison.OrdinalIgnoreCase))
                throw new DeploymentException($"Mint plan recipient is invalid for token {item.TokenId}.");
        }
    }

    private void WriteResults(IReadOnlyList<MintResult> results)
    {
        var path = Path.Combine(_config.DeploymentsOutputPath, _config.Network, "mint-results.json");
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        File.WriteAllText(path, JsonSerializer.Serialize(results, JsonOptions(writeIndented: true)));
    }

    private static JsonSerializerOptions JsonOptions(bool writeIndented = false)
    {
        var options = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
            WriteIndented = writeIndented,
        };
        options.Converters.Add(new BigIntegerJsonConverter());
        return options;
    }
}
