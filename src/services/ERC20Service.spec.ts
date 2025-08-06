import { ERC20Service } from './ERC20Service';
import { ethers } from 'ethers';
import { ConfigUtil } from '../util/ConfigUtil';
import { Unit } from '../util/Unit';

// Mock ethers
jest.mock('ethers', () => ({
  ethers: {
    JsonRpcProvider: jest.fn(),
    Wallet: jest.fn(),
    Contract: jest.fn(),
    parseEther: jest.fn(),
    parseUnits: jest.fn(),
    formatUnits: jest.fn()
  }
}));

// Mock ConfigUtil
jest.mock('../util/ConfigUtil', () => ({
  ConfigUtil: {
    getRpcUrl: jest.fn(),
    getCollateralAddress: jest.fn()
  }
}));

// Mock ERC20 ABI
jest.mock('../../contract/@openzeppelin/ERC20.abi.json', () => ([
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{"internalType": "uint8", "name": "", "type": "uint8"}],
    "stateMutability": "view",
    "type": "function"
  }
]), { virtual: true });

describe('ERC20Service', () => {
  const mockProvider = {
    getNetwork: jest.fn()
  };
  const mockWallet = {
    address: '0x1234567890123456789012345678901234567890'
  };
  const mockContract = {
    decimals: {
      staticCall: jest.fn()
    },
    balanceOf: {
      staticCall: jest.fn()
    },
    approve: jest.fn(),
    allowance: {
      staticCall: jest.fn()
    }
  };
  const mockTransaction = {
    hash: '0xabcdef1234567890',
    wait: jest.fn()
  };
  const mockReceipt = {
    hash: '0xabcdef1234567890',
    status: 1
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (ethers.JsonRpcProvider as unknown as jest.Mock).mockReturnValue(mockProvider);
    (ethers.Wallet as unknown as jest.Mock).mockReturnValue(mockWallet);
    (ethers.Contract as unknown as jest.Mock).mockReturnValue(mockContract);
    (ethers.parseEther as unknown as jest.Mock).mockImplementation((value) => `${value}000000000000000000`);
    mockTransaction.wait.mockResolvedValue(mockReceipt);
  });

  describe('Constructor', () => {
    it('should throw error when trying to instantiate', () => {
      expect(() => new (ERC20Service as any)()).toThrow(
        'ERC20Service is a static utility class and cannot be instantiated'
      );
    });
  });



  describe('createReadOnlyContract', () => {
    it('should create a read-only contract instance', () => {
      const rpcUrl = 'https://test-rpc.com';
      const contractAddress = '0x1234567890123456789012345678901234567890';
      
      const result = (ERC20Service as any).createReadOnlyContract(rpcUrl, contractAddress);
      
      expect(ethers.JsonRpcProvider).toHaveBeenCalledWith(rpcUrl);
      expect(ethers.Contract).toHaveBeenCalledWith(
        contractAddress,
        expect.any(Array),
        mockProvider
      );
      expect(result).toBe(mockContract);
    });
  });

  describe('createWriteContract', () => {
    it('should create a write contract instance with signer', () => {
      const rpcUrl = 'https://test-rpc.com';
      const contractAddress = '0x1234567890123456789012345678901234567890';
      const privateKey = '0xprivatekey123';
      
      const result = (ERC20Service as any).createWriteContract(rpcUrl, contractAddress, privateKey);
      
      expect(ethers.JsonRpcProvider).toHaveBeenCalledWith(rpcUrl);
      expect(ethers.Wallet).toHaveBeenCalledWith(privateKey, mockProvider);
      expect(ethers.Contract).toHaveBeenCalledWith(
        contractAddress,
        expect.any(Array),
        mockWallet
      );
      expect(result).toBe(mockContract);
    });
  });

  describe('getDecimals', () => {
    beforeEach(() => {
      (ConfigUtil.getRpcUrl as jest.Mock).mockReturnValue('https://mock-rpc.com');
      (ConfigUtil.getCollateralAddress as jest.Mock).mockReturnValue('0xTokenAddress123');
    });

    it('should get decimals using token symbol and chain name', async () => {
      mockContract.decimals.staticCall.mockResolvedValue(6);
      
      const result = await ERC20Service.getDecimals('USDC', 'ethereum');
      
      expect(result).toBe(6);
      expect(ConfigUtil.getRpcUrl).toHaveBeenCalledWith('ethereum');
      expect(ConfigUtil.getCollateralAddress).toHaveBeenCalledWith('USDC', 'ethereum');
      expect(mockContract.decimals.staticCall).toHaveBeenCalled();
    });

    it('should throw error when decimals call fails', async () => {
      mockContract.decimals.staticCall.mockRejectedValue(new Error('Contract call failed'));
      
      await expect(ERC20Service.getDecimals('USDC', 'ethereum'))
        .rejects.toThrow('Failed to get token decimals: Contract call failed');
    });
  });

  describe('getBalance', () => {
    beforeEach(() => {
      (ConfigUtil.getRpcUrl as jest.Mock).mockReturnValue('https://mock-rpc.com');
      (ConfigUtil.getCollateralAddress as jest.Mock).mockReturnValue('0xTokenAddress123');
    });

    it('should get balance using token symbol and chain name with WEI unit', async () => {
      const mockBalance = '1000000000000000000'; // 1 token with 18 decimals
      mockContract.balanceOf.staticCall.mockResolvedValue(mockBalance);
      
      const result = await ERC20Service.getBalance('USDC', 'ethereum', '0xholderaddress', Unit.WEI);
      
      expect(result).toBe(mockBalance);
      expect(ConfigUtil.getRpcUrl).toHaveBeenCalledWith('ethereum');
      expect(ConfigUtil.getCollateralAddress).toHaveBeenCalledWith('USDC', 'ethereum');
      expect(mockContract.balanceOf.staticCall).toHaveBeenCalledWith('0xholderaddress');
    });

    it('should get balance using token symbol and chain name with ETH unit', async () => {
      const mockBalance = '500000000'; // 500 USDC with 6 decimals
      mockContract.balanceOf.staticCall.mockResolvedValue(mockBalance);
      mockContract.decimals.staticCall.mockResolvedValue(6);
      (ethers.formatUnits as jest.Mock).mockReturnValue('500.0');
      
      const result = await ERC20Service.getBalance('USDC', 'ethereum', '0xholderaddress', Unit.ETH);
      
      expect(result).toBe('500.0');
      expect(ConfigUtil.getRpcUrl).toHaveBeenCalledWith('ethereum');
      expect(ConfigUtil.getCollateralAddress).toHaveBeenCalledWith('USDC', 'ethereum');
      expect(mockContract.balanceOf.staticCall).toHaveBeenCalledWith('0xholderaddress');
      expect(ethers.formatUnits).toHaveBeenCalledWith(mockBalance, 6);
    });

    it('should throw error when balance call fails', async () => {
      mockContract.balanceOf.staticCall.mockRejectedValue(new Error('Balance call failed'));
      
      await expect(ERC20Service.getBalance('USDC', 'ethereum', '0xholderaddress', Unit.WEI))
        .rejects.toThrow('Failed to get token balance: Balance call failed');
    });
  });

  describe('approve', () => {
    beforeEach(() => {
      (ConfigUtil.getRpcUrl as jest.Mock).mockReturnValue('https://mock-rpc.com');
      (ConfigUtil.getCollateralAddress as jest.Mock).mockReturnValue('0xTokenAddress123');
    });

    it('should approve tokens using token symbol and chain name with ETH unit', async () => {
      mockContract.approve.mockResolvedValue(mockTransaction);
      mockContract.decimals.staticCall.mockResolvedValue(18);
      (ethers.parseUnits as jest.Mock).mockReturnValue(BigInt('100000000000000000000'));
      
      const result = await ERC20Service.approve(
        'USDC',
        'ethereum',
        '0xspenderaddress',
        '100',
        Unit.ETH,
        '0xprivatekey'
      );
      
      expect(result).toBe('0xabcdef1234567890');
      expect(ConfigUtil.getRpcUrl).toHaveBeenCalledWith('ethereum');
      expect(ConfigUtil.getCollateralAddress).toHaveBeenCalledWith('USDC', 'ethereum');
      expect(ethers.parseUnits).toHaveBeenCalledWith('100', 18);
      expect(mockContract.approve).toHaveBeenCalledWith(
        '0xspenderaddress',
        BigInt('100000000000000000000')
      );
      expect(mockTransaction.wait).toHaveBeenCalled();
    });

    it('should approve tokens using token symbol and chain name with WEI unit', async () => {
      mockContract.approve.mockResolvedValue(mockTransaction);
      
      const result = await ERC20Service.approve(
        'USDC',
        'ethereum',
        '0xspenderaddress',
        '50000000',
        Unit.WEI,
        '0xprivatekey'
      );
      
      expect(result).toBe('0xabcdef1234567890');
      expect(ConfigUtil.getRpcUrl).toHaveBeenCalledWith('ethereum');
      expect(ConfigUtil.getCollateralAddress).toHaveBeenCalledWith('USDC', 'ethereum');
      expect(mockContract.approve).toHaveBeenCalledWith(
        '0xspenderaddress',
        BigInt('50000000')
      );
    });

    it('should throw error when approve transaction fails', async () => {
      mockContract.approve.mockRejectedValue(new Error('Approve failed'));
      
      await expect(ERC20Service.approve(
        'USDC',
        'ethereum',
        '0xspenderaddress',
        '100',
        Unit.ETH,
        '0xprivatekey'
      )).rejects.toThrow('Failed to approve token: Approve failed');
    });
  });

  describe('getAllowance', () => {
    beforeEach(() => {
      (ConfigUtil.getRpcUrl as jest.Mock).mockReturnValue('https://mock-rpc.com');
      (ConfigUtil.getCollateralAddress as jest.Mock).mockReturnValue('0xTokenAddress123');
    });

    it('should get allowance using token symbol and chain name', async () => {
      const mockAllowance = '1000000000'; // 1000 USDC
      mockContract.allowance.staticCall.mockResolvedValue(mockAllowance);
      
      const result = await ERC20Service.getAllowance(
        'USDC',
        'ethereum',
        '0xowneraddress',
        '0xspenderaddress',
        Unit.WEI
      );
      
      expect(result).toBe(mockAllowance);
      expect(ConfigUtil.getRpcUrl).toHaveBeenCalledWith('ethereum');
      expect(ConfigUtil.getCollateralAddress).toHaveBeenCalledWith('USDC', 'ethereum');
      expect(mockContract.allowance.staticCall).toHaveBeenCalledWith(
        '0xowneraddress',
        '0xspenderaddress'
      );
    });

    it('should throw error when allowance call fails', async () => {
      mockContract.allowance.staticCall.mockRejectedValue(new Error('Allowance call failed'));
      
      await expect(ERC20Service.getAllowance(
        'USDC',
        'ethereum',
        '0xowneraddress',
        '0xspenderaddress',
        Unit.WEI
      )).rejects.toThrow('Failed to get token allowance: Allowance call failed');
    });
  });

  describe('Error handling', () => {
    beforeEach(() => {
      (ConfigUtil.getRpcUrl as jest.Mock).mockReturnValue('https://mock-rpc.com');
      (ConfigUtil.getCollateralAddress as jest.Mock).mockReturnValue('0xTokenAddress123');
    });

    it('should handle non-Error objects in catch blocks', async () => {
      mockContract.decimals.staticCall.mockRejectedValue('String error');
      
      await expect(ERC20Service.getDecimals('USDC', 'ethereum'))
        .rejects.toThrow('Failed to get token decimals: String error');
    });

    it('should handle ConfigUtil errors in resolveContractParams', async () => {
      (ConfigUtil.getRpcUrl as jest.Mock).mockImplementation(() => {
        throw new Error('Chain not found');
      });
      
      await expect(ERC20Service.getDecimals('USDC', 'invalidchain'))
        .rejects.toThrow('Chain not found');
    });
  });
});