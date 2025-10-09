// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {OracleMock} from "@morpho-blue/mocks/OracleMock.sol";

contract UpdateOracleMockPriceScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address oracleAddress = vm.envAddress("ORACLE_ADDRESS");
        
        // Read price from env (in 2 decimals, e.g., 5000 = $50.00)
        uint256 newPrice = vm.envUint("PRICE");
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("Updating OracleMock price...");
        console.log("Oracle Address:", oracleAddress);
        console.log("New Price (2-decimal):", newPrice);
        
        OracleMock oracle = OracleMock(oracleAddress);
        
        // Get old price for logging
        uint256 oldPrice = oracle.price();
        console.log("Old Price (36-decimal):", oldPrice);
        
        // Scale to 36 decimals
        uint256 price36Decimals = newPrice * 1e34; // 2 decimals -> 36 decimals
        oracle.setPrice(price36Decimals);
        
        console.log("New Price (36-decimal):", price36Decimals);
        console.log("Price updated successfully!");
        
        vm.stopBroadcast();
        
        // Log update summary
        console.log("\n=== PRICE UPDATE SUMMARY ===");
        console.log("Oracle:", oracleAddress);
        console.log("Old Price:", oldPrice / 1e34, "(in 2-decimal format)");
        console.log("New Price:", newPrice, "(in 2-decimal format)");
        console.log("New Price (36-decimal):", price36Decimals);
        console.log("===========================");
    }
}

