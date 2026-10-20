import { useState, useEffect } from 'react';

export default function SalesDispatch() {
  const [pendingOrders, setPendingOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [dispatchHistory, setDispatchHistory] = useState([]);

  // Form State
  const [soId, setSoId] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [dispatchedBy, setDispatchedBy] = useState('');
  const [items, setItems] = useState([{ productId: '', quantity: 1 }]);

  const fetchData = async () => {
    try {
      // Fetch only Pending Sales Orders
      const soRes = await fetch('http://localhost:5000/api/sales-orders');
      const soData = await soRes.json();
      setPendingOrders(soData.filter(so => so.Status === 'Pending'));

      const prodRes = await fetch('http://localhost:5000/api/products');
      setProducts(await prodRes.json());

      const dispatchRes = await fetch('http://localhost:5000/api/sales-dispatch');
      setDispatchHistory(await dispatchRes.json());
    } catch (error) {
      console.error("Error fetching dispatch data:", error);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // --- DYNAMIC ROW HANDLERS ---
  const handleAddItem = () => setItems([...items, { productId: '', quantity: 1 }]);
  const handleRemoveItem = (index) => setItems(items.filter((_, i) => i !== index));
  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  // --- SUBMIT HANDLER ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!soId || !dispatchedBy) return alert("Please select a Sales Order and enter the Dispatcher's Name.");
    
    const invalidItem = items.find(item => !item.productId || item.quantity <= 0);
    if (invalidItem) return alert("Please select a product and enter a valid quantity for all rows.");

    try {
      const res = await fetch('http://localhost:5000/api/sales-dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ soId, vehicleNumber, dispatchedBy, items })
      });
      
      if (res.ok) {
        alert("Dispatch Logged Successfully! Inventory Deducted.");
        setSoId('');
        setVehicleNumber('');
        setDispatchedBy('');
        setItems([{ productId: '', quantity: 1 }]);
        fetchData(); // Refresh data to remove the fulfilled order
      } else {
        alert("Failed to process dispatch. Check stock levels.");
      }
    } catch (error) {
      console.error("Error processing dispatch:", error);
    }
  };

  return (
    <div style={{ padding: '1.5rem', backgroundColor: '#1e1e1e', borderRadius: '8px', marginBottom: '2rem', border: '1px solid #333' }}>
      <h2 style={{ marginTop: 0 }}>Outbound Sales Dispatch</h2>
      
      <form onSubmit={handleSubmit} style={{ marginBottom: '2rem' }}>
        {/* HEADER DETAILS */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          <div style={{ flex: 2, minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Sales Order Reference</label>
            <select 
              value={soId} 
              onChange={(e) => setSoId(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', backgroundColor: '#2d2d2d', color: '#fff', border: '1px solid #444' }}
            >
              <option value="" disabled>-- Select Pending Order --</option>
              {pendingOrders.map(so => (
                <option key={so.SO_ID} value={so.SO_ID}>{so.SONumber} ({so.CustomerName})</option>
              ))}
            </select>
          </div>

          <div style={{ flex: 1, minWidth: '150px' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Vehicle Number</label>
            <input 
              type="text" 
              value={vehicleNumber} 
              onChange={(e) => setVehicleNumber(e.target.value)}
              placeholder="e.g., CG-04-XX-1234"
              style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', backgroundColor: '#2d2d2d', color: '#fff', border: '1px solid #444' }}
            />
          </div>

          <div style={{ flex: 1, minWidth: '150px' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Dispatched By</label>
            <input 
              type="text" 
              value={dispatchedBy} 
              onChange={(e) => setDispatchedBy(e.target.value)}
              placeholder="Warehouse Staff Name"
              style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', backgroundColor: '#2d2d2d', color: '#fff', border: '1px solid #444' }}
            />
          </div>
        </div>

        {/* ITEMS DISPATCHED */}
        <div style={{ padding: '1rem', backgroundColor: '#252525', borderRadius: '8px', border: '1px solid #444', marginBottom: '1.5rem' }}>
          <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.1rem' }}>Items Loaded</h3>
          
          {items.map((item, index) => (
            <div key={index} style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              
              <select 
                value={item.productId} 
                onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                style={{ flex: 2, minWidth: '150px', padding: '0.75rem', borderRadius: '4px', backgroundColor: '#2d2d2d', color: '#fff', border: '1px solid #555' }}
              >
                <option value="" disabled>-- Select Finished Product --</option>
                {products.map(p => (
                  <option key={p.ProductID} value={p.ProductID}>
                    {p.ProductName} (Available Stock: {p.ClosingBalance || 0})
                  </option>
                ))}
              </select>

              <input 
                type="number" 
                min="1"
                value={item.quantity} 
                onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value))}
                placeholder="Qty Dispatched"
                style={{ flex: 1, minWidth: '120px', padding: '0.75rem', borderRadius: '4px', backgroundColor: '#2d2d2d', color: '#fff', border: '1px solid #555' }}
              />

              {items.length > 1 && (
                <button 
                  type="button" 
                  onClick={() => handleRemoveItem(index)}
                  style={{ padding: '0.75rem 1rem', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  X
                </button>
              )}
            </div>
          ))}

          <button 
            type="button" 
            onClick={handleAddItem}
            style={{ padding: '0.5rem 1rem', backgroundColor: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem' }}
          >
            + Add Another Product
          </button>
        </div>

        <button type="submit" style={{ width: '100%', padding: '1rem', backgroundColor: '#17a2b8', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1.1rem', fontWeight: 'bold' }}>
          Confirm Dispatch & Deduct Inventory
        </button>
      </form>

      {/* RECENT DISPATCHES TABLE */}
      <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Dispatch Ledger</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
        <thead>
          <tr style={{ backgroundColor: '#2d2d2d' }}>
            <th style={{ padding: '0.75rem', borderBottom: '2px solid #444' }}>Date</th>
            <th style={{ padding: '0.75rem', borderBottom: '2px solid #444' }}>Sales Order</th>
            <th style={{ padding: '0.75rem', borderBottom: '2px solid #444' }}>Product</th>
            <th style={{ padding: '0.75rem', borderBottom: '2px solid #444' }}>Qty</th>
            <th style={{ padding: '0.75rem', borderBottom: '2px solid #444' }}>Vehicle / By</th>
          </tr>
        </thead>
        <tbody>
          {dispatchHistory.map((d) => (
            <tr key={d.DispatchID} style={{ borderBottom: '1px solid #333' }}>
              <td style={{ padding: '0.75rem' }}>{new Date(d.DispatchDate).toLocaleDateString()}</td>
              <td style={{ padding: '0.75rem', fontWeight: 'bold', color: '#007bff' }}>{d.SONumber}</td>
              <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>{d.ProductName}</td>
              <td style={{ padding: '0.75rem', color: '#dc3545', fontWeight: 'bold' }}>-{d.DispatchedQty}</td>
              <td style={{ padding: '0.75rem', color: '#aaa' }}>{d.VehicleNumber} | {d.DispatchedBy}</td>
            </tr>
          ))}
          {dispatchHistory.length === 0 && (
            <tr><td colSpan="5" style={{ padding: '1rem', textAlign: 'center', color: '#888' }}>No dispatch history available.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}