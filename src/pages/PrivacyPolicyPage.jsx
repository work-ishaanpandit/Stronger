import { Flame, Shield, Lock, Eye, FileText, ArrowLeft, CheckCircle } from 'lucide-react';

export default function PrivacyPolicyPage() {
  const lastUpdated = 'September 3, 2026';

  return (
    <div className="auth-gate" style={{ minHeight: '100vh', padding: 'var(--sp-6) var(--sp-4)', alignItems: 'flex-start', justifyContent: 'center' }}>
      <div className="auth-orb auth-orb-1" />
      <div className="auth-orb auth-orb-2" />

      <div style={{
        maxWidth: '840px',
        width: '100%',
        margin: '0 auto',
        background: 'rgba(18, 18, 26, 0.75)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--sp-8)',
        color: 'var(--text-primary)',
        boxShadow: 'var(--shadow-xl)',
        zIndex: 10
      }}>
        {/* Top Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-6)', flexWrap: 'wrap', gap: 12 }}>
          <a href="/" className="btn btn-ghost btn-sm" style={{ gap: 6, color: 'var(--text-secondary)' }}>
            <ArrowLeft size={16} /> Back to Stronger
          </a>
          <div className="text-xs text-tertiary">Last Updated: {lastUpdated}</div>
        </div>

        {/* Branding & Title */}
        <div style={{ marginBottom: 'var(--sp-8)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 'var(--sp-2)' }}>
            <img src="/logo.png" alt="Stronger Logo" style={{ width: 40, height: 40, borderRadius: 10 }} />
            <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em', background: 'linear-gradient(135deg, #fff 0%, #a1a1aa 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Privacy Policy
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.6 }}>
            Your privacy and data security are the foundational pillars of <strong>Stronger — Discipline Ledger</strong>. This policy details how we collect, protect, and handle your information when you use our platform.
          </p>
        </div>

        {/* Content Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)', fontSize: 14, lineHeight: 1.7, color: 'var(--text-secondary)' }}>
          {/* Section 1 */}
          <section className="card" style={{ padding: 'var(--sp-5)', background: 'var(--elevated)', border: '1px solid var(--border-subtle)' }}>
            <h2 className="text-lg font-bold text-primary" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Eye size={18} className="text-blue" /> 1. Information We Collect
            </h2>
            <p>We collect minimal information necessary to deliver a seamless discipline tracking and remuneration ledger experience:</p>
            <ul style={{ paddingLeft: 20, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <li><strong>Account Credentials & Identity:</strong> When you authenticate via Google Sign-In, we receive your email address, full name, and profile picture avatar.</li>
              <li><strong>Discipline & Task Logs:</strong> Tasks, weights, completion status, core disciplines, daily highlights, evening reflections, and calculated remuneration scores created by you.</li>
              <li><strong>Subscription & Payment Metadata:</strong> Recorded plan status (Monthly/Yearly), subscription validity dates, and manual administrative payment receipts. We do not store raw credit card numbers.</li>
            </ul>
          </section>

          {/* Section 2 */}
          <section className="card" style={{ padding: 'var(--sp-5)', background: 'var(--elevated)', border: '1px solid var(--border-subtle)' }}>
            <h2 className="text-lg font-bold text-primary" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Lock size={18} className="text-green" /> 2. Google OAuth & Data Usage Compliance
            </h2>
            <p>
              Stronger's use and transfer of information received from Google APIs adheres to the <strong>Google API Services User Data Policy</strong>, including the Limited Use requirements.
            </p>
            <ul style={{ paddingLeft: 20, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <li>We use your Google account info strictly for user authentication and session management.</li>
              <li>We do not sell, rent, or trade your Google user data to third parties under any circumstances.</li>
              <li>We do not use your personal task data or reflections to train generalized AI models.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="card" style={{ padding: 'var(--sp-5)', background: 'var(--elevated)', border: '1px solid var(--border-subtle)' }}>
            <h2 className="text-lg font-bold text-primary" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Shield size={18} className="text-purple" /> 3. Data Storage & Security
            </h2>
            <p>
              All user data is stored in encrypted PostgreSQL databases hosted on <strong>Supabase</strong> with Row Level Security (RLS) policies enforced. Each user's data is isolated so that only the authenticated account owner can view or edit their private tasks and discipline entries.
            </p>
          </section>

          {/* Section 4 */}
          <section className="card" style={{ padding: 'var(--sp-5)', background: 'var(--elevated)', border: '1px solid var(--border-subtle)' }}>
            <h2 className="text-lg font-bold text-primary" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <FileText size={18} className="text-orange" /> 4. Your Rights & Data Export
            </h2>
            <p>
              You maintain full ownership of your data. You may request account deletion or data exports at any time by contacting our support team at <a href="mailto:work.ishaanpandit@gmail.com" style={{ color: 'var(--blue)' }}>work.ishaanpandit@gmail.com</a>.
            </p>
          </section>
        </div>

        {/* Footer Navigation */}
        <div style={{ marginTop: 'var(--sp-8)', pt: 'var(--sp-4)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: 'var(--text-tertiary)', flexWrap: 'wrap', gap: 12 }}>
          <div>© {new Date().getFullYear()} Stronger — Discipline Ledger. All rights reserved.</div>
          <div style={{ display: 'flex', gap: 16 }}>
            <a href="/" style={{ color: 'var(--text-secondary)' }}>Home</a>
            <a href="/privacy" style={{ color: 'var(--blue)', fontWeight: 600 }}>Privacy Policy</a>
            <a href="/terms" style={{ color: 'var(--text-secondary)' }}>Terms of Service</a>
          </div>
        </div>
      </div>
    </div>
  );
}
