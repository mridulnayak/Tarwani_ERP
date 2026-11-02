import { useState } from 'react';

export default function ProductionEntry({ user }) {
  const [searchOrderNo, setSearchOrderNo] = useState('');
  const [activeOrder, setActiveOrder] = useState(null);
  const [pendingItems, setPendingItems] = useState([]);
  
  // Tracks the quantities the user is entering today: { ItemID: quantity }
  const [productionInputs, setProductionInputs] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);

  const loadOrder = async (e) => {
    e.preventDefault();
    if (!searchOrderNo.trim()) return alert("Enter a Production Order Number");

    try {
      const token = localStorage.getItem('erp_token');
      // Using POST Tunneling for safe retrieval through IIS if GET is heavily filtered, 
      // but standard GET is usually fine. We will use GET here.
      const res = await fetch(`https://sms.uvtechsolutions.co.in/api/production/order/${searchOrderNo}`, {
        headers: { 'x-access-token': token }
      });
      
      if (!res.ok) throw new Error("Order not found or already fully completed.");
      
      const data = await res.json();
      setActiveOrder(data.order);
      setPendingItems(data.items);
      setProductionInputs({}); // Reset inputs on new load
    } catch (error) {
      console.error(error);
      alert("Could not load Order. Check the Order No or ensure it has pending items.");
      setActiveOrder(null);
      setPendingItems([]);
    }
  };

  const handleQtyChange = (itemId, value) => {
    setProductionInputs(prev => ({
      ...prev,
      [itemId]: value
    }));
  };

  const handleGenerateBatch = async () => {
    // Filter out empty or zero inputs
    const batchItems = pendingItems.map(item => ({
      ItemID: item.ItemID,
      ProductID: item.ProductID,
      QtyProduced: parseFloat(productionInputs[item.ItemID]) || 0,
      RemainingQty: item.QtyRequired - item.QtyCompleted
    })).filter(item => item.QtyProduced > 0);

    if (batchItems.length === 0) {
      return alert("Enter at least one produced quantity to generate a batch.");
    }

    // Validation: Ensure they don't produce more than required
    for (const item of batchItems) {
      if (item.QtyProduced > item.RemainingQty) {
        return alert(`Cannot produce more than the remaining required quantity for Product #${item.ProductID}`);
      }
    }

    if (!window.confirm("Generate a new Production Batch for these items?")) return;
    setIsProcessing(true);

    try {
      const token = localStorage.getItem('erp_token');
      const res = await fetch(`https://sms.uvtechsolutions.co.in/api/production/batch/create`, {
        method: 'POST', // Native POST, IIS allows this
        headers: { 
          'Content-Type': 'application/json',
          'x-access-token': token 
        },
        body: JSON.stringify({
          OrderID: activeOrder.OrderID,
          items: batchItems
        })
      });

      if (res.ok) {
        const data = await res.json();
        alert(`Batch Generated Successfully! Batch No: ${data.batchNo}`);
        // Reload the order to refresh the remaining quantities
        loadOrder({ preventDefault: () => {} }); 
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
    <div className="bg-white rounded-md shadow-md border border-gray-300 overflow-hidden mb-8">
      
      {/* ENTERPRISE TOOLBAR */}
      <div className="p-4 border-b border-gray-300 bg-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-xl font-extrabold text-gray-800 uppercase tracking-wider">
          Production Batch Entry
        </h2>
        
        <form onSubmit={loadOrder} className="flex w-full md:w-auto gap-3">
          <input
            type="text"
            placeholder="Enter Order No (e.g. PRD-001)..."
            value={searchOrderNo}
            onChange={(e) => setSearchOrderNo(e.target.value)}
            className="w-full md:w-64 p-2 bg-white border border-gray-400 text-gray-900 rounded focus:ring-2 focus:ring-blue-500 font-mono uppercase shadow-sm"
          />
          <button
            type="submit"
            className="whitespace-nowrap px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded shadow-sm transition-colors"
          >
            Load List
          </button>
        </form>
      </div>

      {activeOrder && (
        <>
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

          {/* DENSE TABULAR DATA DISPLAY */}
          <div className="w-full overflow-x-auto">
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
              <tbody className="divide-y divide-gray-300">
                {pendingItems.map((item) => {
                  const pending = item.QtyRequired - item.QtyCompleted;
                  return (
                    <tr key={item.ItemID} className="bg-white even:bg-gray-100 hover:bg-yellow-50 transition-colors">
                      <td className="px-4 py-2 font-bold text-gray-900 border-r border-gray-200">{item.ProductName}</td>
                      <td className="px-4 py-2 font-mono text-right border-r border-gray-200">{item.QtyRequired}</td>
                      <td className="px-4 py-2 font-mono text-right text-green-700 font-bold border-r border-gray-200">{item.QtyCompleted}</td>
                      <td className="px-4 py-2 font-mono text-right text-red-600 font-bold border-r border-gray-200">{pending}</td>
                      <td className="px-2 py-1 text-center bg-blue-50">
                        <input
                          type="number"
                          min="0"
                          max={pending}
                          step="0.01"
                          value={productionInputs[item.ItemID] || ''}
                          onChange={(e) => handleQtyChange(item.ItemID, e.target.value)}
                          placeholder="0.00"
                          className="w-full p-1.5 text-right font-mono font-bold border border-gray-400 rounded focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-gray-100 border-t border-gray-300 flex justify-end">
            <button
              type="button"
              onClick={handleGenerateBatch}
              disabled={isProcessing}
              className={`px-8 py-3 text-white font-bold rounded shadow-md transition-colors ${isProcessing ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}
            >
              {isProcessing ? 'Processing...' : 'Generate New Batch No.'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}