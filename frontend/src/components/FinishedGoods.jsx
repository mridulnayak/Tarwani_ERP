import { useState, useEffect } from 'react';

export default function FinishedGoods() {
  const [inProgressOrders, setInProgressOrders] = useState([]);
  
  // Form State
  const [productionOrderId, setProductionOrderId] = useState('');
  const [productId, setProductId] = useState(''); // Auto-filled when PO is selected
  const [producedQty, setProducedQty] = useState('');
  const [wastageQty, setWastageQty] = useState('');
  const [loggedBy, setLoggedBy] = useState('');

  const fetchInProgressOrders = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/production-orders');
      const data = await res.json();
      // Only show orders that have had materials issued and are currently being manufactured
      setInProgressOrders(data.filter(po => po.Status === 'In Progress'));
    } catch (error) {
      console.error("Error fetching production orders:", error);
    }
  };

  useEffect(() => { fetchInProgressOrders(); }, []);

  // When a user selects a PO, we automatically capture the underlying ProductID
  const handleOrderSelection = (e) => {
    const selectedPoId = e.target.value;
    setProductionOrderId(selectedPoId);
    
    const selectedPo = inProgressOrders.find(po => po.ProductionOrderID.toString() === selectedPoId);
    if (selectedPo) {
      // In a real app, you might want to fetch the exact ProductID from the backend if it's not in the GET /production-orders payload.
      // Since our GET route joins with ProductMaster, let's assume we can pass the Product Name for display, 
      // but we need the actual ProductID for the POST request. 
      // *Wait*, our GET /api/production-orders doesn't return p.ProductID. 
      // Let's modify our logic to fetch Products as well so we can look it up, OR you can update the backend GET route later.
      // For now, let's fetch products to cross-reference the ID.
      fetchProductsAndMatch(selectedPo.ProductName);
    }
  };

  // Helper to get Product ID (A more robust way is to update the SQL GET route to return ProductID)
  const fetchProductsAndMatch = async (productName) => {
      const res = await fetch('http://localhost:5000/api/products');
      const products = await res.json();
      const match = products.find(p => p.ProductName === productName);
      if (match) setProductId(match.ProductID);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!productionOrderId || !productId || !producedQty) {
      return alert("Please select a Production Order and enter the Produced Quantity.");
    }

    try {
      const res = await fetch('http://localhost:5000/api/finished-goods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          productionOrderId, 
          productId, 
          producedQty: parseInt(producedQty), 
          wastageQty: wastageQty ? parseInt(wastageQty) : 0, 
          loggedBy 
        })
      });
      
      if (res.ok) {
        alert("Finished Goods Logged! Inventory Balance Updated.");
        setProductionOrderId('');
        setProductId('');
        setProducedQty('');
        setWastageQty('');
        setLoggedBy('');
        fetchInProgressOrders(); // Refresh to remove completed orders
      } else {
        alert("Failed to log finished goods.");
      }
    } catch (error) {
      console.error("Error logging finished goods:", error);
    }
  };

  return (
    <div style={{ padding: '1.5rem', backgroundColor: '#1e1e1e', borderRadius: '8px', marginBottom: '2rem', border: '1px solid #333' }}>
      <h2 style={{ marginTop: 0 }}>Log Finished Goods (Production Completion)</h2>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
        
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 2, minWidth: '250px' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Active Production Order</label>
            <select 
              value={productionOrderId} 
              onChange={handleOrderSelection} 
              style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', backgroundColor: '#2d2d2d', color: '#fff', border: '1px solid #444' }}
            >
              <option value="" disabled>-- Select 'In Progress' Order --</option>
              {inProgressOrders.map(po => (
                <option key={po.ProductionOrderID} value={po.ProductionOrderID}>
                  {po.ProductName} | Target: {po.TargetQuantity}
                </option>
              ))}
            </select>
          </div>

          <div style={{ flex: 1, minWidth: '150px' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Floor Manager Name</label>
            <input 
              type="text" 
              value={loggedBy} 
              onChange={(e) => setLoggedBy(e.target.value)} 
              placeholder="e.g., Ravi" 
              style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', backgroundColor: '#2d2d2d', color: '#fff', border: '1px solid #444' }} 
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '150px' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Good Units Produced</label>
            <input 
              type="number" 
              min="1" 
              value={producedQty} 
              onChange={(e) => setProducedQty(e.target.value)} 
              placeholder="Successful output" 
              style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', backgroundColor: '#2d2d2d', color: '#fff', border: '1px solid #28a745' }} 
            />
          </div>

          <div style={{ flex: 1, minWidth: '150px' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Wastage / Defective Units</label>
            <input 
              type="number" 
              min="0" 
              value={wastageQty} 
              onChange={(e) => setWastageQty(e.target.value)} 
              placeholder="Failed output" 
              style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', backgroundColor: '#2d2d2d', color: '#fff', border: '1px solid #dc3545' }} 
            />
          </div>
        </div>

        <button type="submit" style={{ width: '100%', padding: '1rem', backgroundColor: '#20c997', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1.1rem', fontWeight: 'bold' }}>
          Finalize Batch & Update Inventory
        </button>
      </form>
    </div>
  );
}