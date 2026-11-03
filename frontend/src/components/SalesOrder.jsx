import { useState, useEffect } from 'react';
import Select from 'react-select';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function SalesOrder({ user }) {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [salesOrders, setSalesOrders] = useState([]);

  // Form State
  const [customerId, setCustomerId] = useState('');
  const [items, setItems] = useState([{ productId: '', quantity: 1, rate: 0 }]);
  
  // Inline Quick-Add Customer State
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [newCustGst, setNewCustGst] = useState('');

  // Enterprise Features
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('erp_token');
      const partyRes = await fetch('https://sms.uvtechsolutions.co.in/api/parties', {
        method: 'GET',
        headers: { 'x-access-token': token }
      });
      const partyData = await partyRes.json();
      setCustomers(Array.isArray(partyData) ? partyData.filter(p => p.PartyType === 'Customer') : []);

      const prodRes = await fetch('https://sms.uvtechsolutions.co.in/api/products', {
        method: 'GET',
        headers: { 'x-access-token': token }
      });
      const prodData = await prodRes.json();
      setProducts(Array.isArray(prodData) ? prodData : []);

      const soRes = await fetch('https://sms.uvtechsolutions.co.in/api/sales-orders', {
        method: 'GET',
        headers: { 'x-access-token': token }
      });
      const soData = await soRes.json();
      setSalesOrders(Array.isArray(soData) ? soData : []);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const customerOptions = customers.map(c => ({
    value: String(c.PartyID),
    label: c.PartyName
  }));
  const productOptions = products.map(p => ({
    value: String(p.ProductID),
    label: `${p.ProductName} (Stock: ${p.ClosingBalance || 0})`
  }));

  // --- QUICK ADD CUSTOMER HANDLER ---
  const handleQuickAddCustomer = async (e) => {
    e.preventDefault();
    if (!newCustName) return alert("Please enter Customer Name.");

    try {
      const token = localStorage.getItem('erp_token');
      const res = await fetch('https://sms.uvtechsolutions.co.in/api/parties', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-access-token': token 
        },
        body: JSON.stringify({ 
          partyName: newCustName, 
          partyType: 'Customer', 
          phone: newCustPhone, 
          address: newCustAddress, 
          gstNumber: newCustGst 
        })
      });

      if (res.ok) {
        // Clear quick-add form & close modal
        setNewCustName('');
        setNewCustPhone('');
        setNewCustAddress('');
        setNewCustGst('');
        setIsQuickAddOpen(false);
        
        // Refresh customer list to pick up the new ID
        await fetchData();
        alert("Customer created successfully!");
      } else {
        const errData = await res.json();
        alert(`Failed to create customer: ${errData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Error creating quick-add customer:", error);
      alert("Network error while creating customer.");
    }
  };

  // --- DYNAMIC ROW HANDLERS ---
  const handleAddItem = () => setItems([...items, { productId: '', quantity: 1, rate: 0 }]);
  const handleRemoveItem = (index) => setItems((items || []).filter((_, i) => i !== index));
  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  // --- PDF GENERATION LOGIC ---
  const generateOrderAcknowledgment = async (order) => {
    try {
      const token = localStorage.getItem('erp_token');
      const res = await fetch(`https://sms.uvtechsolutions.co.in/api/sales-orders/${order.SO_ID}/items`, {
        method: 'GET',
        headers: { 'x-access-token': token }
      });
      const orderItemsData = res.ok ? await res.json() : [];
      const orderItems = Array.isArray(orderItemsData) ? orderItemsData : [];

      const doc = new jsPDF();
      
      // 1. Company Header
      doc.setFontSize(22);
      doc.setTextColor(41, 128, 185);
      doc.text("TARWANI SOAPS", 105, 20, { align: "center" });
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text("Sales Order Acknowledgment", 105, 28, { align: "center" });
      doc.line(14, 32, 196, 32);

      // 2. Order Metadata
      doc.setFontSize(11);
      doc.setTextColor(40, 40, 40);
      doc.text(`Order Date: ${new Date(order.OrderDate).toLocaleDateString()}`, 14, 42);
      doc.text(`Sales Order No: ${order.SONumber}`, 14, 49);
      doc.text(`Customer Name: ${order.CustomerName}`, 14, 56);
      doc.text(`Current Status: ${order.Status}`, 14, 63);

      // 3. Items Table
      const tableRows = orderItems.length > 0 
        ? (orderItems || []).map((item, index) => [
            (index + 1).toString(),
            item.ProductName,
            `${item.Quantity} Units`,
            `Rs. ${item.Rate.toFixed(2)}`,
            `Rs. ${(item.Quantity * item.Rate).toFixed(2)}`
          ])
        : [['-', 'Items pending database sync...', '-', '-', '-']];

      autoTable(doc, {
        startY: 72,
        headStyles: { fillColor: [41, 128, 185], textColor: [255, 255, 255] },
        head: [['S.No', 'Product Description', 'Quantity', 'Unit Rate', 'Total Amount']],
        body: tableRows,
        theme: 'grid',
      });

      // 4. Footer
      const finalY = doc.lastAutoTable.finalY + 30;
      doc.setFontSize(10);
      doc.text("Authorized Signatory", 140, finalY);
      doc.line(130, finalY - 5, 180, finalY - 5);

      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text("Generated by Tarwani Soaps ERP System", 105, 285, { align: "center" });

      doc.save(`SO_Acknowledgment_${order.SONumber}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to load order items for PDF generation.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customerId) return alert("Please select a customer.");
    
    const invalidItem = items.find(item => !item.productId || item.quantity <= 0);
    if (invalidItem) return alert("Please select a product and enter a valid quantity for all rows.");

    try {
      const token = localStorage.getItem('erp_token');
      const res = await fetch('https://sms.uvtechsolutions.co.in/api/sales-orders', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-access-token': token 
        },
        body: JSON.stringify({ customerId, items })
      });
      
      if (res.ok) {
        setCustomerId('');
        setItems([{ productId: '', quantity: 1, rate: 0 }]); 
        fetchData(); 
      } else {
        alert("Failed to generate Sales Order.");
      }
    } catch (error) {
      console.error("Error submitting SO:", error);
    }
  };

  // Filter Sales Orders based on search term
  const filteredOrders = (salesOrders || []).filter(so =>
    so.SONumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    so.CustomerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    so.Status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
      
      {/* HEADER */}
      <div className="p-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-gray-800 uppercase tracking-wide">Generate Sales Order</h2>
          <p className="text-sm text-gray-500 mt-1">Record client orders, assign selling rates, and track fulfillment status.</p>
        </div>
        <button
          type="button"
          onClick={() => setIsQuickAddOpen(!isQuickAddOpen)}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg shadow transition-colors"
        >
          {isQuickAddOpen ? '✕ Close Quick Add' : '+ Quick Add Customer'}
        </button>
      </div>

      {/* INLINE QUICK ADD CUSTOMER FORM */}
      {isQuickAddOpen && (
        <div className="p-5 bg-green-50 border-b border-green-200">
          <form onSubmit={handleQuickAddCustomer} className="flex flex-col gap-4">
            <h3 className="text-sm font-bold text-green-900 uppercase">Instant Customer Registration</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 uppercase block mb-1">Customer Name *</label>
                <input 
                  type="text" 
                  value={newCustName} 
                  onChange={(e) => setNewCustName(e.target.value)} 
                  placeholder="Enter name..." 
                  required
                  className="w-full p-2 bg-white border border-gray-300 rounded text-sm text-gray-900"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 uppercase block mb-1">Contact Number</label>
                <input 
                  type="text" 
                  value={newCustPhone} 
                  onChange={(e) => setNewCustPhone(e.target.value)} 
                  placeholder="Phone..." 
                  className="w-full p-2 bg-white border border-gray-300 rounded text-sm text-gray-900"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 uppercase block mb-1">Address</label>
                <input 
                  type="text" 
                  value={newCustAddress} 
                  onChange={(e) => setNewCustAddress(e.target.value)} 
                  placeholder="Address..." 
                  className="w-full p-2 bg-white border border-gray-300 rounded text-sm text-gray-900"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 uppercase block mb-1">GST Number</label>
                <input 
                  type="text" 
                  value={newCustGst} 
                  onChange={(e) => setNewCustGst(e.target.value)} 
                  placeholder="GST (Optional)..." 
                  className="w-full p-2 bg-white border border-gray-300 rounded text-sm text-gray-900"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button 
                type="submit" 
                className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded shadow transition-colors"
              >
                Save & Select Customer
              </button>
            </div>
          </form>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="p-5 md:p-6">
        {/* HEADER: Customer Selection */}
        <div className="mb-6">
          <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Select Customer</label>
          <Select
            options={customerOptions}
            value={customerOptions.find(opt => opt.value === customerId) || null}
            onChange={(selected) => setCustomerId(selected ? selected.value : '')}
            isSearchable
            isClearable
            placeholder="Search customers..."
            className="w-full md:w-1/2 text-gray-900 text-sm"
            classNamePrefix="erp-select"
          />
        </div>

        {/* DETAILS: Dynamic Product Rows */}
        <div className="bg-gray-50 p-4 md:p-5 rounded-xl border border-gray-200 mb-6">
          <h3 className="text-md font-bold text-gray-800 uppercase mb-4">Order Items</h3>
          
          {(items || []).map((item, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-white p-4 rounded-lg border border-gray-100 shadow-sm mb-3">
              <div className="md:col-span-5 flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-400 uppercase">Product</label>
                <Select
                  options={productOptions}
                  value={productOptions.find(opt => opt.value === item.productId) || null}
                  onChange={(selected) => handleItemChange(index, 'productId', selected ? selected.value : '')}
                  isSearchable
                  isClearable
                  placeholder="Search products..."
                  className="w-full text-gray-900 text-sm"
                  classNamePrefix="erp-select"
                />
              </div>

              <div className="md:col-span-3 flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-400 uppercase">Quantity</label>
                <input 
                  type="number" min="1"
                  value={item.quantity} 
                  onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                  placeholder="Qty"
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 text-gray-900 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>

              <div className="md:col-span-3 flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-400 uppercase">Selling Rate (₹)</label>
                <input 
                  type="number" step="0.01" min="0"
                  value={item.rate} 
                  onChange={(e) => handleItemChange(index, 'rate', parseFloat(e.target.value) || 0)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 text-gray-900 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>

              <div className="md:col-span-1">
                {items.length > 1 && (
                  <button 
                    type="button" 
                    onClick={() => handleRemoveItem(index)}
                    className="w-full p-2.5 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-md transition-colors text-sm"
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
            + Add Another Item
          </button>
        </div>

        <button 
          type="submit" 
          className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition-colors text-lg focus:ring-4 focus:ring-blue-300"
        >
          Generate Sales Order
        </button>
      </form>

      {/* RECENT SALES ORDERS SECTION */}
      <div className="border-t border-gray-200">
        
        {/* GLOBAL SEARCH BAR */}
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wide">Recent Sales Orders</h3>
          <div className="relative w-full md:w-1/3">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <span className="text-gray-400">🔍</span>
            </div>
            <input 
              type="text" 
              placeholder="Search by SO Number or Customer..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 p-2 bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-blue-500 focus:border-blue-500 shadow-sm text-sm"
            />
          </div>
        </div>

        {/* MOBILE VIEW: Cards */}
        <div className="md:hidden divide-y divide-gray-200">
          {(filteredOrders || []).map((so) => (
            <div key={so.SO_ID} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <span className="font-bold text-blue-600">{so.SONumber}</span>
                <span className={`px-2 py-1 rounded-full text-xs font-bold ${so.Status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                  {so.Status}
                </span>
              </div>
              <div className="text-sm text-gray-600 mb-4">
                <p>👤 Customer: <span className="font-semibold text-gray-800">{so.CustomerName}</span></p>
                <p>📅 Date: {new Date(so.OrderDate).toLocaleDateString()}</p>
              </div>
              <button 
                onClick={() => generateOrderAcknowledgment(so)}
                className="w-full py-2 bg-gray-800 text-white text-xs font-bold rounded flex items-center justify-center gap-2 hover:bg-gray-900"
              >
                <span>🖨️</span> Print Acknowledgment
              </button>
            </div>
          ))}
          {filteredOrders.length === 0 && (
            <div className="p-6 text-center text-gray-500">No sales orders found.</div>
          )}
        </div>

        {/* DESKTOP VIEW: Table */}
        <div className="hidden md:block w-full overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="text-xs text-gray-700 uppercase bg-gray-100 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-semibold">SO Number</th>
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold">Customer</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Document</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {(filteredOrders || []).map((so) => (
                <tr key={so.SO_ID} className="hover:bg-gray-50 bg-white">
                  <td className="px-6 py-4 font-bold text-blue-600">{so.SONumber}</td>
                  <td className="px-6 py-4 text-gray-500">{new Date(so.OrderDate).toLocaleDateString()}</td>
                  <td className="px-6 py-4 font-bold text-gray-900">{so.CustomerName}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${so.Status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                      {so.Status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => generateOrderAcknowledgment(so)}
                      className="px-3 py-1.5 bg-gray-800 hover:bg-gray-900 text-white text-xs font-bold rounded transition-colors flex items-center gap-1 ml-auto"
                    >
                      <span>🖨️</span> PDF
                    </button>
                  </td>
                </tr>
              ))}
              {filteredOrders.length === 0 && (
                <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-500">No sales orders found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}