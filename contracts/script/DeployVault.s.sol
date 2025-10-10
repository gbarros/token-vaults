// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

// MetaMorpho v1.1 interfaces
import {IMetaMorphoV1_1} from "metamorpho-v1.1/src/interfaces/IMetaMorphoV1_1.sol";
import {IMetaMorphoV1_1Factory} from "metamorpho-v1.1/src/interfaces/IMetaMorphoV1_1Factory.sol";
import {MarketParams, Id} from "metamorpho-v1.1/lib/morpho-blue/src/interfaces/IMorpho.sol";
import {MarketParamsLib} from "metamorpho-v1.1/lib/morpho-blue/src/libraries/MarketParamsLib.sol";

contract DeployVault is Script {
    using MarketParamsLib for MarketParams;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        // Load Morpho addresses from environment
        address metaMorphoFactory = vm.envAddress("METAMORPHO_FACTORY");
        
        console.log("Deploying MetaMorpho vault...");
        console.log("Deployer:", deployer);
        console.log("Factory:", metaMorphoFactory);
        
        // Load fakeUSD address from environment
        address fakeUSD = vm.envAddress("LOAN_TOKEN");
        console.log("Using fakeUSD as vault asset:", fakeUSD);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy MetaMorpho vault
        IMetaMorphoV1_1Factory factory = IMetaMorphoV1_1Factory(metaMorphoFactory);
        
        IMetaMorphoV1_1 vaultContract = factory.createMetaMorpho(
            deployer,           // owner
            0,                  // initialTimelock (0 for hackathon speed)
            fakeUSD,           // asset (fakeUSD token)
            "Morpho Demo Vault", // name
            "mdUSD",           // symbol
            keccak256(abi.encodePacked("morpho-demo-vault-v2", block.timestamp)) // salt for deterministic address
        );
        
        address vault = address(vaultContract);
        console.log("MetaMorpho vault deployed at:", vault);
        
        // Set curator (can manage markets and caps)
        vaultContract.setCurator(deployer);
        console.log("Curator set to:", deployer);
        
        // Set allocator (can reallocate funds)
        vaultContract.setIsAllocator(deployer, true);
        console.log("Allocator set to:", deployer);
        
        // Note: Guardian can be set separately after deployment if needed
        console.log("Guardian not set - can be configured later");
        
        // Configure vault with market and supply cap
        console.log("\nConfiguring vault with market...");
        address collateralToken = vm.envAddress("COLLATERAL_TOKEN");
        address oracle = vm.envAddress("ORACLE_ADDRESS");
        address irm = vm.envAddress("IRM_ADDRESS");
        uint256 lltv = vm.envUint("LLTV");
        
        MarketParams memory marketParams = MarketParams({
            loanToken: fakeUSD,
            collateralToken: collateralToken,
            oracle: oracle,
            irm: irm,
            lltv: lltv
        });
        
        // Set unlimited supply cap for the market
        uint184 supplyCap = type(uint184).max; // Unlimited
        vaultContract.submitCap(marketParams, supplyCap);
        console.log("Supply cap submitted (pending)");
        
        // Accept the cap immediately (timelock is 0 for hackathon speed)
        vaultContract.acceptCap(marketParams);
        console.log("Supply cap accepted - market configured with unlimited supply cap");
        
        // CRITICAL: Add market to supply queue to enable deposits
        // Note: acceptCap adds to withdraw queue, but supply queue must be set separately
        Id[] memory supplyQueue = new Id[](1);
        supplyQueue[0] = marketParams.id();
        vaultContract.setSupplyQueue(supplyQueue);
        console.log("Market added to supply queue - vault can now accept deposits");
        
        vm.stopBroadcast();
        
        console.log("=== Deployment Summary ===");
        console.log("Vault Address:", vault);
        console.log("Asset (fakeUSD):", fakeUSD);
        console.log("Owner/Curator/Allocator:", deployer);
        console.log("Timelock: 0");
        console.log("Supply Queue: 1 market configured");
    }
    
}
