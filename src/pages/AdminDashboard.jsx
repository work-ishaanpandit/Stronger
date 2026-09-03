import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { Shield, Users, UserCheck, UserX, Clock, CreditCard, DollarSign, Search, RefreshCw, Filter, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ManageUserModal from '../components/ManageUserModal';
import { PRICING_CONFIG, getEffectivePrice } from '../config/pricing';

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [subFilter, setSubFilter] = useState('all');

  const [queryError, setQueryError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);
    setQueryError(null);

    // 1. Fetch all profiles
    const { data: profilesData, error: profErr } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    // 2. Fetch all payment records
    const { data: paymentsData, error: payErr } = await supabase
      .from('payment_records')
      .select('*');

    if (profErr) {
      console.error('Error fetching admin profiles:', profErr);
      setQueryError(profErr.message || 'Database error fetching user profiles');
      setLoading(false);
      return;
    }

    if (profilesData) setUsers(profilesData);
    if (paymentsData) setPayments(paymentsData);
    setLoading(false);
  };

  // Compute Overview Statistics
  const stats = useMemo(() => {
    const totalUsers = users.length;
    const pendingUsers = users.filter((u) => u.account_status === 'PENDING_APPROVAL').length;
    const activeUsers = users.filter((u) => u.account_status === 'ACTIVE').length;
    const suspendedUsers = users.filter((u) => u.account_status === 'SUSPENDED').length;

    const activeSubs = users.filter((u) => u.subscription_status === 'ACTIVE').length;
    const expiredSubs = users.filter((u) => u.subscription_status === 'EXPIRED').length;
    const noSubs = users.filter((u) => u.subscription_status === 'NONE').length;
    const grandfathered = users.filter((u) => u.access_type === 'GRANDFATHERED').length;

    const totalRevenue = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const monthlyRev = payments
      .filter((p) => p.plan === 'monthly')
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const yearlyRev = payments
      .filter((p) => p.plan === 'yearly')
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    return {
      totalUsers, pendingUsers, activeUsers, suspendedUsers,
      activeSubs, expiredSubs, noSubs, grandfathered,
      totalRevenue, monthlyRev, yearlyRev
    };
  }, [users, payments]);

  // Filtered users list
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Search
      const matchSearch =
        search === '' ||
        (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
        (u.full_name || '').toLowerCase().includes(search.toLowerCase());

      // Account Status Filter
      const matchStatus =
        statusFilter === 'all' || u.account_status === statusFilter;

      // Subscription Status Filter
      const matchSub =
        subFilter === 'all' || u.subscription_status === subFilter;

      return matchSearch && matchStatus && matchSub;
    });
  }, [users, search, statusFilter, subFilter]);

  return (
    <main className="page anim-fade">
      {/* Page Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
            <Shield className="text-blue" size={26} />
            <h1 className="page-title">Admin Dashboard</h1>
            <button
              className="btn btn-ghost btn-sm btn-icon"
              onClick={fetchAdminData}
              title="Refresh Admin Data"
            >
              <RefreshCw size={15} />
            </button>
          </div>
          <span className="badge badge-purple" style={{ fontSize: 12 }}>
            System Administrator
          </span>
        </div>
        <div className="page-subtitle">User activations, subscription management, and revenue statistics</div>
      </div>

      {/* Stats Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--sp-4)', marginBottom: 'var(--sp-6)' }}>
        {/* User Stats Card */}
        <div className="card" style={{ padding: 'var(--sp-4) var(--sp-5)' }}>
          <div className="section-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Users size={14} className="text-blue" /> User Statistics
          </div>
          <div className="text-2xl font-bold" style={{ marginBottom: 'var(--sp-2)' }}>{stats.totalUsers} Total</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, fontSize: 11 }}>
            <div style={{ background: 'var(--bg)', padding: '4px 8px', borderRadius: 4, textAlign: 'center' }}>
              <span style={{ color: 'var(--orange)', fontWeight: 700 }}>{stats.pendingUsers}</span> Pending
            </div>
            <div style={{ background: 'var(--bg)', padding: '4px 8px', borderRadius: 4, textAlign: 'center' }}>
              <span style={{ color: 'var(--green)', fontWeight: 700 }}>{stats.activeUsers}</span> Active
            </div>
            <div style={{ background: 'var(--bg)', padding: '4px 8px', borderRadius: 4, textAlign: 'center' }}>
              <span style={{ color: 'var(--red)', fontWeight: 700 }}>{stats.suspendedUsers}</span> Suspended
            </div>
          </div>
        </div>

        {/* Subscription Stats Card */}
        <div className="card" style={{ padding: 'var(--sp-4) var(--sp-5)' }}>
          <div className="section-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <CreditCard size={14} className="text-purple" /> Subscription Stats
          </div>
          <div className="text-2xl font-bold" style={{ marginBottom: 'var(--sp-2)' }}>{stats.activeSubs} Active</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, fontSize: 11 }}>
            <div style={{ background: 'var(--bg)', padding: '4px 8px', borderRadius: 4, textAlign: 'center' }}>
              <span style={{ color: 'var(--green)', fontWeight: 700 }}>{stats.activeSubs}</span> Active
            </div>
            <div style={{ background: 'var(--bg)', padding: '4px 8px', borderRadius: 4, textAlign: 'center' }}>
              <span style={{ color: 'var(--red)', fontWeight: 700 }}>{stats.expiredSubs}</span> Expired
            </div>
            <div style={{ background: 'var(--bg)', padding: '4px 8px', borderRadius: 4, textAlign: 'center' }}>
              <span style={{ color: 'var(--orange)', fontWeight: 700 }}>{stats.grandfathered}</span> Legacy
            </div>
          </div>
        </div>

        {/* Revenue Stats Card */}
        <div className="card" style={{ padding: 'var(--sp-4) var(--sp-5)' }}>
          <div className="section-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <DollarSign size={14} className="text-green" /> Revenue Statistics
          </div>
          <div className="text-2xl font-bold text-green" style={{ marginBottom: 'var(--sp-2)' }}>
            {PRICING_CONFIG.currencySymbol}{stats.totalRevenue.toFixed(0)} Total
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, fontSize: 11 }}>
            <div style={{ background: 'var(--bg)', padding: '4px 8px', borderRadius: 4, textAlign: 'center' }}>
              Monthly: <span className="font-bold">{PRICING_CONFIG.currencySymbol}{stats.monthlyRev}</span>
            </div>
            <div style={{ background: 'var(--bg)', padding: '4px 8px', borderRadius: 4, textAlign: 'center' }}>
              Yearly: <span className="font-bold">{PRICING_CONFIG.currencySymbol}{stats.yearlyRev}</span>
            </div>
          </div>
        </div>
      </div>

      {/* User Search & Filter Toolbar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 'var(--sp-3)',
        alignItems: 'center',
        justify: 'space-between',
        marginBottom: 'var(--sp-5)',
        background: 'var(--elevated)',
        padding: 'var(--sp-3) var(--sp-4)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)'
      }}>
        <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: '360px' }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input
            type="text"
            className="input input-sm"
            style={{ paddingLeft: 34, width: '100%' }}
            placeholder="Search email or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
          <select
            className="input input-sm"
            style={{ width: 'auto' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Account: All</option>
            <option value="PENDING_APPROVAL">Pending</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
          </select>

          <select
            className="input input-sm"
            style={{ width: 'auto' }}
            value={subFilter}
            onChange={(e) => setSubFilter(e.target.value)}
          >
            <option value="all">Subscription: All</option>
            <option value="ACTIVE">Active</option>
            <option value="EXPIRED">Expired</option>
            <option value="NONE">None</option>
          </select>
        </div>
      </div>

      {/* User Cards Grid */}
      {loading ? (
        <div className="card text-center" style={{ padding: 'var(--sp-8)' }}>
          <div className="auth-spinner" style={{ margin: '0 auto var(--sp-3)' }} />
          <div className="text-sm text-tertiary">Loading registered users...</div>
        </div>
      ) : queryError ? (
        <div className="card text-center" style={{ padding: 'var(--sp-8)', border: '1px solid var(--red)' }}>
          <div className="text-red font-bold text-base" style={{ marginBottom: 4 }}>Failed to Fetch Registered Users</div>
          <div className="text-xs text-tertiary" style={{ marginBottom: 16 }}>{queryError}</div>
          <button className="btn btn-sm btn-primary" onClick={fetchAdminData}>
            Retry Query
          </button>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="card text-center" style={{ padding: 'var(--sp-8)' }}>
          <div className="text-sm text-tertiary">No registered users match the active filters.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: 'var(--sp-4)' }}>
          {filteredUsers.map((u) => (
            <UserTile key={u.id} user={u} onManage={() => setSelectedUser(u)} />
          ))}
        </div>
      )}

      {/* Manage User Modal */}
      {selectedUser && (
        <ManageUserModal
          targetUser={selectedUser}
          onClose={() => setSelectedUser(null)}
          onRefresh={fetchAdminData}
        />
      )}
    </main>
  );
}

