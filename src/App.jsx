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

export default function App() {
  const activeTab          = useStore((s) => s.activeTab);
  const fetchFromSupabase  = useStore((s) => s.fetchFromSupabase);
  const userProfile        = useStore((s) => s.userProfile);
  const userRole           = useStore((s) => s.userRole);
  const accountStatus      = useStore((s) => s.accountStatus);
  const subscriptionStatus = useStore((s) => s.subscriptionStatus);
  const accessType         = useStore((s) => s.accessType);

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
      if (session) fetchFromSupabase();
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

  if (loading) {
    return (
      <div className="auth-gate" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div className="auth-spinner" />
      </div>
    );
  }

  if (!session) return <AuthGate />;

  // ── Access Control Gatekeeper Evaluation ──────────────────────────────────
  const isAdmin = userRole === 'admin' || accessType === 'ADMIN';
  const isGrandfathered = accessType === 'GRANDFATHERED';
  const isSubscriber = accessType === 'SUBSCRIBER';

  // 1. Account Suspended check (applies to non-admins)
  if (!isAdmin && accountStatus === 'SUSPENDED') {
    return <AccountSuspendedScreen user={session.user} />;
  }

  // 2. Pending Activation check (applies to new subscribers)
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
