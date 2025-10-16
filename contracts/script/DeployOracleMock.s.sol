// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {OracleMock} from "@morpho-blue/mocks/OracleMock.sol";

contract DeployOracleMockScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        // Optional: read initial price from env, default to 5000 (50.00 with 2 decimals)
        uint256 initialPrice = vm.envOr("INITIAL_ORACLE_PRICE", uint256(5000));
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("Deploying OracleMock...");
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        console.log("Initial Price:", initialPrice);
        
        // Deploy OracleMock
        OracleMock oracle = new OracleMock();
        console.log("OracleMock deployed at:", address(oracle));
        
        // Set initial price (scaled to 36 decimals for Morpho Blue)
        // If initialPrice is in 2 decimals (e.g., 5000 = $50.00), scale to 36 decimals
        uint256 price36Decimals = initialPrice * 1e34; // 2 decimals -> 36 decimals
        oracle.setPrice(price36Decimals);
        console.log("Oracle price set to (36-decimal):", price36Decimals);
        console.log("Human readable (2-decimal):", initialPrice);
        
        vm.stopBroadcast();
        
        // Log deployment info
        console.log("\n=== DEPLOYMENT SUMMARY ===");
        console.log("OracleMock Address:", address(oracle));
        console.log("Initial Price (36-decimal):", price36Decimals);
        console.log("Initial Price (human):", initialPrice / 100, ".", initialPrice % 100);
        console.log("========================");
        
        console.log("\nTo update price later:");
        console.log("PRICE=<new_price> forge script script/UpdateOracleMockPrice.s.sol --rpc-url $RPC_URL --broadcast");
    }
}

