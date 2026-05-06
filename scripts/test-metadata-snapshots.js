#!/usr/bin/env node
'use strict';

/**
 * test-metadata-snapshots.js
 *
 * Golden-file snapshot tests for generated NFT metadata output.
 *
 * Each snapshot case regenerates a representative token or collection metadata
 * document using the same builder functions as generate-nft-metadata.js and
 * performs a deep-equal comparison against the committed golden file in
 * nft-assets/snapshots/.
 *
 * If any field in the generated output differs from the golden file, the test
 * fails and prints a diff of every mismatched field so that the drift is
 * immediately visible.
 *
 * Usage:
 *   node scripts/test-metadata-snapshots.js          # run tests
 *   node scripts/test-metadata-snapshots.js --update # regenerate golden files
 *
 * Options:
 *   --update   Overwrite all golden files with the current generator output
 *              instead of comparing.  Use this after an intentional metadata
 *              format change has been reviewed and approved.
 *
 * Exit codes:
 *   0 — all snapshot comparisons passed (or golden files were updated)
 *   1 — one or more comparisons failed
 *
 * Golden files live in:
 *   nft-assets/snapshots/{chainKey}/metadata/{tokenId}.json   ← token metadata
 *   nft-assets/snapshots/{chainKey}/contract/collection.json  ← collection metadata
 */

const fs   = require('fs');
const path = require('path');

const {
  buildTokenMetadata,
  buildCollectionMetadata,
  generateTokenEntries,
  CHAIN_CONFIGS,
} = require('./generate-nft-metadata');

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const SNAPSHOTS_DIR = path.join(__dirname, '../nft-assets/snapshots');

/**
 * Snapshot test cases.
 *
 * Each entry specifies either a token metadata case (type:'token') or a
 * collection metadata case (type:'collection').  For token cases the tokenId
 * must be resolvable via generateTokenEntries() for the given chainKey.
 *
 * Coverage (minimum required by issue #47):
 *   - one Coin sample    → tokenId 1   (Coin Heads 2x)
 *   - one Dice sample    → tokenId 201 (Dice 1 2x)
 *   - one RPS sample     → tokenId 401 (RPS Rock 2x)
 *   - one collection     → ethereum
 *
 * Extended coverage (all three tiers × all three themes + polygon collection):
 */
const SNAPSHOT_CASES = [
  // ── Coin (token IDs 1–200) ─────────────────────────────────────────────
  { type: 'token',      chainKey: 'ethereum', tokenId: 1,   label: 'Coin Heads 2x Booster #1'       },
  { type: 'token',      chainKey: 'ethereum', tokenId: 136, label: 'Coin Tails 3x Booster #136'     },
  { type: 'token',      chainKey: 'ethereum', tokenId: 171, label: 'Coin Heads 5x Booster #171'     },
  // ── Dice (token IDs 201–400) ───────────────────────────────────────────
  { type: 'token',      chainKey: 'ethereum', tokenId: 201, label: 'Dice 1 2x Booster #201'         },
  { type: 'token',      chainKey: 'ethereum', tokenId: 337, label: 'Dice 4 3x Booster #337'         },
  { type: 'token',      chainKey: 'ethereum', tokenId: 396, label: 'Dice 6 5x Booster #396'         },
  // ── Rock Paper Scissors (token IDs 401–600) ────────────────────────────
  { type: 'token',      chainKey: 'ethereum', tokenId: 401, label: 'RPS Rock 2x Booster #401'       },
  { type: 'token',      chainKey: 'ethereum', tokenId: 525, label: 'RPS Paper 3x Booster #525'      },
  { type: 'token',      chainKey: 'ethereum', tokenId: 591, label: 'RPS Scissors 5x Booster #591'   },
  // ── Collection metadata ────────────────────────────────────────────────
  { type: 'collection', chainKey: 'ethereum', label: 'Collection metadata - Ethereum' },
  { type: 'collection', chainKey: 'polygon',  label: 'Collection metadata - Polygon'  },
];

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { update: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--update') {
      args.update = true;
    } else {
      console.error(`Unknown argument: ${argv[i]}`);
      process.exit(1);
    }
  }
  return args;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the base image URI for a given chain key, derived from the canonical
 * domain in CHAIN_CONFIGS so snapshot generation always matches the generator's
 * own domain logic.
 * @param {string} chainKey
 * @returns {string}
 */
