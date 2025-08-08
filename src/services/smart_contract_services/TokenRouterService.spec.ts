import { TokenRouterService } from './TokenRouterService';
import { ethers } from 'ethers';
import { ConfigUtil } from '../../util/ConfigUtil';
import { TokenRouterCaller } from '../../caller/smart_contract_caller/TokenRouterCaller';

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
    getMailboxAddress: jest.fn(),
  },
}));

jest.mock('./ERC20Service', () => ({
  ERC20Service: {
    getDecimals: jest.fn(),
  },
}));

jest.mock('../../caller/smart_contract_caller/TokenRouterCaller', () => ({
  TokenRouterCaller: {
    transferRemote: jest.fn(),
    quoteGasPayment: jest.fn(),
    getRouters: jest.fn(),
    getBalanceOf: jest.fn(),
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
      (TokenRouterCaller.quoteGasPayment as jest.Mock).mockResolvedValue(
        BigInt('1000000000000000000'),
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
      expect(TokenRouterCaller.quoteGasPayment).toHaveBeenCalledWith(
        'https://rpc.sepolia.org',
        '0x1234567890123456789012345678901234567890',
        421614,
      );
      expect(result).toBe('1000000000000000000');
    });

    it('should handle contract call errors', async () => {
      const error = new Error('Contract call failed');
      (TokenRouterCaller.quoteGasPayment as jest.Mock).mockRejectedValue(error);

      await expect(
        TokenRouterService.quoteGasPayment(
          tokenSymbol,
          sourceChainName,
          destinationChainName,
        ),
      ).rejects.toThrow('Failed to quote gas payment: Contract call failed');
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
      ).rejects.toThrow('Failed to quote gas payment: Chain not found');
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
      (TokenRouterCaller.getRouters as jest.Mock).mockResolvedValue(
        mockRouterAddress,
      );

      const result = await TokenRouterService.routers(
        tokenSymbol,
        chainName,
        domainId,
      );

      expect(ConfigUtil.getRpcUrl).toHaveBeenCalledWith(chainName);
      expect(ConfigUtil.getRouterAddress).toHaveBeenCalledWith(
        tokenSymbol,
        chainName,
      );
      expect(TokenRouterCaller.getRouters).toHaveBeenCalledWith(
        'https://rpc.example.com',
        '0x1234567890123456789012345678901234567890',
        domainId,
      );
      expect(result).toBe(mockRouterAddress);
    });

    it('should handle contract call errors', async () => {
      const error = new Error('Contract call failed');
      (TokenRouterCaller.getRouters as jest.Mock).mockRejectedValue(error);

      await expect(
        TokenRouterService.routers(tokenSymbol, chainName, domainId),
      ).rejects.toThrow('Failed to get router address: Contract call failed');
    });

    it('should handle ConfigUtil errors', async () => {
      const error = new Error('Chain not found');
      (ConfigUtil.getRpcUrl as jest.Mock).mockImplementation(() => {
        throw error;
      });

      await expect(
        TokenRouterService.routers(tokenSymbol, chainName, domainId),
      ).rejects.toThrow('Failed to get router address: Chain not found');
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
      (TokenRouterCaller.getBalanceOf as jest.Mock).mockResolvedValue(
        mockBalance,
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
      expect(TokenRouterCaller.getBalanceOf).toHaveBeenCalledWith(
        'https://rpc.example.com',
        '0x1234567890123456789012345678901234567890',
        account,
      );
      expect(result).toBe('1000000000000000000');
    });

    it('should handle contract call errors', async () => {
      const error = new Error('Contract call failed');
      (TokenRouterCaller.getBalanceOf as jest.Mock).mockRejectedValue(error);

      await expect(
        TokenRouterService.balanceOf(tokenSymbol, chainName, account),
      ).rejects.toThrow('Failed to get balance: Contract call failed');
    });

    it('should handle ConfigUtil errors', async () => {
      const error = new Error('Chain not found');
      (ConfigUtil.getRpcUrl as jest.Mock).mockImplementation(() => {
        throw error;
      });

      await expect(
        TokenRouterService.balanceOf(tokenSymbol, chainName, account),
      ).rejects.toThrow('Failed to get balance: Chain not found');
    });
  });
});
