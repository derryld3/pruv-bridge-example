import { TokenRouterService } from './TokenRouterService';
import { ethers } from 'ethers';
import { ConfigUtil } from '../../util/ConfigUtil';

// Mock ethers
jest.mock('ethers', () => ({
  ethers: {
    JsonRpcProvider: jest.fn(),
    Wallet: jest.fn(),
    Contract: jest.fn(),
    parseEther: jest.fn(),
    parseUnits: jest.fn(),
    formatUnits: jest.fn(),
    zeroPadValue: jest.fn(),
  },
}));

// Mock ConfigUtil
jest.mock('../../util/ConfigUtil', () => ({
  ConfigUtil: {
    getRpcUrl: jest.fn(),
    getRouterAddress: jest.fn(),
    getDomainId: jest.fn(),
    getCollateralAddress: jest.fn(),
  },
}));

jest.mock('./ERC20Service', () => ({
  ERC20Service: {
    getDecimals: jest.fn(),
  },
}));

// Mock TokenRouter ABI
jest.mock(
  '../../../contract/hyperlane/TokenRouter.abi.json',
  () => [
    {
      inputs: [],
      name: 'domains',
      outputs: [
        {
          internalType: 'uint32[]',
          name: '',
          type: 'uint32[]',
        },
      ],
      stateMutability: 'view',
      type: 'function',
    },
    {
      inputs: [
        {
          internalType: 'uint32',
          name: '_destinationDomain',
          type: 'uint32',
        },
      ],
      name: 'quoteGasPayment',
      outputs: [
        {
          internalType: 'uint256',
          name: '',
          type: 'uint256',
        },
      ],
      stateMutability: 'view',
      type: 'function',
    },
    {
      inputs: [
        {
          internalType: 'uint32',
          name: '_domain',
          type: 'uint32',
        },
      ],
      name: 'routers',
      outputs: [
        {
          internalType: 'bytes32',
          name: '',
          type: 'bytes32',
        },
      ],
      stateMutability: 'view',
      type: 'function',
    },
    {
      inputs: [
        {
          internalType: 'address',
          name: 'account',
          type: 'address',
        },
      ],
      name: 'balanceOf',
      outputs: [
        {
          internalType: 'uint256',
          name: '',
          type: 'uint256',
        },
      ],
      stateMutability: 'nonpayable',
      type: 'function',
    },
  ],
  { virtual: true },
);

