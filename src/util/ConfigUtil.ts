// Type definitions for configuration files
interface ChainConfig {
  [chainName: string]: {
    chain_id: number;
    rpc_urls: string[];
    core_addresses?: {
      mailbox: string;
    };
  };
}

interface AssetsConfig {
  [tokenSymbol: string]: {
    [chainName: string]: {
      router_address: string;
      collateral_address: string;
    };
  };
}

// Import configuration files directly
import * as chainConfigData from '../../conifg/chain_config.json';
import * as assetsConfigData from '../../conifg/assets_config.json';

const chainConfig: ChainConfig = chainConfigData as ChainConfig;
const assetsConfig: AssetsConfig = assetsConfigData as AssetsConfig;

/**
 * Static utility class for handling configuration mappings
 */
export class ConfigUtil {
  /**
   * Private constructor to prevent instantiation
   * @private
   */
  private constructor() {
    throw new Error(
      'ConfigUtil is a static utility class and cannot be instantiated',
    );
  }

  /**
   * Get RPC URL for a given chain name
   * @param chainName - The name of the chain
   * @returns string - The RPC URL
   */
  static getRpcUrl(chainName: string): string {
    const chainInfo = chainConfig[chainName];
    if (!chainInfo) {
      throw new Error(`Chain '${chainName}' not found in configuration`);
    }

    if (!chainInfo.rpc_urls || chainInfo.rpc_urls.length === 0) {
      throw new Error(`No RPC URLs found for chain '${chainName}'`);
    }

    const rpcUrl = chainInfo.rpc_urls[0];
    if (!rpcUrl) {
      throw new Error(`Invalid RPC URL for chain '${chainName}'`);
    }

    return rpcUrl;
  }

  /**
   * Get domain ID (chain ID) for a given chain name
   * @param chainName - The name of the chain
   * @returns number - The chain ID
   */
  static getDomainId(chainName: string): number {
    const chainInfo = chainConfig[chainName];
    if (!chainInfo) {
      throw new Error(`Chain '${chainName}' not found in configuration`);
    }

    return chainInfo.chain_id;
  }

  /**
   * Get router address for a given asset and chain
   * @param assetName - The symbol of the asset
   * @param chainName - The name of the chain
   * @returns string - The router address
   */
  static getRouterAddress(assetName: string, chainName: string): string {
    const assetInfo = assetsConfig[assetName];
    if (!assetInfo) {
      throw new Error(`Asset '${assetName}' not found in configuration`);
    }

    const chainInfo = assetInfo[chainName];
    if (!chainInfo) {
      throw new Error(
        `Asset '${assetName}' not available on chain '${chainName}'`,
      );
    }

    return chainInfo.router_address;
  }

  /**
   * Get collateral address for a given asset and chain
   * @param assetName - The symbol of the asset
   * @param chainName - The name of the chain
   * @returns string - The collateral address
   */
  static getCollateralAddress(assetName: string, chainName: string): string {
    const assetInfo = assetsConfig[assetName];
    if (!assetInfo) {
      throw new Error(`Asset '${assetName}' not found in configuration`);
    }

    const chainInfo = assetInfo[chainName];
    if (!chainInfo) {
      throw new Error(
        `Asset '${assetName}' not available on chain '${chainName}'`,
      );
    }

    return chainInfo.collateral_address;
  }

  /**
   * Get mailbox address for a given chain
   * @param chainName - The name of the chain
   * @returns string - The mailbox address
   */
  static getMailboxAddress(chainName: string): string {
    const chainInfo = chainConfig[chainName];
    if (!chainInfo) {
      throw new Error(`Chain '${chainName}' not found in configuration`);
    }

    if (!chainInfo.core_addresses || !chainInfo.core_addresses.mailbox) {
      throw new Error(`Mailbox address not found for chain '${chainName}'`);
    }

    return chainInfo.core_addresses.mailbox;
  }
}
