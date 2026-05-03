#!/usr/bin/env node
'use strict';

/**
 * generate-nft-metadata.js
 *
 * Generates static NFT token metadata and collection metadata for one or more chains
 * from the approved token allocation rules, naming templates, and metadata schema.
 *
 * Output tree (under nft-assets/generated/):
 *
 *   {outputDir}/{chainKey}/metadata/{tokenId}.json   ← token metadata (IDs 1–600)
 *   {outputDir}/{chainKey}/contract/collection.json  ← collection metadata
 *
 * URL conventions after deployment (with BASE_DOMAIN = nft.tricksfor.com):
 *
 *   https://nft.tricksfor.com/{chainKey}/metadata/{tokenId}       (on-chain tokenURI)
 *   https://nft.tricksfor.com/{chainKey}/metadata/{tokenId}.json  (direct file)
 *   https://nft.tricksfor.com/{chainKey}/contract/collection.json
 *
 * The generated directory is self-contained and deployable to Cloudflare Pages
 * when the Pages project build directory is set to nft-assets/generated/.
 *
 * Usage:
 *   node scripts/generate-nft-metadata.js [options]
 *
 * Options:
 *   --chain <chainKey>    Generate for a single chain (ethereum|polygon|bsc|avalanche|optimism)
 *   --all-mainnet         Generate for all 5 mainnet chains
 *   --all                 Alias for --all-mainnet
 *   --manifest <path>     Load chain config from an approved manifest file (overrides --chain)
 *   --output <path>       Output root directory (default: ./nft-assets/generated)
 *   --theme <themeId>     Restrict output to a single theme (coin|dice|rps); token IDs still
 *                         follow full-collection ordering so they remain globally consistent
 *   --dry-run             Print what would be written without creating any files
 *   --force               Overwrite existing output files (default: error if files exist)
 *
 * Exit codes:
 *   0 — generation completed successfully
 *   1 — one or more errors prevented generation
 *
 * See docs/nft-metadata-generation.md for full documentation.
 */

const fs   = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Vocabulary tables (single source of truth — mirrors generate-nft-assets.js)
// ---------------------------------------------------------------------------

/** Maps manifest theme identifier → metadata Game attribute value */
const THEME_TO_GAME = {
  coin: 'Coin',
  dice: 'Dice',
  rps:  'Rock Paper Scissors',
};

/** Maps manifest variant identifier → metadata Option attribute value */
const VARIANT_TO_OPTION = {
  heads: 'Heads', tails: 'Tails',
  '1': '1', '2': '2', '3': '3', '4': '4', '5': '5', '6': '6',
  rock: 'Rock', paper: 'Paper', scissors: 'Scissors',
};

/** Maps tier identifier → Booster attribute value */
const TIER_TO_BOOSTER = {
  '2x': '2x Booster',
  '3x': '3x Booster',
  '5x': '5x Booster',
};

/** Maps chainKey → Chain metadata attribute value */
const CHAINKEY_TO_CHAIN_ATTRIBUTE = {
  ethereum:  'Ethereum',
  polygon:   'Polygon',
  bsc:       'BNB Chain',
  avalanche: 'Avalanche',
  optimism:  'Optimism',
};

/** Maps chainKey → collection display name */
const CHAINKEY_TO_COLLECTION_NAME = {
  ethereum:  'Tricksfor Boosters - Ethereum',
  polygon:   'Tricksfor Boosters - Polygon',
  bsc:       'Tricksfor Boosters - BSC',
  avalanche: 'Tricksfor Boosters - Avalanche',
  optimism:  'Tricksfor Boosters - Optimism',
};

/** Collection description used in collection.json */
const COLLECTION_DESCRIPTION =
  'Tricksfor Booster NFTs are in-game items that activate a reward boost when staked. ' +
  'Stake your Booster to earn enhanced rewards during gameplay.';

/** Placeholder fee recipient — must be replaced before mainnet publishing. */
const PLACEHOLDER_FEE_RECIPIENT = '0x000000000000000000000000000000000000dEaD';

// ---------------------------------------------------------------------------
// Token allocation constants (docs/nft-token-allocation-spec.md)
// ---------------------------------------------------------------------------

/**
 * Theme definitions in canonical order (coin → dice → rps).
 */
const THEMES = [
  { id: 'coin', options: ['heads', 'tails'],              display: 'Coin' },
  { id: 'dice', options: ['1', '2', '3', '4', '5', '6'], display: 'Dice' },
  { id: 'rps',  options: ['rock', 'paper', 'scissors'],  display: 'Rock Paper Scissors' },
];

