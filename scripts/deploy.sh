#!/bin/bash
set -e

echo "========================================"
echo "  NexPay — Solana Devnet Deployment"
echo "========================================"

# Step 1: Check tools
if ! command -v solana &> /dev/null; then
  echo "ERROR: Solana CLI not found."
  echo "Install: https://docs.solana.com/cli/install-solana-cli-tools"
  exit 1
fi

if ! command -v anchor &> /dev/null; then
  echo "ERROR: Anchor CLI not found."
  echo "Install: cargo install --git https://github.com/coral-xyz/anchor anchor-cli --locked"
  exit 1
fi

# Step 2: Set devnet
solana config set --url devnet
echo "Network set to devnet"

# Step 3: Airdrop
echo "Requesting SOL airdrop..."
solana airdrop 2 || echo "Airdrop failed, continuing..."

# Step 4: Build
cd program
echo "Building Anchor program..."
anchor build

# Step 5: Deploy
echo "Deploying to devnet..."
DEPLOY_OUTPUT=$(anchor deploy --provider.cluster devnet 2>&1)
echo "$DEPLOY_OUTPUT"

# Step 6: Extract Program ID
PROGRAM_ID=$(echo "$DEPLOY_OUTPUT" | grep "Program Id:" | awk '{print $3}')

if [ -z "$PROGRAM_ID" ]; then
  echo "ERROR: Could not extract Program ID. Check deploy output above."
  exit 1
fi

echo ""
echo "========================================"
echo "  DEPLOYED SUCCESSFULLY"
echo "  Program ID: $PROGRAM_ID"
echo "  Explorer: https://explorer.solana.com/address/$PROGRAM_ID?cluster=devnet"
echo "========================================"

# Step 7: Update Program ID in all files
cd ..
sed -i "s/11111111111111111111111111111111/$PROGRAM_ID/g" program/src/lib.rs
sed -i "s/11111111111111111111111111111111/$PROGRAM_ID/g" program/Anchor.toml
sed -i "s/11111111111111111111111111111111/$PROGRAM_ID/g" app/idl/nexpay.json
sed -i "s/11111111111111111111111111111111/$PROGRAM_ID/g" app/utils/solana.js

echo "Program ID updated in all files."

# Step 8: Rebuild with correct ID
cd program
anchor build
echo "Rebuild complete."

echo ""
echo "NEXT STEPS:"
echo "1. Copy this Program ID: $PROGRAM_ID"
echo "2. Paste it into README.md under Contract Deployment"
echo "3. Run: git add . && git commit -m 'Deploy to devnet: $PROGRAM_ID' && git push"
