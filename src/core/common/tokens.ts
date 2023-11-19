import { errorInfo, ErrorType } from "../util/errorInfo";
import { ChainId } from "./chainId";

export enum TokenId {
  USDC = "USDC",
  USDT = "USDT",
  DAI = "DAI",
  BUSD = "BUSD",
  VVS = "VVS",
  CRONA = "CRONA",
  VVS_USDT_USDC = "VVS_USDT_USDC",
  PANCAKE_USDT_USDC = "PANCAKE_USDT_USDC",
  PANCAKE_USDT_BUSD = "PANCAKE_USDT_BUSD",
  CAKE = "CAKE",
  ALPACA = "ALPACA",
  TONIC = "TONIC",
  BTC = "BTC",
  BTCB = "BTCB",
  ETH = "ETH",
  PANCAKE_ETH_USDC = "PANCAKE_ETH_USDC",
  PANCAKE_CAKE_WBNB = "PANCAKE_CAKE_WBNB",
  PANCAKE_CAKE_USDT = "PANCAKE_CAKE_USDT",
  PANCAKE_ETH_WBNB = "PANCAKE_ETH_WBNB",
  BNB = "BNB",
  WBNB = "WBNB",
  WCRO = "WCRO",
  CRO = "CRO",
  WBETH = "WBETH",
  WETH = "WETH",
  WBTC = "WBTC",
  CRV = "CRV",
}
export interface BaseToken {
  id: TokenId;
  geckoId?: string;
  geckoIdVsCurrency?: string; // TODO refactor, remove from token, it's well specific, not token
  token0Id?: TokenId;
  token1Id?: TokenId;
  stableSwapRouterAddress?: string; // TODO may be find better place
  stableCoin?: boolean;
}

export interface MultiChainToken {
  decimals: { [chainId in ChainId]?: number };
  addresses: { [chainId in ChainId]?: string };
}

export class ChainToken implements BaseToken {
  id: TokenId;
  decimals: number;
  address: string;
  geckoId?: string;
  geckoIdVsCurrency?: string;
  token0Id?: TokenId;
  token1Id?: TokenId;
  stableSwapRouterAddress?: string;
  stableCoin?: boolean;

  constructor(
    id: TokenId,
    decimals: number,
    address: string,
    geckoId?: string,
    geckoIdVsCurrency?: string,
    token0Id?: TokenId,
    token1Id?: TokenId,
    stableSwapRouterAddress?: string,
    stableCoin?: boolean,
  ) {
    this.id = id;
    this.geckoId = geckoId;
    this.geckoIdVsCurrency = geckoIdVsCurrency;
    this.token0Id = token0Id;
    this.token1Id = token1Id;
    this.stableSwapRouterAddress = stableSwapRouterAddress;
    this.stableCoin = stableCoin;
    this.decimals = decimals;
    this.address = address;
  }
}

type GenericToken = BaseToken & MultiChainToken;

