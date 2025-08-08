import { ethers } from 'ethers';
import { ConfigUtil } from '../../util/ConfigUtil';
import { Unit } from '../../util/Unit';
import { ERC20Caller } from '../../caller/smart_contract_caller/ERC20Caller';

/**
 * ERC20 Service - High-level service for ERC20 token operations
 * Handles user input conversion, configuration resolution, and transaction signing
 */
export class ERC20Service {
  private constructor() {
    throw new Error(
      'ERC20Service is a static utility class and cannot be instantiated',
    );
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
   * Get the decimals of an ERC20 token
   * @param tokenSymbol - The token symbol
   * @param chainName - The chain name
   * @returns Promise<number> - The number of decimals
   */
  static async getDecimals(
    tokenSymbol: string,
    chainName: string,
  ): Promise<number> {
    const rpcUrl = ConfigUtil.getRpcUrl(chainName);
    const tokenContractAddress = ConfigUtil.getCollateralAddress(
      tokenSymbol,
      chainName,
    );
    try {
      return await ERC20Caller.getDecimals(rpcUrl, tokenContractAddress);
    } catch (error) {
      ERC20Service.handleError(error, 'get token decimals');
    }
  }

  /**
   * Approve a spender to spend tokens on behalf of the owner
   * @param tokenSymbol - The token symbol
   * @param chainName - The chain name
   * @param spenderAddress - The address that will be approved to spend tokens
   * @param amount - The amount of tokens to approve
   * @param unit - The unit of the amount (ETH or WEI)
   * @param privateKey - The private key of the token owner
   * @returns Promise<string> - The transaction hash
   */

  /**
   * Get the allowance of a spender for a specific owner
   * @param tokenSymbol - The token symbol
   * @param chainName - The chain name
   * @param ownerAddress - The address of the token owner
   * @param spenderAddress - The address of the spender
   * @param unit - The unit of the returned allowance (ETH or WEI)
   * @returns Promise<string> - The allowance as a string
   */
  static async getAllowance(
    tokenSymbol: string,
    chainName: string,
    ownerAddress: string,
    spenderAddress: string,
    unit: Unit,
  ): Promise<string> {
    const rpcUrl = ConfigUtil.getRpcUrl(chainName);
    const tokenContractAddress = ConfigUtil.getCollateralAddress(
      tokenSymbol,
      chainName,
    );
    try {
      // Get allowance in wei through caller
      const allowance = await ERC20Caller.getAllowance(
        rpcUrl,
        tokenContractAddress,
        ownerAddress,
        spenderAddress,
      );

      // Convert allowance based on unit
      if (unit === Unit.WEI) {
        return allowance.toString();
      } else {
        // Convert from WEI to ETH
        const decimals = await ERC20Service.getDecimals(tokenSymbol, chainName);
        return ethers.formatUnits(allowance, decimals);
      }
    } catch (error) {
      ERC20Service.handleError(error, 'get token allowance');
    }
  }

  static async approve(
    tokenSymbol: string,
    chainName: string,
    spenderAddress: string,
    amount: string,
    unit: Unit,
    privateKey: string,
  ): Promise<string> {
    const rpcUrl = ConfigUtil.getRpcUrl(chainName);
    const tokenContractAddress = ConfigUtil.getCollateralAddress(
      tokenSymbol,
      chainName,
    );
    try {
      // Convert amount based on unit
      let finalAmount: bigint;
      if (unit === Unit.WEI) {
        finalAmount = BigInt(amount);
      } else {
        // Convert from ETH to WEI
        const decimals = await ERC20Service.getDecimals(tokenSymbol, chainName);
        finalAmount = ethers.parseUnits(amount, decimals);
      }

      // Create signer
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const signer = new ethers.Wallet(privateKey, provider);

      // Call approve function through caller
      return await ERC20Caller.approve(
        tokenContractAddress,
        spenderAddress,
        finalAmount,
        signer,
      );
    } catch (error) {
      ERC20Service.handleError(error, 'approve token');
    }
  }
}
