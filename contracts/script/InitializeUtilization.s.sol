// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {IMorphoBase, MarketParams} from "@morpho-blue/interfaces/IMorpho.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract InitializeUtilizationScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        // Environment variables
        address morphoBlueCore = vm.envAddress("MORPHO_BLUE_CORE");
        address loanToken = vm.envAddress("LOAN_TOKEN");
        address collateralToken = vm.envAddress("COLLATERAL_TOKEN");
        address oracle = vm.envAddress("ORACLE_ADDRESS");
        address irm = vm.envAddress("IRM_ADDRESS");
        uint256 lltv = vm.envUint("LLTV");
        
        // Amounts for initialization
        uint256 supplyAmount = 100e18; // 100 fakeUSD
        uint256 collateralAmount = 50e18; // 50 fakeTIA
        uint256 borrowAmount = 60e18; // 60 fakeUSD (60% utilization)
        
        address deployer = vm.addr(deployerPrivateKey);
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("Initializing market utilization...");
        console.log("Deployer:", deployer);
        console.log("Target utilization: ~60%");
        
        // Create market parameters
        MarketParams memory marketParams = MarketParams({
            loanToken: loanToken,
            collateralToken: collateralToken,
            oracle: oracle,
            irm: irm,
            lltv: lltv
        });
        
        // Check balances
        uint256 loanBalance = IERC20(loanToken).balanceOf(deployer);
        uint256 collateralBalance = IERC20(collateralToken).balanceOf(deployer);
        console.log("Loan token balance:", loanBalance / 1e18);
        console.log("Collateral token balance:", collateralBalance / 1e18);
        
        require(loanBalance >= supplyAmount, "Insufficient loan token balance");
        require(collateralBalance >= collateralAmount, "Insufficient collateral token balance");
        
        // Step 1: Approve tokens
        console.log("Step 1: Approving tokens...");
        IERC20(loanToken).approve(morphoBlueCore, supplyAmount);
        IERC20(collateralToken).approve(morphoBlueCore, collateralAmount);
        
        // Step 2: Supply liquidity
        console.log("Step 2: Supplying", supplyAmount / 1e18, "loan tokens...");
        IMorphoBase(morphoBlueCore).supply(marketParams, supplyAmount, 0, deployer, "");
        
        // Step 3: Supply collateral
        console.log("Step 3: Supplying", collateralAmount / 1e18, "collateral tokens...");
        IMorphoBase(morphoBlueCore).supplyCollateral(marketParams, collateralAmount, deployer, "");
        
        // Step 4: Borrow to create utilization
        console.log("Step 4: Borrowing", borrowAmount / 1e18, "loan tokens...");
        IMorphoBase(morphoBlueCore).borrow(marketParams, borrowAmount, 0, deployer, deployer);
        
        vm.stopBroadcast();
        
        // Log final state
        console.log("\n=== UTILIZATION INITIALIZATION COMPLETE ===");
        console.log("Supplied:", supplyAmount / 1e18, "loan tokens");
        console.log("Collateral:", collateralAmount / 1e18, "collateral tokens");
        console.log("Borrowed:", borrowAmount / 1e18, "loan tokens");
        console.log("Utilization:", (borrowAmount * 100) / supplyAmount, "%");
        console.log("==========================================");
    }
}
