import { HardhatUserConfig, subtask } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import path from "path";

// Override the solc build task to use the locally bundled solc compiler,
// avoiding network downloads in environments with restricted internet access.
subtask("compile:solidity:solc:get-build").setAction(
  async ({ solcVersion }: { quiet: boolean; solcVersion: string }) => {
    const solcPath = path.resolve(
      __dirname,
      "node_modules",
      "solc",
      "soljson.js"
    );
    return {
      compilerPath: solcPath,
      isSolcJs: true,
      version: solcVersion,
      longVersion: solcVersion,
    };
  }
);

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.26",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      evmVersion: "cancun",
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;
