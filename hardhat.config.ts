import { HardhatUserConfig, task } from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "hardhat-deploy";
import "hardhat-contract-sizer";

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.14",
        settings: {
          optimizer: {
            enabled: true,
            runs: 2000,
            details: {
              yul: true,
            },
          },
        },
      },
    ],
  },
  networks: {
    hardhat: {
      deploy: ["./scripts/deploy/bsc/"],
      allowUnlimitedContractSize: true,
    },
    localhost: {
      deploy: ["./scripts/deploy/ethereum/"],
    },
  },
  mocha: {
    timeout: 400000,
  },
};

export default config;
