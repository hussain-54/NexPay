import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/useStore';

// Components
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './contexts/ToastContext';

// Screens
import { Onboarding } from './screens/Onboarding';
import { Home } from './screens/Home';
import { SendMoney } from './screens/SendMoney';
import { Receive } from './screens/Receive';
import { Wallet } from './screens/Wallet';
import { TransactionHistory } from './screens/TransactionHistory';
import { TransactionDetail } from './screens/TransactionDetail';
import { Settings } from './screens/Settings';
import { Notifications } from './screens/Notifications';

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
              <Route path="*" element={<Navigate to="/home" replace />} />
            </Route>
          </Routes>
        </ToastProvider>
      </AppErrorBoundary>
    </div>
  );
};

export default App;
