import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

const StatCard = ({ title, value, subtitle, color }) => (
  <div className={`${color} rounded-xl p-5 text-white shadow-md flex flex-col justify-between h-32`}>
    <h3 className="text-xs font-bold uppercase tracking-wider opacity-90">{title}</h3>
    <div className="text-4xl font-black">{value}</div>
    <div className="text-xs bg-white bg-opacity-20 py-1 px-2 rounded mt-2 truncate">{subtitle}</div>
  </div>
);

const LowStockAlert = ({ items, onNavigate }) => (
  <div className="bg-red-50 border border-red-200 rounded-xl p-5 mt-6 shadow-sm">
    <div className="flex items-center gap-2 mb-4">
      <span className="text-red-600 text-xl">⚠️</span>
      <div>
        <h3 className="text-red-800 font-bold">Critical Low Stock Alerts</h3>
        <p className="text-red-600 text-xs">These items are running dangerously low.</p>
      </div>
    </div>

    {items.length === 0 ? (
      <p className="text-sm text-green-700 font-bold">All stock levels look healthy!</p>
    ) : (
      <table className="w-full text-left text-sm">
        <thead className="border-b border-red-200 text-red-800">
          <tr>
            <th className="py-2">Material</th>
            <th className="py-2">Current Balance</th>
            <th className="py-2 text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} className="border-b border-red-100 last:border-0">
              <td className="py-3 font-semibold text-gray-900">{item.ProductName}</td>
              <td className="py-3 font-bold text-red-600">{item.ClosingBalance}</td>
              <td className="py-3 text-right">
                <button
                  onClick={() => onNavigate && onNavigate('purchase', 'Store & Inventory')}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded font-bold transition-colors"
                >
                  Order More
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
);

export default function Dashboard({ user, onNavigate }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Admin Target Manager State
  const [targetMonth, setTargetMonth] = useState(new Date().toISOString().slice(0, 7));
  const [targetAmount, setTargetAmount] = useState('');
  const [savingTarget, setSavingTarget] = useState(false);
  const [targetMsg, setTargetMsg] = useState({ type: '', text: '' });

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('erp_token');
      const res = await fetch(`${API_BASE_URL}/dashboard/stats`, {
        headers: { 'x-access-token': token }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        if (data.monthlyTarget) setTargetAmount(data.monthlyTarget);
      }
    } catch (err) {
      console.error("Dashboard fetch error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleSaveTarget = async (e) => {
    e.preventDefault();
    setSavingTarget(true);
    setTargetMsg({ type: '', text: '' });

    try {
      const token = localStorage.getItem('erp_token');
      const res = await fetch(`${API_BASE_URL}/dashboard/target`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-token': token
        },
        body: JSON.stringify({ targetMonth, targetAmount })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update target');

      setTargetMsg({ type: 'success', text: data.message });
      await fetchStats();
    } catch (err) {
      setTargetMsg({ type: 'error', text: err.message });
    } finally {
      setSavingTarget(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500 font-bold">Loading your dashboard...</div>;
  }

  // 1. MASTER ADMIN DASHBOARD
  const renderAdminDashboard = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Welcome back, {user.username}</h1>
        <p className="text-gray-500">Here is the current operational status of Tarwani Soaps.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="PENDING SALES" value={stats?.pendingSales || 0} subtitle="Orders waiting dispatch" color="bg-blue-600" />
        <StatCard title="ACTIVE PRODUCTION" value={stats?.activeProduction || 0} subtitle="Batches on floor" color="bg-orange-500" />
        <StatCard title="PENDING PURCHASES" value={stats?.pendingPurchases || 0} subtitle="Inbound material" color="bg-green-600" />
        <StatCard title="TOTAL REVENUE" value={`₹${(stats?.todayRevenue || 0).toLocaleString('en-IN')}`} subtitle="Today's Sales Orders" color="bg-purple-600" />
      </div>

      {/* ADMIN MONTHLY TARGET MANAGER */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Monthly Sales Target</h3>
            <p className="text-xs text-gray-500">
              Current Progress:{' '}
              <span className="font-semibold text-green-700">
                {stats?.achievedFormatted || '₹0.00L / ₹0.00L'} ({stats?.targetPercentage || 0}%)
              </span>
            </p>
          </div>

          <form onSubmit={handleSaveTarget} className="flex flex-wrap items-center gap-3">
            <input
              type="month"
              value={targetMonth}
              onChange={(e) => setTargetMonth(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              type="number"
              min="1"
              step="1000"
              placeholder="Target in ₹ (e.g. 1800000)"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <button
              type="submit"
              disabled={savingTarget}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors"
            >
              {savingTarget ? 'Saving...' : 'Save Target'}
            </button>
          </form>
        </div>

        {targetMsg.text && (
          <p className={`mt-3 text-xs font-semibold ${targetMsg.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
            {targetMsg.text}
          </p>
        )}
      </div>

      <LowStockAlert items={stats?.lowStockItems || []} onNavigate={onNavigate} />
    </div>
  );

  // 2. SALES TEAM DASHBOARD
  const renderSalesDashboard = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Sales Command Center</h1>
        <p className="text-gray-500">Track your daily targets and customer dispatches.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="ORDERS BOOKED TODAY" value={stats?.salesToday || 0} subtitle="New sales orders" color="bg-blue-600" />
        <StatCard title="READY FOR DISPATCH" value={stats?.pendingSales || 0} subtitle="Awaiting logistics" color="bg-yellow-500" />
        <StatCard
          title="MONTHLY TARGET"
          value={`${stats?.targetPercentage || 0}%`}
          subtitle={`${stats?.achievedFormatted || '₹0.00L / ₹0.00L'} Achieved`}
          color="bg-green-600"
        />
      </div>
    </div>
  );

  // 3. STORE / INVENTORY DASHBOARD
  const renderStoreDashboard = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Inventory Management</h1>
        <p className="text-gray-500">Monitor raw materials, tanks, and incoming shipments.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="PENDING GRN" value={stats?.pendingPurchases || 0} subtitle="Deliveries expected" color="bg-green-600" />
        <StatCard title="STOCK ISSUANCES" value={stats?.pendingIssuances || 0} subtitle="Requested by Factory" color="bg-orange-500" />
        <StatCard title="TOTAL TANKS ACTIVE" value={stats?.activeTanks || 3} subtitle="Currently storing liquid" color="bg-blue-600" />
      </div>

      <LowStockAlert items={stats?.lowStockItems || []} onNavigate={onNavigate} />
    </div>
  );

  // 4. PRODUCTION / FACTORY DASHBOARD
  const renderProductionDashboard = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Factory Floor</h1>
        <p className="text-gray-500">Manage active batches and daily yields.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="ACTIVE BATCHES" value={stats?.activeProduction || 0} subtitle="Currently processing" color="bg-orange-500" />
        <StatCard title="YIELD TODAY (BOXES)" value={stats?.yieldToday || 0} subtitle="Finished goods created" color="bg-green-600" />
        <StatCard title="PENDING ISSUANCES" value={stats?.pendingIssuances || 0} subtitle="Waiting on Store" color="bg-blue-600" />
      </div>
    </div>
  );

  switch (user.role) {
    case 'Admin':
    case 'Master Admin':
      return renderAdminDashboard();
    case 'Sales':
    case 'Sales Team':
      return renderSalesDashboard();
    case 'Store':
    case 'Store Manager':
      return renderStoreDashboard();
    case 'Production':
    case 'Factory Floor':
      return renderProductionDashboard();
    default:
      return <div className="p-8">Unauthorized Role Profile</div>;
  }
}