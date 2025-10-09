// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {IrmMock} from "@morpho-blue/mocks/IrmMock.sol";

/**
 * @title DeployIRMMock
 * @notice Deploy an IRM (Interest Rate Model) mock for Eden Testnet
 * @dev Use this script in case of testnet resets when the default IRM mock is unavailable
 *      The deployed mock can be used with any Morpho Blue market
 */
contract DeployIRMMockScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("Deploying IRM Mock...");
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        
        // Deploy IRM Mock
        IrmMock irm = new IrmMock();
        console.log("IRM Mock deployed at:", address(irm));
        
        vm.stopBroadcast();
        
        // Log deployment info
        console.log("\n=== DEPLOYMENT SUMMARY ===");
        console.log("IRM Mock Address:", address(irm));
        console.log("========================");
        
        console.log("\nNext steps:");
        console.log("1. Update IRM_ADDRESS in your .env file:");
        console.log("   IRM_ADDRESS=", address(irm));
        console.log("2. Use this IRM address when creating markets");
        console.log("\nNote: This is a mock IRM for testing purposes only.");
        console.log("It returns a constant borrow rate and should not be used in production.");
    }
}

