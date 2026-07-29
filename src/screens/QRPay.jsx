import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, ScanLine, Copy, Share2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Button, Card, Input, ScreenHeader, TabBar } from '../components/ui';
import { useSolanaWallet } from '../hooks/useSolanaWallet';
import { useToast } from '../contexts/ToastContext';
import { WalletGuard } from '../components/WalletGuard';

export const QRPayment = () => {
  const navigate = useNavigate();
  const { publicKey } = useSolanaWallet();
  const { showToast } = useToast();
  const [tab, setTab] = useState('show');
  const [amount, setAmount] = useState('');
  const addr = publicKey?.toString() || '';
  const payload = amount ? `solana:${addr}?amount=${amount}` : addr;

  return (
    <WalletGuard>
      <div className="flex flex-col h-full bg-bgDark">
        <ScreenHeader title="QR Pay" onBack={() => navigate(-1)} />
        <div className="p-6 max-w-sm mx-auto w-full flex-1 flex flex-col animate-page">
          <TabBar
            tabs={[{ id: 'show', label: 'My QR' }, { id: 'scan', label: 'Scan' }]}
            active={tab}
            onChange={(id) => id === 'scan' ? navigate('/qr-scan') : setTab(id)}
            className="mb-6"
          />
          <div className="flex flex-col items-center flex-1">
            <div className="bg-white p-5 rounded-3xl shadow-card mb-5">
              {addr ? <QRCodeSVG value={payload} size={200} /> : <div className="w-[200px] h-[200px] bg-gray-100 rounded-2xl" />}
            </div>
            <Input label="Request amount (optional)" floating type="number" value={amount} onChange={e => setAmount(e.target.value)} className="mb-4" />
            <p className="font-mono text-xs text-textMuted break-all text-center mb-6 px-4">{addr || 'Connect wallet'}</p>
            <div className="flex gap-3 w-full mt-auto">
              <Button variant="secondary" className="flex-1" onClick={() => { navigator.clipboard.writeText(payload); showToast('Copied', 'success'); }}><Copy size={16} className="mr-2" /> Copy</Button>
              <Button className="flex-1" onClick={() => showToast('Share sheet opened', 'info')}><Share2 size={16} className="mr-2" /> Share</Button>
            </div>
          </div>
        </div>
      </div>
    </WalletGuard>
  );
};

export const ScanQR = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [manual, setManual] = useState('');
  const inputRef = useRef(null);

  return (
    <div className="flex flex-col h-full bg-black">
      <ScreenHeader title="Scan QR" onBack={() => navigate(-1)} className="border-white/10" />
      <div className="flex-1 relative flex flex-col items-center justify-center animate-page">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black pointer-events-none" />
        <div className="w-64 h-64 border-2 border-primary/80 rounded-3xl relative shadow-[0_0_40px_rgba(99,102,241,0.3)]">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary animate-pulse shadow-glow" />
          <ScanLine className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary/40" size={48} />
        </div>
        <p className="text-sm text-textMuted mt-6 text-center px-8">Align the QR code within the frame</p>
        <div className="absolute bottom-8 left-6 right-6 space-y-3">
          <input
            ref={inputRef}
            value={manual}
            onChange={e => setManual(e.target.value)}
            placeholder="Or paste Solana address"
            className="w-full h-12 rounded-2xl bg-white/10 border border-white/10 px-4 text-sm text-white focus:outline-none focus:border-primary"
          />
          <Button size="lg" className="w-full font-bold h-12" onClick={() => {
            if (!manual.trim()) { showToast('Enter an address', 'error'); return; }
            navigate('/send', { state: { address: manual.trim() } });
          }}>Continue</Button>
        </div>
      </div>
    </div>
  );
};

export const RequestMoney = () => {
  const navigate = useNavigate();
  const { publicKey } = useSolanaWallet();
  const { showToast } = useToast();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const generate = () => {
    if (!amount || Number(amount) <= 0) { showToast('Enter an amount', 'error'); return; }
    const link = `solana:${publicKey}?amount=${amount}`;
    navigator.clipboard.writeText(link);
    showToast('Request link copied', 'success');
  };

  return (
    <WalletGuard>
      <div className="flex flex-col h-full bg-bgDark">
        <ScreenHeader title="Request Money" onBack={() => navigate(-1)} />
        <div className="flex-1 p-6 space-y-5 max-w-sm mx-auto w-full animate-page">
          <Card glass className="p-6 rounded-3xl text-center">
            <QrCode className="mx-auto text-primary mb-3" size={32} />
            <p className="text-sm text-textMuted mb-4">Request a specific USDC amount</p>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="w-full bg-transparent text-center font-mono text-4xl font-bold focus:outline-none text-white mb-2" />
            <p className="text-xs text-textMuted">USDC</p>
          </Card>
          <Input label="Note" floating value={note} onChange={e => setNote(e.target.value)} placeholder="What's it for?" />
          <Button size="lg" className="w-full font-bold h-14" onClick={generate}>Generate & copy link</Button>
          <Button variant="secondary" size="lg" className="w-full" onClick={() => navigate('/qr')}>Show QR</Button>
        </div>
      </div>
    </WalletGuard>
  );
};
