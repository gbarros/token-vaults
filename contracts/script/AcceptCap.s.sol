// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";

// MetaMorpho v1.1 interfaces
import {IMetaMorphoV1_1} from "metamorpho-v1.1/src/interfaces/IMetaMorphoV1_1.sol";
import {MarketParams} from "metamorpho-v1.1/lib/morpho-blue/src/interfaces/IMorpho.sol";

/**
 * @title AcceptCap
 * @notice Helper script to accept pending supply cap for a vault
 * @dev Use this if DeployVault was run but acceptCap() wasn't called
 * 
 * Usage:
 *   forge script script/AcceptCap.s.sol --rpc-url eden --broadcast
 */
contract AcceptCap is Script {
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        // Load vault and market configuration from environment
        address vaultAddress = vm.envAddress("VAULT_ADDRESS");
        address loanToken = vm.envAddress("LOAN_TOKEN");
        address collateralToken = vm.envAddress("COLLATERAL_TOKEN");
        address oracle = vm.envAddress("ORACLE_ADDRESS");
        address irm = vm.envAddress("IRM_ADDRESS");
        uint256 lltv = vm.envUint("LLTV");
        
        console.log("Accepting pending supply cap...");
        console.log("Vault:", vaultAddress);
        
        MarketParams memory marketParams = MarketParams({
            loanToken: loanToken,
            collateralToken: collateralToken,
            oracle: oracle,
            irm: irm,
            lltv: lltv
        });
        
        vm.startBroadcast(deployerPrivateKey);
        
        IMetaMorphoV1_1 vaultContract = IMetaMorphoV1_1(vaultAddress);
        
        // Accept the pending cap
        vaultContract.acceptCap(marketParams);
        console.log("Supply cap accepted successfully!");
        
        vm.stopBroadcast();
        
        console.log("=== Success ===");
        console.log("The vault now has an active supply cap for the market");
    }
    
}
