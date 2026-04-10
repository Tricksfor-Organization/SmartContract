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

// RPC URLs for each network are injected at runtime via environment variables
// so that secrets are never committed. The verify workflow uses --no-compile
// and passes the network key from the GitHub Environment variable NETWORK_KEY.
// Returns an empty string when the variable is not set so that hardhat fails
// immediately with a connection error rather than silently falling back to
// localhost and misconfiguring non-local deployments or verifications.
const rpcUrl = (envVar: string): string =>
  process.env[envVar]?.trim() ?? "";

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
  networks: {
    // Ethereum
    sepolia: {
      url: rpcUrl("RPC_URL"),
      chainId: 11155111,
    },
    mainnet: {
      url: rpcUrl("RPC_URL"),
      chainId: 1,
    },
    // Polygon
    polygon_amoy: {
      url: rpcUrl("RPC_URL"),
      chainId: 80002,
    },
    polygon: {
      url: rpcUrl("RPC_URL"),
      chainId: 137,
    },
    // Optimism
    optimism_sepolia: {
      url: rpcUrl("RPC_URL"),
      chainId: 11155420,
    },
    optimism: {
      url: rpcUrl("RPC_URL"),
      chainId: 10,
    },
    // BNB Smart Chain
    bsc_testnet: {
      url: rpcUrl("RPC_URL"),
      chainId: 97,
    },
    bsc: {
      url: rpcUrl("RPC_URL"),
      chainId: 56,
    },
    // Avalanche
    avalanche_fuji: {
      url: rpcUrl("RPC_URL"),
      chainId: 43113,
    },
    avalanche: {
      url: rpcUrl("RPC_URL"),
      chainId: 43114,
    },
  },
  etherscan: {
    // ETHERSCAN_API_KEY is set in the verify-contracts job from EXPLORER_API_KEY secret.
    // Many explorers use the same Etherscan-compatible API; the apiKey field here can be
    // overridden per-network via environment variable if required.
    apiKey: {
      mainnet: process.env.ETHERSCAN_API_KEY ?? "",
      sepolia: process.env.ETHERSCAN_API_KEY ?? "",
      polygon: process.env.ETHERSCAN_API_KEY ?? "",
      polygon_amoy: process.env.ETHERSCAN_API_KEY ?? "",
      // Optimism mainnet: hardhat-verify's built-in name is "optimisticEthereum" (chainId 10).
      // Include both to cover built-in lookup and custom network name lookup.
      optimism: process.env.ETHERSCAN_API_KEY ?? "",
      optimisticEthereum: process.env.ETHERSCAN_API_KEY ?? "",
      optimism_sepolia: process.env.ETHERSCAN_API_KEY ?? "",
      bsc: process.env.ETHERSCAN_API_KEY ?? "",
      bsc_testnet: process.env.ETHERSCAN_API_KEY ?? "",
      avalanche: process.env.ETHERSCAN_API_KEY ?? "",
      avalanche_fuji: process.env.ETHERSCAN_API_KEY ?? "",
    },
    customChains: [
      {
        network: "polygon_amoy",
        chainId: 80002,
        urls: {
          apiURL: "https://api-amoy.polygonscan.com/api",
          browserURL: "https://amoy.polygonscan.com",
        },
      },
      // Optimism mainnet: the hardhat-verify built-in entry uses "optimisticEthereum"
      // (not "optimism"). Adding an explicit customChains entry ensures the plugin
      // resolves the explorer URL correctly when --network optimism is used.
      {
        network: "optimism",
        chainId: 10,
        urls: {
          apiURL: "https://api-optimistic.etherscan.io/api",
          browserURL: "https://optimistic.etherscan.io",
        },
      },
      {
        network: "optimism_sepolia",
        chainId: 11155420,
        urls: {
          apiURL: "https://api-sepolia-optimism.etherscan.io/api",
          browserURL: "https://sepolia-optimism.etherscan.io",
        },
      },
      {
        network: "bsc_testnet",
        chainId: 97,
        urls: {
          apiURL: "https://api-testnet.bscscan.com/api",
          browserURL: "https://testnet.bscscan.com",
        },
      },
      {
        network: "avalanche_fuji",
        chainId: 43113,
        urls: {
          apiURL: "https://api-testnet.snowtrace.io/api",
          browserURL: "https://testnet.snowtrace.io",
        },
      },
      {
        network: "avalanche",
        chainId: 43114,
        urls: {
          apiURL: "https://api.snowtrace.io/api",
          browserURL: "https://snowtrace.io",
        },
      },
    ],
  },
};

export default config;