function baseImageUri(chainKey) {
  const cfg = CHAIN_CONFIGS[chainKey];
  if (!cfg) {
    throw new Error(`Unknown chainKey "${chainKey}" — not present in CHAIN_CONFIGS`);
  }
  return `https://${cfg.domain}/${chainKey}/images/`;
}

/**
 * Returns the path of the golden file for a snapshot case.
 * @param {{ type: string, chainKey: string, tokenId?: number }} snapshotCase
 * @returns {string}
 */
function goldenFilePath(snapshotCase) {
  if (snapshotCase.type === 'token') {
    return path.join(SNAPSHOTS_DIR, snapshotCase.chainKey, 'metadata', `${snapshotCase.tokenId}.json`);
  }
  return path.join(SNAPSHOTS_DIR, snapshotCase.chainKey, 'contract', 'collection.json');
}

/**
 * Generates the current metadata object for a snapshot case.
 *
 * For token cases the token entry is looked up from generateTokenEntries();
 * for collection cases buildCollectionMetadata() is called directly.
 *
 * @param {{ type: string, chainKey: string, tokenId?: number }} snapshotCase
 * @param {Map<string, object[]>} entriesCache  - Cached token entry arrays, keyed by chainKey
 * @returns {object}  The generated metadata object
 */
function generateForCase(snapshotCase, entriesCache) {
  const { type, chainKey, tokenId } = snapshotCase;
  const imgBase = baseImageUri(chainKey);

  if (type === 'collection') {
    return buildCollectionMetadata(chainKey, imgBase);
  }

  // type === 'token'
  if (!entriesCache.has(chainKey)) {
    entriesCache.set(chainKey, generateTokenEntries(chainKey));
  }
  const entry = entriesCache.get(chainKey).find(e => e.tokenId === tokenId);
  if (!entry) {
    throw new Error(
      `Token ID ${tokenId} not found in generateTokenEntries('${chainKey}'). ` +
      `Valid range is 1–600.`
    );
  }
  return buildTokenMetadata(entry, imgBase);
}

// ---------------------------------------------------------------------------
// Deep-equal diff (without external dependencies)
// ---------------------------------------------------------------------------

/**
 * Recursively collects all differences between two plain JSON values.
 *
 * @param {*}      actual
 * @param {*}      expected
 * @param {string} keyPath  - Human-readable path from the root (e.g. "attributes[2].value")
 * @returns {string[]}      - Array of human-readable mismatch descriptions
 */
