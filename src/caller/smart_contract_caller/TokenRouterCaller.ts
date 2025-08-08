import { ethers } from 'ethers';
import * as tokenRouterAbi from '../../../contract/hyperlane/TokenRouter.abi.json';

/**
 * TokenRouter Caller - Low-level utility class for direct TokenRouter contract interactions
 * Handles raw contract calls without configuration resolution or user input processing
 */
export class TokenRouterCaller {
  private static readonly abi = (tokenRouterAbi as any).default || tokenRouterAbi;

  private constructor() {
    throw new Error(
      'TokenRouterCaller is a static utility class and cannot be instantiated',
    );
  }

  /**
   * Create a contract instance for read-only operations
   * @param rpcUrl - The RPC URL of the blockchain network
   * @param routerContractAddress - The address of the TokenRouter contract
   * @returns ethers.Contract instance
   */
  static createReadOnlyContract(
    rpcUrl: string,
    routerContractAddress: string,
  ): ethers.Contract {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    return new ethers.Contract(routerContractAddress, TokenRouterCaller.abi, provider);
  }

  /**
   * Quote the gas payment required for a cross-chain transfer to a specific destination
   * @param rpcUrl - The RPC URL of the blockchain network
   * @param routerContractAddress - The address of the TokenRouter contract
   * @param destinationDomainId - The domain ID of the destination chain
   * @returns Promise<bigint> - The gas payment amount in wei
   */
  static async quoteGasPayment(
    rpcUrl: string,
    routerContractAddress: string,
    destinationDomainId: number,
  ): Promise<bigint> {
    try {
      const routerContract = TokenRouterCaller.createReadOnlyContract(
        rpcUrl,
        routerContractAddress,
      );

      // Call quoteGasPayment function (read-only call)
      const gasPayment = await routerContract.quoteGasPayment.staticCall(destinationDomainId);
      return gasPayment;
    } catch (error) {
      throw new Error(
        `Failed to quote gas payment: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Get the router address for a specific domain
   * @param rpcUrl - The RPC URL of the blockchain network
   * @param routerContractAddress - The address of the TokenRouter contract
   * @param domainId - The domain ID to get the router for
   * @returns Promise<string> - The router address as a hex string
   */
  static async getRouters(
    rpcUrl: string,
    routerContractAddress: string,
    domainId: number,
  ): Promise<string> {
    try {
      const routerContract = TokenRouterCaller.createReadOnlyContract(
        rpcUrl,
        routerContractAddress,
      );

      // Call routers function (read-only call)
      const routerAddress = await routerContract.routers.staticCall(domainId);
      return routerAddress;
    } catch (error) {
      throw new Error(
        `Failed to get router address: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Get the balance of a specific account for the token
   * @param rpcUrl - The RPC URL of the blockchain network
   * @param routerContractAddress - The address of the TokenRouter contract
   * @param account - The address of the account to check balance for
   * @returns Promise<bigint> - The balance amount
   */
  static async getBalanceOf(
    rpcUrl: string,
    routerContractAddress: string,
    account: string,
  ): Promise<bigint> {
    try {
      const routerContract = TokenRouterCaller.createReadOnlyContract(
        rpcUrl,
        routerContractAddress,
      );

      // Call balanceOf function (read-only call)
      const balance = await routerContract.balanceOf.staticCall(account);
      return balance;
    } catch (error) {
      throw new Error(
        `Failed to get balance: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Transfer tokens to a remote chain
   * @param routerContractAddress - The address of the TokenRouter contract
   * @param destinationDomainId - The domain ID of the destination chain
   * @param recipient - The recipient address as bytes32
   * @param amount - The amount of tokens to transfer
   * @param value - The ETH value to send with the transaction (for gas payment)
   * @param signer - The signer for the transaction
   * @returns Promise<{transactionHash: string, receipt: any}> - Transaction hash and receipt
   */
  static async transferRemote(
    routerContractAddress: string,
    destinationDomainId: number,
    recipient: string,
    amount: bigint,
    value: bigint,
    signer: ethers.Signer,
  ): Promise<{transactionHash: string, receipt: any}> {
    try {
      const contract = new ethers.Contract(
        routerContractAddress,
        TokenRouterCaller.abi,
        signer,
      );

      // Call transferRemote and wait for transaction completion
      const tx = await contract.transferRemote(
        destinationDomainId,
        recipient,
        amount,
        { value },
      );

      // Wait for the transaction to be mined
      const receipt = await tx.wait();
      
      return {
        transactionHash: tx.hash,
        receipt: receipt
      };
    } catch (error) {
      throw new Error(
        `Failed to transfer tokens: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}