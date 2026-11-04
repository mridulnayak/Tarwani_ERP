import { useState, useEffect } from 'react';
import Select from 'react-select';

export default function SalesDispatch({ user }) {
  const [salesOrders, setSalesOrders] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [dispatches, setDispatches] = useState([]);

  // View Mode: 'list' or 'create'
  const [viewMode, setViewMode] = useState('list');

  // Form State
  const [selectedSoId, setSelectedSoId] = useState('');
  const [receivedById, setReceivedById] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [remarks, setRemarks] = useState('');
  
  // Sequential Items Loaded for Delivery
  const [dispatchItems, setDispatchItems] = useState([]);
  const [currentProduct, setCurrentProduct] = useState({ productId: '', quantity: 1 });
  const [soItemsList, setSoItemsList] = useState([]);

  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('erp_token');
      
      // Fetch Approved/Pending Sales Orders
      const soRes = await fetch('https://sms.uvtechsolutions.co.in/api/sales-orders', {
        headers: { 'x-access-token': token }
      });
      const soData = soRes.ok ? await soRes.json() : [];
      setSalesOrders(Array.isArray(soData) ? soData : []);

      // Fetch Employees for "Received By" dropdown
      const partyRes = await fetch('https://sms.uvtechsolutions.co.in/api/parties', {
        headers: { 'x-access-token': token }
      });
      const partyData = partyRes.ok ? await partyRes.json() : [];
      setEmployees(Array.isArray(partyData) ? partyData.filter(p => p.PartyType === 'Employee') : []);

      // Fetch Existing Dispatches
      const dispRes = await fetch('https://sms.uvtechsolutions.co.in/api/sales-dispatches', {
        headers: { 'x-access-token': token }
      });
      const dispData = dispRes.ok ? await dispRes.json() : [];
      setDispatches(Array.isArray(dispData) ? dispData : []);
    } catch (error) {
      console.error("Error fetching dispatch data:", error);
    }
  };

  useEffect(() => { fetchData(); }, []);

const handleSalesOrderChange = async (soId) => {
    setSelectedSoId(soId);
    setDispatchItems([]);
    if (!soId) {
      setSoItemsList([]);
      return;
    }

    try {
      const token = localStorage.getItem('erp_token');
      const res = await fetch(`https://sms.uvtechsolutions.co.in/api/sales-orders/${soId}/items`, {
        headers: { 'x-access-token': token }
      });
      
      const data = res.ok ? await res.json() : [];
      console.log("🔥 FETCHED SO ITEMS FROM API:", data); // Check F12 Console with this
      
      setSoItemsList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching SO items:", err);
      setSoItemsList([]);
    }
  };
  const soOptions = salesOrders.map(so => ({
    value: String(so.SO_ID || so.SalesOrderID),
    label: `${so.SONumber} - ${so.CustomerName || 'Customer'}` // ✅ Removed the stray '-' sign
  }));

  const employeeOptions = employees.map(emp => ({
    value: String(emp.PartyID),
    label: `${emp.PartyName} (${emp.DesignationName || 'Staff'})`
  }));

  // 🚨 FOOLPROOF PRODUCT OPTIONS MAPPING
  const productOptions = (soItemsList || []).map((item, index) => {
    // 1. Forcefully grab any ID, Name, and Qty it can find
    const pId = item.ProductID || item.productId || item.id || item.ItemID || `temp-${index}`;
    const pName = item.ProductName || item.productName || item.ItemName || item.name || 'Unknown Product';
    const qty = item.Quantity || item.quantity || item.Qty || item.OrderedQty || 0;

    return {
      value: String(pId),
      label: `${pName} (Ordered: ${qty})`
    };
  }).filter(opt => opt.value && opt.value !== 'undefined'); // ✅ Chained correctly directly to the map function!

  // Check F12 console to see exactly what is being loaded into the dropdown
  console.log("🛒 RAW SO ITEMS:", soItemsList);
  console.log("✅ MAPPED DROPDOWN OPTIONS:", productOptions);

  const handleAddDispatchItem = () => {
    if (!currentProduct.productId || currentProduct.productId === 'undefined') {
      return alert("Technical Error: The selected product does not have a valid ID.");
    }
    if (currentProduct.quantity <= 0) {
      return alert("Quantity must be greater than zero.");
    }

    setDispatchItems([...dispatchItems, { ...currentProduct }]);
    setCurrentProduct({ productId: '', quantity: 1 });
  };

  const handleRemoveDispatchItem = (index) => {
    setDispatchItems(dispatchItems.filter((_, i) => i !== index));
  };

