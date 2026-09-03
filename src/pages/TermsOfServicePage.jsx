import { Shield, FileText, Scale, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react';

export default function TermsOfServicePage() {
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
              Terms of Service
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.6 }}>
            These Terms of Service ("Terms") govern your access to and use of <strong>Stronger — Discipline Ledger</strong>. By accessing or using the platform, you agree to be bound by these Terms.
          </p>
        </div>

        {/* Content Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)', fontSize: 14, lineHeight: 1.7, color: 'var(--text-secondary)' }}>
          {/* Section 1 */}
          <section className="card" style={{ padding: 'var(--sp-5)', background: 'var(--elevated)', border: '1px solid var(--border-subtle)' }}>
            <h2 className="text-lg font-bold text-primary" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <CheckCircle2 size={18} className="text-blue" /> 1. Service Overview & Eligibility
            </h2>
            <p>
              Stronger — Discipline Ledger is a personal performance tracking, daily task alignment, and qualitative remuneration ledger application. You must authenticate using a valid Google Account to access the service.
            </p>
          </section>

          {/* Section 2 */}
          <section className="card" style={{ padding: 'var(--sp-5)', background: 'var(--elevated)', border: '1px solid var(--border-subtle)' }}>
            <h2 className="text-lg font-bold text-primary" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Scale size={18} className="text-green" /> 2. Account Activation & Subscription Terms
            </h2>
            <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <li><strong>Account Activation:</strong> New user accounts require manual administrative activation or a valid one-time activation code before accessing full application features.</li>
              <li><strong>Subscriptions:</strong> Service access for standard subscriber accounts is billed on a Monthly (₹100/mo) or Yearly (₹1000/yr) basis. Grandfathered accounts created prior to subscription deployment retain active access.</li>
              <li><strong>Expiration & Data Preservation:</strong> If your subscription expires, access to application views is temporarily restricted until renewed. <em>Your underlying task logs, journal entries, and financial history remain completely intact and are never deleted due to subscription expiration.</em></li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="card" style={{ padding: 'var(--sp-5)', background: 'var(--elevated)', border: '1px solid var(--border-subtle)' }}>
            <h2 className="text-lg font-bold text-primary" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <AlertTriangle size={18} className="text-orange" /> 3. Financial Ledger & Remuneration Disclaimer
            </h2>
            <p>
              The remuneration amounts, multipliers, and score values calculated inside Stronger represent a personal qualitative tracking metric chosen by the user. Stronger is not a financial institution, bank, investment advisor, or payment processing gateway. Remuneration calculations within the app do not constitute guaranteed financial earnings or legal debts owed by third parties.
            </p>
          </section>

          {/* Section 4 */}
          <section className="card" style={{ padding: 'var(--sp-5)', background: 'var(--elevated)', border: '1px solid var(--border-subtle)' }}>
            <h2 className="text-lg font-bold text-primary" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Shield size={18} className="text-purple" /> 4. User Conduct & Termination
            </h2>
            <p>
              You agree not to misuse the platform, attempt unauthorized access to administrative APIs, or violate any applicable local or international laws. We reserve the right to suspend or terminate accounts that violate these terms.
            </p>
          </section>

          {/* Section 5 */}
          <section className="card" style={{ padding: 'var(--sp-5)', background: 'var(--elevated)', border: '1px solid var(--border-subtle)' }}>
            <h2 className="text-lg font-bold text-primary" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <FileText size={18} className="text-blue" /> 5. Contact & Support
            </h2>
            <p>
              For inquiries regarding these Terms of Service or your account, please contact us at <a href="mailto:work.ishaanpandit@gmail.com" style={{ color: 'var(--blue)' }}>work.ishaanpandit@gmail.com</a>.
            </p>
          </section>
        </div>

        {/* Footer Navigation */}
        <div style={{ marginTop: 'var(--sp-8)', pt: 'var(--sp-4)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: 'var(--text-tertiary)', flexWrap: 'wrap', gap: 12 }}>
          <div>© {new Date().getFullYear()} Stronger — Discipline Ledger. All rights reserved.</div>
          <div style={{ display: 'flex', gap: 16 }}>
            <a href="/" style={{ color: 'var(--text-secondary)' }}>Home</a>
            <a href="/privacy" style={{ color: 'var(--text-secondary)' }}>Privacy Policy</a>
            <a href="/terms" style={{ color: 'var(--blue)', fontWeight: 600 }}>Terms of Service</a>
          </div>
        </div>
      </div>
    </div>
  );
}
