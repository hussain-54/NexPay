import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { cn } from '../components/ui';

const ToastContext = createContext(null);

const toastReducer = (state, action) => {
  switch (action.type) {
    case 'ADD_TOAST':
      return [...state, action.payload];
    case 'REMOVE_TOAST':
      return state.filter(toast => toast.id !== action.payload);
    default:
      return state;
  }
};

export const ToastProvider = ({ children }) => {
  const [toasts, dispatch] = useReducer(toastReducer, []);

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    dispatch({ type: 'ADD_TOAST', payload: { id, message, type } });
    setTimeout(() => {
      dispatch({ type: 'REMOVE_TOAST', payload: id });
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex flex-col space-y-2 pointer-events-none w-[min(90%,360px)]">
        {toasts.map(toast => (
          <div key={toast.id} className="animate-slideUp pointer-events-auto">
            <div className={cn(
              "px-4 py-3 rounded-2xl shadow-card text-sm font-semibold border text-center backdrop-blur-xl",
              toast.type === 'error' ? "bg-danger/15 border-danger/40 text-danger" : 
              toast.type === 'success' ? "bg-accent/15 border-accent/40 text-accent" :
              toast.type === 'warning' ? "bg-warning/15 border-warning/40 text-warning" :
              "bg-primary/15 border-primary/40 text-primary"
            )} role="status">
              {toast.message}
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};
