#!/usr/bin/env node
'use strict';

/**
 * validate-nft-output.js
 *
 * Validates the complete generated NFT metadata output across all supported chains.
 * This complements validate-nft-assets.js (which validates a single chain's asset
 * directory against an authoritative manifest) by verifying the distribution correctness
 * of the static metadata already committed or generated into nft-assets/generated/.
 *
 * Checks performed (per chain):
 *   1.  collection.json exists and contains required fields (name, description, image)
 *   2.  Exactly 600 token metadata files are present
 *   3.  Token IDs are unique and span exactly 1–600 with no gaps
 *   4.  Token IDs align with theme allocation ranges:
 *         Coin 1–200 · Dice 201–400 · RPS 401–600
 *   5.  Per-theme token counts: Coin=200, Dice=200, RPS=200
 *   6.  Per-tier counts per theme: 2x Booster=100, 3x Booster=70, 5x Booster=30
 *   7.  Per-option counts per (theme, tier) follow the deterministic remainder-distribution rule
 *   8.  Each token file contains required fields: name, description, image, attributes
 *   9.  Image URL matches the expected chain-specific pattern:
 *         https://{domain}/{chainKey}/images/{tokenId}.png
 *
 * Usage:
 *   node scripts/validate-nft-output.js [options]
 *
 * Options:
 *   --output <path>     Root directory of the generated output
 *                       (default: ./nft-assets/generated)
 *   --chain <chainKey>  Validate only a single chain
 *                       (ethereum|polygon|bsc|avalanche|optimism)
 *   --all               Validate all supported chains (default when no --chain given)
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
// Token allocation constants (mirrors generate-nft-metadata.js)
// ---------------------------------------------------------------------------

/**
 * Theme definitions in canonical order (coin → dice → rps).
 * Each option is a canonical identifier matching the Option metadata attribute
 * after display-name mapping.
 */
const THEMES = [
  { id: 'coin', display: 'Coin',                options: ['Heads', 'Tails'],             range: [1,   200] },
  { id: 'dice', display: 'Dice',                options: ['1','2','3','4','5','6'],       range: [201, 400] },
  { id: 'rps',  display: 'Rock Paper Scissors', options: ['Rock', 'Paper', 'Scissors'],  range: [401, 600] },
];

/**
 * Tier definitions in canonical order (2x → 3x → 5x).
 * count: number of tokens per theme for this tier.
 */
const TIERS = [
  { id: '2x', booster: '2x Booster', count: 100 },
  { id: '3x', booster: '3x Booster', count:  70 },
  { id: '5x', booster: '5x Booster', count:  30 },
];

/** Maps metadata Game value → theme id */
const GAME_TO_THEME_ID = {
  'Coin':                  'coin',
  'Dice':                  'dice',
  'Rock Paper Scissors':   'rps',
};

/** Maps metadata Booster value → tier id */
const BOOSTER_TO_TIER_ID = {
  '2x Booster': '2x',
  '3x Booster': '3x',
  '5x Booster': '5x',
};

/** Total tokens per chain */
const TOTAL_PER_CHAIN = 600;

/** Total tokens per theme per chain */
const TOTAL_PER_THEME = 200;

/** Domain used for CDN image URLs */
const NFT_DOMAIN = 'nft.tricksfor.com';

/** All supported mainnet chain keys */
const ALL_CHAINS = ['ethereum', 'polygon', 'bsc', 'avalanche', 'optimism'];

// ---------------------------------------------------------------------------
// Expected per-option counts (computed deterministically from tier totals)
// ---------------------------------------------------------------------------

/**
 * Builds the expected per-option count table for every (theme, tier) combination
 * using the same remainder-distribution algorithm as generate-nft-metadata.js.
 *
 * Returns a nested map:
 *   expectedCounts[themeId][tierId][optionValue] = expectedCount
 */
function buildExpectedCounts() {
  const result = {};
  for (const theme of THEMES) {
    result[theme.id] = {};
    for (const tier of TIERS) {
      const optCount  = theme.options.length;
      const base      = Math.floor(tier.count / optCount);
      const remainder = tier.count % optCount;
      result[theme.id][tier.id] = {};
      for (let i = 0; i < theme.options.length; i++) {
        result[theme.id][tier.id][theme.options[i]] = base + (i < remainder ? 1 : 0);
      }
    }
  }
  return result;
}

