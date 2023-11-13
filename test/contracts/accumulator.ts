import { expect } from "chai";
import { deployments, ethers } from "hardhat";
import { Signer } from "ethers";
import { Accumulator, TestToken, StrategyManagerV5 } from "../../typechain";

describe('Accumulator', () => {
    let signers: Array<Signer>;
    let owner: Signer;
    let user1: Signer;
    let user2: Signer;
    let strategyManager1: Signer;
    let strategyManager2: Signer;

    let ownerAddress: string
    let user1Address: string;
    let user2Address: string;
    let strategyManager1Address: string;
    let strategyManager2Address: string;
    let accumulatorAddress: string;
    let erc20TokenAddress: string;
    let strategyManagerContractAddress1: string;
    let strategyManagerContractAddress2: string;

    let accumulator: Accumulator;
    let erc20Token: TestToken;
    let strategyManagerContract1: StrategyManagerV5;
    let strategyManagerContract2: StrategyManagerV5;

    const setup = deployments.createFixture(async ({ ethers }) => {
      signers = await ethers.getSigners();
      [
        owner,
        user1,
        user2,
        strategyManager1,
        strategyManager2
      ] = signers;

      ownerAddress = await owner.getAddress();
      user1Address = await user1.getAddress();
      user2Address = await user2.getAddress();
      strategyManager1Address = await strategyManager1.getAddress();
      strategyManager2Address = await strategyManager2.getAddress();

      const AccumulatorFactory = await ethers.getContractFactory("Accumulator");
      accumulator = await AccumulatorFactory.connect(owner).deploy();
      await accumulator.deployed();
      accumulatorAddress = accumulator.address;

      const TestTokenFactory = await ethers.getContractFactory("TestToken");
      erc20Token = await TestTokenFactory.connect(owner).deploy(250000);
      await erc20Token.deployed();
      erc20TokenAddress = erc20Token.address;
      await erc20Token.transfer(user1Address, 100000);
      await erc20Token.transfer(user2Address, 100000);
      await erc20Token.connect(user1).approve(accumulatorAddress, 75000);
      await erc20Token.connect(user2).approve(accumulatorAddress, 75000);

      const strategyManagerContractFactory1 = await ethers.getContractFactory("StrategyManagerV5");
      strategyManagerContract1 = await strategyManagerContractFactory1.connect(owner).deploy();
      await strategyManagerContract1.deployed();
      strategyManagerContractAddress1 = strategyManagerContract1.address;

      const strategyManagerContractFactory2 = await ethers.getContractFactory("StrategyManagerV5");
      strategyManagerContract2 = await strategyManagerContractFactory2.connect(owner).deploy();
      await strategyManagerContract2.deployed();
      strategyManagerContractAddress2 = strategyManagerContract2.address;
    });

    beforeEach(async () => {
        await setup();
    });

    describe('Deployment', () => {
      it('should deployed with the right owner', async () => {
        const contractOwner = await accumulator.owner();
        expect(contractOwner).to.equal(ownerAddress);
      });
    });

    describe('Strategy registration', () => {
      it('registerStrategy(): should register new strategies', async () => {
        const strategies = await accumulator.getStrategies();
        expect(strategies).to.be.an("array").that.is.empty;

        await accumulator.registerStrategy(strategyManagerContractAddress1);
        await accumulator.registerStrategy(strategyManagerContractAddress2);
        const result = await accumulator.getStrategies();

        result.forEach((address) => {
          expect(ethers.utils.isAddress(address)).to.be.true;
        });
      });

      it('registerStrategy(): should only allow owner to register a strategy', async () => {
        await expect(accumulator.connect(user1).registerStrategy(strategyManagerContractAddress1))
          .to.be.revertedWith("Ownable: caller is not the owner");
      });
      it('registerStrategy(): should revert when register a zero address strategy', async () => {
        const strategy = "0x0000000000000000000000000000000000000000";

        await expect(accumulator.registerStrategy(strategy)).to.be.revertedWith("INVALID_STRATEGY");
      });

      it('unRegisterStrategy(): should unregister strategy', async () => {
        await accumulator.registerStrategy(strategyManagerContractAddress1);
        await accumulator.registerStrategy(strategyManagerContractAddress2);
        const beforeUnregister = await accumulator.getStrategies();

        expect(beforeUnregister).to.include(strategyManagerContractAddress1, strategyManagerContractAddress2);

        await accumulator.unRegisterStrategy(strategyManagerContractAddress1);
        const deleteOneStrategy = await accumulator.getStrategies(); 

        expect(deleteOneStrategy).to.not.include(strategyManagerContractAddress1);

        await accumulator.unRegisterStrategy(strategyManagerContractAddress2);
        const afterUnregister = await accumulator.getStrategies();

        expect(afterUnregister).to.be.an("array").that.is.empty;
      });

      it('unRegisterStrategy(): should only allow owner to unregister strategy', async () => {
        await expect(accumulator.connect(user2).unRegisterStrategy(strategyManagerContractAddress1))
          .to.be.revertedWith("Ownable: caller is not the owner");
      });
    });

    describe('Deposit', () => {
      it('deposit(): should allow user to deposit tokens', async () => {
        await accumulator.registerStrategy(strategyManagerContractAddress1);
        await accumulator.connect(user1).deposit(erc20TokenAddress, strategyManagerContractAddress1, 20000);

        expect(await erc20Token.balanceOf(accumulatorAddress))
          .to.be.equal(20000);
        expect(await accumulator.balanceOf(erc20TokenAddress, strategyManagerContractAddress1, user1Address))
          .to.be.equal(20000);
        expect(await accumulator.balanceOfStrategy(erc20TokenAddress, strategyManagerContractAddress1))
          .to.be.equal(20000);
      });

      it('deposit(): should not allow user to deposit tokens if strategy is on pause', async () => {
        await accumulator.registerStrategy(strategyManagerContractAddress1);
        await strategyManagerContract1.initialize();
        await strategyManagerContract1.startCycleRollover();

        await expect(accumulator.connect(user1).deposit(erc20TokenAddress, strategyManagerContractAddress1, 20000))
          .to.be.revertedWith("STRATEGY_IS_UNAVAILABLE");
      });

      it('withdraw(): should allow different users to deposit and withdraw tokens', async () => {
        await accumulator.registerStrategy(strategyManagerContractAddress1);
        await accumulator.connect(user1).deposit(erc20TokenAddress, strategyManagerContractAddress1, 10000);

        expect(await erc20Token.balanceOf(accumulatorAddress))
          .to.be.equal(10000);
        expect(await erc20Token.balanceOf(user1Address))
          .to.be.equal(90000);
        expect(await accumulator.balanceOf(erc20TokenAddress, strategyManagerContractAddress1, user1Address))
          .to.be.equal(10000);
        expect(await accumulator.balanceOfStrategy(erc20TokenAddress, strategyManagerContractAddress1))
          .to.be.equal(10000);

        await accumulator.connect(user1).deposit(erc20TokenAddress, strategyManagerContractAddress1, 5000);

        expect(await erc20Token.balanceOf(accumulatorAddress))
          .to.be.equal(15000);
        expect(await erc20Token.balanceOf(user1Address))
          .to.be.equal(85000);
        expect(await accumulator.balanceOf(erc20TokenAddress, strategyManagerContractAddress1, user1Address))
          .to.be.equal(15000);
        expect(await accumulator.balanceOfStrategy(erc20TokenAddress, strategyManagerContractAddress1))
          .to.be.equal(15000);

        await accumulator.registerStrategy(strategyManagerContractAddress2);
        await accumulator.connect(user2).deposit(erc20TokenAddress, strategyManagerContractAddress2, 3500);

        expect(await erc20Token.balanceOf(accumulatorAddress))
          .to.be.equal(18500);
        expect(await erc20Token.balanceOf(user2Address))
          .to.be.equal(96500);
        expect(await accumulator.balanceOf(erc20TokenAddress, strategyManagerContractAddress2, user2Address))
          .to.be.equal(3500);
        expect(await accumulator.balanceOfStrategy(erc20TokenAddress, strategyManagerContractAddress2))
          .to.be.equal(3500);

        await accumulator.connect(user2).deposit(erc20TokenAddress, strategyManagerContractAddress2, 10000);

        expect(await erc20Token.balanceOf(accumulatorAddress))
          .to.be.equal(28500);
        expect(await erc20Token.balanceOf(user2Address))
          .to.be.equal(86500);
        expect(await accumulator.balanceOf(erc20TokenAddress, strategyManagerContractAddress2, user2Address))
          .to.be.equal(13500);
        expect(await accumulator.balanceOfStrategy(erc20TokenAddress, strategyManagerContractAddress2))
          .to.be.equal(13500);
      });
    });

    describe('Withdraw by strategy', () => {
      // Need to "off" require(!isStrategyOnPause(strategy)) in deposit() because in these cases, strategy is like a signer, 
      // not a contract, so it will not pass the require.
      it('withdrawByStrategy(): should allow strategy to withdraw tokens', async () => {
        await accumulator.registerStrategy(strategyManager1Address);
        await accumulator.connect(user1).deposit(erc20TokenAddress, strategyManager1Address, 10000);
        await accumulator.connect(strategyManager1).withdrawByStrategy(erc20TokenAddress);

        expect(await erc20Token.balanceOf(strategyManager1Address))
          .to.be.equal(10000);
        expect(await erc20Token.balanceOf(accumulatorAddress))
          .to.be.equal(0);
        expect(await accumulator.balanceOf(erc20TokenAddress, strategyManager1Address, user1Address))
          .to.be.equal(0);
        expect(await accumulator.balanceOfStrategy(erc20TokenAddress, strategyManager1Address))
          .to.be.equal(0);
      });

      it('withdrawByStrategy(): should not allow another strategy to withdraw tokens', async () => {
        await accumulator.registerStrategy(strategyManager1Address);
        await accumulator.connect(user1).deposit(erc20TokenAddress, strategyManager1Address, 10000);
        await expect(accumulator.connect(strategyManager2).withdrawByStrategy(erc20TokenAddress))
          .to.be.revertedWith("INVALID_STRATEGY");
      });

      it('withdrawByStrategy(): should not allow strategy to withdraw tokens if it was unregistered and allow after it was re-registered again', async () => {
        await accumulator.registerStrategy(strategyManager1Address);
        await accumulator.connect(user1).deposit(erc20TokenAddress, strategyManager1Address, 15000);
        await accumulator.unRegisterStrategy(strategyManager1Address);

        await expect(accumulator.connect(strategyManager1).withdrawByStrategy(erc20TokenAddress))
          .to.be.revertedWith("INVALID_STRATEGY");

        await accumulator.registerStrategy(strategyManager1Address);
        await accumulator.connect(strategyManager1).withdrawByStrategy(erc20TokenAddress);

        expect(await erc20Token.balanceOf(strategyManager1Address))
          .to.be.equal(15000);
        expect(await erc20Token.balanceOf(accumulatorAddress))
          .to.be.equal(0);
        expect(await accumulator.balanceOf(erc20TokenAddress, strategyManager1Address, user1Address))
          .to.be.equal(0);
        expect(await accumulator.balanceOfStrategy(erc20TokenAddress, strategyManager1Address))
          .to.be.equal(0);
      });

      it('withdrawByStrategyForUser(): should allow strategies to withdraw tokens for users', async () => {
        await accumulator.registerStrategy(strategyManager2Address);
        await accumulator.connect(user2).deposit(erc20TokenAddress, strategyManager2Address, 12000);

        expect(await erc20Token.balanceOf(user2Address))
          .to.be.equal(88000);
        expect(await erc20Token.balanceOf(accumulatorAddress))
          .to.be.equal(12000);
        expect(await accumulator.balanceOf(erc20TokenAddress, strategyManager2Address, user2Address))
          .to.be.equal(12000);
        expect(await accumulator.balanceOfStrategy(erc20TokenAddress, strategyManager2Address))
          .to.be.equal(12000);

        await accumulator.connect(strategyManager2).withdrawByStrategyForUser(erc20TokenAddress, user2Address, 5000);

        expect(await erc20Token.balanceOf(strategyManager2Address))
          .to.be.equal(5000);
        expect(await erc20Token.balanceOf(accumulatorAddress))
          .to.be.equal(7000);
        expect(await accumulator.balanceOf(erc20TokenAddress, strategyManager2Address, user2Address))
          .to.be.equal(7000);
        expect(await accumulator.balanceOfStrategy(erc20TokenAddress, strategyManager2Address))
          .to.be.equal(7000);

        await accumulator.registerStrategy(strategyManager1Address);
        await accumulator.connect(user2).deposit(erc20TokenAddress, strategyManager1Address, 5000);

        expect(await erc20Token.balanceOf(user2Address))
          .to.be.equal(83000);
        expect(await erc20Token.balanceOf(accumulatorAddress))
          .to.be.equal(12000);
        expect(await accumulator.balanceOf(erc20TokenAddress, strategyManager1Address, user2Address))
          .to.be.equal(5000);
        expect(await accumulator.balanceOfStrategy(erc20TokenAddress, strategyManager1Address))
          .to.be.equal(5000);

        await accumulator.connect(strategyManager1).withdrawByStrategyForUser(erc20TokenAddress, user2Address, 5000);

        expect(await erc20Token.balanceOf(strategyManager1Address))
          .to.be.equal(5000);
        expect(await erc20Token.balanceOf(accumulatorAddress))
          .to.be.equal(7000);
        expect(await accumulator.balanceOf(erc20TokenAddress, strategyManager1Address, user2Address))
          .to.be.equal(0);
        expect(await accumulator.balanceOfStrategy(erc20TokenAddress, strategyManager1Address))
          .to.be.equal(0);
      });

      it('withdrawByStrategyForUser(): should not allow strategy to withdraw tokens for user if it was unregister and allow after it was re-registered again', async () => {
        await accumulator.registerStrategy(strategyManager2Address);
        await accumulator.connect(user2).deposit(erc20TokenAddress, strategyManager2Address, 17000);

        expect(await erc20Token.balanceOf(user2Address))
          .to.be.equal(83000);
        expect(await erc20Token.balanceOf(accumulatorAddress))
          .to.be.equal(17000);
        expect(await accumulator.balanceOf(erc20TokenAddress, strategyManager2Address, user2Address))
          .to.be.equal(17000);
        expect(await accumulator.balanceOfStrategy(erc20TokenAddress, strategyManager2Address))
          .to.be.equal(17000);

        await accumulator.unRegisterStrategy(strategyManager2Address);

        await expect(accumulator.connect(strategyManager2).withdrawByStrategyForUser(erc20TokenAddress, user2Address, 10000))
          .to.be.revertedWith("INVALID_STRATEGY");

        await accumulator.registerStrategy(strategyManager2Address);
        await accumulator.connect(strategyManager2).withdrawByStrategyForUser(erc20TokenAddress, user2Address, 10000);

        expect(await erc20Token.balanceOf(strategyManager2Address))
          .to.be.equal(10000);
        expect(await erc20Token.balanceOf(accumulatorAddress))
          .to.be.equal(7000);
        expect(await accumulator.balanceOf(erc20TokenAddress, strategyManager2Address, user2Address))
          .to.be.equal(7000);
        expect(await accumulator.balanceOfStrategy(erc20TokenAddress, strategyManager2Address))
          .to.be.equal(7000);
      });
    });
  });