function UserTile({ user, onManage }) {
  const isGrandfathered = user.access_type === 'GRANDFATHERED';
  const isAdmin = user.role === 'admin';
  const isPending = user.account_status === 'PENDING_APPROVAL';
  const isSuspended = user.account_status === 'SUSPENDED';

  const monthlyPrice = getEffectivePrice('monthly', user);
  const yearlyPrice = getEffectivePrice('yearly', user);
  const hasCustomPrice = user.custom_monthly_price !== null || user.custom_yearly_price !== null;

  return (
    <div className="card" style={{ padding: 'var(--sp-4) var(--sp-5)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: isPending ? '1px solid var(--orange)' : '1px solid var(--border)' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--sp-2)' }}>
          <div>
            <div className="font-bold text-base text-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {user.full_name || 'User'}
              {isAdmin && <span className="badge badge-purple" style={{ fontSize: 9 }}>ADMIN</span>}
            </div>
            <div className="text-xs text-tertiary">{user.email}</div>
          </div>

          <span
            className={`badge ${isPending ? 'badge-yellow' : isSuspended ? 'badge-red' : 'badge-green'}`}
            style={{ fontSize: 10 }}
          >
            {user.account_status || 'PENDING'}
          </span>
        </div>

        <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius-sm)', padding: 'var(--sp-3)', margin: 'var(--sp-3) 0', fontSize: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="text-tertiary">Access Type:</span>
            <span className="font-semibold" style={{ color: isGrandfathered ? 'var(--orange)' : 'var(--blue)' }}>
              {user.access_type || 'SUBSCRIBER'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="text-tertiary">Subscription:</span>
            <span className="font-semibold" style={{ color: user.subscription_status === 'ACTIVE' ? 'var(--green)' : 'var(--text-tertiary)' }}>
              {user.subscription_status || 'NONE'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="text-tertiary">Effective Price:</span>
            <span className="font-semibold">
              {PRICING_CONFIG.currencySymbol}{monthlyPrice}/mo ({PRICING_CONFIG.currencySymbol}{yearlyPrice}/yr)
              {hasCustomPrice && <Sparkles size={11} className="text-yellow" style={{ display: 'inline', marginLeft: 4 }} />}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="text-tertiary">Joined:</span>
            <span>{user.created_at ? format(new Date(user.created_at), 'MMM d, yyyy') : 'N/A'}</span>
          </div>
        </div>
      </div>

      <button
        className="btn btn-sm btn-ghost"
        onClick={onManage}
        style={{ width: '100%', justifyContent: 'center', marginTop: 'var(--sp-2)' }}
      >
        [ Manage User ]
      </button>
    </div>
  );
}
