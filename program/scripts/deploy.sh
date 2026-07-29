#!/bin/bash
set -e
echo "Switching to devnet..."
solana config set --url devnet
echo "Requesting airdrop..."
solana airdrop 2
echo "Building program..."
anchor build
echo "Deploying to devnet..."
anchor deploy
echo "Running initialize_platform instruction..."
npx ts-node scripts/initialize.ts
echo "Done. Copy the program ID from above into README.md"
