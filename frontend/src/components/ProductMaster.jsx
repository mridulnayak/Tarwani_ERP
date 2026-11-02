import { useState, useEffect } from 'react';
import Select from 'react-select';

export default function ProductMaster({ user }) {
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  
  // Form State (Upgraded with new business fields)
  const [productName, setProductName] = useState('');
  const [brandId, setBrandId] = useState(null);
  const [materialType, setMaterialType] = useState('Finished Good');
  const [itemState, setItemState] = useState('Solid');
  const [unitOfMeasure, setUnitOfMeasure] = useState('Pcs');
  
  // Enterprise Features State
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [isFormVisible, setIsFormVisible] = useState(false);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('erp_token');
      const pRes = await fetch('https://sms.uvtechsolutions.co.in/api/products', {
        method: 'GET',
        headers: { 'x-access-token': token }
      });
      if (!pRes.ok) throw new Error(`Products API Error: ${pRes.status}`);
      const pData = await pRes.json();
      setProducts(Array.isArray(pData) ? pData : []);
    } catch (error) {
      console.error("Error fetching products:", error);
      setProducts([]);
    }

    try {
      const token = localStorage.getItem('erp_token');
      const bRes = await fetch('https://sms.uvtechsolutions.co.in/api/brands', {
        method: 'GET',
        headers: { 'x-access-token': token }
      });
      if (!bRes.ok) throw new Error(`Brands API Error: ${bRes.status}`);
      const bData = await bRes.json();
      setBrands(Array.isArray(bData) ? bData : []);
    } catch (error) {
      console.error("Error fetching brands:", error);
      setBrands([]);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const brandOptions = brands.map(b => ({
    value: b.BrandID,
    label: b.BrandName
  }));

  const selectedBrandOption = brandOptions.find(opt => opt.value === brandId) || null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!productName || !brandId) return alert("Select a brand and enter a product name");
    
    const method = 'POST';
    const url = editingId 
      ? `https://sms.uvtechsolutions.co.in/api/products/edit/${editingId}`
      : 'https://sms.uvtechsolutions.co.in/api/products';

    try {
      const token = localStorage.getItem('erp_token');
      const res = await fetch(url, {
        method: method,
        headers: { 
          'Content-Type': 'application/json',
          'x-access-token': token 
        },
        // Payload now includes the new inventory routing fields
        body: JSON.stringify({ 
          productName, 
          brandId, 
          materialType, 
          itemState, 
          unitOfMeasure 
        })
      });
      
      if (res.ok) { 
        cancelEdit();
        fetchData(); 
      } else {
        alert("Failed to save product.");
      }
    } catch (error) {
      console.error("Error saving product:", error);
    }
  };

  const handleEdit = (product) => {
    setProductName(product.ProductName);
    setBrandId(product.BrandID);
    setMaterialType(product.MaterialType || 'Finished Good');
    setItemState(product.ItemState || 'Solid');
    setUnitOfMeasure(product.UnitOfMeasure || 'Pcs');
    setEditingId(product.ProductID);
    setIsFormVisible(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this product? This action cannot be undone.")) return;

    try {
      const token = localStorage.getItem('erp_token');
      const res = await fetch(`https://sms.uvtechsolutions.co.in/api/products/delete/${id}`, {
        method: 'POST',
        headers: { 'x-access-token': token }
      });
      if (res.ok) {
        fetchData();
      } else {
        alert("Failed to delete. Product might be in use.");
      }
    } catch (error) {
      console.error("Error deleting product:", error);
    }
  };

  const cancelEdit = () => {
    setProductName('');
    setBrandId(null);
    setMaterialType('Finished Good');
    setItemState('Solid');
    setUnitOfMeasure('Pcs');
    setEditingId(null);
    setIsFormVisible(false);
  };

  const filteredProducts = products.filter(p => 
    p.ProductName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.BrandName && p.BrandName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (p.MaterialType && p.MaterialType.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="bg-white rounded-md shadow-md border border-gray-300 overflow-hidden mb-8">
      
      {/* ENTERPRISE TOOLBAR */}
      <div className="p-4 border-b border-gray-300 bg-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-xl font-extrabold text-gray-800 uppercase tracking-wider">
          Product & Material Master
        </h2>
        
        <div className="flex w-full md:w-auto gap-3">
          <input
            type="search"
            placeholder="Search name, brand, or type..."
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
              + Create New
            </button>
          )}
        </div>
      </div>

      {/* DATA ENTRY FORM */}
      {isFormVisible && (
        <div className="p-5 bg-blue-50 border-b border-blue-200">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-700 uppercase">Material Type</label>
                <select 
                  value={materialType} 
                  onChange={(e) => setMaterialType(e.target.value)}
                  className="w-full p-2 bg-white border border-gray-400 text-gray-900 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="Finished Good">Finished Good (For Sale)</option>
                  <option value="Raw Material">Raw Material (For Production)</option>
                  <option value="Packaging">Packaging Material</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-700 uppercase">Item State (Routing)</label>
                <select 
                  value={itemState} 
                  onChange={(e) => setItemState(e.target.value)}
                  className="w-full p-2 bg-white border border-gray-400 text-gray-900 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="Solid">Solid (Warehouse Storage)</option>
                  <option value="Liquid">Liquid (Tank Storage)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-700 uppercase">Unit of Measure</label>
                <select 
                  value={unitOfMeasure} 
                  onChange={(e) => setUnitOfMeasure(e.target.value)}
                  className="w-full p-2 bg-white border border-gray-400 text-gray-900 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="Pcs">Pieces (Pcs)</option>
                  <option value="Box">Boxes (Box)</option>
                  <option value="Kg">Kilograms (Kg)</option>
                  <option value="Liters">Liters (L)</option>
                  <option value="Tons">Tons (T)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-700 uppercase">Brand Assignment</label>
                <Select
                  options={brandOptions}
                  value={selectedBrandOption}
                  onChange={(selected) => setBrandId(selected ? selected.value : null)}
                  isClearable
                  placeholder="Select a brand..."
                  className="text-gray-900 text-sm"
                  styles={{
                    control: (base) => ({
                      ...base, minHeight: '38px', borderColor: '#9ca3af', borderRadius: '0.25rem'
                    })
                  }}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-700 uppercase">Product / Material Name</label>
                <input 
                  type="text" 
                  value={productName} 
                  onChange={(e) => setProductName(e.target.value)} 
                  placeholder="Enter name..." 
                  className="w-full p-2 bg-white border border-gray-400 text-gray-900 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none" 
                />
              </div>
            </div>

            <div className="w-full flex gap-2 pt-2 border-t border-blue-200 mt-2">
              <button 
                type="submit" 
                className={`px-8 py-2 text-white font-bold rounded shadow-sm transition-colors ${editingId ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {editingId ? 'Update Record' : 'Save Record'}
              </button>
              <button 
                type="button" 
                onClick={cancelEdit}
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
        <table className="w-full text-left text-sm text-gray-800 min-w-[800px]">
          <thead className="text-xs uppercase bg-slate-700 text-white">
            <tr>
              <th className="px-4 py-3 font-bold w-16 border-r border-slate-600">ID</th>
              <th className="px-4 py-3 font-bold border-r border-slate-600">Name</th>
              <th className="px-4 py-3 font-bold border-r border-slate-600 w-32">Brand</th>
              <th className="px-4 py-3 font-bold border-r border-slate-600 w-40">Type</th>
              <th className="px-4 py-3 font-bold border-r border-slate-600 w-24">State</th>
              <th className="px-4 py-3 font-bold border-r border-slate-600 w-24">UOM</th>
              {user?.role === 'Admin' && (
                <th className="px-4 py-3 font-bold text-center w-32">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300">
            {filteredProducts.map((p) => (
              <tr key={p.ProductID} className="bg-white even:bg-gray-100 hover:bg-yellow-50 transition-colors">
                <td className="px-4 py-2 font-mono text-gray-600 border-r border-gray-200">{p.ProductID}</td>
                <td className="px-4 py-2 font-bold text-gray-900 border-r border-gray-200">{p.ProductName}</td>
                <td className="px-4 py-2 border-r border-gray-200">{p.BrandName || 'N/A'}</td>
                <td className="px-4 py-2 border-r border-gray-200">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${p.MaterialType === 'Raw Material' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}`}>
                    {p.MaterialType || 'Finished Good'}
                  </span>
                </td>
                <td className="px-4 py-2 border-r border-gray-200 font-semibold">{p.ItemState || 'Solid'}</td>
                <td className="px-4 py-2 border-r border-gray-200 font-semibold">{p.UnitOfMeasure || 'Pcs'}</td>
                
                {user?.role === 'Admin' && (
                  <td className="px-4 py-2 text-center whitespace-nowrap">
                    <button onClick={() => handleEdit(p)} className="font-bold text-blue-600 hover:text-blue-800 underline mr-3">Edit</button>
                    <button onClick={() => handleDelete(p.ProductID)} className="font-bold text-red-600 hover:text-red-800 underline">Delete</button>
                  </td>
                )}
              </tr>
            ))}
            {filteredProducts.length === 0 && (
              <tr>
                <td colSpan={user?.role === 'Admin' ? 7 : 6} className="px-4 py-8 text-center text-gray-500 font-medium">
                  No records found matching your criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}