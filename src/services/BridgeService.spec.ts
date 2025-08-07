import { BridgeService } from './BridgeService';
import { Unit } from '../util/Unit';
import { ConfigUtil } from '../util/ConfigUtil';
import { TokenRouterService } from './smart_contract_services/TokenRouterService';
import { ERC20Service } from './smart_contract_services/ERC20Service';
import { ethers } from 'ethers';

// Mock ethers
jest.mock('ethers', () => ({
  ethers: {
    JsonRpcProvider: jest.fn(),
    isAddress: jest.fn(),
    Wallet: jest.fn(),
    ZeroAddress: '0x0000000000000000000000000000000000000000',
    parseUnits: jest.fn(),
    formatEther: jest.fn(),
  },
}));

// Mock ConfigUtil
jest.mock('../util/ConfigUtil');
const mockConfigUtil = ConfigUtil as jest.Mocked<typeof ConfigUtil>;

// Mock TokenRouterService
jest.mock('./smart_contract_services/TokenRouterService');
const mockTokenRouterService = TokenRouterService as jest.Mocked<
  typeof TokenRouterService
>;

// Mock ERC20Service
jest.mock('./smart_contract_services/ERC20Service');
const mockERC20Service = ERC20Service as jest.Mocked<typeof ERC20Service>;

