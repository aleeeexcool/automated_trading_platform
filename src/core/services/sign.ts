import { soliditySha3 } from "web3-utils";
import { ethers } from "ethers";

export const getSignatureFromTransactionParams = async (
  token: string,
  amount: string, // deposit amount or withdraw percent
  cycleSteps: { controllerId: string; data: string }[]
) => {
  const paramsTypes = [];
  const flatParams = [];
  for (const cycleStep of cycleSteps) {
    paramsTypes.push("bytes32");
    flatParams.push(cycleStep.controllerId);
    paramsTypes.push("bytes");
    flatParams.push(cycleStep.data);
  }
  const concatenatedSteps = ethers.utils.solidityPack(
    ["address", "uint", ...paramsTypes],
    [token, amount, ...flatParams]
  );
  const hash = soliditySha3(concatenatedSteps);
  const { SIGNER_PRIVATE_KEY = "" } = process.env;
  // TODO: nodeUrl from util
};

