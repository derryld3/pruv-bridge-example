import { TokenRouterCaller } from './TokenRouterCaller';
import { ethers } from 'ethers';
import * as tokenRouterAbi from '../../../contract/hyperlane/TokenRouter.abi.json';

// Mock ethers
jest.mock('ethers', () => ({
  ethers: {
    JsonRpcProvider: jest.fn(),
    Contract: jest.fn(),
    Wallet: jest.fn(),
  },
}));

// Mock the ABI
jest.mock('../../../contract/hyperlane/TokenRouter.abi.json', () => ({
  default: [
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
  ],
}), { virtual: true });

describe('TokenRouterCaller', () => {
  const mockProvider = {} as any;
  const mockContract = {} as any;
  const mockSigner = {} as any;

  // Mock functions for contract methods
  const mockQuoteGasPaymentStaticCall = jest.fn();
  const mockRoutersStaticCall = jest.fn();
  const mockBalanceOfStaticCall = jest.fn();
  const mockTransferRemote = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup ethers mocks
    (ethers.JsonRpcProvider as jest.MockedClass<typeof ethers.JsonRpcProvider>).mockImplementation(() => mockProvider);
    (ethers.Contract as jest.MockedClass<typeof ethers.Contract>).mockImplementation(() => mockContract);

    // Setup contract method mocks
    mockContract.quoteGasPayment = {
      staticCall: mockQuoteGasPaymentStaticCall,
    };
    mockContract.routers = {
      staticCall: mockRoutersStaticCall,
    };
    mockContract.balanceOf = {
      staticCall: mockBalanceOfStaticCall,
    };
    mockContract.transferRemote = mockTransferRemote;
  });

  describe('constructor', () => {
    it('should throw an error when trying to instantiate', () => {
      expect(() => new (TokenRouterCaller as any)()).toThrow(
        'TokenRouterCaller is a static utility class and cannot be instantiated',
      );
    });
  });

  describe('createReadOnlyContract', () => {
    it('should create a read-only contract instance', () => {
      const rpcUrl = 'https://mock-rpc.com';
      const contractAddress = '0x1234567890123456789012345678901234567890';

      const result = TokenRouterCaller.createReadOnlyContract(rpcUrl, contractAddress);

      expect(ethers.JsonRpcProvider).toHaveBeenCalledWith(rpcUrl);
      expect(ethers.Contract).toHaveBeenCalledWith(
        contractAddress,
        (tokenRouterAbi as any).default || tokenRouterAbi,
        mockProvider,
      );
      expect(result).toBe(mockContract);
    });
  });

  describe('quoteGasPayment', () => {
    const rpcUrl = 'https://mock-rpc.com';
    const contractAddress = '0x1234567890123456789012345678901234567890';
    const destinationDomainId = 421614;

    it('should successfully quote gas payment', async () => {
      const expectedGasPayment = BigInt('1000000000000000000');
      mockQuoteGasPaymentStaticCall.mockResolvedValue(expectedGasPayment);

      const result = await TokenRouterCaller.quoteGasPayment(
        rpcUrl,
        contractAddress,
        destinationDomainId,
      );

      expect(ethers.JsonRpcProvider).toHaveBeenCalledWith(rpcUrl);
      expect(ethers.Contract).toHaveBeenCalledWith(
        contractAddress,
        (tokenRouterAbi as any).default || tokenRouterAbi,
        mockProvider,
      );
      expect(mockQuoteGasPaymentStaticCall).toHaveBeenCalledWith(destinationDomainId);
      expect(result).toBe(expectedGasPayment);
    });

    it('should handle contract call errors', async () => {
      const error = new Error('Contract call failed');
      mockQuoteGasPaymentStaticCall.mockRejectedValue(error);

      await expect(
        TokenRouterCaller.quoteGasPayment(rpcUrl, contractAddress, destinationDomainId),
      ).rejects.toThrow('Failed to quote gas payment: Contract call failed');
    });

    it('should handle non-Error exceptions', async () => {
      mockQuoteGasPaymentStaticCall.mockRejectedValue('String error');

      await expect(
        TokenRouterCaller.quoteGasPayment(rpcUrl, contractAddress, destinationDomainId),
      ).rejects.toThrow('Failed to quote gas payment: String error');
    });
  });

  describe('getRouters', () => {
    const rpcUrl = 'https://mock-rpc.com';
    const contractAddress = '0x1234567890123456789012345678901234567890';
    const domainId = 421614;

    it('should successfully get router address', async () => {
      const expectedRouterAddress = '0x0000000000000000000000001234567890123456789012345678901234567890';
      mockRoutersStaticCall.mockResolvedValue(expectedRouterAddress);

      const result = await TokenRouterCaller.getRouters(
        rpcUrl,
        contractAddress,
        domainId,
      );

      expect(ethers.JsonRpcProvider).toHaveBeenCalledWith(rpcUrl);
      expect(ethers.Contract).toHaveBeenCalledWith(
        contractAddress,
        (tokenRouterAbi as any).default || tokenRouterAbi,
        mockProvider,
      );
      expect(mockRoutersStaticCall).toHaveBeenCalledWith(domainId);
      expect(result).toBe(expectedRouterAddress);
    });

    it('should handle contract call errors', async () => {
      const error = new Error('Router call failed');
      mockRoutersStaticCall.mockRejectedValue(error);

      await expect(
        TokenRouterCaller.getRouters(rpcUrl, contractAddress, domainId),
      ).rejects.toThrow('Failed to get router address: Router call failed');
    });

    it('should handle non-Error exceptions', async () => {
      mockRoutersStaticCall.mockRejectedValue('String error');

      await expect(
        TokenRouterCaller.getRouters(rpcUrl, contractAddress, domainId),
      ).rejects.toThrow('Failed to get router address: String error');
    });
  });

  describe('getBalanceOf', () => {
    const rpcUrl = 'https://mock-rpc.com';
    const contractAddress = '0x1234567890123456789012345678901234567890';
    const account = '0x1234567890123456789012345678901234567890';

    it('should successfully get balance', async () => {
      const expectedBalance = BigInt('1000000000000000000');
      mockBalanceOfStaticCall.mockResolvedValue(expectedBalance);

      const result = await TokenRouterCaller.getBalanceOf(
        rpcUrl,
        contractAddress,
        account,
      );

      expect(ethers.JsonRpcProvider).toHaveBeenCalledWith(rpcUrl);
      expect(ethers.Contract).toHaveBeenCalledWith(
        contractAddress,
        (tokenRouterAbi as any).default || tokenRouterAbi,
        mockProvider,
      );
      expect(mockBalanceOfStaticCall).toHaveBeenCalledWith(account);
      expect(result).toBe(expectedBalance);
    });

    it('should handle contract call errors', async () => {
      const error = new Error('Balance call failed');
      mockBalanceOfStaticCall.mockRejectedValue(error);

      await expect(
        TokenRouterCaller.getBalanceOf(rpcUrl, contractAddress, account),
      ).rejects.toThrow('Failed to get balance: Balance call failed');
    });

    it('should handle non-Error exceptions', async () => {
      mockBalanceOfStaticCall.mockRejectedValue('String error');

      await expect(
        TokenRouterCaller.getBalanceOf(rpcUrl, contractAddress, account),
      ).rejects.toThrow('Failed to get balance: String error');
    });
  });

  describe('transferRemote', () => {
    const contractAddress = '0x1234567890123456789012345678901234567890';
    const destinationDomainId = 421614;
    const recipient = '0x0000000000000000000000001234567890123456789012345678901234567890';
    const amount = BigInt('1000000000000000000');
    const value = BigInt('100000000000000000');

    it('should successfully transfer tokens', async () => {
      const mockTx = {
        hash: '0xabcdef1234567890',
        wait: jest.fn().mockResolvedValue({
          transactionHash: '0xabcdef1234567890',
          blockNumber: 12345,
        }),
      };
      const mockReceipt = {
        transactionHash: '0xabcdef1234567890',
        blockNumber: 12345,
      };
      mockTransferRemote.mockResolvedValue(mockTx);
      mockTx.wait.mockResolvedValue(mockReceipt);

      const result = await TokenRouterCaller.transferRemote(
        contractAddress,
        destinationDomainId,
        recipient,
        amount,
        value,
        mockSigner,
      );

      expect(ethers.Contract).toHaveBeenCalledWith(
        contractAddress,
        (tokenRouterAbi as any).default || tokenRouterAbi,
        mockSigner,
      );
      expect(mockTransferRemote).toHaveBeenCalledWith(
        destinationDomainId,
        recipient,
        amount,
        { value },
      );
      expect(mockTx.wait).toHaveBeenCalled();
      expect(result).toEqual({
        transactionHash: '0xabcdef1234567890',
        receipt: mockReceipt,
      });
    });

    it('should handle transfer errors', async () => {
      const error = new Error('Transfer failed');
      mockTransferRemote.mockRejectedValue(error);

      await expect(
        TokenRouterCaller.transferRemote(
          contractAddress,
          destinationDomainId,
          recipient,
          amount,
          value,
          mockSigner,
        ),
      ).rejects.toThrow('Failed to transfer tokens: Transfer failed');
    });

    it('should handle non-Error exceptions', async () => {
      mockTransferRemote.mockRejectedValue('String error');

      await expect(
        TokenRouterCaller.transferRemote(
          contractAddress,
          destinationDomainId,
          recipient,
          amount,
          value,
          mockSigner,
        ),
      ).rejects.toThrow('Failed to transfer tokens: String error');
    });
  });


});