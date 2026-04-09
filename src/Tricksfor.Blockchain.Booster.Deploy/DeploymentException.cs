namespace Tricksfor.Blockchain.Booster.Deploy;

/// <summary>
/// Thrown when a deployment step fails with a known, actionable error.
/// </summary>
public sealed class DeploymentException : Exception
{
    public DeploymentException(string message) : base(message) { }
    public DeploymentException(string message, Exception inner) : base(message, inner) { }
}
