import './index.css';
import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import useStore from './store/useStore';
import AuthGate from './components/AuthGate';
import SideNav from './components/SideNav';
import MobileHeader from './components/MobileHeader';
import DawnAlignment from './pages/DawnAlignment';
import TaskBasket from './pages/TaskBasket';
import DuskSynthesis from './pages/DuskSynthesis';
import ChronicleGrid from './pages/ChronicleGrid';
import AdminDashboard from './pages/AdminDashboard';
import ActivationGateScreen from './components/ActivationGateScreen';
import SubscriptionGateScreen from './components/SubscriptionGateScreen';
import AccountSuspendedScreen from './components/AccountSuspendedScreen';
import LandingPage from './pages/LandingPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsOfServicePage from './pages/TermsOfServicePage';

export default function App() {
  const activeTab          = useStore((s) => s.activeTab);
  const fetchFromSupabase  = useStore((s) => s.fetchFromSupabase);
  const userProfile        = useStore((s) => s.userProfile);
  const userRole           = useStore((s) => s.userRole);
  const accountStatus      = useStore((s) => s.accountStatus);
  const subscriptionStatus = useStore((s) => s.subscriptionStatus);
  const accessType         = useStore((s) => s.accessType);
  const profileState       = useStore((s) => s.profileState);
  const profileError       = useStore((s) => s.profileError);

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showAuthGate, setShowAuthGate] = useState(false);

  const pathname = window.location.pathname;

  useEffect(() => {
    // 1. Check for existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchFromSupabase().then(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // 2. Listen for sign-in / sign-out events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchFromSupabase();
      } else {
        useStore.getState().resetStore();
      }
    });

    // 3. Set up Realtime Subscription for database updates
    let debounceTimeout = null;
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public' },
        (payload) => {
          console.log('Realtime database sync trigger received:', payload.table);
          if (debounceTimeout) clearTimeout(debounceTimeout);
          debounceTimeout = setTimeout(() => {
            fetchFromSupabase();
          }, 1000); // 1-second debounce to batch multiple updates
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(channel);
      if (debounceTimeout) clearTimeout(debounceTimeout);
    };
  }, []);

  // Public Route: Privacy Policy
  if (pathname === '/privacy') {
    return <PrivacyPolicyPage />;
  }

  // Public Route: Terms of Service
  if (pathname === '/terms') {
    return <TermsOfServicePage />;
  }

  // 1. Auth Loading State
  if (loading) {
    return (
      <div className="auth-gate" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div className="auth-spinner" />
      </div>
    );
  }

  // 2. Unauthenticated User Gate
  if (!session) {
    if (showAuthGate) return <AuthGate />;
    return <LandingPage onLaunchApp={() => setShowAuthGate(true)} />;
  }

  // 3. Profile Loading State
  if (profileState === 'loading') {
    return (
      <div className="auth-gate" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div className="auth-spinner" />
      </div>
    );
  }

  // 4. Profile Fetch Error State — DO NOT COLLAPSE INTO PENDING ACTIVATION
  if (profileState === 'error') {
    return (
      <div className="auth-gate" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div className="auth-card" style={{ maxWidth: 440, textAlign: 'center' }}>
          <div className="text-red font-bold text-lg" style={{ marginBottom: 8 }}>
            Unable to Fetch Profile
          </div>
          <div className="text-xs text-tertiary" style={{ marginBottom: 16 }}>
            {profileError || 'A database connection error occurred. Please retry.'}
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => fetchFromSupabase()}
            style={{ width: '100%' }}
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  // ── Access Control Gatekeeper Evaluation ──────────────────────────────────
  const isAdmin = userRole === 'admin' || accessType === 'ADMIN';
  const isGrandfathered = accessType === 'GRANDFATHERED';
  const isSubscriber = accessType === 'SUBSCRIBER';

  // 1. Account Suspended check (applies to non-admins)
  if (!isAdmin && accountStatus === 'SUSPENDED') {
    return <AccountSuspendedScreen user={session.user} />;
  }

  // 2. Pending Activation check (applies ONLY to new confirmed subscribers)
  if (!isAdmin && isSubscriber && accountStatus === 'PENDING_APPROVAL') {
    return (
      <ActivationGateScreen
        user={session.user}
        profile={userProfile}
        onActivated={() => fetchFromSupabase()}
      />
    );
  }

  // 3. Subscription Check (applies ONLY to SUBSCRIBER access type)
  if (!isAdmin && isSubscriber && accountStatus === 'ACTIVE' && subscriptionStatus !== 'ACTIVE') {
    return <SubscriptionGateScreen user={session.user} profile={userProfile} />;
  }

  // Authorized user layout
  return (
    <div className="app-container">
      {/* Mobile top header — hidden on desktop via CSS */}
      <MobileHeader session={session} onMenuClick={() => setIsMobileMenuOpen(true)} />

      {/* Desktop sidebar — hidden on mobile via CSS (unless explicitly open as a drawer) */}
      <SideNav 
        session={session} 
        isMobileOpen={isMobileMenuOpen} 
        onCloseMobile={() => setIsMobileMenuOpen(false)} 
      />

      {/* Main content area */}
      <div className="main-content" style={{ flex: 1, minWidth: 0 }}>
        {activeTab === 'dawn'      && <DawnAlignment />}
        {activeTab === 'basket'    && <TaskBasket />}
        {activeTab === 'dusk'      && <DuskSynthesis />}
        {activeTab === 'chronicle' && <ChronicleGrid />}
        {activeTab === 'admin'     && isAdmin && <AdminDashboard />}
      </div>
    </div>
  );
}
