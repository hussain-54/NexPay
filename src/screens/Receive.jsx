import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Share2, Link as LinkIcon, Droplets } from 'lucide-react';
import { Button, Input, Card, Select } from '../components/ui';
import { useToast } from '../contexts/ToastContext';
import { useSolanaWallet } from '../hooks/useSolanaWallet';
import { QRCodeSVG } from 'qrcode.react';
import { USDC_MINT, connection } from '../lib/solana';
import { WalletGuard } from '../components/WalletGuard';

export const Receive = () => {
  const navigate = useNavigate();
  const { publicKey } = useSolanaWallet();
  const { showToast } = useToast();
  
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USDC');
  const [requestLink, setRequestLink] = useState('');
  const [isAirdropping, setIsAirdropping] = useState(false);

  const walletAddress = publicKey ? publicKey.toString() : '';

  const handleCopy = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      showToast("Address Copied!", "success");
    }
  };

  const handleGenerateLink = () => {
    if (!walletAddress) return;
    const link = `solana:${walletAddress}?amount=${amount}&spl-token=${USDC_MINT.toString()}`;
    setRequestLink(link);
    navigator.clipboard.writeText(link);
    showToast(`Payment request link copied!`, "success");
  };

  const handleAirdrop = async () => {
    if (!publicKey) return;
    setIsAirdropping(true);
    try {
      const sig = await connection.requestAirdrop(publicKey, 1_000_000_000); // 1 SOL
      await connection.confirmTransaction(sig, 'confirmed');
      showToast("Devnet SOL airdropped successfully!", "success");
      showToast("Visit spl-token faucet to get test USDC", "info");
    } catch (e) {
      showToast(`Airdrop failed: ${e.message}`, "error");
    } finally {
      setIsAirdropping(false);
    }
  };

  return (
    <WalletGuard>
      <div className="flex flex-col h-full bg-bgDark p-6 overflow-y-auto animate-page">
        <div className="flex items-center mb-6 relative">
          <h1 className="text-xl font-extrabold tracking-tight flex-1 text-center">Receive</h1>
        </div>

        <div className="flex-1 flex flex-col items-center">
          <div className="bg-white p-6 rounded-3xl mb-6 shadow-2xl flex flex-col items-center">
            {requestLink ? (
              <QRCodeSVG value={requestLink} size={200} />
            ) : walletAddress ? (
              <QRCodeSVG value={walletAddress} size={200} />
            ) : (
              <div className="w-[200px] h-[200px] border-4 border-dashed border-gray-200 rounded-2xl flex items-center justify-center">
                <span className="text-gray-400 font-bold tracking-widest text-sm">QR CODE</span>
              </div>
            )}
          </div>

          <p className="text-sm font-medium text-textMuted mb-2">Your Wallet Address</p>
          <div className="w-full flex items-center justify-between mb-4 p-4 bg-card/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/5">
            <span className="font-mono text-sm truncate mr-4 text-white">{walletAddress}</span>
            <div className="flex space-x-2 shrink-0">
              <button onClick={handleCopy} className="p-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors">
                <Copy size={16} className="text-white" />
              </button>
            </div>
          </div>

          <Button variant="secondary" size="sm" onClick={handleAirdrop} isLoading={isAirdropping} className="mb-8">
            <Droplets size={14} className="mr-2" /> Get devnet SOL
          </Button>

          <div className="w-full mt-auto bg-card/80 backdrop-blur-md p-5 rounded-3xl shadow-lg border border-white/5">
            <h3 className="text-base font-bold mb-4 text-center text-white">Request Specific Amount</h3>
            <div className="flex flex-col space-y-3 mb-5">
              <Select 
                value={currency} 
                onChange={(e) => setCurrency(e.target.value)}
                options={[
                  { label: 'USDC - USD Coin', value: 'USDC' },
                  { label: 'USDT - Tether', value: 'USDT' }
                ]}
                className="w-full bg-black/20 border-white/10 focus:border-primary text-base h-14 text-white"
              />
              <Input 
                type="number" 
                min="0"
                step="0.01"
                placeholder="0.00" 
                value={amount} 
                onChange={(e) => setAmount(e.target.value)} 
                className="font-mono text-2xl h-16 text-center bg-black/20 border-white/10 focus:border-primary placeholder:text-gray-600 text-white"
              />
            </div>
            <Button onClick={handleGenerateLink} size="lg" className="w-full text-white font-bold h-14 shadow-primary/20" disabled={!amount || amount <= 0}>
              <LinkIcon size={18} className="mr-2" /> Generate Request Link
            </Button>
          </div>
        </div>
      </div>
    </WalletGuard>
  );
};
