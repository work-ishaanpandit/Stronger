import './index.css';
import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import useStore from './store/useStore';
import AuthGate from './components/AuthGate';
import SideNav from './components/SideNav';
import BottomNav from './components/BottomNav';
import DawnAlignment from './pages/DawnAlignment';
import DuskSynthesis from './pages/DuskSynthesis';
import ChronicleGrid from './pages/ChronicleGrid';

export default function App() {
  const activeTab        = useStore((s) => s.activeTab);
  const fetchFromSupabase = useStore((s) => s.fetchFromSupabase);

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

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

    return () => subscription.unsubscribe();
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
      {/* Desktop sidebar — hidden on mobile via CSS */}
      <SideNav session={session} />

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
