import { useState, useEffect } from 'react';

export default function SalesOrder() {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [salesOrders, setSalesOrders] = useState([]);

  // Form State
  const [customerId, setCustomerId] = useState('');
  const [items, setItems] = useState([{ productId: '', quantity: 1, rate: 0 }]);

  const fetchData = async () => {
    try {
      // Fetch Parties and filter only Customers
      const partyRes = await fetch('http://localhost:5000/api/parties');
      const partyData = await partyRes.json();
      setCustomers(partyData.filter(p => p.PartyType === 'Customer'));

      const prodRes = await fetch('http://localhost:5000/api/products');
      setProducts(await prodRes.json());

      const soRes = await fetch('http://localhost:5000/api/sales-orders');
      setSalesOrders(await soRes.json());
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // --- DYNAMIC ROW HANDLERS ---
  const handleAddItem = () => {
    setItems([...items, { productId: '', quantity: 1, rate: 0 }]);
  };

  const handleRemoveItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  // --- SUBMIT HANDLER ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customerId) return alert("Please select a customer.");
    
    const invalidItem = items.find(item => !item.productId || item.quantity <= 0);
    if (invalidItem) return alert("Please select a product and enter a valid quantity for all rows.");

    try {
      const res = await fetch('http://localhost:5000/api/sales-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId, items })
      });
      
      if (res.ok) {
        alert("Sales Order Generated Successfully!");
        setCustomerId('');
        setItems([{ productId: '', quantity: 1, rate: 0 }]); // Reset form
        fetchData(); // Refresh recent orders
      } else {
        alert("Failed to generate Sales Order.");
      }
    } catch (error) {
      console.error("Error submitting SO:", error);
    }
  };

  return (
    <div style={{ padding: '1.5rem', backgroundColor: '#1e1e1e', borderRadius: '8px', marginBottom: '2rem', border: '1px solid #333' }}>
      <h2 style={{ marginTop: 0 }}>Generate Sales Order</h2>
      
      <form onSubmit={handleSubmit} style={{ marginBottom: '2rem' }}>
        {/* HEADER: Customer Selection */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Select Customer</label>
          <select 
            value={customerId} 
            onChange={(e) => setCustomerId(e.target.value)}
            style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', backgroundColor: '#2d2d2d', color: '#fff', border: '1px solid #444' }}
          >
            <option value="" disabled>-- Select Customer --</option>
            {customers.map(c => <option key={c.PartyID} value={c.PartyID}>{c.PartyName}</option>)}
          </select>
        </div>

        {/* DETAILS: Dynamic Product Rows */}
        <div style={{ padding: '1rem', backgroundColor: '#252525', borderRadius: '8px', border: '1px solid #444', marginBottom: '1.5rem' }}>
          <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.1rem' }}>Order Items</h3>
          
          {items.map((item, index) => (
            <div key={index} style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              
              <select 
                value={item.productId} 
                onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                style={{ flex: 2, minWidth: '150px', padding: '0.75rem', borderRadius: '4px', backgroundColor: '#2d2d2d', color: '#fff', border: '1px solid #555' }}
              >
                <option value="" disabled>-- Select Product --</option>
                {products.map(p => (
                  <option key={p.ProductID} value={p.ProductID}>
                    {p.ProductName} (Stock: {p.ClosingBalance || 0})
                  </option>
                ))}
              </select>

              <input 
                type="number" 
                min="1"
                value={item.quantity} 
                onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value))}
                placeholder="Qty"
                style={{ flex: 1, minWidth: '80px', padding: '0.75rem', borderRadius: '4px', backgroundColor: '#2d2d2d', color: '#fff', border: '1px solid #555' }}
              />

              <input 
                type="number" 
                step="0.01"
                min="0"
                value={item.rate} 
                onChange={(e) => handleItemChange(index, 'rate', parseFloat(e.target.value))}
                placeholder="Selling Rate (₹)"
                style={{ flex: 1, minWidth: '100px', padding: '0.75rem', borderRadius: '4px', backgroundColor: '#2d2d2d', color: '#fff', border: '1px solid #555' }}
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
            + Add Another Item
          </button>
        </div>

        <button type="submit" style={{ width: '100%', padding: '1rem', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1.1rem', fontWeight: 'bold' }}>
          Generate Sales Order
        </button>
      </form>

      {/* RECENT SALES ORDERS TABLE */}
      <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Recent Sales Orders</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
        <thead>
          <tr style={{ backgroundColor: '#2d2d2d' }}>
            <th style={{ padding: '0.75rem', borderBottom: '2px solid #444' }}>SO Number</th>
            <th style={{ padding: '0.75rem', borderBottom: '2px solid #444' }}>Date</th>
            <th style={{ padding: '0.75rem', borderBottom: '2px solid #444' }}>Customer</th>
            <th style={{ padding: '0.75rem', borderBottom: '2px solid #444' }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {salesOrders.map((so) => (
            <tr key={so.SO_ID} style={{ borderBottom: '1px solid #333' }}>
              <td style={{ padding: '0.75rem', fontWeight: 'bold', color: '#007bff' }}>{so.SONumber}</td>
              <td style={{ padding: '0.75rem' }}>{new Date(so.OrderDate).toLocaleDateString()}</td>
              <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>{so.CustomerName}</td>
              <td style={{ padding: '0.75rem' }}>
                <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', backgroundColor: so.Status === 'Pending' ? '#ffc107' : '#28a745', color: so.Status === 'Pending' ? '#000' : '#fff' }}>
                  {so.Status}
                </span>
              </td>
            </tr>
          ))}
          {salesOrders.length === 0 && (
            <tr><td colSpan="4" style={{ padding: '1rem', textAlign: 'center', color: '#888' }}>No sales orders generated yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}