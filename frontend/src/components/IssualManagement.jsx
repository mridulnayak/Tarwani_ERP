import { useState, useEffect } from 'react';

export default function IssualManagement() {
  const [productionOrders, setProductionOrders] = useState([]);
  const [tanks, setTanks] = useState([]);
  const [products, setProducts] = useState([]);
  const [issuals, setIssuals] = useState([]);

  // Form State
  const [productionOrderId, setProductionOrderId] = useState('');
  const [issuedBy, setIssuedBy] = useState('');
  const [items, setItems] = useState([{ tankId: '', productId: '', quantity: 1 }]);

  const fetchData = async () => {
    try {
      // Fetch Production Orders and filter for Pending
      const poRes = await fetch('http://localhost:5000/api/production-orders');
      const poData = await poRes.json();
      setProductionOrders(poData.filter(po => po.Status === 'Pending'));

      const tankRes = await fetch('http://localhost:5000/api/tanks');
      setTanks(await tankRes.json());

      const prodRes = await fetch('http://localhost:5000/api/products');
      setProducts(await prodRes.json());

      const issueRes = await fetch('http://localhost:5000/api/issuals');
      setIssuals(await issueRes.json());
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // --- DYNAMIC ROW HANDLERS ---
  const handleAddItem = () => {
    setItems([...items, { tankId: '', productId: '', quantity: 1 }]);
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
    if (!productionOrderId || !issuedBy) return alert("Please select a Production Order and enter Issuer Name.");
    
    const invalidItem = items.find(item => !item.tankId || !item.productId || item.quantity <= 0);
    if (invalidItem) return alert("Please select a Tank, Product, and valid Quantity for all rows.");

    try {
      const res = await fetch('http://localhost:5000/api/issuals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productionOrderId, issuedBy, items })
      });
      
      if (res.ok) {
        alert("Materials Issued Successfully! Tank stocks have been deducted.");
        setProductionOrderId('');
        setIssuedBy('');
        setItems([{ tankId: '', productId: '', quantity: 1 }]);
        fetchData();
      } else {
        alert("Failed to issue materials. Check tank stock limits.");
      }
    } catch (error) {
      console.error("Error issuing materials:", error);
    }
  };

  return (
    <div style={{ padding: '1.5rem', backgroundColor: '#1e1e1e', borderRadius: '8px', marginBottom: '2rem', border: '1px solid #333' }}>
      <h2 style={{ marginTop: 0 }}>Issue Materials to Factory Floor</h2>
      
      <form onSubmit={handleSubmit} style={{ marginBottom: '2rem' }}>
        {/* HEADER: PO Selection and Issuer */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          <div style={{ flex: 2, minWidth: '250px' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Link to Production Order</label>
            <select 
              value={productionOrderId} 
              onChange={(e) => setProductionOrderId(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', backgroundColor: '#2d2d2d', color: '#fff', border: '1px solid #444' }}
            >
              <option value="" disabled>-- Select Pending Production Order --</option>
              {productionOrders.map(po => (
                <option key={po.ProductionOrderID} value={po.ProductionOrderID}>
                  {po.ProductName} | Target: {po.TargetQuantity} (Date: {new Date(po.OrderDate).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>

          <div style={{ flex: 1, minWidth: '150px' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Issued By</label>
            <input 
              type="text" 
              value={issuedBy} 
              onChange={(e) => setIssuedBy(e.target.value)}
              placeholder="Store Keeper Name"
              style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', backgroundColor: '#2d2d2d', color: '#fff', border: '1px solid #444' }}
            />
          </div>
        </div>

        {/* DETAILS: Dynamic Material Rows */}
        <div style={{ padding: '1rem', backgroundColor: '#252525', borderRadius: '8px', border: '1px solid #444', marginBottom: '1.5rem' }}>
          <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.1rem' }}>Materials Issued</h3>
          
          {items.map((item, index) => (
            <div key={index} style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              
              <select 
                value={item.tankId} 
                onChange={(e) => handleItemChange(index, 'tankId', e.target.value)}
                style={{ flex: 2, minWidth: '150px', padding: '0.75rem', borderRadius: '4px', backgroundColor: '#2d2d2d', color: '#fff', border: '1px solid #555' }}
              >
                <option value="" disabled>-- Deduct From Tank --</option>
                {tanks.map(t => <option key={t.TankID} value={t.TankID}>{t.TankName} (Stock: {t.CurrentStock})</option>)}
              </select>

              <select 
                value={item.productId} 
                onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                style={{ flex: 2, minWidth: '150px', padding: '0.75rem', borderRadius: '4px', backgroundColor: '#2d2d2d', color: '#fff', border: '1px solid #555' }}
              >
                <option value="" disabled>-- Raw Material --</option>
                {products.map(p => <option key={p.ProductID} value={p.ProductID}>{p.ProductName}</option>)}
              </select>

              <input 
                type="number" 
                min="1"
                value={item.quantity} 
                onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value))}
                placeholder="Qty"
                style={{ flex: 1, minWidth: '80px', padding: '0.75rem', borderRadius: '4px', backgroundColor: '#2d2d2d', color: '#fff', border: '1px solid #555' }}
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
            + Add Another Material
          </button>
        </div>

        <button type="submit" style={{ width: '100%', padding: '1rem', backgroundColor: '#fd7e14', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1.1rem', fontWeight: 'bold' }}>
          Issue Materials & Update Tanks
        </button>
      </form>

      {/* ISSUAL HISTORY TABLE */}
      <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Recent Issuals</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
        <thead>
          <tr style={{ backgroundColor: '#2d2d2d' }}>
            <th style={{ padding: '0.75rem', borderBottom: '2px solid #444' }}>Issue #</th>
            <th style={{ padding: '0.75rem', borderBottom: '2px solid #444' }}>Date</th>
            <th style={{ padding: '0.75rem', borderBottom: '2px solid #444' }}>Target Product</th>
            <th style={{ padding: '0.75rem', borderBottom: '2px solid #444' }}>Target Qty</th>
            <th style={{ padding: '0.75rem', borderBottom: '2px solid #444' }}>Issued By</th>
          </tr>
        </thead>
        <tbody>
          {issuals.map((issue) => (
            <tr key={issue.IssueID} style={{ borderBottom: '1px solid #333' }}>
              <td style={{ padding: '0.75rem', fontWeight: 'bold', color: '#fd7e14' }}>{issue.IssueNumber}</td>
              <td style={{ padding: '0.75rem' }}>{new Date(issue.IssueDate).toLocaleDateString()}</td>
              <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>{issue.TargetProduct}</td>
              <td style={{ padding: '0.75rem' }}>{issue.TargetQuantity}</td>
              <td style={{ padding: '0.75rem', color: '#aaa' }}>{issue.IssuedBy}</td>
            </tr>
          ))}
          {issuals.length === 0 && (
            <tr><td colSpan="5" style={{ padding: '1rem', textAlign: 'center', color: '#888' }}>No materials issued yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}