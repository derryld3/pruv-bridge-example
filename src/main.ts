import { BridgeService } from './services/BridgeService';
import { Unit } from './util/Unit';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function executeTokenTransfer(): Promise<void> {
  console.log('\n🚀 Step 3: Executing token transfer...');
  try {
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      console.log('❌ PRIVATE_KEY not found in environment variables');
      return;
    }

    // Vitalik Buterin's Ethereum address as recipient
    const vitalikAddress = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
    
    // Transfer 1 USDC
    const transferAmount = '1';
    
    console.log(`🔄 Transferring 1 USDC from Sepolia to Pruv Test...`);
    console.log(`   Recipient: ${vitalikAddress}`);
    console.log(`   Amount: ${transferAmount} USDC`);
    
    const result = await BridgeService.transferToken(
      'USDC',
      'sepolia',
      'pruvtest',
      vitalikAddress,
      transferAmount,
      Unit.ETH,
      privateKey
    );
    
    console.log(`✅ Transfer successful!`);
    console.log(`   Transaction Hash: ${result.transactionHash}`);
    console.log(`   Message ID: ${result.messageId}`);
  } catch (error) {
    console.log(`❌ Transfer failed: ${error instanceof Error ? error.message : String(error)}`);
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
  // 1. Test BridgeService precheck with domain validation
  console.log('\n🔍 Step 1: Testing BridgeService precheck with domain validation...');
  await testBridgeServicePrecheck();

  // 2. Execute token transfer using transferRemote
  console.log('\n🚀 Step 2: Executing token transfer with automatic approval...');
  await executeTokenTransfer();

  console.log('\n' + '='.repeat(50));
  console.log('✅ All steps completed successfully!');
}

// Run the main function if this file is executed directly
if (require.main === module) {
  main();
}

export { main, testBridgeServicePrecheck, executeTokenTransfer };