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
   * Resolve RPC URL and token contract address from flexible parameters
   * @param rpcUrlOrTokenSymbol - The RPC URL of the blockchain network OR token symbol
   * @param tokenContractAddressOrChainName - The address of the ERC20 token contract OR chain name
   * @returns Object containing resolved rpcUrl and tokenContractAddress
   * @private
   */
  private static resolveContractParams(rpcUrlOrTokenSymbol: string, tokenContractAddressOrChainName: string): { rpcUrl: string; tokenContractAddress: string } {
    // Check if first parameter looks like an RPC URL (contains http/https)
    if (rpcUrlOrTokenSymbol.startsWith('http')) {
      // Traditional usage: (rpcUrl, tokenContractAddress)
      return {
        rpcUrl: rpcUrlOrTokenSymbol,
        tokenContractAddress: tokenContractAddressOrChainName
      };
    } else {
      // New usage: (tokenSymbol, chainName)
      const tokenSymbol = rpcUrlOrTokenSymbol;
      const chainName = tokenContractAddressOrChainName;
      return {
        rpcUrl: ConfigUtil.getRpcUrl(chainName),
        tokenContractAddress: ConfigUtil.getCollateralAddress(tokenSymbol, chainName)
      };
    }
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
   * @param rpcUrlOrTokenSymbol - Token symbol or RPC URL for getting decimals
   * @param tokenContractAddressOrChainName - Chain name or contract address for getting decimals
   * @param isInput - Whether this is input conversion (ETH to WEI) or output conversion (WEI to ETH)
   * @returns Promise<string | bigint> - Converted amount
   * @private
   */
  private static async convertAmount(amount: string | bigint, unit: Unit, rpcUrlOrTokenSymbol: string, tokenContractAddressOrChainName: string, isInput: boolean): Promise<string | bigint> {
    if (unit === Unit.ETH) {
      const decimals = await ERC20Service.getDecimals(rpcUrlOrTokenSymbol, tokenContractAddressOrChainName);
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
   * @param rpcUrlOrTokenSymbol - The RPC URL of the blockchain network OR token symbol
   * @param tokenContractAddressOrChainName - The address of the ERC20 token contract OR chain name
   * @returns Promise<number> - The number of decimals
   */
  static async getDecimals(rpcUrlOrTokenSymbol: string, tokenContractAddressOrChainName: string): Promise<number> {
    const { rpcUrl, tokenContractAddress } = ERC20Service.resolveContractParams(rpcUrlOrTokenSymbol, tokenContractAddressOrChainName);
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
   * @param rpcUrlOrTokenSymbol - The RPC URL of the blockchain network OR token symbol
   * @param tokenContractAddressOrChainName - The address of the ERC20 token contract OR chain name
   * @param holderAddress - The address to check balance for
   * @param unit - The unit of the returned balance (ETH or WEI)
   * @returns Promise<string> - The balance as a string
   */
  static async getBalance(rpcUrlOrTokenSymbol: string, tokenContractAddressOrChainName: string, holderAddress: string, unit: Unit): Promise<string> {
    const { rpcUrl, tokenContractAddress } = ERC20Service.resolveContractParams(rpcUrlOrTokenSymbol, tokenContractAddressOrChainName);
    try {
      const tokenContract = ERC20Service.createReadOnlyContract(rpcUrl, tokenContractAddress);
      
      // Call balanceOf function (read-only call)
      const balance = await tokenContract.balanceOf.staticCall(holderAddress);
      
      // Convert balance based on unit
      return await ERC20Service.convertAmount(balance, unit, rpcUrlOrTokenSymbol, tokenContractAddressOrChainName, false) as string;
    } catch (error) {
      ERC20Service.handleError(error, 'get token balance');
    }
  }

  /**
   * Approve a spender to spend tokens on behalf of the owner
   * @param rpcUrlOrTokenSymbol - The RPC URL of the blockchain network OR token symbol
   * @param tokenContractAddressOrChainName - The address of the ERC20 token contract OR chain name
   * @param spenderAddress - The address that will be approved to spend tokens
   * @param amount - The amount of tokens to approve
   * @param unit - The unit of the amount (ETH or WEI)
   * @param privateKey - The private key of the token owner
   * @returns Promise<string> - The transaction hash
   */
  static async approve(rpcUrlOrTokenSymbol: string, tokenContractAddressOrChainName: string, spenderAddress: string, amount: string, unit: Unit, privateKey: string): Promise<string> {
    const { rpcUrl, tokenContractAddress } = ERC20Service.resolveContractParams(rpcUrlOrTokenSymbol, tokenContractAddressOrChainName);
    try {
      const tokenContract = ERC20Service.createWriteContract(rpcUrl, tokenContractAddress, privateKey);
      
      // Convert amount based on unit
      const finalAmount = await ERC20Service.convertAmount(amount, unit, rpcUrlOrTokenSymbol, tokenContractAddressOrChainName, true) as bigint;
      
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
   * @param rpcUrlOrTokenSymbol - The RPC URL of the blockchain network OR token symbol
   * @param tokenContractAddressOrChainName - The address of the ERC20 token contract OR chain name
   * @param ownerAddress - The address of the token owner
   * @param spenderAddress - The address of the spender
   * @param unit - The unit of the returned allowance (ETH or WEI)
   * @returns Promise<string> - The allowance as a string
   */
  static async getAllowance(rpcUrlOrTokenSymbol: string, tokenContractAddressOrChainName: string, ownerAddress: string, spenderAddress: string, unit: Unit): Promise<string> {
    const { rpcUrl, tokenContractAddress } = ERC20Service.resolveContractParams(rpcUrlOrTokenSymbol, tokenContractAddressOrChainName);
    try {
      const tokenContract = ERC20Service.createReadOnlyContract(rpcUrl, tokenContractAddress);
      
      // Call allowance function (read-only call)
      const allowance = await tokenContract.allowance.staticCall(ownerAddress, spenderAddress);
      
      // Convert allowance based on unit
      return await ERC20Service.convertAmount(allowance, unit, rpcUrlOrTokenSymbol, tokenContractAddressOrChainName, false) as string;
    } catch (error) {
      ERC20Service.handleError(error, 'get token allowance');
    }
  }
}