using System.Text.Json;

namespace Tricksfor.Blockchain.Booster.Deploy;

/// <summary>
/// Writes deployment manifests to disk.
/// Each record is serialized to <c>{outputRoot}/{network}/{contractName}.json</c>,
/// matching the folder structure described in <c>deployments/README.md</c>.
/// </summary>
public static class ManifestWriter
{
    private static readonly JsonSerializerOptions SerializerOptions = new()
    {
        WriteIndented = true,
    };

    /// <summary>
    /// Persists a contract deployment record to disk.
    /// Creates the <c>{outputRoot}/{network}/</c> directory when it does not yet exist.
    /// </summary>
    /// <returns>The absolute or relative file path of the written manifest.</returns>
    public static string Write(
        ContractDeploymentRecord record,
        string outputRoot,
        string network)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(outputRoot);
        ArgumentException.ThrowIfNullOrWhiteSpace(network);
        ArgumentException.ThrowIfNullOrWhiteSpace(record.ContractName);

        var directory = Path.Combine(outputRoot, network);
        Directory.CreateDirectory(directory);

        var filePath = Path.Combine(directory, $"{record.ContractName}.json");
        var json = JsonSerializer.Serialize(record, SerializerOptions);
        File.WriteAllText(filePath, json);

        return filePath;
    }

    /// <summary>
    /// Returns the file path that <see cref="Write"/> would produce for the given inputs,
    /// without creating any files or directories.
    /// </summary>
    public static string GetFilePath(string outputRoot, string network, string contractName)
        => Path.Combine(outputRoot, network, $"{contractName}.json");
}
