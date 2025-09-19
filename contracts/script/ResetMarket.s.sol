// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {IMorphoBase, MarketParams, Market, Position} from "@morpho-blue/interfaces/IMorpho.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title ResetMarketScript
/// @notice Script to reset a market by withdrawing all positions
/// @dev This helps clean up markets with abnormal shares/assets ratios
contract ResetMarketScript is Script {
    
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
        
        console.log("=== MARKET RESET SCRIPT ===");
        console.log("Deployer:", deployer);
        console.log("WARNING: This will attempt to withdraw all positions!");
        
        // Create market parameters
        MarketParams memory marketParams = MarketParams({
            loanToken: loanToken,
            collateralToken: collateralToken,
            oracle: oracle,
            irm: irm,
            lltv: lltv
        });
        
        // Check current state
        Market memory market = IMorphoBase(morphoBlueCore).market(marketParams);
        Position memory position = IMorphoBase(morphoBlueCore).position(marketParams, deployer);
        
        console.log("\nCurrent market state:");
        console.log("- Supply assets:", market.totalSupplyAssets / 1e18);
        console.log("- Borrow assets:", market.totalBorrowAssets / 1e18);
        console.log("- Supply shares:", market.totalSupplyShares / 1e18);
        console.log("- Borrow shares:", market.totalBorrowShares / 1e18);
        
        console.log("\nDeployer position:");
        console.log("- Supply shares:", position.supplyShares / 1e18);
        console.log("- Borrow shares:", position.borrowShares / 1e18);
        console.log("- Collateral:", position.collateral / 1e18);
        
        if (position.supplyShares == 0 && position.borrowShares == 0 && position.collateral == 0) {
            console.log("✅ No position to reset");
            return;
        }
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Step 1: Repay all borrows if any
        if (position.borrowShares > 0) {
            console.log("\nStep 1: Repaying all borrows...");
            
            // Calculate borrow assets from shares
            uint256 borrowAssets = market.totalBorrowShares > 0 
                ? (position.borrowShares * market.totalBorrowAssets + market.totalBorrowShares - 1) / market.totalBorrowShares
                : 0;
            
            console.log("Repaying", borrowAssets / 1e18, "loan tokens");
            
            // Ensure we have enough tokens to repay
            uint256 loanBalance = IERC20(loanToken).balanceOf(deployer);
            require(loanBalance >= borrowAssets, "Insufficient loan tokens to repay");
            
            IERC20(loanToken).approve(morphoBlueCore, borrowAssets);
            IMorphoBase(morphoBlueCore).repay(marketParams, borrowAssets, 0, deployer, "");
        }
        
        // Step 2: Withdraw all collateral if any
        if (position.collateral > 0) {
            console.log("\nStep 2: Withdrawing all collateral...");
            console.log("Withdrawing", position.collateral / 1e18, "collateral tokens");
            
            IMorphoBase(morphoBlueCore).withdrawCollateral(marketParams, position.collateral, deployer, deployer);
        }
        
        // Step 3: Withdraw all supply if any
        if (position.supplyShares > 0) {
            console.log("\nStep 3: Withdrawing all supply...");
            console.log("Withdrawing", position.supplyShares / 1e18, "supply shares");
            
            IMorphoBase(morphoBlueCore).withdraw(marketParams, 0, position.supplyShares, deployer, deployer);
        }
        
        vm.stopBroadcast();
        
        // Verify reset
        console.log("\nVerifying reset...");
        Market memory finalMarket = IMorphoBase(morphoBlueCore).market(marketParams);
        Position memory finalPosition = IMorphoBase(morphoBlueCore).position(marketParams, deployer);
        
        console.log("Final market state:");
        console.log("- Supply assets:", finalMarket.totalSupplyAssets / 1e18);
        console.log("- Borrow assets:", finalMarket.totalBorrowAssets / 1e18);
        console.log("- Supply shares:", finalMarket.totalSupplyShares / 1e18);
        console.log("- Borrow shares:", finalMarket.totalBorrowShares / 1e18);
        
        console.log("Final deployer position:");
        console.log("- Supply shares:", finalPosition.supplyShares / 1e18);
        console.log("- Borrow shares:", finalPosition.borrowShares / 1e18);
        console.log("- Collateral:", finalPosition.collateral / 1e18);
        
        if (finalPosition.supplyShares == 0 && finalPosition.borrowShares == 0 && finalPosition.collateral == 0) {
            console.log("✅ Market reset successful!");
        } else {
            console.log("⚠️  Market reset incomplete - some positions remain");
        }
        
        console.log("\n=== RESET COMPLETE ===");
    }
}
