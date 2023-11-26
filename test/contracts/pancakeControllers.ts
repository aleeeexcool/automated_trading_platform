import { expect } from "chai";
import { config, deployments, ethers } from "hardhat";
import { Signer } from "ethers";
import {
  GenericERC20,
  MasterChefStub,
  PancakeStableSwap,
  StableSwapRouterMasterChefController,
  StrategyManagerV3,
  UniswapUnboundController,
  UniSwapV2RouterStub,
} from "../../typechain";
// import StableSwapRouterMasterChefControllerArtifact from "../../artifacts/contracts/controllers/pancake/StableSwapRouterMasterChefController.sol/StableSwapRouterMasterChefController.json";
import { getCurrentBlockTimestamp, parseEtherNumber } from "../testUtils";
// import { getSignatureFromTransactionParams } from "../../src/core/services/sign";
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
      const executeDeployData =
        StableSwapRoutermasterChefControllerInterface.encodeFunctionData(
          `${controllerFunctionName}(bytes calldata data)`,
          [deployParams]
        );
      cycleSteps.push({
        controllerId: ethers.utils.hexZeroPad(operation.id, 32),
        data: executeDeployData,
      });
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
  const StableSwapRoutermasterChefControllerInterface =
    new ethers.utils.Interface(
      StableSwapRouterMasterChefControllerArtifact.abi
    );
  let signers: Array<Signer>;
  let owner: Signer;
  let LPUser: Signer;
  let LPUser2: Signer;
  let LPUserAddress: string;
  let LPUser2Address: string;
  let USDC: GenericERC20;
  let USDT: GenericERC20;
  let BUSD: GenericERC20;
  let strategyManagerV3: StrategyManagerV3;
  let uniSwapV2RouterStub: UniSwapV2RouterStub;
  let masterChefStub: MasterChefStub;
  let pancakeStableSwapStub: PancakeStableSwap;
  let uniSwapV2RouterController: UniswapUnboundController;
  let stableSwapRouterMasterChefController: StableSwapRouterMasterChefController;

  const setupTest = deployments.createFixture(async ({ ethers }) => {
    signers = await ethers.getSigners();
    [owner, LPUser, LPUser2] = signers;
    const accounts = config.networks.hardhat.accounts;
    const managerSigner = ethers.Wallet.fromMnemonic(
      // @ts-ignore
      accounts.mnemonic,
      // @ts-ignore
      accounts.path + "0"
    );
    process.env.SIGNER_PRIVATE_KEY = managerSigner.privateKey;
    LPUserAddress = await LPUser.getAddress();
    LPUser2Address = await LPUser2.getAddress();
    const GenericERC20 = await ethers.getContractFactory("GenericERC20");
    USDC = await GenericERC20.connect(owner).deploy("USDC", "USDC");
    await USDC.deployed();
    USDT = await GenericERC20.connect(owner).deploy("USDT", "USDT");
    await USDT.deployed();
    BUSD = await GenericERC20.connect(owner).deploy("DAI", "DAI");
    await BUSD.deployed();
    const StrategyManagerV3Factory = await ethers.getContractFactory(
      "StrategyManagerV3"
    );
    strategyManagerV3 = await StrategyManagerV3Factory.connect(owner).deploy();
    await strategyManagerV3.deployed();
    await strategyManagerV3.initialize();
    await strategyManagerV3.setSigner(managerSigner.address);
    // Router stub
    const UniSwapV2RouterStub = await ethers.getContractFactory(
      "UniSwapV2RouterStub"
    );
    uniSwapV2RouterStub = await UniSwapV2RouterStub.connect(owner).deploy();
    // PancakeStableSwap
    const pancakeStableSwapFactory = await ethers.getContractFactory(
      "PancakeStableSwap"
    );
    pancakeStableSwapStub = await pancakeStableSwapFactory
      .connect(owner)
      .deploy();
    await pancakeStableSwapStub
      .connect(owner)
      .initialize(
        [USDT.address, BUSD.address],
        "1000",
        "15000000",
        "5000000000",
        await owner.getAddress()
      );
    // MasterChef
    const MasterChefStubFactory = await ethers.getContractFactory(
      "MasterChefStub"
    );
    masterChefStub = await MasterChefStubFactory.connect(owner).deploy();
    const LP = await pancakeStableSwapStub.token();
    await masterChefStub.add("100", LP);
    // Controllers
    const UniswapUnboundController = await ethers.getContractFactory(
      "UniswapUnboundController"
    );
    uniSwapV2RouterController = await UniswapUnboundController.connect(
      owner
    ).deploy(uniSwapV2RouterStub.address);
    await uniSwapV2RouterController.deployed();
    const StableSwapRouterMasterChefControllerFactory =
      await ethers.getContractFactory("StableSwapRouterMasterChefController");
    stableSwapRouterMasterChefController =
      await StableSwapRouterMasterChefControllerFactory.connect(owner).deploy(
        pancakeStableSwapStub.address,
        masterChefStub.address,
        strategyManagerV3.address
      );
    await stableSwapRouterMasterChefController.deployed();
    await strategyManagerV3.registerController(
      controllerIdUSDTBUSD,
      stableSwapRouterMasterChefController.address,
      true
    );
    await strategyManagerV3.registerController(
      controllerIdSwap,
      uniSwapV2RouterController.address,
      false
    );
    // mint token for LP user
    await USDC.mint(LPUserAddress, String(100e18));
    await USDC.mint(LPUser2Address, String(100e18));
    // mint tokens for Uniswap Router
    await USDC.mint(uniSwapV2RouterStub.address, parseEtherNumber(100_000));
    await USDT.mint(uniSwapV2RouterStub.address, parseEtherNumber(100_000));
    await BUSD.mint(uniSwapV2RouterStub.address, parseEtherNumber(100_000));
    // mint tokens for Pancake StableSwap Router
    await USDT.mint(await owner.getAddress(), parseEtherNumber(100_000));
    await BUSD.mint(await owner.getAddress(), parseEtherNumber(100_000));
    await USDT.connect(owner).approve(
      pancakeStableSwapStub.address,
      parseEtherNumber(100_000)
    );
    await BUSD.connect(owner).approve(
      pancakeStableSwapStub.address,
      parseEtherNumber(100_000)
    );
  });

  beforeEach(async () => {
    await setupTest();
  });

  describe("Deposit and withdraw combined cases", () => {
    it("Deposit and withdraw 50%, transactions should be confirmed", async function () {
      const depositAmount = String(100e18);
      await strategyManagerV3.connect(owner).registerToken(USDC.address);
      await USDC.connect(LPUser).approve(
        strategyManagerV3.address,
        depositAmount
      );
      await deposit(USDC, depositAmount, LPUser, [
        {
          id: controllerIdSwap,
          amount: "",
          swapParams: {
            amountIn: String(50e18),
            amountOutMin: String(50e18),
            path: [USDC.address, USDT.address],
            to: strategyManagerV3.address,
            deadline: (await getCurrentBlockTimestamp()) + 120,
          },
        },
        {
          id: controllerIdSwap,
          amount: "",
          swapParams: {
            amountIn: String(50e18),
            amountOutMin: String(50e18),
            path: [USDC.address, BUSD.address],
            to: strategyManagerV3.address,
            deadline: (await getCurrentBlockTimestamp()) + 120,
          },
        },
        {
          id: controllerIdUSDTBUSD,
          amount: "",
          amounts: [String(50e18), String(50e18)],
        },
      ]);
      const userSharesUSDC = await strategyManagerV3.accountTokenBalances(
        LPUserAddress,
        stableSwapRouterMasterChefController.address
      );
      expect(userSharesUSDC).to.be.equal(String(100e18));
      await withdraw(USDC, 50, LPUser, [
        { id: controllerIdUSDTBUSD, amount: String(50e18) },
        {
          id: controllerIdSwap,
          amount: "",
          swapParams: {
            amountIn: String(25e18),
            amountOutMin: String(25e18),
            path: [USDT.address, USDC.address],
            to: strategyManagerV3.address,
            deadline: (await getCurrentBlockTimestamp()) + 120,
          },
        },
        {
          id: controllerIdSwap,
          amount: "",
          swapParams: {
            amountIn: String(25e18),
            amountOutMin: String(25e18),
            path: [BUSD.address, USDC.address],
            to: strategyManagerV3.address,
            deadline: (await getCurrentBlockTimestamp()) + 120,
          },
        },
      ]);
    });
  });
});

