import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ExternalLink, RefreshCcw } from 'lucide-react';
import { PublicKey } from '@solana/web3.js';
import { Card, Button } from '../components/ui';
import { useToast } from '../contexts/ToastContext';
import { useSolanaWallet } from '../hooks/useSolanaWallet';
import { getProgram } from '../lib/solana';
import { explorerLink } from '../lib/nexpay-sdk';
import { WalletGuard } from '../components/WalletGuard';

export const TransactionDetail = () => {
  const { pdaAddress } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { walletAdapter } = useSolanaWallet();
  
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecord = async () => {
      if (!walletAdapter || !pdaAddress) return;
      try {
        const program = getProgram(walletAdapter);
        const data = await program.account.transferRecord.fetch(new PublicKey(pdaAddress));
        setRecord(data);
      } catch (e) {
        console.error(e);
        showToast("Transaction not found", "error");
        navigate('/history');
      } finally {
        setLoading(false);
      }
    };
    fetchRecord();
  }, [pdaAddress, walletAdapter]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-bgDark">
        <RefreshCcw className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (!record) return null;

  const amountUsdc = Number(record.amountUsdc) / 1000000;
  const feeUsdc = Number(record.feeCollected) / 1000000;
  const isSend = record.sender.toString() === walletAdapter?.publicKey.toString();
  const statusText = ['Pending', 'Completed', 'Failed'][record.status];

  return (
    <WalletGuard>
      <div className="flex flex-col h-full bg-bgDark p-6">
        <div className="flex items-center mb-6 relative">
          <button onClick={() => navigate('/history')} className="p-2 -ml-2 rounded-full hover:bg-card">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-xl font-bold flex-1 text-center pr-8">Transaction Detail</h1>
        </div>

        <div className="flex-1 overflow-y-auto space-y-6">
          <div className="flex flex-col items-center justify-center p-6 bg-card border border-borderDark rounded-2xl">
            <p className="text-sm text-textMuted mb-2">{isSend ? 'You Sent' : 'You Received'}</p>
            <h1 className="text-4xl font-mono font-bold text-textPrimary">${amountUsdc.toFixed(2)}</h1>
            <div className={`mt-3 px-3 py-1 rounded-full text-xs font-bold ${
              record.status === 1 ? 'bg-accent/10 text-accent' : 
              record.status === 2 ? 'bg-danger/10 text-danger' : 'bg-warning/10 text-warning'
            }`}>
              {statusText}
            </div>
          </div>

          <Card className="space-y-4">
            <DetailRow label="Date" value={new Date(record.timestamp * 1000).toLocaleString()} />
            <DetailRow label="From" value={record.sender.toString()} mono />
            <DetailRow label="To" value={record.recipient.toString()} mono />
            <DetailRow label="Country" value={record.recipientCountry || 'Unknown'} />
            <div className="border-t border-borderDark my-2 pt-2">
              <DetailRow label="Fee Paid" value={`${feeUsdc.toFixed(6)} USDC`} />
            </div>
            <DetailRow label="Network" value="Solana Devnet" />
            
            <div className="pt-4 border-t border-borderDark">
              <p className="text-xs text-textMuted mb-1">Transaction Signature</p>
              <p className="font-mono text-xs break-all text-textPrimary mb-3">{record.txHashRef}</p>
              <Button 
                variant="secondary" 
                className="w-full"
                onClick={() => window.open(explorerLink(record.txHashRef), '_blank')}
              >
                <ExternalLink size={16} className="mr-2" /> View on Explorer
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </WalletGuard>
  );
};

const DetailRow = ({ label, value, mono }) => (
  <div className="flex justify-between items-start">
    <span className="text-sm text-textMuted w-1/3">{label}</span>
    <span className={`text-sm text-right w-2/3 break-all ${mono ? 'font-mono text-xs' : 'font-medium'}`}>{value}</span>
  </div>
);
