// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";

// Minimal interface for Morpho Chainlink Oracle V2 Factory
// TODO: Replace with official import when morpho-oracles package is available
interface IMorphoChainlinkOracleV2Factory {
    function createMorphoChainlinkOracleV2(
        address baseVault,
        uint256 baseVaultDecimals,
        address baseFeed1,
        address baseFeed2,
        uint256 baseTokenDecimals,
        address quoteVault,
        uint256 quoteVaultDecimals,
        address quoteFeed1,
        address quoteFeed2,
        uint256 quoteTokenDecimals,
        bytes32 salt
    ) external returns (address oracle);
}

contract BuildMorphoOracleScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address factoryAddress = vm.envAddress("MORPHO_ORACLE_FACTORY");
        address aggregatorAddress = vm.envAddress("AGGREGATOR_ADDRESS");
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("Building Morpho Chainlink Oracle...");
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        console.log("Factory:", factoryAddress);
        console.log("Aggregator:", aggregatorAddress);
        
        // Parameters for createMorphoChainlinkOracleV2:
        // - baseVault: zero address (no vault)
        // - baseVaultDecimals: 0
        // - baseFeed1: our aggregator (fakeTIA price)
        // - baseFeed2: zero address (no second feed)
        // - baseTokenDecimals: 18 (fakeTIA decimals)
        // - quoteVault: zero address (no vault)
        // - quoteVaultDecimals: 0
        // - quoteFeed1: zero address (fakeUSD is the quote, so no feed needed)
        // - quoteFeed2: zero address
        // - quoteTokenDecimals: 18 (fakeUSD decimals)
        // - salt: deterministic salt for testing
        
        bytes32 salt = keccak256("MorphoVaultsDemo");
        
        IMorphoChainlinkOracleV2Factory factory = IMorphoChainlinkOracleV2Factory(factoryAddress);
        
        address oracle = factory.createMorphoChainlinkOracleV2(
            address(0), // baseVault
            0, // baseVaultDecimals
            aggregatorAddress, // baseFeed1 (our aggregator)
            address(0), // baseFeed2
            18, // baseTokenDecimals (fakeTIA)
            address(0), // quoteVault
            0, // quoteVaultDecimals
            address(0), // quoteFeed1 (fakeUSD is quote)
            address(0), // quoteFeed2
            18, // quoteTokenDecimals (fakeUSD)
            salt
        );
        
        console.log("Morpho Oracle created at:", oracle);
        
        vm.stopBroadcast();
        
        // Log deployment info
        console.log("\n=== MORPHO ORACLE CREATION SUMMARY ===");
        console.log("Oracle Address:", oracle);
        console.log("Factory:", factoryAddress);
        console.log("Aggregator Source:", aggregatorAddress);
        console.log("Salt:", vm.toString(salt));
        console.log("=====================================");
    }
}
