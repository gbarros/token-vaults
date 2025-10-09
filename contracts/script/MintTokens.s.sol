// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {FaucetERC20} from "../src/FaucetERC20.sol";

contract MintTokensScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address loanToken = vm.envAddress("LOAN_TOKEN");
        address collateralToken = vm.envAddress("COLLATERAL_TOKEN");
        
        address deployer = vm.addr(deployerPrivateKey);
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("Minting tokens to deployer...");
        console.log("Deployer:", deployer);
        
        // Mint enough tokens for all initialization scenarios
        // Covers Low (30%), Medium (60%), and High (80%) utilization scenarios
        FaucetERC20(loanToken).mint(deployer, 2000e18);
        console.log("Minted 2000 fakeUSD to deployer");
        
        FaucetERC20(collateralToken).mint(deployer, 1500e18);
        console.log("Minted 1500 fakeTIA to deployer");
        
        vm.stopBroadcast();
        
        // Check final balances
        uint256 loanBalance = FaucetERC20(loanToken).balanceOf(deployer);
        uint256 collateralBalance = FaucetERC20(collateralToken).balanceOf(deployer);
        
        console.log("\n=== FINAL BALANCES ===");
        console.log("fakeUSD balance:", loanBalance / 1e18);
        console.log("fakeTIA balance:", collateralBalance / 1e18);
        console.log("\nSufficient for all initialization scenarios:");
        console.log("  - Low (30%): ~1,300 fakeUSD + 400 fakeTIA");
        console.log("  - Medium (60%): ~1,600 fakeUSD + 800 fakeTIA");
        console.log("  - High (80%): ~1,900 fakeUSD + 1,200 fakeTIA");
        console.log("=====================");
    }
}
