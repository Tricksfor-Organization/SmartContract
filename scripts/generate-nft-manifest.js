#!/usr/bin/env node
'use strict';

/**
 * generate-nft-manifest.js
 *
 * Generates an authoritative chain-specific NFT asset manifest from the token
 * allocation rules defined in docs/nft-token-allocation-spec.md.
 *
 * The output manifest is written to:
 *   deployments/config/<env>/nft-manifest.json
 *
 * All 600 token entries are emitted (IDs 1–600) in the deterministic order:
 *   theme (coin → dice → rps) → tier (2x → 3x → 5x) → option (canonical order)
 *
 * Usage:
 *   node scripts/generate-nft-manifest.js [options]
 *
 * Options:
 *   --env <env>           Deployment environment name (required unless --all-mainnet or --all-testnet)
 *                         Selects chain config and writes to deployments/config/<env>/nft-manifest.json
 *   --all-mainnet         Generate manifests for all 5 mainnet environments
 *   --all-testnet         Generate manifests for all 5 testnet environments
 *   --all                 Generate manifests for all 10 environments
 *   --force               Overwrite existing nft-manifest.json files (default: error if file exists)
 *   --dry-run             Print manifest to stdout without writing any files
 *   --deployments <path>  Path to deployments directory (default: ./deployments)
 *
 * Exit codes:
 *   0 — manifest(s) generated successfully
 *   1 — one or more errors prevented generation
 *
 * See docs/nft-metadata-generation.md for the full documentation.
 */

const fs   = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Token allocation constants (from docs/nft-token-allocation-spec.md)
// ---------------------------------------------------------------------------

/**
 * Theme definitions in canonical order (coin → dice → rps).
 * Each entry: [themeId, options[], displayName]
 */
const THEMES = [
  { id: 'coin', options: ['heads', 'tails'],                      display: 'Coin' },
  { id: 'dice', options: ['1', '2', '3', '4', '5', '6'],          display: 'Dice' },
  { id: 'rps',  options: ['rock', 'paper', 'scissors'],           display: 'Rock Paper Scissors' },
];

/**
 * Tier definitions in canonical order (2x → 3x → 5x).
 * Each entry: [tierId, tierCount per theme]
 * Counts: 2x=100, 3x=70, 5x=30 (total 200 per theme × 3 themes = 600)
 */
const TIERS = [
  { id: '2x', count: 100, display: '2x Booster' },
  { id: '3x', count:  70, display: '3x Booster' },
  { id: '5x', count:  30, display: '5x Booster' },
];

/** Maps manifest variant identifier → metadata Option attribute value */
const VARIANT_TO_OPTION = {
  heads: 'Heads', tails: 'Tails',
  '1': '1', '2': '2', '3': '3', '4': '4', '5': '5', '6': '6',
  rock: 'Rock', paper: 'Paper', scissors: 'Scissors',
};

// ---------------------------------------------------------------------------
// Chain configuration table
// ---------------------------------------------------------------------------

/**
 * Configuration for every supported deployment environment.
 * domain: the Cloudflare Pages hostname used to construct base URIs.
 */
