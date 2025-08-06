import { ERC20Service } from './services/ERC20Service';
import { ConfigUtil } from './util/ConfigUtil';
import { Unit } from './util/Unit';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function fetchUSDCBalances() {
  const vitalik_buterin_address = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
  try {
    console.log('Fetching Vitalik Buterin\'s USDC balances...');
    console.log(`Address: ${vitalik_buterin_address}`);
    
    // Display USDC contract addresses for each chain
    console.log('\n📋 USDC Contract Addresses:');
    console.log(`Sepolia: ${ConfigUtil.getCollateralAddress('USDC', 'sepolia')}`);
    console.log(`Arbitrum Sepolia: ${ConfigUtil.getCollateralAddress('USDC', 'arbitrumsepolia')}`);
    
    console.log('\n' + '='.repeat(50));

    // Get USDC balance on Sepolia
    console.log('\n🔍 Checking USDC balance on Sepolia...');
    const sepoliaBalance = await ERC20Service.getBalance('USDC', 'sepolia', vitalik_buterin_address, Unit.ETH);
    console.log(`Sepolia USDC Balance: ${sepoliaBalance} USDC`);

    // Get USDC balance on Arbitrum Sepolia
    console.log('\n🔍 Checking USDC balance on Arbitrum Sepolia...');
    const arbitrumSepoliaBalance = await ERC20Service.getBalance('USDC', 'arbitrumsepolia', vitalik_buterin_address, Unit.ETH);
    console.log(`Arbitrum Sepolia USDC Balance: ${arbitrumSepoliaBalance} USDC`);

    console.log('\n' + '='.repeat(50));
    console.log('✅ USDC balance fetching completed successfully!');

  } catch (error) {
    console.error('❌ Error fetching USDC balances:', error instanceof Error ? error.message : String(error));
  }
}

async function approveUSDCAndCheckAllowance() {
  const spender_address = ConfigUtil.getRouterAddress('USDC', 'sepolia'); // USDC Sepolia router address
  
  try {
    console.log('\nApproving USDC spending...');
    
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      console.log('❌ PRIVATE_KEY not found in environment variables');
      return;
    }
    
    console.log('\n💰 Approving 1 USDC on Sepolia...');
    try {
      const approvalTx = await ERC20Service.approve(
        'USDC',
        'sepolia',
        spender_address,
        '1',
        Unit.ETH,
        privateKey
      );
      console.log(`✅ Approval successful! Transaction hash: ${approvalTx}`);
      
      // Get and display the allowance after approval
      console.log('\n🔍 Checking allowance after approval...');
      // Get the wallet address from the private key
      const { ethers } = require('ethers');
      const wallet = new ethers.Wallet(privateKey);
      const ownerAddress = wallet.address;
      
      const allowance = await ERC20Service.getAllowance(
        'USDC',
        'sepolia',
        ownerAddress,
        spender_address,
        Unit.ETH
      );
      console.log(`Current allowance for ${ownerAddress}: ${allowance} USDC`);
    } catch (error) {
      console.log(`❌ Approval failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ USDC approval and allowance check completed successfully!');

  } catch (error) {
    console.error('❌ Error in USDC approval process:', error instanceof Error ? error.message : String(error));
  }
}

async function main() {
  await fetchUSDCBalances();
  await approveUSDCAndCheckAllowance();
}

// Run the main function if this file is executed directly
if (require.main === module) {
  main();
}

export { main, fetchUSDCBalances, approveUSDCAndCheckAllowance };