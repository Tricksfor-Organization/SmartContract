#!/usr/bin/env node
'use strict';

/**
 * generate-nft-assets.js
 *
 * Generates static NFT metadata and collection metadata from a chain-specific
 * asset manifest, producing the per-chain output tree deployed to Cloudflare Pages.
 *
 * Output tree (one directory per chain):
 *
 *   {nftAssetsDir}/{chainKey}/metadata/{tokenId}.json   ← token metadata (1–600)
 *   {nftAssetsDir}/{chainKey}/contract/collection.json  ← collection metadata
 *   {nftAssetsDir}/{chainKey}/images/{tokenId}.png      ← per-token images (copied from source)
 *
 * URL conventions after deployment (with BASE_DOMAIN = nft.tricksfor.com):
 *
 *   https://nft.tricksfor.com/{chainKey}/metadata/{tokenId}       (on-chain tokenURI)
 *   https://nft.tricksfor.com/{chainKey}/metadata/{tokenId}.json  (direct file)
 *   https://nft.tricksfor.com/{chainKey}/images/{tokenId}.png
 *   https://nft.tricksfor.com/{chainKey}/contract/collection.json
 *
 * Usage:
 *   node scripts/generate-nft-assets.js [options]
 *
 * Options:
 *   --manifest <path>     Path to nft-manifest.json (overrides --env)
 *   --env <env>           Deployment environment; loads deployments/config/<env>/nft-manifest.json
 *   --nft-assets <path>   Path to nft-assets directory (default: ./nft-assets)
 *   --dry-run             Print what would be written without creating any files
 *   --skip-images         Skip the image copy step (useful when source images are not yet available)
 *   --force               Overwrite existing output files (default: error if files exist)
 *
 * Exit codes:
 *   0 — generation completed successfully
 *   1 — one or more errors prevented generation
 *
 * See docs/nft-metadata-generation.md for the full documentation.
 */

const fs   = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Vocabulary tables (single source of truth)
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

/**
 * Maps chainKey → optional Chain metadata attribute value.
 * Per docs/nft-asset-manifest-spec.md § 7 and docs/nft-assets-spec.md § 7.
 */
const CHAINKEY_TO_CHAIN_ATTRIBUTE = {
  ethereum:  'Ethereum',
  polygon:   'Polygon',
  bsc:       'BNB Chain',
  avalanche: 'Avalanche',
  optimism:  'Optimism',
};

/**
 * Maps chainKey → collection display name for collection.json.
 * Per docs/nft-copy-spec.md § 1.
 */
const CHAINKEY_TO_COLLECTION_NAME = {
  ethereum:  'Tricksfor Boosters - Ethereum',
  polygon:   'Tricksfor Boosters - Polygon',
  bsc:       'Tricksfor Boosters - BSC',
  avalanche: 'Tricksfor Boosters - Avalanche',
  optimism:  'Tricksfor Boosters - Optimism',
};

/** Collection description used in collection.json (contractURI metadata). */
const COLLECTION_DESCRIPTION =
  'Tricksfor Booster NFTs are in-game items that activate a reward boost when staked. ' +
  'Stake your Booster to earn enhanced rewards during gameplay.';

/** Placeholder fee recipient — must be replaced before mainnet publishing. */
const PLACEHOLDER_FEE_RECIPIENT = '0x000000000000000000000000000000000000dEaD';

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = {
    nftAssets:  './nft-assets',
    env:        null,
    manifest:   null,
    dryRun:     false,
    skipImages: false,
    force:      false,
  };
  for (let i = 2; i < argv.length; i++) {
    const flag = argv[i];
    const next = argv[i + 1];
    if      (flag === '--nft-assets'  && next) { args.nftAssets  = next; i++; }
    else if (flag === '--env'         && next) { args.env        = next; i++; }
    else if (flag === '--manifest'    && next) { args.manifest   = next; i++; }
    else if (flag === '--dry-run')             { args.dryRun     = true; }
    else if (flag === '--skip-images')         { args.skipImages = true; }
    else if (flag === '--force')               { args.force      = true; }
    else {
      console.error(`Unknown argument: ${flag}`);
      process.exit(1);
    }
  }
  return args;
}

// ---------------------------------------------------------------------------
// Manifest loading
// ---------------------------------------------------------------------------

function resolveManifestPath(args) {
  if (args.manifest) {
    return path.resolve(args.manifest);
  }
  if (args.env) {
    return path.resolve('deployments', 'config', args.env, 'nft-manifest.json');
  }
  console.error('Error: provide --manifest <path> or --env <env>');
  process.exit(1);
}

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
// Manifest validation (pre-generation checks)
// ---------------------------------------------------------------------------

