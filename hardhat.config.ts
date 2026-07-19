import { configVariable, defineConfig } from "hardhat/config";
import hardhatToolboxMochaEthers from "@nomicfoundation/hardhat-toolbox-mocha-ethers";

const compiler = {
  version: "0.8.26",
  settings: {
    optimizer: { enabled: true, runs: 200 },
    evmVersion: "cancun",
  },
};

const httpNetwork = (chainId: number, chainType: "l1" | "op" = "l1") => ({
  type: "http" as const,
  chainType,
  url: configVariable("RPC_URL"),
  chainId,
});

export default defineConfig({
  plugins: [hardhatToolboxMochaEthers],
  solidity: {
    profiles: {
      default: compiler,
      production: compiler,
    },
  },
  paths: {
    sources: "./contracts",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  test: {
    mocha: {
      timeout: 40_000,
    },
  },
  typechain: {
    outDir: "typechain-types",
  },
  networks: {
    sepolia: httpNetwork(11155111),
    mainnet: httpNetwork(1),
    polygon_amoy: httpNetwork(80002),
    polygon: httpNetwork(137),
    optimism_sepolia: httpNetwork(11155420, "op"),
    optimism: httpNetwork(10, "op"),
    bsc_testnet: httpNetwork(97),
    bsc: httpNetwork(56),
    avalanche_fuji: httpNetwork(43113),
    avalanche: httpNetwork(43114),
  },
  verify: {
    etherscan: {
      apiKey: configVariable("ETHERSCAN_API_KEY"),
    },
  },
});
