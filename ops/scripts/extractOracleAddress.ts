#!/usr/bin/env tsx

import { publicClient } from '../lib/env.js';
import { updateAddresses } from '../lib/updateAddresses.js';

async function extractOracleAddress() {
  console.log('🔍 Extracting oracle address from transaction logs...');
  
  const txHash = '0x9517288ffeb46eb7a00b19ad43b5301cb3d2d48799dcd5961ab9580ab03e30ea';
  
  try {
    const receipt = await publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` });
    
    console.log(`📝 Transaction status: ${receipt.status}`);
    console.log(`📊 Found ${receipt.logs.length} logs`);
    
    // The oracle address should be in one of the logs
    // For Morpho Oracle Factory, the oracle address is typically emitted in an event
    // Let's look for logs that contain addresses (32-byte values that look like addresses)
    
    for (let i = 0; i < receipt.logs.length; i++) {
      const log = receipt.logs[i];
      console.log(`\nLog ${i}:`);
      console.log(`  Address: ${log.address}`);
      console.log(`  Topics: ${log.topics.length}`);
      
      // Check if any topic looks like an oracle address (starts with 0x and is 42 chars)
      for (let j = 0; j < log.topics.length; j++) {
        const topic = log.topics[j];
        if (topic && topic.length === 66) { // 0x + 64 hex chars
          // Convert topic to address format (last 20 bytes)
          const potentialAddress = '0x' + topic.slice(-40);
          console.log(`    Topic ${j}: ${topic} -> ${potentialAddress}`);
        }
      }
      
      // Also check the data field for addresses
      if (log.data && log.data.length > 2) {
        console.log(`  Data: ${log.data}`);
        // Look for 32-byte chunks that could be addresses
        const dataWithoutPrefix = log.data.slice(2);
        for (let k = 0; k < dataWithoutPrefix.length; k += 64) {
          const chunk = dataWithoutPrefix.slice(k, k + 64);
          if (chunk.length === 64) {
            const potentialAddress = '0x' + chunk.slice(-40);
            // Check if it looks like a valid address (not all zeros, not all Fs)
            if (potentialAddress !== '0x0000000000000000000000000000000000000000' && 
                !potentialAddress.match(/^0x[fF]+$/)) {
              console.log(`    Data chunk ${k/64}: ${chunk} -> ${potentialAddress}`);
            }
          }
        }
      }
    }
    
    // For now, let's try to find the most likely oracle address
    // It's usually in the first log's topics or data
    if (receipt.logs.length > 0) {
      const firstLog = receipt.logs[0];
      
      // Try to extract from topics first
      for (const topic of firstLog.topics) {
        if (topic && topic.length === 66) {
          const address = '0x' + topic.slice(-40);
          if (address !== '0x0000000000000000000000000000000000000000' && 
              address !== firstLog.address.toLowerCase()) {
            console.log(`\n🎯 Potential oracle address found: ${address}`);
            
            // Update the addresses file
            updateAddresses([
              { path: 'oracles.builtOracle', value: address }
            ]);
            
            console.log('✅ Oracle address updated in addresses.ts');
            return address;
          }
        }
      }
      
      // If not found in topics, try data
      if (firstLog.data && firstLog.data.length > 2) {
        const dataWithoutPrefix = firstLog.data.slice(2);
        if (dataWithoutPrefix.length >= 64) {
          const address = '0x' + dataWithoutPrefix.slice(-40);
          if (address !== '0x0000000000000000000000000000000000000000') {
            console.log(`\n🎯 Potential oracle address found in data: ${address}`);
            
            updateAddresses([
              { path: 'oracles.builtOracle', value: address }
            ]);
            
            console.log('✅ Oracle address updated in addresses.ts');
            return address;
          }
        }
      }
    }
    
    console.log('⚠️  Could not automatically extract oracle address');
    console.log('📝 Please check the transaction manually and update addresses.ts');
    
  } catch (error) {
    console.error('❌ Failed to extract oracle address:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  extractOracleAddress().catch(console.error);
}



