import { ethers } from 'ethers';
import { ConfigUtil } from '../util/ConfigUtil';
import { Unit } from '../util/Unit';

const erc20Abi = require('../../contract/@openzeppelin/ERC20.abi.json');

/**
 * ERC20 Service static utility class for interacting with ERC20 tokens
 */
export class ERC20Service {
  private static abi: any = erc20Abi;

  private constructor() {
    throw new Error('ERC20Service is a static utility class and cannot be instantiated');
  }



  /**
   * Create a contract instance for read-only operations
   * @param rpcUrl - The RPC URL of the blockchain network
   * @param tokenContractAddress - The address of the ERC20 token contract
   * @returns ethers.Contract instance
   * @private
   */
  private static createReadOnlyContract(rpcUrl: string, tokenContractAddress: string): ethers.Contract {
    
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    return new ethers.Contract(tokenContractAddress, ERC20Service.abi, provider);
  }

  /**
   * Create a contract instance for write operations
   * @param rpcUrl - The RPC URL of the blockchain network
   * @param tokenContractAddress - The address of the ERC20 token contract
   * @param privateKey - The private key for signing transactions
   * @returns ethers.Contract instance with signer
   * @private
   */
  private static createWriteContract(rpcUrl: string, tokenContractAddress: string, privateKey: string): ethers.Contract {
    
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    return new ethers.Contract(tokenContractAddress, ERC20Service.abi, wallet);
  }

  /**
   * Convert amount based on unit type
   * @param amount - The amount to convert
   * @param unit - The unit type (ETH or WEI)
   * @param tokenSymbol - Token symbol for getting decimals
   * @param chainName - Chain name for getting decimals
   * @param isInput - Whether this is input conversion (ETH to WEI) or output conversion (WEI to ETH)
   * @returns Promise<string | bigint> - Converted amount
   * @private
   */
  private static async convertAmount(amount: string | bigint, unit: Unit, tokenSymbol: string, chainName: string, isInput: boolean): Promise<string | bigint> {
    if (unit === Unit.ETH) {
      const decimals = await ERC20Service.getDecimals(tokenSymbol, chainName);
      if (isInput) {
        // Convert from ETH units to WEI (for input)
        return ethers.parseUnits(amount as string, decimals);
      } else {
        // Convert from WEI to ETH units (for output)
        return ethers.formatUnits(amount as bigint, decimals);
      }
    } else {
      // WEI - return as-is
      if (isInput) {
        return BigInt(amount as string);
      } else {
        return (amount as bigint).toString();
      }
    }
  }

  /**
   * Handle errors with consistent formatting
   * @param error - The error to handle
   * @param operation - The operation that failed
   * @returns never - Always throws
   * @private
   */
  private static handleError(error: unknown, operation: string): never {
    throw new Error(`Failed to ${operation}: ${error instanceof Error ? error.message : String(error)}`);
  }

  /**
   * Get the decimals of an ERC20 token
   * @param tokenSymbol - The token symbol
   * @param chainName - The chain name
   * @returns Promise<number> - The number of decimals
   */
  static async getDecimals(tokenSymbol: string, chainName: string): Promise<number> {
    const rpcUrl = ConfigUtil.getRpcUrl(chainName);
    const tokenContractAddress = ConfigUtil.getCollateralAddress(tokenSymbol, chainName);
    try {
      const tokenContract = ERC20Service.createReadOnlyContract(rpcUrl, tokenContractAddress);
      
      // Call decimals function (read-only call)
      const decimals = await tokenContract.decimals.staticCall();
      
      return Number(decimals);
    } catch (error) {
      ERC20Service.handleError(error, 'get token decimals');
    }
  }

  /**
   * Get the balance of a token holder
   * @param tokenSymbol - The token symbol
   * @param chainName - The chain name
   * @param holderAddress - The address to check balance for
   * @param unit - The unit of the returned balance (ETH or WEI)
   * @returns Promise<string> - The balance as a string
   */
  static async getBalance(tokenSymbol: string, chainName: string, holderAddress: string, unit: Unit): Promise<string> {
    const rpcUrl = ConfigUtil.getRpcUrl(chainName);
    const tokenContractAddress = ConfigUtil.getCollateralAddress(tokenSymbol, chainName);
    try {
      const tokenContract = ERC20Service.createReadOnlyContract(rpcUrl, tokenContractAddress);
      
      // Call balanceOf function (read-only call)
      const balance = await tokenContract.balanceOf.staticCall(holderAddress);
      
      // Convert balance based on unit
      return await ERC20Service.convertAmount(balance, unit, tokenSymbol, chainName, false) as string;
    } catch (error) {
      ERC20Service.handleError(error, 'get token balance');
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
  static async approve(tokenSymbol: string, chainName: string, spenderAddress: string, amount: string, unit: Unit, privateKey: string): Promise<string> {
    const rpcUrl = ConfigUtil.getRpcUrl(chainName);
    const tokenContractAddress = ConfigUtil.getCollateralAddress(tokenSymbol, chainName);
    try {
      const tokenContract = ERC20Service.createWriteContract(rpcUrl, tokenContractAddress, privateKey);
      
      // Convert amount based on unit
      const finalAmount = await ERC20Service.convertAmount(amount, unit, tokenSymbol, chainName, true) as bigint;
      
      // Call approve function
      const tx = await tokenContract.approve(
        spenderAddress,
        finalAmount
      );
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      
      return receipt.hash;
    } catch (error) {
      ERC20Service.handleError(error, 'approve token');
    }
  }

  /**
   * Get the allowance of a spender for a specific owner
   * @param tokenSymbol - The token symbol
   * @param chainName - The chain name
   * @param ownerAddress - The address of the token owner
   * @param spenderAddress - The address of the spender
   * @param unit - The unit of the returned allowance (ETH or WEI)
   * @returns Promise<string> - The allowance as a string
   */
  static async getAllowance(tokenSymbol: string, chainName: string, ownerAddress: string, spenderAddress: string, unit: Unit): Promise<string> {
    const rpcUrl = ConfigUtil.getRpcUrl(chainName);
    const tokenContractAddress = ConfigUtil.getCollateralAddress(tokenSymbol, chainName);
    try {
      const tokenContract = ERC20Service.createReadOnlyContract(rpcUrl, tokenContractAddress);
      
      // Call allowance function (read-only call)
      const allowance = await tokenContract.allowance.staticCall(ownerAddress, spenderAddress);
      
      // Convert allowance based on unit
      return await ERC20Service.convertAmount(allowance, unit, tokenSymbol, chainName, false) as string;
    } catch (error) {
      ERC20Service.handleError(error, 'get token allowance');
    }
  }
}