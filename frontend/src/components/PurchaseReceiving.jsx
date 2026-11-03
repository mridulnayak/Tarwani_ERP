import { useState, useEffect } from 'react';
import Select from 'react-select';

export default function PurchaseReceiving({ user }) {
  const [vendors, setVendors] = useState([]);
  const [products, setProducts] = useState([]);
  const [tanks, setTanks] = useState([]);
  const [receivings, setReceivings] = useState([]);

  // View Mode: 'list' or 'create'
  const [viewMode, setViewMode] = useState('list');

  // Form State
  const [vendorId, setVendorId] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  
  // Sequential Item State
  const [currentItem, setCurrentItem] = useState({ productId: '', quantity: 1, requiresTank: false, tankId: '' });
  const [receivedItems, setReceivedItems] = useState([]);

  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('erp_token');
      
      const [partyRes, prodRes, tankRes, recRes] = await Promise.all([
        fetch('https://sms.uvtechsolutions.co.in/api/parties', { headers: { 'x-access-token': token } }),
        fetch('https://sms.uvtechsolutions.co.in/api/products', { headers: { 'x-access-token': token } }),
        fetch('https://sms.uvtechsolutions.co.in/api/tanks', { headers: { 'x-access-token': token } }), // Assuming you have a tanks API
        fetch('https://sms.uvtechsolutions.co.in/api/purchase-receivings', { headers: { 'x-access-token': token } })
      ]);

      const partyData = partyRes.ok ? await partyRes.json() : [];
      setVendors(Array.isArray(partyData) ? partyData.filter(p => p.PartyType === 'Vendor') : []);

      const prodData = prodRes.ok ? await prodRes.json() : [];
      setProducts(Array.isArray(prodData) ? prodData : []);

      const tankData = tankRes.ok ? await tankRes.json() : [];
      setTanks(Array.isArray(tankData) ? tankData : []);

      const recData = recRes.ok ? await recRes.json() : [];
      setReceivings(Array.isArray(recData) ? recData : []);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const vendorOptions = vendors.map(v => ({ value: String(v.PartyID), label: v.PartyName }));
  const productOptions = products.map(p => ({ value: String(p.ProductID), label: p.ProductName }));
  
  // Format tank options to show available capacity
  const tankOptions = tanks.map(t => {
    const availableSpace = (t.MaxCapacity || 0) - (t.CurrentVolume || 0);
    return {
      value: String(t.TankID),
      label: `${t.TankName} (Free Space: ${availableSpace} L)`,
      availableSpace: availableSpace
    };
  });

  // --- SEQUENTIAL ITEM ADDITION HANDLERS ---
  const handleAddReceivedItem = () => {
    if (!currentItem.productId) return alert("Please select a raw material.");
    if (currentItem.quantity <= 0) return alert("Quantity must be greater than zero.");
    
    // 🚨 TANK CAPACITY VALIDATION LOGIC 🚨
    if (currentItem.requiresTank) {
      if (!currentItem.tankId) return alert("Please select a target tank for this liquid material.");
      
      const selectedTank = tankOptions.find(t => t.value === currentItem.tankId);
      if (selectedTank && currentItem.quantity > selectedTank.availableSpace) {
        return alert(`Cannot load! The quantity (${currentItem.quantity}) exceeds the available free space in ${selectedTank.label}.`);
      }
    }

    setReceivedItems([...receivedItems, { ...currentItem }]);
    // Reset current item box
    setCurrentItem({ productId: '', quantity: 1, requiresTank: false, tankId: '' });
  };

  const handleRemoveItem = (index) => {
    setReceivedItems(receivedItems.filter((_, i) => i !== index));
  };

  // --- SUBMIT COMPLETE RECEIVING ---
  const handleSubmitReceiving = async (e) => {
    e.preventDefault();
    if (!vendorId) return alert("Please select a vendor.");
    if (receivedItems.length === 0) return alert("Please add at least one material to the receiving list.");

    try {
      const token = localStorage.getItem('erp_token');
      const res = await fetch('https://sms.uvtechsolutions.co.in/api/purchase-receivings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-access-token': token },
        body: JSON.stringify({ vendorId, invoiceNo, vehicleNo, items: receivedItems })
      });
      
      if (res.ok) {
        setVendorId('');
        setInvoiceNo('');
        setVehicleNo('');
        setReceivedItems([]);
        setViewMode('list');
        fetchData();
        alert("Materials received and inventory/tanks updated successfully!");
      } else {
        alert("Failed to record receiving.");
      }
    } catch (error) {
      console.error("Error submitting receiving:", error);
    }
  };

  const filteredReceivings = (receivings || []).filter(r => 
    (r.GRN_Number && r.GRN_Number.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (r.VendorName && r.VendorName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
      
      {/* HEADER WITH TOGGLE BUTTONS */}
      <div className="p-5 border-b border-gray-200 bg-gray-50 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-800 uppercase tracking-wide">Purchase Receiving (GRN)</h2>
          <p className="text-sm text-gray-500 mt-1">Receive raw materials, allocate to warehouses, or pump into tanks.</p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`flex-1 md:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-colors shadow-sm ${
              viewMode === 'list' ? 'bg-green-600 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
            }`}
          >
            📋 View List ({receivings.length})
          </button>
          <button
            type="button"
            onClick={() => setViewMode('create')}
            className={`flex-1 md:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-colors shadow-sm ${
              viewMode === 'create' ? 'bg-green-600 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
            }`}
          >
            ＋ Receive Materials
          </button>
        </div>
      </div>

      {/* VIEW MODE: LIST */}
      {viewMode === 'list' && (
        <div>
          <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wide">Recent Receivings</h3>
            <input 
              type="text" 
              placeholder="Search by GRN or Vendor..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full md:w-1/3 p-2 bg-white border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="text-xs text-gray-700 uppercase bg-gray-100 border-b">
                <tr>
                  <th className="px-6 py-4 font-semibold">GRN No</th>
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold">Vendor</th>
                  <th className="px-6 py-4 font-semibold">Invoice No</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredReceivings.map((rec, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 bg-white">
                    <td className="px-6 py-4 font-bold text-green-600">{rec.GRN_Number || `GRN-${idx+1}`}</td>
                    <td className="px-6 py-4 text-gray-500">{new Date(rec.ReceiveDate || Date.now()).toLocaleDateString()}</td>
                    <td className="px-6 py-4 font-bold text-gray-900">{rec.VendorName}</td>
                    <td className="px-6 py-4 font-mono">{rec.InvoiceNo || 'N/A'}</td>
                  </tr>
                ))}
                {filteredReceivings.length === 0 && (
                  <tr><td colSpan="4" className="px-6 py-8 text-center text-gray-500">No receivings found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW MODE: CREATE FORM */}
      {viewMode === 'create' && (
        <form onSubmit={handleSubmitReceiving} className="p-5 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="md:col-span-1">
              <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Select Vendor *</label>
              <Select
                options={vendorOptions}
                value={vendorOptions.find(opt => opt.value === vendorId) || null}
                onChange={(selected) => setVendorId(selected ? selected.value : '')}
                isSearchable
                className="text-gray-900 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Invoice/Challan No</label>
              <input 
                type="text" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)}
                className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-sm text-gray-900"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Vehicle No</label>
              <input 
                type="text" value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value)}
                className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-sm text-gray-900"
              />
            </div>
          </div>

          {/* Sequential Material Adder Box */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6">
            <h4 className="text-xs font-bold text-gray-700 uppercase mb-3">Add Received Materials (One by One)</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start bg-white p-4 rounded-lg border border-gray-200 shadow-sm mb-4">
              
              <div className="md:col-span-5 flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-400 uppercase">Material Received</label>
                <Select
                  options={productOptions}
                  value={productOptions.find(opt => opt.value === currentItem.productId) || null}
                  onChange={(selected) => setCurrentItem({ ...currentItem, productId: selected ? selected.value : '' })}
                  isSearchable
                  className="text-gray-900 text-sm"
                />
              </div>

              <div className="md:col-span-2 flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-400 uppercase">Qty (Units/Liters)</label>
                <input 
                  type="number" min="1"
                  value={currentItem.quantity} 
                  onChange={(e) => setCurrentItem({ ...currentItem, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="p-2 bg-gray-50 border border-gray-300 rounded text-sm h-[38px]" // matching react-select height
                />
              </div>

              {/* TANK LOGIC TOGGLE */}
              <div className="md:col-span-3 flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-400 uppercase flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={currentItem.requiresTank}
                    onChange={(e) => setCurrentItem({ ...currentItem, requiresTank: e.target.checked, tankId: '' })}
                    className="w-3 h-3"
                  />
                  Load into Tank?
                </label>
                {currentItem.requiresTank && (
                  <Select
                    options={tankOptions}
                    value={tankOptions.find(opt => opt.value === currentItem.tankId) || null}
                    onChange={(selected) => setCurrentItem({ ...currentItem, tankId: selected ? selected.value : '' })}
                    placeholder="Select Tank..."
                    className="text-gray-900 text-sm"
                  />
                )}
              </div>

              <div className="md:col-span-2 flex items-end h-full">
                <button 
                  type="button" 
                  onClick={handleAddReceivedItem}
                  className="w-full py-2 h-[38px] bg-green-600 hover:bg-green-700 text-white font-bold rounded text-xs shadow"
                >
                  + Add to List
                </button>
              </div>
            </div>

            {/* Received Items Grid Table */}
            <div className="overflow-x-auto bg-white rounded border border-gray-200">
              <table className="w-full text-left text-xs text-gray-700">
                <thead className="bg-gray-100 uppercase border-b">
                  <tr>
                    <th className="p-2.5">Material</th>
                    <th className="p-2.5">Quantity Received</th>
                    <th className="p-2.5">Destination (Tank/Store)</th>
                    <th className="p-2.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {receivedItems.map((it, idx) => {
                    const pObj = products.find(p => String(p.ProductID) === String(it.productId));
                    const tObj = tanks.find(t => String(t.TankID) === String(it.tankId));
                    return (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="p-2.5 font-semibold">{pObj ? pObj.ProductName : 'Unknown'}</td>
                        <td className="p-2.5 font-mono text-blue-700 font-bold">{it.quantity}</td>
                        <td className="p-2.5">
                          {it.requiresTank ? (
                            <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-semibold border border-blue-200">
                              🛢️ {tObj ? tObj.TankName : 'Tank'}
                            </span>
                          ) : (
                            <span className="text-gray-500 font-medium">🏢 Main Warehouse</span>
                          )}
                        </td>
                        <td className="p-2.5 text-center">
                          <button type="button" onClick={() => handleRemoveItem(idx)} className="text-red-600 font-bold underline">Remove</button>
                        </td>
                      </tr>
                    );
                  })}
                  {receivedItems.length === 0 && (
                    <tr><td colSpan="4" className="p-4 text-center text-gray-400">No materials loaded yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={receivedItems.length === 0}
            className="w-full py-3.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold rounded-xl shadow text-base"
          >
            Save Receiving & Update Inventory ({receivedItems.length} Items)
          </button>
        </form>
      )}
    </div>
  );
}