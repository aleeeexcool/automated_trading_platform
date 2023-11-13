import { expect } from "chai";
import { deployments, ethers } from "hardhat";
import { BigNumber, Signer } from "ethers";
import { BalanceTracker, DateTime } from "../../typechain";
import { parseEtherNumber } from "../testUtils";
import { getDateStart } from "../../src/core/util/dateStart";

describe("BalanceTracker", function () {
  let signers: Array<Signer>;
  let owner: Signer;
  let user: Signer;
  let user2: Signer;
  let strategyManager: Signer;
  let strategyManager2: Signer;
  let strategyManager3: Signer;
  let well: Signer;
  let well2: Signer;

  // let ownerAddress: string;
  let userAddress: string;
  let user2Address: string;
  let strategyManagerAddress: string;
  let strategyManager2Address: string;
  let strategyManager3Address: string;
  let wellAddress: string;
  let well2Address: string;

  let balanceTracker: BalanceTracker;
  let dateTime: DateTime;

  const setupTest = deployments.createFixture(async ({ ethers }) => {
    signers = await ethers.getSigners();
    [
      owner,
      user,
      user2,
      strategyManager,
      strategyManager2,
      strategyManager3,
      well,
      well2,
    ] = signers;

    // ownerAddress = await owner.getAddress();
    userAddress = await user.getAddress();
    user2Address = await user2.getAddress();
    strategyManagerAddress = await strategyManager.getAddress();
    strategyManager2Address = await strategyManager2.getAddress();
    strategyManager3Address = await strategyManager3.getAddress();
    wellAddress = await well.getAddress();
    well2Address = await well2.getAddress();

    const DateTimeFactory = await ethers.getContractFactory("DateTime");
    dateTime = await DateTimeFactory.connect(owner).deploy();
    await dateTime.deployed();

    const BalanceTrackerFactory = await ethers.getContractFactory(
      "BalanceTracker",
      {
        libraries: {
          DateTime: dateTime.address,
        },
      }
    );
    balanceTracker = await BalanceTrackerFactory.connect(owner).deploy();
    await balanceTracker.deployed();
    await balanceTracker.setStrategies(strategyManagerAddress, true);
    await balanceTracker.setStrategies(strategyManager2Address, true);
  });

  beforeEach(async () => {
    await setupTest();
  });

  describe("BalanceTracker strategies' registering", () => {
    it("Call registerate strategies' method by not owner", async function () {
      await expect(
        balanceTracker
          .connect(user2)
          .setStrategies(strategyManager3Address, true)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Call registerate strategies' method with a zero strategy's address", async function () {
      await expect(
        balanceTracker
          .connect(owner)
          .setStrategies(ethers.constants.AddressZero, true)
      ).to.be.revertedWith("INVALID_ADDRESS");
    });

    it("Call registerate strategies' method with strategy's address equals contracts' one", async function () {
      await expect(
        balanceTracker
          .connect(owner)
          .setStrategies(balanceTracker.address, true)
      ).to.be.revertedWith("INVALID_ADDRESS");
    });

    it("Call updating method by unregistered caller", async function () {
      await expect(
        balanceTracker
          .connect(strategyManager3)
          .updateBalances(userAddress, wellAddress, parseEtherNumber(1000), 0)
      ).to.be.revertedWith("ONLY_REGISTERED");
    });

    it("Call updating method by unregistered caller after his allowance was rejected", async function () {
      await balanceTracker
        .connect(owner)
        .setStrategies(strategyManager3Address, true);
      await balanceTracker
        .connect(strategyManager3)
        .updateBalances(userAddress, wellAddress, parseEtherNumber(1000), 0);

      const RECORD_PERIOD_IN_SECONDS =
        await balanceTracker.RECORD_PERIOD_IN_SECONDS();

      const dateNow = BigNumber.from((Date.now() / 1000).toFixed(0));
      const timestampFrom = dateNow.sub(RECORD_PERIOD_IN_SECONDS.mul(2));
      const timestampTo = dateNow.add(RECORD_PERIOD_IN_SECONDS.mul(2));

      const userDirectedBalances = await balanceTracker.getUserBalances(
        strategyManager3Address,
        userAddress,
        wellAddress,
        timestampFrom.toString(),
        timestampTo.toString()
      );
      expect(userDirectedBalances[0].deposit.toString()).to.be.equal(
        parseEtherNumber(1000)
      );
      await balanceTracker
        .connect(owner)
        .setStrategies(strategyManager3Address, false);
      await expect(
        balanceTracker
          .connect(strategyManager3)
          .updateBalances(userAddress, wellAddress, parseEtherNumber(1000), 0)
      ).to.be.revertedWith("ONLY_REGISTERED");
    });
  });

  describe("BalanceTracker direct updating", () => {
    it("Call updating method by one registered caller (DEPOSIT & WITHDRAWAL)", async function () {
      // First deposit by one user
      await balanceTracker
        .connect(strategyManager)
        .updateBalances(userAddress, wellAddress, parseEtherNumber(1000), 0);
      // Second deposit by one user
      await balanceTracker
        .connect(strategyManager)
        .updateBalances(userAddress, wellAddress, parseEtherNumber(1000), 0);
      // First deposit by another user
      await balanceTracker
        .connect(strategyManager)
        .updateBalances(user2Address, wellAddress, parseEtherNumber(1000), 0);

      // Define time-diapazone
      const RECORD_PERIOD_IN_SECONDS =
        await balanceTracker.RECORD_PERIOD_IN_SECONDS();
      const dateNow = BigNumber.from((Date.now() / 1000).toFixed(0));
      const timestampFrom = dateNow.sub(RECORD_PERIOD_IN_SECONDS.mul(2));
      const timestampTo = dateNow.add(RECORD_PERIOD_IN_SECONDS.mul(2));

      const userDirectedBalancesAfterDeposit =
        await balanceTracker.getUserBalances(
          strategyManagerAddress,
          userAddress,
          wellAddress,
          timestampFrom.toString(),
          timestampTo.toString()
        );
      await expect(
        userDirectedBalancesAfterDeposit[0].deposit.toString()
      ).to.be.equal(parseEtherNumber(2000));
      await expect(
        userDirectedBalancesAfterDeposit[0].withdraw.toString()
      ).to.be.equal(parseEtherNumber(0));

      // Check for periodTimestamp correction
      // TODO: simplify this block
      expect(
        Math.floor(
          Math.floor(
            parseInt(dateNow.toString()) -
              getDateStart(
                parseInt(
                  userDirectedBalancesAfterDeposit[0].timestamp.toString()
                ) * 1000
              ) /
                1000
          ) / parseInt(RECORD_PERIOD_IN_SECONDS.toString())
        ) % 1
      ).to.be.equal(0);

      const user2DirectedBalancesAfterDeposit =
        await balanceTracker.getUserBalances(
          strategyManagerAddress,
          user2Address,
          wellAddress,
          timestampFrom.toString(),
          timestampTo.toString()
        );
      await expect(
        user2DirectedBalancesAfterDeposit[0].deposit.toString()
      ).to.be.equal(parseEtherNumber(1000));
      await expect(
        user2DirectedBalancesAfterDeposit[0].withdraw.toString()
      ).to.be.equal(parseEtherNumber(0));

      const managerDirectedBalancesAfterDeposit =
        await balanceTracker.getManagerBalances(
          strategyManagerAddress,
          wellAddress,
          timestampFrom.toString(),
          timestampTo.toString()
        );
      await expect(
        managerDirectedBalancesAfterDeposit[0].deposit.toString()
      ).to.be.equal(parseEtherNumber(3000));
      await expect(
        managerDirectedBalancesAfterDeposit[0].withdraw.toString()
      ).to.be.equal(parseEtherNumber(0));

      // First withdrawal by one user
      await balanceTracker
        .connect(strategyManager)
        .updateBalances(userAddress, wellAddress, 0, parseEtherNumber(1000));
      // First withdrawal by another user
      await balanceTracker
        .connect(strategyManager)
        .updateBalances(user2Address, wellAddress, 0, parseEtherNumber(250));
      // Second withdrawal by another user
      await balanceTracker
        .connect(strategyManager)
        .updateBalances(user2Address, wellAddress, 0, parseEtherNumber(250));

      const userDirectedBalancesAfterWithdraw =
        await balanceTracker.getUserBalances(
          strategyManagerAddress,
          userAddress,
          wellAddress,
          timestampFrom.toString(),
          timestampTo.toString()
        );
      await expect(
        userDirectedBalancesAfterWithdraw[0].deposit.toString()
      ).to.be.equal(parseEtherNumber(2000));
      await expect(
        userDirectedBalancesAfterWithdraw[0].withdraw.toString()
      ).to.be.equal(parseEtherNumber(1000));

      const user2DirectedBalancesAfterWithdraw =
        await balanceTracker.getUserBalances(
          strategyManagerAddress,
          user2Address,
          wellAddress,
          timestampFrom.toString(),
          timestampTo.toString()
        );
      await expect(
        user2DirectedBalancesAfterWithdraw[0].deposit.toString()
      ).to.be.equal(parseEtherNumber(1000));
      await expect(
        user2DirectedBalancesAfterWithdraw[0].withdraw.toString()
      ).to.be.equal(parseEtherNumber(500));

      const managerDirectedBalancesAfterWithdraw =
        await balanceTracker.getManagerBalances(
          strategyManagerAddress,
          wellAddress,
          timestampFrom.toString(),
          timestampTo.toString()
        );
      await expect(
        managerDirectedBalancesAfterWithdraw[0].deposit.toString()
      ).to.be.equal(parseEtherNumber(3000));
      await expect(
        managerDirectedBalancesAfterWithdraw[0].withdraw.toString()
      ).to.be.equal(parseEtherNumber(1500));
    });
  });
});

