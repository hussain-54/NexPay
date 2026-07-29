import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Share, Copy, ExternalLink, Home } from 'lucide-react';
import { Button, Card, StatusAnimation } from '../components/ui';
import { useToast } from '../contexts/ToastContext';
import { explorerLink } from '../lib/nexpay-sdk';

export const TransactionSuccess = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { showToast } = useToast();
  const amount = state?.amount || '0.00';
  const currency = state?.currency || 'USDC';
  const signature = state?.signature || '';

  return (
    <div className="flex flex-col h-full bg-bgDark px-6 pt-safe pb-safe animate-page">
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <StatusAnimation type="success" size={120} />
        <h1 className="text-2xl font-extrabold text-white mt-8 mb-2">Payment sent</h1>
        <p className="text-textMuted mb-6">{amount} {currency} delivered successfully</p>
        {signature && (
          <Card glass className="w-full mb-6">
            <div className="flex justify-between items-center">
              <div className="text-left">
                <p className="text-[10px] text-textMuted uppercase tracking-wide">Signature</p>
                <p className="font-mono text-sm">{signature.slice(0, 18)}…</p>
              </div>
              <div className="flex gap-1">
                <button aria-label="Copy" onClick={() => { navigator.clipboard.writeText(signature); showToast('Copied', 'success'); }} className="p-2 rounded-xl hover:bg-white/5"><Copy size={16} className="text-textMuted" /></button>
                <button aria-label="Explorer" onClick={() => window.open(explorerLink(signature), '_blank')} className="p-2 rounded-xl hover:bg-white/5"><ExternalLink size={16} className="text-textMuted" /></button>
              </div>
            </div>
          </Card>
        )}
      </div>
      <div className="space-y-3 pb-6">
        <Button variant="secondary" size="lg" className="w-full"><Share size={18} className="mr-2" /> Share receipt</Button>
        <div className="flex gap-3">
          <Button variant="secondary" size="lg" className="flex-1" onClick={() => navigate('/send')}>Send again</Button>
          <Button size="lg" className="flex-1" onClick={() => navigate('/home')}><Home size={16} className="mr-1" /> Home</Button>
        </div>
      </div>
    </div>
  );
};

export const TransactionFailed = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const message = state?.message || 'Something went wrong while processing your transfer.';

  return (
    <div className="flex flex-col h-full bg-bgDark px-6 pt-safe pb-safe animate-page">
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <StatusAnimation type="error" size={120} />
        <h1 className="text-2xl font-extrabold text-white mt-8 mb-2">Transfer failed</h1>
        <p className="text-textMuted mb-8 max-w-[280px]">{message}</p>
      </div>
      <div className="space-y-3 pb-6">
        <Button size="lg" className="w-full" onClick={() => navigate('/send')}>Try again</Button>
        <Button variant="ghost" size="lg" className="w-full" onClick={() => navigate('/support')}>Contact support</Button>
      </div>
    </div>
  );
};
