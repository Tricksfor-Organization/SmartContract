namespace Tricksfor.Blockchain.Booster.Deploy;

/// <summary>
/// Outcome of a single post-deploy sanity check assertion.
/// </summary>
/// <param name="Label">Human-readable name of the check (e.g. "NFT name()").</param>
/// <param name="Passed">True when the on-chain value matches the expected value.</param>
/// <param name="Expected">The value that was expected.</param>
/// <param name="Actual">The value that was read from the chain.</param>
public record SanityCheckResult(string Label, bool Passed, string Expected, string Actual);
