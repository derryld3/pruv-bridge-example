import { Unit } from '../util/Unit';
import { ConfigUtil } from '../util/ConfigUtil';
import { TokenRouterService } from './smart_contract_services/TokenRouterService';
import { ERC20Service } from './smart_contract_services/ERC20Service';
import { ethers } from 'ethers';

/**
 * Bridge Service static utility class for handling cross-chain token transfers
 */
export class BridgeService {
  private constructor() {
    throw new Error(
      'BridgeService is a static utility class and cannot be instantiated',
    );
  }

  private static isNullish(value: unknown): boolean {
    return value === null || value === undefined || value === '';
  }

  private static validateRequiredParameters(params: Record<string, any>): void {
    for (const [paramName, paramValue] of Object.entries(params)) {
      if (BridgeService.isNullish(paramValue)) {
        throw new Error(`${paramName} is required and cannot be empty`);
      }
    }
  }

  private static validatePositiveAmount(amount: string): void {
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      throw new Error('Amount must be a positive number');
    }
  }

  /**
   * Validates all required input parameters
   */
  private static validateInputParameters(
    tokenSymbol: string,
    originChain: string,
    destinationChain: string,
    receiverAddress: string,
    amount: string,
    senderAddressOrPrivateKey: string,
  ): void {
    this.validateRequiredParameters({
      tokenSymbol,
      originChain,
      destinationChain,
      receiverAddress,
      senderAddressOrPrivateKey,
      amount,
    });
    this.validatePositiveAmount(amount);
  }

  /**
   * Validates and resolves sender address from address or private key
   */
  private static validateAndResolveSenderAddress(
    senderAddressOrPrivateKey: string,
  ): string {
    if (ethers.isAddress(senderAddressOrPrivateKey)) {
      return senderAddressOrPrivateKey;
    }

    try {
      return new ethers.Wallet(senderAddressOrPrivateKey).address;
    } catch (error) {
      throw new Error('Invalid sender address or private key');
    }
  }

  /**
   * Validates receiver address format
   */
  private static validateReceiverAddress(receiverAddress: string): void {
    if (
      !ethers.isAddress(receiverAddress) ||
      !receiverAddress.startsWith('0x')
    ) {
      throw new Error('Receiver address must be a valid Ethereum address');
    }
  }

  /**
   * Validates that origin and destination chains are different
   */
  private static validateChainDifference(
    originChain: string,
    destinationChain: string,
  ): void {
    if (originChain === destinationChain) {
      throw new Error('Origin and destination chains must be different');
    }
  }

  /**
   * Validates that destination router is available for the token
   */
  private static async validateDestinationRouter(
    tokenSymbol: string,
    originChain: string,
    destinationChain: string,
  ): Promise<void> {
    const destinationDomainId = ConfigUtil.getDomainId(destinationChain);
    const destinationRouterAddress = await TokenRouterService.routers(
      tokenSymbol,
      originChain,
      destinationDomainId,
    );

    if (
      !destinationRouterAddress ||
      destinationRouterAddress === ethers.ZeroAddress
    ) {
      throw new Error(
        `No router available for ${tokenSymbol} on destination chain ${destinationChain} (domain ${destinationDomainId})`,
      );
    }
  }

  /**
   * Validates and converts amount to wei based on token decimals
   */
  private static async convertTokenAmountToWei(
    tokenSymbol: string,
    originChain: string,
    amount: string,
    amountUnit: Unit,
  ): Promise<bigint> {
    // If already in wei, return immediately without fetching decimals
    if (amountUnit === Unit.WEI) {
      return ethers.parseUnits(amount, 0);
    }

    // For ETH units, fetch token decimals and convert
    const tokenDecimals = await ERC20Service.getDecimals(
      tokenSymbol,
      originChain,
    );
    return ethers.parseUnits(amount, tokenDecimals);
  }

  /**
   * Validates that sender has sufficient token balance
   */
  private static async validateTokenBalance(
    tokenSymbol: string,
    originChain: string,
    senderAddress: string,
    amountInWei: bigint,
  ): Promise<void> {
    const senderTokenBalance = await TokenRouterService.balanceOf(
      tokenSymbol,
      originChain,
      senderAddress,
    );

    if (BigInt(senderTokenBalance) < amountInWei) {
      throw new Error(
        `Insufficient balance for ${tokenSymbol}: sender has ${senderTokenBalance} wei but trying to transfer ${amountInWei.toString()} wei`,
      );
    }
  }

  /**
   * Validates that sender has sufficient native balance for gas payment
   */
  private static async validateNativeBalanceForGas(
    tokenSymbol: string,
    originChain: string,
    destinationChain: string,
    senderAddress: string,
  ): Promise<void> {
    const bridgeFee = await TokenRouterService.quoteGasPayment(
      tokenSymbol,
      originChain,
      destinationChain,
    );

    const originRpcUrl = ConfigUtil.getRpcUrl(originChain);
    const provider = new ethers.JsonRpcProvider(originRpcUrl);
    const senderNativeBalance = await provider.getBalance(senderAddress);

    if (BigInt(senderNativeBalance) < BigInt(bridgeFee)) {
      throw new Error(
        `Insufficient native balance for gas payment: sender has ${ethers.formatEther(senderNativeBalance)} ETH but needs ${ethers.formatEther(bridgeFee)} ETH`,
      );
    }
  }

  /**
   * Precheck transfer token operation before executing the actual transfer
   * @param tokenSymbol - The symbol of the token to transfer (e.g., 'USDC')
   * @param originChain - The source chain name
   * @param destinationChain - The destination chain name
   * @param receiverAddress - The recipient address on the destination chain
   * @param amount - The amount to transfer
   * @param amountUnit - The unit of the amount (e.g., Unit.ETH, Unit.WEI)
   * @param senderAddressOrPrivateKey - The sender's Ethereum address or private key
   * @returns Promise<boolean> - Returns true if precheck passes, throws error if precheck fails
   */
  static async precheckTransferToken(
    tokenSymbol: string,
    originChain: string,
    destinationChain: string,
    receiverAddress: string,
    amount: string,
    amountUnit: Unit,
    senderAddressOrPrivateKey: string,
  ): Promise<boolean> {
    try {
      // Basic input validation (can't be nullish)
      this.validateInputParameters(
        tokenSymbol,
        originChain,
        destinationChain,
        receiverAddress,
        amount,
        senderAddressOrPrivateKey,
      );

      // validate originChain and destinationChain are different
      this.validateChainDifference(originChain, destinationChain);

      // validate sender and receiver address
      this.validateReceiverAddress(receiverAddress);
      const senderAddress = this.validateAndResolveSenderAddress(
        senderAddressOrPrivateKey,
      );

      // validate bridge to destination chain is available and active
      await this.validateDestinationRouter(
        tokenSymbol,
        originChain,
        destinationChain,
      );

      // validate sender's token balance is sufficient
      const amountInWei = await BridgeService.convertTokenAmountToWei(
        tokenSymbol,
        originChain,
        amount,
        amountUnit,
      );
      await this.validateTokenBalance(
        tokenSymbol,
        originChain,
        senderAddress,
        amountInWei,
      );

      // Native balance validation (requires RPC call)
      await this.validateNativeBalanceForGas(
        tokenSymbol,
        originChain,
        destinationChain,
        senderAddress,
      );

      return true;
    } catch (error) {
      throw new Error(
        `Transfer precheck failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Transfers tokens from one chain to another using Hyperlane's cross-chain infrastructure.
   *
   * This method performs a complete end-to-end token transfer including:
   * - Input validation and precheck
   * - Allowance verification (only approves if insufficient)
   * - Gas payment quoting
   *
   * @param tokenSymbol - The symbol of the token to transfer (e.g., 'USDC')
   * @param originChain - The source chain name (e.g., 'sepolia')
   * @param destinationChain - The destination chain name (e.g., 'pruvtest')
   * @param receiverAddress - The recipient's address on the destination chain
   * @param amount - The amount to transfer in human-readable format
   * @param amountUnit - The unit of the amount (Unit.ETH for standard decimals)
   * @param privateKey - The sender's private key for signing transactions
   *
   * @returns Promise resolving to an object containing:
   *   - transactionHash: The hash of the transfer transaction
   *   - messageId: The Hyperlane message ID for tracking cross-chain delivery
   */
  static async transferToken(
    tokenSymbol: string,
    originChain: string,
    destinationChain: string,
    receiverAddress: string,
    amount: string,
    amountUnit: Unit,
    privateKey: string,
  ): Promise<{ transactionHash: string; messageId: string }> {
    this.validateInputParameters(
      tokenSymbol,
      originChain,
      destinationChain,
      receiverAddress,
      amount,
      privateKey,
    );

    this.validateReceiverAddress(receiverAddress);

    const senderAddress = this.validateAndResolveSenderAddress(privateKey);

    const amountInWei = await this.convertTokenAmountToWei(
      tokenSymbol,
      originChain,
      amount,
      amountUnit,
    );

    // Check current allowance before approving
    const routerAddress = ConfigUtil.getRouterAddress(tokenSymbol, originChain);

    const currentAllowance = await ERC20Service.getAllowance(
      tokenSymbol,
      originChain,
      senderAddress,
      routerAddress,
      amountUnit,
    );

    // Compare allowance with transfer amount
    const currentAllowanceNum = parseFloat(currentAllowance);
    const transferAmountNum = parseFloat(amount);

    if (currentAllowanceNum >= transferAmountNum) {
      console.log(
        `✅ Current allowance (${currentAllowance}) is sufficient for transfer amount (${amount}), no need to approve`,
      );
    } else {
      console.log(
        `🔐 Current allowance (${currentAllowance}) is insufficient, approving ${amount} ${tokenSymbol}...`,
      );
      await ERC20Service.approve(
        tokenSymbol,
        originChain,
        routerAddress,
        amount,
        amountUnit,
        privateKey,
      );
    }

    const gasQuote = await TokenRouterService.quoteGasPayment(
      tokenSymbol,
      originChain,
      destinationChain,
    );

    const recipientBytes32 = ethers.zeroPadValue(receiverAddress, 32);

    const result = await TokenRouterService.transferRemote(
      tokenSymbol,
      originChain,
      destinationChain,
      recipientBytes32,
      amountInWei,
      BigInt(gasQuote),
      privateKey,
    );

    return {
      transactionHash: result.transactionHash,
      messageId: result.messageId,
    };
  }
}