/** Safe characters for chainKey; no path separators or shell special chars. */
const VALID_CHAIN_KEY_RE = /^[a-z0-9-]+$/;

/** Supported chain keys — restrict to the known deployment set. */
const KNOWN_CHAIN_KEYS = new Set(['ethereum', 'polygon', 'bsc', 'avalanche', 'optimism']);

function validateManifest(manifest, manifestPath) {
  const errors = [];

  if (manifest.manifestVersion !== '1.0') {
    errors.push('"manifestVersion" must be "1.0"');
  }

  // chainKey — validate before using it in path or URI checks below
  const chainKey = manifest.chainKey;
  if (typeof chainKey !== 'string' || !chainKey) {
    errors.push('"chainKey" is required');
  } else if (!VALID_CHAIN_KEY_RE.test(chainKey)) {
    errors.push('"chainKey" must contain only lowercase letters, digits, and hyphens (no path separators)');
  } else if (!KNOWN_CHAIN_KEYS.has(chainKey)) {
    errors.push(`"chainKey" must be one of: ${[...KNOWN_CHAIN_KEYS].join(', ')} (got: "${chainKey}")`);
  }

  if (typeof manifest.chain !== 'string' || !manifest.chain) {
    errors.push('"chain" is required');
  }

  // baseImageUri — must be HTTPS and end with /{chainKey}/images/
  if (typeof manifest.baseImageUri !== 'string' || !manifest.baseImageUri.startsWith('https://')) {
    errors.push('"baseImageUri" must be an HTTPS URL');
  } else if (chainKey && !manifest.baseImageUri.endsWith(`/${chainKey}/images/`)) {
    errors.push(`"baseImageUri" must end with "/${chainKey}/images/" (got: "${manifest.baseImageUri}")`);
  }

  // baseMetadataUri — must be HTTPS and end with /{chainKey}/metadata/
  if (typeof manifest.baseMetadataUri !== 'string' || !manifest.baseMetadataUri.startsWith('https://')) {
    errors.push('"baseMetadataUri" must be an HTTPS URL');
  } else if (chainKey && !manifest.baseMetadataUri.endsWith(`/${chainKey}/metadata/`)) {
    errors.push(`"baseMetadataUri" must end with "/${chainKey}/metadata/" (got: "${manifest.baseMetadataUri}")`);
  }

  if (!manifest.supply || typeof manifest.supply.total !== 'number') {
    errors.push('"supply.total" is required');
  }

  if (!Array.isArray(manifest.tokens)) {
    errors.push('"tokens" must be an array');
  } else if (manifest.tokens.length === 0) {
    errors.push('"tokens" array is empty');
  } else {
    // Per-token entry validation — run before any files are written
    const seenIds = new Set();
    for (let i = 0; i < manifest.tokens.length; i++) {
      const token = manifest.tokens[i];
      const idx   = `tokens[${i}]`;

      // tokenId: integer 1–600, unique
      if (!Number.isInteger(token.tokenId) || token.tokenId < 1 || token.tokenId > 600) {
        errors.push(`${idx}: "tokenId" must be an integer between 1 and 600 (got: ${JSON.stringify(token.tokenId)})`);
      } else if (seenIds.has(token.tokenId)) {
        errors.push(`${idx}: duplicate tokenId ${token.tokenId}`);
      } else {
        seenIds.add(token.tokenId);
      }

      // Required string fields
      for (const field of ['theme', 'variant', 'tier', 'sourceImage']) {
        if (typeof token[field] !== 'string' || !token[field]) {
          errors.push(`${idx}: "${field}" is required and must be a non-empty string`);
        }
      }

      // Vocabulary checks
      if (typeof token.theme === 'string' && token.theme && !THEME_TO_GAME[token.theme]) {
        errors.push(`${idx}: "theme" must be one of: coin, dice, rps (got: "${token.theme}")`);
      }
      if (typeof token.variant === 'string' && token.variant && !VARIANT_TO_OPTION[token.variant]) {
        errors.push(`${idx}: "variant" "${token.variant}" is not a recognised option`);
      }
      if (typeof token.tier === 'string' && token.tier && !TIER_TO_BOOSTER[token.tier]) {
        errors.push(`${idx}: "tier" must be one of: 2x, 3x, 5x (got: "${token.tier}")`);
      }
    }
  }

  if (errors.length > 0) {
    console.error(`Error: manifest validation failed (${manifestPath}):`);
    for (const e of errors) {
      console.error(`  ✗ ${e}`);
    }
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Description derivation
// ---------------------------------------------------------------------------

/**
 * Derives the per-token description from a token entry.
 *
 * Priority:
 * 1. `token.description` (explicit per-token description in manifest)
 * 2. Per-token template from docs/nft-copy-spec.md § 5.1 (derived from theme, variant, tier)
 * 3. `manifest.descriptionTemplate` (fallback generic string)
 */
function deriveDescription(token, manifest) {
  if (typeof token.description === 'string' && token.description.trim()) {
    return token.description.trim();
  }

  const game       = THEME_TO_GAME[token.theme];
  const optionVal  = VARIANT_TO_OPTION[token.variant];
  const multiplier = token.tier;

  if (game && optionVal && multiplier) {
    // Template from docs/nft-copy-spec.md § 5.1
    return (
      `A Tricksfor ${game} Booster NFT for the ${optionVal} outcome. ` +
      `Stake this NFT to activate a ${multiplier} reward boost during eligible Tricksfor gameplay. ` +
      `An unstaked Booster confers no in-game advantage. Subject to platform rules.`
    );
  }

  // Generic fallback
  return (
    typeof manifest.descriptionTemplate === 'string' && manifest.descriptionTemplate.trim()
      ? manifest.descriptionTemplate.trim()
      : 'A Tricksfor Booster NFT. Stake this NFT to activate a reward boost during gameplay. ' +
        'An unstaked Booster confers no in-game advantage.'
  );
}

// ---------------------------------------------------------------------------
// Token metadata generation
// ---------------------------------------------------------------------------

/**
 * Builds a single token metadata JSON object from a manifest token entry.
 *
 * @param {object} token    - Token entry from manifest.tokens[]
 * @param {object} manifest - Top-level manifest object
 * @returns {object}        - Token metadata JSON (ready to serialize)
 */
function buildTokenMetadata(token, manifest) {
  const { tokenId, theme, variant, tier } = token;

  const game      = THEME_TO_GAME[theme];
  const option    = VARIANT_TO_OPTION[variant];
  const booster   = TIER_TO_BOOSTER[tier];
  const chainAttr = CHAINKEY_TO_CHAIN_ATTRIBUTE[manifest.chainKey];

  if (!game || !option || !booster) {
    throw new Error(
      `Token ${tokenId}: unrecognised theme/variant/tier: ${theme}/${variant}/${tier}`
    );
  }

  const imageUrl   = `${manifest.baseImageUri}${tokenId}.png`;
  const externalUrl = `https://tricksfor.com/boosters/${tokenId}`;
  const description = deriveDescription(token, manifest);

  const name = token.displayName ||
    `Tricksfor ${game} ${option} ${tier} Booster #${tokenId}`;

  const attributes = [
    { trait_type: 'Game',       value: game    },
    { trait_type: 'Option',     value: option  },
    { trait_type: 'Booster',    value: booster },
    { trait_type: 'Multiplier', value: tier    },
  ];

  // Append Chain attribute when the chainKey is a known chain
  if (chainAttr) {
    attributes.push({ trait_type: 'Chain', value: chainAttr });
  }

  return {
    name,
    description,
    image:        imageUrl,
    external_url: externalUrl,
    attributes,
  };
}

// ---------------------------------------------------------------------------
// Collection metadata generation
// ---------------------------------------------------------------------------

/**
 * Builds the collection metadata JSON object (contractURI output).
 *
 * @param {object} manifest - Top-level manifest object
 * @returns {object}        - Collection metadata JSON (ready to serialize)
 */
function buildCollectionMetadata(manifest) {
  const chainKey      = manifest.chainKey;
  const collectionName = CHAINKEY_TO_COLLECTION_NAME[chainKey] || manifest.collectionName || 'Tricksfor Boosters';
  const imageUrl      = `${manifest.baseImageUri}collection.png`;
  const externalLink  = 'https://tricksfor.com/boosters';

  return {
    name:                    collectionName,
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

function copyImageFile(sourcePath, destPath, dryRun, force) {
  if (!fs.existsSync(sourcePath)) {
    return false;
  }
  if (!dryRun && !force && fs.existsSync(destPath)) {
    throw new Error(`File already exists (use --force to overwrite): ${destPath}`);
  }
  if (dryRun) {
    console.log(`  [dry-run] would copy ${sourcePath} → ${destPath}`);
  } else {
    fs.copyFileSync(sourcePath, destPath);
    console.log(`  ✓ copied → ${destPath}`);
  }
  return true;
}

// ---------------------------------------------------------------------------
// Main generation pipeline
// ---------------------------------------------------------------------------

function generate(manifest, nftAssetsDir, opts) {
  const { dryRun, skipImages, force } = opts;
  const chainKey = manifest.chainKey;

  const chainDir    = path.join(nftAssetsDir, chainKey);
  const metadataDir = path.join(chainDir, 'metadata');
  const contractDir = path.join(chainDir, 'contract');
  const imagesDir   = path.join(chainDir, 'images');
  const sourceDir   = path.join(nftAssetsDir, 'source-images');

  console.log(`\nGenerating ${manifest.tokens.length} token metadata files for chain: ${chainKey}`);
  console.log(`Output directory: ${chainDir}`);
  if (dryRun) console.log('(dry-run — no files will be written)\n');

  // Ensure output directories exist
  ensureDir(metadataDir, dryRun);
  ensureDir(contractDir, dryRun);
  if (!skipImages) ensureDir(imagesDir, dryRun);

  // 1. Generate token metadata files
  console.log('\n--- Token metadata ---');
  let tokenErrors = 0;
  for (const token of manifest.tokens) {
    const { tokenId, sourceImage } = token;
    const metadataFile = path.join(metadataDir, `${tokenId}.json`);

    try {
      const metadata = buildTokenMetadata(token, manifest);
      writeJsonFile(metadataFile, metadata, dryRun, force);
    } catch (e) {
      console.error(`  ✗ token ${tokenId}: ${e.message}`);
      tokenErrors++;
    }

    // 2. Copy source image for this token
    if (!skipImages) {
      if (!sourceImage) {
        console.error(`  ✗ token ${tokenId} image: "sourceImage" field is missing`);
        tokenErrors++;
      } else {
        const sourcePath = path.join(sourceDir, sourceImage);
        const destPath   = path.join(imagesDir, `${tokenId}.png`);
        try {
          const found = copyImageFile(sourcePath, destPath, dryRun, force);
          if (!found) {
            if (dryRun) {
              // In dry-run mode warn but don't fail — source images may not be present yet
              console.warn(`  ⚠ [dry-run] source image not found: ${sourcePath}`);
            } else {
              // In real generation mode a missing source image is a hard error:
              // the deployed image set would be incomplete
              throw new Error(`source image not found: ${sourcePath}`);
            }
          }
        } catch (e) {
          console.error(`  ✗ token ${tokenId} image: ${e.message}`);
          tokenErrors++;
        }
      }
    }
  }

  // 3. Generate collection metadata
  console.log('\n--- Collection metadata ---');
  const collectionFile = path.join(contractDir, 'collection.json');
  try {
    const collectionMeta = buildCollectionMetadata(manifest);
    writeJsonFile(collectionFile, collectionMeta, dryRun, force);
  } catch (e) {
    console.error(`  ✗ collection.json: ${e.message}`);
    tokenErrors++;
  }

  // 4. Copy collection image (shared banner; not derived from per-token sourceImage)
  if (!skipImages) {
    const collectionImgSource = path.join(nftAssetsDir, 'images', 'collection.png');
    const collectionImgDest   = path.join(imagesDir, 'collection.png');
    try {
      const found = copyImageFile(collectionImgSource, collectionImgDest, dryRun, force);
      if (!found) {
        // collection.png is a manually placed asset — warn but don't fail
        const level = dryRun ? '[dry-run] ' : '';
        console.warn(`  ⚠ ${level}collection image not found: ${collectionImgSource}`);
        console.warn(`    collection.json references ${manifest.baseImageUri}collection.png`);
        console.warn(`    Place nft-assets/images/collection.png before deploying to Cloudflare Pages.`);
      }
    } catch (e) {
      console.error(`  ✗ collection image: ${e.message}`);
      tokenErrors++;
    }
  }

  // 5. Print derived URLs
  // baseMetadataUri is validated to end with /{chainKey}/metadata/ — replace suffix to derive CONTRACT_URI
  console.log('\n--- Derived contract parameters ---');
  const baseTokenUri = manifest.baseMetadataUri;
  const contractUri  = baseTokenUri.replace(/metadata\/$/, 'contract/collection.json');
  console.log(`  BASE_TOKEN_URI : ${baseTokenUri}`);
  console.log(`  CONTRACT_URI   : ${contractUri}`);

  // 6. Summary
  console.log('');
  if (tokenErrors > 0) {
    console.error(`Generation completed with ${tokenErrors} error(s).`);
    process.exit(1);
  } else {
    console.log(
      dryRun
        ? `Dry-run complete. ${manifest.tokens.length} token(s) and 1 collection would be generated.`
        : `Done. Generated ${manifest.tokens.length} token metadata file(s) and collection.json for ${chainKey}.`
    );
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

const args         = parseArgs(process.argv);
const nftAssetsDir = path.resolve(args.nftAssets);
const manifestPath = resolveManifestPath(args);

console.log(`Loading manifest: ${manifestPath}`);
const manifest = loadManifest(manifestPath);
validateManifest(manifest, manifestPath);

generate(manifest, nftAssetsDir, {
  dryRun:     args.dryRun,
  skipImages: args.skipImages,
  force:      args.force,
});
