import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { onFirebaseAuthStateChanged, fetchUserProfile, signOutFromFirebase } from '../lib/firebase';

const initialTransactions = [
  { id: 1, type: 'send', recipient: 'Ali Hassan', country: 'PK', date: 'May 8', amount: 120.00, status: 'Completed', avatar: 'AH' },
  { id: 2, type: 'receive', sender: 'Sarah K.', country: 'UK', date: 'May 7', amount: 350.00, status: 'Completed', avatar: 'SK' },
  { id: 3, type: 'send', recipient: 'Ahmed R.', country: 'AE', date: 'May 6', amount: 75.50, status: 'Pending', avatar: 'AR' },
  { id: 4, type: 'send', recipient: 'Mum', country: 'PK', date: 'May 5', amount: 200.00, status: 'Completed', avatar: 'M' },
  { id: 5, type: 'receive', sender: 'Freelance Payment', country: '', date: 'May 3', amount: 500.00, status: 'Completed', avatar: 'FP' }
];

const initialNotifications = [
  { id: 1, type: 'receive', title: 'Money received: +$350 from Sarah K.', time: '2h ago', read: false },
  { id: 2, type: 'send', title: 'Transaction complete: $120 sent to Ali Hassan', time: '5h ago', read: true },
  { id: 3, type: 'security', title: 'KYC Verified — you\'re fully verified!', time: '1d ago', read: true },
  { id: 4, type: 'security', title: 'New login detected on iPhone 13', time: '2d ago', read: true },
  { id: 5, type: 'promo', title: 'Referral bonus: $5 added to your wallet', time: '3d ago', read: true }
];

const initialContacts = [
  { id: 1, name: 'Ali Hassan', country: 'PK', flag: '🇵🇰', account: 'HBL Bank · PK' },
  { id: 2, name: 'Sarah K.', country: 'UK', flag: '🇬🇧', account: 'Monzo · UK' },
  { id: 3, name: 'Ahmed R.', country: 'AE', flag: '🇦🇪', account: 'Emirates NBD · AE' },
]

export const useStore = create(
  persist(
    (set, get) => ({
      // Auth State
      isLoggedIn: false,
      isOnboarded: false,
      user: null,

      login: (userData) => set({ isLoggedIn: true, user: userData, isOnboarded: true }),
      logout: () => {
        signOutFromFirebase();
        set({ isLoggedIn: false, user: null });
      },
      completeOnboarding: () => set({ isOnboarded: true }),
      
      initFirebase: () => {
        const unsubscribe = onFirebaseAuthStateChanged(async (firebaseUser) => {
          if (firebaseUser) {
            try {
              const profile = await fetchUserProfile(firebaseUser.uid);
              if (profile) {
                set({
                  isLoggedIn: true,
                  isOnboarded: true,
                  user: {
                    uid: profile.uid,
                    name: profile.username,
                    email: profile.email,
                    phone: profile.phone,
                    walletAddress: profile.walletAddress,
                    kycStatus: profile.kycStatus,
                    kycVerified: profile.kycVerified,
                    kycDetails: profile.kycDetails,
                    tier: profile.kycVerified ? 'Pro' : 'Free',
                  }
                });
              }
            } catch (err) {
              console.error("Zustand initFirebase error:", err);
            }
          } else {
            set({ isLoggedIn: false, user: null });
          }
        });
        return unsubscribe;
      },
      
      // Balances
      balances: {
        totalUSD: 2847.50,
        USDC: 1847.50,
        USDT: 500.00,
        PKR: 150000,
      },

      updateBalance: (currency, amount) => set((state) => ({
        balances: {
          ...state.balances,
          [currency]: state.balances[currency] + amount
        }
      })),

      // Transactions
      transactions: initialTransactions,
      addTransaction: (tx) => set((state) => ({ transactions: [tx, ...state.transactions] })),

      // Notifications
      notifications: initialNotifications,
      markAllAsRead: () => set((state) => ({
        notifications: state.notifications.map(n => ({ ...n, read: true }))
      })),
      getUnreadCount: () => get().notifications.filter(n => !n.read).length,

      // Contacts
      contacts: initialContacts,
      addContact: (contact) => set((state) => ({ contacts: [contact, ...state.contacts] })),

    }),
    {
      name: 'nexpay-storage',
      partialize: (state) => ({ isLoggedIn: state.isLoggedIn, isOnboarded: state.isOnboarded, user: state.user }),
    }
  )
);