export const TOKENS: GenericToken[] = [
  {
    id: TokenId.USDC,
    decimals: {
      [ChainId.MAINNET]: 6,
      [ChainId.BSC]: 18,
    },
    geckoId: "usd-coin",
    geckoIdVsCurrency: "usd",
    addresses: {
      [ChainId.MAINNET]: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      [ChainId.BSC]: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
    },
    stableCoin: true,
  },
  {
    id: TokenId.USDT,
    decimals: {
      [ChainId.MAINNET]: 6,
      [ChainId.BSC]: 18,
    },
    geckoId: "tether",
    geckoIdVsCurrency: "usd",
    addresses: {
      [ChainId.MAINNET]: "0xdac17f958d2ee523a2206206994597c13d831ec7",
      [ChainId.BSC]: "0x55d398326f99059fF775485246999027B3197955",
    },
    stableCoin: true,
  },
  {
    id: TokenId.DAI,
    decimals: {
      [ChainId.BSC]: 18,
    },
    geckoId: "dai",
    geckoIdVsCurrency: "usd",
    addresses: {
      [ChainId.BSC]: "0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3",
    },
    stableCoin: true,
  },
  {
    id: TokenId.BUSD,
    decimals: {
      [ChainId.BSC]: 18,
    },
    geckoId: "busd",
    geckoIdVsCurrency: "usd",
    addresses: {
      [ChainId.BSC]: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",
    },
    stableCoin: true,
  },
  {
    id: TokenId.VVS_USDT_USDC,
    decimals: {
      [ChainId.BSC]: 18,
    },
    token0Id: TokenId.USDT,
    token1Id: TokenId.USDC,
    addresses: {
      [ChainId.BSC]: "",
    },
  },
  {
    id: TokenId.PANCAKE_USDT_USDC,
    decimals: {
      [ChainId.BSC]: 18,
    },
    token0Id: TokenId.USDT,
    token1Id: TokenId.USDC,
    addresses: {
      [ChainId.BSC]: "0xee1bcc9F1692E81A281b3a302a4b67890BA4be76",
    },
    stableSwapRouterAddress: "0x3EFebC418efB585248A0D2140cfb87aFcc2C63DD",
  },
  {
    id: TokenId.PANCAKE_USDT_BUSD,
    decimals: {
      [ChainId.BSC]: 18,
    },
    token0Id: TokenId.USDT,
    token1Id: TokenId.BUSD,
    addresses: {
      [ChainId.BSC]: "0x36842F8fb99D55477C0Da638aF5ceb6bBf86aA98",
    },
    stableSwapRouterAddress: "0x169f653a54acd441ab34b73da9946e2c451787ef",
  },
  {
    id: TokenId.CAKE,
    decimals: {
      [ChainId.BSC]: 18,
    },
    geckoId: "pancakeswap-token",
    addresses: {
      [ChainId.BSC]: "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82",
    },
  },
  {
    id: TokenId.ALPACA,
    decimals: {
      [ChainId.BSC]: 18,
    },
    geckoId: "alpaca-finance",
    addresses: {
      [ChainId.BSC]: "0x8F0528cE5eF7B51152A59745bEfDD91D97091d2F",
    },
  },
  {
    id: TokenId.TONIC,
    decimals: {
      [ChainId.BSC]: 18,
    },
    geckoId: "tectonic",
    addresses: {
      [ChainId.BSC]: "",
    },
  },
  {
    id: TokenId.VVS,
    decimals: {
      [ChainId.BSC]: 18,
    },
    geckoId: "vvs-finance",
    addresses: {
      [ChainId.BSC]: "",
    },
  },
  {
    id: TokenId.BTC,
    decimals: {
      [ChainId.BSC]: 18,
    },
    geckoId: "bitcoin",
    geckoIdVsCurrency: "btc",
    addresses: {
      [ChainId.BSC]: "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c",
    },
  },
  {
    id: TokenId.ETH,
    decimals: {
      [ChainId.MAINNET]: 18,
      [ChainId.BSC]: 18,
    },
    geckoId: "ethereum",
    geckoIdVsCurrency: "eth",
    addresses: {
      [ChainId.MAINNET]: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
      [ChainId.BSC]: "0x2170Ed0880ac9A755fd29B2688956BD959F933F8", // Binance-Peg Ethereum Token (ETH)
    },
  },
  {
    id: TokenId.WBETH,
    decimals: {
      [ChainId.MAINNET]: 18,
      [ChainId.BSC]: 18,
    },
    geckoId: "wrapped-beacon-eth",
    geckoIdVsCurrency: "eth",
    addresses: {
      [ChainId.MAINNET]: "0xa2E3356610840701BDf5611a53974510Ae27E2e1",
      [ChainId.BSC]: "0xa2E3356610840701BDf5611a53974510Ae27E2e1",
    },
  },
  {
    id: TokenId.WETH,
    decimals: {
      [ChainId.MAINNET]: 18,
    },
    geckoId: "weth",
    geckoIdVsCurrency: "eth",
    addresses: {
      [ChainId.MAINNET]: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    },
  },
  {
    id: TokenId.WBTC,
    decimals: {
      [ChainId.MAINNET]: 8,
    },
    geckoId: "wrapped-bitcoin",
    geckoIdVsCurrency: "btc",
    addresses: {
      [ChainId.MAINNET]: "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599",
    },
  },
  {
    id: TokenId.BNB,
    decimals: {
      [ChainId.BSC]: 18,
    },
    geckoId: "binancecoin",
    geckoIdVsCurrency: "bnb",
    addresses: {
      [ChainId.BSC]: "",
    },
  },
  {
    id: TokenId.WBNB,
    decimals: {
      [ChainId.BSC]: 18,
    },
    geckoId: "wbnb",
    geckoIdVsCurrency: "bnb",
    addresses: {
      [ChainId.BSC]: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
    },
  },
  {
    id: TokenId.PANCAKE_ETH_USDC,
    decimals: {
      [ChainId.BSC]: 18,
    },
    token0Id: TokenId.ETH,
    token1Id: TokenId.USDC,
    addresses: {
      [ChainId.BSC]: "0xEa26B78255Df2bBC31C1eBf60010D78670185bD0",
    },
  },
  {
    id: TokenId.PANCAKE_CAKE_WBNB,
    decimals: {
      [ChainId.BSC]: 18,
    },
    token0Id: TokenId.CAKE,
    token1Id: TokenId.WBNB,
    addresses: {
      [ChainId.BSC]: "0x0eD7e52944161450477ee417DE9Cd3a859b14fD0",
    },
  },
  {
    id: TokenId.PANCAKE_ETH_WBNB,
    decimals: {
      [ChainId.BSC]: 18,
    },
    token0Id: TokenId.ETH,
    token1Id: TokenId.WBNB,
    addresses: {
      [ChainId.BSC]: "0x74E4716E431f45807DCF19f284c7aA99F18a4fbc",
    },
  },
  {
    id: TokenId.PANCAKE_CAKE_USDT,
    decimals: {
      [ChainId.BSC]: 18,
    },
    token0Id: TokenId.CAKE,
    token1Id: TokenId.USDT,
    addresses: {
      [ChainId.BSC]: "0xA39Af17CE4a8eb807E076805Da1e2B8EA7D0755b",
    },
  },
  {
    id: TokenId.WCRO,
    decimals: {
      [ChainId.BSC]: 18,
    },
    geckoId: "wrapped-cro",
    addresses: {
    },
  },
  {
    id: TokenId.CRONA,
    decimals: {
      [ChainId.BSC]: 18,
    },
    geckoId: "cronaswap",
    addresses: {
    },
  },
  {
    id: TokenId.CRO,
    decimals: {
      [ChainId.BSC]: 18,
    },
    geckoId: "crypto-com-chain",
    addresses: {
      [ChainId.BSC]: "",
    },
  },
  {
    id: TokenId.CRV,
    decimals: {
      [ChainId.MAINNET]: 18,
    },
    geckoId: "curve-dao-token",
    addresses: {
      [ChainId.MAINNET]: "0xD533a949740bb3306d119CC777fa900bA034cd52",
    },
  },
];