describe('BridgeService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  describe('precheckTransferToken', () => {
    const validParams = {
      tokenSymbol: 'USDC',
      originChain: 'sepolia',
      destinationChain: 'pruvtest',
      receiverAddress: '0x384418C216ee5E46132CA1255f3B96759ce5fFD5',
      amount: '1.0',
      amountUnit: Unit.ETH,
      senderAddressOrPrivateKey: '0x1234567890123456789012345678901234567890',
    };

    beforeEach(() => {
      // Reset all mocks before each test
      jest.resetAllMocks();

      // Mock ethers functions
      (ethers.isAddress as unknown as jest.Mock).mockImplementation(
        (address) => {
          // Return false for invalid addresses to trigger proper validation
          if (
            address === 'invalid_private_key' ||
            address === '0x123' ||
            address ===
              '0xzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz' ||
            address === ''
          ) {
            return false;
          }
          return true;
        },
      );
      (ethers.parseUnits as jest.Mock).mockReturnValue(BigInt('1000000'));
      (ethers.formatEther as jest.Mock).mockReturnValue('2.0');

      // Mock provider and its getBalance method
      const mockProvider = {
        getBalance: jest.fn().mockResolvedValue('2000000000000000000'), // 2 ETH in wei
      };
      (ethers.JsonRpcProvider as jest.Mock).mockReturnValue(mockProvider);

      // Mock ConfigUtil methods
      mockConfigUtil.getRpcUrl.mockReturnValue('https://mock-rpc.com');
      mockConfigUtil.getDomainId.mockReturnValue(7336);
      mockConfigUtil.getRouterAddress.mockReturnValue(
        '0x1234567890123456789012345678901234567890',
      );

      // Mock TokenRouterService.routers for default success
      mockTokenRouterService.routers.mockResolvedValue(
        '0x1234567890123456789012345678901234567890',
      );

      // Mock ethers.Wallet constructor
      const mockWallet = {
        address: '0x1234567890123456789012345678901234567890',
      };
      (ethers.Wallet as unknown as jest.Mock).mockImplementation(
        (privateKey) => {
          if (
            privateKey === 'invalid_private_key' ||
            privateKey === '0x123' ||
            privateKey ===
              '0xzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz'
          ) {
            throw new Error('Invalid private key');
          }
          return mockWallet;
        },
      );

      // Add default balanceOf mock for all tests
      mockTokenRouterService.balanceOf.mockResolvedValue(
        '2000000000000000000', // 2 tokens in wei (sufficient balance)
      );
      // Add default getDecimals mock for all tests
      mockERC20Service.getDecimals.mockResolvedValue(6); // USDC has 6 decimals
      // Add default quoteGasPayment mock for all tests
      mockTokenRouterService.quoteGasPayment.mockResolvedValue(
        '1000000000000000000', // 1 ETH in wei
      );
    });

    it('should pass precheck for valid transfer parameters', async () => {
      // Setup mocks for successful case
      mockConfigUtil.getDomainId.mockReturnValueOnce(7336); // pruvtest
      mockConfigUtil.getRouterAddress.mockReturnValue(
        '0xc97f971b0ddffC63e87365c2ce2F88107E79A167',
      );
      mockTokenRouterService.routers.mockResolvedValue(
        '0x1234567890123456789012345678901234567890',
      ); // valid router address

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await BridgeService.precheckTransferToken(
        validParams.tokenSymbol,
        validParams.originChain,
        validParams.destinationChain,
        validParams.receiverAddress,
        validParams.amount,
        validParams.amountUnit,
        validParams.senderAddressOrPrivateKey,
      );

      expect(result).toBe(true);

      expect(mockConfigUtil.getDomainId).toHaveBeenCalledWith('pruvtest');
      expect(mockTokenRouterService.routers).toHaveBeenCalledWith(
        'USDC',
        'sepolia',
        7336,
      );
      // Token validation is now only done for router address on origin chain

      consoleSpy.mockRestore();
    });

    it('should throw error for empty token symbol', async () => {
      await expect(
        BridgeService.precheckTransferToken(
          '',
          validParams.originChain,
          validParams.destinationChain,
          validParams.receiverAddress,
          validParams.amount,
          validParams.amountUnit,
          validParams.senderAddressOrPrivateKey,
        ),
      ).rejects.toThrow(
        'Transfer precheck failed: tokenSymbol is required and cannot be empty',
      );
    });

    it('should throw error for empty origin chain', async () => {
      await expect(
        BridgeService.precheckTransferToken(
          validParams.tokenSymbol,
          '',
          validParams.destinationChain,
          validParams.receiverAddress,
          validParams.amount,
          validParams.amountUnit,
          validParams.senderAddressOrPrivateKey,
        ),
      ).rejects.toThrow(
        'Transfer precheck failed: originChain is required and cannot be empty',
      );
    });

    it('should throw error for empty destination chain', async () => {
      await expect(
        BridgeService.precheckTransferToken(
          validParams.tokenSymbol,
          validParams.originChain,
          '',
          validParams.receiverAddress,
          validParams.amount,
          validParams.amountUnit,
          validParams.senderAddressOrPrivateKey,
        ),
      ).rejects.toThrow(
        'Transfer precheck failed: destinationChain is required and cannot be empty',
      );
    });

    it('should throw error for empty destination address', async () => {
      await expect(
        BridgeService.precheckTransferToken(
          validParams.tokenSymbol,
          validParams.originChain,
          validParams.destinationChain,
          '',
          validParams.amount,
          validParams.amountUnit,
          validParams.senderAddressOrPrivateKey,
        ),
      ).rejects.toThrow(
        'Transfer precheck failed: receiverAddress is required and cannot be empty',
      );
    });

    it('should throw error for empty amount', async () => {
      await expect(
        BridgeService.precheckTransferToken(
          validParams.tokenSymbol,
          validParams.originChain,
          validParams.destinationChain,
          validParams.receiverAddress,
          '',
          validParams.amountUnit,
          validParams.senderAddressOrPrivateKey,
        ),
      ).rejects.toThrow(
        'Transfer precheck failed: amount is required and cannot be empty',
      );
    });

    it('should throw error for negative amount', async () => {
      await expect(
        BridgeService.precheckTransferToken(
          validParams.tokenSymbol,
          validParams.originChain,
          validParams.destinationChain,
          validParams.receiverAddress,
          '-1.0',
          validParams.amountUnit,
          validParams.senderAddressOrPrivateKey,
        ),
      ).rejects.toThrow(
        'Transfer precheck failed: Amount must be a positive number',
      );
    });

    it('should throw error for zero amount', async () => {
      await expect(
        BridgeService.precheckTransferToken(
          validParams.tokenSymbol,
          validParams.originChain,
          validParams.destinationChain,
          validParams.receiverAddress,
          '0',
          validParams.amountUnit,
          validParams.senderAddressOrPrivateKey,
        ),
      ).rejects.toThrow(
        'Transfer precheck failed: Amount must be a positive number',
      );
    });

    it('should throw error for non-numeric amount', async () => {
      await expect(
        BridgeService.precheckTransferToken(
          validParams.tokenSymbol,
          validParams.originChain,
          validParams.destinationChain,
          validParams.receiverAddress,
          'invalid',
          validParams.amountUnit,
          validParams.senderAddressOrPrivateKey,
        ),
      ).rejects.toThrow(
        'Transfer precheck failed: Amount must be a positive number',
      );
    });

    it('should throw error for invalid origin chain', async () => {
      mockConfigUtil.getDomainId.mockImplementationOnce(() => {
        throw new Error('Chain not found');
      });

      await expect(
        BridgeService.precheckTransferToken(
          validParams.tokenSymbol,
          'invalid_chain',
          validParams.destinationChain,
          validParams.receiverAddress,
          validParams.amount,
          validParams.amountUnit,
          validParams.senderAddressOrPrivateKey,
        ),
      ).rejects.toThrow('Transfer precheck failed: Chain not found');
    });

    it('should throw error for invalid destination chain', async () => {
      mockConfigUtil.getDomainId.mockImplementationOnce(() => {
        throw new Error('Chain not found');
      });
      mockTokenRouterService.routers.mockResolvedValue(
        '0x1234567890123456789012345678901234567890',
      );

      await expect(
        BridgeService.precheckTransferToken(
          validParams.tokenSymbol,
          validParams.originChain,
          'invalid_chain',
          validParams.receiverAddress,
          validParams.amount,
          validParams.amountUnit,
          validParams.senderAddressOrPrivateKey,
        ),
      ).rejects.toThrow('Transfer precheck failed: Chain not found');
    });

    it('should throw error when origin and destination chains are the same', async () => {
      mockConfigUtil.getDomainId
        .mockReturnValueOnce(11155111) // origin
        .mockReturnValueOnce(11155111); // same destination
      mockTokenRouterService.routers.mockResolvedValue(
        '0x1234567890123456789012345678901234567890',
      );

      await expect(
        BridgeService.precheckTransferToken(
          validParams.tokenSymbol,
          validParams.originChain,
          validParams.originChain, // same as origin
          validParams.receiverAddress,
          validParams.amount,
          validParams.amountUnit,
          validParams.senderAddressOrPrivateKey,
        ),
      ).rejects.toThrow(
        'Transfer precheck failed: Origin and destination chains must be different',
      );
    });

    it('should pass precheck when origin chain router validation is not required', async () => {
      mockConfigUtil.getDomainId.mockReturnValueOnce(7336); // pruvtest
      mockConfigUtil.getRouterAddress.mockImplementationOnce(() => {
        throw new Error('Router not found');
      });
      mockTokenRouterService.routers.mockResolvedValue(
        '0x1234567890123456789012345678901234567890',
      );

      const result = await BridgeService.precheckTransferToken(
        'INVALID_TOKEN',
        validParams.originChain,
        validParams.destinationChain,
        validParams.receiverAddress,
        validParams.amount,
        validParams.amountUnit,
        validParams.senderAddressOrPrivateKey,
      );

      expect(result).toBe(true);
    });

    it('should pass precheck even with empty router address', async () => {
      mockConfigUtil.getDomainId.mockReturnValueOnce(7336); // pruvtest
      mockConfigUtil.getRouterAddress.mockReturnValue('');
      mockTokenRouterService.routers.mockResolvedValue(
        '0x1234567890123456789012345678901234567890',
      );

      const result = await BridgeService.precheckTransferToken(
        validParams.tokenSymbol,
        validParams.originChain,
        validParams.destinationChain,
        validParams.receiverAddress,
        validParams.amount,
        validParams.amountUnit,
        validParams.senderAddressOrPrivateKey,
      );

      expect(result).toBe(true);
    });

    it('should pass precheck when origin chain router validation is not performed', async () => {
      mockConfigUtil.getDomainId.mockReturnValueOnce(7336); // pruvtest
      mockConfigUtil.getRouterAddress.mockReturnValue(
        '0xc97f971b0ddffC63e87365c2ce2F88107E79A167',
      );
      mockConfigUtil.getRouterAddress.mockImplementationOnce(() => {
        throw new Error('Router not found');
      });
      mockTokenRouterService.routers.mockResolvedValue(
        '0x1234567890123456789012345678901234567890',
      );

      const result = await BridgeService.precheckTransferToken(
        'INVALID_TOKEN',
        validParams.originChain,
        validParams.destinationChain,
        validParams.receiverAddress,
        validParams.amount,
        validParams.amountUnit,
        validParams.senderAddressOrPrivateKey,
      );

      expect(result).toBe(true);
    });

    it('should pass precheck when only origin chain router validation is required', async () => {
      mockConfigUtil.getDomainId.mockReturnValueOnce(7336); // pruvtest
      mockConfigUtil.getRouterAddress.mockReturnValue(
        '0xc97f971b0ddffC63e87365c2ce2F88107E79A167',
      );
      mockTokenRouterService.routers.mockResolvedValue(
        '0x1234567890123456789012345678901234567890',
      );
      // This test is no longer relevant as destination chain token validation was removed
      // The function now only validates router address on origin chain
      mockConfigUtil.getRouterAddress.mockReturnValue(
        '0xc97f971b0ddffC63e87365c2ce2F88107E79A167',
      );

      const result = await BridgeService.precheckTransferToken(
        'INVALID_TOKEN',
        validParams.originChain,
        validParams.destinationChain,
        validParams.receiverAddress,
        validParams.amount,
        validParams.amountUnit,
        validParams.senderAddressOrPrivateKey,
      );

      expect(result).toBe(true);
    });

    it('should throw error when destination domain is not supported by router', async () => {
      mockConfigUtil.getDomainId.mockReturnValueOnce(999999); // unsupported destination domain
      mockConfigUtil.getRouterAddress.mockReturnValue(
        '0xc97f971b0ddffC63e87365c2ce2F88107E79A167',
      );
      mockTokenRouterService.routers.mockRejectedValue(
        new Error('Router not found'),
      ); // no router for unsupported domain

      await expect(
        BridgeService.precheckTransferToken(
          validParams.tokenSymbol,
          validParams.originChain,
          'unsupported_chain',
          validParams.receiverAddress,
          validParams.amount,
          validParams.amountUnit,
          validParams.senderAddressOrPrivateKey,
        ),
      ).rejects.toThrow('Transfer precheck failed: Router not found');
    });

    it('should throw error when TokenRouterService.domains fails', async () => {
      mockConfigUtil.getDomainId.mockReturnValueOnce(7336); // pruvtest
      mockConfigUtil.getRouterAddress.mockReturnValue(
        '0xc97f971b0ddffC63e87365c2ce2F88107E79A167',
      );
      mockTokenRouterService.routers.mockRejectedValue(
        new Error('Network error'),
      );

      await expect(
        BridgeService.precheckTransferToken(
          validParams.tokenSymbol,
          validParams.originChain,
          validParams.destinationChain,
          validParams.receiverAddress,
          validParams.amount,
          validParams.amountUnit,
          validParams.senderAddressOrPrivateKey,
        ),
      ).rejects.toThrow('Transfer precheck failed: Network error');
    });

    it('should throw error for invalid destination address format', async () => {
      mockConfigUtil.getDomainId.mockReturnValueOnce(7336); // pruvtest
      mockConfigUtil.getRouterAddress.mockReturnValue(
        '0xc97f971b0ddffC63e87365c2ce2F88107E79A167',
      );
      mockTokenRouterService.routers.mockResolvedValue(
        '0x1234567890123456789012345678901234567890',
      );

      await expect(
        BridgeService.precheckTransferToken(
          validParams.tokenSymbol,
          validParams.originChain,
          validParams.destinationChain,
          'invalid_address',
          validParams.amount,
          validParams.amountUnit,
          validParams.senderAddressOrPrivateKey,
        ),
      ).rejects.toThrow(
        'Transfer precheck failed: Receiver address must be a valid Ethereum address',
      );
    });

    it('should throw error for short destination address', async () => {
      mockConfigUtil.getDomainId.mockReturnValueOnce(7336); // pruvtest
      mockConfigUtil.getRouterAddress.mockReturnValue(
        '0xc97f971b0ddffC63e87365c2ce2F88107E79A167',
      );
      mockTokenRouterService.routers.mockResolvedValue(
        '0x1234567890123456789012345678901234567890',
      );

      await expect(
        BridgeService.precheckTransferToken(
          validParams.tokenSymbol,
          validParams.originChain,
          validParams.destinationChain,
          '0x123',
          validParams.amount,
          validParams.amountUnit,
          validParams.senderAddressOrPrivateKey,
        ),
      ).rejects.toThrow(
        'Transfer precheck failed: Receiver address must be a valid Ethereum address',
      );
    });

    it('should throw error for destination address without 0x prefix', async () => {
      mockConfigUtil.getDomainId.mockReturnValueOnce(7336); // pruvtest
      mockConfigUtil.getRouterAddress.mockReturnValue(
        '0xc97f971b0ddffC63e87365c2ce2F88107E79A167',
      );
      mockTokenRouterService.routers.mockResolvedValue(
        '0x1234567890123456789012345678901234567890',
      );

      await expect(
        BridgeService.precheckTransferToken(
          validParams.tokenSymbol,
          validParams.originChain,
          validParams.destinationChain,
          '384418C216ee5E46132CA1255f3B96759ce5fFD5',
          validParams.amount,
          validParams.amountUnit,
          validParams.senderAddressOrPrivateKey,
        ),
      ).rejects.toThrow(
        'Transfer precheck failed: Receiver address must be a valid Ethereum address',
      );
    });

    it('should throw error when destination router address is zero', async () => {
      mockConfigUtil.getDomainId.mockReturnValueOnce(7336); // pruvtest
      mockConfigUtil.getRouterAddress.mockReturnValue(
        '0xc97f971b0ddffC63e87365c2ce2F88107E79A167',
      );
      mockTokenRouterService.routers.mockResolvedValue(ethers.ZeroAddress);

      await expect(
        BridgeService.precheckTransferToken(
          validParams.tokenSymbol,
          validParams.originChain,
          validParams.destinationChain,
          validParams.receiverAddress,
          validParams.amount,
          validParams.amountUnit,
          validParams.senderAddressOrPrivateKey,
        ),
      ).rejects.toThrow(
        'Transfer precheck failed: No router available for USDC on destination chain pruvtest (domain 7336)',
      );
    });

    it('should throw error when destination router address is 0x0', async () => {
      mockConfigUtil.getDomainId.mockReturnValueOnce(7336); // pruvtest
      mockConfigUtil.getRouterAddress.mockReturnValue(
        '0xc97f971b0ddffC63e87365c2ce2F88107E79A167',
      );
      mockTokenRouterService.routers.mockResolvedValue(ethers.ZeroAddress);

      await expect(
        BridgeService.precheckTransferToken(
          validParams.tokenSymbol,
          validParams.originChain,
          validParams.destinationChain,
          validParams.receiverAddress,
          validParams.amount,
          validParams.amountUnit,
          validParams.senderAddressOrPrivateKey,
        ),
      ).rejects.toThrow(
        'Transfer precheck failed: No router available for USDC on destination chain pruvtest (domain 7336)',
      );
    });

    it('should throw error when destination router address is empty', async () => {
      mockConfigUtil.getDomainId.mockReturnValueOnce(7336); // pruvtest
      mockConfigUtil.getRouterAddress.mockReturnValue(
        '0xc97f971b0ddffC63e87365c2ce2F88107E79A167',
      );
      mockTokenRouterService.routers.mockResolvedValue('');

      await expect(
        BridgeService.precheckTransferToken(
          validParams.tokenSymbol,
          validParams.originChain,
          validParams.destinationChain,
          validParams.receiverAddress,
          validParams.amount,
          validParams.amountUnit,
          validParams.senderAddressOrPrivateKey,
        ),
      ).rejects.toThrow(
        'Transfer precheck failed: No router available for USDC on destination chain pruvtest (domain 7336)',
      );
    });

    it('should throw error for invalid private key format', async () => {
      await expect(
        BridgeService.precheckTransferToken(
          validParams.tokenSymbol,
          validParams.originChain,
          validParams.destinationChain,
          validParams.receiverAddress,
          validParams.amount,
          validParams.amountUnit,
          'invalid_private_key',
        ),
      ).rejects.toThrow(
        'Transfer precheck failed: Invalid sender address or private key',
      );
    });

    it('should throw error for short invalid private key', async () => {
      await expect(
        BridgeService.precheckTransferToken(
          validParams.tokenSymbol,
          validParams.originChain,
          validParams.destinationChain,
          validParams.receiverAddress,
          validParams.amount,
          validParams.amountUnit,
          '0x123',
        ),
      ).rejects.toThrow(
        'Transfer precheck failed: Invalid sender address or private key',
      );
    });

    it('should throw error for malformed private key', async () => {
      await expect(
        BridgeService.precheckTransferToken(
          validParams.tokenSymbol,
          validParams.originChain,
          validParams.destinationChain,
          validParams.receiverAddress,
          validParams.amount,
          validParams.amountUnit,
          '0xzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz',
        ),
      ).rejects.toThrow(
        'Transfer precheck failed: Invalid sender address or private key',
      );
    });

    it('should throw error for empty sender address or private key', async () => {
      await expect(
        BridgeService.precheckTransferToken(
          validParams.tokenSymbol,
          validParams.originChain,
          validParams.destinationChain,
          validParams.receiverAddress,
          validParams.amount,
          validParams.amountUnit,
          '',
        ),
      ).rejects.toThrow(
        'Transfer precheck failed: senderAddressOrPrivateKey is required and cannot be empty',
      );
    });

    it('should accept valid private key and derive address', async () => {
      // Setup mocks for successful case
      mockConfigUtil.getDomainId.mockReturnValueOnce(7336); // pruvtest
      mockConfigUtil.getRouterAddress.mockReturnValue(
        '0xc97f971b0ddffC63e87365c2ce2F88107E79A167',
      );
      mockTokenRouterService.routers.mockResolvedValue(
        '0x1234567890123456789012345678901234567890',
      );

      const validPrivateKey =
        '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

      const result = await BridgeService.precheckTransferToken(
        validParams.tokenSymbol,
        validParams.originChain,
        validParams.destinationChain,
        validParams.receiverAddress,
        validParams.amount,
        validParams.amountUnit,
        validPrivateKey,
      );

      expect(result).toBe(true);
    });

    it('should accept valid address as sender', async () => {
      // Setup mocks for successful case
      mockConfigUtil.getDomainId.mockReturnValueOnce(7336); // pruvtest
      mockConfigUtil.getRouterAddress.mockReturnValue(
        '0xc97f971b0ddffC63e87365c2ce2F88107E79A167',
      );
      mockTokenRouterService.routers.mockResolvedValue(
        '0x1234567890123456789012345678901234567890',
      );

      const validAddress = '0x384418C216ee5E46132CA1255f3B96759ce5fFD5';

      const result = await BridgeService.precheckTransferToken(
        validParams.tokenSymbol,
        validParams.originChain,
        validParams.destinationChain,
        validParams.receiverAddress,
        validParams.amount,
        validParams.amountUnit,
        validAddress,
      );

      expect(result).toBe(true);
    });
  });
});
