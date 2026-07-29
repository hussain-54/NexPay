import React from 'react';
import { RefreshCcw } from 'lucide-react';
import { Button } from './ui';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-bgDark">
          <div className="w-16 h-16 rounded-full bg-danger/10 flex items-center justify-center mb-6">
            <RefreshCcw size={32} className="text-danger" />
          </div>
          <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
          <p className="text-textMuted mb-6">An unexpected error occurred. Please reload.</p>
          <Button onClick={() => window.location.reload()} size="lg">Reload App</Button>
          {process.env.NODE_ENV === 'development' && (
            <pre className="mt-8 text-xs text-left w-full overflow-x-auto text-danger bg-danger/5 p-4 rounded-xl">
              {this.state.error?.toString()}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