/**
 * Tier definitions in canonical order (2x → 3x → 5x).
 * Counts: 2x=100, 3x=70, 5x=30 (total 200 per theme × 3 themes = 600)
 */
const TIERS = [
  { id: '2x', count: 100 },
  { id: '3x', count:  70 },
  { id: '5x', count:  30 },
];

// ---------------------------------------------------------------------------
// Chain configuration table
// ---------------------------------------------------------------------------

/**
 * Configuration for every supported mainnet chain.
 * domain: the Cloudflare Pages hostname used to construct base URIs.
 */
const CHAIN_CONFIGS = {
  ethereum: {
    chain:    'Ethereum',
    chainKey: 'ethereum',
    domain:   'nft.tricksfor.com',
  },
  polygon: {
    chain:    'Polygon',
    chainKey: 'polygon',
    domain:   'nft.tricksfor.com',
  },
  bsc: {
    chain:    'BNB Smart Chain',
    chainKey: 'bsc',
    domain:   'nft.tricksfor.com',
  },
  avalanche: {
    chain:    'Avalanche',
    chainKey: 'avalanche',
    domain:   'nft.tricksfor.com',
  },
  optimism: {
    chain:    'Optimism',
    chainKey: 'optimism',
    domain:   'nft.tricksfor.com',
  },
};

const ALL_MAINNET_CHAINS = ['ethereum', 'polygon', 'bsc', 'avalanche', 'optimism'];

/** Safe characters for chainKey: no path separators or shell special chars. */
const VALID_CHAIN_KEY_RE = /^[a-z0-9-]+$/;

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = {
    chain:      null,
    allMainnet: false,
    manifest:   null,
    output:     './nft-assets/generated',
    theme:      null,
    dryRun:     false,
    force:      false,
  };

  for (let i = 2; i < argv.length; i++) {
    const flag = argv[i];
    const next = argv[i + 1];
    if      (flag === '--chain'     && next) { args.chain      = next; i++; }
    else if (flag === '--manifest'  && next) { args.manifest   = next; i++; }
    else if (flag === '--output'    && next) { args.output     = next; i++; }
    else if (flag === '--theme'     && next) { args.theme      = next; i++; }
    else if (flag === '--all-mainnet')       { args.allMainnet = true; }
    else if (flag === '--all')               { args.allMainnet = true; }
    else if (flag === '--dry-run')           { args.dryRun     = true; }
    else if (flag === '--force')             { args.force      = true; }
    else {
      console.error(`Unknown argument: ${flag}`);
      process.exit(1);
    }
  }
  return args;
}

/**
 * Returns the list of chain configs to process based on parsed arguments.
 * @param {object} args - Parsed arguments
 * @returns {object[]}  - Array of chain config objects
 */
