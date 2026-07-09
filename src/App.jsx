import './index.css';
import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import useStore from './store/useStore';
import AuthGate from './components/AuthGate';
import SideNav from './components/SideNav';
import MobileHeader from './components/MobileHeader';
import BottomNav from './components/BottomNav';
import DawnAlignment from './pages/DawnAlignment';
import DuskSynthesis from './pages/DuskSynthesis';
import ChronicleGrid from './pages/ChronicleGrid';

export default function App() {
  const activeTab        = useStore((s) => s.activeTab);
  const fetchFromSupabase = useStore((s) => s.fetchFromSupabase);

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    // 1. Check for existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchFromSupabase();
      setLoading(false);
    });

    // 2. Listen for sign-in / sign-out events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchFromSupabase();
    });

    // 3. Set up Realtime Subscription for database updates
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public' },
        (payload) => {
          console.log('Realtime database sync trigger received:', payload.table);
          fetchFromSupabase();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(channel);
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
      <div className="main-content">
        {activeTab === 'dawn'      && <DawnAlignment />}
        {activeTab === 'dusk'      && <DuskSynthesis />}
        {activeTab === 'chronicle' && <ChronicleGrid />}
      </div>

      {/* Mobile bottom nav — only shown on mobile via CSS */}
      <BottomNav />
    </div>
  );
}
