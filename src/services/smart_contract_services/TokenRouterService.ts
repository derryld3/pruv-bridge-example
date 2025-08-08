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
   * Create a contract instance for write operations with a signer
   * @param rpcUrl - The RPC URL of the blockchain network
   * @param routerContractAddress - The address of the TokenRouter contract
   * @param privateKey - The private key for signing transactions
   * @returns ethers.Contract instance with signer
   * @private
   */
  private static createWriteContract(
    rpcUrl: string,
    routerContractAddress: string,
    privateKey: string,
  ): ethers.Contract {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    return new ethers.Contract(routerContractAddress, tokenRouterAbi, wallet);
  }

  /**
   * Transfer tokens to a remote chain
   * @param tokenSymbol - The symbol of the token (e.g., 'USDC')
   * @param sourceChainName - The name of the source chain
   * @param destinationChainName - The name of the destination chain
   * @param recipient - The recipient address as bytes32
   * @param amount - The amount of tokens to transfer
   * @param value - The ETH value to send with the transaction (for gas payment)
   * @param privateKey - The private key for signing the transaction
   * @returns Promise<string> - The message ID of the transfer
   */
  static async transferRemote(
    tokenSymbol: string,
    sourceChainName: string,
    destinationChainName: string,
    recipient: string,
    amount: bigint,
    value: bigint = BigInt(0),
    privateKey: string,
  ): Promise<{ transactionHash: string; messageId: string }> {
    try {
      // Get configuration values
      const rpcUrl = ConfigUtil.getRpcUrl(sourceChainName);
      const routerContractAddress = ConfigUtil.getRouterAddress(
        tokenSymbol,
        sourceChainName,
      );
      const destinationDomainId = ConfigUtil.getDomainId(destinationChainName);

      const contract = this.createWriteContract(
        rpcUrl,
        routerContractAddress,
        privateKey,
      );

      // Call transferRemote and wait for transaction completion
      const tx = await contract.transferRemote(
        destinationDomainId,
        recipient,
        amount,
        { value },
      );

      console.log(`Transaction hash: ${tx.hash}`);

      // Wait for the transaction to be mined
      const receipt = await tx.wait();
      
      // Try to extract message ID, fallback to transaction hash only if it fails
      try {
        // Get mailbox address from ConfigUtil
        const mailboxAddress = ConfigUtil.getMailboxAddress(sourceChainName);
        
        // Extract message ID from transaction receipt
        const messageId = this.getMessageId(receipt, mailboxAddress);
        
        return {
          transactionHash: tx.hash,
          messageId: messageId
        };
      } catch (messageIdError) {
        console.warn(`Failed to extract message ID: ${messageIdError instanceof Error ? messageIdError.message : String(messageIdError)}`);
        return {
          transactionHash: tx.hash,
          messageId: ''
        };
      }
    } catch (error) {
      this.handleError(error, 'transferRemote');
    }
  }

  /**
   * Extract message ID from transaction receipt
   * @param receipt - The transaction receipt
   * @param mailboxAddress - The mailbox address to filter logs by
   * @returns The message ID as a string
   */
  private static getMessageId(receipt: any, mailboxAddress: string): string {
    try {
      if (receipt.logs && receipt.logs.length > 0) {
        // Find logs with mailbox address and exactly 2 topics
        const mailboxLogs = receipt.logs.filter((log: any) => 
          log.address && log.address.toLowerCase() === mailboxAddress.toLowerCase() &&
          log.topics && log.topics.length === 2
        );
        
        if (mailboxLogs.length > 0) {
          // Return the last topic of the first matching log
          return mailboxLogs[0].topics[1];
        }
      }
    } catch (error) {
      console.warn('Error extracting message ID from logs:', error);
    }
    
    // Throw error if no message ID found - indicates invalid mailbox address in config
    throw new Error('Message ID not found in receipt. This indicates an invalid mailbox address in the configuration.');
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