const TOKENS_BY_CHAIN_ID: { [chainId in ChainId]: ChainToken[] } =
  TOKENS.reduce((acc, token) => {
    const chainIds = Object.values(ChainId);
    for (const chainId of chainIds) {
      if (
        "addresses" in token &&
        token.addresses[chainId] &&
        token.decimals[chainId]
      ) {
        if (!acc[chainId]) {
          acc[chainId] = [];
        }
        acc[chainId].push(
          new ChainToken(
            token.id,
            token.decimals[chainId] as number,
            token.addresses[chainId] as string,
            token.geckoId,
            token.geckoIdVsCurrency,
            token.token0Id,
            token.token1Id,
            token.stableSwapRouterAddress,
            token.stableCoin,
          ),
        );
      }
    }
    return acc;
  }, {} as { [chainId in ChainId]: ChainToken[] });

export const getTokenById = (
  id: string | null,
  chainId: ChainId,
): ChainToken => {
  const token = TOKENS_BY_CHAIN_ID[chainId].find((item) => item.id === id);
  if (!token) {
    throw new Error(
      errorInfo({
        type: ErrorType.Config,
        message: "Invalid tokenId",
        debug: {
          module: __filename,
          method: getTokenById.name,
        },
      }),
    );
  }
  return token;
};

export const getTokenByAddress = (
  address: string,
  chainId: ChainId,
): ChainToken => {
  const token = TOKENS_BY_CHAIN_ID[chainId].find(
    (item) => item.address === address,
  );
  if (!token) {
    throw new Error(
      errorInfo({
        type: ErrorType.Config,
        message: "Invalid token address",
        debug: {
          module: __filename,
          method: getTokenByAddress.name,
        },
      }),
    );
  }
  return token;
};

export const getGeckoIdAndTokenIdRelations = (): Record<string, TokenId> => {
  const relations: Record<string, TokenId> = {};
  for (const token of TOKENS) {
    if (token.geckoId) {
      relations[token.geckoId] = token.id;
    }
  }
  return relations;
};

