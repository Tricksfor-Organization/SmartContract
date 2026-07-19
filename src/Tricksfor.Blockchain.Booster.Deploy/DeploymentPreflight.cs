using System.Net;
using Nethereum.Web3;

namespace Tricksfor.Blockchain.Booster.Deploy;

/// <summary>Read-only checks performed before a deployment transaction is submitted.</summary>
public static class DeploymentPreflight
{
    public static async Task RunAsync(
        DeploymentConfig config,
        IWeb3 web3,
        string deployerAddress,
        TextWriter output,
        HttpClient? httpClient = null)
    {
        var chainId = await web3.Eth.ChainId.SendRequestAsync();
        if ((long)chainId.Value != config.ChainId)
            throw new DeploymentException(
                $"RPC chain ID mismatch: configured {config.ChainId}, endpoint returned {chainId.Value}.");

        var balance = await web3.Eth.GetBalance.SendRequestAsync(deployerAddress);
        if (balance.Value <= 0)
            throw new DeploymentException($"Deployer {deployerAddress} has a zero native-token balance.");

        var gasPrice = await web3.Eth.GasPrice.SendRequestAsync();
        if (gasPrice.Value <= 0)
            throw new DeploymentException("RPC fee estimation returned a non-positive gas price.");

        output.WriteLine($"      Deployer:     {deployerAddress}");
        output.WriteLine($"      Balance wei:  {balance.Value}");
        output.WriteLine($"      Gas price:    {gasPrice.Value}");

        if (config.SkipMetadataReachability)
            return;

        using var ownedClient = httpClient is null ? new HttpClient { Timeout = TimeSpan.FromSeconds(15) } : null;
        var client = httpClient ?? ownedClient!;
        await EnsureReachableAsync(
            client,
            $"{config.Nft.BaseUri}{config.SmokeTokenId}",
            $"token {config.SmokeTokenId} metadata URL");
        await EnsureReachableAsync(client, config.Nft.ContractMetadataUri, "contract metadata URL");
    }

    private static async Task EnsureReachableAsync(HttpClient client, string value, string label)
    {
        if (!Uri.TryCreate(value, UriKind.Absolute, out var uri) ||
            (uri.Scheme != Uri.UriSchemeHttps && uri.Scheme != Uri.UriSchemeHttp))
            throw new DeploymentException($"The {label} is not a valid HTTP(S) URL: '{value}'.");

        using var request = new HttpRequestMessage(HttpMethod.Get, uri);
        using var response = await client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead);
        if (response.StatusCode is HttpStatusCode.NotFound or HttpStatusCode.Gone || !response.IsSuccessStatusCode)
            throw new DeploymentException(
                $"The {label} is not reachable ({(int)response.StatusCode} {response.ReasonPhrase}): {uri}");
    }
}