const ENV_CONFIGS = {
  'ethereum-mainnet': {
    chain:    'Ethereum',
    chainKey: 'ethereum',
    network:  'ethereum-mainnet',
    domain:   'nft.tricksfor.com',
  },
  'ethereum-sepolia': {
    chain:    'Ethereum',
    chainKey: 'ethereum',
    network:  'ethereum-sepolia',
    domain:   'nft-preview.tricksfor.com',
  },
  'polygon-mainnet': {
    chain:    'Polygon',
    chainKey: 'polygon',
    network:  'polygon-mainnet',
    domain:   'nft.tricksfor.com',
  },
  'polygon-amoy': {
    chain:    'Polygon',
    chainKey: 'polygon',
    network:  'polygon-amoy',
    domain:   'nft-preview.tricksfor.com',
  },
  'bsc-mainnet': {
    chain:    'BNB Smart Chain',
    chainKey: 'bsc',
    network:  'bsc-mainnet',
    domain:   'nft.tricksfor.com',
  },
  'bsc-testnet': {
    chain:    'BNB Smart Chain',
    chainKey: 'bsc',
    network:  'bsc-testnet',
    domain:   'nft-preview.tricksfor.com',
  },
  'avalanche-mainnet': {
    chain:    'Avalanche',
    chainKey: 'avalanche',
    network:  'avalanche-mainnet',
    domain:   'nft.tricksfor.com',
  },
  'avalanche-fuji': {
    chain:    'Avalanche',
    chainKey: 'avalanche',
    network:  'avalanche-fuji',
    domain:   'nft-preview.tricksfor.com',
  },
  'optimism-mainnet': {
    chain:    'Optimism',
    chainKey: 'optimism',
    network:  'optimism-mainnet',
    domain:   'nft.tricksfor.com',
  },
  'optimism-sepolia': {
    chain:    'Optimism',
    chainKey: 'optimism',
    network:  'optimism-sepolia',
    domain:   'nft-preview.tricksfor.com',
  },
};

const ALL_MAINNET_ENVS = [
  'ethereum-mainnet',
  'polygon-mainnet',
  'bsc-mainnet',
  'avalanche-mainnet',
  'optimism-mainnet',
];

const ALL_TESTNET_ENVS = [
  'ethereum-sepolia',
  'polygon-amoy',
  'bsc-testnet',
  'avalanche-fuji',
  'optimism-sepolia',
];

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = {
    env:         null,
    allMainnet:  false,
    allTestnet:  false,
    all:         false,
    force:       false,
    dryRun:      false,
    deployments: './deployments',
  };

  for (let i = 2; i < argv.length; i++) {
    const flag = argv[i];
    const next = argv[i + 1];
    if      (flag === '--env'          && next) { args.env         = next; i++; }
    else if (flag === '--deployments'  && next) { args.deployments = next; i++; }
    else if (flag === '--all-mainnet')          { args.allMainnet  = true; }
    else if (flag === '--all-testnet')          { args.allTestnet  = true; }
    else if (flag === '--all')                  { args.all         = true; }
    else if (flag === '--force')                { args.force       = true; }
    else if (flag === '--dry-run')              { args.dryRun      = true; }
    else {
      console.error(`Unknown argument: ${flag}`);
      process.exit(1);
    }
  }
  return args;
}

