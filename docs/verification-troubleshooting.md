# Contract Verification Troubleshooting

This guide covers failure scenarios for the `verify-contracts` job in the release deployment workflow and explains how to recover without redeploying.

For the full verification design, see [`docs/release-deployment-architecture.md`](release-deployment-architecture.md#7-verification-model).

---

## How Verification Works

After a successful `deploy-contracts` job, the `verify-contracts` job:

1. Checks whether `VERIFY_ENABLED=true` is set in the target GitHub Environment. If not, the job exits early (green).
2. Downloads the deployment manifests produced by `deploy-contracts`.
3. Runs `hardhat verify --no-compile --network {NETWORK_KEY}` for both contracts.
4. Writes verification outcome (status, explorer name, explorer URL) back into each manifest.
5. Uploads updated manifests and raw verification transcripts as workflow artifacts.

Each contract is verified independently — if one fails the other is still attempted.

The `verify-contracts` job is **non-blocking**: it does not roll back the deployment, and dependent jobs are not blocked by a verification failure.

---

## Retained Artifacts

When verification runs (`VERIFY_ENABLED=true`), these verification artifacts are uploaded regardless of whether verification succeeds or fails:

| Artifact name | Contents | Retention |
|---|---|---|
| `verify-transcript-{env}-{tag}` | Raw stdout/stderr from both `hardhat verify` runs | 30 days |
| `verify-manifests-{env}-{tag}` | Deployment manifests updated with `verification.*` fields | 90 days |

The original deployment manifests are uploaded by the `deploy-contracts` job unconditionally:

| Artifact name | Contents | Retention |
|---|---|---|
| `deployment-manifests-{env}-{tag}` | Original manifests from the `deploy-contracts` job | 90 days |

---

## Common Failure Scenarios

### Verification failed with "Invalid API Key"

**Symptom:** `hardhat verify` exits with an error like `Invalid API Key` or `API key is required`.

**Cause:** `EXPLORER_API_KEY` is missing or incorrect in the target GitHub Environment.

**Resolution:**
1. Navigate to **Settings → Environments → {env-name} → Secrets**.
2. Create or update the `EXPLORER_API_KEY` secret with a valid API key for the target explorer.
3. Re-run the `verify-contracts` job: open the failed workflow run → **Re-run failed jobs → verify-contracts**.

---

### Verification failed with "Contract source code already verified"

**Symptom:** `hardhat verify` exits with a message like `Already verified`.

**Behavior:** This is not a real error. The contract is already verified on the explorer. The workflow step treats it as success (hardhat verify exits 0 for this case). No action needed.

---

### Explorer API temporarily unavailable

**Symptom:** `hardhat verify` times out or returns a 5xx/503 response.

**Cause:** The block explorer API is experiencing an outage or elevated latency.

**Resolution:**
1. Check the explorer's status page:
   - Etherscan: https://etherscan.statuspage.io
   - PolygonScan: https://polygonscan.statuspage.io
   - BscScan: https://bscscan.statuspage.io
   - Snowtrace: https://snowtrace.statuspage.io
2. Once the explorer recovers, re-run only the `verify-contracts` job in the failed workflow run.

---

### One contract verified, one did not

**Symptom:** One verify step shows green, the other shows red in the workflow UI.

**Behavior:** Both contracts are verified independently (`continue-on-error: true` on each step). A partial success is recorded in the manifests — the verified contract gets `"status": "verified"`, the failed one gets `"status": "failed"`.

**Resolution:**
- Fix the root cause for the failed contract (API key, explorer outage, etc.).
- Re-run the `verify-contracts` job. Both contracts will be re-attempted; already-verified contracts will receive the "Already verified" response and be treated as success.

---

### VERIFY_ENABLED is not set

**Symptom:** The `verify-contracts` job exits early with the message "Verification is disabled…" and shows yellow/skipped steps.

**Cause:** The `VERIFY_ENABLED` environment variable is either unset or not set to `true` in the target GitHub Environment.

**Resolution:**
1. Navigate to **Settings → Environments → {env-name} → Variables**.
2. Add `VERIFY_ENABLED` with value `true`.
3. Re-trigger verification by re-running the `verify-contracts` job.

---

### NETWORK_KEY is missing or wrong

**Symptom:** `hardhat verify` fails with an error like `Unknown network` or a connection error to localhost.

**Cause:** The `NETWORK_KEY` variable is not set, or its value doesn't match a configured Hardhat network name.

**Resolution:**
1. Check the correct `NETWORK_KEY` for the target environment in the table below.
2. Navigate to **Settings → Environments → {env-name} → Variables**.
3. Set `NETWORK_KEY` to the correct value.
4. Re-run the `verify-contracts` job.

See [`docs/github-environments-setup.md`](github-environments-setup.md#network_key-values-per-environment) for the full variable table including `EXPLORER_NAME` and `EXPLORER_BASE_URL` values.

| Environment name    | `NETWORK_KEY` value |
|---------------------|---------------------|
| `ethereum-sepolia`  | `sepolia`           |
| `ethereum-mainnet`  | `mainnet`           |
| `polygon-amoy`      | `polygon_amoy`      |
| `polygon-mainnet`   | `polygon`           |
| `optimism-sepolia`  | `optimism_sepolia`  |
| `optimism-mainnet`  | `optimism`          |
| `bsc-testnet`       | `bsc_testnet`       |
| `bsc-mainnet`       | `bsc`               |
| `avalanche-fuji`    | `avalanche_fuji`    |
| `avalanche-mainnet` | `avalanche`         |

---

### Manifest not updated with verification status

**Symptom:** The downloaded `verify-manifests-*` artifact does not contain a `verification` key.

**Cause:** The "Write verification status to manifests" step failed or was skipped (e.g. the manifest file was not found in the expected location).

**Behavior:** This does not affect whether the contract is actually verified on-chain. The `verify-transcript-*` artifact still contains the raw verification output and is the authoritative log.

**Resolution:**
- Check the transcript artifact for the actual `hardhat verify` output.
- If the contract is verified, the absence of the `verification` field in the manifest is cosmetic only.

---

## Manual Verification

If automated verification cannot be retried (e.g. the workflow run has expired), you can verify manually:

```bash
# Install dependencies
npm ci

# Set secrets
export RPC_URL="<rpc-url>"
export ETHERSCAN_API_KEY="<explorer-api-key>"

# Verify (replace values with those from the deployment manifest)
./node_modules/.bin/hardhat verify --no-compile \
  --network <NETWORK_KEY> \
  <CONTRACT_ADDRESS> \
  [CONSTRUCTOR_ARG_1] [CONSTRUCTOR_ARG_2] ...
```

Constructor arguments are stored in the deployment manifest at `deployments/{env}/{ContractName}.json` under the `constructorArgs` array.

---

## Deployment Manifest Verification Section

After verification runs, each contract's manifest is updated with a `verification` object. The field values come from GitHub Environment variables set per deployment target:

- `chainTarget` is the GitHub Environment name (`DEPLOY_ENV`), e.g. `polygon-mainnet`, uniquely identifying the deployment target.
- `explorerName` and `explorerUrl` are populated from the optional `EXPLORER_NAME` and `EXPLORER_BASE_URL` environment variables. They are empty strings if those variables are not configured.

**Example — `polygon-mainnet` environment:**

```json
{
  "contractName": "TricksforBoosterNFT",
  "address": "0x...",
  "transactionHash": "0x...",
  "blockNumber": 12345678,
  "deployedAt": "2025-01-01T00:00:00Z",
  "constructorArgs": [],
  "verification": {
    "explorerName": "PolygonScan",
    "chainTarget": "polygon-mainnet",
    "explorerUrl": "https://polygonscan.com/address/0x...",
    "status": "verified",
    "verifiedAt": "2025-01-01T00:01:00Z"
  }
}
```

**Example — `ethereum-mainnet` environment:**

```json
{
  "contractName": "TricksforBoosterNFT",
  "address": "0x...",
  "transactionHash": "0x...",
  "blockNumber": 12345678,
  "deployedAt": "2025-01-01T00:00:00Z",
  "constructorArgs": [],
  "verification": {
    "explorerName": "Etherscan",
    "chainTarget": "ethereum-mainnet",
    "explorerUrl": "https://etherscan.io/address/0x...",
    "status": "verified",
    "verifiedAt": "2025-01-01T00:01:00Z"
  }
}
```

Possible `status` values:

| Value | Meaning |
|---|---|
| `verified` | `hardhat verify` exited 0 (verified or already verified) |
| `failed` | `hardhat verify` exited non-zero |
| `unknown` | Step outcome could not be determined |
