import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Gift, Users, Trophy, MessageCircle, HelpCircle, Shield, FileText,
  User, Gauge, Crown, Copy, ChevronRight, Send
} from 'lucide-react';
import { Button, Card, ScreenHeader, Avatar, Badge, Skeleton } from '../components/ui';
import { useStore } from '../store/useStore';
import { useToast } from '../contexts/ToastContext';
import { useSolanaWallet } from '../hooks/useSolanaWallet';
import { WalletGuard } from '../components/WalletGuard';
import { fetchArticles } from '../lib/supabaseDb';

const Shell = ({ title, children, back = true }) => {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col h-full bg-bgDark animate-page">
      <ScreenHeader title={title} onBack={back ? () => navigate(-1) : undefined} />
      <div className="flex-1 overflow-y-auto p-6 space-y-4 max-w-sm mx-auto w-full pb-8">{children}</div>
    </div>
  );
};

export const Referral = () => {
  const { showToast } = useToast();
  const { user } = useStore();
  const code = user?.referralCode || 'NEXPAY2026';

  return (
    <Shell title="Referrals">
      <Card glass className="text-center p-6 space-y-3">
        <Gift className="mx-auto text-primary" size={36} />
        <h2 className="text-xl font-bold">Invite friends, earn $5</h2>
        <p className="text-sm text-textMuted">Share your code. You both get USDC when they complete their first send.</p>
        <p className="font-mono text-lg font-bold text-primary py-3 px-4 bg-primary/10 rounded-2xl">{code}</p>
        <Button className="w-full" onClick={() => { navigator.clipboard.writeText(code); showToast('Referral code copied', 'success'); }}>
          <Copy size={16} className="mr-2" /> Copy code
        </Button>
      </Card>
      <Button variant="secondary" className="w-full" onClick={() => showToast('Share sheet opened', 'info')}>
        <Send size={16} className="mr-2" /> Share invite link
      </Button>
    </Shell>
  );
};

export const InviteFriends = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  return (
    <Shell title="Invite Friends">
      <Card className="space-y-4">
        <p className="text-sm text-textMuted">Send a personal invite via message or email.</p>
        <Button className="w-full" onClick={() => showToast('Invite sent', 'success')}>Send invites</Button>
        <Button variant="ghost" className="w-full" onClick={() => navigate('/referral')}>View referral code</Button>
      </Card>
    </Shell>
  );
};

export const Rewards = () => (
  <Shell title="Rewards">
    <Card glass className="flex items-center gap-4">
      <Trophy className="text-warning shrink-0" size={32} />
      <div>
        <p className="font-bold">$12.50 pending</p>
        <p className="text-xs text-textMuted">From referrals and cashback</p>
      </div>
      <Badge variant="success" className="ml-auto">Active</Badge>
    </Card>
    <Card className="p-0 divide-y divide-white/5">
      {['Referral bonus — $5.00', 'Send cashback — $2.50', 'Welcome reward — $5.00'].map((row) => (
        <div key={row} className="flex justify-between p-4 text-sm">
          <span>{row.split(' — ')[0]}</span>
          <span className="font-mono text-accent">{row.split(' — ')[1]}</span>
        </div>
      ))}
    </Card>
  </Shell>
);

export const SupportChat = () => {
  const [msg, setMsg] = useState('');
  const { showToast } = useToast();
  return (
    <Shell title="Support">
      <Card glass className="min-h-[280px] flex flex-col">
        <div className="flex-1 space-y-3 text-sm">
          <div className="bg-white/5 rounded-2xl p-3 max-w-[85%]">
            <p className="text-textMuted text-[10px] mb-1">NexPay Support</p>
            Hi! How can we help with your transfer today?
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <input
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            placeholder="Type a message…"
            className="flex-1 h-11 px-4 rounded-2xl bg-black/30 border border-white/10 text-sm focus:outline-none focus:border-primary"
          />
          <Button onClick={() => { if (msg.trim()) { showToast('Message sent', 'success'); setMsg(''); } }}>Send</Button>
        </div>
      </Card>
    </Shell>
  );
};

export const HelpCenter = () => {
  const navigate = useNavigate();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const fallback = [
    { q: 'How fast are transfers?', a: 'Solana settles in under a second.' },
    { q: 'What is the fee?', a: '0.1% flat on sends.' },
    { q: 'Which networks?', a: 'Solana devnet for this demo.' },
  ];

  useEffect(() => {
    fetchArticles()
      .then(setArticles)
      .finally(() => setLoading(false));
  }, []);

  return (
    <Shell title="Help Center">
      {loading ? (
        [1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)
      ) : articles.length > 0 ? (
        articles.map((a) => (
          <Card key={a.id} className="space-y-2">
            <div className="flex justify-between gap-2 items-start">
              <p className="font-semibold flex items-center gap-2">
                <HelpCircle size={16} className="text-primary shrink-0" /> {a.title}
              </p>
              <Badge variant="primary">{a.category}</Badge>
            </div>
            <p className="text-sm text-textMuted">{a.summary || a.body}</p>
          </Card>
        ))
      ) : (
        fallback.map(({ q, a }) => (
          <Card key={q} className="space-y-2">
            <p className="font-semibold flex items-center gap-2"><HelpCircle size={16} className="text-primary" /> {q}</p>
            <p className="text-sm text-textMuted">{a}</p>
          </Card>
        ))
      )}
      <Button variant="secondary" className="w-full" onClick={() => navigate('/database')}>
        Open Database Lab
      </Button>
      <Button variant="secondary" className="w-full" onClick={() => navigate('/support')}>
        <MessageCircle size={16} className="mr-2" /> Chat with support
      </Button>
    </Shell>
  );
};

