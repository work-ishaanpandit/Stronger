import { Sun, Moon, LayoutDashboard, Layers, ShieldCheck, Zap, Rocket, Skull, Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';
import { PRICING_CONFIG } from '../config/pricing';

export default function LandingPage({ onLaunchApp }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--canvas)', color: 'var(--text-primary)', fontFamily: 'var(--font)', position: 'relative', overflowX: 'hidden' }}>
      {/* Ambient background glows */}
      <div className="auth-orb auth-orb-1" style={{ top: '-10%', left: '20%', width: 500, height: 500 }} />
      <div className="auth-orb auth-orb-2" style={{ top: '30%', right: '10%', width: 600, height: 600 }} />

      {/* Navigation Header */}
      <header style={{
        maxWidth: 1280,
        margin: '0 auto',
        padding: 'var(--sp-5) var(--sp-6)',
        display: 'flex',
        alignItems: 'center',
        justify: 'space-between',
        position: 'relative',
        zIndex: 20
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/logo.png" alt="Stronger Logo" style={{ width: 36, height: 36, borderRadius: 10 }} />
          <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-0.03em' }}>Stronger</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <a href="/privacy" className="text-xs text-secondary hover-text-primary">Privacy</a>
          <a href="/terms" className="text-xs text-secondary hover-text-primary">Terms</a>
          <button className="btn btn-primary btn-sm" onClick={onLaunchApp} style={{ gap: 6 }}>
            Launch App <ArrowRight size={14} />
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{
        maxWidth: 960,
        margin: '0 auto',
        padding: 'var(--sp-12) var(--sp-6) var(--sp-8)',
        textAlign: 'center',
        position: 'relative',
        zIndex: 10
      }}>
        <div className="badge badge-purple" style={{ margin: '0 auto var(--sp-4)', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', fontSize: 12 }}>
          <Sparkles size={14} className="text-yellow" /> Closed-Loop Discipline Ledger
        </div>

        <h1 style={{
          fontSize: 'clamp(2.5rem, 5vw, 4rem)',
          fontWeight: 800,
          letterSpacing: '-0.04em',
          lineHeight: 1.1,
          marginBottom: 'var(--sp-4)',
          background: 'linear-gradient(135deg, #FFFFFF 0%, #A1A1AA 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Master Your Focus. <br />
          Measure Your Remuneration.
        </h1>

        <p style={{
          fontSize: 'clamp(1rem, 2vw, 1.25rem)',
          color: 'var(--text-secondary)',
          maxWidth: 680,
          margin: '0 auto var(--sp-8)',
          lineHeight: 1.6
        }}>
          Align your morning priorities, audit your evening execution, and maintain a quantitative financial discipline ledger.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={onLaunchApp} style={{ padding: '12px 28px', fontSize: 15, fontWeight: 700, gap: 8 }}>
            Get Started with Google <ArrowRight size={16} />
          </button>
        </div>
      </section>

      {/* Feature Showcase Grid */}
      <section style={{ maxWidth: 1280, margin: '0 auto', padding: 'var(--sp-8) var(--sp-6)', position: 'relative', zIndex: 10 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--sp-6)' }}>
          <div className="card" style={{ padding: 'var(--sp-6)' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255, 159, 10, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--sp-4)' }}>
              <Sun className="text-orange" size={24} />
            </div>
            <h3 className="text-lg font-bold" style={{ marginBottom: 6 }}>Dawn Alignment</h3>
            <p className="text-xs text-secondary" style={{ lineHeight: 1.6 }}>
              Start every day with tactical intent. Set weighted targets, schedule time-blocked commitments, and auto-inject habits.
            </p>
          </div>

          <div className="card" style={{ padding: 'var(--sp-6)' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(10, 132, 255, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--sp-4)' }}>
              <Layers className="text-blue" size={24} />
            </div>
            <h3 className="text-lg font-bold" style={{ marginBottom: 6 }}>Eisenhower Task Basket</h3>
            <p className="text-xs text-secondary" style={{ lineHeight: 1.6 }}>
              Organize tasks across 4 dynamic urgency & importance quadrants (Do Now, Schedule, Quick Action, Someday).
            </p>
          </div>

          <div className="card" style={{ padding: 'var(--sp-6)' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(191, 90, 242, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--sp-4)' }}>
              <Moon className="text-purple" size={24} />
            </div>
            <h3 className="text-lg font-bold" style={{ marginBottom: 6 }}>Dusk Synthesis</h3>
            <p className="text-xs text-secondary" style={{ lineHeight: 1.6 }}>
              Reflect on evening progress, calculate completion multipliers, log epiphanies, and lock daily discipline logs.
            </p>
          </div>

          <div className="card" style={{ padding: 'var(--sp-6)' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(48, 209, 88, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--sp-4)' }}>
              <LayoutDashboard className="text-green" size={24} />
            </div>
            <h3 className="text-lg font-bold" style={{ marginBottom: 6 }}>Chronicle Ledger</h3>
            <p className="text-xs text-secondary" style={{ lineHeight: 1.6 }}>
              Track your long-term performance arc, view historical daily earnings, and settle up remuneration balances.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section style={{ maxWidth: 960, margin: '0 auto', padding: 'var(--sp-10) var(--sp-6)', textAlign: 'center', position: 'relative', zIndex: 10 }}>
        <h2 className="text-2xl font-bold" style={{ marginBottom: 8 }}>Simple, Transparent Pricing</h2>
        <p className="text-xs text-secondary" style={{ marginBottom: 'var(--sp-8)' }}>Invest in your personal execution ledger.</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--sp-6)', maxWidth: 640, margin: '0 auto' }}>
          <div className="card" style={{ padding: 'var(--sp-6)', textAlign: 'center' }}>
            <div className="text-xs font-semibold text-tertiary uppercase">Monthly Plan</div>
            <div className="text-3xl font-bold text-blue" style={{ margin: '12px 0' }}>
              {PRICING_CONFIG.currencySymbol}{PRICING_CONFIG.monthly.price}
              <span className="text-xs font-normal text-tertiary">/month</span>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={onLaunchApp} style={{ width: '100%', marginTop: 'var(--sp-4)' }}>
              Subscribe Monthly
            </button>
          </div>

          <div className="card" style={{ padding: 'var(--sp-6)', textAlign: 'center', border: '1px solid var(--green)' }}>
            <div className="text-xs font-semibold text-green uppercase">Yearly Plan (Best Value)</div>
            <div className="text-3xl font-bold text-green" style={{ margin: '12px 0' }}>
              {PRICING_CONFIG.currencySymbol}{PRICING_CONFIG.yearly.price}
              <span className="text-xs font-normal text-tertiary">/year</span>
            </div>
            <button className="btn btn-primary btn-sm" onClick={onLaunchApp} style={{ width: '100%', marginTop: 'var(--sp-4)' }}>
              Subscribe Yearly
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: 'var(--sp-6)', textAlign: 'center', position: 'relative', zIndex: 20 }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, fontSize: 13, color: 'var(--text-tertiary)' }}>
          <div>© {new Date().getFullYear()} Stronger — Discipline Ledger. All rights reserved.</div>
          <div style={{ display: 'flex', gap: 20 }}>
            <a href="/" style={{ color: 'var(--text-secondary)' }}>Home</a>
            <a href="/privacy" style={{ color: 'var(--text-secondary)' }}>Privacy Policy</a>
            <a href="/terms" style={{ color: 'var(--text-secondary)' }}>Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
