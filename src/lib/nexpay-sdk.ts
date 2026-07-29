import { PublicKey, SystemProgram } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import {
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAccount,
} from "@solana/spl-token";
import { getProgram, getUserPDA, getTransferPDA, getConfigPDA, USDC_MINT, connection } from "./solana";

// --- Register User ---
export async function initializeUser(
  wallet: any,
  username: string,
  referralCode: string = ""
): Promise<string> {
  const program = getProgram(wallet);
  
  // MOCK MODE: If the IDL is empty or smart contract is not yet deployed
  if (!program.methods || !program.methods.initializeUser) {
    console.warn("Smart Contract not fully deployed. Mocking initializeUser transaction.");
    return new Promise(resolve => setTimeout(() => resolve("mock_tx_signature_user_init_" + Date.now()), 1500));
  }

  const [userPDA] = getUserPDA(wallet.publicKey);
  const [configPDA] = getConfigPDA();

  const tx = await program.methods
    .initializeUser(username, referralCode)
    .accounts({
      user: wallet.publicKey,
      userAccount: userPDA,
      platformConfig: configPDA,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return tx; // return signature for explorer link
}

// --- Fetch User Account ---
export async function fetchUserAccount(wallet: any): Promise<any | null> {
  const program = getProgram(wallet);

  if (!program.account || !program.account.userAccount) {
    // If not deployed, we just return null to force them through onboarding
    return null;
  }

  const [userPDA] = getUserPDA(wallet.publicKey);
  try {
    return await program.account.userAccount.fetch(userPDA);
  } catch {
    return null; // account doesn't exist yet
  }
}

// --- Send USDC ---
export async function transferStablecoin(
  wallet: any,
  recipientPubkey: PublicKey,
  amountUsdc: number,       // human-readable USDC amount e.g. 50.5
  recipientCountry: string,
  memo: string
): Promise<{ signature: string; fee: number; netAmount: number }> {
  const amountMicro = new BN(Math.round(amountUsdc * 1_000_000));
  const feeMicro = amountMicro.muln(10).divn(10000); // 0.1%
  const netMicro = amountMicro.sub(feeMicro);

  const program = getProgram(wallet);
  
  if (!program.methods || !program.methods.transferStablecoin) {
    console.warn("Smart Contract not fully deployed. Mocking transfer transaction.");
    return new Promise(resolve => setTimeout(() => resolve({
      signature: "mock_tx_signature_transfer_" + Date.now(),
      fee: feeMicro.toNumber() / 1_000_000,
      netAmount: netMicro.toNumber() / 1_000_000,
    }), 1500));
  }

  const [senderPDA] = getUserPDA(wallet.publicKey);
  const [recipientPDA] = getUserPDA(recipientPubkey);
  const [configPDA] = getConfigPDA();
  
  let senderUserAccount;
  try {
    senderUserAccount = await program.account.userAccount.fetch(senderPDA);
  } catch (e) {
    throw new Error("Sender account not found. Please complete KYC.");
  }
  
  const [transferRecordPDA] = getTransferPDA(wallet.publicKey, senderUserAccount.transferCount);

  const senderTokenAccount = await getAssociatedTokenAddress(USDC_MINT, wallet.publicKey);
  const recipientTokenAccount = await getAssociatedTokenAddress(USDC_MINT, recipientPubkey);
  
  const configAccount = await program.account.platformConfig.fetch(configPDA);
  const feeTokenAccount = await getAssociatedTokenAddress(USDC_MINT, configAccount.feeWallet);

  const tx = await program.methods
    .transferStablecoin(amountMicro, recipientCountry, memo)
    .accounts({
      sender: wallet.publicKey,
      senderUserAccount: senderPDA,
      recipientUserAccount: recipientPDA,
      senderTokenAccount: senderTokenAccount,
      recipientTokenAccount: recipientTokenAccount,
      feeTokenAccount: feeTokenAccount,
      transferRecord: transferRecordPDA,
      platformConfig: configPDA,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    })
    .rpc();

  return {
    signature: tx,
    fee: feeMicro.toNumber() / 1_000_000,
    netAmount: netMicro.toNumber() / 1_000_000,
  };
}

// --- Fetch USDC Balance ---
export async function getUsdcBalance(walletPubkey: PublicKey): Promise<number> {
  try {
    const ata = await getAssociatedTokenAddress(USDC_MINT, walletPubkey);
    const account = await getAccount(connection, ata);
    return Number(account.amount) / 1_000_000;
  } catch {
    return 0;
  }
}

// --- Fetch SOL Balance ---
export async function getSolBalance(walletPubkey: PublicKey): Promise<number> {
  const lamports = await connection.getBalance(walletPubkey);
  return lamports / 1_000_000_000;
}

// --- Fetch Transfer History (by reading PDA accounts) ---
export async function fetchTransferHistory(wallet: any): Promise<any[]> {
  const program = getProgram(wallet);
  if (!program.account || !program.account.userAccount) {
    return [
      { 
        pdaAddress: "mock_pda_1", 
        amountUsdc: new BN(50000000), 
        recipientCountry: "USA", 
        memo: "Mock Transfer 1",
        sender: wallet?.publicKey || new PublicKey("11111111111111111111111111111111"),
        recipient: new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"),
        timestamp: new BN(Math.floor(Date.now() / 1000) - 3600),
        status: 1
      },
      { 
        pdaAddress: "mock_pda_2", 
        amountUsdc: new BN(15000000), 
        recipientCountry: "UK", 
        memo: "Mock Transfer 2",
        sender: new PublicKey("EJwZniZseaWTyP354kPUM52G3T14q2T1eZcR4K7XhBps"),
        recipient: wallet?.publicKey || new PublicKey("11111111111111111111111111111111"),
        timestamp: new BN(Math.floor(Date.now() / 1000) - 86400),
        status: 1
      }
    ];
  }

  const [senderPDA] = getUserPDA(wallet.publicKey);
  let userAccount: any;
  try {
    userAccount = await program.account.userAccount.fetch(senderPDA);
  } catch {
    return [];
  }

  const history = [];
  for (let i = 0; i < userAccount.transferCount; i++) {
    try {
      const [pda] = getTransferPDA(wallet.publicKey, i);
      const record = await program.account.transferRecord.fetch(pda);
      history.push({ ...record, pdaAddress: pda.toString() });
    } catch {
      // skip failed fetches
    }
  }
  return history.reverse(); // newest first
}

// --- Freeze / Unfreeze Wallet ---
export async function setWalletFrozen(wallet: any, freeze: boolean): Promise<string> {
  const program = getProgram(wallet);
  if (!program.methods || !program.methods.freezeWallet) {
    return new Promise(resolve => setTimeout(() => resolve("mock_freeze_tx_" + Date.now()), 1000));
  }

  const [userPDA] = getUserPDA(wallet.publicKey);
  const [configPDA] = getConfigPDA();

  return await program.methods
    .freezeWallet(freeze)
    .accounts({
      caller: wallet.publicKey,
      userAccount: userPDA,
      platformConfig: configPDA,
    })
    .rpc();
}

// --- Get explorer link ---
export function explorerLink(signature: string): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
}
