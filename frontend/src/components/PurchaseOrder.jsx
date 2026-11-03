import { useState, useEffect } from 'react';
import Select from 'react-select';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function PurchaseOrder({ user }) {
  const [vendors, setVendors] = useState([]);
  const [products, setProducts] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);

  // View Mode State: 'list' or 'create'
  const [viewMode, setViewMode] = useState('list');

  // Form State
  const [vendorId, setVendorId] = useState('');
  const [currentItem, setCurrentItem] = useState({ productId: '', quantity: 1, rate: 0 });
  const [orderItems, setOrderItems] = useState([]); // Sequential added materials list

  // Inline Quick-Add Vendor State
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [newVendorName, setNewVendorName] = useState('');
  const [newVendorPhone, setNewVendorPhone] = useState('');
  const [newVendorAddress, setNewVendorAddress] = useState('');
  const [newVendorGst, setNewVendorGst] = useState('');

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('erp_token');
      const partyRes = await fetch('https://sms.uvtechsolutions.co.in/api/parties', {
        method: 'GET',
        headers: { 'x-access-token': token }
      });
      const partyData = await partyRes.json();
      setVendors(Array.isArray(partyData) ? partyData.filter(p => p.PartyType === 'Vendor') : []);

      const prodRes = await fetch('https://sms.uvtechsolutions.co.in/api/products', {
        method: 'GET',
        headers: { 'x-access-token': token }
      });
      const prodData = await prodRes.json();
      setProducts(Array.isArray(prodData) ? prodData : []);

      const poRes = await fetch('https://sms.uvtechsolutions.co.in/api/purchase-orders', {
        method: 'GET',
        headers: { 'x-access-token': token }
      });
      const poData = await poRes.json();
      setPurchaseOrders(Array.isArray(poData) ? poData : []);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const vendorOptions = vendors.map(v => ({
    value: String(v.PartyID),
    label: v.PartyName
  }));
  const productOptions = products.map(p => ({
    value: String(p.ProductID),
    label: p.ProductName
  }));

  // --- QUICK ADD VENDOR ---
  const handleQuickAddVendor = async (e) => {
    e.preventDefault();
    if (!newVendorName) return alert("Please enter Vendor Name.");

    try {
      const token = localStorage.getItem('erp_token');
      const res = await fetch('https://sms.uvtechsolutions.co.in/api/parties', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-access-token': token 
        },
        body: JSON.stringify({ 
          partyName: newVendorName, 
          partyType: 'Vendor', 
          phone: newVendorPhone, 
          address: newVendorAddress, 
          gstNumber: newVendorGst 
        })
      });

      if (res.ok) {
        setNewVendorName('');
        setNewVendorPhone('');
        setNewVendorAddress('');
        setNewVendorGst('');
        setIsQuickAddOpen(false);
        await fetchData();
        alert("Vendor created successfully!");
      } else {
        const errData = await res.json();
        alert(`Failed to create vendor: ${errData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Error creating vendor:", error);
      alert("Network error while creating vendor.");
    }
  };

  // --- SEQUENTIAL ITEM ADDITION HANDLERS ---
  const handleAddSingleItem = () => {
    if (!currentItem.productId) return alert("Please select a raw material.");
    if (currentItem.quantity <= 0) return alert("Quantity must be greater than zero.");

    setOrderItems([...orderItems, { ...currentItem }]);
    setCurrentItem({ productId: '', quantity: 1, rate: 0 });
  };

  const handleRemoveOrderItem = (index) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  // --- SUBMIT COMPLETE PURCHASE ORDER ---
  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    if (!vendorId) return alert("Please select a vendor.");
    if (orderItems.length === 0) return alert("Please add at least one material to the order list.");

    try {
      const token = localStorage.getItem('erp_token');
      const res = await fetch('https://sms.uvtechsolutions.co.in/api/purchase-orders', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-access-token': token 
        },
        body: JSON.stringify({ vendorId, items: orderItems })
      });
      
      if (res.ok) {
        setVendorId('');
        setOrderItems([]);
        setViewMode('list');
        fetchData();
        alert("Purchase Order issued successfully!");
      } else {
        alert("Failed to generate Purchase Order.");
      }
    } catch (error) {
      console.error("Error submitting PO:", error);
    }
  };

  // PDF Generation Logic
  const generatePurchaseOrderPDF = async (order) => {
    try {
      const token = localStorage.getItem('erp_token');
      const res = await fetch(`https://sms.uvtechsolutions.co.in/api/purchase-orders/${order.PO_ID}/items`, {
        method: 'GET',
        headers: { 'x-access-token': token }
      });
      const orderItemsData = res.ok ? await res.json() : [];
      const orderItemsList = Array.isArray(orderItemsData) ? orderItemsData : [];

      const doc = new jsPDF();
      doc.setFontSize(22);
      doc.setTextColor(41, 128, 185);
      doc.text("TARWANI SOAPS", 105, 20, { align: "center" });
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text("Official Purchase Order", 105, 28, { align: "center" });
      doc.line(14, 32, 196, 32);

      doc.setFontSize(11);
      doc.setTextColor(40, 40, 40);
      doc.text(`Order Date: ${new Date(order.OrderDate).toLocaleDateString()}`, 14, 42);
      doc.text(`PO Number: ${order.PONumber}`, 14, 49);
      doc.text(`Vendor Name: ${order.VendorName}`, 14, 56);
      doc.text(`Status: ${order.Status}`, 14, 63);

      const tableRows = orderItemsList.length > 0 
        ? orderItemsList.map((item, index) => [
            (index + 1).toString(),
            item.ProductName,
            `${item.Quantity} Units`
          ])
        : [['-', 'Items pending database sync...', '-']];

      autoTable(doc, {
        startY: 72,
        headStyles: { fillColor: [41, 128, 185], textColor: [255, 255, 255] },
        head: [['S.No', 'Raw Material Description', 'Quantity']],
        body: tableRows,
        theme: 'grid',
      });

      const finalY = doc.lastAutoTable.finalY + 30;
      doc.setFontSize(10);
      doc.text("Authorized Purchasing Officer", 130, finalY);
      doc.line(125, finalY - 5, 190, finalY - 5);

      doc.save(`PurchaseOrder_${order.PONumber}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to load order items for PDF generation.");
    }
  };

  const filteredOrders = (purchaseOrders || []).filter(po => 
    po.PONumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    po.VendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    po.Status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
      
      {/* HEADER WITH TOGGLE BUTTONS */}
      <div className="p-5 border-b border-gray-200 bg-gray-50 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-800 uppercase tracking-wide">Purchase Orders Management</h2>
          <p className="text-sm text-gray-500 mt-1">Issue official POs to vendors for raw material procurement.</p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`flex-1 md:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-colors shadow-sm ${
              viewMode === 'list' ? 'bg-green-600 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
            }`}
          >
            📋 View List ({purchaseOrders.length})
          </button>
          <button
            type="button"
            onClick={() => setViewMode('create')}
            className={`flex-1 md:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-colors shadow-sm ${
              viewMode === 'create' ? 'bg-green-600 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
            }`}
          >
            ＋ Add New Order
          </button>
        </div>
      </div>

      {/* VIEW MODE: LIST VIEW */}
      {viewMode === 'list' && (
        <div>
          <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wide">Existing Purchase Orders</h3>
            <div className="relative w-full md:w-1/3">
              <input 
                type="text" 
                placeholder="Search by PO Number or Vendor..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-3 p-2 bg-white border border-gray-300 text-gray-900 rounded-lg shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="text-xs text-gray-700 uppercase bg-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 font-semibold">PO Number</th>
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold">Vendor</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Document</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredOrders.map((po) => (
                  <tr key={po.PO_ID} className="hover:bg-gray-50 bg-white">
                    <td className="px-6 py-4 font-bold text-green-600">{po.PONumber}</td>
                    <td className="px-6 py-4 text-gray-500">{new Date(po.OrderDate).toLocaleDateString()}</td>
                    <td className="px-6 py-4 font-bold text-gray-900">{po.VendorName}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${po.Status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}`}>
                        {po.Status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => generatePurchaseOrderPDF(po)}
                        className="px-3 py-1.5 bg-gray-800 hover:bg-gray-900 text-white text-xs font-bold rounded transition-colors inline-flex items-center gap-1 ml-auto"
                      >
                        <span>🖨️</span> PDF
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredOrders.length === 0 && (
                  <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-500">No purchase orders found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW MODE: ADD NEW FORM (Sequential Item Entry) */}
      {viewMode === 'create' && (
        <div className="p-5 md:p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-md font-bold text-gray-800 uppercase">Issue New Purchase Order</h3>
            <button
              type="button"
              onClick={() => setIsQuickAddOpen(!isQuickAddOpen)}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded shadow transition-colors"
            >
              {isQuickAddOpen ? '✕ Close Quick Add' : '+ Quick Add Vendor'}
            </button>
          </div>

          {/* INLINE QUICK ADD VENDOR FORM */}
          {isQuickAddOpen && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-6">
              <form onSubmit={handleQuickAddVendor} className="flex flex-col gap-3">
                <h4 className="text-xs font-bold text-green-900 uppercase">Instant Vendor Registration</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <input 
                    type="text" 
                    value={newVendorName} 
                    onChange={(e) => setNewVendorName(e.target.value)} 
                    placeholder="Vendor Name *" 
                    required
                    className="p-2 bg-white border border-gray-300 rounded text-sm text-gray-900"
                  />
                  <input 
                    type="text" 
                    value={newVendorPhone} 
                    onChange={(e) => setNewVendorPhone(e.target.value)} 
                    placeholder="Phone Number" 
                    className="p-2 bg-white border border-gray-300 rounded text-sm text-gray-900"
                  />
                  <input 
                    type="text" 
                    value={newVendorAddress} 
                    onChange={(e) => setNewVendorAddress(e.target.value)} 
                    placeholder="Address" 
                    className="p-2 bg-white border border-gray-300 rounded text-sm text-gray-900"
                  />
                  <input 
                    type="text" 
                    value={newVendorGst} 
                    onChange={(e) => setNewVendorGst(e.target.value)} 
                    placeholder="GST (Optional)" 
                    className="p-2 bg-white border border-gray-300 rounded text-sm text-gray-900"
                  />
                </div>
                <div className="flex justify-end">
                  <button type="submit" className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded shadow">
                    Save & Select Vendor
                  </button>
                </div>
              </form>
            </div>
          )}

          <form onSubmit={handleSubmitOrder}>
            {/* Vendor Selection */}
            <div className="mb-6">
              <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Select Vendor *</label>
              <Select
                options={vendorOptions}
                value={vendorOptions.find(opt => opt.value === vendorId) || null}
                onChange={(selected) => setVendorId(selected ? selected.value : '')}
                isSearchable
                isClearable
                placeholder="Search vendors..."
                className="w-full md:w-1/2 text-gray-900 text-sm"
                classNamePrefix="erp-select"
              />
            </div>

            {/* Sequential Material Adder Box */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6">
              <h4 className="text-xs font-bold text-gray-700 uppercase mb-3">Add Materials Required (One by One)</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-white p-3 rounded-lg border border-gray-200 shadow-sm mb-4">
                <div className="md:col-span-8 flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-400 uppercase">Raw Material</label>
                  <Select
                    options={productOptions}
                    value={productOptions.find(opt => opt.value === currentItem.productId) || null}
                    onChange={(selected) => setCurrentItem({ ...currentItem, productId: selected ? selected.value : '' })}
                    isSearchable
                    isClearable
                    placeholder="Search materials..."
                    className="text-gray-900 text-sm"
                    classNamePrefix="erp-select"
                  />
                </div>

                <div className="md:col-span-2 flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-400 uppercase">Quantity</label>
                  <input 
                    type="number" min="1"
                    value={currentItem.quantity} 
                    onChange={(e) => setCurrentItem({ ...currentItem, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="p-2 bg-gray-50 border border-gray-300 text-gray-900 rounded-md text-sm"
                  />
                </div>

                <div className="md:col-span-2">
                  <button 
                    type="button" 
                    onClick={handleAddSingleItem}
                    className="w-full py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-md text-xs shadow transition-colors"
                  >
                    + Add to List
                  </button>
                </div>
              </div>

              {/* Added Materials Grid Table */}
              <div className="overflow-x-auto bg-white rounded border border-gray-200">
                <table className="w-full text-left text-xs text-gray-700">
                  <thead className="bg-gray-100 uppercase border-b border-gray-200">
                    <tr>
                      <th className="p-2.5">Raw Material Description</th>
                      <th className="p-2.5">Quantity</th>
                      <th className="p-2.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {orderItems.map((it, idx) => {
                      const prodObj = products.find(p => String(p.ProductID) === String(it.productId));
                      return (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="p-2.5 font-semibold">{prodObj ? prodObj.ProductName : 'Unknown Material'}</td>
                          <td className="p-2.5 font-mono">{it.quantity} Units</td>
                          <td className="p-2.5 text-center">
                            <button 
                              type="button" 
                              onClick={() => handleRemoveOrderItem(idx)}
                              className="text-red-600 hover:text-red-800 font-bold underline"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {orderItems.length === 0 && (
                      <tr><td colSpan="3" className="p-4 text-center text-gray-400 font-medium">No materials added to order yet. Use the fields above to add items sequentially.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={orderItems.length === 0}
              className="w-full py-3.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold rounded-xl shadow transition-colors text-base"
            >
              Issue Purchase Order ({orderItems.length} Materials)
            </button>
          </form>
        </div>
      )}
    </div>
  );
}