describe('TokenRouterService', () => {
  const mockProvider = {
    getNetwork: jest.fn(),
  };
  const mockWallet = {
    address: '0x1234567890123456789012345678901234567890',
  };
  const mockContract = {
    domains: {
      staticCall: jest.fn(),
    },
    quoteGasPayment: {
      staticCall: jest.fn(),
    },
    routers: {
      staticCall: jest.fn(),
    },
    balanceOf: {
      staticCall: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (ethers.JsonRpcProvider as jest.MockedFunction<any>).mockReturnValue(
      mockProvider,
    );
    (ethers.Wallet as jest.MockedFunction<any>).mockReturnValue(mockWallet);
    (ethers.Contract as jest.MockedFunction<any>).mockReturnValue(mockContract);
  });

  describe('constructor', () => {
    it('should throw an error when trying to instantiate', () => {
      expect(() => new (TokenRouterService as any)()).toThrow(
        'TokenRouterService is a static utility class and cannot be instantiated',
      );
    });
  });



  describe('quoteGasPayment', () => {
    const tokenSymbol = 'USDC';
    const sourceChainName = 'sepolia';
    const destinationChainName = 'arbitrumsepolia';

    beforeEach(() => {
      jest.clearAllMocks();
      (ConfigUtil.getRpcUrl as jest.Mock).mockReturnValue(
        'https://rpc.sepolia.org',
      );
      (ConfigUtil.getRouterAddress as jest.Mock).mockReturnValue(
        '0x1234567890123456789012345678901234567890',
      );
      (ConfigUtil.getDomainId as jest.Mock).mockReturnValue(421614);
    });

    it('should successfully quote gas payment', async () => {
      const mockGasPayment = BigInt('1000000000000000000'); // 1 ETH in wei
      const mockContract = {
        quoteGasPayment: {
          staticCall: jest.fn().mockResolvedValue(mockGasPayment),
        },
      };
      (ethers.Contract as jest.MockedFunction<any>).mockReturnValue(
        mockContract,
      );

      const result = await TokenRouterService.quoteGasPayment(
        tokenSymbol,
        sourceChainName,
        destinationChainName,
      );

      expect(ConfigUtil.getRpcUrl).toHaveBeenCalledWith(sourceChainName);
      expect(ConfigUtil.getRouterAddress).toHaveBeenCalledWith(
        tokenSymbol,
        sourceChainName,
      );
      expect(ConfigUtil.getDomainId).toHaveBeenCalledWith(destinationChainName);
      expect(ethers.Contract).toHaveBeenCalledWith(
        '0x1234567890123456789012345678901234567890',
        expect.any(Array),
        expect.any(Object),
      );
      expect(mockContract.quoteGasPayment.staticCall).toHaveBeenCalledWith(
        421614,
      );
      expect(result).toBe('1000000000000000000');
    });

    it('should handle contract call errors', async () => {
      const error = new Error('Contract call failed');
      const mockContract = {
        quoteGasPayment: {
          staticCall: jest.fn().mockRejectedValue(error),
        },
      };
      (ethers.Contract as jest.MockedFunction<any>).mockReturnValue(
        mockContract,
      );

      await expect(
        TokenRouterService.quoteGasPayment(
          tokenSymbol,
          sourceChainName,
          destinationChainName,
        ),
      ).rejects.toThrow('Failed to quoteGasPayment: Contract call failed');
    });

    it('should handle ConfigUtil errors', async () => {
      const error = new Error('Chain not found');
      (ConfigUtil.getRpcUrl as jest.Mock).mockImplementation(() => {
        throw error;
      });

      await expect(
        TokenRouterService.quoteGasPayment(
          tokenSymbol,
          sourceChainName,
          destinationChainName,
        ),
      ).rejects.toThrow('Failed to quoteGasPayment: Chain not found');
    });
  });

  describe('routers', () => {
    const tokenSymbol = 'USDC';
    const chainName = 'sepolia';
    const domainId = 7336;

    beforeEach(() => {
      jest.clearAllMocks();
      (ConfigUtil.getRpcUrl as jest.Mock).mockReturnValue(
        'https://rpc.example.com',
      );
      (ConfigUtil.getRouterAddress as jest.Mock).mockReturnValue(
        '0x1234567890123456789012345678901234567890',
      );
    });

    it('should successfully get router address for domain', async () => {
      const mockRouterAddress = '0xaE68d312149335B477Fa2EafFB1a1a18E287aC1b';
      const mockContract = {
        routers: {
          staticCall: jest.fn().mockResolvedValue(mockRouterAddress),
        },
      };
      (ethers.Contract as jest.MockedFunction<any>).mockReturnValue(
        mockContract,
      );

      const result = await TokenRouterService.routers(
        tokenSymbol,
        chainName,
        domainId,
      );

      expect(ethers.JsonRpcProvider).toHaveBeenCalledWith(
        'https://rpc.example.com',
      );
      expect(ethers.Contract).toHaveBeenCalledWith(
        '0x1234567890123456789012345678901234567890',
        expect.any(Array),
        expect.any(Object),
      );
      expect(mockContract.routers.staticCall).toHaveBeenCalledWith(domainId);
      expect(result).toBe(mockRouterAddress);
    });

    it('should handle contract call errors', async () => {
      const error = new Error('Contract call failed');
      const mockContract = {
        routers: {
          staticCall: jest.fn().mockRejectedValue(error),
        },
      };
      (ethers.Contract as jest.MockedFunction<any>).mockReturnValue(
        mockContract,
      );

      await expect(
        TokenRouterService.routers(tokenSymbol, chainName, domainId),
      ).rejects.toThrow('Failed to routers: Contract call failed');
    });

    it('should handle ConfigUtil errors', async () => {
      const error = new Error('Chain not found');
      (ConfigUtil.getRpcUrl as jest.Mock).mockImplementation(() => {
        throw error;
      });

      await expect(
        TokenRouterService.routers(tokenSymbol, chainName, domainId),
      ).rejects.toThrow('Failed to routers: Chain not found');
    });
  });

  describe('balanceOf', () => {
    const tokenSymbol = 'USDC';
    const chainName = 'sepolia';
    const account = '0x1234567890123456789012345678901234567890';

    beforeEach(() => {
      jest.clearAllMocks();
      (ConfigUtil.getRpcUrl as jest.Mock).mockReturnValue(
        'https://rpc.example.com',
      );
      (ConfigUtil.getRouterAddress as jest.Mock).mockReturnValue(
        '0x1234567890123456789012345678901234567890',
      );
    });

    it('should successfully get balance for account', async () => {
      const mockBalance = BigInt('1000000000000000000'); // 1 token with 18 decimals
      const mockContract = {
        balanceOf: {
          staticCall: jest.fn().mockResolvedValue(mockBalance),
        },
      };
      (ethers.Contract as jest.MockedFunction<any>).mockReturnValue(
        mockContract,
      );

      const result = await TokenRouterService.balanceOf(
        tokenSymbol,
        chainName,
        account,
      );

      expect(ConfigUtil.getRpcUrl).toHaveBeenCalledWith(chainName);
      expect(ConfigUtil.getRouterAddress).toHaveBeenCalledWith(
        tokenSymbol,
        chainName,
      );
      expect(ethers.Contract).toHaveBeenCalledWith(
        '0x1234567890123456789012345678901234567890',
        expect.any(Array),
        expect.any(Object),
      );
      expect(mockContract.balanceOf.staticCall).toHaveBeenCalledWith(account);
      expect(result).toBe('1000000000000000000');
    });

    it('should handle contract call errors', async () => {
      const error = new Error('Contract call failed');
      const mockContract = {
        balanceOf: {
          staticCall: jest.fn().mockRejectedValue(error),
        },
      };
      (ethers.Contract as jest.MockedFunction<any>).mockReturnValue(
        mockContract,
      );

      await expect(
        TokenRouterService.balanceOf(tokenSymbol, chainName, account),
      ).rejects.toThrow('Failed to balanceOf: Contract call failed');
    });

    it('should handle ConfigUtil errors', async () => {
      const error = new Error('Chain not found');
      (ConfigUtil.getRpcUrl as jest.Mock).mockImplementation(() => {
        throw error;
      });

      await expect(
        TokenRouterService.balanceOf(tokenSymbol, chainName, account),
      ).rejects.toThrow('Failed to balanceOf: Chain not found');
    });
  });
});
