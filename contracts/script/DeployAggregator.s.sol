// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {SettableAggregator} from "../src/SettableAggregator.sol";

contract DeployAggregatorScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("Deploying SettableAggregator...");
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        
        address deployer = vm.addr(deployerPrivateKey);
        
        // Deploy aggregator with 8 decimals (like Chainlink)
        SettableAggregator aggregator = new SettableAggregator(8, "fakeTIA/fakeUSD", deployer);
        console.log("SettableAggregator deployed at:", address(aggregator));
        
        // Set initial price: 10,000 with 8 decimals = 1000000000000
        int256 initialPrice = 1000000000000; // 10,000 * 1e8
        uint256 currentTime = block.timestamp;
        
        aggregator.setAnswer(initialPrice, 0, currentTime); // roundId 0 = auto-increment
        console.log("Initial price set to:", uint256(initialPrice));
        console.log("Timestamp:", currentTime);
        
        vm.stopBroadcast();
        
        // Log deployment info
        console.log("\n=== DEPLOYMENT SUMMARY ===");
        console.log("SettableAggregator:", address(aggregator));
        console.log("Initial Price:", uint256(initialPrice), "(8 decimals)");
        console.log("Human Readable:", uint256(initialPrice) / 1e8);
        console.log("========================");
    }
}
