import { ERC20Service } from './services/smart_contract_services/ERC20Service';
import { TokenRouterService } from './services/smart_contract_services/TokenRouterService';
import { ConfigUtil } from './util/ConfigUtil';
import { Unit } from './util/Unit';
import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

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
  // 1. Get supported domains for Sepolia and ensure Pruv Test is included
  console.log('\n🌐 Step 1: Checking supported domains for USDC on Sepolia...');
  try {
    const sepoliaDomains = await TokenRouterService.domains('USDC', 'sepolia');
    console.log('📋 Supported domains for USDC on Sepolia:', sepoliaDomains);
    
    const pruvTestDomainId = ConfigUtil.getDomainId('pruvtest');
    console.log(`🔍 Pruv Test domain ID: ${pruvTestDomainId}`);
    
    if (sepoliaDomains.includes(pruvTestDomainId)) {
      console.log('✅ Pruv Test is supported on Sepolia!');
    } else {
      console.log('❌ Pruv Test is NOT supported on Sepolia');
      return;
    }
  } catch (error) {
    console.error('❌ Error checking domains:', error);
    return;
  }

  // 2. Get router address from Sepolia to Pruv Test
  console.log('\n🔗 Step 2: Getting router address from Sepolia to Pruv Test...');
  try {
    const pruvTestDomainId = ConfigUtil.getDomainId('pruvtest');
    const routerAddress = await TokenRouterService.routers('USDC', 'sepolia', pruvTestDomainId);
    console.log(`📍 Pruv Test router address (from Sepolia): ${routerAddress}`);
    
    if (routerAddress && routerAddress !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
      console.log('✅ Valid router address found!');
    } else {
      console.log('❌ Invalid or zero router address');
      return;
    }
  } catch (error) {
    console.error('❌ Error getting router address:', error);
    return;
  }

  // 3. Get gas payment quotes from Sepolia to Pruv Test
  console.log('\n💰 Step 3: Getting gas payment quote from Sepolia to Pruv Test...');
  try {
    const gasPayment = await TokenRouterService.quoteGasPayment('USDC', 'sepolia', 'pruvtest');
    const gasPaymentInEth = ethers.formatEther(gasPayment);
    console.log(`🔍 Gas payment required: ${gasPaymentInEth} ETH`);
    console.log('✅ Gas payment quote retrieved successfully!');
  } catch (error) {
    console.error('❌ Error getting gas payment quote:', error);
    return;
  }

  // 4. Approve 1 USDC and check allowance from Sepolia to Pruv Test
  console.log('\n🔐 Step 4: Approving 1 USDC and checking allowance...');
  await approveUSDCAndCheckAllowance();

  console.log('\n' + '='.repeat(50));
  console.log('✅ All steps completed successfully!');
}

// Run the main function if this file is executed directly
if (require.main === module) {
  main();
}

export { main, approveUSDCAndCheckAllowance };