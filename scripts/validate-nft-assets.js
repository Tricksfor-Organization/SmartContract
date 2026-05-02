#!/usr/bin/env node
'use strict';

/**
 * validate-nft-assets.js
 *
 * Validates NFT static asset structure before Cloudflare Pages deployment.
 *
 * Checks performed:
 *   - Collection metadata file exists and contains required fields
 *   - Token metadata files contain required fields and valid attribute values
 *   - Token image files exist for every token metadata file
 *   - File naming conventions (metadata/{id}.json, images/{id}.png)
 *   - Token IDs are unique within the metadata directory
 *   - If an authoritative manifest is found, validates:
 *       - Manifest structure and field values (spec §9 rules)
 *       - All manifest-referenced metadata files exist
 *       - All manifest-referenced image files exist
 *       - Source images exist in nft-assets/images/source/
 *
 * Usage:
 *   node scripts/validate-nft-assets.js [options]
 *
 * Options:
 *   --nft-assets <path>   Path to nft-assets directory (default: ./nft-assets)
 *   --env <env>           Deployment environment name; auto-locates manifest at
 *                         deployments/config/<env>/nft-manifest.json
 *   --manifest <path>     Explicit path to an nft-manifest.json to validate against
 *   --chain-key <key>     Chain key to validate (e.g. ethereum, polygon); appends <key>
 *                         to the nft-assets path so chain-specific output is checked.
 *                         Equivalent to --nft-assets ./nft-assets/<key>
 *                         Combine with --env to validate both output and manifest at once.
 *
 * Exit codes:
 *   0 — all checks passed (warnings are non-fatal)
 *   1 — one or more validation errors
 *
 * See docs/nft-asset-validation.md for full documentation.
 */

const fs   = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Vocabulary tables (single source of truth for valid values)
// ---------------------------------------------------------------------------

const VALID_GAMES = new Set(['Coin', 'Dice', 'Rock Paper Scissors']);

/** Valid Option values per Game (token metadata attribute vocabulary) */
const VALID_OPTIONS_BY_GAME = {
  Coin:                  new Set(['Heads', 'Tails']),
  Dice:                  new Set(['1', '2', '3', '4', '5', '6']),
  'Rock Paper Scissors': new Set(['Rock', 'Paper', 'Scissors']),
};

const VALID_BOOSTERS    = new Set(['2x Booster', '3x Booster', '5x Booster']);
const VALID_MULTIPLIERS = new Set(['2x', '3x', '5x']);

/** Maps Booster value → required Multiplier value */
const BOOSTER_TO_MULTIPLIER = {
  '2x Booster': '2x',
  '3x Booster': '3x',
  '5x Booster': '5x',
};

/** Valid manifest-level theme/variant/tier identifiers (canonical, not display names) */
const VALID_MANIFEST_THEMES = new Set(['coin', 'dice', 'rps']);
const VALID_MANIFEST_TIERS  = new Set(['2x', '3x', '5x']);
const VALID_MANIFEST_VARIANTS_BY_THEME = {
  coin: new Set(['heads', 'tails']),
  dice: new Set(['1', '2', '3', '4', '5', '6']),
  rps:  new Set(['rock', 'paper', 'scissors']),
};

/** Theme ordering for grouping rule: coin → dice → rps */
const THEME_ORDER = { coin: 0, dice: 1, rps: 2 };

/**
 * Display-name maps used for rule 13 (displayName convention check).
 * Derived from docs/nft-metadata-schema.md § Token Name Convention.
 */
