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
      // Validate input parameters
      this.validateRequiredParameters({
        tokenSymbol,
        originChain,
        destinationChain,
        receiverAddress,
        senderAddressOrPrivateKey,
        amount,
      });

      // Validate amount is a positive number
      this.validatePositiveAmount(amount);

      // Validate chains are different
      if (originChain === destinationChain) {
        throw new Error('Origin and destination chains must be different');
      }

      // Validate receiver address format using ethers.js and ensure 0x prefix
      if (
        !ethers.isAddress(receiverAddress) ||
        !receiverAddress.startsWith('0x')
      ) {
        throw new Error('Receiver address must be a valid Ethereum address');
      }

      let senderAddress: string;
      if (ethers.isAddress(senderAddressOrPrivateKey)) {
        senderAddress = senderAddressOrPrivateKey;
      } else {
        try {
          senderAddress = new ethers.Wallet(senderAddressOrPrivateKey).address;
        } catch (error) {
          throw new Error('Invalid sender address or private key');
        }
      }

      const destinationDomainId = ConfigUtil.getDomainId(destinationChain);

      // validate destination router is available
      const destinationRouterAddress = await TokenRouterService.routers(
        tokenSymbol,
        originChain,
        destinationDomainId,
      );

      // Validate router address is not ZeroAddress
      if (
        !destinationRouterAddress ||
        destinationRouterAddress === ethers.ZeroAddress
      ) {
        throw new Error(
          `No router available for ${tokenSymbol} on destination chain ${destinationChain} (domain ${destinationDomainId})`,
        );
      }

      // retrieve sender token balance
      const senderTokenBalance = await TokenRouterService.balanceOf(
        tokenSymbol,
        originChain,
        senderAddress,
      );

      // Check if sender has sufficient balance

      // Get token decimals to properly convert amount
      const tokenDecimals = await ERC20Service.getDecimals(
        tokenSymbol,
        originChain,
      );
      const amountInWei =
        amountUnit === Unit.ETH
          ? ethers.parseUnits(amount, tokenDecimals)
          : ethers.parseUnits(amount, 0);

      if (BigInt(senderTokenBalance) < amountInWei) {
        throw new Error(
          `Insufficient balance for ${tokenSymbol}: sender has ${senderTokenBalance} wei but trying to transfer ${amountInWei.toString()} wei`,
        );
      }

      // get gas price estimation to destination domain by calling token router service quote gas payment
      const bridgeFee = await TokenRouterService.quoteGasPayment(
        tokenSymbol,
        originChain,
        destinationChain,
      );

      // fetch user's native balance on origin chain
      const originRpcUrl = ConfigUtil.getRpcUrl(originChain);
      const provider = new ethers.JsonRpcProvider(originRpcUrl);
      const senderNativeBalance = await provider.getBalance(senderAddress);

      // Check if sender has sufficient native balance to cover gas payment
      if (BigInt(senderNativeBalance) < BigInt(bridgeFee)) {
        throw new Error(
          `Insufficient native balance for gas payment: sender has ${ethers.formatEther(senderNativeBalance)} ETH but needs ${ethers.formatEther(bridgeFee)} ETH`,
        );
      }

      return true;
    } catch (error) {
      throw new Error(
        `Transfer precheck failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
