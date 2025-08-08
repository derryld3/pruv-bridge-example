import { ethers } from 'ethers';
import { ConfigUtil } from '../../util/ConfigUtil';
import { TokenRouterCaller } from '../../caller/smart_contract_caller/TokenRouterCaller';

/**
 * TokenRouter Service - High-level service for cross-chain token transfers using Hyperlane's TokenRouter
 * Handles configuration resolution and user input processing for token transfers
 */
export class TokenRouterService {
  private constructor() {
    throw new Error(
      'TokenRouterService is a static utility class and cannot be instantiated',
    );
  }

  /**
   * Extract message ID from transaction receipt
   * @param receipt - The transaction receipt
   * @param mailboxAddress - The mailbox address to filter logs by
   * @returns The message ID as a string
   */
  static getMessageId(receipt: any, mailboxAddress: string): string {
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

      const gasPayment = await TokenRouterCaller.quoteGasPayment(
        rpcUrl,
        routerContractAddress,
        destinationDomainId,
      );

      return gasPayment.toString();
    } catch (error) {
      throw new Error(
        `Failed to quote gas payment: ${error instanceof Error ? error.message : String(error)}`,
      );
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

      return await TokenRouterCaller.getRouters(
        rpcUrl,
        routerContractAddress,
        domainId,
      );
    } catch (error) {
      throw new Error(
        `Failed to get router address: ${error instanceof Error ? error.message : String(error)}`,
      );
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

      const balance = await TokenRouterCaller.getBalanceOf(
        rpcUrl,
        routerContractAddress,
        account,
      );

      return balance.toString();
    } catch (error) {
      throw new Error(
        `Failed to get balance: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
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

      // Create signer from private key
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const signer = new ethers.Wallet(privateKey, provider);

      // Call TokenRouterCaller
      const result = await TokenRouterCaller.transferRemote(
        routerContractAddress,
        destinationDomainId,
        recipient,
        amount,
        value,
        signer,
      );

      // Try to extract message ID, fallback to empty string if it fails
      try {
        // Get mailbox address from ConfigUtil
        const mailboxAddress = ConfigUtil.getMailboxAddress(sourceChainName);
        
        // Extract message ID from transaction receipt
        const messageId = TokenRouterService.getMessageId(result.receipt, mailboxAddress);
        
        return {
          transactionHash: result.transactionHash,
          messageId: messageId
        };
      } catch (messageIdError) {
        console.warn(`Failed to extract message ID: ${messageIdError instanceof Error ? messageIdError.message : String(messageIdError)}`);
        return {
          transactionHash: result.transactionHash,
          messageId: ''
        };
      }
    } catch (error) {
      throw new Error(
        `Failed to transfer tokens: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
