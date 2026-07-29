import { Connection, clusterApiUrl, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Program, web3, BN } from "@coral-xyz/anchor";
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import idl from "../idl/nexpay_program.json";

export const DEVNET_RPC = clusterApiUrl("devnet");
export const connection = new Connection(DEVNET_RPC, "confirmed");

// Replace with actual program ID after anchor deploy
// Must be a valid base58 string otherwise module evaluation throws an exception!
export const PROGRAM_ID = new PublicKey(
  import.meta.env.VITE_PROGRAM_ID || "AMcpmff8xMoDms8Y1VYhPCEZy27Nso8pWHqjFLLyddYS"
);

// USDC devnet mint (Circle's official devnet USDC or create your own)
export const USDC_MINT = new PublicKey(
  import.meta.env.VITE_USDC_MINT || "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
);
export const USDT_MINT = new PublicKey(
  import.meta.env.VITE_USDT_MINT || "EJwZniZseaWTyP354kPUM52G3T14q2T1eZcR4K7XhBps"
);

export function getProgram(wallet: any) {
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
    preflightCommitment: "confirmed",
  });
  return new Program(idl as any, PROGRAM_ID, provider);
}

export function getUserPDA(walletPubkey: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("user"), walletPubkey.toBuffer()],
    PROGRAM_ID
  );
}

export function getTransferPDA(senderPubkey: PublicKey, count: number): [PublicKey, number] {
  const countBuffer = Buffer.alloc(4);
  countBuffer.writeUInt32LE(count, 0);
  return PublicKey.findProgramAddressSync(
    [Buffer.from("transfer"), senderPubkey.toBuffer(), countBuffer],
    PROGRAM_ID
  );
}

export function getConfigPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from("config")], PROGRAM_ID);
}