function resolveEnvList(args) {
  if (args.all)        return [...ALL_MAINNET_ENVS, ...ALL_TESTNET_ENVS];
  if (args.allMainnet) return ALL_MAINNET_ENVS;
  if (args.allTestnet) return ALL_TESTNET_ENVS;
  if (args.env)        return [args.env];

  console.error(
    'Error: specify --env <env>, --all-mainnet, --all-testnet, or --all.\n' +
    `  Known environments: ${Object.keys(ENV_CONFIGS).join(', ')}`
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Token allocation algorithm (docs/nft-token-allocation-spec.md § 10)
// ---------------------------------------------------------------------------

/**
 * Generates the full token entries array for a chain using the deterministic
 * allocation algorithm from the token allocation spec.
 *
 * @param {string} chainKey - Chain identifier (e.g. 'ethereum')
 * @returns {object[]}      - Array of 600 token entry objects
 */
function generateTokenEntries(chainKey) {
  const tokens = [];
  let nextId   = 1;

  for (const theme of THEMES) {
    for (const tier of TIERS) {
      const optionCount = theme.options.length;
      const base        = Math.floor(tier.count / optionCount);
      const remainder   = tier.count % optionCount;

      for (let i = 0; i < theme.options.length; i++) {
        const variant = theme.options[i];
        const count   = base + (i < remainder ? 1 : 0);
        const option  = VARIANT_TO_OPTION[variant];

        for (let j = 0; j < count; j++) {
          const tokenId     = nextId++;
          const displayName = `Tricksfor ${theme.display} ${option} ${tier.id} Booster #${tokenId}`;
          const sourceImage = `${theme.id}-${variant}-${tier.id}.png`;

          tokens.push({
            tokenId,
            chainKey,
            theme:             theme.id,
            variant,
            option,
            tier:              tier.id,
            multiplierDisplay: tier.display,
            displayName,
            sourceImage,
            imagePath:    `images/${tokenId}.png`,
            metadataPath: `metadata/${tokenId}.json`,
          });
        }
      }
    }
  }

  return tokens;
}

// ---------------------------------------------------------------------------
// Manifest builder
// ---------------------------------------------------------------------------

/**
 * Builds the full authoritative manifest object for a deployment environment.
 *
 * @param {string} env        - Deployment environment name
 * @param {object} envConfig  - Entry from ENV_CONFIGS
 * @returns {object}          - Complete manifest ready for JSON serialization
 */
function buildManifest(env, envConfig) {
  const { chain, chainKey, network, domain } = envConfig;

  const baseImageUri    = `https://${domain}/${chainKey}/images/`;
  const baseMetadataUri = `https://${domain}/${chainKey}/metadata/`;

  const tokens = generateTokenEntries(chainKey);

  return {
    manifestVersion:     '1.0',
    collectionName:      'Tricksfor Booster NFT',
    chain,
    chainKey,
    network,
    contract:            '0x0000000000000000000000000000000000000000',
    edition:             'Genesis',
    baseImageUri,
    baseMetadataUri,
    descriptionTemplate: 'A Tricksfor Booster NFT. Stake this NFT to activate a reward boost during gameplay. An unstaked Booster confers no in-game advantage.',
    supply: {
      coin:  200,
      dice:  200,
      rps:   200,
      total: 600,
    },
    tokens,
  };
}

// ---------------------------------------------------------------------------
// File writing
// ---------------------------------------------------------------------------

function writeManifest(env, manifest, deploymentsDir, opts) {
  const { dryRun, force } = opts;
  const outPath = path.resolve(deploymentsDir, 'config', env, 'nft-manifest.json');

  if (!dryRun && !force && fs.existsSync(outPath)) {
    throw new Error(`File already exists (use --force to overwrite): ${outPath}`);
  }

  const json = JSON.stringify(manifest, null, 2);

  if (dryRun) {
    console.log(`[dry-run] would write ${outPath} (${json.length} bytes, ${manifest.tokens.length} tokens)`);
  } else {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, json + '\n', 'utf-8');
    console.log(`✓ wrote ${outPath} (${manifest.tokens.length} tokens)`);
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

function main() {
  const args         = parseArgs(process.argv);
  const envList      = resolveEnvList(args);
  const deploymentsDir = path.resolve(args.deployments);

  const opts = { dryRun: args.dryRun, force: args.force };

  let errCount = 0;

  for (const env of envList) {
    const envConfig = ENV_CONFIGS[env];
    if (!envConfig) {
      console.error(`✗ Unknown environment: ${env}`);
      console.error(`  Known environments: ${Object.keys(ENV_CONFIGS).join(', ')}`);
      errCount++;
      continue;
    }

    console.log(`\nGenerating manifest for: ${env} (chainKey: ${envConfig.chainKey})`);
    try {
      const manifest = buildManifest(env, envConfig);
      writeManifest(env, manifest, deploymentsDir, opts);
    } catch (e) {
      console.error(`✗ ${env}: ${e.message}`);
      errCount++;
    }
  }

  if (errCount > 0) {
    console.error(`\nGeneration completed with ${errCount} error(s).`);
    process.exit(1);
  }

  const label = args.dryRun ? 'Dry-run complete' : 'Done';
  console.log(`\n${label}. Generated ${envList.length} manifest(s).`);
}

main();
