import { ERC20Service } from './ERC20Service';
import { ethers } from 'ethers';
import { ConfigUtil } from '../../util/ConfigUtil';
import { Unit } from '../../util/Unit';
import { ERC20Caller } from '../../caller/smart_contract_caller/ERC20Caller';

// Mock ethers
jest.mock('ethers', () => ({
  ethers: {
    JsonRpcProvider: jest.fn(),
    Wallet: jest.fn(),
    Contract: jest.fn(),
    parseEther: jest.fn(),
    parseUnits: jest.fn(),
    formatUnits: jest.fn(),
  },
}));

// Mock ConfigUtil
jest.mock('../../util/ConfigUtil', () => ({
  ConfigUtil: {
    getRpcUrl: jest.fn(),
    getCollateralAddress: jest.fn(),
  },
}));

// Mock ERC20Caller
jest.mock('../../caller/smart_contract_caller/ERC20Caller', () => ({
  ERC20Caller: {
    getDecimals: jest.fn(),
    approve: jest.fn(),
    getAllowance: jest.fn(),
  },
}));

// Mock ERC20 ABI
jest.mock(
  '../../contract/@openzeppelin/ERC20.abi.json',
  () => [
    {
      inputs: [],
      name: 'decimals',
      outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
      stateMutability: 'view',
      type: 'function',
    },
  ],
  { virtual: true },
);

