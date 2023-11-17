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

export interface RolloverOperationTransfer {
  amount: string;
  token: TokenId;
}

export interface RolloverOperation {
    
}