import { ethers } from 'ethers';
import * as erc20Abi from '../../../contract/@openzeppelin/ERC20.abi.json';

/**
 * ERC20 Caller - Low-level contract interaction utility
 * Handles raw blockchain calls without conversions or transaction signing
 */
export class ERC20Caller {
  private static abi: any = (erc20Abi as any).default || erc20Abi;

  private constructor() {
    throw new Error(
      'ERC20Caller is a static utility class and cannot be instantiated',
    );
  }

  /**
   * Create a contract instance for read-only operations
   * @param rpcUrl - The RPC URL of the blockchain network
   * @param tokenContractAddress - The address of the ERC20 token contract
   * @returns ethers.Contract instance
   */
  static createReadOnlyContract(
    rpcUrl: string,
    tokenContractAddress: string,
  ): ethers.Contract {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    return new ethers.Contract(
      tokenContractAddress,
      ERC20Caller.abi,
      provider,
    );
  }

  /**
   * Get the decimals of an ERC20 token
   * @param rpcUrl - The RPC URL of the blockchain network
   * @param tokenContractAddress - The address of the ERC20 token contract
   * @returns Promise<number> - The number of decimals
   */
  static async getDecimals(
    rpcUrl: string,
    tokenContractAddress: string,
  ): Promise<number> {
    try {
      const tokenContract = ERC20Caller.createReadOnlyContract(
        rpcUrl,
        tokenContractAddress,
      );

      // Call decimals function (read-only call)
      const decimals = await tokenContract.decimals.staticCall();

      return Number(decimals);
    } catch (error) {
      throw new Error(
        `Failed to get token decimals: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Get the allowance of a spender for a specific owner
   * @param rpcUrl - The RPC URL of the blockchain network
   * @param tokenContractAddress - The address of the ERC20 token contract
   * @param ownerAddress - The address of the token owner
   * @param spenderAddress - The address of the spender
   * @returns Promise<bigint> - The allowance in wei
   */
  static async getAllowance(
    rpcUrl: string,
    tokenContractAddress: string,
    ownerAddress: string,
    spenderAddress: string,
  ): Promise<bigint> {
    try {
      const tokenContract = ERC20Caller.createReadOnlyContract(
        rpcUrl,
        tokenContractAddress,
      );

      // Call allowance function (read-only call)
      const allowance = await tokenContract.allowance.staticCall(
        ownerAddress,
        spenderAddress,
      );

      return allowance;
    } catch (error) {
      throw new Error(
        `Failed to get token allowance: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  
   /**
   * Approve a spender to spend tokens on behalf of the owner
   * @param tokenContractAddress - The address of the ERC20 token contract
   * @param spenderAddress - The address that will be approved to spend tokens
   * @param amountInWei - The amount of tokens to approve in wei
   * @param signer - The signer for the transaction
   * @returns Promise<string> - The transaction hash
   */
  static async approve(
    tokenContractAddress: string,
    spenderAddress: string,
    amountInWei: bigint,
    signer: ethers.Signer,
  ): Promise<string> {
    try {
      const tokenContract = new ethers.Contract(
        tokenContractAddress,
        ERC20Caller.abi,
        signer,
      );

      // Call approve function
      const tx = await tokenContract.approve(spenderAddress, amountInWei);

      // Wait for transaction confirmation
      const receipt = await tx.wait();

      return receipt.hash;
    } catch (error) {
      throw new Error(
        `Failed to approve token: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}