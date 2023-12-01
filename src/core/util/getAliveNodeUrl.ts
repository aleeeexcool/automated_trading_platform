import axios from "axios";
import BigNumber from "bignumber.js";
import { ChainId } from "../common/chainId";
import { logger } from "../logger";
import { errorInfo, ErrorType } from "./errorInfo";

interface NodeStats {
  node: string;
  time: number | null;
  blockNumber: number | undefined | null;
}
interface FilteredNodeStats {
  node: string;
  time: number;
  blockNumber: number;
}

export const measureNodeTime = (nodeUrl: string) => {
  const time0 = new Date().getTime();
  let time: number | null = null;
  let blockNumber: number | undefined;

  return axios
    .post<{ result: { number: string } }>(
      nodeUrl,
      {
        jsonrpc: "2.0",
        method: "eth_getBlockByNumber",
        params: ["latest", false],
        id: 1,
      },
      { timeout: 3000 }
    )
    .then((result) => {
      if (result.status === 200) {
        const time1 = new Date().getTime();
        time = time1 - time0;
        const blockNumberBN = result.data.result.number;
        if (blockNumberBN) {
          blockNumber = new BigNumber(blockNumberBN).toNumber();
        }
      }

      return {
        node: nodeUrl,
        time,
        blockNumber,
      };
    })
    .catch((err) => {
      logger.error(`NODE IS NOT ANSWERING ${nodeUrl}: ${err}`);
      throw new Error(err);
    });
};

interface FulfilledPromiseResult<T> {
  status: "fulfilled";
  value: T;
}
interface RejectedPromiseResult<T> {
  status: "rejected";
  reason: any;
}

type SettledPromiseResult<T> =
  | FulfilledPromiseResult<T>
  | RejectedPromiseResult<T>;

const allSettled = async <T>(
  promises: Promise<T>[]
): Promise<SettledPromiseResult<T>[]> => {
  const wrappedPromises = promises.map((promise) => {
    return promise.then(
      (val) => ({ status: "fulfilled", value: val }),
      (err) => ({ status: "rejected", reason: err })
    ) as Promise<SettledPromiseResult<T>>;
  });
  return Promise.all(wrappedPromises);
};

const NETWORK_RPC_URLS: { [key in ChainId]?: string[] } = {
  [ChainId.MAINNET]: [`https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`],
};

export const getAliveNodeUrl = async (chainId: ChainId): Promise<string> => {
  const nodes = NETWORK_RPC_URLS[chainId];

  if (!nodes) {
    throw new Error(
      errorInfo({
        type: ErrorType.Config,
        message: `No node in config for chain ${chainId}`,
        debug: {
          module: __filename,
          method: getAliveNodeUrl.name,
        },
      })
    );
  }
  let i: number;
  const blockRequests: Promise<NodeStats>[] = [];
  for (i = 0; i < nodes.length; i++) {
    const currentNode = nodes[i];
    blockRequests.push(measureNodeTime(currentNode));
  }
  const blockResponses = await allSettled(blockRequests);
  let nodeStats: FilteredNodeStats[] = blockResponses
    .map((item) => {
      return item.status === "fulfilled" ? item.value : undefined;
    })
    .filter((value) => {
      return value !== undefined && value.time && value.blockNumber;
    }) as FilteredNodeStats[];

  const latestBlockNumber = Math.max(
    ...nodeStats.map((item) => {
      return item.blockNumber;
    })
  );
  nodeStats = nodeStats.filter((item) => {
    return item.blockNumber === latestBlockNumber;
  });

  nodeStats.sort((a, b) => {
    return a.time - b.time;
  });

  const selectedNode = nodeStats[0]?.node;

  if (!selectedNode) {
    throw new Error(
      errorInfo({
        type: ErrorType.Request,
        message: `No node alive for chain ${chainId}`,
        debug: {
          module: __filename,
          method: getAliveNodeUrl.name,
        },
      })
    );
  }

  return selectedNode;
};
