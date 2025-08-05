import { ConfigUtil } from './ConfigUtil';

// Mock the configuration files
jest.mock('../../conifg/chain_config.json', () => ({
  ethereum: {
    chain_id: 1,
    rpc_urls: ['https://mainnet.infura.io/v3/test']
  },
  polygon: {
    chain_id: 137,
    rpc_urls: ['https://polygon-rpc.com', 'https://rpc-mainnet.matic.network']
  },
  emptyRpc: {
    chain_id: 999,
    rpc_urls: []
  },
  nullRpc: {
    chain_id: 998,
    rpc_urls: [null]
  }
}), { virtual: true });

jest.mock('../../conifg/assets_config.json', () => ({
  USDC: {
    ethereum: {
      router_address: '0x1234567890123456789012345678901234567890',
      collateral_address: '0xA0b86a33E6441c8C06DD2b7c94b7E0e8c0c8c8c8'
    },
    polygon: {
      router_address: '0x2345678901234567890123456789012345678901',
      collateral_address: '0xB1c97a44F7552d9A06EE3c8c95c8F9f9d9d9d9d9'
    }
  },
  USDT: {
    ethereum: {
      router_address: '0x3456789012345678901234567890123456789012',
      collateral_address: '0xC2da8b55G8663eAB07FF4d9d96d9G0g0e0e0e0e0'
    },
    polygon: {
      router_address: '0x4567890123456789012345678901234567890123',
      collateral_address: '0xD3eb9c66H9774fBC08GG5e0e07e0H1h1f1f1f1f1'
    }
  }
}), { virtual: true });

describe('ConfigUtil', () => {
  describe('Constructor', () => {
    it('should throw error when trying to instantiate', () => {
      expect(() => new (ConfigUtil as any)()).toThrow(
        'ConfigUtil is a static utility class and cannot be instantiated'
      );
    });
  });

  describe('getRpcUrl', () => {
    it('should return the first RPC URL for a valid chain', () => {
      expect(ConfigUtil.getRpcUrl('ethereum')).toBe('https://mainnet.infura.io/v3/test');
      expect(ConfigUtil.getRpcUrl('polygon')).toBe('https://polygon-rpc.com');
    });

    it('should throw error for non-existent chain', () => {
      expect(() => ConfigUtil.getRpcUrl('nonexistent')).toThrow(
        "Chain 'nonexistent' not found in configuration"
      );
    });

    it('should throw error for chain with empty RPC URLs array', () => {
      expect(() => ConfigUtil.getRpcUrl('emptyRpc')).toThrow(
        "No RPC URLs found for chain 'emptyRpc'"
      );
    });

    it('should throw error for chain with null RPC URL', () => {
      expect(() => ConfigUtil.getRpcUrl('nullRpc')).toThrow(
        "Invalid RPC URL for chain 'nullRpc'"
      );
    });
  });

  describe('getDomainId', () => {
    it('should return the correct chain ID for valid chains', () => {
      expect(ConfigUtil.getDomainId('ethereum')).toBe(1);
      expect(ConfigUtil.getDomainId('polygon')).toBe(137);
    });

    it('should throw error for non-existent chain', () => {
      expect(() => ConfigUtil.getDomainId('nonexistent')).toThrow(
        "Chain 'nonexistent' not found in configuration"
      );
    });
  });

  describe('getRouterAddress', () => {
    it('should return the correct router address for valid asset and chain', () => {
      expect(ConfigUtil.getRouterAddress('USDC', 'ethereum')).toBe(
        '0x1234567890123456789012345678901234567890'
      );
      expect(ConfigUtil.getRouterAddress('USDC', 'polygon')).toBe(
        '0x2345678901234567890123456789012345678901'
      );
      expect(ConfigUtil.getRouterAddress('USDT', 'ethereum')).toBe(
        '0x3456789012345678901234567890123456789012'
      );
      expect(ConfigUtil.getRouterAddress('USDT', 'polygon')).toBe(
        '0x4567890123456789012345678901234567890123'
      );
    });

    it('should throw error for non-existent asset', () => {
      expect(() => ConfigUtil.getRouterAddress('NONEXISTENT', 'ethereum')).toThrow(
        "Asset 'NONEXISTENT' not found in configuration"
      );
    });

    it('should throw error for asset not available on specified chain', () => {
      expect(() => ConfigUtil.getRouterAddress('USDC', 'avalanche')).toThrow(
        "Asset 'USDC' not available on chain 'avalanche'"
      );
    });
  });

  describe('getCollateralAddress', () => {
    it('should return the correct collateral address for valid asset and chain', () => {
      expect(ConfigUtil.getCollateralAddress('USDC', 'ethereum')).toBe(
        '0xA0b86a33E6441c8C06DD2b7c94b7E0e8c0c8c8c8'
      );
      expect(ConfigUtil.getCollateralAddress('USDC', 'polygon')).toBe(
        '0xB1c97a44F7552d9A06EE3c8c95c8F9f9d9d9d9d9'
      );
      expect(ConfigUtil.getCollateralAddress('USDT', 'ethereum')).toBe(
        '0xC2da8b55G8663eAB07FF4d9d96d9G0g0e0e0e0e0'
      );
      expect(ConfigUtil.getCollateralAddress('USDT', 'polygon')).toBe(
        '0xD3eb9c66H9774fBC08GG5e0e07e0H1h1f1f1f1f1'
      );
    });

    it('should throw error for non-existent asset', () => {
      expect(() => ConfigUtil.getCollateralAddress('NONEXISTENT', 'ethereum')).toThrow(
        "Asset 'NONEXISTENT' not found in configuration"
      );
    });

    it('should throw error for asset not available on specified chain', () => {
      expect(() => ConfigUtil.getCollateralAddress('USDC', 'avalanche')).toThrow(
        "Asset 'USDC' not available on chain 'avalanche'"
      );
    });
  });
});