// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {IMorphoBase, MarketParams} from "@morpho-blue/interfaces/IMorpho.sol";

contract CreateMarketScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        // Environment variables for market parameters
        address morphoBlueCore = vm.envAddress("MORPHO_BLUE_CORE");
        address loanToken = vm.envAddress("LOAN_TOKEN");
        address collateralToken = vm.envAddress("COLLATERAL_TOKEN");
        address oracle = vm.envAddress("ORACLE_ADDRESS");
        address irm = vm.envAddress("IRM_ADDRESS");
        uint256 lltv = vm.envUint("LLTV");
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("Creating Morpho Blue sandbox market...");
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        console.log("Morpho Blue:", morphoBlueCore);
        console.log("Loan Token:", loanToken);
        console.log("Collateral Token:", collateralToken);
        console.log("Oracle:", oracle);
        console.log("IRM:", irm);
        console.log("LLTV:", lltv);
        console.log("LLTV Percentage:", (lltv * 100) / 1e18);
        
        // Create market parameters
        MarketParams memory marketParams = MarketParams({
            loanToken: loanToken,
            collateralToken: collateralToken,
            oracle: oracle,
            irm: irm,
            lltv: lltv
        });
        
        // Compute market ID (same as TypeScript version)
        bytes32 marketId = keccak256(abi.encode(marketParams));
        console.log("Computed Market ID:", vm.toString(marketId));
        
        // Create the market
        IMorphoBase morpho = IMorphoBase(morphoBlueCore);
        morpho.createMarket(marketParams);
        
        console.log("Market created successfully!");
        console.log("Market ID:", vm.toString(marketId));
        
        vm.stopBroadcast();
        
        // Log deployment info
        console.log("\n=== MARKET CREATION SUMMARY ===");
        console.log("Market ID:", vm.toString(marketId));
        console.log("Loan Token:", loanToken);
        console.log("Collateral Token:", collateralToken);
        console.log("Oracle:", oracle);
        console.log("IRM:", irm);
        console.log("LLTV:", lltv);
        console.log("===============================");
    }
}
