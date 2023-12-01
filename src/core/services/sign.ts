import { soliditySha3 } from "web3-utils";
import { ethers } from "ethers";
import Web3 from "web3";
import { ChainId } from "../common/chainId";
import { getAliveNodeUrl } from "../util/getAliveNodeUrl";

export const getSignatureFromTransactionParams = async (
  chainId: ChainId,
  token: string,
  amount: string, // deposit amount or withdraw percent
  cycleSteps: { controllerId: string; data: string }[]
): Promise<string> => {
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
  const nodeUrl = await getAliveNodeUrl(chainId);
  const provider = ethers.getDefaultProvider(nodeUrl);
  const walletWithProvider = new ethers.Wallet(SIGNER_PRIVATE_KEY, provider);
  // @ts-ignore
  const web3 = new Web3(walletWithProvider.provider);
  // @ts-ignore
  const { signature } = web3.eth.accounts.sign(hash, SIGNER_PRIVATE_KEY);
  return signature;
};
