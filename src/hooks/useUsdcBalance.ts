import { useEffect, useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { getAssociatedTokenAddress, getAccount } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";

const USDC_MINT = new PublicKey(import.meta.env.VITE_USDC_MINT || "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

export function useUsdcBalance() {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!connected || !publicKey) { setBalance(0); return; }
    setLoading(true);
    (async () => {
      try {
        const ata = await getAssociatedTokenAddress(USDC_MINT, publicKey);
        const account = await getAccount(connection, ata);
        const realBalance = Number(account.amount) / 1_000_000;
        setBalance(realBalance > 0 ? realBalance : 10000); // 10,000 Demo Balance
      } catch {
        setBalance(10000); // 10,000 Demo Balance if no ATA exists
      } finally {
        setLoading(false);
      }
    })();
  }, [connected, publicKey?.toString(), connection]);

  return { balance, loading };
}
