// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {IMorpho, MarketParams, Market, Position, Id} from "@morpho-blue/interfaces/IMorpho.sol";
import {MarketParamsLib} from "@morpho-blue/libraries/MarketParamsLib.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IIrm} from "@morpho-blue/interfaces/IIrm.sol";

/// @title AnalyzeAndInitializeScript
/// @notice Comprehensive script to analyze market state and initialize with optimal parameters
/// @dev This script analyzes the current market, suggests improvements, and can auto-fix issues
contract AnalyzeAndInitializeScript is Script {
    
    struct MarketAnalysis {
        bool isEmpty;
        bool hasAbnormalRatio;
        uint256 currentUtilization;
        uint256 sharesAssetsRatio; // scaled by 1e18 (1e18 = 1.0x)
        uint256 estimatedBorrowRate;
        bool needsReset;
        string recommendation;
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
        
        // Get auto-fix flag (default false)
        bool autoFix = vm.envOr("AUTO_FIX", false);
        
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("=== MARKET ANALYSIS & INITIALIZATION ===");
        console.log("Deployer:", deployer);
        console.log("Auto-fix enabled:", autoFix);
        
        // Create market parameters
        MarketParams memory marketParams = MarketParams({
            loanToken: loanToken,
            collateralToken: collateralToken,
            oracle: oracle,
            irm: irm,
            lltv: lltv
        });
        
        // Analyze current market state
        MarketAnalysis memory analysis = _analyzeMarket(morphoBlueCore, marketParams);
        
        // Display analysis results
        _displayAnalysis(analysis);
        
        // Execute recommendations
        if (autoFix) {
            _executeRecommendations(morphoBlueCore, marketParams, deployer, deployerPrivateKey, analysis);
        } else {
            console.log("\nTIP: To auto-execute recommendations, set AUTO_FIX=true");
            console.log("TIP: Or run the suggested scripts manually");
        }
        
        console.log("\n=== ANALYSIS COMPLETE ===");
    }
    
    function _analyzeMarket(address morphoBlueCore, MarketParams memory marketParams) 
        internal view returns (MarketAnalysis memory analysis) {
        
        console.log("\nANALYZING: Analyzing market state...");
        
        Id marketId = MarketParamsLib.id(marketParams);
        Market memory market = IMorpho(morphoBlueCore).market(marketId);
        
        // Check if market is empty
        analysis.isEmpty = (market.totalSupplyAssets == 0 && market.totalBorrowAssets == 0);
        
        if (!analysis.isEmpty) {
            // Calculate utilization
            analysis.currentUtilization = market.totalSupplyAssets > 0 
                ? (market.totalBorrowAssets * 100) / market.totalSupplyAssets 
                : 0;
            
            // Calculate shares/assets ratio
            analysis.sharesAssetsRatio = market.totalSupplyAssets > 0 
                ? (market.totalSupplyShares * 1e18) / market.totalSupplyAssets 
                : 1e18;
            
            // Check for abnormal ratio (should be close to 1e18)
            analysis.hasAbnormalRatio = (analysis.sharesAssetsRatio < 5e17 || analysis.sharesAssetsRatio > 2e18);
            
            // Try to get borrow rate from IRM
            try IIrm(marketParams.irm).borrowRateView(marketParams, market) returns (uint256 borrowRate) {
                analysis.estimatedBorrowRate = borrowRate;
            } catch {
                analysis.estimatedBorrowRate = 0;
            }
        }
        
        // Determine recommendations
        if (analysis.isEmpty) {
            analysis.recommendation = "INITIALIZE_FRESH";
        } else if (analysis.hasAbnormalRatio) {
            analysis.needsReset = true;
            analysis.recommendation = "RESET_AND_REINITIALIZE";
        } else if (analysis.currentUtilization < 10) {
            analysis.recommendation = "INCREASE_UTILIZATION";
        } else if (analysis.currentUtilization > 90) {
            analysis.recommendation = "DECREASE_UTILIZATION";
        } else {
            analysis.recommendation = "MARKET_HEALTHY";
        }
    }
    
    function _displayAnalysis(MarketAnalysis memory analysis) internal view {
        console.log("\nANALYSIS: MARKET ANALYSIS RESULTS:");
        console.log("================================");
        
        if (analysis.isEmpty) {
            console.log("[OK] Market Status: EMPTY - Ready for initialization");
        } else {
            console.log("STATUS: Market Status: ACTIVE");
            console.log("   Current Utilization:", analysis.currentUtilization, "%");
            console.log("   Shares/Assets Ratio:", analysis.sharesAssetsRatio / 1e15, "x"); // Display as 1000 = 1.000x
            
            if (analysis.hasAbnormalRatio) {
                console.log("   WARNING:  ABNORMAL RATIO DETECTED!");
                console.log("   Expected: ~1.000x, Actual:", analysis.sharesAssetsRatio / 1e15, "x");
            } else {
                console.log("   [OK] Healthy shares/assets ratio");
            }
            
            if (analysis.estimatedBorrowRate > 0) {
                console.log("   Estimated Borrow APR:", (analysis.estimatedBorrowRate * 100) / 1e18, "%");
            } else {
                console.log("   WARNING:  Could not calculate borrow rate");
            }
        }
        
        console.log("\nRECOMMENDATION: RECOMMENDATION:", analysis.recommendation);
        
        // Provide specific guidance
        if (keccak256(bytes(analysis.recommendation)) == keccak256("INITIALIZE_FRESH")) {
            console.log("   -> Run: InitializeUtilizationImproved.s.sol");
            console.log("   -> Suggested scenario: MEDIUM_UTILIZATION");
        } else if (keccak256(bytes(analysis.recommendation)) == keccak256("RESET_AND_REINITIALIZE")) {
            console.log("   -> Step 1: Run ResetMarket.s.sol");
            console.log("   -> Step 2: Run InitializeUtilizationImproved.s.sol");
            console.log("   -> This will fix the abnormal shares/assets ratio");
        } else if (keccak256(bytes(analysis.recommendation)) == keccak256("INCREASE_UTILIZATION")) {
            console.log("   -> Add more borrowing activity");
            console.log("   -> Run TestBorrowing.s.sol or supply more collateral and borrow");
        } else if (keccak256(bytes(analysis.recommendation)) == keccak256("DECREASE_UTILIZATION")) {
            console.log("   -> Add more supply or repay some borrows");
            console.log("   -> Market is highly utilized - consider adding liquidity");
        } else {
            console.log("   -> Market is in good condition");
            console.log("   -> No immediate action needed");
        }
    }
    
    function _executeRecommendations(
        address morphoBlueCore,
        MarketParams memory marketParams,
        address deployer,
        uint256 deployerPrivateKey,
        MarketAnalysis memory analysis
    ) internal {
        console.log("\nEXECUTING: EXECUTING RECOMMENDATIONS...");
        
        if (keccak256(bytes(analysis.recommendation)) == keccak256("INITIALIZE_FRESH")) {
            console.log("Initializing fresh market...");
            _initializeFreshMarket(morphoBlueCore, marketParams, deployer, deployerPrivateKey);
            
        } else if (keccak256(bytes(analysis.recommendation)) == keccak256("RESET_AND_REINITIALIZE")) {
            console.log("Resetting and reinitializing market...");
            _resetAndReinitialize(morphoBlueCore, marketParams, deployer, deployerPrivateKey);
            
        } else if (keccak256(bytes(analysis.recommendation)) == keccak256("INCREASE_UTILIZATION")) {
            console.log("Increasing utilization...");
            _increaseUtilization(morphoBlueCore, marketParams, deployer, deployerPrivateKey);
            
        } else {
            console.log("No automatic action available for this recommendation");
            console.log("Please follow the manual steps suggested above");
        }
    }
    
    function _initializeFreshMarket(
        address morphoBlueCore,
        MarketParams memory marketParams,
        address deployer,
        uint256 deployerPrivateKey
    ) internal {
        // Use medium utilization scenario
        uint256 supplyAmount = 1000e18;   // 1000 tokens
        uint256 collateralAmount = 800e18; // 800 tokens  
        uint256 borrowAmount = 600e18;     // 600 tokens (60% utilization)
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Approve and execute
        IERC20(marketParams.loanToken).approve(morphoBlueCore, supplyAmount);
        IERC20(marketParams.collateralToken).approve(morphoBlueCore, collateralAmount);
        
        IMorpho(morphoBlueCore).supply(marketParams, supplyAmount, 0, deployer, "");
        IMorpho(morphoBlueCore).supplyCollateral(marketParams, collateralAmount, deployer, "");
        IMorpho(morphoBlueCore).borrow(marketParams, borrowAmount, 0, deployer, deployer);
        
        vm.stopBroadcast();
        
        console.log("[OK] Fresh market initialized successfully");
    }
    
    function _resetAndReinitialize(
        address morphoBlueCore,
        MarketParams memory marketParams,
        address deployer,
        uint256 deployerPrivateKey
    ) internal {
        console.log("WARNING:  Reset and reinitialize requires manual intervention");
        console.log("   Please run ResetMarket.s.sol first, then InitializeUtilizationImproved.s.sol");
        console.log("   This ensures proper cleanup of abnormal market state");
    }
    
    function _increaseUtilization(
        address morphoBlueCore,
        MarketParams memory marketParams,
        address deployer,
        uint256 deployerPrivateKey
    ) internal {
        Id marketId = MarketParamsLib.id(marketParams);
        Market memory market = IMorpho(morphoBlueCore).market(marketId);
        
        // Calculate additional borrow needed for 60% utilization
        uint256 targetBorrow = (market.totalSupplyAssets * 60) / 100;
        uint256 additionalBorrow = targetBorrow > market.totalBorrowAssets 
            ? targetBorrow - market.totalBorrowAssets 
            : 0;
        
        if (additionalBorrow > 0) {
            // Need additional collateral for the borrow
            uint256 additionalCollateral = (additionalBorrow * 120) / 100; // 20% buffer
            
            vm.startBroadcast(deployerPrivateKey);
            
            IERC20(marketParams.collateralToken).approve(morphoBlueCore, additionalCollateral);
            IMorpho(morphoBlueCore).supplyCollateral(marketParams, additionalCollateral, deployer, "");
            IMorpho(morphoBlueCore).borrow(marketParams, additionalBorrow, 0, deployer, deployer);
            
            vm.stopBroadcast();
            
            console.log("[OK] Utilization increased successfully");
        } else {
            console.log("INFO:  No additional borrowing needed");
        }
    }
}