function collectDiffs(actual, expected, keyPath) {
  const diffs = [];

  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) {
      diffs.push(`${keyPath}: expected array, got ${typeof actual}`);
      return diffs;
    }
    if (actual.length !== expected.length) {
      diffs.push(`${keyPath}.length: expected ${expected.length}, got ${actual.length}`);
    }
    const len = Math.max(actual.length, expected.length);
    for (let i = 0; i < len; i++) {
      diffs.push(...collectDiffs(actual[i], expected[i], `${keyPath}[${i}]`));
    }
    return diffs;
  }

  if (expected !== null && typeof expected === 'object') {
    if (actual === null || typeof actual !== 'object' || Array.isArray(actual)) {
      diffs.push(`${keyPath}: expected object, got ${JSON.stringify(actual)}`);
      return diffs;
    }
    const allKeys = new Set([...Object.keys(expected), ...Object.keys(actual)]);
    for (const k of allKeys) {
      const nextPath = `${keyPath}.${k}`;
      if (!(k in expected)) {
        diffs.push(`${nextPath}: unexpected extra key with value ${JSON.stringify(actual[k])}`);
      } else if (!(k in actual)) {
        diffs.push(`${nextPath}: missing expected key (expected ${JSON.stringify(expected[k])})`);
      } else {
        diffs.push(...collectDiffs(actual[k], expected[k], nextPath));
      }
    }
    return diffs;
  }

  // Primitive comparison
  if (actual !== expected) {
    diffs.push(`${keyPath}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
  return diffs;
}

// ---------------------------------------------------------------------------
// Test runner
// ---------------------------------------------------------------------------

function runTests() {
  const args          = parseArgs(process.argv);
  const entriesCache  = new Map();
  let   passed        = 0;
  let   failed        = 0;
  let   updated       = 0;

  const modeLabel = args.update ? 'UPDATE' : 'COMPARE';

  console.log('='.repeat(60));
  console.log(`NFT Metadata Snapshot Tests  [${modeLabel}]`);
  console.log('='.repeat(60));
  console.log(`Snapshots dir : ${SNAPSHOTS_DIR}`);
  console.log(`Cases         : ${SNAPSHOT_CASES.length}`);
  if (args.update) {
    console.log('\n⚠  --update flag set — golden files will be overwritten.\n');
  }
  console.log('');

  for (const snapshotCase of SNAPSHOT_CASES) {
    const { label } = snapshotCase;
    const goldenPath = goldenFilePath(snapshotCase);

    // 1. Generate current output
    let generated;
    try {
      generated = generateForCase(snapshotCase, entriesCache);
    } catch (err) {
      console.error(`  ✗ FAIL  ${label}`);
      console.error(`    Error generating metadata: ${err.message}`);
      failed++;
      continue;
    }

    // 2. --update mode: write/overwrite golden file
    if (args.update) {
      try {
        fs.mkdirSync(path.dirname(goldenPath), { recursive: true });
        fs.writeFileSync(goldenPath, JSON.stringify(generated, null, 2) + '\n', 'utf-8');
        console.log(`  ↺ UPDATED  ${label}`);
        console.log(`    → ${goldenPath}`);
        updated++;
      } catch (err) {
        console.error(`  ✗ FAIL  ${label}`);
        console.error(`    Could not write golden file: ${err.message}`);
        failed++;
      }
      continue;
    }

    // 3. Compare mode: load golden file
    if (!fs.existsSync(goldenPath)) {
      console.error(`  ✗ FAIL  ${label}`);
      console.error(`    Golden file not found: ${goldenPath}`);
      console.error(`    Run with --update to create it.`);
      failed++;
      continue;
    }

    let golden;
    try {
      golden = JSON.parse(fs.readFileSync(goldenPath, 'utf-8'));
    } catch (err) {
      console.error(`  ✗ FAIL  ${label}`);
      console.error(`    Could not parse golden file: ${err.message}`);
      failed++;
      continue;
    }

    // 4. Deep-equal diff
    const diffs = collectDiffs(generated, golden, '<root>');
    if (diffs.length === 0) {
      console.log(`  ✓ PASS  ${label}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL  ${label}`);
      console.error(`    Golden file: ${goldenPath}`);
      console.error(`    Differences (${diffs.length}):`);
      for (const d of diffs) {
        console.error(`      • ${d}`);
      }
      failed++;
    }
  }

  // Summary
  console.log('');
  console.log('='.repeat(60));
  if (args.update) {
    console.log(`Updated: ${updated}   Errors: ${failed}`);
    console.log('='.repeat(60));
    if (failed > 0) {
      console.error(`\n✗ ${failed} golden file(s) could not be updated.\n`);
      process.exit(1);
    }
    console.log(`\n✓ ${updated} golden file(s) updated successfully.\n`);
    process.exit(0);
  } else {
    console.log(`Passed: ${passed}   Failed: ${failed}   Total: ${passed + failed}`);
    console.log('='.repeat(60));
    if (failed > 0) {
      console.error(
        `\n✗ ${failed} snapshot(s) failed.  If the output change is intentional,` +
        ` run:\n\n    node scripts/test-metadata-snapshots.js --update\n`
      );
      process.exit(1);
    }
    console.log('\n✓ All snapshots passed.\n');
    process.exit(0);
  }
}

runTests();
