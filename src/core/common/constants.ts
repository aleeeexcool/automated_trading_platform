import { ChainId } from "./chainId";

export const NETWORK_RPC_URLS: { [key in ChainId]?: string[] } = {
  [ChainId.MAINNET]: [`https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`],
};