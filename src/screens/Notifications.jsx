import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Bell, ArrowDownLeft, ArrowUpRight, ShieldCheck } from 'lucide-react';
import { useStore } from '../store/useStore';
import { Card, EmptyState, Badge } from '../components/ui';
import { useSolanaWallet } from '../hooks/useSolanaWallet';
import { getProgram } from '../lib/solana';
import { WalletGuard } from '../components/WalletGuard';

export const Notifications = () => {
  const navigate = useNavigate();
  const { notifications, markAllRead, addNotification } = useStore();
  const { walletAdapter, publicKey } = useSolanaWallet();
  const listenerId = useRef(null);

  useEffect(() => {
    markAllRead();
  }, []);

  useEffect(() => {
    if (!walletAdapter || !publicKey) return;
    const program = getProgram(walletAdapter);

    const setupListener = async () => {
      try {
        if (!program.idl.events) {
          console.warn("Mock Mode: Smart contract events not available yet.");
          return;
        }
        listenerId.current = program.addEventListener("TransferCompleted", (event) => {
          if (event.recipient.toString() === publicKey.toString()) {
            const amount = Number(event.amountUsdc) / 1000000;
            const senderShort = `${event.sender.toString().slice(0, 8)}...`;
            addNotification({
              type: "receive",
              title: `Money received: +${amount.toFixed(2)} USDC`,
              body: `From ${senderShort}`,
              time: new Date().toISOString(),
              unread: true,
            });
          }
        });
      } catch (e) {
        console.warn("Event listener setup failed:", e);
      }
    };
    
    setupListener();

    return () => {
      if (listenerId.current !== null) {
        program.removeEventListener(listenerId.current).catch(console.error);
      }
    };
  }, [walletAdapter, publicKey]);

  const getIcon = (type) => {
    switch (type) {
      case 'receive': return <ArrowDownLeft size={20} className="text-accent" />;
      case 'send': return <ArrowUpRight size={20} className="text-textPrimary" />;
      case 'security': return <ShieldCheck size={20} className="text-primary" />;
      default: return <Bell size={20} className="text-textMuted" />;
    }
  };

  return (
    <WalletGuard>
      <div className="flex flex-col h-full bg-bgDark animate-page">
        <div className="flex items-center justify-between p-4 border-b border-white/5 relative shrink-0">
          <button onClick={() => navigate(-1)} aria-label="Back" className="p-2 -ml-2 rounded-full hover:bg-white/5">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-lg font-bold">Notifications</h1>
          <div className="w-10" />
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-6">
          {notifications.length === 0 ? (
            <EmptyState icon={Bell} title="You're all caught up" description="Transfers, security alerts, and rewards will show up here." />
          ) : (
            notifications.map((notif, idx) => {
              const timeRaw = notif.time;
              const parsed = timeRaw && !isNaN(Date.parse(timeRaw)) ? new Date(timeRaw) : null;
              const timeDisplay = parsed ? parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (timeRaw || '');
              const dateDisplay = parsed ? parsed.toLocaleDateString() : '';
              
              return (
                <Card key={notif.id || idx} className={`p-4 flex items-start space-x-4 ${(!notif.read || notif.unread) ? 'border-primary/40 bg-primary/5' : ''}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    notif.type === 'receive' ? 'bg-accent/10' :
                    notif.type === 'security' ? 'bg-primary/10' : 'bg-card border border-white/10'
                  }`}>
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-bold text-sm text-textPrimary">{notif.title}</h3>
                      {dateDisplay && <span className="text-[10px] text-textMuted whitespace-nowrap">{dateDisplay}</span>}
                    </div>
                    {notif.body && <p className="text-xs text-textMuted mt-1">{notif.body}</p>}
                    <div className="flex items-center gap-2 mt-2">
                      <p className="text-[10px] text-textMuted">{timeDisplay}</p>
                      {(!notif.read || notif.unread) && <Badge variant="primary">New</Badge>}
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </WalletGuard>
  );
};
