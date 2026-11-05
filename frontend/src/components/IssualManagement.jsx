import { useState, useEffect } from 'react';
import Select from 'react-select';
import { API_BASE_URL } from '../config';

export default function IssualManagement({ user }) {
  const [products, setProducts] = useState([]);
  const [issuances, setIssuances] = useState([]);

  // View Mode: 'list' or 'create'
  const [viewMode, setViewMode] = useState('list');

  // Form State
  const [department, setDepartment] = useState('Production Floor');
  const [currentItem, setCurrentItem] = useState({ productId: '', quantity: 1 });
  const [issuedItems, setIssuedItems] = useState([]);

  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('erp_token');
      const prodRes = await fetch(`${API_BASE_URL}/products`, {
        headers: { 'x-access-token': token }
      });
      const prodData = prodRes.ok ? await prodRes.json() : [];
      setProducts(Array.isArray(prodData) ? prodData : []);

      const issRes = await fetch(`${API_BASE_URL}/stock-issuances`, {
        headers: { 'x-access-token': token }
      });
      const issData = issRes.ok ? await issRes.json() : [];
      setIssuances(Array.isArray(issData) ? issData : []);
    } catch (error) {
      console.error("Error fetching issual data:", error);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const productOptions = products.map(p => ({
    value: String(p.ProductID),
    label: `${p.ProductName} (Stock Available: ${p.ClosingBalance || 0})`
  }));

  const departmentOptions = [
    { value: 'Production Floor', label: 'Production Floor' },
    { value: 'Packaging', label: 'Packaging Unit' },
    { value: 'Quality Control', label: 'Quality Control' }
  ];

  const handleAddIssuedItem = () => {
    if (!currentItem.productId) return alert("Please select a raw material.");
    if (currentItem.quantity <= 0) return alert("Quantity must be greater than zero.");

    setIssuedItems([...issuedItems, { ...currentItem }]);
    setCurrentItem({ productId: '', quantity: 1 });
  };

  const handleRemoveIssuedItem = (index) => {
    setIssuedItems(issuedItems.filter((_, i) => i !== index));
  };

  const handleSubmitIssual = async (e) => {
    e.preventDefault();
    if (issuedItems.length === 0) return alert("Please add at least one material to issue.");

    try {
      const token = localStorage.getItem('erp_token');
      const res = await fetch(`${API_BASE_URL}/stock-issuances`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-access-token': token 
        },
        body: JSON.stringify({ department, items: issuedItems })
      });

      if (res.ok) {
        setIssuedItems([]);
        setViewMode('list');
        fetchData();
        alert("Stock issued successfully to the floor!");
      } else {
        alert("Failed to issue stock.");
      }
    } catch (error) {
      console.error("Error submitting stock issual:", error);
    }
  };

  const filteredIssuances = (issuances || []).filter(i => 
    (i.IssualNo && i.IssualNo.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (i.Department && i.Department.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
      
      {/* HEADER WITH TOGGLE BUTTONS */}
      <div className="p-5 border-b border-gray-200 bg-gray-50 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-800 uppercase tracking-wide">Physical Stock Issual</h2>
          <p className="text-sm text-gray-500 mt-1">Issue raw materials and packaging supplies from store to the factory floor.</p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`flex-1 md:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-colors shadow-sm ${
              viewMode === 'list' ? 'bg-purple-600 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
            }`}
          >
            📋 View List ({issuances.length})
          </button>
          <button
            type="button"
            onClick={() => setViewMode('create')}
            className={`flex-1 md:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-colors shadow-sm ${
              viewMode === 'create' ? 'bg-purple-600 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
            }`}
          >
            ＋ Issue New Stock
          </button>
        </div>
      </div>

      {/* VIEW MODE: LIST */}
      {viewMode === 'list' && (
        <div>
          <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wide">Issuance History</h3>
            <input 
              type="text" 
              placeholder="Search issuances..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full md:w-1/3 p-2 bg-white border border-gray-300 rounded-lg text-sm"
            />
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="text-xs text-gray-700 uppercase bg-gray-100 border-b">
                <tr>
                  <th className="px-6 py-4 font-semibold">Issual No</th>
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold">Department</th>
                  <th className="px-6 py-4 font-semibold text-right">Items Issued</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredIssuances.map((iss, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 bg-white">
                    <td className="px-6 py-4 font-bold text-purple-600">{iss.IssualNo || `ISS-${idx+1}`}</td>
                    <td className="px-6 py-4 text-gray-500">{new Date(iss.IssualDate || Date.now()).toLocaleDateString()}</td>
                    <td className="px-6 py-4 font-bold text-gray-900">{iss.Department || 'Production Floor'}</td>
                    <td className="px-6 py-4 font-mono text-right">{iss.TotalItems || 1} Materials</td>
                  </tr>
                ))}
                {filteredIssuances.length === 0 && (
                  <tr><td colSpan="4" className="px-6 py-8 text-center text-gray-500">No stock issuances found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW MODE: CREATE FORM */}
      {viewMode === 'create' && (
        <form onSubmit={handleSubmitIssual} className="p-5 md:p-6">
          <div className="mb-6">
            <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Target Department *</label>
            <Select
              options={departmentOptions}
              value={departmentOptions.find(opt => opt.value === department) || departmentOptions[0]}
              onChange={(selected) => setDepartment(selected ? selected.value : 'Production Floor')}
              isSearchable={false}
              className="w-full md:w-1/2 text-gray-900 text-sm"
              classNamePrefix="erp-select"
            />
          </div>

          {/* Sequential Material Issual Box */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6">
            <h4 className="text-xs font-bold text-gray-700 uppercase mb-3">Add Materials to Issue (Sequential)</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-white p-3 rounded-lg border border-gray-200 shadow-sm mb-4">
              <div className="md:col-span-8 flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-400 uppercase">Raw Material</label>
                <Select
                  options={productOptions}
                  value={productOptions.find(opt => opt.value === currentItem.productId) || null}
                  onChange={(selected) => setCurrentItem({ ...currentItem, productId: selected ? selected.value : '' })}
                  isSearchable
                  isClearable
                  placeholder="Search raw materials..."
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
                  className="p-2 bg-gray-50 border border-gray-300 rounded text-sm"
                />
              </div>

              <div className="md:col-span-2">
                <button 
                  type="button" 
                  onClick={handleAddIssuedItem}
                  className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded text-xs shadow"
                >
                  + Add Item
                </button>
              </div>
            </div>

            {/* Issued Items Table */}
            <div className="overflow-x-auto bg-white rounded border border-gray-200">
              <table className="w-full text-left text-xs text-gray-700">
                <thead className="bg-gray-100 uppercase border-b">
                  <tr>
                    <th className="p-2.5">Raw Material Description</th>
                    <th className="p-2.5">Quantity to Issue</th>
                    <th className="p-2.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {issuedItems.map((it, idx) => {
                    const pObj = products.find(p => String(p.ProductID) === String(it.productId));
                    return (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="p-2.5 font-semibold">{pObj ? pObj.ProductName : 'Material'}</td>
                        <td className="p-2.5 font-mono">{it.quantity} Units</td>
                        <td className="p-2.5 text-center">
                          <button type="button" onClick={() => handleRemoveIssuedItem(idx)} className="text-red-600 underline font-bold">Remove</button>
                        </td>
                      </tr>
                    );
                  })}
                  {issuedItems.length === 0 && (
                    <tr><td colSpan="3" className="p-4 text-center text-gray-400">No materials added for issual yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={issuedItems.length === 0}
            className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-bold rounded-xl shadow text-base"
          >
            Confirm & Issue Stock ({issuedItems.length} Materials)
          </button>
        </form>
      )}
    </div>
  );
}