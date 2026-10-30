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
      const poRes = await fetch('https://sms.uvtechsolutions.co.in/api/production-orders');
      const poData = await poRes.json();
      setProductionOrders((poData || []).filter(po => po.Status === 'Pending'));

      const tankRes = await fetch('https://sms.uvtechsolutions.co.in/api/tanks');
      setTanks(await tankRes.json());

      const prodRes = await fetch('https://sms.uvtechsolutions.co.in/api/products');
      setProducts(await prodRes.json());

      const issueRes = await fetch('https://sms.uvtechsolutions.co.in/api/issuals');
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
     setItems((items || []).filter((_, i) => i !== index));
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
      const res = await fetch('https://sms.uvtechsolutions.co.in/api/issuals', {
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
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
      
      {/* HEADER */}
      <div className="p-5 border-b border-gray-200 bg-gray-50">
        <h2 className="text-lg font-bold text-gray-800 uppercase tracking-wide">Issue Materials to Factory Floor</h2>
        <p className="text-sm text-gray-500 mt-1">Deduct raw material stocks from storage tanks and assign items to active production orders.</p>
      </div>
      
      <form onSubmit={handleSubmit} className="p-5 md:p-6">
        
        {/* HEADER DETAILS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
          <div className="flex flex-col gap-1 md:col-span-2">
            <label className="text-xs font-semibold text-gray-500 uppercase">Link to Production Order</label>
            <select 
              value={productionOrderId} 
              onChange={(e) => setProductionOrderId(e.target.value)}
              className="w-full p-3 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-blue-500 focus:border-blue-500 shadow-sm"
            >
              <option value="" disabled>-- Select Pending Production Order --</option>
              {(productionOrders || []).map(po => (
                <option key={po.ProductionOrderID} value={po.ProductionOrderID}>
                  {po.ProductName} | Target: {po.TargetQuantity} (Date: {new Date(po.OrderDate).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1 md:col-span-1">
            <label className="text-xs font-semibold text-gray-500 uppercase">Issued By</label>
            <input 
              type="text" 
              value={issuedBy} 
              onChange={(e) => setIssuedBy(e.target.value)}
              placeholder="Store Keeper Name"
              className="w-full p-3 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-blue-500 focus:border-blue-500 shadow-sm"
            />
          </div>
        </div>

        {/* DETAILS: Dynamic Material Rows */}
        <div className="bg-gray-50 p-4 md:p-5 rounded-xl border border-gray-200 mb-6">
          <h3 className="text-md font-bold text-gray-800 uppercase mb-4">Materials Issued</h3>
          
          {(items || []).map((item, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-white p-4 rounded-lg border border-gray-100 shadow-sm mb-3">
              
              <div className="md:col-span-5 flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-400 uppercase">Deduct From Tank</label>
                <select 
                  value={item.tankId} 
                  onChange={(e) => handleItemChange(index, 'tankId', e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 text-gray-900 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="" disabled>-- Deduct From Tank --</option>
                  {(tanks || []).map(t => <option key={t.TankID} value={t.TankID}>{t.TankName} (Stock: {t.CurrentStock})</option>)}
                </select>
              </div>

              <div className="md:col-span-4 flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-400 uppercase">Raw Material</label>
                <select 
                  value={item.productId} 
                  onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 text-gray-900 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="" disabled>-- Raw Material --</option>
                  {(products || []).map(p => <option key={p.ProductID} value={p.ProductID}>{p.ProductName}</option>)}
                </select>
              </div>

              <div className="md:col-span-2 flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-400 uppercase">Quantity</label>
                <input 
                  type="number" 
                  min="1"
                  value={item.quantity} 
                  onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value))}
                  placeholder="Qty"
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 text-gray-900 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="md:col-span-1">
                {items.length > 1 && (
                  <button 
                    type="button" 
                    onClick={() => handleRemoveItem(index)}
                    className="w-full p-2.5 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-md transition-colors"
                  >
                    X
                  </button>
                )}
              </div>
            </div>
          ))}

          <button 
            type="button" 
            onClick={handleAddItem}
            className="mt-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg text-sm transition-colors"
          >
            + Add Another Material
          </button>
        </div>

        <button 
          type="submit" 
          className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-sm transition-colors text-lg focus:ring-4 focus:ring-orange-300"
        >
          Issue Materials & Update Tanks
        </button>
      </form>

      {/* ISSUAL HISTORY SECTION */}
      <div className="border-t border-gray-200">
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wide">Recent Issuals Ledger</h3>
        </div>

        {/* MOBILE VIEW: Cards */}
        <div className="md:hidden divide-y divide-gray-200">
          {(issuals || []).map((issue) => (
            <div key={issue.IssueID} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <span className="font-bold text-orange-600">{issue.IssueNumber}</span>
                <span className="text-xs text-gray-400">{new Date(issue.IssueDate).toLocaleDateString()}</span>
              </div>
              <div className="text-sm text-gray-600 flex flex-col gap-1">
                <p>📦 Target Product: <span className="font-semibold text-gray-900">{issue.TargetProduct}</span></p>
                <p>Target Qty: <span className="font-bold text-gray-800">{issue.TargetQuantity}</span></p>
                <p>👤 Issued By: <span className="text-gray-700">{issue.IssuedBy}</span></p>
              </div>
            </div>
          ))}
          {issuals.length === 0 && (
            <div className="p-6 text-center text-gray-500">No materials issued yet.</div>
          )}
        </div>

        {/* DESKTOP VIEW: Table */}
        <div className="hidden md:block w-full overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="text-xs text-gray-700 uppercase bg-gray-100 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-semibold">Issue #</th>
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold">Target Product</th>
                <th className="px-6 py-4 font-semibold">Target Qty</th>
                <th className="px-6 py-4 font-semibold">Issued By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {(issuals || []).map((issue) => (
                <tr key={issue.IssueID} className="hover:bg-gray-50 bg-white">
                  <td className="px-6 py-4 font-bold text-orange-600">{issue.IssueNumber}</td>
                  <td className="px-6 py-4 text-gray-500">{new Date(issue.IssueDate).toLocaleDateString()}</td>
                  <td className="px-6 py-4 font-semibold text-gray-900">{issue.TargetProduct}</td>
                  <td className="px-6 py-4 font-bold text-gray-800">{issue.TargetQuantity}</td>
                  <td className="px-6 py-4 text-gray-500">{issue.IssuedBy}</td>
                </tr>
              ))}
              {issuals.length === 0 && (
                <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-500">No materials issued yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}