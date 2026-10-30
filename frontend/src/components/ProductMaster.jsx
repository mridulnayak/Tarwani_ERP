import { useState, useEffect } from 'react';
import Select from 'react-select'; // Import the searchable dropdown

export default function ProductMaster({ user }) {
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  
  // Form State
  const [productName, setProductName] = useState('');
  const [brandId, setBrandId] = useState(null);
  
  // Enterprise Features State
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null); // Tracks if we are editing an existing item

  const fetchData = async () => {
    // 1. Fetch Products Safely
    try {
      const pRes = await fetch('https://sms.uvtechsolutions.co.in/api/products');
      if (!pRes.ok) throw new Error(`Products API Error: ${pRes.status}`);
      const pData = await pRes.json();
      setProducts(Array.isArray(pData) ? pData : []);
    } catch (error) {
      console.error("Error fetching products:", error);
      setProducts([]);
    }

    // 2. Fetch Brands Safely (Independent try/catch block)
    try {
      const bRes = await fetch('https://sms.uvtechsolutions.co.in/api/brands');
      if (!bRes.ok) throw new Error(`Brands API Error: ${bRes.status}`);
      const bData = await bRes.json();
      setBrands(Array.isArray(bData) ? bData : []);
    } catch (error) {
      console.error("Error fetching brands:", error);
      setBrands([]);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Format brands for react-select: { value, label } (Now perfectly safe)
  const brandOptions = brands.map(b => ({
    value: b.BrandID,
    label: b.BrandName
  }));

  // Find the selected option object for the react-select component
  const selectedBrandOption = brandOptions.find(opt => opt.value === brandId) || null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!productName || !brandId) return alert("Select a brand and enter a product name");
    
    // If editingId exists, we do a PUT (Update). Otherwise, POST (Create).
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId 
      ? `/api/products/${editingId}` 
      : '/api/products';

    try {
      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productName, brandId })
      });
      
      if (res.ok) { 
        setProductName(''); 
        setBrandId(null); 
        setEditingId(null);
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
    setEditingId(product.ProductID);
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to top to see the form
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this product? This action cannot be undone.")) return;

    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE'
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
    setEditingId(null);
  };

  // Filter products based on search term (Now perfectly safe)
  const filteredProducts = products.filter(p => 
    p.ProductName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.BrandName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
      {/* HEADER */}
      <div className="p-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-800 uppercase tracking-wide">
          {editingId ? 'Edit Product' : 'Product / Box Master'}
        </h2>
        {editingId && (
          <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-3 py-1 rounded-full border border-yellow-200">
            Editing Mode Active
          </span>
        )}
      </div>

      {/* FORM SECTION */}
      <div className="p-5 md:p-6 bg-white">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          
          <div className="flex flex-col gap-1 md:col-span-2">
            <label className="text-xs font-semibold text-gray-500 uppercase">Product Name</label>
            <input 
              type="text" 
              value={productName} 
              onChange={(e) => setProductName(e.target.value)} 
              placeholder="e.g., Mitan Black 10/-" 
              className="w-full p-2.5 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-colors" 
            />
          </div>

          <div className="flex flex-col gap-1 md:col-span-1">
            <label className="text-xs font-semibold text-gray-500 uppercase">Brand</label>
            {/* Enterprise Searchable Dropdown */}
            <Select
              options={brandOptions}
              value={selectedBrandOption}
              onChange={(selected) => setBrandId(selected ? selected.value : null)}
              isClearable
              placeholder="Search brand..."
              className="text-gray-900 text-sm"
              styles={{
                control: (base) => ({
                  ...base,
                  backgroundColor: '#f9fafb',
                  borderColor: '#d1d5db',
                  padding: '1px',
                  borderRadius: '0.5rem',
                  boxShadow: 'none',
                  '&:hover': { borderColor: '#3b82f6' }
                })
              }}
            />
          </div>

          <div className="md:col-span-1 flex gap-2">
            <button 
              type="submit" 
              className={`flex-1 px-4 py-2.5 text-white font-bold rounded-lg shadow-sm transition-colors focus:ring-4 ${editingId ? 'bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-300' : 'bg-green-600 hover:bg-green-700 focus:ring-green-300'}`}
            >
              {editingId ? 'Update' : '+ Save'}
            </button>
            {editingId && (
              <button 
                type="button" 
                onClick={cancelEdit}
                className="px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-lg transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* DATA DISPLAY SECTION */}
      <div className="border-t border-gray-200">
        
        {/* GLOBAL SEARCH BAR */}
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <span className="text-gray-400">🔍</span>
            </div>
            <input 
              type="text" 
              placeholder="Search products by name or brand..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 p-2.5 bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all"
            />
          </div>
        </div>

        {/* MOBILE VIEW: Cards */}
        <div className="md:hidden divide-y divide-gray-200">
          {filteredProducts.map((p) => (
            <div key={p.ProductID} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <span className="font-bold text-gray-900 text-lg">{p.ProductName}</span>
                <span className="text-xs font-mono text-gray-400">#{p.ProductID}</span>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600 flex items-center gap-2">
                  <span>🏷️</span> <span className="font-semibold text-gray-800">{p.BrandName}</span>
                </p>
                {/* Admin Actions Mobile */}
                {user?.role === 'Admin' && (
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(p)} className="p-1.5 bg-blue-100 text-blue-700 rounded-md font-bold text-xs">Edit</button>
                    <button onClick={() => handleDelete(p.ProductID)} className="p-1.5 bg-red-100 text-red-700 rounded-md font-bold text-xs">Del</button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {filteredProducts.length === 0 && (
             <div className="p-6 text-center text-gray-500">No products found.</div>
          )}
        </div>

        {/* DESKTOP VIEW: Table */}
        <div className="hidden md:block w-full overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="text-xs text-gray-700 uppercase bg-gray-100 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-semibold w-24">ID</th>
                <th className="px-6 py-4 font-semibold">Product Name</th>
                <th className="px-6 py-4 font-semibold">Brand</th>
                {user?.role === 'Admin' && (
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredProducts.map((p) => (
                <tr key={p.ProductID} className="hover:bg-gray-50 transition-colors bg-white group">
                  <td className="px-6 py-4 font-mono text-gray-500">{p.ProductID}</td>
                  <td className="px-6 py-4 font-bold text-gray-900">{p.ProductName}</td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 bg-gray-100 border border-gray-200 rounded-md text-xs font-semibold text-gray-700">
                      {p.BrandName}
                    </span>
                  </td>
                  {/* Admin Actions Desktop */}
                  {user?.role === 'Admin' && (
                    <td className="px-6 py-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleEdit(p)}
                        className="text-blue-600 hover:text-blue-800 font-semibold mr-4 transition-colors"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDelete(p.ProductID)}
                        className="text-red-600 hover:text-red-800 font-semibold transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={user?.role === 'Admin' ? 4 : 3} className="px-6 py-8 text-center text-gray-500">
                    No products found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}