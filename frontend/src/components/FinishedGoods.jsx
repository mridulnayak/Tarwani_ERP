import { useState, useEffect } from 'react';
import Select from 'react-select';

export default function FinishedGoodsReceipt({ user }) {
  const [productionOrders, setProductionOrders] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [receipts, setReceipts] = useState([]);

  // View Toggle: 'list' or 'create'
  const [viewMode, setViewMode] = useState('list');

  // Form State
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [activeOrder, setActiveOrder] = useState(null);
  const [producedQty, setProducedQty] = useState('');
  const [wastageQty, setWastageQty] = useState(0);
  const [loggedById, setLoggedById] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('erp_token');
      
      // Defensive Fetch for Production Orders
      const poRes = await fetch('https://sms.uvtechsolutions.co.in/api/production-orders', { headers: { 'x-access-token': token } });
      if (poRes.headers.get("content-type")?.includes("application/json")) {
        const poData = await poRes.json();
        setProductionOrders(Array.isArray(poData) ? poData : []);
      }

      // Defensive Fetch for Employees
      const partyRes = await fetch('https://sms.uvtechsolutions.co.in/api/parties', { headers: { 'x-access-token': token } });
      if (partyRes.headers.get("content-type")?.includes("application/json")) {
        const partyData = await partyRes.json();
        setEmployees(Array.isArray(partyData) ? partyData.filter(p => p.PartyType === 'Employee') : []);
      }

      // Defensive Fetch for Existing Receipts
      const recRes = await fetch('https://sms.uvtechsolutions.co.in/api/finished-goods', { headers: { 'x-access-token': token } });
      if (recRes.headers.get("content-type")?.includes("application/json")) {
        const recData = await recRes.json();
        setReceipts(Array.isArray(recData) ? recData : []);
      }
    } catch (error) {
      console.error("Network or parsing error:", error);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const orderOptions = productionOrders
    .filter(po => po.Status !== 'Completed')
    .map(po => ({
      value: String(po.ProductionOrderID || po.OrderID),
      label: `${po.OrderNo} - ${po.ProductName} (Target: ${po.TargetQuantity})`,
      productId: po.ProductID,
      productName: po.ProductName,
      targetQty: po.TargetQuantity
    }));

  const employeeOptions = employees.map(emp => ({
    value: String(emp.PartyID),
    label: `${emp.PartyName} (${emp.DesignationName || 'Staff'})`,
    name: emp.PartyName
  }));

  const handleOrderSelect = (orderId) => {
    setSelectedOrderId(orderId);
    if (!orderId) {
      setActiveOrder(null);
      setProducedQty('');
      return;
    }
    const orderObj = orderOptions.find(o => o.value === String(orderId));
    setActiveOrder(orderObj);
    setProducedQty(orderObj ? orderObj.targetQty : '');
  };

  const handleSubmitReceipt = async (e) => {
    e.preventDefault();
    if (!activeOrder) return alert("Select a Production Order.");
    if (!producedQty || producedQty <= 0) return alert("Produced Quantity must be greater than zero.");
    if (!loggedById) return alert("Select the Employee logging this receipt.");

    if (!window.confirm(`Transfer ${producedQty} units of ${activeOrder.productName} to Finished Goods Inventory?`)) return;
    
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('erp_token');
      const selectedEmployee = employeeOptions.find(e => e.value === String(loggedById));

      const res = await fetch('https://sms.uvtechsolutions.co.in/api/finished-goods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-access-token': token },
        body: JSON.stringify({
          productionOrderId: activeOrder.value,
          productId: activeOrder.productId,
          producedQty: parseFloat(producedQty),
          wastageQty: parseFloat(wastageQty) || 0,
          loggedBy: selectedEmployee ? selectedEmployee.name : 'System'
        })
      });

      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await res.json();
        if (res.ok) {
          alert(`Success! Inventory Updated. Receipt No: ${data.receiptNo}`);
          setSelectedOrderId('');
          setActiveOrder(null);
          setProducedQty('');
          setWastageQty(0);
          setLoggedById('');
          setViewMode('list');
          fetchData();
        } else {
          alert(`Error: ${data.error}`);
        }
      } else {
        alert("Server error. Please check if the backend is running.");
      }
    } catch (error) {
      console.error("Submission error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredReceipts = (receipts || []).filter(r => 
    (r.ReceiptNo && r.ReceiptNo.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (r.ProductName && r.ProductName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
      
      {/* HEADER WITH TOGGLES */}
      <div className="p-5 border-b border-gray-200 bg-gray-50 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-800 uppercase tracking-wide">Finished Goods Receipt</h2>
          <p className="text-sm text-gray-500 mt-1">Finalize production orders and transfer manufactured items into warehouse inventory.</p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`flex-1 md:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-colors shadow-sm ${
              viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
            }`}
          >
            📋 Inventory Log
          </button>
          <button
            type="button"
            onClick={() => setViewMode('create')}
            className={`flex-1 md:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-colors shadow-sm ${
              viewMode === 'create' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
            }`}
          >
            ＋ Receive Goods
          </button>
        </div>
      </div>

      {/* VIEW MODE: LIST */}
      {viewMode === 'list' && (
        <div>
          <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wide">Recent Transfers to Inventory</h3>
            <input 
              type="text" 
              placeholder="Search receipts or products..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full md:w-1/3 p-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="text-xs text-gray-700 uppercase bg-gray-100 border-b">
                <tr>
                  <th className="px-6 py-4 font-semibold">Receipt No</th>
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold">Master Order</th>
                  <th className="px-6 py-4 font-semibold">Product</th>
                  <th className="px-6 py-4 font-semibold text-right">Net Yield</th>
                  <th className="px-6 py-4 font-semibold">Logged By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredReceipts.map((rec, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 bg-white">
                    <td className="px-6 py-4 font-bold text-blue-600">{rec.ReceiptNo || `FGR-${idx+1}`}</td>
                    <td className="px-6 py-4 text-gray-500">{new Date(rec.ReceiptDate || Date.now()).toLocaleDateString()}</td>
                    <td className="px-6 py-4 font-mono">{rec.OrderNo}</td>
                    <td className="px-6 py-4 font-bold text-gray-900">{rec.ProductName}</td>
                    <td className="px-6 py-4 font-mono text-right text-green-700 font-bold">{rec.ProducedQuantity} Units</td>
                    <td className="px-6 py-4 text-gray-500">{rec.LoggedBy || 'System'}</td>
                  </tr>
                ))}
                {filteredReceipts.length === 0 && (
                  <tr><td colSpan="6" className="px-6 py-8 text-center text-gray-500">No finished goods receipts found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW MODE: CREATE FORM */}
      {viewMode === 'create' && (
        <form onSubmit={handleSubmitReceipt} className="p-5 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">1. Select Production Order *</label>
              <Select
                options={orderOptions}
                value={orderOptions.find(opt => opt.value === selectedOrderId) || null}
                onChange={(selected) => handleOrderSelect(selected ? selected.value : '')}
                isSearchable
                isClearable
                placeholder="Search Pending Orders..."
                className="text-gray-900 text-sm"
                classNamePrefix="erp-select"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">2. Received By (Employee) *</label>
              <Select
                options={employeeOptions}
                value={employeeOptions.find(opt => opt.value === loggedById) || null}
                onChange={(selected) => setLoggedById(selected ? selected.value : '')}
                isSearchable
                isClearable
                placeholder="Employee logging to store..."
                className="text-gray-900 text-sm"
                classNamePrefix="erp-select"
              />
            </div>
          </div>

          {activeOrder && (
            <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 mb-6">
              <h4 className="text-xs font-bold text-gray-700 uppercase mb-4 border-b border-gray-300 pb-2">Final Yield Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-400 uppercase">Target Product</label>
                  <div className="p-2.5 bg-white border border-gray-200 rounded-md text-sm font-bold text-gray-800">
                    {activeOrder.productName}
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-blue-600 uppercase">Actual Net Yield *</label>
                  <input 
                    type="number" step="0.01" min="0"
                    value={producedQty} 
                    onChange={(e) => setProducedQty(e.target.value)}
                    placeholder={`Target was ${activeOrder.targetQty}`}
                    required
                    className="p-2.5 bg-white border-2 border-blue-400 rounded-md text-sm font-mono font-bold text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-red-500 uppercase">Wastage / Rejects</label>
                  <input 
                    type="number" step="0.01" min="0"
                    value={wastageQty} 
                    onChange={(e) => setWastageQty(e.target.value)}
                    placeholder="0.00"
                    className="p-2.5 bg-white border border-red-300 rounded-md text-sm font-mono text-gray-900 focus:ring-2 focus:ring-red-500 outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          <button 
            type="submit" 
            disabled={isProcessing || !activeOrder}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold rounded-xl shadow transition-colors text-base"
          >
            {isProcessing ? 'Updating Inventory...' : 'Finalize Transfer to Warehouse'}
          </button>
        </form>
      )}
    </div>
  );
}