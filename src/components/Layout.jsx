import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Home, Send, Download, Wallet, Settings } from 'lucide-react';
import { useStore } from '../store/useStore';
import { cn } from './ui';

export const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { icon: Home, label: 'Home', path: '/home' },
    { icon: Send, label: 'Send', path: '/send' },
    { icon: Download, label: 'Receive', path: '/receive' },
    { icon: Wallet, label: 'Wallet', path: '/wallet' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  return (
    <nav
      aria-label="Main navigation"
      className="absolute bottom-0 w-full bg-[#0A0A0F]/85 backdrop-blur-2xl border-t border-white/5 flex justify-around items-center px-3 pt-1.5 pb-[calc(0.4rem+env(safe-area-inset-bottom))] z-50 shadow-nav"
    >
      {navItems.map((item) => {
        const isActive = location.pathname === item.path || (item.path === '/home' && location.pathname === '/');
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            aria-current={isActive ? 'page' : undefined}
            className="group relative flex flex-col items-center justify-center w-16 h-14 transition-all duration-300"
          >
            <div className={cn(
              "absolute inset-x-1 top-1 bottom-3 rounded-2xl transition-all duration-300 -z-10",
              isActive ? "bg-primary/15 scale-100 opacity-100" : "scale-75 opacity-0"
            )} />
            
            <item.icon 
              size={isActive ? 22 : 20} 
              strokeWidth={isActive ? 2.4 : 2}
              className={cn(
                "mb-0.5 transition-all duration-300",
                isActive ? "text-primary -translate-y-0.5" : "text-textMuted group-hover:text-textPrimary"
              )} 
            />
            
            <span className={cn(
              "text-[10px] font-semibold tracking-wide transition-colors duration-300",
              isActive ? "text-textPrimary" : "text-textMuted"
            )}>
              {item.label}
            </span>

            {isActive && (
              <div className="absolute bottom-1 w-1 h-1 rounded-full bg-primary shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
            )}
          </button>
        );
      })}
    </nav>
  );
};

const HIDE_NAV = ['/onboarding', '/tx-success', '/tx-failed', '/qr-scan', '/app-lock'];

export const Layout = () => {
  const { isLoggedIn, isOnboarded } = useStore();
  const location = useLocation();

  const hideNav = HIDE_NAV.some((p) => location.pathname.startsWith(p));
  const showNav = isLoggedIn && isOnboarded && !hideNav;

  return (
    <div className="w-full h-full relative flex flex-col overflow-hidden bg-bgDark">
      <div className={cn("flex-1 overflow-y-auto no-scrollbar relative animate-page", showNav ? "pb-20" : "")}>
        <Outlet />
      </div>
      {showNav && <BottomNav />}
    </div>
  );
};
