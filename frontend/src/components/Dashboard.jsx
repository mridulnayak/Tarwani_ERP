import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

export default function Dashboard({ user }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch unified dashboard stats from backend
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('erp_token');
        const res = await fetch(`${API_BASE_URL}/dashboard/stats`, {
          headers: { 'x-access-token': token }
        });
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        console.error("Dashboard fetch error", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div className="p-8 text-center text-gray-500 font-bold">Loading your dashboard...</div>;

  // 1. MASTER ADMIN DASHBOARD (God-Eye View)
  const AdminDashboard = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Welcome back, {user.username}</h1>
        <p className="text-gray-500">Here is the current operational status of Tarwani Soaps.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="PENDING SALES" value={stats?.pendingSales || 0} subtitle="Orders waiting dispatch" color="bg-blue-600" />
        <StatCard title="ACTIVE PRODUCTION" value={stats?.activeProduction || 0} subtitle="Batches on floor" color="bg-orange-500" />
        <StatCard title="PENDING PURCHASES" value={stats?.pendingPurchases || 0} subtitle="Inbound material" color="bg-green-600" />
        <StatCard title="TOTAL REVENUE" value={`₹${stats?.todayRevenue || 0}`} subtitle="Today's Dispatches" color="bg-purple-600" />
      </div>

      <LowStockAlert items={stats?.lowStockItems || []} />
    </div>
  );

// 2. SALES TEAM DASHBOARD
  const SalesDashboard = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Sales Command Center</h1>
        <p className="text-gray-500">Track your daily targets and customer dispatches.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="ORDERS BOOKED TODAY" value={stats?.salesToday || 0} subtitle="New sales orders" color="bg-blue-600" />
        <StatCard title="READY FOR DISPATCH" value={stats?.pendingSales || 0} subtitle="Awaiting logistics" color="bg-yellow-500" />
        
        {/* 🔥 FIX: Now using live dynamic data from the backend */}
        <StatCard 
            title="MONTHLY TARGET" 
            value={`${stats?.targetPercentage || 0}%`} 
            subtitle={`${stats?.achievedFormatted || '₹0L / ₹0L'} Achieved`} 
            color="bg-green-600" 
        />
      </div>
    </div>
  );
  
  // 3. STORE / INVENTORY DASHBOARD
  const StoreDashboard = () => (
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

      <LowStockAlert items={stats?.lowStockItems || []} />
    </div>
  );

  // 4. PRODUCTION / FACTORY DASHBOARD
  const ProductionDashboard = () => (
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

  // --- REUSABLE UI COMPONENTS ---
  const StatCard = ({ title, value, subtitle, color }) => (
    <div className={`${color} rounded-xl p-5 text-white shadow-md flex flex-col justify-between h-32`}>
      <h3 className="text-xs font-bold uppercase tracking-wider opacity-90">{title}</h3>
      <div className="text-4xl font-black">{value}</div>
      <div className="text-xs bg-white bg-opacity-20 py-1 px-2 rounded mt-2 truncate">{subtitle}</div>
    </div>
  );

  const LowStockAlert = ({ items }) => (
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
            <tr><th className="py-2">Material</th><th className="py-2">Current Balance</th><th className="py-2 text-right">Action</th></tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} className="border-b border-red-100 last:border-0">
                <td className="py-3 font-semibold text-gray-900">{item.ProductName}</td>
                <td className="py-3 font-bold text-red-600">{item.ClosingBalance}</td>
                <td className="py-3 text-right">
                  <button className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded font-bold transition-colors">
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

  // --- TRAFFIC CONTROLLER ---
  // Renders the correct UI based on the user's role string
  switch (user.role) {
    case 'Admin':
    case 'Master Admin':
      return <AdminDashboard />;
    case 'Sales':
    case 'Sales Team':
      return <SalesDashboard />;
    case 'Store':
    case 'Store Manager':
      return <StoreDashboard />;
    case 'Production':
    case 'Factory Floor':
      return <ProductionDashboard />;
    default:
      return <div className="p-8">Unauthorized Role Profile</div>;
  }
}