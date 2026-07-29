# NexPay — Cross-Border Stablecoin Payments on Solana

## 🚀 Deployed Program
- **Network**: Solana Devnet
- **Program ID**: `REPLACE_AFTER_DEPLOY`
- **Explorer**: https://explorer.solana.com/address/PROGRAM_ID?cluster=devnet
- **Config PDA**: `REPLACE_AFTER_DEPLOY`
- **Deploy Tx**: `REPLACE_AFTER_DEPLOY`

## 📦 Stack
- Smart contract: Rust + Anchor 0.29
- Frontend: React + Vite + Tailwind CSS
- Wallet: Phantom / Solflare via @solana/wallet-adapter
- Token standard: SPL Token (USDC 6-decimal mint)

## 🛠 Setup

### Prerequisites
- Rust + Cargo (rustup.rs)
- Solana CLI 1.18+
- Anchor CLI 0.29+
- Node 20+ / Yarn

### Install
```bash
git clone https://github.com/YOUR_USERNAME/nexpay
cd nexpay
yarn install
```

### Build & Deploy Contract
```bash
cd programs
anchor build
./scripts/deploy.sh
# Copy the Program ID printed to console
# Paste into src/lib/solana.ts → PROGRAM_ID
```

### Create Test USDC Mint (devnet)
```bash
spl-token create-token --decimals 6
# Copy mint address → src/lib/solana.ts → USDC_MINT
spl-token create-account <MINT_ADDRESS>
spl-token mint <MINT_ADDRESS> 10000
```

### Run Frontend
```bash
cd ..
yarn dev
```

### Run Tests
```bash
anchor test
```

## 📋 Program Instructions
| Instruction | Description |
|---|---|
| initialize_platform | Admin setup, fee config |
| initialize_user | Register wallet as NexPay user |
| transfer_stablecoin | Send USDC with 0.1% fee via SPL |
| update_kyc_status | Admin: verify/unverify user |
| freeze_wallet | User or admin freeze |
| update_platform_fee | Admin: adjust fee |
| pause_platform | Emergency pause |

## 🔗 License
MIT
