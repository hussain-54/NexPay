import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDownUp, RefreshCcw, TrendingUp } from 'lucide-react';
import { Button, Card, ScreenHeader, Select, Skeleton } from '../components/ui';

const FALLBACK = { pkr: 278.5, aed: 3.67, gbp: 0.79, eur: 0.92, mxn: 17.2 };

export const CurrencyConverter = () => {
  const navigate = useNavigate();
  const [rates, setRates] = useState(FALLBACK);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState('usd');
  const [to, setTo] = useState('pkr');
  const [amount, setAmount] = useState('100');

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=usd-coin&vs_currencies=pkr,aed,gbp,eur,mxn');
      const data = await res.json();
      if (data['usd-coin']) setRates(data['usd-coin']);
    } catch { /* keep fallback */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const opts = [
    { value: 'usd', label: 'USD / USDC' },
    ...Object.keys(rates).map(c => ({ value: c, label: c.toUpperCase() })),
  ];

  const toUsd = (val, cur) => (cur === 'usd' ? val : val / (rates[cur] || 1));
  const fromUsd = (val, cur) => (cur === 'usd' ? val : val * (rates[cur] || 1));
  const result = fromUsd(toUsd(parseFloat(amount || 0), from), to);

  return (
    <div className="flex flex-col h-full bg-bgDark">
      <ScreenHeader title="Converter" onBack={() => navigate(-1)} right={
        <button onClick={load} aria-label="Refresh" className="p-2 rounded-full hover:bg-white/5"><RefreshCcw size={18} className={loading ? 'animate-spin text-primary' : 'text-textMuted'} /></button>
      } />
      <div className="flex-1 p-6 space-y-4 max-w-sm mx-auto w-full animate-page">
        <Card glass className="space-y-4 p-5 rounded-3xl">
          <div>
            <p className="text-xs text-textMuted mb-2">You have</p>
            <div className="flex gap-2">
              <Select value={from} onChange={e => setFrom(e.target.value)} options={opts} className="w-28" />
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="flex-1 bg-transparent text-right font-mono text-3xl font-bold focus:outline-none text-white" />
            </div>
          </div>
          <div className="flex justify-center">
            <button onClick={() => { setFrom(to === 'usd' ? 'pkr' : to); setTo(from === 'usd' ? 'pkr' : from); }} className="w-10 h-10 rounded-xl bg-bgDark border border-borderDark flex items-center justify-center hover:bg-white/5">
              <ArrowDownUp size={16} className="text-primary" />
            </button>
          </div>
          <div>
            <p className="text-xs text-textMuted mb-2">You get</p>
            <div className="flex gap-2 items-center">
              <Select value={to} onChange={e => setTo(e.target.value)} options={opts} className="w-28" />
              <p className="flex-1 text-right font-mono text-3xl font-bold text-accent">{loading ? '—' : result.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
            </div>
          </div>
        </Card>
        <Button size="lg" className="w-full font-bold h-14" onClick={() => navigate('/send')}>Send with this rate</Button>
      </div>
    </div>
  );
};

export const ExchangeRates = () => {
  const navigate = useNavigate();
  const [rates, setRates] = useState(FALLBACK);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('https://api.coingecko.com/api/v3/simple/price?ids=usd-coin&vs_currencies=pkr,aed,gbp,eur,mxn')
      .then(r => r.json())
      .then(d => { if (d['usd-coin']) setRates(d['usd-coin']); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const flags = { pkr: '🇵🇰', aed: '🇦🇪', gbp: '🇬🇧', eur: '🇪🇺', mxn: '🇲🇽' };

  return (
    <div className="flex flex-col h-full bg-bgDark">
      <ScreenHeader title="Exchange Rates" onBack={() => navigate(-1)} />
      <div className="flex-1 overflow-y-auto p-6 space-y-3 max-w-sm mx-auto w-full animate-page">
        <Card glass className="flex items-center gap-3 p-4 mb-2">
          <TrendingUp className="text-accent" size={20} />
          <div>
            <p className="text-sm font-bold">Live mid-market rates</p>
            <p className="text-xs text-textMuted">1 USDC base · updates frequently</p>
          </div>
        </Card>
        {loading
          ? [1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 w-full" />)
          : Object.entries(rates).map(([cur, rate]) => (
            <Card key={cur} interactive className="flex justify-between items-center" onClick={() => navigate('/converter')}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{flags[cur] || '💱'}</span>
                <div>
                  <p className="font-bold">{cur.toUpperCase()}</p>
                  <p className="text-xs text-textMuted">vs USDC</p>
                </div>
              </div>
              <p className="font-mono font-bold text-lg">{Number(rate).toLocaleString()}</p>
            </Card>
          ))}
      </div>
    </div>
  );
};
