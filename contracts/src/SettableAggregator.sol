// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SettableAggregator
 * @dev AggregatorV3Interface implementation for testing
 * Allows owner to set price data for oracle testing
 */
contract SettableAggregator is Ownable {
    uint8 public immutable decimals;
    string public description;
    uint256 public version = 1;
    
    struct RoundData {
        int256 answer;
        uint256 startedAt;
        uint256 updatedAt;
        uint80 answeredInRound;
    }
    
    mapping(uint80 => RoundData) public rounds;
    uint80 public latestRound;
    
    event AnswerUpdated(int256 indexed current, uint256 indexed roundId, uint256 updatedAt);
    
    constructor(
        uint8 _decimals,
        string memory _description,
        address initialOwner
    ) Ownable(initialOwner) {
        decimals = _decimals;
        description = _description;
    }
    
    /**
     * @dev Set answer for a specific round
     * @param answer The price answer
     * @param roundId The round ID (auto-increment if 0)
     * @param updatedAt Timestamp (use current if 0)
     */
    function setAnswer(
        int256 answer,
        uint80 roundId,
        uint256 updatedAt
    ) external onlyOwner {
        if (roundId == 0) {
            latestRound++;
            roundId = latestRound;
        } else {
            require(roundId > latestRound, "Round ID must be greater than latest");
            latestRound = roundId;
        }
        
        if (updatedAt == 0) {
            updatedAt = block.timestamp;
        }
        
        rounds[roundId] = RoundData({
            answer: answer,
            startedAt: updatedAt,
            updatedAt: updatedAt,
            answeredInRound: roundId
        });
        
        emit AnswerUpdated(answer, roundId, updatedAt);
    }
    
    /**
     * @dev Get data for a specific round
     */
    function getRoundData(uint80 _roundId)
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        RoundData memory round = rounds[_roundId];
        require(round.updatedAt > 0, "No data present");
        
        return (
            _roundId,
            round.answer,
            round.startedAt,
            round.updatedAt,
            round.answeredInRound
        );
    }
    
    /**
     * @dev Get latest round data
     */
    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        require(latestRound > 0, "No data present");
        return this.getRoundData(latestRound);
    }
    
    /**
     * @dev Get latest answer
     */
    function latestAnswer() external view returns (int256) {
        require(latestRound > 0, "No data present");
        return rounds[latestRound].answer;
    }
    
    /**
     * @dev Get latest timestamp
     */
    function latestTimestamp() external view returns (uint256) {
        require(latestRound > 0, "No data present");
        return rounds[latestRound].updatedAt;
    }
}