const THEME_TO_GAME_DISPLAY = {
  coin: 'Coin',
  dice: 'Dice',
  rps:  'Rock Paper Scissors',
};
const VARIANT_TO_OPTION_DISPLAY = {
  heads: 'Heads', tails: 'Tails',
  '1': '1', '2': '2', '3': '3', '4': '4', '5': '5', '6': '6',
  rock: 'Rock', paper: 'Paper', scissors: 'Scissors',
};

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = {
    nftAssets:        './nft-assets',
    env:              null,
    manifest:         null,
    chainKey:         null,
    nftAssetsExplicit: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const flag = argv[i];
    const next = argv[i + 1];
    if (flag === '--nft-assets' && next) { args.nftAssets = next; args.nftAssetsExplicit = true; i++; }
    else if (flag === '--env'       && next) { args.env      = next; i++; }
    else if (flag === '--manifest'  && next) { args.manifest = next; i++; }
    else if (flag === '--chain-key' && next) { args.chainKey = next; i++; }
    else {
      console.error(`Unknown argument: ${flag}`);
      process.exit(1);
    }
  }
  // --chain-key <key> is a shortcut for --nft-assets <nftAssets>/<key>
  if (args.chainKey && !args.nftAssetsExplicit) {
    args.nftAssets = path.join(args.nftAssets, args.chainKey);
  }
  return args;
}

// ---------------------------------------------------------------------------
// Validation report
// ---------------------------------------------------------------------------

class Report {
  constructor() {
    this.errors   = [];
    this.warnings = [];
    this.passed   = [];
  }

  error(msg) {
    this.errors.push(msg);
    console.error(`  ✗ ${msg}`);
  }

  warn(msg) {
    this.warnings.push(msg);
    console.warn(`  ⚠ ${msg}`);
  }

  ok(msg) {
    this.passed.push(msg);
    console.log(`  ✓ ${msg}`);
  }

