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
   * Converts amount between different units (ETH and WEI)
   * @param tokenSymbol - Token symbol for getting decimals
   * @param chainName - Chain name for getting decimals
   * @param amount - The amount to convert (string or bigint)
   * @param inputUnit - The input unit type (ETH or WEI)
   * @param outputUnit - The output unit type (ETH or WEI)
   * @returns Promise<string | bigint> - Converted amount
   * @private
   */
  private static async convertAmount(
    tokenSymbol: string,
    chainName: string,
    amount: string | bigint,
    inputUnit: Unit,
    outputUnit: Unit,
  ): Promise<string | bigint> {
    // If input and output units are the same, handle type conversion based on expected output
    if (inputUnit === outputUnit) {
      if (outputUnit === Unit.WEI) {
        // For WEI: if input is string (user input), convert to BigInt for contract calls
        // If input is already BigInt (from contract), convert to string for display
        return typeof amount === 'string' ? BigInt(amount) : amount.toString();
      } else {
        return amount.toString();
      }
    }

    // Get decimals only when conversion is needed
    const decimals = await ERC20Service.getDecimals(tokenSymbol, chainName);

    // Convert from ETH to WEI
    if (inputUnit === Unit.ETH && outputUnit === Unit.WEI) {
      return ethers.parseUnits(amount as string, decimals);
    }
    
    // Convert from WEI to ETH
    if (inputUnit === Unit.WEI && outputUnit === Unit.ETH) {
      return ethers.formatUnits(amount as bigint, decimals);
    }

    // This should not happen with current Unit enum, but handle gracefully
    throw new Error(`Unsupported unit conversion from ${inputUnit} to ${outputUnit}`);
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
      const convertedAmount = await ERC20Service.convertAmount(
        tokenSymbol,
        chainName,
        allowance,
        Unit.WEI,
        unit,
      );
      return convertedAmount.toString();
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
      const finalAmount = (await ERC20Service.convertAmount(
        tokenSymbol,
        chainName,
        amount,
        unit,
        Unit.WEI,
      )) as bigint;

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
