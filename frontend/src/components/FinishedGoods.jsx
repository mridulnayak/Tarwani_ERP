import { useState, useEffect } from 'react';

export default function FinishedGoods() {
  const [inProgressOrders, setInProgressOrders] = useState([]);
  
  // Form State
  const [productionOrderId, setProductionOrderId] = useState('');
  const [productId, setProductId] = useState(''); 
  const [producedQty, setProducedQty] = useState('');
  const [wastageQty, setWastageQty] = useState('');
  const [loggedBy, setLoggedBy] = useState('');

  const fetchInProgressOrders = async () => {
    try {
      const res = await fetch('/api/production-orders');
      const data = await res.json();
      setInProgressOrders((data || []).filter(po => po.Status === 'In Progress'));
    } catch (error) {
      console.error("Error fetching production orders:", error);
    }
  };

  useEffect(() => { fetchInProgressOrders(); }, []);

  const handleOrderSelection = (e) => {
    const selectedPoId = e.target.value;
    setProductionOrderId(selectedPoId);
    
    const selectedPo = inProgressOrders.find(po => po.ProductionOrderID.toString() === selectedPoId);
    if (selectedPo) {
      fetchProductsAndMatch(selectedPo.ProductName);
    }
  };

  const fetchProductsAndMatch = async (productName) => {
    try {
      const res = await fetch('/api/products');
      const products = await res.json();
      const match = products.find(p => p.ProductName === productName);
      if (match) setProductId(match.ProductID);
    } catch (error) {
      console.error("Error matching product ID:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!productionOrderId || !productId || !producedQty) {
      return alert("Please select a Production Order and enter the Produced Quantity.");
    }

    try {
      const res = await fetch('/api/finished-goods', {
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
        fetchInProgressOrders(); 
      } else {
        alert("Failed to log finished goods.");
      }
    } catch (error) {
      console.error("Error logging finished goods:", error);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
      
      {/* HEADER */}
      <div className="p-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-800 uppercase tracking-wide">Log Finished Goods (Production Completion)</h2>
      </div>
      
      {/* FORM SECTION */}
      <div className="p-5 md:p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          
          {/* Row 1: Active PO & Floor Manager */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1 md:col-span-2">
              <label className="text-xs font-semibold text-gray-500 uppercase">Active Production Order</label>
              <select 
                value={productionOrderId} 
                onChange={handleOrderSelection} 
                className="w-full p-3 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="" disabled>-- Select 'In Progress' Order --</option>
                {(inProgressOrders || []).map(po => (
                  <option key={po.ProductionOrderID} value={po.ProductionOrderID}>
                    {po.ProductName} | Target: {po.TargetQuantity}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">Floor Manager Name</label>
              <input 
                type="text" 
                value={loggedBy} 
                onChange={(e) => setLoggedBy(e.target.value)} 
                placeholder="e.g., Ravi" 
                className="w-full p-3 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-blue-500 focus:border-blue-500" 
              />
            </div>
          </div>

          {/* Row 2: Quantities */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 border border-gray-200 rounded-xl">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-600 uppercase">Good Units Produced</label>
              <input 
                type="number" min="1" 
                value={producedQty} 
                onChange={(e) => setProducedQty(e.target.value)} 
                placeholder="Successful output" 
                className="w-full p-3 bg-white border border-green-400 text-gray-900 rounded-lg focus:ring-green-500 focus:border-green-500 shadow-sm" 
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-600 uppercase">Wastage / Defective Units</label>
              <input 
                type="number" min="0" 
                value={wastageQty} 
                onChange={(e) => setWastageQty(e.target.value)} 
                placeholder="Failed output" 
                className="w-full p-3 bg-white border border-red-300 text-gray-900 rounded-lg focus:ring-red-500 focus:border-red-500 shadow-sm" 
              />
            </div>
          </div>

          <div className="pt-2">
            <button 
              type="submit" 
              className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-sm transition-colors text-lg focus:ring-4 focus:ring-teal-300"
            >
              Finalize Batch & Update Inventory
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}