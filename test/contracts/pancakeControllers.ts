import { deployments, ethers } from "hardhat";
import { Signer } from "ethers";
import {
  GenericERC20,
  StrategyManagerV3
} from "../../typechain";
import { getSignatureFromTransactionParams } from "../../src/core/services/sign";
import { ChainId } from "../../src/core/common/chainId";

describe("StrategyManagerV3", function () {
  const mapOperationsToCycleSteps = (
    operations: {
      id: Uint8Array;
      amount: string;
      swapParams?: {
        amountIn: string;
        amountOutMin: string;
        path: string[];
        to: string;
        deadline: number;
      };
    }[],
    isWithdraw = false
  ) => {
    const cycleSteps = [];
    for (const operation of operations) {
      const deployParams = operation.swapParams
        ? ethers.utils.defaultAbiCoder.encode(
            ["uint256", "uint256", "address[]", "address", "uint256"],
            [
              operation.swapParams.amountIn,
              operation.swapParams.amountOutMin,
              operation.swapParams.path,
              operation.swapParams.to,
              operation.swapParams.deadline,
            ]
          )
        : ethers.utils.defaultAbiCoder.encode(
            [
              "address",
              "address",
              "uint",
              "uint",
              "uint",
              "address",
              "uint256",
            ],
            isWithdraw
              ? [
                  USDT.address,
                  BUSD.address,
                  String(50e18),
                  String(25e18),
                  String(25e18),
                  strategyManagerV3.address,
                  "0",
                ]
              : [
                  USDT.address,
                  BUSD.address,
                  String(50e18),
                  String(50e18),
                  "0",
                  strategyManagerV3.address,
                  "0",
                ]
          );
      const controllerFunctionName =
        !isWithdraw || (isWithdraw && operation.swapParams)
          ? "deploy"
          : "withdraw";
    }
    return cycleSteps;
  };
  const deposit = async (
    depositToken: GenericERC20,
    depositAmount: string,
    signer: Signer,
    operations: {
      id: Uint8Array;
      amount: string;
      amounts?: string[];
      swapParams?: {
        amountIn: string;
        amountOutMin: string;
        path: string[];
        to: string;
        deadline: number;
      };
    }[],
    depositAmountToBreach?: string
  ) => {
    const cycleSteps = mapOperationsToCycleSteps(operations, false);
    const signature = await getSignatureFromTransactionParams(
      ChainId.BSC,
      depositToken.address,
      depositAmount,
      cycleSteps
    );
    await strategyManagerV3
      .connect(signer)
      .deposit(
        depositAmountToBreach || depositAmount,
        depositToken.address,
        cycleSteps,
        signature
      );
  };

  const withdraw = async (
    depositToken: GenericERC20,
    withdrawPercent: number,
    signer: Signer,
    operations: {
      id: Uint8Array;
      amount: string;
      swapParams?: {
        amountIn: string;
        amountOutMin: string;
        path: string[];
        to: string;
        deadline: number;
      };
    }[]
  ) => {
    const cycleSteps = mapOperationsToCycleSteps(operations, true);
    const signature = await getSignatureFromTransactionParams(
      ChainId.BSC,
      depositToken.address,
      withdrawPercent.toString(),
      cycleSteps
    );
    await strategyManagerV3
      .connect(signer)
      .withdraw(depositToken.address, withdrawPercent, cycleSteps, signature);
  };
  const controllerIdUSDTBUSD = ethers.utils.zeroPad(
    ethers.utils.toUtf8Bytes("router-masterchef-USDT-BUSD"),
    32
  );
  const controllerIdSwap = ethers.utils.zeroPad(
    ethers.utils.toUtf8Bytes("pancake-swap"),
    32
  );
  
  let signers: Array<Signer>;
  let owner: Signer;
  let LPUser: Signer;
  let LPUser2: Signer;
  let USDT: GenericERC20;
  let BUSD: GenericERC20;
  let strategyManagerV3: StrategyManagerV3;

  const setupTest = deployments.createFixture(async ({ ethers }) => {
    signers = await ethers.getSigners();
    [owner, LPUser, LPUser2] = signers;
    
  });

//   beforeEach(async () => {
//     await setupTest();
//   });
});

