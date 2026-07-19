#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const buildInfoDir = path.join(root, 'artifacts', 'build-info');
const outputArg = process.argv.indexOf('--output');
const outputRoot = path.resolve(
  root,
  outputArg >= 0 && process.argv[outputArg + 1]
    ? process.argv[outputArg + 1]
    : '.slither-artifacts'
);
const outputDir = path.join(outputRoot, 'build-info');

if (!fs.existsSync(buildInfoDir)) {
  throw new Error('Hardhat build information is missing. Run npm run compile first.');
}

const inputs = fs.readdirSync(buildInfoDir)
  .filter((file) => file.endsWith('.json') && !file.endsWith('.output.json'))
  .sort();

if (inputs.length === 0) {
  throw new Error('No Hardhat 3 build-information input was found.');
}

fs.mkdirSync(outputDir, { recursive: true });

for (const inputFile of inputs) {
  const inputPath = path.join(buildInfoDir, inputFile);
  const outputPath = path.join(buildInfoDir, inputFile.replace(/\.json$/, '.output.json'));
  if (!fs.existsSync(outputPath)) {
    throw new Error(`Missing paired Hardhat output: ${path.relative(root, outputPath)}`);
  }

  const buildInput = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const buildOutput = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
  if (buildInput.id !== buildOutput.id) {
    throw new Error(`Build-information ID mismatch for ${inputFile}`);
  }

  // crytic-compile currently expects the Hardhat 2 combined build-info shape.
  // Adapt Hardhat 3's split input/output without recompiling or changing bytecode.
  const combined = {
    id: buildInput.id,
    _format: 'hh-sol-build-info-1',
    solcVersion: buildInput.solcVersion,
    solcLongVersion: buildInput.solcLongVersion,
    input: buildInput.input,
    output: buildOutput.output,
  };
  fs.writeFileSync(path.join(outputDir, inputFile), `${JSON.stringify(combined)}\n`);
}

console.log(`Prepared ${inputs.length} Slither-compatible build-info file(s) in ${outputDir}`);
