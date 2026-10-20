import { useState, useEffect } from 'react';

export default function PurchaseOrder() {
  const [vendors, setVendors] = useState([]);
  const [products, setProducts] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);

  // Form State
  const [vendorId, setVendorId] = useState('');
  // We initialize the items array with one empty row
  const [items, setItems] = useState([{ productId: '', quantity: 1, rate: 0 }]);

  const fetchData = async () => {
    try {
      // Fetch Parties and filter only Vendors
      const partyRes = await fetch('http://localhost:5000/api/parties');
      const partyData = await partyRes.json();
      setVendors(partyData.filter(p => p.PartyType === 'Vendor'));

      // Fetch Products
      const prodRes = await fetch('http://localhost:5000/api/products');
      setProducts(await prodRes.json());

      // Fetch Existing POs
      const poRes = await fetch('http://localhost:5000/api/purchase-orders');
      setPurchaseOrders(await poRes.json());
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
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  // --- SUBMIT HANDLER ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!vendorId) return alert("Please select a vendor");
    
    // Ensure all rows have a product selected
    const invalidItem = items.find(item => !item.productId || item.quantity <= 0);
    if (invalidItem) return alert("Please select a product and enter a valid quantity for all rows.");

    try {
      const res = await fetch('http://localhost:5000/api/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorId, items })
      });
      
      if (res.ok) {
        setVendorId('');
        setItems([{ productId: '', quantity: 1, rate: 0 }]); // Reset to one empty row
        fetchData();
        alert("Purchase Order Generated Successfully!");
      } else {
        alert("Failed to generate Purchase Order.");
      }
    } catch (error) {
      console.error("Error submitting PO:", error);
    }
  };

  return (
    <div style={{ padding: '1.5rem', backgroundColor: '#1e1e1e', borderRadius: '8px', marginBottom: '2rem', border: '1px solid #333' }}>
      <h2 style={{ marginTop: 0 }}>Generate Purchase Order</h2>
      
      <form onSubmit={handleSubmit} style={{ marginBottom: '2rem' }}>
        {/* HEADER: Vendor Selection */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Select Vendor</label>
          <select 
            value={vendorId} 
            onChange={(e) => setVendorId(e.target.value)}
            style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', backgroundColor: '#2d2d2d', color: '#fff', border: '1px solid #444' }}
          >
            <option value="" disabled>-- Select Vendor --</option>
            {vendors.map(v => <option key={v.PartyID} value={v.PartyID}>{v.PartyName}</option>)}
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
                {products.map(p => <option key={p.ProductID} value={p.ProductID}>{p.ProductName} ({p.BrandName})</option>)}
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
                placeholder="Rate (₹)"
                style={{ flex: 1, minWidth: '100px', padding: '0.75rem', borderRadius: '4px', backgroundColor: '#2d2d2d', color: '#fff', border: '1px solid #555' }}
              />

              {/* Prevent deleting the very last row */}
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

        <button type="submit" style={{ width: '100%', padding: '1rem', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1.1rem', fontWeight: 'bold' }}>
          Generate Purchase Order
        </button>
      </form>

      {/* RECENT PURCHASE ORDERS TABLE */}
      <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Recent Purchase Orders</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
        <thead>
          <tr style={{ backgroundColor: '#2d2d2d' }}>
            <th style={{ padding: '0.75rem', borderBottom: '2px solid #444' }}>PO Number</th>
            <th style={{ padding: '0.75rem', borderBottom: '2px solid #444' }}>Date</th>
            <th style={{ padding: '0.75rem', borderBottom: '2px solid #444' }}>Vendor</th>
            <th style={{ padding: '0.75rem', borderBottom: '2px solid #444' }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {purchaseOrders.map((po) => (
            <tr key={po.PO_ID} style={{ borderBottom: '1px solid #333' }}>
              <td style={{ padding: '0.75rem', fontWeight: 'bold', color: '#007bff' }}>{po.PONumber}</td>
              <td style={{ padding: '0.75rem' }}>{new Date(po.OrderDate).toLocaleDateString()}</td>
              <td style={{ padding: '0.75rem' }}>{po.VendorName}</td>
              <td style={{ padding: '0.75rem' }}>
                <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', backgroundColor: po.Status === 'Pending' ? '#ffc107' : '#28a745', color: po.Status === 'Pending' ? '#000' : '#fff' }}>
                  {po.Status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}