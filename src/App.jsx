import './index.css';
import { useState, useEffect } from 'react';
import { Sun, Moon, LayoutDashboard, Layers } from 'lucide-react';
import { supabase } from './lib/supabase';
import useStore from './store/useStore';
import AuthGate from './components/AuthGate';
import SideNav from './components/SideNav';
import MobileHeader from './components/MobileHeader';
import DawnAlignment from './pages/DawnAlignment';
import TaskBasket from './pages/TaskBasket';
import DuskSynthesis from './pages/DuskSynthesis';
import ChronicleGrid from './pages/ChronicleGrid';

export default function App() {
  const activeTab         = useStore((s) => s.activeTab);
  const setActiveTab      = useStore((s) => s.setActiveTab);
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
      </div>

      {/* Mobile Bottom Navigation — hidden on desktop via CSS */}
      <nav className="bottom-nav">
        <button
          className={`bottom-nav-item ${activeTab === 'dawn' ? 'active' : ''}`}
          onClick={() => setActiveTab('dawn')}
        >
          <Sun size={20} />
          <span className="bottom-nav-label">Dawn</span>
        </button>
        <button
          className={`bottom-nav-item ${activeTab === 'basket' ? 'active' : ''}`}
          onClick={() => setActiveTab('basket')}
        >
          <Layers size={20} />
          <span className="bottom-nav-label">Basket</span>
        </button>
        <button
          className={`bottom-nav-item ${activeTab === 'dusk' ? 'active' : ''}`}
          onClick={() => setActiveTab('dusk')}
        >
          <Moon size={20} />
          <span className="bottom-nav-label">Dusk</span>
        </button>
        <button
          className={`bottom-nav-item ${activeTab === 'chronicle' ? 'active' : ''}`}
          onClick={() => setActiveTab('chronicle')}
        >
          <LayoutDashboard size={20} />
          <span className="bottom-nav-label">Chronicle</span>
        </button>
      </nav>
    </div>
  );
}
