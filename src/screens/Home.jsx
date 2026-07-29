import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, ArrowUpRight, ArrowDownLeft, RefreshCcw, Plus, ChevronRight,
  Copy, ExternalLink, Wallet as WalletIcon, QrCode, Gift
} from 'lucide-react';
import { Card, Button, Avatar, Skeleton, EmptyState, Badge } from '../components/ui';
import { useStore } from '../store/useStore';
import { useToast } from '../contexts/ToastContext';
import { useSolanaWallet } from '../hooks/useSolanaWallet';
import { fetchTransferHistory } from '../lib/nexpay-sdk';

export const Home = () => {
  const { user, getUnreadCount } = useStore();
  const unreadCount = getUnreadCount();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { publicKey, usdcBalance, refreshBalances, shortAddress, connected, walletAdapter } = useSolanaWallet();
  
  const [transactions, setTransactions] = useState([]);
  const [loadingTx, setLoadingTx] = useState(true);

  useEffect(() => {
    if (connected && walletAdapter) {
      loadHistory();
    } else {
      setLoadingTx(false);
    }
  }, [connected, walletAdapter]);

  const loadHistory = async () => {
    setLoadingTx(true);
    try {
      const history = await fetchTransferHistory(walletAdapter);
      setTransactions(history.slice(0, 5));
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingTx(false);
    }
  };

  const copyAddress = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey.toString());
      showToast("Address Copied!", "success");
    }
  };

  const openExplorer = () => {
    if (publicKey) {
      window.open(`https://explorer.solana.com/address/${publicKey.toString()}?cluster=devnet`, '_blank');
    }
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="flex flex-col min-h-full p-6 space-y-6 bg-bgDark animate-page">
      <div className="flex justify-between items-center mt-1">
        <button onClick={() => navigate('/profile')} className="flex items-center space-x-3 text-left">
          <Avatar name={user?.name} size="md" />
          <div>
            <p className="text-xs text-textMuted">{greeting},</p>
            <p className="text-sm font-bold tracking-tight">{user?.name || 'User'}</p>
          </div>
        </button>
        
        <div className="flex items-center space-x-2">
          {shortAddress && (
            <button onClick={copyAddress} className="flex items-center space-x-1.5 px-3 py-1.5 glass rounded-full text-xs font-mono hover:bg-white/10 transition-colors">
              <WalletIcon size={12} className="text-primary" />
              <span>{shortAddress}</span>
            </button>
          )}
          <button onClick={openExplorer} aria-label="Explorer" className="p-2.5 rounded-full glass hover:bg-white/10 transition-colors">
            <ExternalLink size={16} className="text-textMuted" />
          </button>
          <button onClick={() => navigate('/notifications')} aria-label="Notifications" className="relative p-2.5 rounded-full glass hover:bg-white/10 transition-colors">
            <Bell size={16} className="text-textPrimary" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full border-2 border-bgDark" />
            )}
          </button>
        </div>
      </div>

      {usdcBalance === 0 && !loadingTx && (
        <Card className="bg-warning/10 border-warning/30 p-4 flex items-center justify-between gap-3">
          <span className="text-sm text-warning font-medium">No USDC yet. Top up to send money.</span>
          <Button size="sm" onClick={() => navigate('/wallet')}>Top Up</Button>
        </Card>
      )}

      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-card shadow-card p-8 flex flex-col items-center group">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-accent/5 pointer-events-none" />
        <button onClick={refreshBalances} aria-label="Refresh balance" className="absolute top-4 right-4 p-2 bg-white/5 backdrop-blur-sm rounded-full hover:bg-primary/20 transition-all opacity-60 group-hover:opacity-100 border border-white/10">
          <RefreshCcw size={14} className="text-textMuted" />
        </button>
        <p className="text-sm text-textMuted font-medium z-10">Total Balance</p>
        <h1 className="text-4xl sm:text-5xl font-mono font-bold mt-2 z-10 tracking-tight text-white text-center break-all px-2">
          ${usdcBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          <span className="text-lg text-textMuted font-semibold ml-2">USDC</span>
        </h1>
        <div className="flex space-x-2 mt-5 z-10">
          <Badge variant="primary">Tier: {user?.tier || 'Free'}</Badge>
          {user?.kycVerified && <Badge variant="success">Verified</Badge>}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <ActionBtn icon={ArrowUpRight} label="Send" onClick={() => navigate('/send')} />
        <ActionBtn icon={ArrowDownLeft} label="Receive" onClick={() => navigate('/receive')} />
        <ActionBtn icon={QrCode} label="QR Pay" onClick={() => navigate('/qr')} />
        <ActionBtn icon={Plus} label="Top-Up" onClick={() => navigate('/wallet')} />
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
        <Chip onClick={() => navigate('/rates')}>Rates</Chip>
        <Chip onClick={() => navigate('/converter')}>Convert</Chip>
        <Chip onClick={() => navigate('/cards')}>Cards</Chip>
        <Chip onClick={() => navigate('/referral')}><Gift size={12} className="mr-1" /> Refer</Chip>
        <Chip onClick={() => navigate('/rewards')}>Rewards</Chip>
      </div>

      <div className="flex-1 flex flex-col space-y-4">
        <div className="flex justify-between items-end">
          <h2 className="text-lg font-bold tracking-tight">Recent</h2>
          <button onClick={() => navigate('/history')} className="text-xs text-primary font-semibold flex items-center">
            See all <ChevronRight size={14} />
          </button>
        </div>
        
        <div className="flex-1 space-y-2.5">
          {loadingTx ? (
            [1, 2, 3].map(i => (
              <div key={i} className="flex items-center p-3.5 rounded-2xl bg-card border border-white/5">
                <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                <div className="ml-3 flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))
          ) : transactions.length === 0 ? (
            <EmptyState
              icon={ArrowUpRight}
              title="No transactions yet"
              description="Send your first USDC transfer in under a second."
              action={<Button size="sm" onClick={() => navigate('/send')}>Send Money</Button>}
            />
          ) : (
            transactions.map((tx, idx) => {
              const isSend = tx.sender.toString() === publicKey?.toString();
              const amountDisplay = Number(tx.amountUsdc) / 1000000;
              const dateDisplay = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(tx.timestamp * 1000));
              const displayAddr = isSend ? tx.recipient.toString() : tx.sender.toString();
              const shortAddr = `${displayAddr.slice(0,4)}...${displayAddr.slice(-4)}`;
              const statusText = ['Pending', 'Completed', 'Failed'][tx.status];

              return (
                <Card key={idx} interactive onClick={() => navigate(`/history/${tx.pdaAddress}`)} className="p-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isSend ? 'bg-white/5' : 'bg-accent/15'}`}>
                        {isSend ? <ArrowUpRight size={18} className="text-textPrimary" /> : <ArrowDownLeft size={18} className="text-accent" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{shortAddr}</p>
                        <p className="text-[10px] text-textMuted">{isSend ? 'Sent' : 'Received'} · {dateDisplay}</p>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <p className={`text-sm font-mono font-semibold ${isSend ? 'text-textPrimary' : 'text-accent'}`}>
                        {isSend ? '-' : '+'}${amountDisplay.toFixed(2)}
                      </p>
                      <Badge variant={tx.status === 1 ? 'success' : tx.status === 2 ? 'danger' : 'warning'} className="mt-1">
                        {statusText}
                      </Badge>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

const ActionBtn = ({ icon: Icon, label, onClick }) => (
  <button onClick={onClick} className="flex flex-col items-center space-y-2 group active:scale-95 transition-transform">
    <div className="w-14 h-14 rounded-2xl bg-card border border-white/10 flex items-center justify-center group-hover:bg-primary/15 group-hover:border-primary/30 transition-all shadow-card">
      <Icon size={22} className="text-primary" />
    </div>
    <span className="text-[11px] font-semibold text-textMuted group-hover:text-textPrimary transition-colors">{label}</span>
  </button>
);

const Chip = ({ children, onClick }) => (
  <button onClick={onClick} className="shrink-0 px-3.5 py-1.5 rounded-full glass text-xs font-semibold text-textMuted hover:text-white hover:border-primary/40 transition-all flex items-center">
    {children}
  </button>
);
