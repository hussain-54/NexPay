import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/useStore';

import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './contexts/ToastContext';

import { Onboarding } from './screens/Onboarding';
import { Home } from './screens/Home';
import { SendMoney } from './screens/SendMoney';
import { Receive } from './screens/Receive';
import { Wallet } from './screens/Wallet';
import { TransactionHistory } from './screens/TransactionHistory';
import { TransactionDetail } from './screens/TransactionDetail';
import { Settings } from './screens/Settings';
import { Notifications } from './screens/Notifications';
import { TransactionSuccess, TransactionFailed } from './screens/TransactionResult';
import { RecipientDetails, RecipientSaved } from './screens/Recipient';
import { CurrencyConverter, ExchangeRates } from './screens/Exchange';
import { QRPayment, ScanQR, RequestMoney } from './screens/QRPay';
import { CardManagement, VirtualCard } from './screens/Cards';
import { SecurityCenter, AppLock } from './screens/Security';
import {
  Referral, InviteFriends, Rewards, SupportChat, HelpCenter,
  Privacy, Terms, Profile, AccountLimits, PremiumUpgrade,
} from './screens/More';
import { DatabaseLab } from './screens/DatabaseLab';

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(e) {
    return { error: e.message };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          padding: 24, color: "#EF4444", fontSize: 13,
          fontFamily: "monospace", whiteSpace: "pre-wrap",
          wordBreak: "break-word", overflowY: "auto",
        }}>
          <strong>Crash:</strong>{"\n"}{this.state.error}
        </div>
      );
    }
    return this.props.children;
  }
}

const ProtectedRoute = ({ children }) => {
  const { isLoggedIn, isOnboarded } = useStore();
  
  if (!isOnboarded) return <Navigate to="/onboarding" />;
  if (!isLoggedIn) return <Navigate to="/onboarding" />;
  
  return children;
};

const withErrorBoundary = (Component) => (
  <ErrorBoundary>
    <Component />
  </ErrorBoundary>
);

const App = () => {
  const initFirebase = useStore((state) => state.initFirebase);

  useEffect(() => {
    if (initFirebase) {
      const unsubscribe = initFirebase();
      return () => unsubscribe && unsubscribe();
    }
  }, [initFirebase]);

  return (
    <div className="w-full h-full bg-bgDark text-[#F9FAFB] font-sans relative overflow-hidden flex flex-col">
      <AppErrorBoundary>
        <ToastProvider>
          <Routes>
            <Route path="/onboarding" element={withErrorBoundary(Onboarding)} />
            <Route path="/app-lock" element={withErrorBoundary(AppLock)} />
            <Route path="/tx-success" element={<ProtectedRoute>{withErrorBoundary(TransactionSuccess)}</ProtectedRoute>} />
            <Route path="/tx-failed" element={<ProtectedRoute>{withErrorBoundary(TransactionFailed)}</ProtectedRoute>} />
            <Route path="/qr-scan" element={<ProtectedRoute>{withErrorBoundary(ScanQR)}</ProtectedRoute>} />
            
            <Route element={<Layout />}>
              <Route path="/" element={<Navigate to="/home" replace />} />
              <Route path="/home" element={<ProtectedRoute>{withErrorBoundary(Home)}</ProtectedRoute>} />
              <Route path="/send" element={<ProtectedRoute>{withErrorBoundary(SendMoney)}</ProtectedRoute>} />
              <Route path="/receive" element={<ProtectedRoute>{withErrorBoundary(Receive)}</ProtectedRoute>} />
              <Route path="/wallet" element={<ProtectedRoute>{withErrorBoundary(Wallet)}</ProtectedRoute>} />
              <Route path="/history" element={<ProtectedRoute>{withErrorBoundary(TransactionHistory)}</ProtectedRoute>} />
              <Route path="/history/:pdaAddress" element={<ProtectedRoute>{withErrorBoundary(TransactionDetail)}</ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute>{withErrorBoundary(Settings)}</ProtectedRoute>} />
              <Route path="/notifications" element={<ProtectedRoute>{withErrorBoundary(Notifications)}</ProtectedRoute>} />
              <Route path="/recipient" element={<ProtectedRoute>{withErrorBoundary(RecipientDetails)}</ProtectedRoute>} />
              <Route path="/recipient-saved" element={<ProtectedRoute>{withErrorBoundary(RecipientSaved)}</ProtectedRoute>} />
              <Route path="/converter" element={<ProtectedRoute>{withErrorBoundary(CurrencyConverter)}</ProtectedRoute>} />
              <Route path="/rates" element={<ProtectedRoute>{withErrorBoundary(ExchangeRates)}</ProtectedRoute>} />
              <Route path="/qr" element={<ProtectedRoute>{withErrorBoundary(QRPayment)}</ProtectedRoute>} />
              <Route path="/request" element={<ProtectedRoute>{withErrorBoundary(RequestMoney)}</ProtectedRoute>} />
              <Route path="/cards" element={<ProtectedRoute>{withErrorBoundary(CardManagement)}</ProtectedRoute>} />
              <Route path="/virtual-card" element={<ProtectedRoute>{withErrorBoundary(VirtualCard)}</ProtectedRoute>} />
              <Route path="/security" element={<ProtectedRoute>{withErrorBoundary(SecurityCenter)}</ProtectedRoute>} />
              <Route path="/referral" element={<ProtectedRoute>{withErrorBoundary(Referral)}</ProtectedRoute>} />
              <Route path="/invite" element={<ProtectedRoute>{withErrorBoundary(InviteFriends)}</ProtectedRoute>} />
              <Route path="/rewards" element={<ProtectedRoute>{withErrorBoundary(Rewards)}</ProtectedRoute>} />
              <Route path="/support" element={<ProtectedRoute>{withErrorBoundary(SupportChat)}</ProtectedRoute>} />
              <Route path="/help" element={<ProtectedRoute>{withErrorBoundary(HelpCenter)}</ProtectedRoute>} />
              <Route path="/privacy" element={<ProtectedRoute>{withErrorBoundary(Privacy)}</ProtectedRoute>} />
              <Route path="/terms" element={<ProtectedRoute>{withErrorBoundary(Terms)}</ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute>{withErrorBoundary(Profile)}</ProtectedRoute>} />
              <Route path="/limits" element={<ProtectedRoute>{withErrorBoundary(AccountLimits)}</ProtectedRoute>} />
              <Route path="/premium" element={<ProtectedRoute>{withErrorBoundary(PremiumUpgrade)}</ProtectedRoute>} />
              <Route path="/database" element={<ProtectedRoute>{withErrorBoundary(DatabaseLab)}</ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/home" replace />} />
            </Route>
          </Routes>
        </ToastProvider>
      </AppErrorBoundary>
    </div>
  );
};

export default App;
