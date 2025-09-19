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
        
        // Mint 200 loan tokens (fakeUSD)
        FaucetERC20(loanToken).mint(deployer, 200e18);
        console.log("Minted 200 fakeUSD to deployer");
        
        // Mint 100 collateral tokens (fakeTIA)
        FaucetERC20(collateralToken).mint(deployer, 100e18);
        console.log("Minted 100 fakeTIA to deployer");
        
        vm.stopBroadcast();
        
        // Check final balances
        uint256 loanBalance = FaucetERC20(loanToken).balanceOf(deployer);
        uint256 collateralBalance = FaucetERC20(collateralToken).balanceOf(deployer);
        
        console.log("\n=== FINAL BALANCES ===");
        console.log("fakeUSD balance:", loanBalance / 1e18);
        console.log("fakeTIA balance:", collateralBalance / 1e18);
        console.log("=====================");
    }
}
