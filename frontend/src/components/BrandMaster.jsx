import { useState, useEffect } from 'react';

export default function BrandMaster({ user }) {
  const [brands, setBrands] = useState([]);
  
  // Form State
  const [brandName, setBrandName] = useState('');
  
  // Enterprise Features State
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);

  const fetchBrands = async () => {
    try {
      const res = await fetch('/api/brands');
      setBrands(await res.json());
    } catch (error) {
      console.error("Error fetching brands:", error);
    }
  };

  useEffect(() => { fetchBrands(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!brandName) return;

    const method = editingId ? 'PUT' : 'POST';
    const url = editingId 
      ? `/api/brands/${editingId}` 
      : '/api/brands';

    try {
      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandName })
      });
      
      if (res.ok) { 
        setBrandName(''); 
        setEditingId(null);
        fetchBrands(); 
      } else {
        alert("Failed to save brand.");
      }
    } catch (error) {
      console.error("Error saving brand:", error);
    }
  };

  const handleEdit = (brand) => {
    setBrandName(brand.BrandName);
    setEditingId(brand.BrandID);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this brand? This action cannot be undone.")) return;

    try {
      const res = await fetch(`/api/brands/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchBrands();
      } else {
        alert("Failed to delete. Brand might be tied to existing products.");
      }
    } catch (error) {
      console.error("Error deleting brand:", error);
    }
  };

  const cancelEdit = () => {
    setBrandName('');
    setEditingId(null);
  };

  // Filter brands based on search term
  const filteredBrands = brands.filter(b => 
    b.BrandName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
      
      {/* HEADER */}
      <div className="p-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-800 uppercase tracking-wide">
          {editingId ? 'Edit Brand' : 'Brand Master'}
        </h2>
        {editingId && (
          <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-3 py-1 rounded-full border border-yellow-200">
            Editing Mode Active
          </span>
        )}
      </div>

      {/* FORM SECTION */}
      <div className="p-5 md:p-6 bg-white">
        <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4 items-end">
          
          <div className="flex flex-col gap-1 w-full md:flex-1">
            <label className="text-xs font-semibold text-gray-500 uppercase">Brand Name</label>
            <input 
              type="text" 
              value={brandName} 
              onChange={(e) => setBrandName(e.target.value)} 
              placeholder="e.g., Tarwani Naturals" 
              className="w-full p-2.5 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-colors" 
            />
          </div>

          <div className="w-full md:w-auto flex gap-2">
            <button 
              type="submit" 
              className={`flex-1 md:w-auto px-8 py-2.5 text-white font-bold rounded-lg shadow-sm transition-colors focus:ring-4 ${editingId ? 'bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-300' : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-300'}`}
            >
              {editingId ? 'Update' : '+ Save'}
            </button>
            {editingId && (
              <button 
                type="button" 
                onClick={cancelEdit}
                className="px-6 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-lg transition-colors"
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
              placeholder="Search brands..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 p-2.5 bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all"
            />
          </div>
        </div>

        {/* MOBILE VIEW: Cards */}
        <div className="md:hidden divide-y divide-gray-200">
          {filteredBrands.map((b) => (
            <div key={b.BrandID} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <span className="font-bold text-gray-900 text-lg">{b.BrandName}</span>
                <span className="text-xs font-mono text-gray-400">#{b.BrandID}</span>
              </div>
              {/* Admin Actions Mobile */}
              {user?.role === 'Admin' && (
                <div className="flex gap-2 mt-3">
                  <button onClick={() => handleEdit(b)} className="p-1.5 bg-blue-100 text-blue-700 rounded-md font-bold text-xs flex-1">Edit</button>
                  <button onClick={() => handleDelete(b.BrandID)} className="p-1.5 bg-red-100 text-red-700 rounded-md font-bold text-xs flex-1">Delete</button>
                </div>
              )}
            </div>
          ))}
          {filteredBrands.length === 0 && (
             <div className="p-6 text-center text-gray-500">No brands found.</div>
          )}
        </div>

        {/* DESKTOP VIEW: Table */}
        <div className="hidden md:block w-full overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="text-xs text-gray-700 uppercase bg-gray-100 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-semibold w-24">ID</th>
                <th className="px-6 py-4 font-semibold">Brand Name</th>
                {user?.role === 'Admin' && (
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredBrands.map((b) => (
                <tr key={b.BrandID} className="hover:bg-gray-50 transition-colors bg-white group">
                  <td className="px-6 py-4 font-mono text-gray-500">{b.BrandID}</td>
                  <td className="px-6 py-4 font-bold text-gray-900">{b.BrandName}</td>
                  {/* Admin Actions Desktop */}
                  {user?.role === 'Admin' && (
                    <td className="px-6 py-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleEdit(b)}
                        className="text-blue-600 hover:text-blue-800 font-semibold mr-4 transition-colors"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDelete(b.BrandID)}
                        className="text-red-600 hover:text-red-800 font-semibold transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {filteredBrands.length === 0 && (
                <tr>
                  <td colSpan={user?.role === 'Admin' ? 3 : 2} className="px-6 py-8 text-center text-gray-500">
                    No brands found.
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