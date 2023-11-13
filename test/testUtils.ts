// @ts-ignore
import { ethers } from "hardhat";
import Web3 from "web3";
import { parseUnits } from "ethers/lib/utils";
import BigNumber from "bignumber.js";
import { BigNumber as BN } from "@ethersproject/bignumber";
import chai, { expect } from "chai";
import { solidity } from "ethereum-waffle";
import { TokenId } from "../src/core/common/tokens";
import { RolloverOperation } from "../src/core/services/rollover/types";
chai.use(solidity);

export const MAX_UINT256 = ethers.constants.MaxUint256;
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export enum TIME {
  SECONDS = 1,
  DAYS = 86400,
  WEEKS = 604800,
}

// EVM methods

export async function forceAdvanceOneBlock(timestamp?: number): Promise<any> {
  const params = timestamp ? [timestamp] : [];
  return ethers.provider.send("evm_mine", params);
}

export async function setTimestamp(timestamp: number): Promise<any> {
  return forceAdvanceOneBlock(timestamp);
}

export async function increaseTimestamp(timestampDelta: number): Promise<any> {
  await ethers.provider.send("evm_increaseTime", [timestampDelta]);
  return forceAdvanceOneBlock();
}

export async function setNextTimestamp(timestamp: number): Promise<any> {
  const chainId = (await ethers.provider.getNetwork()).chainId;

  switch (chainId) {
    case 31337: // buidler evm
      return ethers.provider.send("evm_setNextBlockTimestamp", [timestamp]);
    case 1337: // ganache
    default:
      return setTimestamp(timestamp);
  }
}

export async function getCurrentBlockTimestamp(): Promise<number> {
  const block = await ethers.provider.getBlock("latest");
  return block.timestamp;
}

export function getBytes32String(value: string): string {
  return Web3.utils.padRight(
    // @ts-ignore
    ethers.utils.hexConcat(ethers.utils.toUtf8Bytes(value)),
    64
  );
}

export const parseEtherNumber = (value: number, decimals = 18): string => {
  const res = parseUnits(String(value), decimals).toString();
  return res;
};

export const parseEtherBigNumber = (
  value: BigNumber,
  decimals = 18
): string => {
  const res = parseUnits(value.toString(), decimals).toString();
  return res;
};

export const padEtherNumber = (
  value: number,
  decimals = 18,
  padSymbol = "0",
  padTimes = 0
): string => {
  const etherNumber = parseEtherNumber(value, decimals);
  return `${etherNumber.substring(
    0,
    etherNumber.length - padTimes
  )}${padSymbol.repeat(padTimes)}`;
};

export const checkCalcTransactionsResultLength = (
  result: RolloverOperation[],
  expectedLength: number
) => {
  expect(result).to.be.an("array");
  expect(result.length).to.be.equal(expectedLength);
};

type Asset = [tokenId: TokenId | "CROSS", tokenAmount: string];

interface TransactionParameters {
  from: string;
  to: string;
  assets: Asset[];
}

interface ChackTransactionParameters extends TransactionParameters {
  transaction: RolloverOperation;
}

export const checkTransaction = (
  { transaction, from, to, assets }: ChackTransactionParameters,
  tolerance = 10 ** 18
) => {
  try {
    expect(transaction.from).to.be.equal(from);
    expect(transaction.to).to.be.equal(to);
    expect(transaction.assets).to.be.an("array");
    expect(transaction.assets.length).to.be.equal(assets.length);
    transaction.assets.forEach((asset, index) => {
      const [expectedToken, expectedAmount] = assets[index];
      expect(asset.token).to.be.equal(expectedToken);
      expect(asset.amount).to.be.closeTo(BN.from(expectedAmount), 10000000);
    });
  } catch (err: any) {
    err.message = `Tx: createdBy: ${transaction.createdBy}, from - ${transaction.from}, to - ${transaction.to} error: ${err.message}`;
    throw err;
  }
};

