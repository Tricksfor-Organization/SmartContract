# Contract Verification Troubleshooting

This guide matches the current reusable protected deployment workflow. For end-to-end operating
instructions, see the [Deployment Operator Runbook](deployment.md).

## 1. How verification currently works

When GitHub Environment variable `VERIFY_ENABLED` is the exact string `true`, the reusable
deployment job:

1. reads both addresses and constructor arguments from the environment manifests;
2. uses the same Hardhat production build information that generated the Nethereum bytecode;
3. runs `npx hardhat verify --build-profile production` for the NFT;
4. runs the same command for staking;
5. writes raw output to `nft-verification.txt` and `staking-verification.txt`.

Verification is a step in the deployment job, not a separate `verify-contracts` job. It is currently
blocking: if NFT verification fails, staking verification, smoke, summary, and successful release
attachment do not run.

The final artifact upload uses `if: always()` and should retain `deployments/{environment}/` even
after a verification failure.

## 2. First response to a verification failure

1. Record the workflow run URL and failed command output.
2. Download `deployment-{environment}-{run-id}`.
3. Confirm both manifests exist and record both contract addresses.
4. Check both transaction receipts on the appropriate explorer/RPC.
5. Confirm runtime bytecode exists at both addresses.
6. Do not use `force`; the contracts do not need replacement merely because verification failed.
7. Correct the verification configuration or wait for the explorer to recover.
8. Rerun the failed deployment job with the same environment and `force=false`.

The deployment runner will reuse manifest addresses only when live bytecode exists. The rerun then
attempts verification again before continuing to smoke and artifact publication.

## 3. Required configuration

Under **Settings → Environments → {environment}**:

| Value              | Type     | Requirement                           |
| ------------------ | -------- | ------------------------------------- |
| `EXPLORER_API_KEY` | Secret   | Valid Etherscan API V2-compatible key |
| `NETWORK_KEY`      | Variable | Exact Hardhat network key             |
| `VERIFY_ENABLED`   | Variable | Exact lowercase `true`                |
| `RPC_URL`          | Secret   | Endpoint for the same chain           |

| Environment         | `NETWORK_KEY`      |
| ------------------- | ------------------ |
| `ethereum-sepolia`  | `sepolia`          |
| `ethereum-mainnet`  | `mainnet`          |
| `polygon-amoy`      | `polygon_amoy`     |
| `polygon-mainnet`   | `polygon`          |
| `optimism-sepolia`  | `optimism_sepolia` |
| `optimism-mainnet`  | `optimism`         |
| `bsc-testnet`       | `bsc_testnet`      |
| `bsc-mainnet`       | `bsc`              |
| `avalanche-fuji`    | `avalanche_fuji`   |
| `avalanche-mainnet` | `avalanche`        |

## 4. Common failures

### Invalid or missing API key

Symptoms include `Invalid API Key`, `API key is required`, or authorization errors.

1. Confirm `VERIFY_ENABLED=true` in the selected environment.
2. Replace `EXPLORER_API_KEY` with the approved key.
3. Confirm the key supports Etherscan API V2 and the intended chain.
4. Rerun the deployment with `force=false`.

### Unknown network

The selected `NETWORK_KEY` does not match `hardhat.config.ts`.

1. Compare the value with the table above.
2. Correct the GitHub Environment variable.
3. Rerun with `force=false`.

### Chain or RPC mismatch

If Hardhat connects to the wrong chain or cannot connect:

1. Check `RPC_URL` in the selected environment.
2. Query its chain ID without printing the secret URL.
3. Compare it to the checked-in deployment configuration.
4. Correct the secret and rerun with `force=false`.

### Constructor argument mismatch

Verification must use the exact constructor arguments recorded in each manifest, in order. Do not
reconstruct or normalize them manually. Confirm that the manifest came from the same source commit
and contract deployment.

### Bytecode/compiler mismatch

1. Check out the exact `sourceCommit` recorded in the manifest.
2. Use Node.js 22 and `npm ci`.
3. Run `npm run artifacts:check`.
4. Confirm Solidity 0.8.26, optimizer enabled with 200 runs, and Cancun EVM settings.
5. Verify with `--build-profile production`.

If artifact sync fails at the recorded commit, preserve the evidence and do not guess at compiler
settings.

### Explorer outage or rate limit

Wait for the provider to recover, then rerun with `force=false`. A temporary verification outage is
not a reason to redeploy contracts.

### Already verified

Confirm the explorer shows the expected contract at the manifest address with matching constructor
arguments. Treat an already-verified response as success only after that comparison.

### NFT verification succeeds and staking verification fails

Because the commands run sequentially, this state is possible. Correct the staking failure and
rerun with `force=false`; NFT verification should be idempotent.

## 5. Manual verification

Use manual verification only from the exact source revision recorded in the deployment manifest.
This does not update GitHub workflow artifacts automatically.

```bash
npm ci
npm run compile

export RPC_URL='<target-rpc-url>'
export ETHERSCAN_API_KEY='<explorer-api-key>'
export NETWORK_KEY='<hardhat-network-key>'
export DEPLOY_ENV='<github-environment-name>'

nft_manifest="deployments/$DEPLOY_ENV/TricksforBoosterNFT.json"
staking_manifest="deployments/$DEPLOY_ENV/TricksforBoosterStaking.json"

nft_address="$(jq -r .address "$nft_manifest")"
staking_address="$(jq -r .address "$staking_manifest")"
mapfile -t nft_args < <(jq -r '.constructorArgs[]' "$nft_manifest")
mapfile -t staking_args < <(jq -r '.constructorArgs[]' "$staking_manifest")

npx hardhat verify --build-profile production \
  --network "$NETWORK_KEY" "$nft_address" "${nft_args[@]}"

npx hardhat verify --build-profile production \
  --network "$NETWORK_KEY" "$staking_address" "${staking_args[@]}"
```

After manual verification:

1. save both command transcripts;
2. record the explorer contract URLs;
3. associate the transcripts with the deployment manifest and source commit;
4. attach them to the GitHub Release for mainnet;
5. rerun the protected workflow with `force=false` if smoke and workflow records still need to finish.

## 6. Disabling verification

Setting `VERIFY_ENABLED` to anything other than exact lowercase `true` skips verification. This may
be acceptable for an isolated test, but it should be an explicit reviewed decision. Mainnet should
not be considered complete until both contracts are verified from synchronized production build
information.

## 7. Preserved evidence

Keep these together:

- both deployment manifests;
- `nft-verification.txt`;
- `staking-verification.txt`;
- workflow run URL and source commit;
- explorer URLs;
- manual transcripts, if used;
- `smoke-result.json`, once the post-verification smoke completes.
