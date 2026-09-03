import { useState, useEffect } from 'react';
import { format, addMonths, addYears } from 'date-fns';
import { X, Shield, KeyRound, CreditCard, Clock, Check, RefreshCw, AlertCircle, Plus, Sparkles, UserCheck, UserX } from 'lucide-react';
import { supabase } from '../lib/supabase';
import useStore from '../store/useStore';
import { PRICING_CONFIG, getEffectivePrice } from '../config/pricing';

export default function ManageUserModal({ targetUser, onClose, onRefresh }) {
  const adminUser = useStore((s) => s.userProfile);
  
  const [activeTab, setActiveTab] = useState('account'); // 'account', 'activation', 'subscription', 'history'
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState({ type: null, text: null });

  // Profile data
  const [profile, setProfile] = useState(targetUser);

  // Activation Code state
  const [activeCode, setActiveCode] = useState(null);

  // Subscription form state
  const [plan, setPlan] = useState('monthly');
  const [amount, setAmount] = useState('100');
  const [customMonthly, setCustomMonthly] = useState(targetUser.custom_monthly_price ?? '');
  const [customYearly, setCustomYearly] = useState(targetUser.custom_yearly_price ?? '');
  const [customReason, setCustomReason] = useState(targetUser.custom_price_reason ?? '');
  const [subNotes, setSubNotes] = useState('');

  // Payment history state
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    fetchUserData();
  }, [targetUser.id]);

  const fetchUserData = async () => {
    // 1. Fetch fresh profile
    const { data: pData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', targetUser.id)
      .single();
    if (pData) {
      setProfile(pData);
      setCustomMonthly(pData.custom_monthly_price ?? '');
      setCustomYearly(pData.custom_yearly_price ?? '');
      setCustomReason(pData.custom_price_reason ?? '');
    }

    // 2. Fetch latest active activation code
    const { data: cData } = await supabase
      .from('activation_codes')
      .select('*')
      .eq('user_id', targetUser.id)
      .order('created_at', { ascending: false })
      .limit(1);
    if (cData && cData.length > 0) setActiveCode(cData[0]);

    // 3. Fetch payment history
    const { data: payData } = await supabase
      .from('payment_records')
      .select('*')
      .eq('user_id', targetUser.id)
      .order('created_at', { ascending: false });
    if (payData) setPayments(payData);
  };

  // Update default payment amount when plan changes
  useEffect(() => {
    const effective = getEffectivePrice(plan, profile);
    setAmount(String(effective));
  }, [plan, profile]);

  // Account Status actions
  const handleUpdateStatus = async (newStatus) => {
    setSubmitting(true);
    setMsg({ type: null, text: null });

    const prevStatus = profile.account_status;
    const { error } = await supabase
      .from('profiles')
      .update({ account_status: newStatus })
      .eq('id', targetUser.id);

    if (error) {
      setMsg({ type: 'error', text: error.message });
      setSubmitting(false);
      return;
    }

    // Log audit action
    await supabase.from('audit_logs').insert({
      admin_user_id: adminUser.id,
      target_user_id: targetUser.id,
      action: `account_status_${newStatus.toLowerCase()}`,
      previous_value: { account_status: prevStatus },
      new_value: { account_status: newStatus },
      metadata: { target_email: profile.email }
    });

    setMsg({ type: 'success', text: `Account status updated to ${newStatus}` });
    setSubmitting(false);
    fetchUserData();
    if (onRefresh) onRefresh();
  };

  // Generate Activation Code
  const handleGenerateCode = async () => {
    setSubmitting(true);
    setMsg({ type: null, text: null });

    // Generate random 8-char code formatted HB7K-92PX
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const randPart1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const randPart2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const newCode = `${randPart1}-${randPart2}`;

    // Expires in 7 days
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: codeData, error } = await supabase
      .from('activation_codes')
      .insert({
        code: newCode,
        user_id: targetUser.id,
        expires_at: expiresAt,
        is_used: false
      })
      .select()
      .single();

    if (error) {
      setMsg({ type: 'error', text: error.message });
      setSubmitting(false);
      return;
    }

    // Log audit action
    await supabase.from('audit_logs').insert({
      admin_user_id: adminUser.id,
      target_user_id: targetUser.id,
      action: 'generate_activation_code',
      new_value: { code: newCode, expires_at: expiresAt }
    });

    setMsg({ type: 'success', text: `Generated code: ${newCode}` });
    setActiveCode(codeData);
    setSubmitting(false);
    if (onRefresh) onRefresh();
  };

  // Add / Renew Subscription Payment
  const handleAddSubscription = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg({ type: null, text: null });

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setMsg({ type: 'error', text: 'Please enter a valid positive payment amount.' });
      setSubmitting(false);
      return;
    }

    const today = new Date();
    const validFromStr = format(today, 'yyyy-MM-dd');
    const validUntilDate = plan === 'yearly' ? addYears(today, 1) : addMonths(today, 1);
    const validUntilStr = format(validUntilDate, 'yyyy-MM-dd');

    // 1. Insert payment record
    const { error: payErr } = await supabase
      .from('payment_records')
      .insert({
        user_id: targetUser.id,
        amount: numAmount,
        currency: PRICING_CONFIG.currency,
        plan,
        payment_date: validFromStr,
        valid_from: validFromStr,
        valid_until: validUntilStr,
        status: 'ACTIVE',
        recorded_by: adminUser.id,
        notes: subNotes
      });

    if (payErr) {
      setMsg({ type: 'error', text: payErr.message });
      setSubmitting(false);
      return;
    }

    // 2. Update user profile subscription_status to ACTIVE
    await supabase
      .from('profiles')
      .update({ subscription_status: 'ACTIVE' })
      .eq('id', targetUser.id);

    // 3. Log audit action
    await supabase.from('audit_logs').insert({
      admin_user_id: adminUser.id,
      target_user_id: targetUser.id,
      action: 'add_subscription_payment',
      new_value: { amount: numAmount, plan, valid_from: validFromStr, valid_until: validUntilStr }
    });

    setMsg({ type: 'success', text: `Recorded ${PRICING_CONFIG.currencySymbol}${numAmount} ${plan} subscription!` });
    setSubNotes('');
    setSubmitting(false);
    fetchUserData();
    if (onRefresh) onRefresh();
  };

  // Save Custom Pricing Override
  const handleSaveCustomPrice = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg({ type: null, text: null });

    const mPrice = customMonthly !== '' ? parseFloat(customMonthly) : null;
    const yPrice = customYearly !== '' ? parseFloat(customYearly) : null;

    const { error } = await supabase
      .from('profiles')
      .update({
        custom_monthly_price: mPrice,
        custom_yearly_price: yPrice,
        custom_price_reason: customReason
      })
      .eq('id', targetUser.id);

    if (error) {
      setMsg({ type: 'error', text: error.message });
      setSubmitting(false);
      return;
    }

    setMsg({ type: 'success', text: 'Custom price override saved!' });
    setSubmitting(false);
    fetchUserData();
    if (onRefresh) onRefresh();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '640px' }}>
        {/* Modal Header */}
        <div className="modal-header">
          <div>
            <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Shield className="text-blue" size={20} />
              Manage {profile.full_name || profile.email}
            </h2>
            <div className="text-xs text-tertiary" style={{ marginTop: 2 }}>
              ID: {profile.id} • Joined: {profile.created_at ? format(new Date(profile.created_at), 'MMM d, yyyy') : 'N/A'}
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Modal Nav Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 'var(--sp-4)' }}>
          <button
            className={`btn btn-ghost btn-sm ${activeTab === 'account' ? 'btn-primary' : ''}`}
            onClick={() => setActiveTab('account')}
            style={{ borderRadius: 0, borderBottom: activeTab === 'account' ? '2px solid var(--blue)' : 'none' }}
          >
            Account
          </button>
          <button
            className={`btn btn-ghost btn-sm ${activeTab === 'activation' ? 'btn-primary' : ''}`}
            onClick={() => setActiveTab('activation')}
            style={{ borderRadius: 0, borderBottom: activeTab === 'activation' ? '2px solid var(--blue)' : 'none' }}
          >
            Activation Code
          </button>
          <button
            className={`btn btn-ghost btn-sm ${activeTab === 'subscription' ? 'btn-primary' : ''}`}
            onClick={() => setActiveTab('subscription')}
            style={{ borderRadius: 0, borderBottom: activeTab === 'subscription' ? '2px solid var(--blue)' : 'none' }}
          >
            Add Payment
          </button>
          <button
            className={`btn btn-ghost btn-sm ${activeTab === 'history' ? 'btn-primary' : ''}`}
            onClick={() => setActiveTab('history')}
            style={{ borderRadius: 0, borderBottom: activeTab === 'history' ? '2px solid var(--blue)' : 'none' }}
          >
            Payment History ({payments.length})
          </button>
        </div>

        {/* Global Feedback Message */}
        {msg.text && (
          <div style={{
            background: msg.type === 'error' ? 'rgba(255,69,58,0.1)' : 'rgba(48,209,88,0.1)',
            border: `1px solid ${msg.type === 'error' ? 'rgba(255,69,58,0.3)' : 'rgba(48,209,88,0.3)'}`,
            color: msg.type === 'error' ? 'var(--red)' : 'var(--green)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--sp-3)',
            fontSize: 13,
            marginBottom: 'var(--sp-4)',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            {msg.type === 'error' ? <AlertCircle size={16} /> : <Check size={16} />}
            {msg.text}
          </div>
        )}

        <div className="modal-body">
          {/* TAB 1: Account Controls */}
          {activeTab === 'account' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 'var(--sp-3)',
                background: 'var(--elevated)',
                padding: 'var(--sp-4)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)'
              }}>
                <div>
                  <div className="text-xs text-tertiary">Role</div>
                  <div className="font-semibold text-sm" style={{ color: profile.role === 'admin' ? 'var(--purple)' : 'var(--text-primary)' }}>
                    {profile.role?.toUpperCase() || 'USER'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-tertiary">Access Type</div>
                  <div className="font-semibold text-sm" style={{ color: profile.access_type === 'GRANDFATHERED' ? 'var(--orange)' : 'var(--blue)' }}>
                    {profile.access_type || 'SUBSCRIBER'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-tertiary">Account Status</div>
                  <div className="font-semibold text-sm" style={{ color: profile.account_status === 'ACTIVE' ? 'var(--green)' : profile.account_status === 'SUSPENDED' ? 'var(--red)' : 'var(--orange)' }}>
                    {profile.account_status || 'PENDING_APPROVAL'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-tertiary">Subscription Status</div>
                  <div className="font-semibold text-sm" style={{ color: profile.subscription_status === 'ACTIVE' ? 'var(--green)' : 'var(--text-tertiary)' }}>
                    {profile.subscription_status || 'NONE'}
                  </div>
                </div>
              </div>

              {/* Status Action Buttons */}
              <div style={{ background: 'var(--elevated)', padding: 'var(--sp-4)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <div className="text-xs text-tertiary font-semibold uppercase" style={{ marginBottom: 'var(--sp-3)' }}>
                  Change Account Status
                </div>
                <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
                  {profile.account_status !== 'ACTIVE' && (
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => handleUpdateStatus('ACTIVE')}
                      disabled={submitting}
                    >
                      <UserCheck size={14} /> Activate Account
                    </button>
                  )}

                  {profile.account_status !== 'SUSPENDED' && (
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={() => handleUpdateStatus('SUSPENDED')}
                      style={{ color: 'var(--red)' }}
                      disabled={submitting}
                    >
                      <UserX size={14} /> Suspend Account
                    </button>
                  )}

                  {profile.account_status === 'SUSPENDED' && (
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => handleUpdateStatus('ACTIVE')}
                      disabled={submitting}
                    >
                      <UserCheck size={14} /> Reactivate Account
                    </button>
                  )}
                </div>
              </div>

              {/* Custom Pricing Override Form */}
              <form onSubmit={handleSaveCustomPrice} style={{ background: 'var(--elevated)', padding: 'var(--sp-4)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <div className="text-xs text-tertiary font-semibold uppercase" style={{ marginBottom: 'var(--sp-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Sparkles size={14} className="text-yellow" /> Custom Price Override
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--sp-3)', marginBottom: 'var(--sp-3)' }}>
                  <div>
                    <label className="text-xs">Custom Monthly (₹)</label>
                    <input
                      type="number"
                      className="input input-sm"
                      placeholder="Std: ₹100"
                      value={customMonthly}
                      onChange={(e) => setCustomMonthly(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs">Custom Yearly (₹)</label>
                    <input
                      type="number"
                      className="input input-sm"
                      placeholder="Std: ₹1000"
                      value={customYearly}
                      onChange={(e) => setCustomYearly(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 'var(--sp-3)' }}>
                  <label className="text-xs">Reason for Override (Optional)</label>
                  <input
                    type="text"
                    className="input input-sm"
                    placeholder="e.g. Beta tester, Friend, Early adopter"
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                  />
                </div>

                <button type="submit" className="btn btn-sm btn-primary" disabled={submitting}>
                  Save Custom Price
                </button>
              </form>
            </div>
          )}

          {/* TAB 2: Activation Code */}
          {activeTab === 'activation' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
              <div style={{ background: 'var(--elevated)', padding: 'var(--sp-4)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', textAlign: 'center' }}>
                <KeyRound size={24} className="text-orange" style={{ margin: '0 auto var(--sp-2)' }} />
                <div className="text-xs text-tertiary">Active One-Time Code</div>
                
                {activeCode ? (
                  <div style={{ marginTop: 8 }}>
                    <div className="text-2xl font-bold tracking-widest text-primary" style={{ fontFamily: 'monospace' }}>
                      {activeCode.code}
                    </div>
                    <div className="text-xs text-tertiary" style={{ marginTop: 4 }}>
                      Status: {activeCode.is_used ? 'Used' : new Date(activeCode.expires_at) < new Date() ? 'Expired' : 'Active (Pending User)'} • Expires: {format(new Date(activeCode.expires_at), 'MMM d, h:mm a')}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-tertiary" style={{ marginTop: 8 }}>No active activation code generated yet.</div>
                )}

                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleGenerateCode}
                  disabled={submitting}
                  style={{ marginTop: 'var(--sp-4)' }}
                >
                  <RefreshCw size={14} /> {activeCode ? 'Regenerate Code' : 'Generate Activation Code'}
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Add/Renew Subscription */}
          {activeTab === 'subscription' && (
            <form onSubmit={handleAddSubscription} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
              <div style={{ background: 'var(--elevated)', padding: 'var(--sp-4)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <div className="text-xs text-tertiary font-semibold uppercase" style={{ marginBottom: 'var(--sp-3)' }}>
                  Subscription Plan
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--sp-3)', marginBottom: 'var(--sp-4)' }}>
                  <button
                    type="button"
                    className={`btn ${plan === 'monthly' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setPlan('monthly')}
                  >
                    Monthly (₹100/mo)
                  </button>
                  <button
                    type="button"
                    className={`btn ${plan === 'yearly' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setPlan('yearly')}
                  >
                    Yearly (₹1000/yr)
                  </button>
                </div>

                <div className="input-group" style={{ marginBottom: 'var(--sp-4)' }}>
                  <label className="input-label">Recorded Amount (₹)</label>
                  <input
                    type="number"
                    className="input"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Notes / Reference (Optional)</label>
                  <input
                    type="text"
                    className="input input-sm"
                    placeholder="e.g. UPI Ref #123456, Cash payment"
                    value={subNotes}
                    onChange={(e) => setSubNotes(e.target.value)}
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" disabled={submitting}>
                Record Payment & Activate Subscription
              </button>
            </form>
          )}

          {/* TAB 4: Payment History */}
          {activeTab === 'history' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
              {payments.length === 0 ? (
                <div className="text-center text-xs text-tertiary" style={{ padding: 'var(--sp-6)' }}>
                  No payment records found for this user.
                </div>
              ) : (
                payments.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      background: 'var(--elevated)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: 'var(--sp-3) var(--sp-4)',
                      display: 'flex',
                      alignItems: 'center',
                      justify: 'space-between',
                      fontSize: 13
                    }}
                  >
                    <div>
                      <div className="font-semibold text-primary">
                        {p.currency}{p.amount} • <span style={{ textTransform: 'capitalize' }}>{p.plan}</span>
                      </div>
                      <div className="text-xs text-tertiary">
                        Valid: {format(new Date(p.valid_from), 'MMM d, yyyy')} → {format(new Date(p.valid_until), 'MMM d, yyyy')}
                      </div>
                      {p.notes && <div className="text-xs text-secondary" style={{ marginTop: 2 }}>Note: {p.notes}</div>}
                    </div>

                    <span className="badge badge-green" style={{ fontSize: 10 }}>RECORDED</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
