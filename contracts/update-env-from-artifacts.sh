#!/bin/bash

# Auto-update .env file from Forge deployment artifacts
# This eliminates manual address management

set -e

ENV_FILE=".env"
BROADCAST_DIR="broadcast"

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ .env file not found. Copy from env.example first."
    exit 1
fi

echo "🔄 Updating .env from deployment artifacts..."

# Function to extract contract address from latest broadcast
extract_address() {
    local script_name=$1
    local contract_name=$2
    local artifact_file="$BROADCAST_DIR/$script_name/11155111/run-latest.json"
    
    if [ -f "$artifact_file" ]; then
        # Extract address using jq (or grep if jq not available)
        if command -v jq &> /dev/null; then
            address=$(jq -r ".transactions[] | select(.contractName == \"$contract_name\") | .contractAddress" "$artifact_file")
        else
            # Fallback to grep - extract all matching addresses
            address=$(grep -A 5 "\"contractName\": \"$contract_name\"" "$artifact_file" | grep "contractAddress" | sed 's/.*"contractAddress": "\([^"]*\)".*/\1/')
        fi
        
        if [ "$address" != "null" ] && [ -n "$address" ]; then
            echo "$address"
        fi
    fi
}

# Function to update env variable
update_env_var() {
    local var_name=$1
    local new_value=$2
    
    if [ -n "$new_value" ] && [ "$new_value" != "" ]; then
        # Clean the value (remove any newlines)
        new_value=$(echo "$new_value" | tr -d '\n\r')
        
        # Update or add the variable
        if grep -q "^${var_name}=" "$ENV_FILE"; then
            # Update existing (use different delimiter to avoid issues)
            sed -i.bak "s#^${var_name}=.*#${var_name}=${new_value}#" "$ENV_FILE"
            echo "✅ Updated $var_name=$new_value"
        else
            # Add new
            echo "${var_name}=${new_value}" >> "$ENV_FILE"
            echo "✅ Added $var_name=$new_value"
        fi
    else
        echo "⚠️  No deployment found for $var_name"
    fi
}

# Extract addresses from deployment artifacts
echo "📋 Extracting addresses from broadcast artifacts..."

# Tokens from DeployTokens.s.sol (extract both FaucetERC20 deployments)
TOKEN_ADDRESSES=$(extract_address "DeployTokens.s.sol" "FaucetERC20")
FAKE_USD=$(echo "$TOKEN_ADDRESSES" | sed -n '1p')
FAKE_TIA=$(echo "$TOKEN_ADDRESSES" | sed -n '2p')

# Aggregator from DeployAggregator.s.sol
AGGREGATOR=$(extract_address "DeployAggregator.s.sol" "SettableAggregator" | head -1)

# Oracle from DeployOracle.s.sol
ORACLE=$(extract_address "DeployOracle.s.sol" "OracleFromAggregator" | head -1)

# Update .env file
echo ""
echo "📝 Updating .env file..."

update_env_var "LOAN_TOKEN" "$FAKE_USD"
update_env_var "COLLATERAL_TOKEN" "$FAKE_TIA"
update_env_var "AGGREGATOR_ADDRESS" "$AGGREGATOR"
update_env_var "ORACLE_ADDRESS" "$ORACLE"

# Clean up backup
rm -f "${ENV_FILE}.bak"

echo ""
echo "🎉 Environment updated successfully!"
echo ""
echo "📋 Current addresses:"
echo "  LOAN_TOKEN (fakeUSD): $FAKE_USD"
echo "  COLLATERAL_TOKEN (fakeTIA): $FAKE_TIA"
echo "  AGGREGATOR_ADDRESS: $AGGREGATOR"
echo "  ORACLE_ADDRESS: $ORACLE"
echo ""
echo "💡 Run this script after each deployment to keep .env in sync!"
