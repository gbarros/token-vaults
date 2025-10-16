// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";

// MetaMorpho v1.1 interfaces
import {IMetaMorphoV1_1} from "metamorpho-v1.1/src/interfaces/IMetaMorphoV1_1.sol";
import {MarketParams, Id} from "metamorpho-v1.1/lib/morpho-blue/src/interfaces/IMorpho.sol";
import {MarketParamsLib} from "metamorpho-v1.1/lib/morpho-blue/src/libraries/MarketParamsLib.sol";

/**
 * @title SetSupplyQueue
 * @notice Helper script to set the supply queue for a vault
 * @dev Use this if vault was deployed without supply queue configuration
 * 
 * IMPORTANT: Supply queue is REQUIRED for deposits to work!
 * Without markets in the supply queue, maxDeposit() returns 0.
 * 
 * Usage:
 *   forge script script/SetSupplyQueue.s.sol --rpc-url eden --broadcast
 */
contract SetSupplyQueue is Script {
    using MarketParamsLib for MarketParams;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        // Load vault and market parameters from environment
        address vaultAddress = vm.envAddress("VAULT_ADDRESS");
        address loanToken = vm.envAddress("LOAN_TOKEN");
        address collateralToken = vm.envAddress("COLLATERAL_TOKEN");
        address oracle = vm.envAddress("ORACLE_ADDRESS");
        address irm = vm.envAddress("IRM_ADDRESS");
        uint256 lltv = vm.envUint("LLTV");

        console.log("Setting supply queue for vault:", vaultAddress);
        console.log("Deployer:", deployer);

        vm.startBroadcast(deployerPrivateKey);

        IMetaMorphoV1_1 vaultContract = IMetaMorphoV1_1(vaultAddress);

        MarketParams memory marketParams = MarketParams({
            loanToken: loanToken,
            collateralToken: collateralToken,
            oracle: oracle,
            irm: irm,
            lltv: lltv
        });

        // Create supply queue with our market
        Id[] memory supplyQueue = new Id[](1);
        supplyQueue[0] = marketParams.id();
        
        vaultContract.setSupplyQueue(supplyQueue);
        console.log("Supply queue set with 1 market");
        console.log("Market ID:", vm.toString(Id.unwrap(marketParams.id())));

        vm.stopBroadcast();

        console.log("=== Supply Queue Summary ===");
        console.log("Vault Address:", vaultAddress);
        console.log("Markets in Queue: 1");
        console.log("Deposits should now be enabled!");
    }
    
}

