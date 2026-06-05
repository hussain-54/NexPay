import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, RefreshCcw, Search, Plus, Fingerprint, CheckCircle2, Copy, Share, ExternalLink } from 'lucide-react';
import { Button, Input, Card, Select } from '../components/ui';
import { useToast } from '../contexts/ToastContext';
import { useSolanaWallet } from '../hooks/useSolanaWallet';
import { transferStablecoin, fetchUserAccount, explorerLink } from '../lib/nexpay-sdk';
import { PublicKey } from '@solana/web3.js';
import { WalletGuard } from '../components/WalletGuard';
import { useUsdcBalance } from '../hooks/useUsdcBalance';
import { logTransactionToFirebase } from '../lib/firebase';

export const SendMoney = () => {
  const [step, setStep] = useState(1);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('pkr');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [recipientUser, setRecipientUser] = useState(null);
  const [addressError, setAddressError] = useState('');
  
  const [isConfirming, setIsConfirming] = useState(false);
  const [txSignature, setTxSignature] = useState('');
  const [txFee, setTxFee] = useState(0);
  const [txNet, setTxNet] = useState(0);

  const [rates, setRates] = useState({ pkr: 278.5, aed: 3.67, gbp: 0.79, eur: 0.92 });
  const [loadingRates, setLoadingRates] = useState(true);
  const [amountError, setAmountError] = useState('');

  const navigate = useNavigate();
  const { showToast } = useToast();
  const { walletAdapter, refreshBalances, refreshUserAccount, connected } = useSolanaWallet();
  const { balance: usdcBalance } = useUsdcBalance();

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=usd-coin&vs_currencies=pkr,aed,gbp,eur");
        const data = await res.json();
        if (data['usd-coin']) {
          setRates(data['usd-coin']);
        }
      } catch (e) {
        console.error("Failed to fetch rates", e);
      } finally {
        setLoadingRates(false);
      }
    };
    fetchRates();
  }, []);

  const numAmount = parseFloat(amount || 0);
  const fee = numAmount * 0.001;
  const netAmount = numAmount - fee;
  const receivedAmount = netAmount * (rates[currency] || 1);

  const validateStep1 = () => {
    if (!amount) {
      setAmountError("This field is required");
      return false;
    }
    if (numAmount <= 0) {
      setAmountError("Amount must be greater than 0");
      return false;
    }
    if (numAmount > usdcBalance) {
      setAmountError(`Insufficient balance. You have ${usdcBalance} USDC`);
      return false;
    }
    setAmountError('');
    return true;
  };

  const handleAddressCheck = async () => {
    try {
      new PublicKey(recipientAddress);
      setAddressError('');
    } catch {
      setAddressError('Invalid Solana address');
      return;
    }

    try {
      const acc = await fetchUserAccount({ publicKey: new PublicKey(recipientAddress) });
      setRecipientUser(acc);
      if (!acc) {
        showToast("This address is not a registered NexPay user. Proceed with caution.", "warning");
      }
      setStep(3);
    } catch {
      setStep(3);
    }
  };

  const handleConfirm = async () => {
    if (!connected || !walletAdapter?.publicKey) {
      showToast("Please connect your Phantom or Solflare wallet first.", "error");
      return;
    }
    if (!walletAdapter.signTransaction || !walletAdapter.signAllTransactions) {
      showToast("Wallet does not support signing. Please reconnect.", "error");
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      showToast("Enter a valid amount.", "error");
      return;
    }

    let recipientPubkey;
    try {
      recipientPubkey = new PublicKey(recipientAddress);
    } catch {
      showToast("Invalid Solana recipient address.", "error");
      return;
    }

    setIsConfirming(true);
    try {
      const res = await transferStablecoin(
        walletAdapter,
        recipientPubkey,
        numAmount,
        currency.toUpperCase(),
        ""
      );
      setTxSignature(res.signature);
      setTxFee(res.fee);
      setTxNet(res.netAmount);
      
      // Log transaction details to Firebase Firestore for data collection
      try {
        await logTransactionToFirebase({
          signature: res.signature,
          senderAddress: walletAdapter.publicKey.toString(),
          recipientAddress: recipientPubkey.toString(),
          amount: numAmount,
          currency: currency.toUpperCase(),
          fee: res.fee,
          timestamp: Math.floor(Date.now() / 1000)
        });
      } catch (logErr) {
        console.error("Failed to log transaction data to Firebase:", logErr);
      }
      
      refreshBalances();
      refreshUserAccount();
      setStep(4);
    } catch (err) {
      const msg = err.message || "";
      if (msg.includes("KycRequired")) showToast("KYC verification required. Please complete KYC.", "error");
      else if (msg.includes("InsufficientFunds")) showToast("Insufficient USDC balance.", "error");
      else if (msg.includes("WalletFrozen")) showToast("Your wallet is frozen. Unfreeze in Settings.", "error");
      else if (msg.includes("TierLimitExceeded")) showToast("Amount exceeds your tier limit. Upgrade to Pro.", "error");
      else showToast(msg, "error");
    } finally {
      setIsConfirming(false);
    }
  };

  const copyHash = () => {
    navigator.clipboard.writeText(txSignature);
    showToast("Hash copied to clipboard!", "success");
  };

  return (
    <WalletGuard>
      <div className="flex flex-col h-full bg-bgDark">
        <div className="flex items-center p-4 border-b border-borderDark relative">
          {step < 4 && (
            <button onClick={() => step > 1 ? setStep(step - 1) : navigate('/')} className="p-2 -ml-2 rounded-full hover:bg-white/5 transition-colors">
              <ChevronLeft size={24} />
            </button>
          )}
          <h1 className="text-lg font-bold flex-1 text-center pr-8">{step === 4 ? 'Success' : 'Send Money'}</h1>
        </div>

        {step < 4 && (
          <div className="w-full h-1 bg-white/10">
            <div className="h-full bg-primary transition-all" style={{ width: `${(step / 3) * 100}%` }} />
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 flex flex-col">
          {step === 1 && (
            <div className="flex flex-col flex-1 space-y-6">
              <div>
                <label className="text-sm text-textMuted mb-2 block">You send</label>
                <div className="flex space-x-2">
                  <div className="w-24">
                    <Select options={[{label:'USDC', value:'USDC'}]} defaultValue="USDC" disabled className="bg-transparent shadow-none" />
                  </div>
                  <div className="flex-1">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="font-mono text-xl"
                      error={amountError}
                    />
                  </div>
                </div>
                {amount && <p className="text-xs text-textMuted mt-2">Fee: 0.1% = {fee.toFixed(6)} USDC</p>}
              </div>

              <div className="flex justify-center -my-2 relative z-10">
                <div className="w-8 h-8 rounded-full bg-bgDark border border-borderDark flex items-center justify-center">
                  <RefreshCcw size={14} className="text-primary" />
                </div>
              </div>

              <div>
                <label className="text-sm text-textMuted mb-2 block">They receive</label>
                <div className="flex space-x-2">
                  <div className="w-28">
                    <Select 
                      value={currency} 
                      onChange={(e) => setCurrency(e.target.value)}
                      options={Object.keys(rates).map(c => ({ label: c.toUpperCase(), value: c }))}
                      className="bg-transparent shadow-none"
                    />
                  </div>
                  <Input
                    type="text"
                    readOnly
                    value={amount ? receivedAmount.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '0.00'}
                    className="font-mono text-xl bg-transparent shadow-none"
                  />
                </div>
                <div className="flex justify-between items-center mt-2">
                  {loadingRates ? (
                    <div className="h-3 w-32 bg-borderDark animate-pulse rounded" />
                  ) : (
                    <p className="text-xs text-textMuted">1 USDC = {rates[currency]} {currency.toUpperCase()}</p>
                  )}
                  <RefreshCcw size={12} className="text-textMuted" />
                </div>
              </div>

              <div className="mt-auto pt-6">
                <Button onClick={() => { if(validateStep1()) setStep(2); }} size="lg" className="w-full">Continue</Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col flex-1 space-y-6">
              <Input 
                label="Recipient Solana Address"
                placeholder="Enter base58 address" 
                value={recipientAddress}
                onChange={e => setRecipientAddress(e.target.value)}
                error={addressError}
              />

              <div className="mt-auto pt-6">
                <Button onClick={handleAddressCheck} size="lg" className="w-full" disabled={!recipientAddress}>Verify & Continue</Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col flex-1">
              <Card className="space-y-4">
                <div className="flex justify-between items-center border-b border-borderDark pb-4">
                  <span className="text-textMuted">You send</span>
                  <span className="font-mono text-lg">{numAmount.toFixed(2)} USDC</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-textMuted">Fee (0.1%)</span>
                  <span className="font-mono">{fee.toFixed(6)} USDC</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-textMuted">Rate</span>
                  <span className="font-mono">1 USDC = {rates[currency]} {currency.toUpperCase()}</span>
                </div>
                <div className="flex justify-between items-center border-t border-borderDark pt-4">
                  <span className="text-textMuted">They receive</span>
                  <span className="font-mono text-lg text-accent">{receivedAmount.toLocaleString('en-US', { maximumFractionDigits: 2 })} {currency.toUpperCase()}</span>
                </div>
              </Card>

              <Card className="mt-4">
                <p className="text-sm text-textMuted mb-2">Recipient</p>
                {recipientUser ? (
                  <p className="font-bold text-primary">{recipientUser.username}</p>
                ) : (
                  <p className="font-mono text-sm break-all">{recipientAddress}</p>
                )}
              </Card>

              <div className="mt-auto pt-6 flex flex-col items-center space-y-4">
                {isConfirming ? (
                  <div className="w-20 h-20 flex items-center justify-center bg-primary/20 rounded-full">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <button 
                    onClick={handleConfirm}
                    disabled={isConfirming}
                    className="w-20 h-20 bg-primary hover:bg-primary/90 rounded-full flex flex-col items-center justify-center text-white shadow-[0_0_20px_rgba(124,58,237,0.4)] transition-all transform active:scale-95 disabled:opacity-50"
                  >
                    <Fingerprint size={32} />
                  </button>
                )}
                <p className="text-sm text-textMuted">Tap to confirm and sign transaction</p>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="flex flex-col flex-1 items-center justify-center text-center animate-slide-in">
              <div className="w-24 h-24 rounded-full bg-accent/20 flex items-center justify-center mb-6 animate-success">
                <CheckCircle2 size={48} className="text-accent" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Transaction Successful!</h2>
              <p className="text-textMuted mb-6">{receivedAmount.toLocaleString('en-US', { maximumFractionDigits: 2 })} {currency.toUpperCase()} sent.</p>
              
              <Card className="w-full flex flex-col space-y-2 p-3 mb-8">
                <div className="flex justify-between items-center w-full">
                  <div className="text-left">
                    <p className="text-xs text-textMuted">Transaction Signature</p>
                    <p className="font-mono text-sm">{txSignature.slice(0, 16)}...</p>
                  </div>
                  <div className="flex space-x-2">
                    <button onClick={copyHash} className="p-2 rounded hover:bg-borderDark text-textMuted">
                      <Copy size={16} />
                    </button>
                    <button onClick={() => window.open(explorerLink(txSignature), '_blank')} className="p-2 rounded hover:bg-borderDark text-textMuted">
                      <ExternalLink size={16} />
                    </button>
                  </div>
                </div>
                <div className="flex justify-between items-center text-xs text-textMuted pt-2 border-t border-borderDark">
                  <span>Net: {txNet} USDC</span>
                  <span>Fee: {txFee} USDC</span>
                </div>
              </Card>

              <div className="w-full space-y-3 mt-auto">
                <Button variant="secondary" size="lg" className="w-full">
                  <Share size={18} className="mr-2" /> Share Receipt
                </Button>
                <div className="flex space-x-3">
                  <Button variant="secondary" size="lg" className="flex-1" onClick={() => { setStep(1); setAmount(''); }}>Send Again</Button>
                  <Button size="lg" className="flex-1" onClick={() => navigate('/')}>Done</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </WalletGuard>
  );
};
