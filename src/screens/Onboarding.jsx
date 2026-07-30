import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Globe, Zap, CheckCircle2, Image as ImageIcon, Camera, Lock, Phone, Shield,
  MapPin, CreditCard, Fingerprint, Bell, Sparkles, User, XCircle, RefreshCcw,
  FileText, Car, ScanFace, PartyPopper
} from 'lucide-react';
import { Button, Input, Card, ProgressBar, Select, StatusAnimation, Avatar } from '../components/ui';
import { useStore } from '../store/useStore';
import { useToast } from '../contexts/ToastContext';
import { useSolanaWallet } from '../hooks/useSolanaWallet';
import { initializeUser, fetchUserAccount } from '../lib/nexpay-sdk';
import { WalletGuard } from '../components/WalletGuard';
import { registerUserInFirebase, loginUserInFirebase } from '../lib/firebase';
import { isSupabaseActive, registerUserInSupabase, loginUserInSupabase } from '../lib/supabaseDb';

const slides = [
  { icon: Globe, title: "Send money to 150+ countries", text: "Global USDC transfers at your fingertips." },
  { icon: Zap, title: "Settle in under 1 second", text: "Powered by Solana, USDC and USDT." },
  { icon: CheckCircle2, title: "0.1% flat fee. No surprises.", text: "Keep more of what you earn." }
];

const KYC_TOTAL = 16; // progress steps after signup (phone → complete)

const Shell = ({ children, title, onBack, progress, progressLabel }) => (
  <div className="flex flex-col h-full bg-bgDark pt-safe pb-safe">
    <div className="flex items-center px-4 py-4 border-b border-white/5 relative shrink-0">
      {onBack ? (
        <button onClick={onBack} aria-label="Go back" className="p-2 -ml-2 rounded-full hover:bg-white/5 transition-colors">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      ) : <div className="w-10" />}
      <h1 className="text-lg font-bold flex-1 text-center pr-8 text-white tracking-tight">{title}</h1>
    </div>
    {progress != null && (
      <div className="px-6 pt-4">
        <ProgressBar step={progress} total={KYC_TOTAL} labels={[progressLabel]} />
      </div>
    )}
    <div className="flex-1 px-6 py-6 overflow-y-auto no-scrollbar w-full max-w-sm mx-auto flex flex-col animate-page">
      {children}
    </div>
  </div>
);

const UploadCard = ({ id, preview, label, sub, icon: Icon, onChange }) => (
  <label htmlFor={id} className="block cursor-pointer">
    <input type="file" accept="image/*" capture={id.includes('selfie') ? 'user' : 'environment'} id={id} className="hidden" onChange={onChange} />
    <Card className={`border-dashed border-2 flex flex-col items-center justify-center p-6 transition-all rounded-3xl h-44 relative overflow-hidden ${preview ? 'border-primary/60 bg-primary/5' : 'border-white/10 bg-black/20 hover:border-primary/40'}`}>
      {preview ? (
        <div className="absolute inset-0">
          <img src={preview} alt={label} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
            <span className="text-xs text-white font-bold">Tap to change</span>
          </div>
        </div>
      ) : (
        <>
          <Icon className="w-10 h-10 text-textMuted mb-2" />
          <p className="font-semibold text-white text-sm">{label}</p>
          <p className="text-[11px] text-textMuted mt-1">{sub}</p>
        </>
      )}
    </Card>
  </label>
);

