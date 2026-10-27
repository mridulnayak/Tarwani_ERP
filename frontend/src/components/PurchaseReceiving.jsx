import { useState, useEffect } from 'react';

export default function PurchaseReceiving() {
  const [pendingPOs, setPendingPOs] = useState([]);
  const [products, setProducts] = useState([]);
  const [tanks, setTanks] = useState([]);

  // Form State
  const [poId, setPoId] = useState('');
  const [productId, setProductId] = useState('');
  const [tankId, setTankId] = useState('');
  const [receivedQty, setReceivedQty] = useState('');
  const [receivedBy, setReceivedBy] = useState('');

  const fetchData = async () => {
    try {
      const poRes = await fetch('http://localhost:5000/api/purchase-orders');
      const poData = await poRes.json();
      setPendingPOs(poData.filter(po => po.Status === 'Pending'));

      const prodRes = await fetch('http://localhost:5000/api/products');
      setProducts(await prodRes.json());

      const tankRes = await fetch('http://localhost:5000/api/tanks');
      setTanks(await tankRes.json());
    } catch (error) {
      console.error("Error fetching receiving data:", error);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!poId || !productId || !tankId || !receivedQty) {
      return alert("Please select PO, Product, Tank, and enter Quantity.");
    }

    try {
      const res = await fetch('http://localhost:5000/api/purchase-receiving', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          poId, 
          productId, 
          tankId, 
          receivedQty: parseInt(receivedQty), 
          receivedBy 
        })
      });
      
      if (res.ok) {
        alert("Stock Successfully Received and Tank Updated!");
        setPoId('');
        setProductId('');
        setTankId('');
        setReceivedQty('');
        setReceivedBy('');
        fetchData(); 
      } else {
        alert("Failed to process receiving.");
      }
    } catch (error) {
      console.error("Error saving receipt:", error);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
      {/* HEADER */}
      <div className="p-5 border-b border-gray-200 bg-gray-50">
        <h2 className="text-lg font-bold text-gray-800 uppercase tracking-wide">Purchase Receiving & Allocation</h2>
      </div>
      
      <form onSubmit={handleSubmit} className="p-5 md:p-6">
        
        {/* ROW 1: PO & Product Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500 uppercase">Link to Purchase Order</label>
            <select 
              value={poId} 
              onChange={(e) => setPoId(e.target.value)} 
              className="w-full p-3 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="" disabled>-- Select Pending PO --</option>
              {pendingPOs.map(po => (
                <option key={po.PO_ID} value={po.PO_ID}>{po.PONumber} ({po.VendorName})</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500 uppercase">Received Product</label>
            <select 
              value={productId} 
              onChange={(e) => setProductId(e.target.value)} 
              className="w-full p-3 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="" disabled>-- Select Product --</option>
              {products.map(p => (
                <option key={p.ProductID} value={p.ProductID}>{p.ProductName}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ROW 2: Destination, Quantity, Receiver */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-6 bg-gray-50 p-4 border border-gray-200 rounded-xl">
          <div className="flex flex-col gap-1 md:col-span-2">
            <label className="text-xs font-semibold text-gray-500 uppercase">Destination Tank</label>
            <select 
              value={tankId} 
              onChange={(e) => setTankId(e.target.value)} 
              className="w-full p-3 bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-blue-500 focus:border-blue-500 shadow-sm"
            >
              <option value="" disabled>-- Select Storage Tank --</option>
              {tanks.map(t => (
                <option key={t.TankID} value={t.TankID}>{t.TankName} (Current: {t.CurrentStock} | Max: {t.Capacity})</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1 md:col-span-1">
            <label className="text-xs font-semibold text-gray-500 uppercase">Qty Received</label>
            <input 
              type="number" min="1" 
              value={receivedQty} 
              onChange={(e) => setReceivedQty(e.target.value)} 
              placeholder="e.g., 500" 
              className="w-full p-3 bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-blue-500 focus:border-blue-500 shadow-sm" 
            />
          </div>

          <div className="flex flex-col gap-1 md:col-span-1">
            <label className="text-xs font-semibold text-gray-500 uppercase">Received By</label>
            <input 
              type="text" 
              value={receivedBy} 
              onChange={(e) => setReceivedBy(e.target.value)} 
              placeholder="Admin Name" 
              className="w-full p-3 bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-blue-500 focus:border-blue-500 shadow-sm" 
            />
          </div>
        </div>

        <button 
          type="submit" 
          className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-sm transition-colors text-lg focus:ring-4 focus:ring-green-300"
        >
          Confirm Receipt & Update Inventory
        </button>
      </form>
    </div>
  );
}