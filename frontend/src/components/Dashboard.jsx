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
    <div style={{ padding: '1.5rem', fontFamily: 'Arial, sans-serif' }}>
      <h2 style={{ color: '#fff', marginTop: 0, marginBottom: '0.5rem', fontSize: '2rem' }}>
        Welcome back, {user?.username}
      </h2>
      <p style={{ color: '#aaa', marginBottom: '2rem', fontSize: '1.1rem' }}>
        Here is the current operational status of Tarwani Soaps.
      </p>

      {/* KPI CARDS (Big, bold numbers) */}
      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '3rem' }}>
        
        {/* Sales Card */}
        <div style={{ flex: 1, minWidth: '200px', backgroundColor: '#007bff', padding: '2rem', borderRadius: '12px', color: '#fff', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,123,255,0.3)' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', opacity: 0.9 }}>Pending Sales</h3>
          <div style={{ fontSize: '3.5rem', fontWeight: 'bold', margin: '1rem 0' }}>{stats.pendingSales}</div>
          <div style={{ fontSize: '0.9rem', backgroundColor: 'rgba(255,255,255,0.2)', padding: '0.5rem', borderRadius: '4px' }}>Orders waiting for dispatch</div>
        </div>

        {/* Production Card */}
        <div style={{ flex: 1, minWidth: '200px', backgroundColor: '#fd7e14', padding: '2rem', borderRadius: '12px', color: '#fff', textAlign: 'center', boxShadow: '0 4px 12px rgba(253,126,20,0.3)' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', opacity: 0.9 }}>Active Production</h3>
          <div style={{ fontSize: '3.5rem', fontWeight: 'bold', margin: '1rem 0' }}>{stats.activeProduction}</div>
          <div style={{ fontSize: '0.9rem', backgroundColor: 'rgba(255,255,255,0.2)', padding: '0.5rem', borderRadius: '4px' }}>Batches on the factory floor</div>
        </div>

        {/* Purchase Card */}
        <div style={{ flex: 1, minWidth: '200px', backgroundColor: '#28a745', padding: '2rem', borderRadius: '12px', color: '#fff', textAlign: 'center', boxShadow: '0 4px 12px rgba(40,167,69,0.3)' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', opacity: 0.9 }}>Pending Purchases</h3>
          <div style={{ fontSize: '3.5rem', fontWeight: 'bold', margin: '1rem 0' }}>{stats.pendingPurchases}</div>
          <div style={{ fontSize: '0.9rem', backgroundColor: 'rgba(255,255,255,0.2)', padding: '0.5rem', borderRadius: '4px' }}>Inbound raw material deliveries</div>
        </div>

      </div>

      {/* AUTOMATED ALERTS SECTION */}
      <div style={{ backgroundColor: '#1e1e1e', padding: '1.5rem', borderRadius: '12px', border: '1px solid #333' }}>
        <h3 style={{ color: '#dc3545', marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          ⚠️ Critical Low Stock Alerts (Finished Goods)
        </h3>
        <p style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '1.5rem' }}>The following items have 50 or fewer units remaining in the warehouse.</p>
        
        {stats.lowStockItems.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '1rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#2d2d2d' }}>
                <th style={{ padding: '1rem', borderBottom: '2px solid #444', color: '#fff' }}>Product Name</th>
                <th style={{ padding: '1rem', borderBottom: '2px solid #444', color: '#fff' }}>Current Balance</th>
                <th style={{ padding: '1rem', borderBottom: '2px solid #444', color: '#fff' }}>Action Required</th>
              </tr>
            </thead>
            <tbody>
              {stats.lowStockItems.map((item, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #333' }}>
                  <td style={{ padding: '1rem', fontWeight: 'bold', color: '#fff' }}>{item.ProductName}</td>
                  <td style={{ padding: '1rem', color: '#dc3545', fontWeight: 'bold', fontSize: '1.2rem' }}>{item.ClosingBalance}</td>
                  <td style={{ padding: '1rem' }}>
                    <button style={{ padding: '0.5rem 1rem', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                      Generate Production Order
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#2d2d2d', borderRadius: '8px', color: '#28a745', fontWeight: 'bold' }}>
            ✅ All finished goods are sufficiently stocked. No urgent action required.
          </div>
        )}
      </div>
    </div>
  );
}