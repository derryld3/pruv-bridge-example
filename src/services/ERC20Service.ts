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
      throw new Error(`Failed to get token decimals: ${error instanceof Error ? error.message : String(error)}`);
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
      if (unit === Unit.ETH) {
        // Get token decimals and convert to ETH units
        const decimals = await ERC20Service.getDecimals(rpcUrlOrTokenSymbol, tokenContractAddressOrChainName);
        return ethers.formatUnits(balance, decimals);
      } else {
        // WEI - return raw balance
        return balance.toString();
      }
    } catch (error) {
      throw new Error(`Failed to get token balance: ${error instanceof Error ? error.message : String(error)}`);
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
      let finalAmount: bigint;
      if (unit === Unit.ETH) {
        // Get token decimals and convert from ETH units
        const decimals = await ERC20Service.getDecimals(rpcUrlOrTokenSymbol, tokenContractAddressOrChainName);
        finalAmount = ethers.parseUnits(amount, decimals);
      } else {
        // WEI - use raw amount
        finalAmount = BigInt(amount);
      }
      
      // Call approve function
      const tx = await tokenContract.approve(
        spenderAddress,
        finalAmount
      );
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      
      return receipt.hash;
    } catch (error) {
      throw new Error(`Failed to approve token: ${error instanceof Error ? error.message : String(error)}`);
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
      if (unit === Unit.ETH) {
        // Get token decimals and convert to ETH units
        const decimals = await ERC20Service.getDecimals(rpcUrlOrTokenSymbol, tokenContractAddressOrChainName);
        return ethers.formatUnits(allowance, decimals);
      } else {
        // WEI - return raw allowance
        return allowance.toString();
      }
    } catch (error) {
      throw new Error(`Failed to get token allowance: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}