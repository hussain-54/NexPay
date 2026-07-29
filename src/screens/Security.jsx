import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield, Fingerprint, Key, Lock, Smartphone, Eye, AlertTriangle,
  ChevronRight, Snowflake
} from 'lucide-react';
import { Button, Card, ScreenHeader, Switch, Badge } from '../components/ui';
import { useToast } from '../contexts/ToastContext';
import { useSolanaWallet } from '../hooks/useSolanaWallet';
import { setWalletFrozen } from '../lib/nexpay-sdk';

export const SecurityCenter = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { walletAdapter, userAccount, refreshUserAccount } = useSolanaWallet();
  const [bio, setBio] = useState(true);
  const [twoFa, setTwoFa] = useState(false);
  const [appLock, setAppLock] = useState(true);
  const [freezing, setFreezing] = useState(false);
  const isFrozen = userAccount?.isFrozen;

  const toggleFreeze = async () => {
    if (!walletAdapter) return;
    if (!isFrozen && !window.confirm('This will prevent all outgoing transfers. Continue?')) return;
    setFreezing(true);
    try {
      await setWalletFrozen(walletAdapter, !isFrozen);
      await refreshUserAccount();
      showToast(!isFrozen ? 'Wallet frozen' : 'Wallet unfrozen', 'success');
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setFreezing(false);
    }
  };

  const Row = ({ icon: Icon, title, desc, right, onClick, danger }) => (
    <button type="button" onClick={onClick} className="w-full flex items-center justify-between p-4 hover:bg-white/[0.03] transition-colors text-left">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center ${danger ? 'bg-danger/10 text-danger' : 'bg-white/5 text-textMuted'}`}>
          <Icon size={16} />
        </div>
        <div>
          <p className="text-sm font-semibold">{title}</p>
          {desc && <p className="text-xs text-textMuted">{desc}</p>}
        </div>
      </div>
      {right || <ChevronRight size={18} className="text-textMuted" />}
    </button>
  );

  return (
    <div className="flex flex-col h-full bg-bgDark">
      <ScreenHeader title="Security Center" onBack={() => navigate(-1)} />
      <div className="flex-1 overflow-y-auto p-6 space-y-5 max-w-sm mx-auto w-full animate-page pb-8">
        <Card glass className="flex items-center gap-4 p-4">
          <div className="w-12 h-12 rounded-2xl bg-accent/15 flex items-center justify-center">
            <Shield className="text-accent" size={24} />
          </div>
          <div>
            <p className="font-bold">Protected</p>
            <p className="text-xs text-textMuted">KYC · PIN · Wallet freeze ready</p>
          </div>
          <Badge variant="success" className="ml-auto">Strong</Badge>
        </Card>

        <div>
          <p className="text-xs font-bold text-textMuted uppercase tracking-wide px-1 mb-2">Access</p>
          <Card className="p-0 overflow-hidden divide-y divide-white/5">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center"><Fingerprint size={16} /></div>
                <div><p className="text-sm font-semibold">Biometrics</p><p className="text-xs text-textMuted">Face ID / Touch ID</p></div>
              </div>
              <Switch checked={bio} onChange={setBio} />
            </div>
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-white/5 text-textMuted flex items-center justify-center"><Lock size={16} /></div>
                <div><p className="text-sm font-semibold">App Lock</p><p className="text-xs text-textMuted">Require PIN on open</p></div>
              </div>
              <Switch checked={appLock} onChange={(v) => { setAppLock(v); if (v) navigate('/app-lock'); }} />
            </div>
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-white/5 text-textMuted flex items-center justify-center"><Key size={16} /></div>
                <div><p className="text-sm font-semibold">Two-factor auth</p><p className="text-xs text-textMuted">Authenticator app</p></div>
              </div>
              <Switch checked={twoFa} onChange={(v) => { setTwoFa(v); showToast(v ? '2FA enabled' : '2FA disabled', 'success'); }} />
            </div>
          </Card>
        </div>

        <div>
          <p className="text-xs font-bold text-textMuted uppercase tracking-wide px-1 mb-2">Wallet</p>
          <Card className="p-0 overflow-hidden divide-y divide-white/5">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-danger/10 text-danger flex items-center justify-center"><Snowflake size={16} /></div>
                <div><p className="text-sm font-semibold">Freeze wallet</p><p className="text-xs text-textMuted">Block outgoing transfers</p></div>
              </div>
              <Switch checked={!!isFrozen} onChange={toggleFreeze} disabled={freezing} />
            </div>
            <Row icon={Smartphone} title="Trusted devices" desc="Manage sessions" onClick={() => showToast('Demo: devices list', 'info')} />
            <Row icon={Eye} title="Privacy controls" onClick={() => navigate('/privacy')} />
            <Row icon={AlertTriangle} title="Report suspicious activity" danger onClick={() => navigate('/support')} />
          </Card>
        </div>
      </div>
    </div>
  );
};

export const AppLock = () => {
  const navigate = useNavigate();
  const [pin, setPin] = useState('');
  const { showToast } = useToast();

  return (
    <div className="flex flex-col h-full bg-bgDark px-6 pt-safe pb-safe items-center justify-center animate-page">
      <div className="w-20 h-20 rounded-3xl bg-primary/15 border border-primary/25 flex items-center justify-center mb-8">
        <Lock className="text-primary" size={36} />
      </div>
      <h1 className="text-2xl font-extrabold text-white mb-2">NexPay Locked</h1>
      <p className="text-sm text-textMuted mb-8">Enter your 4-digit PIN</p>
      <input
        type="password"
        inputMode="numeric"
        maxLength={4}
        value={pin}
        onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
        className="w-40 h-14 rounded-2xl border border-white/10 bg-white/5 text-center text-2xl font-bold tracking-[0.5em] text-white focus:border-primary focus:outline-none mb-8"
        aria-label="PIN"
      />
      <Button size="lg" className="w-full max-w-xs font-bold h-14" disabled={pin.length < 4} onClick={() => {
        showToast('Unlocked', 'success');
        navigate('/home');
      }}>Unlock</Button>
      <button className="mt-4 text-sm text-primary font-semibold" onClick={() => showToast('Use biometrics', 'info')}>
        <Fingerprint size={16} className="inline mr-1" /> Use biometrics
      </button>
    </div>
  );
};