export const Privacy = () => (
  <Shell title="Privacy Policy">
    <Card className="text-sm text-textMuted space-y-3 leading-relaxed">
      <p>NexPay respects your privacy. We collect account and transaction data necessary to provide remittance services and comply with KYC regulations.</p>
      <p>We do not sell personal data. On-chain transfers are public by nature of the Solana blockchain.</p>
    </Card>
  </Shell>
);

export const Terms = () => (
  <Shell title="Terms of Service">
    <Card className="text-sm text-textMuted space-y-3 leading-relaxed">
      <p>By using NexPay you agree to our fee schedule, acceptable use policy, and regional restrictions.</p>
      <p>Digital asset transfers are irreversible once confirmed on-chain.</p>
    </Card>
  </Shell>
);

export const Profile = () => {
  const navigate = useNavigate();
  const { user } = useStore();
  const { userAccount } = useSolanaWallet();
  return (
    <WalletGuard>
      <Shell title="Profile">
        <div className="flex flex-col items-center gap-3 mb-4">
          <Avatar name={user?.name || userAccount?.username} size="lg" />
          <h2 className="text-xl font-bold">{user?.name || userAccount?.username || 'User'}</h2>
          <Badge variant={user?.kycVerified || userAccount?.kycVerified ? 'success' : 'warning'}>
            {user?.kycVerified || userAccount?.kycVerified ? 'Verified' : 'KYC pending'}
          </Badge>
        </div>
        <Card className="space-y-4 text-sm">
          <div className="flex justify-between"><span className="text-textMuted">Email</span><span className="truncate ml-4">{user?.email || '—'}</span></div>
          <div className="flex justify-between"><span className="text-textMuted">Member since</span><span>Jan 2025</span></div>
          <div className="flex justify-between"><span className="text-textMuted">Referral code</span><span className="text-primary font-bold">{user?.referralCode || 'NEXPAY2026'}</span></div>
        </Card>
        <Button variant="secondary" className="w-full" onClick={() => navigate('/settings')}>
          Account settings <ChevronRight size={16} className="ml-auto" />
        </Button>
      </Shell>
    </WalletGuard>
  );
};

export const AccountLimits = () => {
  const { userAccount } = useSolanaWallet();
  const tier = userAccount?.tier ?? 0;
  const limits = [
    { label: 'Daily send', value: tier >= 1 ? '$10,000' : '$500' },
    { label: 'Monthly volume', value: tier >= 2 ? 'Unlimited' : '$5,000' },
    { label: 'Card spend', value: tier >= 1 ? '$2,000 / day' : 'Not available' },
  ];
  return (
    <Shell title="Account Limits">
      <Card glass className="flex items-center gap-3 mb-2">
        <Gauge className="text-primary" size={28} />
        <div>
          <p className="font-bold">Current tier</p>
          <p className="text-xs text-textMuted">{['Free', 'Pro', 'Business'][tier]}</p>
        </div>
      </Card>
      {limits.map(({ label, value }) => (
        <Card key={label} className="flex justify-between items-center">
          <span className="text-textMuted text-sm">{label}</span>
          <span className="font-semibold">{value}</span>
        </Card>
      ))}
    </Shell>
  );
};

export const PremiumUpgrade = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  return (
    <Shell title="Premium">
      <Card glass className="text-center p-6 space-y-4 border-primary/30">
        <Crown className="mx-auto text-warning" size={40} />
        <h2 className="text-2xl font-extrabold">NexPay Pro</h2>
        <p className="text-sm text-textMuted">Higher limits, virtual cards, and priority support.</p>
        <ul className="text-left text-sm space-y-2 text-textMuted">
          <li className="flex items-center gap-2"><Shield size={14} className="text-accent" /> Enhanced security</li>
          <li className="flex items-center gap-2"><Users size={14} className="text-accent" /> Team features</li>
        </ul>
        <Button size="lg" className="w-full font-bold h-14" onClick={() => showToast('Upgrade flow coming soon', 'info')}>
          Upgrade — $9.99 / mo
        </Button>
        <Button variant="ghost" className="w-full" onClick={() => navigate(-1)}>Maybe later</Button>
      </Card>
    </Shell>
  );
};
