// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {FaucetERC20} from "../src/FaucetERC20.sol";

contract DeployTokensScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("Deploying faucet tokens...");
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        
        address deployer = vm.addr(deployerPrivateKey);
        
        // Deploy fakeUSD
        FaucetERC20 fakeUSD = new FaucetERC20("Fake USD", "fakeUSD", deployer);
        console.log("fakeUSD deployed at:", address(fakeUSD));
        
        // Deploy fakeTIA
        FaucetERC20 fakeTIA = new FaucetERC20("Fake TIA", "fakeTIA", deployer);
        console.log("fakeTIA deployed at:", address(fakeTIA));
        
        vm.stopBroadcast();
        
        // Log deployment info for easy copying
        console.log("\n=== DEPLOYMENT SUMMARY ===");
        console.log("fakeUSD:", address(fakeUSD));
        console.log("fakeTIA:", address(fakeTIA));
        console.log("========================");
    }
}
