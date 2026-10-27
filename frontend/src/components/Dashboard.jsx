import { useState, useEffect } from 'react';

export default function Dashboard({ user }) {
  const [stats, setStats] = useState({
    pendingSales: 0,
    pendingPurchases: 0,
    activeProduction: 0,
    lowStockItems: []
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/dashboard-stats');
        if (res.ok) {
          setStats(await res.json());
        }
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="w-full">
      
      {/* WELCOME HEADER */}
      <div className="mb-8">
        <h2 className="text-3xl font-black text-gray-900 tracking-tight">
          Welcome back, {user?.username}
        </h2>
        <p className="text-gray-500 mt-1 text-lg">
          Here is the current operational status of Tarwani Soaps.
        </p>
      </div>

      {/* KPI CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        
        {/* Sales Card */}
        <div className="bg-blue-600 p-6 rounded-2xl shadow-lg text-white flex flex-col justify-between hover:bg-blue-700 transition-colors">
          <h3 className="text-blue-100 font-semibold uppercase tracking-wider text-sm">Pending Sales</h3>
          <div className="text-5xl font-black my-4">{stats.pendingSales}</div>
          <div className="text-sm bg-white/20 p-2 rounded-lg backdrop-blur-sm">Orders waiting for dispatch</div>
        </div>

        {/* Production Card */}
        <div className="bg-orange-500 p-6 rounded-2xl shadow-lg text-white flex flex-col justify-between hover:bg-orange-600 transition-colors">
          <h3 className="text-orange-100 font-semibold uppercase tracking-wider text-sm">Active Production</h3>
          <div className="text-5xl font-black my-4">{stats.activeProduction}</div>
          <div className="text-sm bg-white/20 p-2 rounded-lg backdrop-blur-sm">Batches on the factory floor</div>
        </div>

        {/* Purchase Card */}
        <div className="bg-green-600 p-6 rounded-2xl shadow-lg text-white flex flex-col justify-between hover:bg-green-700 transition-colors">
          <h3 className="text-green-100 font-semibold uppercase tracking-wider text-sm">Pending Purchases</h3>
          <div className="text-5xl font-black my-4">{stats.pendingPurchases}</div>
          <div className="text-sm bg-white/20 p-2 rounded-lg backdrop-blur-sm">Inbound raw material deliveries</div>
        </div>

      </div>

      {/* AUTOMATED ALERTS SECTION */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-5 border-b border-gray-200 bg-red-50 flex items-center gap-2">
          <span className="text-xl">⚠️</span>
          <div>
            <h3 className="text-lg font-bold text-red-700 tracking-wide">Critical Low Stock Alerts (Finished Goods)</h3>
            <p className="text-sm text-red-500">The following items have 50 or fewer units remaining in the warehouse.</p>
          </div>
        </div>
        
        {stats.lowStockItems.length > 0 ? (
          <div>
            {/* MOBILE VIEW: Cards */}
            <div className="md:hidden divide-y divide-gray-200">
              {stats.lowStockItems.map((item, index) => (
                <div key={index} className="p-4 bg-white">
                  <div className="font-bold text-gray-900 text-lg mb-1">{item.ProductName}</div>
                  <div className="flex justify-between items-center mt-3">
                    <span className="text-sm text-gray-600">
                      Balance: <span className="font-black text-red-600 text-lg">{item.ClosingBalance}</span>
                    </span>
                    <button className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg shadow-sm">
                      Generate PO
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* DESKTOP VIEW: Table */}
            <div className="hidden md:block w-full overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Product Name</th>
                    <th className="px-6 py-4 font-semibold">Current Balance</th>
                    <th className="px-6 py-4 font-semibold text-right">Action Required</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {stats.lowStockItems.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50 bg-white">
                      <td className="px-6 py-4 font-bold text-gray-900 text-base">{item.ProductName}</td>
                      <td className="px-6 py-4 font-black text-red-600 text-xl">{item.ClosingBalance}</td>
                      <td className="px-6 py-4 text-right">
                        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg shadow-sm transition-colors">
                          Generate Production Order
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center bg-gray-50 text-green-700 font-bold flex flex-col items-center justify-center gap-2">
            <span className="text-3xl">✅</span>
            All finished goods are sufficiently stocked. No urgent action required.
          </div>
        )}
      </div>

    </div>
  );
}