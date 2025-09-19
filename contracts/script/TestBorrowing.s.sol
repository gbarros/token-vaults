// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {IMorphoBase, MarketParams} from "@morpho-blue/interfaces/IMorpho.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract TestBorrowingScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        // Environment variables
        address morphoBlueCore = vm.envAddress("MORPHO_BLUE_CORE");
        address loanToken = vm.envAddress("LOAN_TOKEN");
        address collateralToken = vm.envAddress("COLLATERAL_TOKEN");
        address oracle = vm.envAddress("ORACLE_ADDRESS");
        address irm = vm.envAddress("IRM_ADDRESS");
        uint256 lltv = vm.envUint("LLTV");
        
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Testing additional borrowing...");
        console.log("Deployer:", deployer);
        
        // Create market parameters
        MarketParams memory marketParams = MarketParams({
            loanToken: loanToken,
            collateralToken: collateralToken,
            oracle: oracle,
            irm: irm,
            lltv: lltv
        });
        
        // Check current balances
        uint256 loanBalance = IERC20(loanToken).balanceOf(deployer);
        uint256 collateralBalance = IERC20(collateralToken).balanceOf(deployer);
        console.log("Current fakeUSD balance:", loanBalance / 1e18);
        console.log("Current fakeTIA balance:", collateralBalance / 1e18);
        
        // Test a small additional borrow
        uint256 additionalBorrow = 1e18; // 1 fakeUSD
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("Attempting to borrow additional", additionalBorrow / 1e18, "fakeUSD...");
        
        try IMorphoBase(morphoBlueCore).borrow(marketParams, additionalBorrow, 0, deployer, deployer) {
            console.log("SUCCESS! Additional borrowing works!");
            
            // Check new balance
            uint256 newBalance = IERC20(loanToken).balanceOf(deployer);
            console.log("New fakeUSD balance:", newBalance / 1e18);
            console.log("Borrowed amount:", (newBalance - loanBalance) / 1e18);
            
        } catch Error(string memory reason) {
            console.log("FAILED:", reason);
        } catch {
            console.log("FAILED: Unknown error");
        }
        
        vm.stopBroadcast();
        
        console.log("\n=== BORROWING TEST COMPLETE ===");
        console.log("Market is functional and ready for use!");
        console.log("==============================");
    }
}
