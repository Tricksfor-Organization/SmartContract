using Microsoft.Extensions.Configuration;
using Tricksfor.Blockchain.Booster.Deploy;

// ---------------------------------------------------------------------------
// Tricksfor Booster Deployment Runner
//
// Configuration is loaded from three sources, in priority order (lowest → highest):
//   1. appsettings.json              — committed base defaults (no secrets)
//   2. appsettings.{DEPLOY_ENV}.json — network-specific overrides (optional, no secrets)
//   3. Environment variables         — secrets and CI overrides
//
// Required environment variables:
//   Deployment__PrivateKey   — hex-encoded private key of the deployer account
//
// Optional environment variables (override appsettings):
//   DEPLOY_ENV               — environment name ("localhost", "sepolia", "mainnet")
//   Deployment__RpcUrl       — JSON-RPC endpoint URL
//   Deployment__ChainId      — EVM chain ID
// ---------------------------------------------------------------------------

var env = Environment.GetEnvironmentVariable("DEPLOY_ENV") ?? "localhost";

var configuration = new ConfigurationBuilder()
    .SetBasePath(AppContext.BaseDirectory)
    .AddJsonFile("appsettings.json", optional: false, reloadOnChange: false)
    .AddJsonFile($"appsettings.{env}.json", optional: true, reloadOnChange: false)
    .AddEnvironmentVariables()
    .Build();

var config = new DeploymentConfig();
configuration.GetSection("Deployment").Bind(config);

Console.WriteLine("=== Tricksfor Booster Deployment Runner ===");
Console.WriteLine($"Environment:  {env}");
Console.WriteLine($"Network:      {config.Network}");
Console.WriteLine($"RPC URL:      {config.RpcUrl}");
Console.WriteLine($"Chain ID:     {config.ChainId}");
Console.WriteLine();

try
{
    var runner = new DeploymentRunner(config);
    await runner.RunAsync();
    return 0;
}
catch (DeploymentException ex)
{
    Console.Error.WriteLine($"Deployment failed: {ex.Message}");
    return 1;
}
catch (Exception ex)
{
    Console.Error.WriteLine($"Unexpected error: {ex}");
    return 2;
}
