// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {SettableAggregator} from "../src/SettableAggregator.sol";

contract UpdateAggregatorPriceScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address aggregatorAddress = vm.envAddress("AGGREGATOR_ADDRESS");
        
        // Optional: get price from env, default to 10,000
        uint256 priceInput = vm.envOr("PRICE", uint256(10000));
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("Updating aggregator price...");
        console.log("Aggregator:", aggregatorAddress);
        console.log("New price:", priceInput);
        
        SettableAggregator aggregator = SettableAggregator(aggregatorAddress);
        
        // Convert to 8 decimals (Chainlink standard)
        int256 price = int256(priceInput * 1e8);
        uint256 currentTime = block.timestamp;
        
        aggregator.setAnswer(price, 0, currentTime); // roundId 0 = auto-increment
        
        console.log("Price updated to:", uint256(price), "(8 decimals)");
        console.log("Timestamp:", currentTime);
        
        vm.stopBroadcast();
        
        // Log update info
        console.log("\n=== PRICE UPDATE SUMMARY ===");
        console.log("Aggregator:", aggregatorAddress);
        console.log("New Price:", uint256(price), "(raw)");
        console.log("Human Readable:", priceInput);
        console.log("Timestamp:", currentTime);
        console.log("===========================");
    }
}
