import React from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Wallet as WalletIcon } from 'lucide-react';
import { Card } from './ui';

export const WalletGuard = ({ children }) => {
  const { connected } = useWallet();

  if (!connected) {
    return (
      <div className="flex flex-col h-full bg-bgDark pt-safe pb-safe overflow-y-auto">
        <div className="flex-1 flex flex-col items-center justify-center p-6 w-full max-w-sm mx-auto">
          <Card className="flex flex-col items-center justify-center p-8 sm:p-10 w-full text-center space-y-8 bg-card/60 backdrop-blur-xl border border-white/5 rounded-[2rem] shadow-2xl">
            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center shadow-[0_0_30px_rgba(99,102,241,0.3)]">
              <WalletIcon size={40} className="text-primary" />
            </div>
            <div className="space-y-3">
              <h2 className="text-2xl font-extrabold text-white">Wallet Connection</h2>
              <p className="text-sm text-textMuted leading-relaxed">Connect your Phantom or Solflare wallet to access the NexPay network.</p>
            </div>
            <div className="w-full pt-4">
              <WalletMultiButton style={{ backgroundColor: '#6366F1', borderRadius: '16px', width: '100%', justifyContent: 'center', height: '56px', fontWeight: 'bold' }} />
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