const EXPECTED_COUNTS = buildExpectedCounts();

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = {
    output: './nft-assets/generated',
    chain:  null,  // null = all chains
  };

  for (let i = 2; i < argv.length; i++) {
    const flag = argv[i];
    const next = argv[i + 1];
    if      (flag === '--output' && next) { args.output = next; i++; }
    else if (flag === '--chain'  && next) { args.chain  = next; i++; }
    else if (flag === '--all')            { /* default, no-op */ }
    else {
      console.error(`Unknown argument: ${flag}`);
      process.exit(1);
    }
  }

  if (args.chain && !ALL_CHAINS.includes(args.chain)) {
    console.error(
      `Unknown chain key "${args.chain}". ` +
      `Supported chains: ${ALL_CHAINS.join(', ')}`
    );
    process.exit(1);
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

function getAttributeValue(attributes, traitType) {
  if (!Array.isArray(attributes)) return undefined;
  const attr = attributes.find(a => a && a.trait_type === traitType);
  return attr ? attr.value : undefined;
}

// ---------------------------------------------------------------------------
// Check 1: Collection metadata
// ---------------------------------------------------------------------------

function validateCollectionMetadata(chainDir, chainKey, report) {
  console.log('\n  --- collection.json ---');
  const collectionPath = path.join(chainDir, 'contract', 'collection.json');

  if (!fs.existsSync(collectionPath)) {
    report.error(`[${chainKey}] contract/collection.json not found`);
    return;
  }

  let meta;
  try {
    meta = readJsonFile(collectionPath);
  } catch (e) {
    report.error(`[${chainKey}] contract/collection.json: invalid JSON — ${e.message}`);
    return;
  }

  let ok = true;
  for (const field of ['name', 'description', 'image']) {
    if (!meta[field] || typeof meta[field] !== 'string' || meta[field].trim() === '') {
      report.error(`[${chainKey}] contract/collection.json: missing or empty required field "${field}"`);
      ok = false;
    }
  }

  if (ok) {
    report.ok(`[${chainKey}] contract/collection.json present with required fields`);
  }
}

// ---------------------------------------------------------------------------
// Check 2–9: Token metadata
// ---------------------------------------------------------------------------

/**
 * Reads all token metadata files from the chain's metadata directory,
 * parses each one, and returns an array of parsed token objects with their
 * file names and parsed content. Errors are recorded in report.
 *
 * @returns {{ tokenId: number, meta: object }[]}
 */
function readTokenFiles(chainDir, chainKey, report) {
  const metadataDir = path.join(chainDir, 'metadata');

  if (!fs.existsSync(metadataDir)) {
    report.error(`[${chainKey}] metadata/ directory not found`);
    return [];
  }

  const files = fs.readdirSync(metadataDir)
    .filter(f => f.endsWith('.json'))
    .sort((a, b) => Number(a.replace('.json', '')) - Number(b.replace('.json', '')));

  const tokens = [];
  for (const file of files) {
    const stem    = file.replace(/\.json$/, '');
    const tokenId = Number(stem);

    if (!Number.isInteger(tokenId) || tokenId <= 0 || String(tokenId) !== stem) {
      report.error(`[${chainKey}] metadata/${file}: file name is not a valid positive integer token ID`);
      continue;
    }

    const filePath = path.join(metadataDir, file);
    let meta;
    try {
      meta = readJsonFile(filePath);
    } catch (e) {
      report.error(`[${chainKey}] metadata/${file}: invalid JSON — ${e.message}`);
      continue;
    }

    tokens.push({ tokenId, meta });
  }

  return tokens;
}

/**
 * Validates metadata completeness and image URL for a single token.
 * Returns an object with the token's classified theme/tier/option, or null on error.
 */
function validateOneToken(tokenId, meta, chainKey, report) {
  const fileName = `metadata/${tokenId}.json`;
  let hasError   = false;

  // Check 8: required top-level fields
  for (const field of ['name', 'description', 'image']) {
    if (meta[field] === undefined || meta[field] === null) {
      report.error(`[${chainKey}] ${fileName}: missing required field "${field}"`);
      hasError = true;
    } else if (typeof meta[field] !== 'string' || meta[field].trim() === '') {
      report.error(`[${chainKey}] ${fileName}: "${field}" must be a non-empty string`);
      hasError = true;
    }
  }

  if (!Array.isArray(meta.attributes)) {
    report.error(`[${chainKey}] ${fileName}: "attributes" must be an array`);
    return null;
  }

  // Check 9: image URL pattern
  const expectedImageUrl = `https://${NFT_DOMAIN}/${chainKey}/images/${tokenId}.png`;
  if (meta.image !== expectedImageUrl) {
    report.error(
      `[${chainKey}] ${fileName}: "image" must be "${expectedImageUrl}" ` +
      `(got: "${meta.image}")`
    );
    hasError = true;
  }

  // Extract attributes needed for distribution checks
  const game     = getAttributeValue(meta.attributes, 'Game');
  const option   = getAttributeValue(meta.attributes, 'Option');
  const booster  = getAttributeValue(meta.attributes, 'Booster');

  if (!game) {
    report.error(`[${chainKey}] ${fileName}: missing required attribute "Game"`);
    hasError = true;
  }
  if (!option) {
    report.error(`[${chainKey}] ${fileName}: missing required attribute "Option"`);
    hasError = true;
  }
  if (!booster) {
    report.error(`[${chainKey}] ${fileName}: missing required attribute "Booster"`);
    hasError = true;
  }

  if (hasError || !game || !option || !booster) return null;

  const themeId = GAME_TO_THEME_ID[game];
  const tierId  = BOOSTER_TO_TIER_ID[booster];

  if (!themeId) {
    report.error(`[${chainKey}] ${fileName}: unrecognised "Game" value "${game}"`);
    return null;
  }
  if (!tierId) {
    report.error(`[${chainKey}] ${fileName}: unrecognised "Booster" value "${booster}"`);
    return null;
  }

  return { themeId, tierId, option };
}

/**
 * Validates all token metadata for a chain and enforces distribution rules.
 */
function validateTokenMetadata(chainDir, chainKey, report) {
  console.log('\n  --- Token metadata ---');

  const tokens = readTokenFiles(chainDir, chainKey, report);

  if (tokens.length === 0) {
    report.error(`[${chainKey}] No token metadata files found — has metadata been generated?`);
    return;
  }

  // Check 2: exactly 600 tokens
  if (tokens.length !== TOTAL_PER_CHAIN) {
    report.error(
      `[${chainKey}] Expected ${TOTAL_PER_CHAIN} token metadata files, found ${tokens.length}`
    );
  } else {
    report.ok(`[${chainKey}] Token count: ${tokens.length} (correct)`);
  }

  // Check 3: unique token IDs spanning 1–600 with no gaps
  const idSet  = new Set(tokens.map(t => t.tokenId));
  if (idSet.size !== tokens.length) {
    report.error(`[${chainKey}] Duplicate token IDs detected in metadata/ directory`);
  } else {
    const sortedIds = [...idSet].sort((a, b) => a - b);
    let idRangeOk   = true;
    for (let i = 0; i < sortedIds.length; i++) {
      if (sortedIds[i] !== i + 1) {
        report.error(
          `[${chainKey}] Token ID sequence has a gap or mismatch: ` +
          `expected ${i + 1}, found ${sortedIds[i]}`
        );
        idRangeOk = false;
        break;
      }
    }
    if (idRangeOk && sortedIds.length === TOTAL_PER_CHAIN) {
      report.ok(`[${chainKey}] Token IDs are unique and span 1–${TOTAL_PER_CHAIN} with no gaps`);
    }
  }

  // Validate individual tokens and collect distribution data
  // themeCounts[themeId] = count
  // tierCounts[themeId][tierId] = count
  // optionCounts[themeId][tierId][optionValue] = count
  const themeCounts  = { coin: 0, dice: 0, rps: 0 };
  const tierCounts   = { coin: {}, dice: {}, rps: {} };
  const optionCounts = { coin: {}, dice: {}, rps: {} };

  for (const tier of TIERS) {
    for (const theme of THEMES) {
      tierCounts[theme.id][tier.id]   = 0;
      optionCounts[theme.id][tier.id] = Object.create(null);
      for (const opt of theme.options) {
        optionCounts[theme.id][tier.id][opt] = 0;
      }
    }
  }

  let metadataErrorCount = 0;

  for (const { tokenId, meta } of tokens) {
    const classified = validateOneToken(tokenId, meta, chainKey, report);
    if (!classified) {
      metadataErrorCount++;
      continue;
    }

    const { themeId, tierId, option } = classified;

    // Check 4: token ID alignment with theme allocation ranges
    const theme     = THEMES.find(t => t.id === themeId);
    const [lo, hi]  = theme ? theme.range : [0, 0];
    if (tokenId < lo || tokenId > hi) {
      report.error(
        `[${chainKey}] metadata/${tokenId}.json: token ID ${tokenId} is outside the ` +
        `expected range for theme "${themeId}" (${lo}–${hi})`
      );
      metadataErrorCount++;
    }

    // Tally for distribution checks
    if (themeCounts[themeId] !== undefined) {
      themeCounts[themeId]++;
    }
    if (tierCounts[themeId] && tierCounts[themeId][tierId] !== undefined) {
      tierCounts[themeId][tierId]++;
    }
    if (
      optionCounts[themeId] &&
      optionCounts[themeId][tierId] &&
      optionCounts[themeId][tierId][option] !== undefined
    ) {
      optionCounts[themeId][tierId][option]++;
    } else if (
      optionCounts[themeId] &&
      optionCounts[themeId][tierId]
    ) {
      // Unexpected option value — track it anyway to surface the count mismatch
      optionCounts[themeId][tierId][option] = (optionCounts[themeId][tierId][option] || 0) + 1;
    }
  }

  if (metadataErrorCount > 0) {
    report.error(`[${chainKey}] ${metadataErrorCount} token metadata file(s) had errors (see above)`);
  } else {
    report.ok(`[${chainKey}] All ${tokens.length} token metadata files passed field validation`);
  }

  // Check 5: per-theme counts
  let themeCountsOk = true;
  for (const theme of THEMES) {
    if (themeCounts[theme.id] !== TOTAL_PER_THEME) {
      report.error(
        `[${chainKey}] ${theme.display} token count: expected ${TOTAL_PER_THEME}, ` +
        `got ${themeCounts[theme.id]}`
      );
      themeCountsOk = false;
    }
  }
  if (themeCountsOk) {
    report.ok(
      `[${chainKey}] Per-theme counts correct: ` +
      THEMES.map(t => `${t.display}=${themeCounts[t.id]}`).join(', ')
    );
  }

  // Check 6: per-tier counts per theme
  let tierCountsOk = true;
  for (const theme of THEMES) {
    for (const tier of TIERS) {
      const actual   = tierCounts[theme.id][tier.id];
      const expected = tier.count;
      if (actual !== expected) {
        report.error(
          `[${chainKey}] ${theme.display} ${tier.booster} count: ` +
          `expected ${expected}, got ${actual}`
        );
        tierCountsOk = false;
      }
    }
  }
  if (tierCountsOk) {
    report.ok(
      `[${chainKey}] Per-tier counts correct: ` +
      TIERS.map(t => `${t.booster}=${t.count}`).join(', ')
    );
  }

  // Check 7: per-option counts per (theme, tier)
  let optionCountsOk = true;
  for (const theme of THEMES) {
    for (const tier of TIERS) {
      const expectedMap = EXPECTED_COUNTS[theme.id][tier.id];
      const actualMap   = optionCounts[theme.id][tier.id];

      for (const opt of theme.options) {
        const expected = expectedMap[opt];
        const actual   = actualMap[opt] || 0;
        if (actual !== expected) {
          report.error(
            `[${chainKey}] ${theme.display} ${tier.booster} option "${opt}": ` +
            `expected ${expected}, got ${actual}`
          );
          optionCountsOk = false;
        }
      }

      // Also flag any unexpected option values that appeared
      for (const opt of Object.keys(actualMap)) {
        if (!Object.prototype.hasOwnProperty.call(expectedMap, opt)) {
          report.error(
            `[${chainKey}] ${theme.display} ${tier.booster}: ` +
            `unexpected option value "${opt}" (count: ${actualMap[opt]})`
          );
          optionCountsOk = false;
        }
      }
    }
  }
  if (optionCountsOk) {
    report.ok(`[${chainKey}] Per-option counts match expected remainder-distribution`);
  }
}

// ---------------------------------------------------------------------------
// Per-chain validation entry point
// ---------------------------------------------------------------------------

function validateChain(outputDir, chainKey, report) {
  const chainDir = path.join(outputDir, chainKey);
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Chain: ${chainKey}  (${chainDir})`);
  console.log('─'.repeat(60));

  if (!fs.existsSync(chainDir)) {
    report.error(`[${chainKey}] chain directory not found: ${chainDir}`);
    return;
  }

  // Check 1: collection metadata
  validateCollectionMetadata(chainDir, chainKey, report);

  // Checks 2–9: token metadata (counts, IDs, distribution, completeness, image URLs)
  validateTokenMetadata(chainDir, chainKey, report);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const args      = parseArgs(process.argv);
  const outputDir = path.resolve(args.output);
  const chains    = args.chain ? [args.chain] : ALL_CHAINS;

  console.log('='.repeat(60));
  console.log('NFT Generated Output Validation');
  console.log('='.repeat(60));
  console.log(`Output directory: ${outputDir}`);
  console.log(`Chains to check:  ${chains.join(', ')}`);

  if (!fs.existsSync(outputDir)) {
    console.error(`\nFATAL: output directory not found: ${outputDir}`);
    console.error('Run "npm run generate:metadata -- --all-mainnet" first.\n');
    process.exit(1);
  }

  const report = new Report();

  for (const chainKey of chains) {
    validateChain(outputDir, chainKey, report);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('Validation Summary');
  console.log('='.repeat(60));
  console.log(`  Chains checked: ${chains.length}`);
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
