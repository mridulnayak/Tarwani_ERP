import { useState, useEffect } from 'react';

export default function PurchaseReceiving() {
  const [pendingPOs, setPendingPOs] = useState([]);
  const [products, setProducts] = useState([]);
  const [tanks, setTanks] = useState([]);

  // Form State
  const [poId, setPoId] = useState('');
  const [productId, setProductId] = useState('');
  const [tankId, setTankId] = useState('');
  const [receivedQty, setReceivedQty] = useState('');
  const [receivedBy, setReceivedBy] = useState('');

  const fetchData = async () => {
    try {
      // Fetch only Pending POs
      const poRes = await fetch('http://localhost:5000/api/purchase-orders');
      const poData = await poRes.json();
      setPendingPOs(poData.filter(po => po.Status === 'Pending'));

      const prodRes = await fetch('http://localhost:5000/api/products');
      setProducts(await prodRes.json());

      const tankRes = await fetch('http://localhost:5000/api/tanks');
      setTanks(await tankRes.json());
    } catch (error) {
      console.error("Error fetching receiving data:", error);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!poId || !productId || !tankId || !receivedQty) {
      return alert("Please select PO, Product, Tank, and enter Quantity.");
    }

    try {
      const res = await fetch('http://localhost:5000/api/purchase-receiving', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          poId, 
          productId, 
          tankId, 
          receivedQty: parseInt(receivedQty), 
          receivedBy 
        })
      });
      
      if (res.ok) {
        alert("Stock Successfully Received and Tank Updated!");
        setPoId('');
        setProductId('');
        setTankId('');
        setReceivedQty('');
        setReceivedBy('');
        fetchData(); // Refresh to remove the now-completed PO from the dropdown
      } else {
        alert("Failed to process receiving.");
      }
    } catch (error) {
      console.error("Error saving receipt:", error);
    }
  };

  return (
    <div style={{ padding: '1.5rem', backgroundColor: '#1e1e1e', borderRadius: '8px', marginBottom: '2rem', border: '1px solid #333' }}>
      <h2 style={{ marginTop: 0 }}>Purchase Receiving & Stock Allocation</h2>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {/* PO Dropdown */}
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Link to Purchase Order</label>
            <select value={poId} onChange={(e) => setPoId(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', backgroundColor: '#2d2d2d', color: '#fff', border: '1px solid #444' }}>
              <option value="" disabled>-- Select Pending PO --</option>
              {pendingPOs.map(po => (
                <option key={po.PO_ID} value={po.PO_ID}>{po.PONumber} ({po.VendorName})</option>
              ))}
            </select>
          </div>

          {/* Product Dropdown */}
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Received Product</label>
            <select value={productId} onChange={(e) => setProductId(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', backgroundColor: '#2d2d2d', color: '#fff', border: '1px solid #444' }}>
              <option value="" disabled>-- Select Product --</option>
              {products.map(p => (
                <option key={p.ProductID} value={p.ProductID}>{p.ProductName}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {/* Destination Tank */}
          <div style={{ flex: 2, minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Destination Tank</label>
            <select value={tankId} onChange={(e) => setTankId(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', backgroundColor: '#2d2d2d', color: '#fff', border: '1px solid #444' }}>
              <option value="" disabled>-- Select Storage Tank --</option>
              {tanks.map(t => (
                <option key={t.TankID} value={t.TankID}>{t.TankName} (Current: {t.CurrentStock} | Max: {t.Capacity})</option>
              ))}
            </select>
          </div>

          {/* Quantity Input */}
          <div style={{ flex: 1, minWidth: '150px' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Quantity Received</label>
            <input type="number" min="1" value={receivedQty} onChange={(e) => setReceivedQty(e.target.value)} placeholder="e.g., 500" style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', backgroundColor: '#2d2d2d', color: '#fff', border: '1px solid #444' }} />
          </div>

          {/* Receiver Name */}
          <div style={{ flex: 1, minWidth: '150px' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Received By</label>
            <input type="text" value={receivedBy} onChange={(e) => setReceivedBy(e.target.value)} placeholder="Store Admin Name" style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', backgroundColor: '#2d2d2d', color: '#fff', border: '1px solid #444' }} />
          </div>
        </div>

        <button type="submit" style={{ width: '100%', marginTop: '1rem', padding: '1rem', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1.1rem', fontWeight: 'bold' }}>
          Confirm Receipt & Update Inventory
        </button>
      </form>
    </div>
  );
}