// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

/**
 * @title OracleFromAggregator
 * @notice Simple oracle that reads from a Chainlink-compatible aggregator and exposes the price function expected by Morpho Blue
 * @dev This is a demo implementation - for production use MorphoChainlinkOracleV2
 */
contract OracleFromAggregator {
    /// @notice The aggregator to read price data from
    AggregatorV3Interface public immutable aggregator;
    
    /// @notice Maximum allowed staleness for price data (in seconds)
    uint256 public immutable maxStaleness;
    
    /// @notice Decimals of the aggregator
    uint8 public immutable aggregatorDecimals;
    
    error StalePriceData();
    error InvalidPriceData();
    
    /**
     * @param _aggregator The Chainlink-compatible aggregator address
     * @param _maxStaleness Maximum age of price data in seconds (e.g., 3600 for 1 hour)
     */
    constructor(address _aggregator, uint256 _maxStaleness) {
        aggregator = AggregatorV3Interface(_aggregator);
        maxStaleness = _maxStaleness;
        aggregatorDecimals = aggregator.decimals();
    }
    
    /**
     * @notice Get the current price scaled to 36 decimals (Morpho Blue ORACLE_PRICE_SCALE)
     * @return price The price in 36 decimal format
     */
    function price() external view returns (uint256) {
        (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = aggregator.latestRoundData();
        
        // Validate the price data
        if (answer <= 0) revert InvalidPriceData();
        if (updatedAt == 0 || block.timestamp - updatedAt > maxStaleness) {
            revert StalePriceData();
        }
        if (roundId == 0 || answeredInRound < roundId) revert InvalidPriceData();
        
        // Scale to 36 decimals (Morpho Blue ORACLE_PRICE_SCALE)
        uint256 rawPrice = uint256(answer);
        
        if (aggregatorDecimals < 36) {
            // Scale up
            return rawPrice * (10 ** (36 - aggregatorDecimals));
        } else if (aggregatorDecimals > 36) {
            // Scale down
            return rawPrice / (10 ** (aggregatorDecimals - 36));
        } else {
            // Already 36 decimals
            return rawPrice;
        }
    }
    
    /**
     * @notice Get raw aggregator data for debugging
     */
    function getAggregatorData() external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound,
        uint8 decimals
    ) {
        (roundId, answer, startedAt, updatedAt, answeredInRound) = aggregator.latestRoundData();
        decimals = aggregatorDecimals;
    }
}
