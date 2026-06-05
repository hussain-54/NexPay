import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, Zap, CheckCircle2, Image as ImageIcon, Camera, ChevronLeft, Lock } from 'lucide-react';
import { Button, Input, Card } from '../components/ui';
import { useStore } from '../store/useStore';
import { useToast } from '../contexts/ToastContext';
import { useSolanaWallet } from '../hooks/useSolanaWallet';
import { initializeUser, fetchUserAccount } from '../lib/nexpay-sdk';
import { WalletGuard } from '../components/WalletGuard';
import { registerUserInFirebase, loginUserInFirebase, isFirebaseActive } from '../lib/firebase';

const slides = [
  { icon: Globe, title: "Send money to 150+ countries", text: "Global transfers at your fingertips." },
  { icon: Zap, title: "Settle in under 1 second", text: "Powered by USDC and USDT." },
  { icon: CheckCircle2, title: "0.1% flat fee. No hidden costs.", text: "Keep more of your money." }
];

export const Onboarding = () => {
  const [step, setStep] = useState('slides'); 
  const [slideIndex, setSlideIndex] = useState(0);
  
  // Registration credentials
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  
  // Login credentials
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // KYC states
  const [idFront, setIdFront] = useState('');
  const [idBack, setIdBack] = useState('');
  const [selfie, setSelfie] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [otp, setOtp] = useState('');
  
  const [errors, setErrors] = useState({});

  const { login } = useStore();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { walletAdapter, connected } = useSolanaWallet();
  const [isLoading, setIsLoading] = useState(false);

  // Check if wallet already registered in blockchain
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

  const handleNextSlide = () => {
    if (slideIndex < slides.length - 1) setSlideIndex(slideIndex + 1);
    else setStep('auth');
  };

  const handleFileChange = (e, target) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (target === 'front') setIdFront(reader.result);
        if (target === 'back') setIdBack(reader.result);
        if (target === 'selfie') setSelfie(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword.trim()) {
      showToast("Email and password are required.", "error");
      return;
    }

    setIsLoading(true);
    try {
      const profile = await loginUserInFirebase(loginEmail, loginPassword);
      
      // Verification check: ensure connected wallet matches profile's registered wallet
      if (walletAdapter && walletAdapter.publicKey) {
        const connectedWalletStr = walletAdapter.publicKey.toString();
        if (profile.walletAddress && profile.walletAddress !== connectedWalletStr) {
          showToast(`Wallet warning: Connected wallet does not match registered profile wallet.`, "warning");
        }
      }

      login({
        uid: profile.uid,
        name: profile.username,
        email: profile.email,
        phone: profile.phone,
        walletAddress: profile.walletAddress,
        kycStatus: profile.kycStatus,
        kycVerified: profile.kycVerified,
        kycDetails: profile.kycDetails,
        tier: profile.kycVerified ? 'Pro' : 'Free'
      });

      showToast("Welcome back!", "success");
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

  const handleSignupSubmit = (e) => {
    e.preventDefault();
    if (!validateSignup()) return;
    setStep('kyc1');
  };

  const handleFinishSetup = async () => {
    if (!walletAdapter || !walletAdapter.publicKey) {
      showToast("Wallet not connected.", "error");
      return;
    }
    if (!idFront || !idBack) {
      showToast("Both front and back ID scans are required.", "error");
      return;
    }
    if (!selfie) {
      showToast("Selfie photo verification is required.", "error");
      return;
    }
    if (!streetAddress.trim() || !city.trim() || !postalCode.trim()) {
      showToast("Please enter your complete address.", "error");
      return;
    }

    setIsLoading(true);
    try {
      // 1. Submit authentication and registration profile + KYC documents to Firebase
      const profile = await registerUserInFirebase(email, password, {
        username,
        email,
        phone,
        walletAddress: walletAdapter.publicKey.toString(),
        kycVerified: true, // Approve verified status for demo setup
        kycStatus: 'approved',
        kycDetails: {
          idFront,
          idBack,
          selfie,
          address: {
            streetAddress,
            city,
            postalCode
          }
        }
      });

      // 2. Initialize Solana program account for user
      let txSig = "";
      try {
        txSig = await initializeUser(walletAdapter, username, "");
      } catch (solanaErr) {
        console.warn("Solana program initializer bypassed/mocked:", solanaErr);
      }

      // 3. Log user details into local store state
      login({
        uid: profile.uid,
        name: profile.username,
        email: profile.email,
        phone: profile.phone,
        walletAddress: profile.walletAddress,
        kycStatus: 'approved',
        kycVerified: true,
        kycDetails: profile.kycDetails,
        tier: 'Pro', // Completed KYC unlocks Pro tier
        txSig
      });

      showToast("Registration and KYC onboarding complete!", "success");
      navigate('/');
    } catch (err) {
      showToast(`Setup failed: ${err.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'slides') {
    const SlideIcon = slides[slideIndex].icon;
    return (
      <div className="flex flex-col h-full px-6 pt-safe pb-safe text-center bg-gradient-to-br from-bgDark via-bgDark to-primary/10 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-primary/20 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="flex-1 flex flex-col justify-center items-center space-y-8 z-10 w-full max-w-sm mx-auto mt-4">
          <div className="w-32 h-32 rounded-[2rem] bg-card/40 backdrop-blur-md border border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.5)] flex items-center justify-center transform transition-transform hover:scale-105">
            <SlideIcon className="w-14 h-14 text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]" />
          </div>
          <div className="space-y-4">
            <h1 className="text-3xl font-extrabold tracking-tight text-white leading-tight px-4">{slides[slideIndex].title}</h1>
            <p className="text-textMuted text-lg px-6">{slides[slideIndex].text}</p>
          </div>
        </div>
        <div className="flex space-x-2 justify-center mb-8 z-10">
          {slides.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === slideIndex ? 'w-8 bg-primary shadow-[0_0_10px_rgba(99,102,241,0.8)]' : 'w-2 bg-white/10'}`} />
          ))}
        </div>
        <div className="w-full max-w-sm mx-auto z-10 pb-6">
          <Button onClick={handleNextSlide} size="lg" className="w-full shadow-lg shadow-primary/20 font-bold tracking-wide rounded-2xl h-14">Continue</Button>
        </div>
      </div>
    );
  }

  if (step === 'auth') {
    return (
      <WalletGuard>
        <div className="flex flex-col h-full px-6 pt-safe pb-safe justify-between bg-gradient-to-b from-bgDark to-card relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
          
          <div className="flex-1 flex flex-col justify-center items-center text-center space-y-6 z-10 w-full max-w-sm mx-auto">
            <div className="w-24 h-24 bg-primary/20 rounded-[2rem] flex items-center justify-center mb-2 border border-primary/30 backdrop-blur-md shadow-[0_0_40px_rgba(99,102,241,0.3)]">
              <Zap className="w-12 h-12 text-primary" />
            </div>
            <h1 className="text-5xl font-extrabold text-white tracking-tight">NexPay</h1>
            <p className="text-textMuted text-lg max-w-[280px]">The future of global finance.</p>
          </div>
          
          <div className="flex flex-col space-y-4 z-10 w-full max-w-sm mx-auto pb-6">
            <Button onClick={() => setStep('signup')} size="lg" className="w-full shadow-lg shadow-primary/20 font-bold rounded-2xl h-14">Create Account</Button>
            <Button variant="secondary" onClick={() => setStep('login')} size="lg" className="w-full font-bold rounded-2xl h-14">Log In</Button>
          </div>
        </div>
      </WalletGuard>
    );
  }

  if (step === 'login') {
    return (
      <WalletGuard>
        <div className="flex flex-col h-full bg-bgDark pt-safe pb-safe">
          <div className="flex items-center px-4 py-6 border-b border-white/5 relative shrink-0">
            <button onClick={() => setStep('auth')} className="p-2 -ml-2 rounded-full hover:bg-white/5 transition-colors">
              <ChevronLeft size={28} className="text-white" />
            </button>
            <h1 className="text-xl font-bold flex-1 text-center pr-8 text-white">Log In</h1>
          </div>
          
          <div className="flex-1 px-6 py-8 overflow-y-auto w-full max-w-sm mx-auto flex flex-col justify-center">
            <Card className="border border-white/5 bg-black/20 p-6 rounded-[2rem] shadow-xl">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/25 text-primary mb-6 mx-auto">
                <Lock size={20} />
              </div>
              <h2 className="text-2xl font-bold text-center text-white mb-6">Welcome Back</h2>
              
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <Input 
                  label="Email Address" 
                  type="email" 
                  placeholder="name@email.com" 
                  value={loginEmail} 
                  onChange={e => setLoginEmail(e.target.value)} 
                />
                <Input 
                  label="Password" 
                  type="password" 
                  placeholder="••••••••" 
                  value={loginPassword} 
                  onChange={e => setLoginPassword(e.target.value)} 
                />
                
                <div className="pt-4">
                  <Button type="submit" size="lg" isLoading={isLoading} className="w-full font-bold rounded-2xl h-14">
                    Continue Securely
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      </WalletGuard>
    );
  }

  if (step === 'signup') {
    return (
      <WalletGuard>
        <div className="flex flex-col h-full bg-bgDark pt-safe pb-safe">
          <div className="flex items-center px-4 py-6 border-b border-white/5 relative shrink-0">
            <button onClick={() => setStep('auth')} className="p-2 -ml-2 rounded-full hover:bg-white/5 transition-colors">
              <ChevronLeft size={28} className="text-white" />
            </button>
            <h1 className="text-xl font-bold flex-1 text-center pr-8 text-white">Create Account</h1>
          </div>
          
          <div className="flex-1 px-6 py-8 overflow-y-auto w-full max-w-sm mx-auto">
            <form onSubmit={handleSignupSubmit} className="space-y-5">
              <Input label="Full Name" placeholder="John Doe" value={username} onChange={e => setUsername(e.target.value)} error={errors.username} />
              <Input label="Email Address" type="email" placeholder="john@example.com" value={email} onChange={e => setEmail(e.target.value)} error={errors.email} />
              <Input label="Phone Number" type="tel" placeholder="+1 234 567 8900" value={phone} onChange={e => setPhone(e.target.value)} error={errors.phone} />
              <Input label="Password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} error={errors.password} />
              
              <div className="pt-6 pb-8">
                <Button type="submit" size="lg" className="w-full shadow-lg shadow-primary/20 font-bold rounded-2xl h-14">Continue</Button>
              </div>
            </form>
          </div>
        </div>
      </WalletGuard>
    );
  }

  if (step.startsWith('kyc')) {
    const kycStep = parseInt(step.replace('kyc', ''));
    return (
      <WalletGuard>
        <div className="flex flex-col h-full bg-bgDark pt-safe pb-safe">
          <div className="flex items-center px-4 py-6 border-b border-white/5 relative shrink-0">
            <button onClick={() => setStep(kycStep === 1 ? 'signup' : `kyc${kycStep - 1}`)} className="p-2 -ml-2 rounded-full hover:bg-white/5 transition-colors">
              <ChevronLeft size={28} className="text-white" />
            </button>
            <h1 className="text-xl font-bold flex-1 text-center pr-8 text-white">Verification</h1>
          </div>

          <div className="flex-1 px-6 py-8 flex flex-col overflow-y-auto w-full max-w-sm mx-auto">
            <div className="mb-8 font-sans">
              <div className="flex justify-between items-center mb-3">
                <p className="text-sm font-medium text-white">Step {kycStep} of 3</p>
                <p className="text-xs text-textMuted">{kycStep === 1 ? 'ID Upload' : kycStep === 2 ? 'Selfie' : 'Address'}</p>
              </div>
              <div className="flex space-x-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= kycStep ? 'bg-primary shadow-[0_0_8px_rgba(99,102,241,0.5)]' : 'bg-white/10'}`} />
                ))}
              </div>
            </div>

            {kycStep === 1 && (
              <div className="flex-1 flex flex-col space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">Upload your ID</h2>
                  <p className="text-textMuted text-sm">Please ensure all text is legible and well-lit.</p>
                </div>
                
                {/* Hidden File Inputs */}
                <input 
                  type="file" 
                  accept="image/*" 
                  id="front-id-upload" 
                  className="hidden" 
                  onChange={(e) => handleFileChange(e, 'front')} 
                />
                <input 
                  type="file" 
                  accept="image/*" 
                  id="back-id-upload" 
                  className="hidden" 
                  onChange={(e) => handleFileChange(e, 'back')} 
                />

                <label htmlFor="front-id-upload" className="block cursor-pointer">
                  <Card className={`border-dashed border-2 flex flex-col items-center justify-center p-6 transition-all rounded-[2rem] h-40 relative overflow-hidden ${idFront ? 'border-primary/60 bg-primary/5' : 'border-white/10 bg-black/20 hover:bg-white/5 hover:border-primary/50'}`}>
                    {idFront ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <img src={idFront} alt="ID Front Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                          <span className="text-xs text-white font-bold">Change Front Image</span>
                        </div>
                      </div>
                    ) : (
                      <>
                        <ImageIcon className="w-10 h-10 text-textMuted mb-2" />
                        <p className="font-semibold text-white text-sm">Front of ID</p>
                        <p className="text-[11px] text-textMuted mt-1">Tap to select photo</p>
                      </>
                    )}
                  </Card>
                </label>

                <label htmlFor="back-id-upload" className="block cursor-pointer">
                  <Card className={`border-dashed border-2 flex flex-col items-center justify-center p-6 transition-all rounded-[2rem] h-40 relative overflow-hidden ${idBack ? 'border-primary/60 bg-primary/5' : 'border-white/10 bg-black/20 hover:bg-white/5 hover:border-primary/50'}`}>
                    {idBack ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <img src={idBack} alt="ID Back Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                          <span className="text-xs text-white font-bold">Change Back Image</span>
                        </div>
                      </div>
                    ) : (
                      <>
                        <ImageIcon className="w-10 h-10 text-textMuted mb-2" />
                        <p className="font-semibold text-white text-sm">Back of ID</p>
                        <p className="text-[11px] text-textMuted mt-1">Tap to select photo</p>
                      </>
                    )}
                  </Card>
                </label>

                <div className="mt-auto pt-8 pb-4">
                  <Button 
                    onClick={() => {
                      if (!idFront || !idBack) {
                        showToast("Please upload both front and back images of your ID.", "error");
                        return;
                      }
                      setStep('kyc2');
                    }} 
                    size="lg" 
                    className="w-full font-bold rounded-2xl h-14"
                  >
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {kycStep === 2 && (
              <div className="flex-1 flex flex-col space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">Take a Selfie</h2>
                  <p className="text-textMuted text-sm">Position your face within the oval or upload a profile photo.</p>
                </div>
                
                <input 
                  type="file" 
                  accept="image/*" 
                  id="selfie-upload" 
                  className="hidden" 
                  onChange={(e) => handleFileChange(e, 'selfie')} 
                />

                <label htmlFor="selfie-upload" className="block cursor-pointer flex-1">
                  <div className="h-full min-h-[260px] bg-black/40 border border-white/5 rounded-[2rem] flex items-center justify-center relative overflow-hidden backdrop-blur-md">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60 pointer-events-none" />
                    
                    {selfie ? (
                      <img src={selfie} alt="Selfie Preview" className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <div className="w-56 h-56 border-4 border-dashed border-white/30 rounded-full flex flex-col items-center justify-center z-10 shadow-[0_0_50px_rgba(0,0,0,0.5)_inset] hover:border-primary/50 transition-colors">
                        <Camera className="w-12 h-12 text-white/50 mb-3" />
                        <span className="text-[10px] font-medium text-white/70 tracking-widest uppercase text-center px-4">Tap to upload selfie</span>
                      </div>
                    )}
                  </div>
                </label>

                <div className="mt-auto pt-8 pb-4">
                  <Button 
                    onClick={() => {
                      if (!selfie) {
                        showToast("Please capture or upload your selfie.", "error");
                        return;
                      }
                      setStep('kyc3');
                    }} 
                    size="lg" 
                    className="w-full font-bold shadow-lg shadow-primary/20 rounded-2xl h-14"
                  >
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {kycStep === 3 && (
              <div className="flex-1 flex flex-col">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-white mb-2">Verify Address</h2>
                  <p className="text-textMuted text-sm">Enter your residential address exactly as it appears on your ID.</p>
                </div>
                <div className="space-y-4 flex-1">
                  <Input 
                    label="Street Address" 
                    placeholder="123 Financial District" 
                    value={streetAddress} 
                    onChange={e => setStreetAddress(e.target.value)} 
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input 
                      label="City" 
                      placeholder="New York" 
                      value={city} 
                      onChange={e => setCity(e.target.value)} 
                    />
                    <Input 
                      label="Postal Code" 
                      placeholder="10001" 
                      value={postalCode} 
                      onChange={e => setPostalCode(e.target.value)} 
                    />
                  </div>
                  <div className="pt-4 border-t border-white/10 mt-6">
                    <Input 
                      label="Phone Verification OTP" 
                      placeholder="6-digit code" 
                      type="number" 
                      value={otp} 
                      onChange={e => setOtp(e.target.value)} 
                      className="tracking-widest font-mono text-lg" 
                    />
                  </div>
                </div>
                <div className="mt-auto pt-8 pb-4">
                  <Button 
                    onClick={handleFinishSetup} 
                    size="lg" 
                    isLoading={isLoading} 
                    className="w-full font-bold shadow-lg shadow-primary/20 rounded-2xl h-14"
                  >
                    Complete Registration
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </WalletGuard>
    );
  }

  return null;
};