describe('ERC20Service', () => {
  const mockWallet = {
    address: '0x1234567890123456789012345678901234567890',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (ethers.Wallet as unknown as jest.Mock).mockReturnValue(mockWallet);
    (ethers.parseEther as unknown as jest.Mock).mockImplementation(
      (value) => `${value}000000000000000000`,
    );
  });

  describe('Constructor', () => {
    it('should throw error when trying to instantiate', () => {
      expect(() => new (ERC20Service as any)()).toThrow(
        'ERC20Service is a static utility class and cannot be instantiated',
      );
    });
  });

  // Note: createReadOnlyContract and createWriteContract methods have been moved to ERC20Caller

  describe('getDecimals', () => {
    beforeEach(() => {
      (ConfigUtil.getRpcUrl as jest.Mock).mockReturnValue(
        'https://mock-rpc.com',
      );
      (ConfigUtil.getCollateralAddress as jest.Mock).mockReturnValue(
        '0xTokenAddress123',
      );
    });

    it('should get decimals using token symbol and chain name', async () => {
      (ERC20Caller.getDecimals as jest.Mock).mockResolvedValue(6);

      const result = await ERC20Service.getDecimals('USDC', 'ethereum');

      expect(result).toBe(6);
      expect(ConfigUtil.getRpcUrl).toHaveBeenCalledWith('ethereum');
      expect(ConfigUtil.getCollateralAddress).toHaveBeenCalledWith(
        'USDC',
        'ethereum',
      );
      expect(ERC20Caller.getDecimals).toHaveBeenCalledWith(
        'https://mock-rpc.com',
        '0xTokenAddress123',
      );
    });

    it('should throw error when decimals call fails', async () => {
      (ERC20Caller.getDecimals as jest.Mock).mockRejectedValue(
        new Error('Contract call failed'),
      );

      await expect(
        ERC20Service.getDecimals('USDC', 'ethereum'),
      ).rejects.toThrow('Failed to get token decimals: Contract call failed');
    });
  });



  describe('approve', () => {
    beforeEach(() => {
      (ConfigUtil.getRpcUrl as jest.Mock).mockReturnValue(
        'https://mock-rpc.com',
      );
      (ConfigUtil.getCollateralAddress as jest.Mock).mockReturnValue(
        '0xTokenAddress123',
      );
    });

    it('should approve tokens using token symbol and chain name with ETH unit', async () => {
      (ERC20Caller.getDecimals as jest.Mock).mockResolvedValue(18);
      (ERC20Caller.approve as jest.Mock).mockResolvedValue('0xabcdef1234567890');
      (ethers.parseUnits as jest.Mock).mockReturnValue(
        BigInt('100000000000000000000'),
      );

      const result = await ERC20Service.approve(
        'USDC',
        'ethereum',
        '0xspenderaddress',
        '100',
        Unit.ETH,
        '0xprivatekey',
      );

      expect(result).toBe('0xabcdef1234567890');
      expect(ConfigUtil.getRpcUrl).toHaveBeenCalledWith('ethereum');
      expect(ConfigUtil.getCollateralAddress).toHaveBeenCalledWith(
        'USDC',
        'ethereum',
      );
      expect(ERC20Caller.getDecimals).toHaveBeenCalledWith(
        'https://mock-rpc.com',
        '0xTokenAddress123',
      );
      expect(ethers.parseUnits).toHaveBeenCalledWith('100', 18);
      expect(ERC20Caller.approve).toHaveBeenCalledWith(
        '0xTokenAddress123',
        '0xspenderaddress',
        BigInt('100000000000000000000'),
        expect.any(Object),
      );
    });

    it('should approve tokens using token symbol and chain name with WEI unit', async () => {
      (ERC20Caller.approve as jest.Mock).mockResolvedValue('0xabcdef1234567890');

      const result = await ERC20Service.approve(
        'USDC',
        'ethereum',
        '0xspenderaddress',
        '50000000',
        Unit.WEI,
        '0xprivatekey',
      );

      expect(result).toBe('0xabcdef1234567890');
      expect(ConfigUtil.getRpcUrl).toHaveBeenCalledWith('ethereum');
      expect(ConfigUtil.getCollateralAddress).toHaveBeenCalledWith(
        'USDC',
        'ethereum',
      );
      expect(ERC20Caller.approve).toHaveBeenCalledWith(
        '0xTokenAddress123',
        '0xspenderaddress',
        BigInt('50000000'),
        expect.any(Object),
      );
    });

    it('should throw error when approve transaction fails', async () => {
      (ERC20Caller.getDecimals as jest.Mock).mockResolvedValue(18);
      (ERC20Caller.approve as jest.Mock).mockRejectedValue(new Error('Approve failed'));

      await expect(
        ERC20Service.approve(
          'USDC',
          'ethereum',
          '0xspenderaddress',
          '100',
          Unit.ETH,
          '0xprivatekey',
        ),
      ).rejects.toThrow('Failed to approve token: Approve failed');
    });
  });

  describe('getAllowance', () => {
    beforeEach(() => {
      (ConfigUtil.getRpcUrl as jest.Mock).mockReturnValue(
        'https://mock-rpc.com',
      );
      (ConfigUtil.getCollateralAddress as jest.Mock).mockReturnValue(
        '0xTokenAddress123',
      );
    });

    it('should get allowance using token symbol and chain name', async () => {
      const mockAllowance = '1000000000'; // 1000 USDC
      (ERC20Caller.getAllowance as jest.Mock).mockResolvedValue(mockAllowance);

      const result = await ERC20Service.getAllowance(
        'USDC',
        'ethereum',
        '0xowneraddress',
        '0xspenderaddress',
        Unit.WEI,
      );

      expect(result).toBe(mockAllowance);
      expect(ConfigUtil.getRpcUrl).toHaveBeenCalledWith('ethereum');
      expect(ConfigUtil.getCollateralAddress).toHaveBeenCalledWith(
        'USDC',
        'ethereum',
      );
      expect(ERC20Caller.getAllowance).toHaveBeenCalledWith(
        'https://mock-rpc.com',
        '0xTokenAddress123',
        '0xowneraddress',
        '0xspenderaddress',
      );
    });

    it('should throw error when allowance call fails', async () => {
      (ERC20Caller.getAllowance as jest.Mock).mockRejectedValue(
        new Error('Allowance call failed'),
      );

      await expect(
        ERC20Service.getAllowance(
          'USDC',
          'ethereum',
          '0xowneraddress',
          '0xspenderaddress',
          Unit.WEI,
        ),
      ).rejects.toThrow('Failed to get token allowance: Allowance call failed');
    });
  });

  describe('Error handling', () => {
    beforeEach(() => {
      (ConfigUtil.getRpcUrl as jest.Mock).mockReturnValue(
        'https://mock-rpc.com',
      );
      (ConfigUtil.getCollateralAddress as jest.Mock).mockReturnValue(
        '0xTokenAddress123',
      );
    });

    it('should handle non-Error objects in catch blocks', async () => {
      (ERC20Caller.getDecimals as jest.Mock).mockRejectedValue('String error');

      await expect(
        ERC20Service.getDecimals('USDC', 'ethereum'),
      ).rejects.toThrow('Failed to get token decimals: String error');
    });

    it('should handle ConfigUtil errors in resolveContractParams', async () => {
      (ConfigUtil.getRpcUrl as jest.Mock).mockImplementation(() => {
        throw new Error('Chain not found');
      });

      await expect(
        ERC20Service.getDecimals('USDC', 'invalidchain'),
      ).rejects.toThrow('Chain not found');
    });
  });
});
