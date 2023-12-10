import { ChainId } from "./chainId";

export const NETWORK_RPC_URLS: { [key in ChainId]?: string[] } = {
  [ChainId.MAINNET]: [`https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`],
};

export const ACCUMULATOR_ADDRESSES: { [key in ChainId]?: string } = {
  [ChainId.MAINNET]: "0x0", // TODO populate after deploy
};

export const MAX_AMOUNT = "MAX";

export const MAX_UINT128 = "340282366920938463463374607431768211455";