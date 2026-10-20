import { useState, useEffect } from 'react';

export default function ProductionOrder() {
  const [products, setProducts] = useState([]);
  const [productionOrders, setProductionOrders] = useState([]);

  // Form State
  const [productId, setProductId] = useState('');
  const [salesOrderRef, setSalesOrderRef] = useState('');
  const [targetQuantity, setTargetQuantity] = useState('');

  const fetchData = async () => {
    try {
      const prodRes = await fetch('http://localhost:5000/api/products');
      setProducts(await prodRes.json());

      const poRes = await fetch('http://localhost:5000/api/production-orders');
      setProductionOrders(await poRes.json());
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!productId || !targetQuantity || targetQuantity <= 0) {
      return alert("Please select a product and enter a valid target quantity.");
    }

    try {
      const res = await fetch('http://localhost:5000/api/production-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          productId, 
          salesOrderRef, 
          targetQuantity: parseInt(targetQuantity) 
        })
      });
      
      if (res.ok) {
        alert("Production Order Successfully Generated!");
        setProductId('');
        setSalesOrderRef('');
        setTargetQuantity('');
        fetchData(); // Refresh the table
      } else {
        alert("Failed to generate Production Order.");
      }
    } catch (error) {
      console.error("Error saving Production Order:", error);
    }
  };

  return (
    <div style={{ padding: '1.5rem', backgroundColor: '#1e1e1e', borderRadius: '8px', marginBottom: '2rem', border: '1px solid #333' }}>
      <h2 style={{ marginTop: 0 }}>Generate Production Order</h2>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
        
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {/* Product Dropdown showing Closing Balance */}
          <div style={{ flex: 2, minWidth: '250px' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Select Product to Manufacture</label>
            <select 
              value={productId} 
              onChange={(e) => setProductId(e.target.value)} 
              style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', backgroundColor: '#2d2d2d', color: '#fff', border: '1px solid #444' }}
            >
              <option value="" disabled>-- Select Product --</option>
              {products.map(p => (
                <option key={p.ProductID} value={p.ProductID}>
                  {p.ProductName} ({p.BrandName}) | Current Stock: {p.ClosingBalance || 0}
                </option>
              ))}
            </select>
          </div>

          {/* Target Quantity */}
          <div style={{ flex: 1, minWidth: '150px' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Target Quantity</label>
            <input 
              type="number" 
              min="1" 
              value={targetQuantity} 
              onChange={(e) => setTargetQuantity(e.target.value)} 
              placeholder="e.g., 5000" 
              style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', backgroundColor: '#2d2d2d', color: '#fff', border: '1px solid #444' }} 
            />
          </div>

          {/* Optional Sales Order Reference */}
          <div style={{ flex: 1, minWidth: '150px' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Sales Order Ref (Optional)</label>
            <input 
              type="text" 
              value={salesOrderRef} 
              onChange={(e) => setSalesOrderRef(e.target.value)} 
              placeholder="e.g., SO-9921" 
              style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', backgroundColor: '#2d2d2d', color: '#fff', border: '1px solid #444' }} 
            />
          </div>
        </div>

        <button type="submit" style={{ width: '100%', padding: '1rem', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1.1rem', fontWeight: 'bold' }}>
          Issue Production Order to Factory Floor
        </button>
      </form>

      {/* PRODUCTION ORDERS TABLE */}
      <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Active Production Orders</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
        <thead>
          <tr style={{ backgroundColor: '#2d2d2d' }}>
            <th style={{ padding: '0.75rem', borderBottom: '2px solid #444' }}>Date</th>
            <th style={{ padding: '0.75rem', borderBottom: '2px solid #444' }}>Product Name</th>
            <th style={{ padding: '0.75rem', borderBottom: '2px solid #444' }}>Closing Balance</th>
            <th style={{ padding: '0.75rem', borderBottom: '2px solid #444' }}>Sales Order</th>
            <th style={{ padding: '0.75rem', borderBottom: '2px solid #444' }}>Target Qty</th>
            <th style={{ padding: '0.75rem', borderBottom: '2px solid #444' }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {productionOrders.map((po) => (
            <tr key={po.ProductionOrderID} style={{ borderBottom: '1px solid #333' }}>
              <td style={{ padding: '0.75rem' }}>{new Date(po.OrderDate).toLocaleDateString()}</td>
              <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>{po.ProductName}</td>
              <td style={{ padding: '0.75rem', color: '#aaa' }}>{po.ClosingBalance || 0}</td>
              <td style={{ padding: '0.75rem', color: '#aaa' }}>{po.SalesOrderRef || 'N/A'}</td>
              <td style={{ padding: '0.75rem', fontWeight: 'bold', color: '#17a2b8' }}>{po.TargetQuantity}</td>
              <td style={{ padding: '0.75rem' }}>
                <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', backgroundColor: po.Status === 'Pending' ? '#ffc107' : '#28a745', color: po.Status === 'Pending' ? '#000' : '#fff' }}>
                  {po.Status}
                </span>
              </td>
            </tr>
          ))}
          {productionOrders.length === 0 && (
            <tr><td colSpan="6" style={{ padding: '1rem', textAlign: 'center', color: '#888' }}>No production orders found.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}