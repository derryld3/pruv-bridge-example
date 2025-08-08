import { ERC20Caller } from './ERC20Caller';
import { ethers } from 'ethers';
import * as erc20Abi from '../../../contract/@openzeppelin/ERC20.abi.json';

// Mock ethers
jest.mock('ethers', () => ({
  ethers: {
    JsonRpcProvider: jest.fn(),
    Contract: jest.fn(),
    Wallet: jest.fn(),
  },
}));

// Mock the ABI import
jest.mock('../../../contract/@openzeppelin/ERC20.abi.json', () => [
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'owner', type: 'address' },
      { internalType: 'address', name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'spender', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
], { virtual: true });

describe('ERC20Caller', () => {
  let mockProvider: any;
  let mockContract: any;
  let mockSigner: any;
  let mockDecimalsStaticCall: jest.Mock;
  let mockAllowanceStaticCall: jest.Mock;
  let mockApprove: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock functions
    mockDecimalsStaticCall = jest.fn();
    mockAllowanceStaticCall = jest.fn();
    mockApprove = jest.fn();

    // Setup mock provider
    mockProvider = {
      getNetwork: jest.fn(),
      getBlockNumber: jest.fn(),
    };

    // Setup mock contract
    mockContract = {
      decimals: {
        staticCall: mockDecimalsStaticCall,
      },
      allowance: {
        staticCall: mockAllowanceStaticCall,
      },
      approve: mockApprove,
    };

    // Setup mock signer
    mockSigner = {
      getAddress: jest.fn().mockResolvedValue('0x1234567890123456789012345678901234567890'),
      signTransaction: jest.fn(),
    };

    // Mock ethers constructors
    (ethers.JsonRpcProvider as jest.Mock).mockReturnValue(mockProvider);
    (ethers.Contract as jest.Mock).mockReturnValue(mockContract);
  });

  describe('Constructor', () => {
    it('should throw error when trying to instantiate', () => {
      expect(() => new (ERC20Caller as any)()).toThrow(
        'ERC20Caller is a static utility class and cannot be instantiated',
      );
    });
  });

  describe('createReadOnlyContract', () => {
    it('should create a read-only contract instance', () => {
      const rpcUrl = 'https://mock-rpc.com';
      const tokenAddress = '0xTokenAddress123';

      const result = ERC20Caller.createReadOnlyContract(rpcUrl, tokenAddress);

      expect(ethers.JsonRpcProvider).toHaveBeenCalledWith(rpcUrl);
      expect(ethers.Contract).toHaveBeenCalledWith(
        tokenAddress,
        expect.any(Array), // ABI
        mockProvider,
      );
      expect(result).toBe(mockContract);
    });
  });

  describe('getDecimals', () => {
    it('should get token decimals successfully', async () => {
      const rpcUrl = 'https://mock-rpc.com';
      const tokenAddress = '0xTokenAddress123';
      const expectedDecimals = 18;

      mockDecimalsStaticCall.mockResolvedValue(BigInt(expectedDecimals));

      const result = await ERC20Caller.getDecimals(rpcUrl, tokenAddress);

      expect(result).toBe(expectedDecimals);
      expect(ethers.JsonRpcProvider).toHaveBeenCalledWith(rpcUrl);
      expect(ethers.Contract).toHaveBeenCalledWith(
        tokenAddress,
        expect.any(Array),
        mockProvider,
      );
      expect(mockDecimalsStaticCall).toHaveBeenCalled();
    });

    it('should throw error when decimals call fails', async () => {
      const rpcUrl = 'https://mock-rpc.com';
      const tokenAddress = '0xTokenAddress123';

      mockDecimalsStaticCall.mockRejectedValue(new Error('Contract call failed'));

      await expect(
        ERC20Caller.getDecimals(rpcUrl, tokenAddress),
      ).rejects.toThrow('Failed to get token decimals: Contract call failed');
    });

    it('should handle non-Error objects in catch blocks', async () => {
      const rpcUrl = 'https://mock-rpc.com';
      const tokenAddress = '0xTokenAddress123';

      mockDecimalsStaticCall.mockRejectedValue('String error');

      await expect(
        ERC20Caller.getDecimals(rpcUrl, tokenAddress),
      ).rejects.toThrow('Failed to get token decimals: String error');
    });
  });

  describe('getAllowance', () => {
    it('should get token allowance successfully', async () => {
      const rpcUrl = 'https://mock-rpc.com';
      const tokenAddress = '0xTokenAddress123';
      const ownerAddress = '0xOwnerAddress456';
      const spenderAddress = '0xSpenderAddress789';
      const expectedAllowance = BigInt('1000000000000000000'); // 1 token with 18 decimals

      mockAllowanceStaticCall.mockResolvedValue(expectedAllowance);

      const result = await ERC20Caller.getAllowance(
        rpcUrl,
        tokenAddress,
        ownerAddress,
        spenderAddress,
      );

      expect(result).toBe(expectedAllowance);
      expect(ethers.JsonRpcProvider).toHaveBeenCalledWith(rpcUrl);
      expect(ethers.Contract).toHaveBeenCalledWith(
        tokenAddress,
        expect.any(Array),
        mockProvider,
      );
      expect(mockAllowanceStaticCall).toHaveBeenCalledWith(
        ownerAddress,
        spenderAddress,
      );
    });

    it('should throw error when allowance call fails', async () => {
      const rpcUrl = 'https://mock-rpc.com';
      const tokenAddress = '0xTokenAddress123';
      const ownerAddress = '0xOwnerAddress456';
      const spenderAddress = '0xSpenderAddress789';

      mockAllowanceStaticCall.mockRejectedValue(new Error('Allowance call failed'));

      await expect(
        ERC20Caller.getAllowance(rpcUrl, tokenAddress, ownerAddress, spenderAddress),
      ).rejects.toThrow('Failed to get token allowance: Allowance call failed');
    });

    it('should handle non-Error objects in catch blocks', async () => {
      const rpcUrl = 'https://mock-rpc.com';
      const tokenAddress = '0xTokenAddress123';
      const ownerAddress = '0xOwnerAddress456';
      const spenderAddress = '0xSpenderAddress789';

      mockAllowanceStaticCall.mockRejectedValue('String error');

      await expect(
        ERC20Caller.getAllowance(rpcUrl, tokenAddress, ownerAddress, spenderAddress),
      ).rejects.toThrow('Failed to get token allowance: String error');
    });
  });

  describe('approve', () => {
    it('should approve tokens successfully', async () => {
      const tokenAddress = '0xTokenAddress123';
      const spenderAddress = '0xSpenderAddress789';
      const amountInWei = BigInt('1000000000000000000'); // 1 token with 18 decimals
      const expectedTxHash = '0xabcdef1234567890';

      const mockTx = {
        hash: expectedTxHash,
        wait: jest.fn().mockResolvedValue({ hash: expectedTxHash }),
      };

      mockApprove.mockResolvedValue(mockTx);

      const result = await ERC20Caller.approve(
        tokenAddress,
        spenderAddress,
        amountInWei,
        mockSigner,
      );

      expect(result).toBe(expectedTxHash);
      expect(ethers.Contract).toHaveBeenCalledWith(
        tokenAddress,
        expect.any(Array),
        mockSigner,
      );
      expect(mockApprove).toHaveBeenCalledWith(spenderAddress, amountInWei);
      expect(mockTx.wait).toHaveBeenCalled();
    });

    it('should throw error when approve transaction fails', async () => {
      const tokenAddress = '0xTokenAddress123';
      const spenderAddress = '0xSpenderAddress789';
      const amountInWei = BigInt('1000000000000000000');

      mockApprove.mockRejectedValue(new Error('Approve transaction failed'));

      await expect(
        ERC20Caller.approve(tokenAddress, spenderAddress, amountInWei, mockSigner),
      ).rejects.toThrow('Failed to approve token: Approve transaction failed');
    });

    it('should throw error when transaction wait fails', async () => {
      const tokenAddress = '0xTokenAddress123';
      const spenderAddress = '0xSpenderAddress789';
      const amountInWei = BigInt('1000000000000000000');

      const mockTx = {
        hash: '0xabcdef1234567890',
        wait: jest.fn().mockRejectedValue(new Error('Transaction wait failed')),
      };

      mockApprove.mockResolvedValue(mockTx);

      await expect(
        ERC20Caller.approve(tokenAddress, spenderAddress, amountInWei, mockSigner),
      ).rejects.toThrow('Failed to approve token: Transaction wait failed');
    });

    it('should handle non-Error objects in catch blocks', async () => {
      const tokenAddress = '0xTokenAddress123';
      const spenderAddress = '0xSpenderAddress789';
      const amountInWei = BigInt('1000000000000000000');

      mockApprove.mockRejectedValue('String error');

      await expect(
        ERC20Caller.approve(tokenAddress, spenderAddress, amountInWei, mockSigner),
      ).rejects.toThrow('Failed to approve token: String error');
    });
  });
});