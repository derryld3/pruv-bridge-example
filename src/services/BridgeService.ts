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
  private static async validateAndConvertAmount(
    tokenSymbol: string,
    originChain: string,
    amount: string,
    amountUnit: Unit,
  ): Promise<bigint> {
    const tokenDecimals = await ERC20Service.getDecimals(
      tokenSymbol,
      originChain,
    );
    return amountUnit === Unit.ETH
      ? ethers.parseUnits(amount, tokenDecimals)
      : ethers.parseUnits(amount, 0);
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
      // Basic input validation
      this.validateInputParameters(
        tokenSymbol,
        originChain,
        destinationChain,
        receiverAddress,
        amount,
        senderAddressOrPrivateKey,
      );

      // Address validation and resolution
      const senderAddress = this.validateAndResolveSenderAddress(
        senderAddressOrPrivateKey,
      );
      this.validateReceiverAddress(receiverAddress);

      // Chain and router validation
      this.validateChainDifference(originChain, destinationChain);
      await this.validateDestinationRouter(
        tokenSymbol,
        originChain,
        destinationChain,
      );

      // Balance and amount validation
      const amountInWei = await this.validateAndConvertAmount(
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

      // Gas and native balance validation
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
}
