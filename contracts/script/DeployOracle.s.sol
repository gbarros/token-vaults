// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {OracleFromAggregator} from "../src/OracleFromAggregator.sol";

contract DeployOracleScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address aggregatorAddress = vm.envAddress("AGGREGATOR_ADDRESS");
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("Deploying OracleFromAggregator...");
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        console.log("Aggregator:", aggregatorAddress);
        
        // Deploy oracle with 1 hour staleness threshold
        uint256 maxStaleness = 3600; // 1 hour
        OracleFromAggregator oracle = new OracleFromAggregator(aggregatorAddress, maxStaleness);
        console.log("OracleFromAggregator deployed at:", address(oracle));
        
        // Test the oracle price (should be 36-decimal scaled)
        uint256 price = oracle.price();
        console.log("Oracle price (36-decimal):", price);
        console.log("Human readable:", price / 1e36);
        
        vm.stopBroadcast();
        
        // Log deployment info
        console.log("\n=== DEPLOYMENT SUMMARY ===");
        console.log("OracleFromAggregator:", address(oracle));
        console.log("Aggregator Source:", aggregatorAddress);
        console.log("Max Staleness:", maxStaleness, "seconds");
        console.log("Current Price:", price);
        console.log("========================");
    }
}
