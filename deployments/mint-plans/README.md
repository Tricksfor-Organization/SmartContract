# Mint plans

Bulk minting is intentionally separate from deployment. A plan must be reviewed and committed
before the protected `mint-mainnet.yml` workflow can execute it. Token IDs are explicit, positive,
and unique; there is no on-chain supply cap, so the documented 600-token allocation remains an
off-chain release policy.

```json
{
  "items": [
    { "tokenId": 1, "recipient": "0x1111111111111111111111111111111111111111" }
  ]
}
```

Run a read-only validation first:

```bash
Deployment__MintPlanPath=deployments/mint-plans/example.json \
dotnet run --project src/Tricksfor.Blockchain.Booster.Deploy -- mint --dry-run
```

The runner is resumable: already-minted entries are skipped only when their current owner matches
the plan. Any ownership mismatch aborts the run.
