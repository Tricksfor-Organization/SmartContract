using System.Diagnostics;
using Nethereum.Web3;
using Nethereum.Web3.Accounts;
using Xunit;

namespace Tricksfor.Blockchain.Booster.IntegrationTests;

/// <summary>
/// xUnit collection fixture that starts a local Hardhat JSON-RPC node for integration tests.
/// The node is started once for the entire test collection and stopped when all tests complete.
///
/// Pre-funded test accounts are the deterministic Hardhat development accounts.
/// Private keys are the well-known Hardhat test keys — safe to include in source because
/// these accounts only ever exist on ephemeral local test chains.
/// </summary>
public sealed class HardhatNodeFixture : IAsyncLifetime
{
    private const int Port = 18545;
    private const string RpcUrl = "http://127.0.0.1:18545";
    private const long ChainId = 31337;

    // Pre-funded Hardhat test accounts (deterministic, well-known Hardhat development keys).
    // These keys are safe in source — they are the public Hardhat default accounts and only
    // ever fund ephemeral local chains.
    public const string Account0Address = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    public const string Account0PrivateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
    public const string Account1Address = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
    public const string Account1PrivateKey = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";

    private Process? _hardhatProcess;

    /// <summary>Web3 instance authenticated as Hardhat account 0 (the deployer/minter).</summary>
    public IWeb3 Web3Account0 { get; private set; } = null!;

    /// <summary>Web3 instance authenticated as Hardhat account 1 (a second wallet for negative tests).</summary>
    public IWeb3 Web3Account1 { get; private set; } = null!;

    /// <summary>
    /// Creates a new Web3 instance authenticated with the given private key,
    /// pointing at the local Hardhat node.
    /// </summary>
    public IWeb3 CreateWeb3(string privateKey)
    {
        var account = new Account(privateKey, ChainId);
        return new Web3(account, RpcUrl);
    }

    // -------------------------------------------------------------------------
    // IAsyncLifetime
    // -------------------------------------------------------------------------

    public async Task InitializeAsync()
    {
        var hardhatRoot = FindHardhatRoot();
        StartHardhatNode(hardhatRoot);
        await WaitForRpcAsync(timeoutSeconds: 30);

        Web3Account0 = CreateWeb3(Account0PrivateKey);
        Web3Account1 = CreateWeb3(Account1PrivateKey);
    }

    public Task DisposeAsync()
    {
        if (_hardhatProcess != null && !_hardhatProcess.HasExited)
        {
            _hardhatProcess.Kill(entireProcessTree: true);
            _hardhatProcess.Dispose();
        }
        return Task.CompletedTask;
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private void StartHardhatNode(string hardhatRoot)
    {
        var psi = new ProcessStartInfo
        {
            FileName = "/bin/bash",
            Arguments = $"-c \"./node_modules/.bin/hardhat node --port {Port}\"",
            WorkingDirectory = hardhatRoot,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true,
        };

        _hardhatProcess = Process.Start(psi)
            ?? throw new InvalidOperationException("Failed to start Hardhat node process.");
    }

    private static async Task WaitForRpcAsync(int timeoutSeconds)
    {
        using var http = new HttpClient();
        var deadline = DateTime.UtcNow.AddSeconds(timeoutSeconds);

        while (DateTime.UtcNow < deadline)
        {
            try
            {
                var response = await http.PostAsync(
                    $"http://127.0.0.1:{Port}",
                    new StringContent(
                        "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"eth_chainId\",\"params\":[]}",
                        System.Text.Encoding.UTF8,
                        "application/json"));

                if (response.IsSuccessStatusCode)
                    return;
            }
            catch
            {
                // Node not ready yet — keep polling
            }

            await Task.Delay(200);
        }

        throw new TimeoutException($"Hardhat node did not start on port {Port} within {timeoutSeconds} seconds.");
    }

    /// <summary>
    /// Walks up the directory tree from the test binary output directory until it finds
    /// a directory that contains both <c>package.json</c> and <c>node_modules/</c>,
    /// which identifies the Hardhat project root.
    /// </summary>
    private static string FindHardhatRoot()
    {
        var dir = new DirectoryInfo(AppDomain.CurrentDomain.BaseDirectory);

        while (dir != null)
        {
            if (File.Exists(Path.Combine(dir.FullName, "package.json")) &&
                Directory.Exists(Path.Combine(dir.FullName, "node_modules")))
            {
                return dir.FullName;
            }

            dir = dir.Parent;
        }

        throw new DirectoryNotFoundException(
            "Could not find Hardhat project root: no ancestor directory contains both " +
            "package.json and node_modules/. Run 'npm install' in the repository root first.");
    }
}

/// <summary>
/// xUnit collection definition that binds <see cref="HardhatNodeFixture"/> to all test classes
/// decorated with <c>[Collection(HardhatNodeCollection.Name)]</c>.
/// The Hardhat node is started once and shared across all tests in this collection.
/// </summary>
[CollectionDefinition(Name)]
public sealed class HardhatNodeCollection : ICollectionFixture<HardhatNodeFixture>
{
    public const string Name = "HardhatNode";
}