const handleSubmitDispatch = async (e) => {
    e.preventDefault();
    if (!selectedSoId) return alert("Please select a Sales Order.");
    if (!receivedById) return alert("Please select who received the delivery ('Received By').");
    if (dispatchItems.length === 0) return alert("Please add at least one loaded item for delivery.");

    try {
      const token = localStorage.getItem('erp_token');
      
      // Make sure we are sending exact keys backend expects
      const payload = { 
        soId: parseInt(selectedSoId, 10), // Ensure it's a number
        dispatchedBy: receivedById,       // Backend expects 'dispatchedBy'
        vehicleNumber: vehicleNo,         // Backend expects 'vehicleNumber'
        remarks: remarks, 
        items: dispatchItems.map(item => ({
             productId: parseInt(item.productId, 10), 
             quantity: parseInt(item.quantity, 10)    
        }))
      };

      const res = await fetch('https://sms.uvtechsolutions.co.in/api/sales-dispatches', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-access-token': token 
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json(); // ALWAYS parse the response first

      if (res.ok) {
        setSelectedSoId('');
        setReceivedById('');
        setVehicleNo('');
        setRemarks('');
        setDispatchItems([]);
        setSoItemsList([]);
        setViewMode('list');
        fetchData();
        alert("Daily Dispatch entry recorded successfully!");
      } else {
        // Now you will see exactly WHY it threw a 400 error!
        alert(`Failed to save dispatch entry: ${data.error || 'Check server logs.'}`);
      }
    } catch (error) {
      console.error("Error submitting dispatch:", error);
      alert(`Network Error: ${error.message}`);
    }
  };

  const filteredDispatches = (dispatches || []).filter(d => 
    (d.DispatchNo && d.DispatchNo.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (d.CustomerName && d.CustomerName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
      
      {/* HEADER WITH TOGGLE BUTTONS */}
      <div className="p-5 border-b border-gray-200 bg-gray-50 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-800 uppercase tracking-wide">Daily Dispatch Management</h2>
          <p className="text-sm text-gray-500 mt-1">Record outbound shipments, link delivery personnel, and track trucks.</p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`flex-1 md:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-colors shadow-sm ${
              viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
            }`}
          >
            📋 View List ({dispatches.length})
          </button>
          <button
            type="button"
            onClick={() => setViewMode('create')}
            className={`flex-1 md:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-colors shadow-sm ${
              viewMode === 'create' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
            }`}
          >
            ＋ Add New Dispatch
          </button>
        </div>
      </div>

      {/* VIEW MODE: LIST */}
      {viewMode === 'list' && (
        <div>
          <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wide">Existing Dispatch Records</h3>
            <input 
              type="text" 
              placeholder="Search dispatches..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full md:w-1/3 p-2 bg-white border border-gray-300 rounded-lg text-sm"
            />
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="text-xs text-gray-700 uppercase bg-gray-100 border-b">
                <tr>
                  <th className="px-6 py-4 font-semibold">Dispatch No</th>
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold">Customer / SO</th>
                  <th className="px-6 py-4 font-semibold">Received By</th>
                  <th className="px-6 py-4 font-semibold">Vehicle No</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredDispatches.map((d, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 bg-white">
                    <td className="px-6 py-4 font-bold text-blue-600">{d.DispatchNo || `DSP-${idx+1}`}</td>
                    <td className="px-6 py-4 text-gray-500">{new Date(d.DispatchDate || Date.now()).toLocaleDateString()}</td>
                    <td className="px-6 py-4 font-bold text-gray-900">{d.CustomerName || 'N/A'}</td>
                    <td className="px-6 py-4">{d.ReceivedByName || 'N/A'}</td>
                    <td className="px-6 py-4 font-mono">{d.VehicleNo || 'N/A'}</td>
                  </tr>
                ))}
                {filteredDispatches.length === 0 && (
                  <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-500">No dispatch records found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW MODE: CREATE FORM */}
      {viewMode === 'create' && (
        <form onSubmit={handleSubmitDispatch} className="p-5 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Select Sales Order *</label>
              <Select
                options={soOptions}
                value={soOptions.find(opt => opt.value === selectedSoId) || null}
                onChange={(selected) => handleSalesOrderChange(selected ? selected.value : '')}
                isSearchable
                isClearable
                placeholder="Search sales orders..."
                className="text-gray-900 text-sm"
                classNamePrefix="erp-select"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Received By (Employee) *</label>
              <Select
                options={employeeOptions}
                value={employeeOptions.find(opt => opt.value === receivedById) || null}
                onChange={(selected) => setReceivedById(selected ? selected.value : '')}
                isSearchable
                isClearable
                placeholder="Search employee / driver..."
                className="text-gray-900 text-sm"
                classNamePrefix="erp-select"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Vehicle Number</label>
              <input 
                type="text" 
                value={vehicleNo} 
                onChange={(e) => setVehicleNo(e.target.value)}
                placeholder="e.g. CG-04-AB-1234"
                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded text-sm text-gray-900"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Remarks / Notes</label>
              <input 
                type="text" 
                value={remarks} 
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Optional notes..."
                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded text-sm text-gray-900"
              />
            </div>
          </div>

          {/* Sequential Item Loading Box */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6">
            <h4 className="text-xs font-bold text-gray-700 uppercase mb-3">Load Items for Delivery (Sequential)</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-white p-3 rounded-lg border border-gray-200 shadow-sm mb-4">
              <div className="md:col-span-8 flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-400 uppercase">Product from Order</label>
                <Select
                  options={productOptions}
                  value={productOptions.find(opt => opt.value === currentProduct.productId) || null}
                  onChange={(selected) => setCurrentProduct({ ...currentProduct, productId: selected ? selected.value : '' })}
                  isSearchable
                  isClearable
                  placeholder="Select ordered product..."
                  className="text-gray-900 text-sm"
                  classNamePrefix="erp-select"
                />
              </div>

              <div className="md:col-span-2 flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-400 uppercase">Dispatch Qty</label>
                <input 
                  type="number" min="1"
                  value={currentProduct.quantity} 
                  onChange={(e) => setCurrentProduct({ ...currentProduct, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="p-2 bg-gray-50 border border-gray-300 rounded text-sm"
                />
              </div>

              <div className="md:col-span-2">
                <button 
                  type="button" 
                  onClick={handleAddDispatchItem}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded text-xs shadow"
                >
                  + Add Item
                </button>
              </div>
            </div>

            {/* Loaded Items Table */}
            <div className="overflow-x-auto bg-white rounded border border-gray-200">
              <table className="w-full text-left text-xs text-gray-700">
                <thead className="bg-gray-100 uppercase border-b">
                  <tr>
                    <th className="p-2.5">Product</th>
                    <th className="p-2.5">Quantity Loaded</th>
                    <th className="p-2.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {dispatchItems.map((it, idx) => {
                    const pObj = soItemsList.find(p => String(p.ProductID) === String(it.productId));
                    return (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="p-2.5 font-semibold">{pObj ? pObj.ProductName : 'Product'}</td>
                        <td className="p-2.5 font-mono">{it.quantity} Units</td>
                        <td className="p-2.5 text-center">
                          <button type="button" onClick={() => handleRemoveDispatchItem(idx)} className="text-red-600 underline font-bold">Remove</button>
                        </td>
                      </tr>
                    );
                  })}
                  {dispatchItems.length === 0 && (
                    <tr><td colSpan="3" className="p-4 text-center text-gray-400">No items loaded yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={dispatchItems.length === 0}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold rounded-xl shadow text-base"
          >
            Confirm & Complete Dispatch ({dispatchItems.length} Items)
          </button>
        </form>
      )}
    </div>
  );
}