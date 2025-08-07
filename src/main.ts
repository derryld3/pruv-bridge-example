import { ERC20Service } from './services/smart_contract_services/ERC20Service';
import { TokenRouterService } from './services/smart_contract_services/TokenRouterService';
import { BridgeService } from './services/BridgeService';
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

async function testBridgeServicePrecheck() {
  try {
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      console.log('❌ PRIVATE_KEY not found in environment variables');
      return;
    }
    
    // Vitalik Buterin's Ethereum address
    const vitalikAddress = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';

    console.log('\n📋 Testing valid transfer precheck (Sepolia → Pruv Test)...');
    const validResult = await BridgeService.precheckTransferToken(
      'USDC',
      'sepolia',
      'pruvtest',
      vitalikAddress,
      '1.0',
      Unit.ETH,
      privateKey
    );
    console.log(`✅ Valid transfer precheck result: ${validResult}`);

    console.log('\n📋 Testing invalid transfer precheck (unsupported destination)...');
    try {
      await BridgeService.precheckTransferToken(
        'USDC',
        'sepolia',
        'mainnet', // This should fail domain validation
        vitalikAddress,
        '1.0',
        Unit.ETH,
        privateKey
      );
      console.log('❌ Expected validation to fail, but it passed');
    } catch (error) {
      console.log(`✅ Expected validation failure: ${error instanceof Error ? error.message : String(error)}`);
    }

    console.log('\n📋 Testing same chain validation...');
    try {
      await BridgeService.precheckTransferToken(
        'USDC',
        'sepolia',
        'sepolia', // Same chain should fail
        vitalikAddress,
        '1.0',
        Unit.ETH,
        privateKey
      );
      console.log('❌ Expected same chain validation to fail, but it passed');
    } catch (error) {
      console.log(`✅ Expected same chain failure: ${error instanceof Error ? error.message : String(error)}`);
    }

    console.log('\n📋 Testing insufficient balance scenario (1 billion USDC)...');
    try {
      await BridgeService.precheckTransferToken(
        'USDC',
        'sepolia',
        'pruvtest',
        vitalikAddress,
        '1000000000', // 1 billion USDC
        Unit.ETH,
        privateKey
      );
      console.log('❌ Expected insufficient balance failure, but it passed');
    } catch (error) {
      console.log(`✅ Expected insufficient balance failure: ${error instanceof Error ? error.message : String(error)}`);
    }

    console.log('\n📋 Testing insufficient native balance scenario...');
    try {
      await BridgeService.precheckTransferToken(
        'USDC',
        'sepolia',
        'pruvtest',
        vitalikAddress,
        '1', // 1 USDC
        Unit.ETH,
        '0xEFa5B858DE59849268bc36f26366EE26e789aA33' // Address with insufficient native balance
      );
      console.log('❌ Expected insufficient native balance failure, but it passed');
    } catch (error) {
      console.log(`✅ Expected insufficient native balance failure: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    console.log('\n✅ BridgeService precheck tests completed!');
  } catch (error) {
    console.error('❌ Error in BridgeService precheck tests:', error instanceof Error ? error.message : String(error));
  }
}

async function main() {
  // 1. Get gas payment quotes from Sepolia to Pruv Test
  console.log('\n💰 Step 1: Getting gas payment quote from Sepolia to Pruv Test...');
  try {
    const gasPayment = await TokenRouterService.quoteGasPayment('USDC', 'sepolia', 'pruvtest');
    const gasPaymentInEth = ethers.formatEther(gasPayment);
    console.log(`🔍 Gas payment required: ${gasPaymentInEth} ETH`);
    console.log('✅ Gas payment quote retrieved successfully!');
  } catch (error) {
    console.error('❌ Error getting gas payment quote:', error);
    return;
  }

  // 2. Test BridgeService precheck with domain validation
  console.log('\n🔍 Step 2: Testing BridgeService precheck with domain validation...');
  await testBridgeServicePrecheck();

  // 3. Approve 1 USDC and check allowance from Sepolia to Pruv Test
  console.log('\n🔐 Step 3: Approving 1 USDC and checking allowance...');
  await approveUSDCAndCheckAllowance();

  console.log('\n' + '='.repeat(50));
  console.log('✅ All steps completed successfully!');
}

// Run the main function if this file is executed directly
if (require.main === module) {
  main();
}

export { main, approveUSDCAndCheckAllowance, testBridgeServicePrecheck };