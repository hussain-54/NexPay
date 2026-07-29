import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Search, Filter, Download, RefreshCcw } from 'lucide-react';
import { Button, Card } from '../components/ui';
import { useToast } from '../contexts/ToastContext';
import { useSolanaWallet } from '../hooks/useSolanaWallet';
import { fetchTransferHistory } from '../lib/nexpay-sdk';
import { WalletGuard } from '../components/WalletGuard';

export const TransactionHistory = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { walletAdapter, publicKey, connected } = useSolanaWallet();
  
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  
  const filters = ['All', 'Sent', 'Received', 'Completed', 'Failed'];

  const loadHistory = async () => {
    if (!walletAdapter) return;
    setLoading(true);
    try {
      const history = await fetchTransferHistory(walletAdapter);
      setTransactions(history);
    } catch (e) {
      console.error(e);
      showToast("Failed to load history", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (connected) loadHistory();
  }, [connected, walletAdapter]);

  const filteredTx = transactions.filter(tx => {
    const isSend = tx.sender.toString() === publicKey?.toString();
    const type = isSend ? 'Sent' : 'Received';
    const statusText = ['Pending', 'Completed', 'Failed'][tx.status];
    
    // Status/Type filter
    if (filter === 'Sent' && !isSend) return false;
    if (filter === 'Received' && isSend) return false;
    if (filter === 'Completed' && tx.status !== 1) return false;
    if (filter === 'Failed' && tx.status !== 2) return false;

    // Search filter
    if (search) {
      const target = isSend ? tx.recipient.toString() : tx.sender.toString();
      const amountStr = (Number(tx.amountUsdc) / 1000000).toString();
      if (!target.includes(search) && !amountStr.includes(search)) return false;
    }
    
    return true;
  });

  const handleExport = () => {
    if (transactions.length === 0) {
      showToast("No data to export", "error");
      return;
    }
    
    const headers = "Date,From,To,Amount USDC,Fee USDC,Country,Status,Explorer Link\n";
    const rows = transactions.map(tx => {
      const date = new Date(tx.timestamp * 1000).toISOString();
      const from = tx.sender.toString();
      const to = tx.recipient.toString();
      const amount = Number(tx.amountUsdc) / 1000000;
      const fee = Number(tx.feeCollected) / 1000000;
      const country = tx.recipientCountry;
      const status = ['Pending', 'Completed', 'Failed'][tx.status];
      const link = `https://explorer.solana.com/tx/${tx.txHashRef}?cluster=devnet`;
      return `${date},${from},${to},${amount},${fee},${country},${status},${link}`;
    }).join("\n");

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexpay_history_${new Date().getTime()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    showToast("Exported to CSV", "success");
  };

  return (
    <WalletGuard>
      <div className="flex flex-col h-full bg-bgDark">
        <div className="flex items-center justify-between p-4 border-b border-borderDark relative">
          <button onClick={() => navigate('/')} className="p-2 -ml-2 rounded-full hover:bg-card">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-lg font-bold">History</h1>
          <div className="flex space-x-1">
            <button onClick={loadHistory} className="p-2 rounded-full hover:bg-card">
              <RefreshCcw size={18} className="text-textMuted hover:text-primary" />
            </button>
            <button onClick={handleExport} className="p-2 rounded-full hover:bg-card">
              <Download size={18} className="text-primary" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-textMuted" size={18} />
            <input 
              type="text" 
              placeholder="Search by address or amount" 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-10 bg-card border border-borderDark rounded-lg pl-10 pr-4 focus:outline-none focus:border-primary text-textPrimary text-sm"
            />
          </div>

          <div className="flex space-x-2 overflow-x-auto no-scrollbar pb-1">
            {filters.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  filter === f ? 'bg-primary text-white' : 'bg-card border border-borderDark text-textMuted hover:text-textPrimary'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-3">
          {loading ? (
            [1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center p-3 rounded-xl bg-card border border-borderDark animate-pulse">
                <div className="w-10 h-10 rounded-full bg-borderDark shrink-0"></div>
                <div className="ml-3 flex-1 space-y-2">
                  <div className="h-4 bg-borderDark rounded w-1/2"></div>
                  <div className="h-3 bg-borderDark rounded w-1/3"></div>
                </div>
              </div>
            ))
          ) : filteredTx.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-textMuted">
              <Filter size={48} className="mb-4 opacity-20" />
              <p>No transactions found</p>
              <Button variant="ghost" onClick={() => {setFilter('All'); setSearch('');}} className="mt-4 text-primary">Clear filters</Button>
            </div>
          ) : (
            filteredTx.map(tx => {
              const isSend = tx.sender.toString() === publicKey?.toString();
              const amountDisplay = Number(tx.amountUsdc) / 1000000;
              const dateDisplay = new Date(tx.timestamp * 1000).toLocaleDateString();
              const displayAddr = isSend ? tx.recipient.toString() : tx.sender.toString();
              const shortAddr = `${displayAddr.slice(0,4)}...${displayAddr.slice(-4)}`;
              const statusText = ['Pending', 'Completed', 'Failed'][tx.status];

              return (
                <Card key={tx.pdaAddress} onClick={() => navigate(`/history/${tx.pdaAddress}`)} className="p-3 hover:border-primary/50 cursor-pointer transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-borderDark flex items-center justify-center text-sm font-bold">
                        {tx.recipientCountry || '🌎'}
                      </div>
                      <div>
                        <p className="font-bold text-sm">{shortAddr}</p>
                        <p className="text-[10px] text-textMuted uppercase tracking-wide">{dateDisplay} • {isSend ? 'Sent' : 'Received'}</p>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <p className={`text-sm font-mono font-bold ${isSend ? 'text-textPrimary' : 'text-accent'}`}>
                        {isSend ? '-' : '+'}${amountDisplay.toFixed(2)}
                      </p>
                      <div className={`mt-1 px-1.5 py-0.5 rounded text-[9px] font-medium ${
                        tx.status === 1 ? 'bg-accent/10 text-accent' : 
                        tx.status === 2 ? 'bg-danger/10 text-danger' : 'bg-warning/10 text-warning'
                      }`}>
                        {statusText}
                      </div>
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