  get hasErrors() { return this.errors.length > 0; }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function isHttpsUrl(value) {
  return typeof value === 'string' && value.startsWith('https://');
}

function getAttributeValue(attributes, traitType) {
  if (!Array.isArray(attributes)) return undefined;
  const attr = attributes.find(a => a && a.trait_type === traitType);
  return attr ? attr.value : undefined;
}

// ---------------------------------------------------------------------------
// 1. Collection metadata validation
//    Checks nft-assets/contract/collection.json
// ---------------------------------------------------------------------------

function validateCollectionMetadata(nftAssetsDir, report) {
  console.log('\n--- Collection metadata ---');
  const collectionPath = path.join(nftAssetsDir, 'contract', 'collection.json');

  if (!fs.existsSync(collectionPath)) {
    report.error(`contractURI target file not found: contract/collection.json`);
    return;
  }

  let meta;
  try {
    meta = readJsonFile(collectionPath);
  } catch (e) {
    report.error(`contract/collection.json: invalid JSON — ${e.message}`);
    return;
  }

  let ok = true;
  for (const field of ['name', 'description', 'image']) {
    if (!meta[field] || typeof meta[field] !== 'string') {
      report.error(`contract/collection.json: missing or empty required field "${field}"`);
      ok = false;
    }
  }

  if (meta.image !== undefined && !isHttpsUrl(meta.image)) {
    report.error(`contract/collection.json: "image" must be an HTTPS URL (got: ${meta.image})`);
    ok = false;
  }

  if (ok) {
    report.ok('contract/collection.json is present and contains all required fields');
  }
}

// ---------------------------------------------------------------------------
// 2. Token metadata validation
//    Validates each nft-assets/metadata/{id}.json file
// ---------------------------------------------------------------------------

function validateOneTokenMetadata(filePath, report) {
  const fileName = path.basename(filePath);
  const stem     = fileName.replace(/\.json$/, '');
  const tokenId  = Number(stem);

  // Reject non-integer values and leading-zero forms like "007"
  // (Number('007') === 7, but String(7) !== '007')
  if (!Number.isInteger(tokenId) || tokenId <= 0 || String(tokenId) !== stem) {
    report.error(`metadata/${fileName}: file name is not a valid positive integer token ID`);
    return null;
  }

  let meta;
  try {
    meta = readJsonFile(filePath);
  } catch (e) {
    report.error(`metadata/${fileName}: invalid JSON — ${e.message}`);
    return null;
  }

  let fieldErrors = 0;

  // Required top-level fields — must be non-empty strings (or array for attributes).
  // The image HTTPS URL check is nested inside the string validation so it only runs
  // when image is already confirmed to be a non-empty string.
  for (const field of ['name', 'description', 'image']) {
    if (meta[field] === undefined || meta[field] === null) {
      report.error(`metadata/${fileName}: missing required field "${field}"`);
      fieldErrors++;
    } else if (typeof meta[field] !== 'string' || meta[field].trim() === '') {
      report.error(`metadata/${fileName}: "${field}" must be a non-empty string`);
      fieldErrors++;
    } else if (field === 'image' && !isHttpsUrl(meta[field])) {
      report.error(`metadata/${fileName}: "image" must be an HTTPS URL (got: ${meta.image})`);
      fieldErrors++;
    }
  }

  // attributes must be an array; report the appropriate error (missing vs. wrong type)
  // and return immediately — attribute-level checks below cannot run without an array.
  if (!Array.isArray(meta.attributes)) {
    if (meta.attributes === undefined || meta.attributes === null) {
      report.error(`metadata/${fileName}: missing required field "attributes"`);
    } else {
      report.error(`metadata/${fileName}: "attributes" must be an array`);
    }
    fieldErrors++;
    return null;
  }

  // Required attributes
  const game       = getAttributeValue(meta.attributes, 'Game');
  const option     = getAttributeValue(meta.attributes, 'Option');
  const booster    = getAttributeValue(meta.attributes, 'Booster');
  const multiplier = getAttributeValue(meta.attributes, 'Multiplier');

  if (!game) {
    report.error(`metadata/${fileName}: missing required attribute "Game"`);
    fieldErrors++;
  } else if (!VALID_GAMES.has(game)) {
    report.error(
      `metadata/${fileName}: invalid "Game" value "${game}"; ` +
      `expected one of: ${[...VALID_GAMES].join(', ')}`
    );
    fieldErrors++;
  }

  if (!option) {
    report.error(`metadata/${fileName}: missing required attribute "Option"`);
    fieldErrors++;
  } else if (game && VALID_OPTIONS_BY_GAME[game] && !VALID_OPTIONS_BY_GAME[game].has(option)) {
    report.error(
      `metadata/${fileName}: invalid "Option" value "${option}" for Game "${game}"; ` +
      `expected one of: ${[...VALID_OPTIONS_BY_GAME[game]].join(', ')}`
    );
    fieldErrors++;
  }

  if (!booster) {
    report.error(`metadata/${fileName}: missing required attribute "Booster"`);
    fieldErrors++;
  } else if (!VALID_BOOSTERS.has(booster)) {
    report.error(
      `metadata/${fileName}: invalid "Booster" value "${booster}"; ` +
      `expected one of: ${[...VALID_BOOSTERS].join(', ')}`
    );
    fieldErrors++;
  }

  if (!multiplier) {
    report.error(`metadata/${fileName}: missing required attribute "Multiplier"`);
    fieldErrors++;
  } else if (!VALID_MULTIPLIERS.has(multiplier)) {
    report.error(
      `metadata/${fileName}: invalid "Multiplier" value "${multiplier}"; ` +
      `expected one of: ${[...VALID_MULTIPLIERS].join(', ')}`
    );
    fieldErrors++;
  }

  // Booster ↔ Multiplier consistency
  if (
    booster && multiplier &&
    VALID_BOOSTERS.has(booster) && VALID_MULTIPLIERS.has(multiplier)
  ) {
    const expectedMultiplier = BOOSTER_TO_MULTIPLIER[booster];
    if (multiplier !== expectedMultiplier) {
      report.error(
        `metadata/${fileName}: "Booster" ("${booster}") and "Multiplier" ("${multiplier}") ` +
        `are inconsistent; expected Multiplier "${expectedMultiplier}"`
      );
      fieldErrors++;
    }
  }

  return fieldErrors === 0 ? tokenId : null;
}

function validateTokenMetadata(nftAssetsDir, report) {
  console.log('\n--- Token metadata ---');
  const metadataDir = path.join(nftAssetsDir, 'metadata');

  if (!fs.existsSync(metadataDir)) {
    report.error(`metadata directory not found: ${metadataDir}`);
    return new Set();
  }

  const jsonFiles = fs.readdirSync(metadataDir)
    .filter(f => f.endsWith('.json'))
    .sort();

  if (jsonFiles.length === 0) {
    report.warn('metadata directory contains no .json files (assets not yet generated)');
    return new Set();
  }

  const tokenIds   = new Set();
  let fileErrors   = 0;

  for (const file of jsonFiles) {
    const filePath = path.join(metadataDir, file);
    const tokenId  = validateOneTokenMetadata(filePath, report);
    if (tokenId === null) {
      fileErrors++;
    } else if (tokenIds.has(tokenId)) {
      report.error(`metadata/${file}: duplicate token ID ${tokenId}`);
      fileErrors++;
    } else {
      tokenIds.add(tokenId);
    }
  }

  if (fileErrors === 0) {
    report.ok(`All ${jsonFiles.length} token metadata files are valid`);
  }

  return tokenIds;
}

// ---------------------------------------------------------------------------
// 3. Token image existence validation
//    Checks nft-assets/images/{id}.png exists for every metadata file
// ---------------------------------------------------------------------------

function validateTokenImages(nftAssetsDir, tokenIds, report) {
  console.log('\n--- Token images ---');

  if (tokenIds.size === 0) {
    report.warn('No token metadata files found; skipping per-token image existence checks');
    return;
  }

  const imagesDir = path.join(nftAssetsDir, 'images');
  if (!fs.existsSync(imagesDir)) {
    report.error(`images directory not found: ${imagesDir}`);
    return;
  }

  let missing = 0;
  for (const tokenId of [...tokenIds].sort((a, b) => a - b)) {
    const imagePath = path.join(imagesDir, `${tokenId}.png`);
    if (!fs.existsSync(imagePath)) {
      report.error(`images/${tokenId}.png: file not found (required for token ${tokenId})`);
      missing++;
    }
  }

  if (missing === 0) {
    report.ok(`All ${tokenIds.size} token image files exist`);
  }
}

// ---------------------------------------------------------------------------
// 4. Manifest validation
//    If an authoritative manifest exists, validate structure + consistency
// ---------------------------------------------------------------------------

function findManifestPath(args) {
  if (args.manifest) return args.manifest;
  if (args.env) return path.join('deployments', 'config', args.env, 'nft-manifest.json');
  return null;
}

function isAuthoritativeManifest(manifest) {
  // Sample manifests carry a "_note" field (see nft-asset-manifest-spec.md §9)
  return !('_note' in manifest);
}

function validateManifestStructure(manifest, base, report, isExcerpt) {
  // Rule 1: manifestVersion
  if (manifest.manifestVersion !== '1.0') {
    report.error(
      `${base}: "manifestVersion" must be "1.0" ` +
      `(got: ${JSON.stringify(manifest.manifestVersion)})`
    );
  }

  // Rule 2: contract, chain, chainKey, network
  for (const field of ['contract', 'chain', 'chainKey', 'network']) {
    if (!manifest[field] || typeof manifest[field] !== 'string') {
      report.error(`${base}: missing or empty required field "${field}"`);
    }
  }
  if (typeof manifest.contract === 'string' && manifest.contract) {
    if (!/^0x[a-fA-F0-9]{40}$/.test(manifest.contract)) {
      report.error(
        `${base}: "contract" must be a 0x-prefixed 40-hex-character address ` +
        `(got: ${JSON.stringify(manifest.contract)})`
      );
    }
  }
  if (manifest.chainKey && manifest.network) {
    const expectedPrefix = `${manifest.chainKey}-`;
    if (!manifest.network.startsWith(expectedPrefix)) {
      report.error(
        `${base}: "network" ("${manifest.network}") must start with ` +
        `chainKey prefix "${expectedPrefix}"`
      );
    }
  }

  // Rule 3: supply total
  if (!manifest.supply) {
    report.error(`${base}: missing required "supply" object`);
  } else {
    const { coin = 0, dice = 0, rps = 0, total } = manifest.supply;
    if (coin + dice + rps !== total) {
      report.error(
        `${base}: supply.total (${total}) does not equal ` +
        `coin + dice + rps (${coin + dice + rps})`
      );
    }
  }

  // Required URI fields
  for (const field of ['baseImageUri', 'baseMetadataUri']) {
    if (!manifest[field] || typeof manifest[field] !== 'string') {
      report.error(`${base}: missing or empty required field "${field}"`);
    }
  }

  if (!Array.isArray(manifest.tokens)) {
    report.error(`${base}: "tokens" must be an array`);
    return; // Cannot continue without tokens array
  }

  const supply = manifest.supply || {};

  if (!isExcerpt) {
    // Rule 4: token IDs are sequential starting from 1
    const tokenIds    = manifest.tokens.map(t => t.tokenId);
    const tokenIdSet  = new Set(tokenIds);
    if (tokenIdSet.size !== tokenIds.length) {
      report.error(`${base}: duplicate token IDs found in tokens array`);
    } else {
      const sorted = [...tokenIds].sort((a, b) => a - b);
      for (let i = 0; i < sorted.length; i++) {
        if (sorted[i] !== i + 1) {
          report.error(
            `${base}: token IDs are not sequential starting from 1 ` +
            `(expected ${i + 1}, found ${sorted[i]})`
          );
          break;
        }
      }
    }

    // Rule 5: theme grouping order — coin → dice → rps
    let lastThemeOrder = -1;
    for (let i = 0; i < manifest.tokens.length; i++) {
      const t     = manifest.tokens[i];
      const order = THEME_ORDER[t.theme];
      if (order !== undefined) {
        if (order < lastThemeOrder) {
          report.error(
            `${base}: token theme grouping order violation at index ${i} ` +
            `(token ID ${t.tokenId}): themes must appear in coin → dice → rps order`
          );
          break;
        }
        lastThemeOrder = order;
      }
    }

    // Rule 6: token count per theme matches declared supply
    if (manifest.supply) {
      const counts = { coin: 0, dice: 0, rps: 0 };
      for (const t of manifest.tokens) {
        if (counts[t.theme] !== undefined) counts[t.theme]++;
      }
      for (const theme of ['coin', 'dice', 'rps']) {
        if (counts[theme] !== supply[theme]) {
          report.error(
            `${base}: ${theme} theme token count (${counts[theme]}) ` +
            `does not match supply.${theme} (${supply[theme]})`
          );
        }
      }
    }
  }

  // Per-token field rules (7–13)
  for (const token of manifest.tokens) {
    const tid = token.tokenId;

    // Rule 7: theme
    if (!VALID_MANIFEST_THEMES.has(token.theme)) {
      report.error(
        `${base}: token ${tid}: invalid "theme" "${token.theme}"; ` +
        `expected one of: coin, dice, rps`
      );
    }

    // Rule 8: variant valid for theme
    if (token.theme && VALID_MANIFEST_VARIANTS_BY_THEME[token.theme]) {
      if (!VALID_MANIFEST_VARIANTS_BY_THEME[token.theme].has(token.variant)) {
        report.error(
          `${base}: token ${tid}: invalid "variant" "${token.variant}" ` +
          `for theme "${token.theme}"; expected one of: ` +
          `${[...VALID_MANIFEST_VARIANTS_BY_THEME[token.theme]].join(', ')}`
        );
      }
    }

    // Rule 9: tier
    if (!VALID_MANIFEST_TIERS.has(token.tier)) {
      report.error(
        `${base}: token ${tid}: invalid "tier" "${token.tier}"; ` +
        `expected one of: 2x, 3x, 5x`
      );
    }

    // Rule 10: sourceImage matches {theme}-{variant}-{tier}.png
    const expectedSource = `${token.theme}-${token.variant}-${token.tier}.png`;
    if (token.sourceImage !== expectedSource) {
      report.error(
        `${base}: token ${tid}: "sourceImage" "${token.sourceImage}" ` +
        `does not match expected pattern "${expectedSource}"`
      );
    }

    if (!isExcerpt) {
      // Rule 11: imagePath = images/{tokenId}.png
      if (token.imagePath !== `images/${tid}.png`) {
        report.error(
          `${base}: token ${tid}: "imagePath" must be "images/${tid}.png" ` +
          `(got: "${token.imagePath}")`
        );
      }

      // Rule 12: metadataPath = metadata/{tokenId}.json
      if (token.metadataPath !== `metadata/${tid}.json`) {
        report.error(
          `${base}: token ${tid}: "metadataPath" must be "metadata/${tid}.json" ` +
          `(got: "${token.metadataPath}")`
        );
      }

      // Rule 13: displayName matches token name convention
      // Pattern: Tricksfor {Game} {Option} {tier} Booster #{tokenId}
      const gameDisplay   = THEME_TO_GAME_DISPLAY[token.theme];
      const optionDisplay = VARIANT_TO_OPTION_DISPLAY[token.variant];
      if (gameDisplay && optionDisplay && token.tier) {
        const expectedName = `Tricksfor ${gameDisplay} ${optionDisplay} ${token.tier} Booster #${tid}`;
        if (token.displayName !== expectedName) {
          report.error(
            `${base}: token ${tid}: "displayName" "${token.displayName}" ` +
            `does not match expected "${expectedName}"`
          );
        }
      }
    }
  }
}

function validateManifestToOutput(manifest, base, nftAssetsDir, report) {
  console.log('\n--- Manifest-to-output consistency ---');

  if (!Array.isArray(manifest.tokens)) {
    report.error(`${base}: cannot validate manifest-to-output — "tokens" is not an array`);
    return;
  }

  let missingMeta   = 0;
  let missingImages = 0;

  for (const token of manifest.tokens) {
    const tid          = token.tokenId;
    const metaFile     = path.join(nftAssetsDir, 'metadata', `${tid}.json`);
    const imageFile    = path.join(nftAssetsDir, 'images',   `${tid}.png`);

    if (!fs.existsSync(metaFile)) {
      report.error(`manifest token ${tid}: metadata/${tid}.json does not exist`);
      missingMeta++;
    }

    if (!fs.existsSync(imageFile)) {
      report.error(`manifest token ${tid}: images/${tid}.png does not exist`);
      missingImages++;
    }
  }

  if (missingMeta === 0 && missingImages === 0) {
    report.ok(
      `All ${manifest.tokens.length} manifest tokens have ` +
      `corresponding metadata and image files`
    );
  }
}

function validateSourceImages(manifest, base, nftAssetsDir, report) {
  console.log('\n--- Source images (nft-assets/images/source/) ---');
  const sourceDir = path.join(nftAssetsDir, 'images', 'source');

  if (!fs.existsSync(sourceDir)) {
    report.error(`images/source directory not found: ${sourceDir}`);
    return;
  }

  // Collect the unique set of sourceImage values referenced by the manifest
  const referenced = new Set(manifest.tokens.map(t => t.sourceImage).filter(Boolean));
  let missing = 0;

  for (const sourceImage of [...referenced].sort()) {
    const sourcePath = path.join(sourceDir, sourceImage);
    if (!fs.existsSync(sourcePath)) {
      report.error(`images/source/${sourceImage}: source image referenced in manifest not found`);
      missing++;
    }
  }

  if (missing === 0) {
    report.ok(
      `All ${referenced.size} source images referenced by the manifest exist in images/source/`
    );
  }
}

function validateManifest(nftAssetsDir, args, report) {
  const manifestPath = findManifestPath(args);

  if (!manifestPath) {
    report.warn(
      'No manifest path specified (pass --env <env> or --manifest <path>); ' +
      'skipping manifest validation'
    );
    return;
  }

  console.log(`\n--- Manifest: ${manifestPath} ---`);

  if (!fs.existsSync(manifestPath)) {
    if (args.env) {
      // Not an error — the manifest may not exist for a new environment yet
      report.warn(
        `No manifest found at ${manifestPath}; ` +
        `skipping manifest validation (generate the manifest before deploying)`
      );
    } else {
      report.error(`Manifest file not found: ${manifestPath}`);
    }
    return;
  }

  let manifest;
  try {
    manifest = readJsonFile(manifestPath);
  } catch (e) {
    report.error(`Failed to parse manifest at ${manifestPath}: ${e.message}`);
    return;
  }

  if (!isAuthoritativeManifest(manifest)) {
    // Sample manifests carry a _note field and are intentionally non-conforming
    report.warn(
      `${path.basename(manifestPath)} contains a "_note" field — ` +
      `this is a sample manifest; skipping full structural validation`
    );
    return;
  }

  const totalSupply  = manifest.supply && manifest.supply.total;
  const tokenCount   = Array.isArray(manifest.tokens) ? manifest.tokens.length : 0;
  const isExcerpt    = Boolean(totalSupply && tokenCount < totalSupply);

  if (isExcerpt) {
    report.warn(
      `Manifest token count (${tokenCount}) is less than supply.total (${totalSupply}); ` +
      `treating as an excerpt manifest — rules 4–6 and 11–14 are skipped`
    );
  }

  const base = path.basename(manifestPath);

  // Validate manifest structure (spec §9 rules)
  validateManifestStructure(manifest, base, report, isExcerpt);

  if (!isExcerpt) {
    // Validate manifest-to-output consistency (all referenced files exist)
    validateManifestToOutput(manifest, base, nftAssetsDir, report);

    // Validate source images exist (spec §9 rule 14)
    validateSourceImages(manifest, base, nftAssetsDir, report);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const args        = parseArgs(process.argv);
  const nftAssetsDir = path.resolve(args.nftAssets);

  console.log('='.repeat(60));
  console.log('NFT Asset Validation');
  console.log('='.repeat(60));
  console.log(`Assets directory: ${nftAssetsDir}`);
  if (args.chainKey) console.log(`Chain key:        ${args.chainKey}`);
  if (args.env)      console.log(`Environment:      ${args.env}`);
  if (args.manifest) console.log(`Manifest:         ${args.manifest}`);

  if (!fs.existsSync(nftAssetsDir)) {
    console.error(`\nFATAL: nft-assets directory not found: ${nftAssetsDir}`);
    process.exit(1);
  }

  const report = new Report();

  // 1. Collection metadata — contractURI() target
  validateCollectionMetadata(nftAssetsDir, report);

  // 2. Token metadata files
  const tokenIds = validateTokenMetadata(nftAssetsDir, report);

  // 3. Token image files
  validateTokenImages(nftAssetsDir, tokenIds, report);

  // 4. Manifest (if present): structure + manifest-to-output consistency
  validateManifest(nftAssetsDir, args, report);

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('Validation Summary');
  console.log('='.repeat(60));
  console.log(`  Checks passed:  ${report.passed.length}`);
  console.log(`  Warnings:       ${report.warnings.length}`);
  console.log(`  Errors:         ${report.errors.length}`);

  if (report.warnings.length > 0) {
    console.log('\nWarnings:');
    report.warnings.forEach((w, i) => console.warn(`  ${i + 1}. ${w}`));
  }

  if (report.errors.length > 0) {
    console.log('\nErrors:');
    report.errors.forEach((e, i) => console.error(`  ${i + 1}. ${e}`));
    console.log('\n✗ Validation FAILED — fix all errors before deploying\n');
    process.exit(1);
  }

  console.log('\n✓ Validation PASSED\n');
  process.exit(0);
}

main();
