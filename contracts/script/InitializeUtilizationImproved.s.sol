// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {IMorpho, MarketParams, Market, Id} from "@morpho-blue/interfaces/IMorpho.sol";
import {MarketParamsLib} from "@morpho-blue/libraries/MarketParamsLib.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title InitializeUtilizationImprovedScript
/// @notice Improved market initialization with better parameters and validation
/// @dev This script provides multiple initialization scenarios for different testing needs
contract InitializeUtilizationImprovedScript is Script {
    
    // Initialization scenarios
    enum InitScenario {
        LOW_UTILIZATION,    // ~30% utilization - conservative
        MEDIUM_UTILIZATION, // ~60% utilization - balanced  
        HIGH_UTILIZATION,   // ~80% utilization - aggressive
        CUSTOM             // Custom amounts from env vars
    }
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        // Environment variables
        address morphoBlueCore = vm.envAddress("MORPHO_BLUE_CORE");
        address loanToken = vm.envAddress("LOAN_TOKEN");
        address collateralToken = vm.envAddress("COLLATERAL_TOKEN");
        address oracle = vm.envAddress("ORACLE_ADDRESS");
        address irm = vm.envAddress("IRM_ADDRESS");
        uint256 lltv = vm.envUint("LLTV");
        
        // Get scenario from env (default to MEDIUM_UTILIZATION)
        uint256 scenarioInt = vm.envOr("INIT_SCENARIO", uint256(InitScenario.MEDIUM_UTILIZATION));
        InitScenario scenario = InitScenario(scenarioInt);
        
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("=== IMPROVED MARKET INITIALIZATION ===");
        console.log("Deployer:", deployer);
        console.log("Scenario:", _getScenarioName(scenario));
        
        // Create market parameters
        MarketParams memory marketParams = MarketParams({
            loanToken: loanToken,
            collateralToken: collateralToken,
            oracle: oracle,
            irm: irm,
            lltv: lltv
        });
        
        // Check current market state
        _checkMarketState(morphoBlueCore, marketParams);
        
        // Get initialization amounts based on scenario
        (uint256 supplyAmount, uint256 collateralAmount, uint256 borrowAmount) = _getInitAmounts(scenario);
        
        console.log("\nInitialization amounts:");
        console.log("- Supply:", supplyAmount / 1e18, "loan tokens");
        console.log("- Collateral:", collateralAmount / 1e18, "collateral tokens");
        console.log("- Borrow:", borrowAmount / 1e18, "loan tokens");
        console.log("- Target utilization:", (borrowAmount * 100) / supplyAmount, "%");
        
        // Validate balances
        _validateBalances(loanToken, collateralToken, deployer, supplyAmount, collateralAmount);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Execute initialization
        _executeInitialization(morphoBlueCore, marketParams, deployer, supplyAmount, collateralAmount, borrowAmount);
        
        vm.stopBroadcast();
        
        // Verify final state
        _verifyFinalState(morphoBlueCore, marketParams, supplyAmount, borrowAmount);
        
        console.log("\n=== INITIALIZATION COMPLETE ===");
    }
    
    function _getScenarioName(InitScenario scenario) internal pure returns (string memory) {
        if (scenario == InitScenario.LOW_UTILIZATION) return "LOW_UTILIZATION (30%)";
        if (scenario == InitScenario.MEDIUM_UTILIZATION) return "MEDIUM_UTILIZATION (60%)";
        if (scenario == InitScenario.HIGH_UTILIZATION) return "HIGH_UTILIZATION (80%)";
        return "CUSTOM";
    }
    
    function _getInitAmounts(InitScenario scenario) internal view returns (uint256 supply, uint256 collateral, uint256 borrow) {
        if (scenario == InitScenario.LOW_UTILIZATION) {
            // Conservative: 1000 supply, 30% utilization
            supply = 1000e18;      // 1000 fakeUSD
            collateral = 400e18;   // 400 fakeTIA (enough for 300 borrow at 80% LLTV with 5.0 price)
            borrow = 300e18;       // 300 fakeUSD (30% utilization)
        } else if (scenario == InitScenario.MEDIUM_UTILIZATION) {
            // Balanced: 1000 supply, 60% utilization  
            supply = 1000e18;      // 1000 fakeUSD
            collateral = 800e18;   // 800 fakeTIA (enough for 600 borrow)
            borrow = 600e18;       // 600 fakeUSD (60% utilization)
        } else if (scenario == InitScenario.HIGH_UTILIZATION) {
            // Aggressive: 1000 supply, 80% utilization
            supply = 1000e18;      // 1000 fakeUSD
            collateral = 1000e18;  // 1000 fakeTIA (enough for 800 borrow)
            borrow = 800e18;       // 800 fakeUSD (80% utilization)
        } else {
            // Custom amounts from environment variables
            // Use explicit type casting for vm.envOr to avoid ambiguity
            try vm.envUint("CUSTOM_SUPPLY_AMOUNT") returns (uint256 val) {
                supply = val;
            } catch {
                supply = 1000e18;
            }
            try vm.envUint("CUSTOM_COLLATERAL_AMOUNT") returns (uint256 val) {
                collateral = val;
            } catch {
                collateral = 800e18;
            }
            try vm.envUint("CUSTOM_BORROW_AMOUNT") returns (uint256 val) {
                borrow = val;
            } catch {
                borrow = 600e18;
            }
        }
    }
    
    function _checkMarketState(address morphoBlueCore, MarketParams memory marketParams) internal view {
        console.log("\nChecking current market state...");
        
        Id marketId = MarketParamsLib.id(marketParams);
        try IMorpho(morphoBlueCore).market(marketId) returns (Market memory market) {
            if (market.totalSupplyAssets > 0 || market.totalBorrowAssets > 0) {
                console.log("WARNING:  Market already has activity:");
                console.log("   Supply assets:", market.totalSupplyAssets / 1e18);
                console.log("   Borrow assets:", market.totalBorrowAssets / 1e18);
                console.log("   Supply shares:", market.totalSupplyShares);
                console.log("   Borrow shares:", market.totalBorrowShares);
                
                // Calculate shares/assets ratio
                if (market.totalSupplyAssets > 0) {
                    uint256 ratio = (market.totalSupplyShares * 1e18) / market.totalSupplyAssets;
                    console.log("   Shares/Assets ratio:", ratio);
                    
                    if (ratio > 2e18 || ratio < 5e17) { // Outside 0.5x to 2x range
                        console.log("   WARNING:  Abnormal shares/assets ratio detected!");
                        console.log("   Consider using a fresh market for better results.");
                    }
                }
            } else {
                console.log("[OK] Market is empty - good for initialization");
            }
        } catch {
            console.log("[ERROR] Could not read market state");
        }
    }
    
    function _validateBalances(
        address loanToken, 
        address collateralToken, 
        address deployer, 
        uint256 supplyAmount, 
        uint256 collateralAmount
    ) internal view {
        console.log("\nValidating token balances...");
        
        uint256 loanBalance = IERC20(loanToken).balanceOf(deployer);
        uint256 collateralBalance = IERC20(collateralToken).balanceOf(deployer);
        
        console.log("Available balances:");
        console.log("- Loan token:", loanBalance / 1e18);
        console.log("- Collateral token:", collateralBalance / 1e18);
        
        require(loanBalance >= supplyAmount, "Insufficient loan token balance");
        require(collateralBalance >= collateralAmount, "Insufficient collateral token balance");
        
        console.log("[OK] Sufficient balances available");
    }
    
    function _executeInitialization(
        address morphoBlueCore,
        MarketParams memory marketParams,
        address deployer,
        uint256 supplyAmount,
        uint256 collateralAmount,
        uint256 borrowAmount
    ) internal {
        console.log("\nExecuting initialization...");
        
        // Step 1: Approve tokens with some buffer
        console.log("Step 1: Approving tokens...");
        IERC20(marketParams.loanToken).approve(morphoBlueCore, supplyAmount * 2); // 2x buffer
        IERC20(marketParams.collateralToken).approve(morphoBlueCore, collateralAmount * 2); // 2x buffer
        
        // Step 2: Supply liquidity (this creates the initial shares 1:1 with assets)
        console.log("Step 2: Supplying", supplyAmount / 1e18, "loan tokens...");
        IMorpho(morphoBlueCore).supply(marketParams, supplyAmount, 0, deployer, "");
        
        // Step 3: Supply collateral
        console.log("Step 3: Supplying", collateralAmount / 1e18, "collateral tokens...");
        IMorpho(morphoBlueCore).supplyCollateral(marketParams, collateralAmount, deployer, "");
        
        // Step 4: Borrow to create utilization
        console.log("Step 4: Borrowing", borrowAmount / 1e18, "loan tokens...");
        IMorpho(morphoBlueCore).borrow(marketParams, borrowAmount, 0, deployer, deployer);
        
        console.log("[OK] All transactions executed successfully");
    }
    
    function _verifyFinalState(
        address morphoBlueCore,
        MarketParams memory marketParams,
        uint256 expectedSupply,
        uint256 expectedBorrow
    ) internal view {
        console.log("\nVerifying final market state...");
        
        Id marketId = MarketParamsLib.id(marketParams);
        try IMorpho(morphoBlueCore).market(marketId) returns (Market memory market) {
            console.log("Final state:");
            console.log("- Supply assets:", market.totalSupplyAssets / 1e18);
            console.log("- Borrow assets:", market.totalBorrowAssets / 1e18);
            console.log("- Supply shares:", market.totalSupplyShares / 1e18);
            console.log("- Borrow shares:", market.totalBorrowShares / 1e18);
            
            // Calculate actual utilization
            uint256 actualUtilization = market.totalSupplyAssets > 0 
                ? (market.totalBorrowAssets * 100) / market.totalSupplyAssets 
                : 0;
            console.log("- Actual utilization:", actualUtilization, "%");
            
            // Check shares/assets ratio
            if (market.totalSupplyAssets > 0) {
                uint256 sharesAssetsRatio = (market.totalSupplyShares * 1e18) / market.totalSupplyAssets;
                console.log("- Shares/Assets ratio:", sharesAssetsRatio / 1e15, "x (should be ~1000)"); // Display as 1000 = 1.000x
                
                if (sharesAssetsRatio >= 9e17 && sharesAssetsRatio <= 11e17) { // 0.9x to 1.1x
                    console.log("[OK] Healthy shares/assets ratio");
                } else {
                    console.log("WARNING:  Unusual shares/assets ratio");
                }
            }
            
            // Verify amounts are close to expected
            uint256 supplyDiff = market.totalSupplyAssets > expectedSupply 
                ? market.totalSupplyAssets - expectedSupply 
                : expectedSupply - market.totalSupplyAssets;
            uint256 borrowDiff = market.totalBorrowAssets > expectedBorrow
                ? market.totalBorrowAssets - expectedBorrow
                : expectedBorrow - market.totalBorrowAssets;
                
            if (supplyDiff < expectedSupply / 100 && borrowDiff < expectedBorrow / 100) { // Within 1%
                console.log("[OK] Final amounts match expectations");
            } else {
                console.log("WARNING:  Final amounts differ from expectations");
            }
            
        } catch {
            console.log("[ERROR] Could not verify final market state");
        }
    }
}
