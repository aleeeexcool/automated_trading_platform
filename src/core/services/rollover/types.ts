import { ethers } from "ethers";
import { TokenId } from "../../common/tokens";
import { ChainId } from "../../common/chainId";

export interface ExternalContract {
  readonly address: string;
  readonly abi: any[];
}

export interface PoolTransferData {
  pool: string;
  amount: string;
}

export interface ControllerTransferData {
  controllerId: Uint8Array; // controller to target
  data: string;
}

export interface RolloverExecution {
  poolData: PoolTransferData[];
  cycleSteps: ControllerTransferData[];
  poolsForWithdraw: string[];
  complete: boolean;
  rewardsIpfsHash: string;
}

export interface RolloverOperationTransfer {
  amount: string;
  token: TokenId;
}

export interface RolloverOperation {
  from: any; // TODO: from part
  to: any; // TODO: to apart
  path?: string | string[];
  encodedPath?: string;
  assets: RolloverOperationTransfer[];
  meta?: any; // Used to avoid double calling of tokensAmountsOutput
  swap?: boolean;
  status?: string;
  createdBy?: string;
  mint?: boolean;
  positionTokenId?: string;
  tickLower?: string;
  tickUpper?: string;
}

export type LiquidityOperatorController = {
  id: any; // TODO: id part
  chainId: ChainId;
  description?: string;
  address: string;
  controllerId: Uint8Array;
  controllerHexId: string;
  balanceKey: string | Uint8Array; // actually it's address or controllerId, it depends on strategy contract
  interface: ethers.utils.Interface;
  deploy: {
    function: string;
    types: string[];
    args: (
      operation: RolloverOperation,
      swapAmount: string,
    ) => (string | boolean | string[])[];
  };
  deployAll?: {
    function: string;
    types: string[];
    args: (
      operation: RolloverOperation,
      swapAmount: string,
    ) => (string | boolean | string[])[];
  };
  withdraw: {
    function: string;
    types: string[];
    args: (
      operation: RolloverOperation,
    ) => Promise<(string | string[] | boolean)[]> | string[];
  };
  withdrawAll?: {
    function: string;
    types: string[];
    args: (operation: RolloverOperation) => Promise<string[]>;
  };
  destination: ExternalContract;
};

export enum TxListType {
  Deposit = "deposit",
  Withdraw = "withdraw",
  Rebalance = "rebalance",
  RebalanceV3Wells = "rebalanceV3Wells",
}

