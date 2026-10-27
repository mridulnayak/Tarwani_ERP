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
      const prodRes = await fetch('/api/products');
      setProducts(await prodRes.json());

      const poRes = await fetch('/api/production-orders');
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
      const res = await fetch('/api/production-orders', {
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
        fetchData(); 
      } else {
        alert("Failed to generate Production Order.");
      }
    } catch (error) {
      console.error("Error saving Production Order:", error);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
      
      {/* HEADER */}
      <div className="p-5 border-b border-gray-200 bg-gray-50">
        <h2 className="text-lg font-bold text-gray-800 uppercase tracking-wide">Generate Production Order</h2>
        <p className="text-sm text-gray-500 mt-1">Issue manufacturing batches to the factory floor and track target quotas.</p>
      </div>

      <form onSubmit={handleSubmit} className="p-5 md:p-6">
        
        {/* FORM INPUT GRID */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-6">
          
          <div className="flex flex-col gap-1 md:col-span-2">
            <label className="text-xs font-semibold text-gray-500 uppercase">Select Product to Manufacture</label>
            <select 
              value={productId} 
              onChange={(e) => setProductId(e.target.value)} 
              className="w-full p-3 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-blue-500 focus:border-blue-500 shadow-sm"
            >
              <option value="" disabled>-- Select Product --</option>
              {products.map(p => (
                <option key={p.ProductID} value={p.ProductID}>
                  {p.ProductName} ({p.BrandName}) | Current Stock: {p.ClosingBalance || 0}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1 md:col-span-1">
            <label className="text-xs font-semibold text-gray-500 uppercase">Target Quantity</label>
            <input 
              type="number" 
              min="1" 
              value={targetQuantity} 
              onChange={(e) => setTargetQuantity(e.target.value)} 
              placeholder="e.g., 5000" 
              className="w-full p-3 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-blue-500 focus:border-blue-500 shadow-sm" 
            />
          </div>

          <div className="flex flex-col gap-1 md:col-span-1">
            <label className="text-xs font-semibold text-gray-500 uppercase">Sales Order Ref (Optional)</label>
            <input 
              type="text" 
              value={salesOrderRef} 
              onChange={(e) => setSalesOrderRef(e.target.value)} 
              placeholder="e.g., SO-9921" 
              className="w-full p-3 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-blue-500 focus:border-blue-500 shadow-sm" 
            />
          </div>

        </div>

        <button 
          type="submit" 
          className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition-colors text-lg focus:ring-4 focus:ring-blue-300"
        >
          Issue Production Order to Factory Floor
        </button>
      </form>

      {/* PRODUCTION ORDERS TABLE / CARDS SECTION */}
      <div className="border-t border-gray-200">
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wide">Active Production Orders Ledger</h3>
        </div>

        {/* MOBILE VIEW: Cards */}
        <div className="md:hidden divide-y divide-gray-200">
          {productionOrders.map((po) => (
            <div key={po.ProductionOrderID} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <span className="font-bold text-gray-900 text-lg">{po.ProductName}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${po.Status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                  {po.Status}
                </span>
              </div>
              <div className="text-sm text-gray-600 flex flex-col gap-1">
                <p>📅 Date: {new Date(po.OrderDate).toLocaleDateString()}</p>
                <p>🎯 Target Qty: <span className="font-bold text-cyan-600">{po.TargetQuantity}</span></p>
                <p>📦 Current Stock: {po.ClosingBalance || 0} | SO Ref: {po.SalesOrderRef || 'N/A'}</p>
              </div>
            </div>
          ))}
          {productionOrders.length === 0 && (
            <div className="p-6 text-center text-gray-500">No production orders found.</div>
          )}
        </div>

        {/* DESKTOP VIEW: Table */}
        <div className="hidden md:block w-full overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="text-xs text-gray-700 uppercase bg-gray-100 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold">Product Name</th>
                <th className="px-6 py-4 font-semibold">Closing Balance</th>
                <th className="px-6 py-4 font-semibold">Sales Order</th>
                <th className="px-6 py-4 font-semibold">Target Qty</th>
                <th className="px-6 py-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {productionOrders.map((po) => (
                <tr key={po.ProductionOrderID} className="hover:bg-gray-50 bg-white">
                  <td className="px-6 py-4 text-gray-500">{new Date(po.OrderDate).toLocaleDateString()}</td>
                  <td className="px-6 py-4 font-bold text-gray-900">{po.ProductName}</td>
                  <td className="px-6 py-4 text-gray-500">{po.ClosingBalance || 0}</td>
                  <td className="px-6 py-4 text-gray-500">{po.SalesOrderRef || 'N/A'}</td>
                  <td className="px-6 py-4 font-bold text-cyan-600">{po.TargetQuantity}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${po.Status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                      {po.Status}
                    </span>
                  </td>
                </tr>
              ))}
              {productionOrders.length === 0 && (
                <tr><td colSpan="6" className="px-6 py-8 text-center text-gray-500">No production orders found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}