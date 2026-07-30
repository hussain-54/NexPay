import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield, Key, HelpCircle, LogOut, ChevronRight, Copy, ExternalLink,
  Snowflake, User, CreditCard, Gift, Crown, Lock, FileText, Bell, Database
} from 'lucide-react';
import { Button, Card, Switch, Avatar, Badge, ScreenHeader } from '../components/ui';
import { useStore } from '../store/useStore';
import { useToast } from '../contexts/ToastContext';
import { useSolanaWallet } from '../hooks/useSolanaWallet';
import { PROGRAM_ID } from '../lib/solana';
import { setWalletFrozen } from '../lib/nexpay-sdk';
import { WalletGuard } from '../components/WalletGuard';

export const Settings = () => {
  const navigate = useNavigate();
  const { user, logout } = useStore();
  const { showToast } = useToast();
  const { disconnect, userAccount, refreshUserAccount, walletAdapter } = useSolanaWallet();
  
  const [isFrozen, setIsFrozen] = useState(false);
  const [isFreezing, setIsFreezing] = useState(false);

  useEffect(() => {
    if (userAccount) setIsFrozen(userAccount.isFrozen);
  }, [userAccount]);

  const handleLogout = () => {
    disconnect();
    logout();
    navigate('/onboarding');
  };

  const handleFreezeToggle = async () => {
    if (!walletAdapter) return;
    const newFrozenState = !isFrozen;
    if (newFrozenState && !window.confirm("This will prevent all outgoing transfers. Continue?")) return;
    
    setIsFreezing(true);
    try {
      await setWalletFrozen(walletAdapter, newFrozenState);
      await refreshUserAccount();
      setIsFrozen(newFrozenState);
      showToast(newFrozenState ? "Wallet frozen" : "Wallet unfrozen", "success");
    } catch (e) {
      showToast(`Failed to toggle freeze: ${e.message}`, "error");
    } finally {
      setIsFreezing(false);
    }
  };

  const tierName = userAccount ? ['Free', 'Pro', 'Business'][userAccount.tier] : 'Free';

  return (
    <WalletGuard>
      <div className="flex flex-col h-full bg-bgDark animate-page">
        <ScreenHeader title="Settings" />

        <div className="flex-1 overflow-y-auto p-4 space-y-5 pb-8 max-w-lg mx-auto w-full">
          <Card glass interactive className="flex flex-col space-y-4" onClick={() => navigate('/profile')}>
            <div className="flex items-center space-x-4">
              <Avatar name={user?.name || userAccount?.username} size="lg" />
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-textPrimary truncate">{user?.name || userAccount?.username || 'User'}</h2>
                <div className="flex items-center mt-1 gap-2">
                  <Badge variant={user?.kycVerified || userAccount?.kycVerified ? 'success' : 'warning'}>
                    {user?.kycVerified || userAccount?.kycVerified ? 'Verified' : 'Complete KYC'}
                  </Badge>
                  <Badge variant="primary">{user?.tier || tierName}</Badge>
                </div>
              </div>
              <ChevronRight size={18} className="text-textMuted" />
            </div>
            
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/5 text-sm">
              <div>
                <p className="text-[10px] text-textMuted uppercase tracking-wide">Email</p>
                <p className="font-semibold truncate">{user?.email || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] text-textMuted uppercase tracking-wide">Phone</p>
                <p className="font-semibold truncate">{user?.phone || '—'}</p>
              </div>
            </div>
          </Card>

          <Section title="Account">
            <SettingLink icon={User} title="Profile" desc="Personal details" onClick={() => navigate('/profile')} />
            <SettingLink icon={Crown} title="Premium" desc="Upgrade limits & perks" onClick={() => navigate('/premium')} />
            <SettingLink icon={CreditCard} title="Cards" desc="Virtual card management" onClick={() => navigate('/cards')} />
            <SettingLink icon={Gift} title="Referrals & Rewards" desc="Invite friends" onClick={() => navigate('/referral')} />
          </Section>

          <Section title="Security">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-full bg-danger/10 text-danger flex items-center justify-center">
                  <Snowflake size={16} />
                </div>
                <div>
                  <p className="font-medium text-sm">Freeze Wallet</p>
                  <p className="text-xs text-textMuted">Block outgoing transfers</p>
                </div>
              </div>
              <Switch checked={isFrozen} onChange={handleFreezeToggle} disabled={isFreezing} />
            </div>
            <SettingLink icon={Shield} title="Security Center" desc="PIN, biometrics, 2FA" onClick={() => navigate('/security')} />
            <SettingLink icon={Lock} title="App Lock" desc="Require PIN on open" onClick={() => navigate('/app-lock')} />
            <SettingLink icon={Key} title="Account Limits" desc="Daily & monthly caps" onClick={() => navigate('/limits')} />
          </Section>

          <Section title="Support">
            <SettingLink icon={Database} title="Database Lab" desc="Supabase connection & articles" onClick={() => navigate('/database')} />
            <SettingLink icon={Bell} title="Notifications" onClick={() => navigate('/notifications')} />
            <SettingLink icon={HelpCircle} title="Help Center" onClick={() => navigate('/help')} />
            <SettingLink icon={FileText} title="Privacy & Terms" onClick={() => navigate('/privacy')} />
          </Section>

          <Section title="About">
            <Card className="space-y-3 !rounded-none !border-0 !shadow-none !bg-transparent !p-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-textMuted">Program ID</span>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(PROGRAM_ID.toString());
                    showToast("Program ID copied!", "success");
                  }} 
                  className="font-mono text-xs text-textPrimary flex items-center"
                >
                  {PROGRAM_ID.toString().slice(0,8)}… <Copy size={12} className="ml-1 text-textMuted" />
                </button>
              </div>
              <div className="pt-2 border-t border-white/5 flex justify-between items-center">
                <span className="text-sm text-textMuted">Network</span>
                <span className="text-sm font-bold">Solana Devnet</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full justify-start pl-0 text-primary"
                onClick={() => window.open(`https://explorer.solana.com/address/${PROGRAM_ID.toString()}?cluster=devnet`, '_blank')}
              >
                <ExternalLink size={16} className="mr-2" /> View on Explorer
              </Button>
            </Card>
          </Section>

          <Button variant="ghost" className="w-full text-danger hover:bg-danger/10 hover:text-danger" onClick={handleLogout}>
            <LogOut size={18} className="mr-2" /> Disconnect & Log out
          </Button>
        </div>
      </div>
    </WalletGuard>
  );
};

const Section = ({ title, children }) => (
  <div className="space-y-2">
    <h3 className="text-xs font-bold text-textMuted uppercase tracking-wide px-2">{title}</h3>
    <Card className="p-0 overflow-hidden divide-y divide-white/5">{children}</Card>
  </div>
);

const SettingLink = ({ icon: Icon, title, desc, onClick }) => (
  <button onClick={onClick} className="w-full flex items-center justify-between p-4 hover:bg-white/[0.03] transition-colors text-left">
    <div className="flex items-center space-x-3">
      <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-textMuted">
        <Icon size={16} />
      </div>
      <div>
        <p className="font-medium text-sm">{title}</p>
        {desc && <p className="text-xs text-textMuted">{desc}</p>}
      </div>
    </div>
    <ChevronRight size={18} className="text-textMuted" />
  </button>
);
