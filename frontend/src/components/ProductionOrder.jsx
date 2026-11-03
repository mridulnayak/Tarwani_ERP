import { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function ProductionOrder({ user }) {
  const [products, setProducts] = useState([]);
  const [productionOrders, setProductionOrders] = useState([]);

  // Form State
  const [productId, setProductId] = useState('');
  const [targetQuantity, setTargetQuantity] = useState(1);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormVisible, setIsFormVisible] = useState(false);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('erp_token');
      
      // Fetch Products
      const prodRes = await fetch('https://sms.uvtechsolutions.co.in/api/products', {
        method: 'GET',
        headers: { 'x-access-token': token }
      });
      const prodData = await prodRes.json();
      setProducts(Array.isArray(prodData) ? prodData : []);

      // Fetch Production Orders
      const poRes = await fetch('https://sms.uvtechsolutions.co.in/api/production-orders', {
        method: 'GET',
        headers: { 'x-access-token': token }
      });
      const poData = await poRes.json();
      setProductionOrders(Array.isArray(poData) ? poData : []);
    } catch (error) {
      console.error("Error fetching production data:", error);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!productId || targetQuantity <= 0) {
      return alert("Please select a valid product and enter a target quantity.");
    }

    try {
      const token = localStorage.getItem('erp_token');
      const res = await fetch('https://sms.uvtechsolutions.co.in/api/production-orders', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-access-token': token 
        },
        body: JSON.stringify({ 
          productId: parseInt(productId), 
          targetQuantity: parseInt(targetQuantity) 
        })
      });
      
      if (res.ok) {
        setProductId('');
        setTargetQuantity(1);
        setIsFormVisible(false);
        fetchData(); 
      } else {
        const err = await res.json();
        alert(`Failed to generate Production Order: ${err.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Error submitting production order:", error);
    }
  };

  const generateProductionPDF = (order) => {
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.setTextColor(41, 128, 185);
    doc.text("TARWANI SOAPS", 105, 20, { align: "center" });
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text("Factory Production Target Sheet", 105, 28, { align: "center" });
    doc.line(14, 32, 196, 32);

    doc.setFontSize(11);
    doc.setTextColor(40, 40, 40);
    doc.text(`Order Date: ${new Date(order.OrderDate || Date.now()).toLocaleDateString()}`, 14, 42);
    doc.text(`Production Order No: ${order.OrderNo}`, 14, 49);
    doc.text(`Status: ${order.Status || 'Pending'}`, 14, 56);

    autoTable(doc, {
      startY: 65,
      headStyles: { fillColor: [41, 128, 185], textColor: [255, 255, 255] },
      head: [['S.No', 'Product Description', 'Target Quantity']],
      body: [[ '1', order.ProductName || 'Finished Good', `${order.TargetQuantity || 0} Units` ]],
      theme: 'grid',
    });

    const finalY = doc.lastAutoTable.finalY + 30;
    doc.setFontSize(10);
    doc.text("Plant Manager Signature", 130, finalY);
    doc.line(125, finalY - 5, 190, finalY - 5);

    doc.save(`ProductionOrder_${order.OrderNo}.pdf`);
  };

  const filteredOrders = (productionOrders || []).filter(po => 
    (po.OrderNo && po.OrderNo.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (po.ProductName && po.ProductName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (po.Status && po.Status.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="bg-white rounded-md shadow-md border border-gray-300 overflow-hidden mb-8">
      
      {/* ENTERPRISE TOOLBAR */}
      <div className="p-4 border-b border-gray-300 bg-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-xl font-extrabold text-gray-800 uppercase tracking-wider">
          Production Orders Master
        </h2>
        
        <div className="flex w-full md:w-auto gap-3">
          <input
            type="search"
            placeholder="Search production orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-64 p-2 bg-white border border-gray-400 text-gray-900 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-sm"
          />
          {!isFormVisible && (
            <button
              type="button"
              onClick={() => setIsFormVisible(true)}
              className="whitespace-nowrap px-5 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded shadow-sm transition-colors"
            >
              + Create New Order
            </button>
          )}
        </div>
      </div>

      {/* DATA ENTRY FORM (Hidden by Default) */}
      {isFormVisible && (
        <div className="p-5 bg-blue-50 border-b border-blue-200">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <h3 className="text-md font-bold text-gray-800 uppercase">New Production Target</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1 md:col-span-2">
                <label className="text-xs font-bold text-gray-700 uppercase">Product / Finish Good</label>
                <select 
                  value={productId} 
                  onChange={(e) => setProductId(e.target.value)}
                  className="w-full p-2 bg-white border border-gray-400 text-gray-900 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="" disabled>-- Select Product --</option>
                  {(products || []).map(p => (
                    <option key={p.ProductID} value={p.ProductID}>
                      {p.ProductName} (Stock: {p.ClosingBalance || 0})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-700 uppercase">Target Quantity</label>
                <input 
                  type="number" min="1"
                  value={targetQuantity} 
                  onChange={(e) => setTargetQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full p-2 bg-white border border-gray-400 text-gray-900 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button 
                type="submit" 
                className="px-8 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded shadow-sm transition-colors"
              >
                Issue Order
              </button>
              <button 
                type="button" 
                onClick={() => setIsFormVisible(false)}
                className="px-6 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DENSE TABULAR DATA DISPLAY */}
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-800 min-w-[700px]">
          <thead className="text-xs uppercase bg-slate-700 text-white">
            <tr>
              <th className="px-4 py-3 font-bold border-r border-slate-600">Order No</th>
              <th className="px-4 py-3 font-bold border-r border-slate-600">Date</th>
              <th className="px-4 py-3 font-bold border-r border-slate-600">Product</th>
              <th className="px-4 py-3 font-bold border-r border-slate-600 text-right">Target Qty</th>
              <th className="px-4 py-3 font-bold border-r border-slate-600">Status</th>
              <th className="px-4 py-3 font-bold text-center w-28">Document</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300">
            {filteredOrders.map((po) => (
              <tr key={po.ProductionOrderID} className="bg-white even:bg-gray-100 hover:bg-yellow-50 transition-colors">
                <td className="px-4 py-2 font-mono font-bold text-blue-600 border-r border-gray-200">
                  {po.OrderNo}
                </td>
                <td className="px-4 py-2 text-gray-600 border-r border-gray-200">
                  {new Date(po.OrderDate).toLocaleDateString()}
                </td>
                <td className="px-4 py-2 font-semibold text-gray-900 border-r border-gray-200">
                  {po.ProductName}
                </td>
                <td className="px-4 py-2 font-mono font-bold text-right text-gray-800 border-r border-gray-200">
                  {po.TargetQuantity} Units
                </td>
                <td className="px-4 py-2 border-r border-gray-200">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${po.Status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {po.Status}
                  </span>
                </td>
                <td className="px-4 py-2 text-center">
                  <button 
                    type="button"
                    onClick={() => generateProductionPDF(po)}
                    className="font-bold text-blue-600 hover:text-blue-800 underline text-xs"
                  >
                    Print PDF
                  </button>
                </td>
              </tr>
            ))}
            {filteredOrders.length === 0 && (
              <tr>
                <td colSpan="6" className="px-4 py-8 text-center text-gray-500 font-medium">
                  No production orders found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}