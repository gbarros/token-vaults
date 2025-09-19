// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title FaucetERC20
 * @dev ERC20 token with a public faucet for testnet use
 */
contract FaucetERC20 is ERC20, Ownable {
    uint256 public maxMintPerCall = 1000 * 10**18; // 1000 tokens default
    uint256 public cooldownSeconds = 60; // 60 seconds default
    
    mapping(address => uint256) public lastMintTime;
    
    event FaucetMint(address indexed to, uint256 amount);
    event MaxMintPerCallUpdated(uint256 newAmount);
    event CooldownSecondsUpdated(uint256 newCooldown);
    
    constructor(
        string memory name,
        string memory symbol,
        address initialOwner
    ) ERC20(name, symbol) Ownable(initialOwner) {}
    
    /**
     * @dev Public faucet function with cooldown and per-call limits
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint (in wei)
     */
    function mint(address to, uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        require(amount <= maxMintPerCall, "Amount exceeds max mint per call");
        require(
            block.timestamp >= lastMintTime[msg.sender] + cooldownSeconds,
            "Cooldown period not elapsed"
        );
        
        lastMintTime[msg.sender] = block.timestamp;
        _mint(to, amount);
        
        emit FaucetMint(to, amount);
    }
    
    /**
     * @dev Owner function to set max mint per call
     * @param newAmount New maximum amount per call
     */
    function setMaxMintPerCall(uint256 newAmount) external onlyOwner {
        maxMintPerCall = newAmount;
        emit MaxMintPerCallUpdated(newAmount);
    }
    
    /**
     * @dev Owner function to set cooldown period
     * @param newCooldown New cooldown period in seconds
     */
    function setCooldownSeconds(uint256 newCooldown) external onlyOwner {
        cooldownSeconds = newCooldown;
        emit CooldownSecondsUpdated(newCooldown);
    }
    
    /**
     * @dev Check if an address can mint (cooldown elapsed)
     * @param account Address to check
     * @return bool Whether the address can mint
     */
    function canMint(address account) external view returns (bool) {
        return block.timestamp >= lastMintTime[account] + cooldownSeconds;
    }
    
    /**
     * @dev Get remaining cooldown time for an address
     * @param account Address to check
     * @return uint256 Remaining cooldown time in seconds (0 if can mint)
     */
    function remainingCooldown(address account) external view returns (uint256) {
        uint256 nextMintTime = lastMintTime[account] + cooldownSeconds;
        if (block.timestamp >= nextMintTime) {
            return 0;
        }
        return nextMintTime - block.timestamp;
    }
}