export const Onboarding = () => {
  const [step, setStep] = useState('slides');
  const [slideIndex, setSlideIndex] = useState(0);

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef([]);

  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [nationality, setNationality] = useState('US');
  const [gender, setGender] = useState('');

  const [country, setCountry] = useState('US');
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [streetAddress, setStreetAddress] = useState('');

  const [idType, setIdType] = useState('');
  const [idFront, setIdFront] = useState('');
  const [idBack, setIdBack] = useState('');
  const [selfie, setSelfie] = useState('');
  const [matchProgress, setMatchProgress] = useState(0);
  const [kycOutcome, setKycOutcome] = useState('approved'); // approved | rejected for demo paths

  const [pin, setPin] = useState(['', '', '', '']);
  const [pinConfirm, setPinConfirm] = useState(['', '', '', '']);
  const [pinPhase, setPinPhase] = useState('create');
  const pinRefs = useRef([]);

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useStore();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { walletAdapter, connected } = useSolanaWallet();

  useEffect(() => {
    if (connected && walletAdapter) {
      fetchUserAccount(walletAdapter).then(acc => {
        if (acc) {
          login({ name: acc.username, email: 'connected@wallet', tier: ['Free', 'Pro', 'Business'][acc.tier] || 'Free' });
          navigate('/');
        }
      }).catch(console.error);
    }
  }, [connected, walletAdapter]);

  useEffect(() => {
    if (step !== 'faceMatch') return;
    setMatchProgress(0);
    const t = setInterval(() => {
      setMatchProgress(p => {
        if (p >= 100) {
          clearInterval(t);
          setTimeout(() => setStep('kycReview'), 400);
          return 100;
        }
        return p + 8;
      });
    }, 180);
    return () => clearInterval(t);
  }, [step]);

  useEffect(() => {
    if (step !== 'kycReview') return;
    const t = setTimeout(() => {
      setStep(kycOutcome === 'rejected' ? 'kycRejected' : 'kycApproved');
    }, 2200);
    return () => clearTimeout(t);
  }, [step, kycOutcome]);

  const handleFileChange = (e, target) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (target === 'front') setIdFront(reader.result);
      if (target === 'back') setIdBack(reader.result);
      if (target === 'selfie') setSelfie(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[index] = value.slice(-1);
    setOtp(next);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handlePinChange = (index, value, isConfirm) => {
    if (!/^\d*$/.test(value)) return;
    const arr = isConfirm ? [...pinConfirm] : [...pin];
    arr[index] = value.slice(-1);
    if (isConfirm) setPinConfirm(arr); else setPin(arr);
    if (value && index < 3) pinRefs.current[index + 1]?.focus();
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword.trim()) {
      showToast("Email and password are required.", "error");
      return;
    }
    setIsLoading(true);
    try {
      const profile = isSupabaseActive()
        ? await loginUserInSupabase(loginEmail, loginPassword)
        : await loginUserInFirebase(loginEmail, loginPassword);

      const name = profile.username || profile.name;
      const walletAddress = profile.wallet_address || profile.walletAddress;
      const kycStatus = profile.kyc_status || profile.kycStatus;
      const kycVerified = profile.kyc_verified ?? profile.kycVerified;
      const kycDetails = profile.kyc_details || profile.kycDetails;
      
      if (walletAdapter?.publicKey) {
        const connectedWalletStr = walletAdapter.publicKey.toString();
        if (walletAddress && walletAddress !== connectedWalletStr) {
          showToast(`Wallet warning: Connected wallet does not match registered profile wallet.`, "warning");
        }
      }
      login({
        uid: profile.id || profile.uid,
        name,
        email: profile.email,
        phone: profile.phone,
        walletAddress,
        kycStatus,
        kycVerified,
        kycDetails,
        tier: kycVerified ? 'Pro' : 'Free'
      });
      showToast(isSupabaseActive() ? "Welcome back (Supabase)!" : "Welcome back!", "success");
      navigate('/');
    } catch (err) {
      showToast(err.message || "Failed to log in.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const validateSignup = () => {
    const errs = {};
    if (!username.trim()) errs.username = "Full name is required";
    if (!email.trim() || !email.includes('@')) errs.email = "Please enter a valid email";
    if (!phone.trim()) errs.phone = "Phone number is required";
    if (!password.trim() || password.length < 6) errs.password = "Password must be at least 6 characters";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const finishRegistration = async () => {
    if (!walletAdapter?.publicKey) {
      showToast("Wallet not connected.", "error");
      return;
    }
    setIsLoading(true);
    try {
      const kycPayload = {
        idType,
        idFront,
        idBack,
        selfie,
        personal: { fullName: fullName || username, dob, nationality, gender },
        address: { country, province, city, postalCode, streetAddress },
        pinSet: true,
      };

      let profile;
      if (isSupabaseActive()) {
        profile = await registerUserInSupabase(email, password, {
          username: fullName || username,
          phone,
          walletAddress: walletAdapter.publicKey.toString(),
          kycVerified: kycOutcome !== 'rejected',
          kycStatus: kycOutcome === 'rejected' ? 'rejected' : 'approved',
          kycDetails: kycPayload,
        });
      } else {
        profile = await registerUserInFirebase(email, password, {
          username: fullName || username,
          email,
          phone,
          walletAddress: walletAdapter.publicKey.toString(),
          kycVerified: kycOutcome !== 'rejected',
          kycStatus: kycOutcome === 'rejected' ? 'rejected' : 'approved',
          kycDetails: kycPayload,
        });
      }

      let txSig = "";
      try {
        txSig = await initializeUser(walletAdapter, fullName || username, "");
      } catch (solanaErr) {
        console.warn("Solana program initializer bypassed/mocked:", solanaErr);
      }

      const name = profile.username || fullName || username;
      const walletAddress = profile.wallet_address || profile.walletAddress;
      const kycStatus = profile.kyc_status || profile.kycStatus;
      const kycVerified = profile.kyc_verified ?? profile.kycVerified;
      const kycDetails = profile.kyc_details || profile.kycDetails;

      login({
        uid: profile.id || profile.uid,
        name,
        email: profile.email,
        phone: profile.phone,
        walletAddress,
        kycStatus,
        kycVerified,
        kycDetails,
        tier: kycVerified ? 'Pro' : 'Free',
        txSig
      });

      showToast(isSupabaseActive() ? "You're all set on Supabase!" : "You're all set!", "success");
      navigate('/');
    } catch (err) {
      showToast(`Setup failed: ${err.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // ——— SLIDES ———
  if (step === 'slides') {
    const SlideIcon = slides[slideIndex].icon;
    return (
      <div className="flex flex-col h-full px-6 pt-safe pb-safe text-center bg-gradient-to-br from-bgDark via-bgDark to-primary/10 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-primary/20 blur-[100px] rounded-full pointer-events-none" />
        <div className="flex-1 flex flex-col justify-center items-center space-y-8 z-10 w-full max-w-sm mx-auto mt-4">
          <div className="w-32 h-32 rounded-[2rem] bg-card/40 backdrop-blur-md border border-white/10 shadow-card flex items-center justify-center animate-float">
            <SlideIcon className="w-14 h-14 text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]" />
          </div>
          <div className="space-y-4">
            <p className="text-primary font-bold text-sm tracking-widest uppercase">NexPay</p>
            <h1 className="text-3xl font-extrabold tracking-tight text-white leading-tight px-2">{slides[slideIndex].title}</h1>
            <p className="text-textMuted text-base px-4">{slides[slideIndex].text}</p>
          </div>
        </div>
        <div className="flex space-x-2 justify-center mb-8 z-10">
          {slides.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === slideIndex ? 'w-8 bg-primary shadow-glow' : 'w-2 bg-white/10'}`} />
          ))}
        </div>
        <div className="w-full max-w-sm mx-auto z-10 pb-6 space-y-3">
          <Button onClick={() => slideIndex < slides.length - 1 ? setSlideIndex(slideIndex + 1) : setStep('auth')} size="lg" className="w-full font-bold rounded-2xl h-14">Continue</Button>
          <button onClick={() => setStep('auth')} className="text-sm text-textMuted hover:text-white transition-colors">Skip</button>
        </div>
      </div>
    );
  }

  // ——— AUTH GATE ———
  if (step === 'auth') {
    return (
      <WalletGuard>
        <div className="flex flex-col h-full px-6 pt-safe pb-safe justify-between bg-gradient-to-b from-bgDark to-card relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
          <div className="flex-1 flex flex-col justify-center items-center text-center space-y-5 z-10 w-full max-w-sm mx-auto">
            <div className="w-24 h-24 bg-primary/20 rounded-[2rem] flex items-center justify-center border border-primary/30 backdrop-blur-md shadow-glow animate-float">
              <Zap className="w-12 h-12 text-primary" />
            </div>
            <h1 className="text-5xl font-extrabold text-white tracking-tight">NexPay</h1>
            <p className="text-textMuted text-lg max-w-[280px]">The future of global finance.</p>
          </div>
          <div className="flex flex-col space-y-3 z-10 w-full max-w-sm mx-auto pb-6">
            <Button onClick={() => setStep('signup')} size="lg" className="w-full font-bold rounded-2xl h-14">Create Account</Button>
            <Button variant="secondary" onClick={() => setStep('login')} size="lg" className="w-full font-bold rounded-2xl h-14">Log In</Button>
          </div>
        </div>
      </WalletGuard>
    );
  }

  if (step === 'login') {
    return (
      <WalletGuard>
        <Shell title="Log In" onBack={() => setStep('auth')}>
          <div className="flex-1 flex flex-col justify-center">
            <Card glass className="border border-white/5 p-6 rounded-3xl">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/25 text-primary mb-5 mx-auto">
                <Lock size={20} />
              </div>
              <h2 className="text-2xl font-bold text-center text-white mb-6">Welcome Back</h2>
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <Input label="Email Address" type="email" floating placeholder="name@email.com" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} />
                <Input label="Password" type="password" floating placeholder="••••••••" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} />
                <div className="pt-2">
                  <Button type="submit" size="lg" isLoading={isLoading} className="w-full font-bold rounded-2xl h-14">Continue Securely</Button>
                </div>
              </form>
            </Card>
          </div>
        </Shell>
      </WalletGuard>
    );
  }

  if (step === 'signup') {
    return (
      <WalletGuard>
        <Shell title="Create Account" onBack={() => setStep('auth')}>
          <form onSubmit={(e) => { e.preventDefault(); if (validateSignup()) { setFullName(username); setStep('phone'); } }} className="space-y-4 flex-1 flex flex-col">
            <div className="mb-2">
              <h2 className="text-2xl font-bold text-white mb-1">Join NexPay</h2>
              <p className="text-sm text-textMuted">Create your account to start sending globally.</p>
            </div>
            <Input label="Full Name" floating placeholder="John Doe" value={username} onChange={e => setUsername(e.target.value)} error={errors.username} />
            <Input label="Email Address" type="email" floating placeholder="john@example.com" value={email} onChange={e => setEmail(e.target.value)} error={errors.email} />
            <Input label="Phone Number" type="tel" floating placeholder="+1 234 567 8900" value={phone} onChange={e => setPhone(e.target.value)} error={errors.phone} />
            <Input label="Password" type="password" floating placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} error={errors.password} />
            <div className="mt-auto pt-6 pb-2">
              <Button type="submit" size="lg" className="w-full font-bold rounded-2xl h-14">Continue</Button>
            </div>
          </form>
        </Shell>
      </WalletGuard>
    );
  }

  // ——— PHONE ———
  if (step === 'phone') {
    return (
      <WalletGuard>
        <Shell title="Phone Verification" onBack={() => setStep('signup')} progress={1} progressLabel="Phone">
          <div className="flex flex-col flex-1">
            <div className="w-16 h-16 rounded-3xl bg-primary/15 border border-primary/25 flex items-center justify-center mb-6">
              <Phone className="text-primary" size={28} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Confirm your number</h2>
            <p className="text-sm text-textMuted mb-6">We'll send a one-time code to verify this phone number.</p>
            <Input label="Phone Number" type="tel" floating value={phone} onChange={e => setPhone(e.target.value)} />
            <div className="mt-auto pt-8">
              <Button size="lg" className="w-full font-bold h-14" onClick={() => {
                if (!phone.trim()) { showToast("Enter your phone number", "error"); return; }
                showToast("OTP sent!", "success");
                setStep('otp');
              }}>Send Code</Button>
            </div>
          </div>
        </Shell>
      </WalletGuard>
    );
  }

  // ——— OTP ———
  if (step === 'otp') {
    return (
      <WalletGuard>
        <Shell title="Enter OTP" onBack={() => setStep('phone')} progress={2} progressLabel="OTP">
          <div className="flex flex-col flex-1">
            <h2 className="text-2xl font-bold text-white mb-2">Check your messages</h2>
            <p className="text-sm text-textMuted mb-8">Code sent to <span className="text-white font-medium">{phone}</span></p>
            <div className="flex justify-between gap-2 mb-6">
              {otp.map((d, i) => (
                <input
                  key={i}
                  ref={el => otpRefs.current[i] = el}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  aria-label={`Digit ${i + 1}`}
                  value={d}
                  onChange={e => handleOtpChange(i, e.target.value)}
                  onKeyDown={e => { if (e.key === 'Backspace' && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus(); }}
                  className="w-12 h-14 rounded-2xl border border-white/10 bg-white/5 text-center text-xl font-bold text-white focus:border-primary focus:outline-none transition-colors"
                />
              ))}
            </div>
            <button onClick={() => showToast("Code resent", "success")} className="text-sm text-primary font-semibold mb-4">Resend code</button>
            <div className="mt-auto">
              <Button size="lg" className="w-full font-bold h-14" disabled={otp.join('').length < 6} onClick={() => setStep('personal')}>Verify</Button>
            </div>
          </div>
        </Shell>
      </WalletGuard>
    );
  }

  // ——— PERSONAL ———
  if (step === 'personal') {
    return (
      <WalletGuard>
        <Shell title="Personal Info" onBack={() => setStep('otp')} progress={3} progressLabel="Identity">
          <div className="flex flex-col flex-1 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center"><User className="text-primary" size={22} /></div>
              <div>
                <h2 className="text-xl font-bold text-white">About you</h2>
                <p className="text-xs text-textMuted">As shown on your government ID</p>
              </div>
            </div>
            <Input label="Full Name" floating value={fullName} onChange={e => setFullName(e.target.value)} />
            <Input label="Date of Birth" type="date" value={dob} onChange={e => setDob(e.target.value)} />
            <Select label="Nationality" value={nationality} onChange={e => setNationality(e.target.value)} options={[
              { value: 'US', label: 'United States' }, { value: 'PK', label: 'Pakistan' }, { value: 'GB', label: 'United Kingdom' },
              { value: 'AE', label: 'United Arab Emirates' }, { value: 'IN', label: 'India' }, { value: 'MX', label: 'Mexico' },
            ]} />
            <Select label="Gender" value={gender} onChange={e => setGender(e.target.value)} options={[
              { value: '', label: 'Select' }, { value: 'female', label: 'Female' }, { value: 'male', label: 'Male' },
              { value: 'other', label: 'Other' }, { value: 'prefer_not', label: 'Prefer not to say' },
            ]} />
            <div className="mt-auto pt-4">
              <Button size="lg" className="w-full font-bold h-14" onClick={() => {
                if (!fullName.trim() || !dob || !gender) { showToast("Please complete all fields", "error"); return; }
                setStep('address');
              }}>Continue</Button>
            </div>
          </div>
        </Shell>
      </WalletGuard>
    );
  }

  // ——— ADDRESS ———
  if (step === 'address') {
    return (
      <WalletGuard>
        <Shell title="Address" onBack={() => setStep('personal')} progress={4} progressLabel="Address">
          <div className="flex flex-col flex-1 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center"><MapPin className="text-primary" size={22} /></div>
              <div>
                <h2 className="text-xl font-bold text-white">Where do you live?</h2>
                <p className="text-xs text-textMuted">Residential address verification</p>
              </div>
            </div>
            <Select label="Country" value={country} onChange={e => setCountry(e.target.value)} options={[
              { value: 'US', label: 'United States' }, { value: 'PK', label: 'Pakistan' }, { value: 'GB', label: 'United Kingdom' },
              { value: 'AE', label: 'United Arab Emirates' }, { value: 'MX', label: 'Mexico' },
            ]} />
            <Input label="Province / State" floating value={province} onChange={e => setProvince(e.target.value)} />
            <Input label="City" floating value={city} onChange={e => setCity(e.target.value)} />
            <Input label="Postal Code" floating value={postalCode} onChange={e => setPostalCode(e.target.value)} />
            <Input label="Street Address" floating value={streetAddress} onChange={e => setStreetAddress(e.target.value)} />
            <div className="mt-auto pt-4">
              <Button size="lg" className="w-full font-bold h-14" onClick={() => {
                if (!province || !city || !postalCode || !streetAddress) { showToast("Please complete your address", "error"); return; }
                setStep('idSelect');
              }}>Continue</Button>
            </div>
          </div>
        </Shell>
      </WalletGuard>
    );
  }

  // ——— ID SELECT ———
  if (step === 'idSelect') {
    const ids = [
      { id: 'passport', icon: FileText, title: 'Passport', desc: 'International travel document' },
      { id: 'national_id', icon: CreditCard, title: 'National ID', desc: 'Government-issued ID card' },
      { id: 'drivers_license', icon: Car, title: "Driver's License", desc: 'Valid driving licence' },
    ];
    return (
      <WalletGuard>
        <Shell title="Government ID" onBack={() => setStep('address')} progress={5} progressLabel="ID Type">
          <h2 className="text-2xl font-bold text-white mb-2">Choose ID type</h2>
          <p className="text-sm text-textMuted mb-6">Select a valid photo ID to verify your identity.</p>
          <div className="space-y-3 flex-1">
            {ids.map(item => (
              <button
                key={item.id}
                onClick={() => setIdType(item.id)}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${idType === item.id ? 'border-primary bg-primary/10 shadow-glow' : 'border-white/10 bg-white/[0.03] hover:border-white/20'}`}
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${idType === item.id ? 'bg-primary text-white' : 'bg-white/5 text-textMuted'}`}>
                  <item.icon size={22} />
                </div>
                <div>
                  <p className="font-bold text-white">{item.title}</p>
                  <p className="text-xs text-textMuted">{item.desc}</p>
                </div>
              </button>
            ))}
          </div>
          <Button size="lg" className="w-full font-bold h-14 mt-6" disabled={!idType} onClick={() => setStep('idFront')}>Continue</Button>
        </Shell>
      </WalletGuard>
    );
  }

  // ——— ID FRONT ———
  if (step === 'idFront') {
    return (
      <WalletGuard>
        <Shell title="Upload Front" onBack={() => setStep('idSelect')} progress={6} progressLabel="Front ID">
          <h2 className="text-2xl font-bold text-white mb-2">Front of ID</h2>
          <p className="text-sm text-textMuted mb-6">Ensure all text is clear and well-lit.</p>
          <UploadCard id="front-id-upload" preview={idFront} label="Front of ID" sub="Tap to capture or upload" icon={ImageIcon} onChange={e => handleFileChange(e, 'front')} />
          <div className="mt-auto pt-8">
            <Button size="lg" className="w-full font-bold h-14" onClick={() => {
              if (!idFront) { showToast("Upload the front of your ID", "error"); return; }
              setStep('idBack');
            }}>Continue</Button>
          </div>
        </Shell>
      </WalletGuard>
    );
  }

  // ——— ID BACK ———
  if (step === 'idBack') {
    return (
      <WalletGuard>
        <Shell title="Upload Back" onBack={() => setStep('idFront')} progress={7} progressLabel="Back ID">
          <h2 className="text-2xl font-bold text-white mb-2">Back of ID</h2>
          <p className="text-sm text-textMuted mb-6">Capture the reverse side of your document.</p>
          <UploadCard id="back-id-upload" preview={idBack} label="Back of ID" sub="Tap to capture or upload" icon={ImageIcon} onChange={e => handleFileChange(e, 'back')} />
          <div className="mt-auto pt-8">
            <Button size="lg" className="w-full font-bold h-14" onClick={() => {
              if (!idBack) { showToast("Upload the back of your ID", "error"); return; }
              setStep('selfie');
            }}>Continue</Button>
          </div>
        </Shell>
      </WalletGuard>
    );
  }

  // ——— SELFIE ———
  if (step === 'selfie') {
    return (
      <WalletGuard>
        <Shell title="Selfie Check" onBack={() => setStep('idBack')} progress={8} progressLabel="Selfie">
          <h2 className="text-2xl font-bold text-white mb-2">Live selfie</h2>
          <p className="text-sm text-textMuted mb-6">Position your face in the oval for biometric match.</p>
          <UploadCard id="selfie-upload" preview={selfie} label="Take selfie" sub="Camera or gallery" icon={Camera} onChange={e => handleFileChange(e, 'selfie')} />
          {!selfie && (
            <div className="mt-4 flex justify-center">
              <div className="w-40 h-40 border-2 border-dashed border-white/20 rounded-full flex items-center justify-center">
                <ScanFace className="text-white/30" size={48} />
              </div>
            </div>
          )}
          <div className="mt-auto pt-8">
            <Button size="lg" className="w-full font-bold h-14" onClick={() => {
              if (!selfie) { showToast("Please take a selfie", "error"); return; }
              setStep('faceMatch');
            }}>Continue</Button>
          </div>
        </Shell>
      </WalletGuard>
    );
  }

  // ——— FACE MATCH ———
  if (step === 'faceMatch') {
    return (
      <WalletGuard>
        <Shell title="Matching" progress={9} progressLabel="Face Match">
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <StatusAnimation type="loading" size={100} />
            <h2 className="text-2xl font-bold text-white mt-8 mb-2">Matching faces…</h2>
            <p className="text-sm text-textMuted mb-8">Comparing your selfie with your ID photo.</p>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-200 shadow-glow" style={{ width: `${matchProgress}%` }} />
            </div>
            <p className="text-xs text-textMuted mt-3 font-mono">{matchProgress}%</p>
          </div>
        </Shell>
      </WalletGuard>
    );
  }

  // ——— REVIEW ———
  if (step === 'kycReview') {
    return (
      <WalletGuard>
        <Shell title="Under Review" progress={10} progressLabel="Review">
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="w-24 h-24 rounded-full bg-warning/15 border border-warning/30 flex items-center justify-center mb-6 animate-pulse">
              <Shield className="text-warning" size={40} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">KYC under review</h2>
            <p className="text-sm text-textMuted max-w-[280px]">Our compliance team is verifying your documents. This usually takes a few moments.</p>
          </div>
        </Shell>
      </WalletGuard>
    );
  }

  // ——— APPROVED ———
  if (step === 'kycApproved') {
    return (
      <WalletGuard>
        <Shell title="Verified" progress={11} progressLabel="Approved">
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <StatusAnimation type="success" size={110} />
            <h2 className="text-2xl font-bold text-white mt-8 mb-2">KYC Approved</h2>
            <p className="text-sm text-textMuted mb-8 max-w-[280px]">You're fully verified. Unlock Pro tier limits and instant transfers.</p>
            <Button size="lg" className="w-full font-bold h-14" onClick={() => setStep('pin')}>Continue to Security</Button>
          </div>
        </Shell>
      </WalletGuard>
    );
  }

  // ——— REJECTED ———
  if (step === 'kycRejected') {
    return (
      <WalletGuard>
        <Shell title="Not Verified" progress={11} progressLabel="Rejected">
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <StatusAnimation type="error" size={110} />
            <h2 className="text-2xl font-bold text-white mt-8 mb-2">KYC Rejected</h2>
            <p className="text-sm text-textMuted mb-8 max-w-[280px]">We couldn't verify your documents. Please retry with clearer photos.</p>
            <Button size="lg" className="w-full font-bold h-14" onClick={() => setStep('retry')}>Retry Verification</Button>
          </div>
        </Shell>
      </WalletGuard>
    );
  }

  // ——— RETRY ———
  if (step === 'retry') {
    return (
      <WalletGuard>
        <Shell title="Retry KYC" onBack={() => setStep('kycRejected')} progress={5} progressLabel="Retry">
          <div className="flex-1 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-3xl bg-primary/15 flex items-center justify-center mb-6">
              <RefreshCcw className="text-primary" size={28} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Let's try again</h2>
            <p className="text-sm text-textMuted mb-8">Tips: use good lighting, avoid glare, and keep all corners of your ID visible.</p>
            <Card className="w-full text-left space-y-2 mb-8">
              <p className="text-sm text-textPrimary">• Place ID on a dark flat surface</p>
              <p className="text-sm text-textPrimary">• Face the camera directly for selfie</p>
              <p className="text-sm text-textPrimary">• Remove sunglasses or hats</p>
            </Card>
            <Button size="lg" className="w-full font-bold h-14" onClick={() => { setKycOutcome('approved'); setIdFront(''); setIdBack(''); setSelfie(''); setStep('idSelect'); }}>Start Over</Button>
          </div>
        </Shell>
      </WalletGuard>
    );
  }

  // ——— PIN ———
  if (step === 'pin') {
    const active = pinPhase === 'create' ? pin : pinConfirm;
    return (
      <WalletGuard>
        <Shell title="Security PIN" progress={12} progressLabel="PIN">
          <div className="flex-1 flex flex-col items-center">
            <div className="w-16 h-16 rounded-3xl bg-primary/15 flex items-center justify-center mb-6">
              <Lock className="text-primary" size={28} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">{pinPhase === 'create' ? 'Create a PIN' : 'Confirm your PIN'}</h2>
            <p className="text-sm text-textMuted mb-8">4-digit code to unlock NexPay</p>
            <div className="flex gap-3 mb-8">
              {active.map((d, i) => (
                <input
                  key={i}
                  ref={el => pinRefs.current[i] = el}
                  type="password"
                  inputMode="numeric"
                  maxLength={1}
                  aria-label={`PIN digit ${i + 1}`}
                  value={d}
                  onChange={e => handlePinChange(i, e.target.value, pinPhase === 'confirm')}
                  className="w-14 h-14 rounded-2xl border border-white/10 bg-white/5 text-center text-2xl font-bold text-white focus:border-primary focus:outline-none"
                />
              ))}
            </div>
            <div className="mt-auto w-full">
              <Button size="lg" className="w-full font-bold h-14" disabled={active.join('').length < 4} onClick={() => {
                if (pinPhase === 'create') {
                  setPinPhase('confirm');
                  setPinConfirm(['', '', '', '']);
                  setTimeout(() => pinRefs.current[0]?.focus(), 50);
                } else if (pin.join('') !== pinConfirm.join('')) {
                  showToast("PINs don't match", "error");
                  setPinConfirm(['', '', '', '']);
                } else {
                  setStep('biometric');
                }
              }}>Continue</Button>
            </div>
          </div>
        </Shell>
      </WalletGuard>
    );
  }

  // ——— BIOMETRIC ———
  if (step === 'biometric') {
    return (
      <WalletGuard>
        <Shell title="Biometrics" onBack={() => setStep('pin')} progress={13} progressLabel="Biometric">
          <div className="flex-1 flex flex-col items-center text-center">
            <div className="w-28 h-28 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center mb-8 animate-float">
              <Fingerprint className="text-primary" size={56} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Enable biometrics</h2>
            <p className="text-sm text-textMuted mb-8 max-w-[280px]">Use Face ID or fingerprint for faster, secure login.</p>
            <div className="w-full space-y-3 mt-auto">
              <Button size="lg" className="w-full font-bold h-14" onClick={() => { showToast("Biometrics enabled", "success"); setStep('notifications'); }}>Enable</Button>
              <Button variant="ghost" size="lg" className="w-full" onClick={() => setStep('notifications')}>Maybe later</Button>
            </div>
          </div>
        </Shell>
      </WalletGuard>
    );
  }

  // ——— NOTIFICATIONS ———
  if (step === 'notifications') {
    return (
      <WalletGuard>
        <Shell title="Notifications" onBack={() => setStep('biometric')} progress={14} progressLabel="Alerts">
          <div className="flex-1 flex flex-col items-center text-center">
            <div className="w-28 h-28 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center mb-8">
              <Bell className="text-primary" size={48} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Stay in the loop</h2>
            <p className="text-sm text-textMuted mb-8 max-w-[280px]">Get instant alerts for transfers, security, and rewards.</p>
            <div className="w-full space-y-3 mt-auto">
              <Button size="lg" className="w-full font-bold h-14" onClick={() => setStep('complete')}>Allow Notifications</Button>
              <Button variant="ghost" size="lg" className="w-full" onClick={() => setStep('complete')}>Not now</Button>
            </div>
          </div>
        </Shell>
      </WalletGuard>
    );
  }

  // ——— COMPLETE ———
  if (step === 'complete') {
    return (
      <WalletGuard>
        <Shell title="You're Ready" progress={16} progressLabel="Done">
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="w-24 h-24 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center mb-6 animate-check">
              <PartyPopper className="text-accent" size={40} />
            </div>
            <h2 className="text-3xl font-extrabold text-white mb-2">Welcome to NexPay</h2>
            <p className="text-sm text-textMuted mb-4 max-w-[280px]">Your account is set up. Start sending money worldwide in seconds.</p>
            <Avatar name={fullName || username} size="lg" className="mb-6" />
            <div className="w-full mt-auto">
              <Button size="lg" isLoading={isLoading} className="w-full font-bold h-14" onClick={finishRegistration}>
                <Sparkles size={18} className="mr-2" /> Enter NexPay
              </Button>
              {/* Hidden demo path for rejected KYC demos */}
              <button type="button" className="sr-only" onClick={() => { setKycOutcome('rejected'); setStep('kycRejected'); }}>demo reject</button>
            </div>
          </div>
        </Shell>
      </WalletGuard>
    );
  }

  return null;
};
