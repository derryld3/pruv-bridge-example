import { ethers } from 'ethers';
import { ConfigUtil } from '../../util/ConfigUtil';
import tokenRouterAbi from '../../../contract/hyperlane/TokenRouter.abi.json';

/**
 * TokenRouter Service static utility class for interacting with TokenRouter contracts
 */
export class TokenRouterService {
  private constructor() {
    throw new Error(
      'TokenRouterService is a static utility class and cannot be instantiated',
    );
  }

  /**
   * Create a contract instance for read-only operations
   * @param rpcUrl - The RPC URL of the blockchain network
   * @param routerContractAddress - The address of the TokenRouter contract
   * @returns ethers.Contract instance
   * @private
   */
  private static createReadOnlyContract(
    rpcUrl: string,
    routerContractAddress: string,
  ): ethers.Contract {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    return new ethers.Contract(routerContractAddress, tokenRouterAbi, provider);
  }

  /**
   * Handle errors with consistent formatting
   * @param error - The error to handle
   * @param operation - The operation that failed
   * @returns never - Always throws
   * @private
   */
  private static handleError(error: unknown, operation: string): never {
    throw new Error(
      `Failed to ${operation}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }



  /**
   * Quote the gas payment required for a cross-chain transfer to a specific destination
   * @param tokenSymbol - The symbol of the token (e.g., 'USDC')
   * @param sourceChainName - The name of the source chain
   * @param destinationChainName - The name of the destination chain
   * @returns Promise<string> - The gas payment amount in wei as a string
   */
  static async quoteGasPayment(
    tokenSymbol: string,
    sourceChainName: string,
    destinationChainName: string,
  ): Promise<string> {
    try {
      const rpcUrl = ConfigUtil.getRpcUrl(sourceChainName);
      const routerContractAddress = ConfigUtil.getRouterAddress(
        tokenSymbol,
        sourceChainName,
      );
      const destinationDomainId = ConfigUtil.getDomainId(destinationChainName);

      const routerContract = this.createReadOnlyContract(
        rpcUrl,
        routerContractAddress,
      );

      // Call quoteGasPayment function (read-only call)
      const gasPayment =
        await routerContract.quoteGasPayment.staticCall(destinationDomainId);

      return gasPayment.toString();
    } catch (error) {
      this.handleError(error, 'quoteGasPayment');
    }
  }

  /**
   * Get the router address for a specific domain
   * @param tokenSymbol - The symbol of the token (e.g., 'USDC')
   * @param chainName - The name of the chain where the router contract is deployed
   * @param domainId - The domain ID to get the router for
   * @returns Promise<string> - The router address as a hex string
   */
  static async routers(
    tokenSymbol: string,
    chainName: string,
    domainId: number,
  ): Promise<string> {
    try {
      const rpcUrl = ConfigUtil.getRpcUrl(chainName);
      const routerContractAddress = ConfigUtil.getRouterAddress(
        tokenSymbol,
        chainName,
      );

      const routerContract = this.createReadOnlyContract(
        rpcUrl,
        routerContractAddress,
      );

      // Call routers function (read-only call)
      const routerAddress = await routerContract.routers.staticCall(domainId);

      return routerAddress;
    } catch (error) {
      this.handleError(error, 'routers');
    }
  }

  /**
   * Get the balance of a specific account for the token
   * @param tokenSymbol - The symbol of the token (e.g., 'USDC')
   * @param chainName - The name of the chain where the router contract is deployed
   * @param account - The address of the account to check balance for
   * @returns Promise<string> - The balance amount as a string
   */
  static async balanceOf(
    tokenSymbol: string,
    chainName: string,
    account: string,
  ): Promise<string> {
    try {
      const rpcUrl = ConfigUtil.getRpcUrl(chainName);
      const routerContractAddress = ConfigUtil.getRouterAddress(
        tokenSymbol,
        chainName,
      );

      const routerContract = this.createReadOnlyContract(
        rpcUrl,
        routerContractAddress,
      );

      // Call balanceOf function (read-only call)
      const balance = await routerContract.balanceOf.staticCall(account);

      return balance.toString();
    } catch (error) {
      this.handleError(error, 'balanceOf');
    }
  }
}
