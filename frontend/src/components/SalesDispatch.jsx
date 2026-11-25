import { useState, useEffect } from 'react';
import Select from 'react-select';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { API_BASE_URL } from '../config';

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

      const soRes = await fetch(`${API_BASE_URL}/sales-orders`, {
        headers: { 'x-access-token': token }
      });
      const soData = soRes.ok ? await soRes.json() : [];
      setSalesOrders(Array.isArray(soData) ? soData : []);

      const partyRes = await fetch(`${API_BASE_URL}/parties`, {
        headers: { 'x-access-token': token }
      });
      const partyData = partyRes.ok ? await partyRes.json() : [];
      setEmployees(Array.isArray(partyData) ? partyData.filter(p => p.PartyType === 'Employee') : []);

      const dispRes = await fetch(`${API_BASE_URL}/sales-dispatches`, {
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
      const res = await fetch(`${API_BASE_URL}/sales-orders/${soId}/dispatch-items-v2`, {
        headers: { 'x-access-token': token }
      });

      const data = await res.json();

      if (!res.ok) {
        alert(`Backend Error: ${data.error}`);
        return;
      }

      setSoItemsList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching SO items:", err);
      setSoItemsList([]);
    }
  };

  const soOptions = salesOrders.map(so => ({
    value: String(so.SO_ID || so.SalesOrderID),
    label: `${so.SONumber} - ${so.CustomerName || 'Customer'}`
  }));

  const employeeOptions = employees.map(emp => ({
    value: String(emp.PartyID),
    label: `${emp.PartyName} (${emp.DesignationName || 'Staff'})`
  }));

  const productOptions = (soItemsList || []).map((item, index) => {
    const pId = item.ProductID || item.productId || item.id || item.ItemID;
    const pName = item.ProductName || item.productName || item.ItemName || 'Unknown Product';
    const qty = item.Quantity || item.quantity || item.Qty || item.OrderedQty || 0;

    return {
      value: pId !== undefined && pId !== null ? String(pId) : `MISSING_ID_${index}`,
      label: `${pName} (Ordered: ${qty})`
    };
  }).filter(opt => !opt.value.startsWith('MISSING_ID'));

  const handleAddDispatchItem = () => {
    if (!currentProduct.productId) {
      return alert("Please select a product from the order items.");
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

      const payload = {
        soId: parseInt(selectedSoId, 10),
        dispatchedBy: receivedById,
        vehicleNumber: vehicleNo,
        remarks: remarks,
        items: dispatchItems.map(item => ({
          productId: parseInt(item.productId, 10),
          quantity: parseInt(item.quantity, 10)
        }))
      };

      const res = await fetch(`${API_BASE_URL}/sales-dispatches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-token': token
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

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
        alert(`Failed to save dispatch entry: ${data.error || 'Check server logs.'}`);
      }
    } catch (error) {
      console.error("Error submitting dispatch:", error);
      alert(`Network Error: ${error.message}`);
    }
  };

  // --- GENERATE DELIVERY CHALLAN / GATE PASS PDF (NO PRICES) ---
  const generateDeliveryChallan = (d) => {
    const challanNo = d.DispatchNo || `DC-${d.DispatchID}`;
    const dispatchDate = new Date(d.DispatchDate || Date.now()).toLocaleDateString('en-IN');

    // Fallback to salesOrders list if backend hasn't been restarted with CustomerName join
    const matchedSO = salesOrders.find(so => so.SONumber === d.SONumber);
    const customerName = d.CustomerName || matchedSO?.CustomerName || 'Valued Customer';
    const customerAddress = d.CustomerAddress || '';
    const customerPhone = d.CustomerPhone || '';
    const vehicle = d.VehicleNo || d.VehicleNumber || 'N/A';
    const dispatchedBy = d.ReceivedByName || d.DispatchedBy || 'System';

    const doc = new jsPDF();

    // Header
    doc.setFontSize(22);
    doc.setTextColor(30, 64, 175);
    doc.text("TARWANI SOAPS", 105, 18, { align: "center" });

    doc.setFontSize(11);
    doc.setTextColor(80, 80, 80);
    doc.text("DELIVERY CHALLAN / GATE PASS (NOT FOR SALE)", 105, 25, { align: "center" });
    doc.setDrawColor(200, 200, 200);
    doc.line(14, 29, 196, 29);

    // Metadata Grid (Left: Consignee, Right: Logistics)
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);

    doc.setFont(undefined, 'bold');
    doc.text("CONSIGNEE / DELIVER TO:", 14, 38);
    doc.setFont(undefined, 'normal');
    doc.text(customerName, 14, 44);
    if (customerAddress) doc.text(customerAddress, 14, 50, { maxWidth: 95 });
    if (customerPhone) doc.text(`Phone: ${customerPhone}`, 14, customerAddress ? 58 : 50);

    doc.setFont(undefined, 'bold');
    doc.text(`Challan No:`, 125, 38);
    doc.text(`Dispatch Date:`, 125, 44);
    doc.text(`Sales Order Ref:`, 125, 50);
    doc.text(`Vehicle No:`, 125, 56);
    doc.text(`Dispatched By:`, 125, 62);

    doc.setFont(undefined, 'normal');
    doc.text(challanNo, 158, 38);
    doc.text(dispatchDate, 158, 44);
    doc.text(d.SONumber || 'N/A', 158, 50);
    doc.text(vehicle, 158, 56);
    doc.text(String(dispatchedBy), 158, 62);

    // Items Table (Quantities Only — No Pricing)
    autoTable(doc, {
      startY: 72,
      headStyles: { fillColor: [30, 64, 175], textColor: [255, 255, 255] },
      head: [['S.No', 'Product Description', 'Dispatched Qty', 'Remarks']],
      body: [[
        '1',
        d.ProductName || 'Finished Goods',
        `${d.DispatchedQty || 0} Units`,
        'Checked & Loaded'
      ]],
      theme: 'grid',
    });

    // Declaration & 3-Part Signature Block (Gate Pass + POD)
    const finalY = doc.lastAutoTable.finalY + 14;
    doc.setFontSize(9);
    doc.setTextColor(90, 90, 90);
    doc.text("Received the above goods in good order and condition.", 14, finalY);

    const sigY = finalY + 26;
    doc.setDrawColor(120, 120, 120);
    doc.line(14, sigY, 62, sigY);
    doc.line(80, sigY, 128, sigY);
    doc.line(146, sigY, 196, sigY);

    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    doc.text("Dispatched By (Store)", 38, sigY + 5, { align: "center" });
    doc.text("Driver / Transporter", 104, sigY + 5, { align: "center" });
    doc.text("Receiver's Signature (POD)", 171, sigY + 5, { align: "center" });

    doc.save(`Delivery_Challan_${challanNo}.pdf`);
  };

  const filteredDispatches = (dispatches || []).filter(d => {
    if (!searchTerm) return true;

    const term = searchTerm.toLowerCase();
    const matchID = d.DispatchID && String(d.DispatchID).includes(term);
    const matchSO = d.SONumber && String(d.SONumber).toLowerCase().includes(term);
    const matchVehicle = d.VehicleNumber && String(d.VehicleNumber).toLowerCase().includes(term);
    const matchUser = d.DispatchedBy && String(d.DispatchedBy).toLowerCase().includes(term);
    const matchCustomer = d.CustomerName && String(d.CustomerName).toLowerCase().includes(term);

    return matchID || matchSO || matchVehicle || matchUser || matchCustomer;
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">

      <div className="p-5 border-b border-gray-200 bg-gray-50 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-800 uppercase tracking-wide">Daily Dispatch Management</h2>
          <p className="text-sm text-gray-500 mt-1">Record outbound shipments, link delivery personnel, and generate Delivery Challans.</p>
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
                  <th className="px-6 py-4 font-semibold">Dispatched By</th>
                  <th className="px-6 py-4 font-semibold">Vehicle No</th>
                  <th className="px-6 py-4 font-semibold text-right">Challan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredDispatches.map((d, idx) => (
                  <tr key={d.DispatchID || idx} className="hover:bg-gray-50 bg-white">
                    <td className="px-6 py-4 font-bold text-blue-600">
                      {d.DispatchNo || (d.DispatchID ? `DSP-${d.DispatchID}` : `DSP-00${idx + 1}`)}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(d.DispatchDate || Date.now()).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-900">
                      {d.CustomerName ? `${d.CustomerName} (${d.SONumber})` : (d.SONumber || 'N/A')}
                    </td>
                    <td className="px-6 py-4">
                      {d.ReceivedByName || d.DispatchedBy || 'System'}
                    </td>
                    <td className="px-6 py-4 font-mono">
                      {d.VehicleNo || d.VehicleNumber || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => generateDeliveryChallan(d)}
                        className="px-3 py-1.5 bg-gray-800 hover:bg-gray-900 text-white text-xs font-bold rounded transition-colors inline-flex items-center gap-1"
                      >
                        <span>🖨️</span> Challan
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredDispatches.length === 0 && (
                  <tr><td colSpan="6" className="px-6 py-8 text-center text-gray-500">No dispatch records found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

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