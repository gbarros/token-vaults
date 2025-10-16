#!/bin/bash
# Bot Orchestration Script
# Runs all enabled bot types in background
#
# Usage: npm run bots:all
# Stop: pkill -f 'tsx scripts/bots'

cd "$(dirname "$0")/../.."  # Navigate to ops/ root

echo "🤖 Starting Bot Simulation System..."
echo ""

# Setup wallets if needed
if [ ! -f "temp/bot-wallets.json" ]; then
  echo "⚠️  Wallets not found. Running setup..."
  npm run bots:setup
  echo ""
fi

# Create logs directory if it doesn't exist
mkdir -p logs

# Start each bot type in background
echo "Launching bot processes..."
echo ""

npm run bots:lenders > logs/lenders.log 2>&1 &
LENDER_PID=$!
echo "✅ Lenders started (PID: $LENDER_PID)"

npm run bots:borrowers > logs/borrowers.log 2>&1 &
BORROWER_PID=$!
echo "✅ Borrowers started (PID: $BORROWER_PID)"

npm run bots:vault:users > logs/vault-users.log 2>&1 &
VAULT_PID=$!
echo "✅ Vault Users started (PID: $VAULT_PID)"

npm run bots:oracle > logs/oracle.log 2>&1 &
ORACLE_PID=$!
echo "✅ Oracle started (PID: $ORACLE_PID)"

npm run bots:liquidators > logs/liquidators.log 2>&1 &
LIQ_PID=$!
echo "✅ Liquidators started (PID: $LIQ_PID)"

echo ""
echo "🎉 All bots running!"
echo ""
echo "📁 Logs: ops/logs/"
echo "   - lenders.log"
echo "   - borrowers.log"
echo "   - vault-users.log"
echo "   - oracle.log"
echo "   - liquidators.log"
echo ""
echo "To stop all bots:"
echo "  kill $LENDER_PID $BORROWER_PID $VAULT_PID $ORACLE_PID $LIQ_PID"
echo "Or:"
echo "  pkill -f 'tsx scripts/bots'"
echo ""
echo "To view logs:"
echo "  tail -f ops/logs/lenders.log"
echo "  tail -f ops/logs/borrowers.log"
echo "  # etc..."
echo ""

# Keep script running, forward signals to child processes
trap "echo 'Stopping bots...'; kill $LENDER_PID $BORROWER_PID $VAULT_PID $ORACLE_PID $LIQ_PID 2>/dev/null; exit" SIGINT SIGTERM

wait

