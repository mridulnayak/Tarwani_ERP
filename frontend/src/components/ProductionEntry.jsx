import { useState, useEffect } from 'react';
import Select from 'react-select';

export default function ProductionEntry({ user }) {
  const [productionOrders, setProductionOrders] = useState([]);
  const [recentBatches, setRecentBatches] = useState([]);
  
  // View Toggle: 'list' or 'create'
  const [viewMode, setViewMode] = useState('list');

  // Form State
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [activeOrder, setActiveOrder] = useState(null);
  const [pendingItems, setPendingItems] = useState([]);
  const [productionInputs, setProductionInputs] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('erp_token');
      
      const poRes = await fetch('https://sms.uvtechsolutions.co.in/api/production-orders', {
        headers: { 'x-access-token': token }
      });
      const poContentType = poRes.headers.get("content-type");
      if (poContentType && poContentType.includes("application/json")) {
        const poData = poRes.ok ? await poRes.json() : [];
        setProductionOrders(Array.isArray(poData) ? poData : []);
      } else {
        console.error("Server returned non-JSON response. API route missing or server crashed.");
        setProductionOrders([]);
      }

      const batchRes = await fetch('https://sms.uvtechsolutions.co.in/api/production/batches', {
        headers: { 'x-access-token': token }
      }).catch((error) => {
        console.error("Error fetching recent batches:", error);
        return null;
      });
      if (batchRes) {
        const batchContentType = batchRes.headers.get("content-type");
        if (batchContentType && batchContentType.includes("application/json")) {
          const batchData = batchRes.ok ? await batchRes.json() : [];
          setRecentBatches(Array.isArray(batchData) ? batchData : []);
        } else {
          console.error("Server returned non-JSON response. API route missing or server crashed.");
          setRecentBatches([]);
        }
      } else {
        setRecentBatches([]);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const orderOptions = productionOrders
    .filter(po => po.Status !== 'Completed')
    .map(po => ({
      value: String(po.ProductionOrderID || po.OrderID),
      label: `${po.OrderNo} - ${po.ProductName} (Target: ${po.TargetQuantity})`
    }));

  const handleOrderSelect = async (orderId) => {
    setSelectedOrderId(orderId);
    if (!orderId) {
      setActiveOrder(null);
      setPendingItems([]);
      return;
    }

    try {
      const token = localStorage.getItem('erp_token');
      const res = await fetch(`https://sms.uvtechsolutions.co.in/api/production/order/${orderId}`, {
      headers: { 'x-access-token': token }
      });
      
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        if (!res.ok) throw new Error("Order not found or completed.");

        const data = await res.json();
        setActiveOrder(data.order);
        setPendingItems(data.items);
        setProductionInputs({});
      } else {
        console.error("Server returned non-JSON response. API route missing or server crashed.");
        setActiveOrder(null);
        setPendingItems([]);
      }
    } catch (error) {
      console.error(error);
      alert("Could not load pending items for this order.");
      setActiveOrder(null);
      setPendingItems([]);
    }
  };

  const handleQtyChange = (itemId, value) => {
    setProductionInputs(prev => ({ ...prev, [itemId]: value }));
  };

  const handleGenerateBatch = async () => {
    const batchItems = pendingItems.map(item => ({
      ItemID: item.ItemID,
      ProductID: item.ProductID,
      QtyProduced: parseFloat(productionInputs[item.ItemID]) || 0,
      RemainingQty: item.QtyRequired - item.QtyCompleted
    })).filter(item => item.QtyProduced > 0);

    if (batchItems.length === 0) return alert("Enter at least one produced quantity to generate a batch.");

    for (const item of batchItems) {
      if (item.QtyProduced > item.RemainingQty) {
        return alert(`Cannot produce more than the remaining required quantity for Product #${item.ProductID}`);
      }
    }

    if (!window.confirm("Generate a new Production Batch?")) return;
    setIsProcessing(true);

    try {
      const token = localStorage.getItem('erp_token');
      const res = await fetch(`https://sms.uvtechsolutions.co.in/api/production/batch/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-access-token': token },
        body: JSON.stringify({ OrderID: activeOrder.OrderID, items: batchItems })
      });

      if (res.ok) {
        alert("Batch Generated Successfully!");
        handleOrderSelect(selectedOrderId);
        fetchData();
      } else {
        alert("Failed to generate batch.");
      }
    } catch (error) {
      console.error("Error generating batch:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
      
      <div className="p-5 border-b border-gray-200 bg-gray-50 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-800 uppercase tracking-wide">Production Entry</h2>
          <p className="text-sm text-gray-500 mt-1">Log daily factory production outputs against master orders.</p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`flex-1 md:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-colors shadow-sm ${
              viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
            }`}
          >
            📋 Recent Batches
          </button>
          <button
            type="button"
            onClick={() => setViewMode('create')}
            className={`flex-1 md:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-colors shadow-sm ${
              viewMode === 'create' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
            }`}
          >
            ＋ Enter New Batch
          </button>
        </div>
      </div>

      {viewMode === 'list' && (
        <div>
          <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wide">Recently Logged Batches</h3>
          </div>
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="text-xs text-gray-700 uppercase bg-gray-100 border-b">
                <tr>
                  <th className="px-6 py-4 font-semibold">Batch No</th>
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold">Order Ref</th>
                  <th className="px-6 py-4 font-semibold text-right">Qty Produced</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recentBatches.map((batch, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 bg-white">
                    <td className="px-6 py-4 font-bold text-blue-600">{batch.BatchNo || `BTH-${idx+1}`}</td>
                    <td className="px-6 py-4 text-gray-500">{new Date(batch.ProductionDate || Date.now()).toLocaleDateString()}</td>
                    <td className="px-6 py-4 font-mono">{batch.OrderNo || 'N/A'}</td>
                    <td className="px-6 py-4 font-bold text-right text-green-600">{batch.QtyProduced} Units</td>
                  </tr>
                ))}
                {recentBatches.length === 0 && (
                  <tr><td colSpan="4" className="px-6 py-8 text-center text-gray-500">No recent batches found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewMode === 'create' && (
        <div className="p-5 md:p-6">
          <div className="mb-6">
            <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Select Pending Production Order *</label>
<Select
  options={orderOptions}
  value={orderOptions.find(opt => opt.value === selectedOrderId) || null}
  onChange={(selected) => handleOrderSelect(selected ? selected.value : '')}
  isSearchable
  isClearable
  placeholder="Search by Order No or Product..."
  className="w-full md:w-2/3 text-gray-900 text-sm"
  classNamePrefix="erp-select"
  // Add these two lines to fix the hidden dropdown items:
  menuPortalTarget={document.body} 
  styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
/>
          </div>

          {activeOrder && (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="p-4 bg-blue-50 border-b border-blue-200 flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase">Active Master Order</p>
                  <p className="text-lg font-mono font-bold text-blue-900">{activeOrder.OrderNo}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-gray-500 uppercase">Order Status</p>
                  <p className="text-sm font-bold text-gray-800">{activeOrder.Status}</p>
                </div>
              </div>

              <div className="w-full overflow-x-auto bg-white">
                <table className="w-full text-left text-sm text-gray-800 min-w-[800px]">
                  <thead className="text-xs uppercase bg-slate-700 text-white">
                    <tr>
                      <th className="px-4 py-3 font-bold border-r border-slate-600">Product Name</th>
                      <th className="px-4 py-3 font-bold border-r border-slate-600 w-32 text-right">Req. Qty</th>
                      <th className="px-4 py-3 font-bold border-r border-slate-600 w-32 text-right text-green-400">Completed</th>
                      <th className="px-4 py-3 font-bold border-r border-slate-600 w-32 text-right text-red-300">Pending</th>
                      <th className="px-4 py-3 font-bold w-48 text-center bg-blue-800">Today's Production</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {pendingItems.map((item) => {
                      const pending = item.QtyRequired - item.QtyCompleted;
                      return (
                        <tr key={item.ItemID} className="hover:bg-yellow-50 transition-colors">
                          <td className="px-4 py-3 font-bold text-gray-900 border-r border-gray-200">{item.ProductName}</td>
                          <td className="px-4 py-3 font-mono text-right border-r border-gray-200">{item.QtyRequired}</td>
                          <td className="px-4 py-3 font-mono text-right text-green-700 font-bold border-r border-gray-200">{item.QtyCompleted}</td>
                          <td className="px-4 py-3 font-mono text-right text-red-600 font-bold border-r border-gray-200">{pending}</td>
                          <td className="px-3 py-2 text-center bg-blue-50">
                            <input
                              type="number" min="0" max={pending} step="1"
                              value={productionInputs[item.ItemID] || ''}
                              onChange={(e) => handleQtyChange(item.ItemID, e.target.value)}
                              placeholder="0"
                              className="w-full p-2 text-right font-mono font-bold border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 shadow-inner"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="p-4 bg-gray-50 flex justify-end">
                <button
                  type="button"
                  onClick={handleGenerateBatch}
                  disabled={isProcessing}
                  className={`px-8 py-3 text-white font-bold rounded-lg shadow transition-colors ${isProcessing ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  {isProcessing ? 'Processing...' : 'Generate New Batch No.'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}