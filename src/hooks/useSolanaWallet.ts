import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useCallback, useEffect, useState } from "react";
import { fetchUserAccount, getUsdcBalance, getSolBalance } from "../lib/nexpay-sdk";

export function useSolanaWallet() {
  const { publicKey, wallet, signTransaction, signAllTransactions, connected, disconnect } = useWallet();
  const { connection } = useConnection();
  const [userAccount, setUserAccount] = useState<any>(null);
  const [usdcBalance, setUsdcBalance] = useState<number>(0);
  const [solBalance, setSolBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const walletAdapter = publicKey ? {
    publicKey,
    signTransaction,
    signAllTransactions,
  } : null;

  const refreshBalances = useCallback(async () => {
    if (!publicKey) return;
    const [usdc, sol] = await Promise.all([
      getUsdcBalance(publicKey),
      getSolBalance(publicKey),
    ]);
    setUsdcBalance(usdc);
    setSolBalance(sol);
  }, [publicKey]);

  const refreshUserAccount = useCallback(async () => {
    if (!walletAdapter) return;
    const account = await fetchUserAccount(walletAdapter);
    setUserAccount(account);
  }, [publicKey]);

  useEffect(() => {
    if (connected && publicKey) {
      refreshBalances();
      refreshUserAccount();
    }
  }, [connected, publicKey]);

  return {
    publicKey,
    walletAdapter,
    connected,
    disconnect,
    userAccount,
    usdcBalance,
    solBalance,
    refreshBalances,
    refreshUserAccount,
    loading,
    setLoading,
    shortAddress: publicKey
      ? `${publicKey.toString().slice(0, 4)}...${publicKey.toString().slice(-4)}`
      : null,
  };
}
