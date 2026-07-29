import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Eye, EyeOff, Snowflake, Plus, Wifi } from 'lucide-react';
import { Button, Card, ScreenHeader, Switch, Badge } from '../components/ui';
import { useToast } from '../contexts/ToastContext';

export const CardManagement = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [frozen, setFrozen] = useState(false);
  const [showNum, setShowNum] = useState(false);

  return (
    <div className="flex flex-col h-full bg-bgDark">
      <ScreenHeader title="Cards" onBack={() => navigate(-1)} />
      <div className="flex-1 overflow-y-auto p-6 space-y-5 max-w-sm mx-auto w-full animate-page">
        <div className="relative h-48 rounded-3xl bg-gradient-to-br from-primary via-primaryHover to-[#312E81] p-6 text-white shadow-glow overflow-hidden">
          <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
          <div className="flex justify-between items-start mb-8 relative z-10">
            <p className="font-extrabold tracking-tight text-lg">NexPay</p>
            <Wifi size={20} className="rotate-90 opacity-80" />
          </div>
          <p className="font-mono text-lg tracking-widest mb-6 relative z-10">
            {showNum ? '4242 4242 4242 8891' : '•••• •••• •••• 8891'}
          </p>
          <div className="flex justify-between relative z-10">
            <div>
              <p className="text-[10px] opacity-70 uppercase">Holder</p>
              <p className="text-sm font-semibold">NEX PAY USER</p>
            </div>
            <div>
              <p className="text-[10px] opacity-70 uppercase">Exp</p>
              <p className="text-sm font-semibold">12/28</p>
            </div>
            <Badge variant="success">Virtual</Badge>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => setShowNum(!showNum)}>
            {showNum ? <EyeOff size={16} className="mr-2" /> : <Eye size={16} className="mr-2" />} Details
          </Button>
          <Button variant="secondary" className="flex-1" onClick={() => navigate('/virtual-card')}>
            <Plus size={16} className="mr-2" /> New card
          </Button>
        </div>

        <Card className="p-0 overflow-hidden divide-y divide-white/5">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-danger/10 text-danger flex items-center justify-center"><Snowflake size={16} /></div>
              <div>
                <p className="text-sm font-semibold">Freeze card</p>
                <p className="text-xs text-textMuted">Block all card spend</p>
              </div>
            </div>
            <Switch checked={frozen} onChange={(v) => { setFrozen(v); showToast(v ? 'Card frozen' : 'Card active', 'success'); }} />
          </div>
        </Card>
      </div>
    </div>
  );
};

export const VirtualCard = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  return (
    <div className="flex flex-col h-full bg-bgDark">
      <ScreenHeader title="Virtual Card" onBack={() => navigate(-1)} />
      <div className="flex-1 p-6 flex flex-col max-w-sm mx-auto w-full animate-page">
        <div className="flex justify-center mb-8">
          <div className="w-20 h-20 rounded-3xl bg-primary/15 border border-primary/25 flex items-center justify-center">
            <CreditCard className="text-primary" size={36} />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-center text-white mb-2">Create virtual card</h2>
        <p className="text-sm text-textMuted text-center mb-8">Instant USDC-backed card for online payments. Available on Pro.</p>
        <Card glass className="space-y-3 mb-8">
          <p className="text-sm flex justify-between"><span className="text-textMuted">Issuance fee</span><span className="font-semibold">Free</span></p>
          <p className="text-sm flex justify-between"><span className="text-textMuted">Daily limit</span><span className="font-semibold">$2,500</span></p>
          <p className="text-sm flex justify-between"><span className="text-textMuted">Network</span><span className="font-semibold">Visa / Mastercard</span></p>
        </Card>
        <div className="mt-auto space-y-3">
          <Button size="lg" className="w-full font-bold h-14" onClick={() => { showToast('Virtual card created', 'success'); navigate('/cards'); }}>Create card</Button>
          <Button variant="ghost" size="lg" className="w-full" onClick={() => navigate('/premium')}>Upgrade to Premium</Button>
        </div>
      </div>
    </div>
  );
};