function resolveChainList(args) {
  if (args.manifest) {
    const manifest = loadManifest(path.resolve(args.manifest));
    const chainKey = manifest.chainKey;
    if (!chainKey || !VALID_CHAIN_KEY_RE.test(chainKey)) {
      console.error(`Error: manifest "chainKey" is missing or invalid: "${chainKey}"`);
      process.exit(1);
    }
    const domain = manifest.baseImageUri
      ? manifest.baseImageUri.replace(/^https?:\/\//, '').replace(/\/.*$/, '')
      : 'nft.tricksfor.com';
    return [{
      chain:    manifest.chain || chainKey,
      chainKey,
      domain,
    }];
  }

  if (args.allMainnet) {
    return ALL_MAINNET_CHAINS.map(k => CHAIN_CONFIGS[k]);
  }

  if (args.chain) {
    const cfg = CHAIN_CONFIGS[args.chain];
    if (!cfg) {
      console.error(`Error: unknown chain "${args.chain}". Known chains: ${ALL_MAINNET_CHAINS.join(', ')}`);
      process.exit(1);
    }
    return [cfg];
  }

  console.error(
    'Error: specify --chain <chainKey>, --all-mainnet, --all, or --manifest <path>.\n' +
    `  Known chains: ${ALL_MAINNET_CHAINS.join(', ')}`
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Manifest loading (for --manifest mode)
// ---------------------------------------------------------------------------

function loadManifest(manifestPath) {
  if (!fs.existsSync(manifestPath)) {
    console.error(`Error: manifest not found: ${manifestPath}`);
    process.exit(1);
  }
  try {
    return JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  } catch (e) {
    console.error(`Error: invalid JSON in manifest: ${e.message}`);
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Token allocation algorithm (docs/nft-token-allocation-spec.md § 10)
// ---------------------------------------------------------------------------

/**
 * Generates the full 600-entry token array for a chain using the deterministic
 * allocation algorithm: theme (coin→dice→rps) → tier (2x→3x→5x) → option.
 *
 * @param {string}      chainKey    - Chain identifier (e.g. 'polygon')
 * @param {string|null} themeFilter - When set, only tokens belonging to this theme are returned;
 *                                    token IDs still follow full-collection ordering so they
 *                                    remain globally consistent.
 * @returns {object[]}              - Array of token entry objects
 */
function generateTokenEntries(chainKey, themeFilter = null) {
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
          if (!themeFilter || theme.id === themeFilter) {
            tokens.push({
              tokenId:  nextId,
              chainKey,
              theme:    theme.id,
              variant,
              option,
              tier:     tier.id,
            });
          }
          nextId++;
        }
      }
    }
  }

  return tokens;
}

// ---------------------------------------------------------------------------
// Description derivation (docs/nft-copy-spec.md § 5.1)
// ---------------------------------------------------------------------------

/**
 * Derives the per-token description from a token entry.
 *
 * Template (§ 5.1):
 *   "A Tricksfor {Game} Booster NFT for the {Option} outcome. Stake this NFT to activate a
 *    {multiplier} reward boost during eligible Tricksfor gameplay. An unstaked Booster
 *    confers no in-game advantage. Subject to platform rules."
 *
 * @param {object} token - Token entry object
 * @returns {string}
 */
function deriveDescription(token) {
  const game       = THEME_TO_GAME[token.theme];
  const optionVal  = VARIANT_TO_OPTION[token.variant];
  const multiplier = token.tier;

  return (
    `A Tricksfor ${game} Booster NFT for the ${optionVal} outcome. ` +
    `Stake this NFT to activate a ${multiplier} reward boost during eligible Tricksfor gameplay. ` +
    `An unstaked Booster confers no in-game advantage. Subject to platform rules.`
  );
}

// ---------------------------------------------------------------------------
// Token metadata builder (docs/nft-metadata-schema.md)
// ---------------------------------------------------------------------------

/**
 * Builds a single token metadata JSON object.
 *
 * @param {object} token         - Token entry from generateTokenEntries()
 * @param {string} baseImageUri  - Base URL for token images (must end with '/')
 * @returns {object}             - Token metadata JSON (ready to serialise)
 */
function buildTokenMetadata(token, baseImageUri) {
  const { tokenId, theme, variant, tier, chainKey } = token;

  const game      = THEME_TO_GAME[theme];
  const option    = VARIANT_TO_OPTION[variant];
  const booster   = TIER_TO_BOOSTER[tier];
  const chainAttr = CHAINKEY_TO_CHAIN_ATTRIBUTE[chainKey];

  if (!game || !option || !booster) {
    throw new Error(`token ${tokenId}: unrecognised theme/variant/tier: ${theme}/${variant}/${tier}`);
  }

  const name        = `Tricksfor ${game} ${option} ${tier} Booster #${tokenId}`;
  const description = deriveDescription(token);
  const imageUrl    = `${baseImageUri}${tokenId}.png`;
  const externalUrl = `https://tricksfor.com/boosters/${tokenId}`;

  const attributes = [
    { trait_type: 'Game',       value: game    },
    { trait_type: 'Option',     value: option  },
    { trait_type: 'Booster',    value: booster },
    { trait_type: 'Multiplier', value: tier    },
  ];

  if (chainAttr) {
    attributes.push({ trait_type: 'Chain', value: chainAttr });
  }

  return { name, description, image: imageUrl, external_url: externalUrl, attributes };
}

// ---------------------------------------------------------------------------
// Collection metadata builder
// ---------------------------------------------------------------------------

/**
 * Builds the collection metadata JSON object (contractURI output).
 *
 * @param {string} chainKey      - Chain identifier
 * @param {string} baseImageUri  - Base URL for token images (must end with '/')
 * @returns {object}             - Collection metadata JSON (ready to serialise)
 */
function buildCollectionMetadata(chainKey, baseImageUri) {
  const name        = CHAINKEY_TO_COLLECTION_NAME[chainKey] || `Tricksfor Boosters - ${chainKey}`;
  const imageUrl    = `${baseImageUri}collection.png`;
  const externalLink = 'https://tricksfor.com/boosters';

  return {
    name,
    description:             COLLECTION_DESCRIPTION,
    image:                   imageUrl,
    external_link:           externalLink,
    seller_fee_basis_points: 500,
    fee_recipient:           PLACEHOLDER_FEE_RECIPIENT,
  };
}

// ---------------------------------------------------------------------------
// File writing helpers
// ---------------------------------------------------------------------------

function ensureDir(dirPath, dryRun) {
  if (!dryRun) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function writeJsonFile(filePath, data, dryRun, force) {
  if (!dryRun && !force && fs.existsSync(filePath)) {
    throw new Error(`File already exists (use --force to overwrite): ${filePath}`);
  }
  const json = JSON.stringify(data, null, 2);
  if (dryRun) {
    console.log(`  [dry-run] would write ${filePath} (${json.length} bytes)`);
  } else {
    fs.writeFileSync(filePath, json + '\n', 'utf-8');
    console.log(`  ✓ wrote ${filePath}`);
  }
}

// ---------------------------------------------------------------------------
// Cloudflare Pages support files
// ---------------------------------------------------------------------------

/** Cloudflare Pages _redirects content for the generated output directory. */
const GENERATED_REDIRECTS = `# Rewrite extensionless metadata requests to the corresponding .json file.
#
# The NFT contract uses the OpenZeppelin default tokenURI pattern:
#   tokenURI(id) = {baseURI}{id}    (no .json suffix)
#
# Static metadata files are named {tokenId}.json for clarity. This rewrite
# transparently serves the .json file for requests made without a suffix.

# Chain-specific paths (one collection per chain)
/ethereum/metadata/:id   /ethereum/metadata/:id.json   200
/polygon/metadata/:id    /polygon/metadata/:id.json    200
/optimism/metadata/:id   /optimism/metadata/:id.json   200
/bsc/metadata/:id        /bsc/metadata/:id.json        200
/avalanche/metadata/:id  /avalanche/metadata/:id.json  200
`;

/** Cloudflare Pages _headers content for the generated output directory. */
const GENERATED_HEADERS = `# Chain-specific paths (one collection per chain)
# /metadata/*.json — serve metadata JSON with correct content-type and CORS
/ethereum/metadata/*
  Content-Type: application/json; charset=utf-8
  Access-Control-Allow-Origin: *
  Cache-Control: public, max-age=3600

/polygon/metadata/*
  Content-Type: application/json; charset=utf-8
  Access-Control-Allow-Origin: *
  Cache-Control: public, max-age=3600

/optimism/metadata/*
  Content-Type: application/json; charset=utf-8
  Access-Control-Allow-Origin: *
  Cache-Control: public, max-age=3600

/bsc/metadata/*
  Content-Type: application/json; charset=utf-8
  Access-Control-Allow-Origin: *
  Cache-Control: public, max-age=3600

/avalanche/metadata/*
  Content-Type: application/json; charset=utf-8
  Access-Control-Allow-Origin: *
  Cache-Control: public, max-age=3600

# /contract/*.json — collection-level metadata (chain-specific)
/ethereum/contract/*
  Content-Type: application/json; charset=utf-8
  Access-Control-Allow-Origin: *
  Cache-Control: public, max-age=3600

/polygon/contract/*
  Content-Type: application/json; charset=utf-8
  Access-Control-Allow-Origin: *
  Cache-Control: public, max-age=3600

/optimism/contract/*
  Content-Type: application/json; charset=utf-8
  Access-Control-Allow-Origin: *
  Cache-Control: public, max-age=3600

/bsc/contract/*
  Content-Type: application/json; charset=utf-8
  Access-Control-Allow-Origin: *
  Cache-Control: public, max-age=3600

/avalanche/contract/*
  Content-Type: application/json; charset=utf-8
  Access-Control-Allow-Origin: *
  Cache-Control: public, max-age=3600
`;

/**
 * Writes _redirects and _headers into the output root directory if they do not
 * already exist (or when force is set).  These files are required for correct
 * Cloudflare Pages behaviour when the generated directory is used as the Pages
 * build output directory.
 *
 * @param {string}  outputDir - Resolved path to the generated output root
 * @param {boolean} dryRun
 * @param {boolean} force
 */
function writePagesConfig(outputDir, dryRun, force) {
  const files = [
    { name: '_redirects', content: GENERATED_REDIRECTS },
    { name: '_headers',   content: GENERATED_HEADERS   },
  ];

  for (const { name, content } of files) {
    const filePath = path.join(outputDir, name);
    if (!dryRun && !force && fs.existsSync(filePath)) {
      // Silently skip — these are shared files written once; don't fail per-chain runs.
      continue;
    }
    if (dryRun) {
      console.log(`  [dry-run] would write ${filePath}`);
    } else {
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log(`  ✓ wrote ${filePath}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Per-chain generation
// ---------------------------------------------------------------------------

/**
 * Generates token metadata files and the collection metadata file for one chain.
 * When themeFilter is set, only the tokens belonging to that theme are generated;
 * token IDs remain globally consistent with the full-collection ordering.
 *
 * @param {object}      chainConfig  - Entry from CHAIN_CONFIGS (chain, chainKey, domain)
 * @param {string}      outputDir    - Resolved path to the generated output root
 * @param {object}      opts         - { dryRun, force, themeFilter }
 * @returns {number}                 - Number of errors encountered
 */
function generateChain(chainConfig, outputDir, opts) {
  const { dryRun, force, themeFilter } = opts;
  const { chain, chainKey, domain } = chainConfig;

  const baseImageUri    = `https://${domain}/${chainKey}/images/`;
  const baseMetadataUri = `https://${domain}/${chainKey}/metadata/`;

  const chainDir    = path.join(outputDir, chainKey);
  const metadataDir = path.join(chainDir, 'metadata');
  const contractDir = path.join(chainDir, 'contract');

  const themeLabel = themeFilter ? ` (theme: ${themeFilter})` : '';
  console.log(`\nGenerating token metadata for chain: ${chainKey} (${chain})${themeLabel}`);
  console.log(`  Output: ${chainDir}`);
  console.log(`  BASE_TOKEN_URI : ${baseMetadataUri}`);
  console.log(`  CONTRACT_URI   : ${baseMetadataUri.replace(/metadata\/$/, 'contract/collection.json')}`);
  if (dryRun) console.log('  (dry-run — no files will be written)');

  ensureDir(metadataDir, dryRun);
  ensureDir(contractDir, dryRun);

  const tokens    = generateTokenEntries(chainKey, themeFilter || null);
  let tokenErrors = 0;

  // 1. Token metadata files
  for (const token of tokens) {
    const metadataFile = path.join(metadataDir, `${token.tokenId}.json`);
    try {
      const metadata = buildTokenMetadata(token, baseImageUri);
      writeJsonFile(metadataFile, metadata, dryRun, force);
    } catch (e) {
      console.error(`  ✗ token ${token.tokenId}: ${e.message}`);
      tokenErrors++;
    }
  }

  // 2. Collection metadata file
  const collectionFile = path.join(contractDir, 'collection.json');
  try {
    const collectionMeta = buildCollectionMetadata(chainKey, baseImageUri);
    writeJsonFile(collectionFile, collectionMeta, dryRun, force);
  } catch (e) {
    console.error(`  ✗ collection.json: ${e.message}`);
    tokenErrors++;
  }

  if (tokenErrors === 0) {
    console.log(
      dryRun
        ? `  Dry-run complete. ${tokens.length} token(s) and 1 collection would be generated.`
        : `  Done. Generated ${tokens.length} token metadata file(s) and collection.json.`
    );
  }

  return tokenErrors;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

function main() {
  const args      = parseArgs(process.argv);
  const chainList = resolveChainList(args);
  const outputDir = path.resolve(args.output);

  // Validate --theme if provided
  const validThemes = THEMES.map(t => t.id);
  if (args.theme && !validThemes.includes(args.theme)) {
    console.error(`Error: unknown theme "${args.theme}". Valid themes: ${validThemes.join(', ')}`);
    process.exit(1);
  }

  const opts = { dryRun: args.dryRun, force: args.force, themeFilter: args.theme || null };

  console.log(`Output root: ${outputDir}`);
  if (args.theme)  console.log(`Theme filter: ${args.theme}`);
  if (args.dryRun) console.log('(dry-run mode — no files will be written)');

  // Ensure the output root exists
  ensureDir(outputDir, args.dryRun);

  // Write Cloudflare Pages config files into the output root (once)
  writePagesConfig(outputDir, args.dryRun, args.force);

  let totalErrors = 0;
  for (const chainConfig of chainList) {
    totalErrors += generateChain(chainConfig, outputDir, opts);
  }

  console.log('');
  if (totalErrors > 0) {
    console.error(`Generation completed with ${totalErrors} error(s).`);
    process.exit(1);
  }

  const label = args.dryRun ? 'Dry-run complete' : 'Done';
  console.log(`${label}. Generated metadata for ${chainList.length} chain(s).`);
}

main();
