import { useState, useEffect } from 'react';

export default function BrandMaster({ user }) {
  const [brands, setBrands] = useState([]);
  
  // Form State
  const [brandName, setBrandName] = useState('');
  
  // Enterprise Features State
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [isFormVisible, setIsFormVisible] = useState(false);

  const fetchBrands = async () => {
    try {
      const token = localStorage.getItem('erp_token');
      const res = await fetch('https://sms.uvtechsolutions.co.in/api/brands', {
        method: 'GET',
        headers: { 'x-access-token': token }
      });
      if (!res.ok) throw new Error(`Server responded with status: ${res.status}`);
      const data = await res.json();
      setBrands(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching brands:", error);
      setBrands([]); 
    }
  };

  useEffect(() => { fetchBrands(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!brandName) return;

    const method = 'POST';
    const url = editingId 
      ? `https://sms.uvtechsolutions.co.in/api/brands/edit/${editingId}`
      : 'https://sms.uvtechsolutions.co.in/api/brands';

    try {
      const token = localStorage.getItem('erp_token');
      const res = await fetch(url, {
        method: method,
        headers: { 
          'Content-Type': 'application/json',
          'x-access-token': token 
        },
        body: JSON.stringify({ brandName })
      });
      
      if (res.ok) { 
        setBrandName(''); 
        setEditingId(null);
        setIsFormVisible(false);
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
    setIsFormVisible(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this brand? This action cannot be undone.")) return;

    try {
      const token = localStorage.getItem('erp_token');
      const res = await fetch(`https://sms.uvtechsolutions.co.in/api/brands/delete/${id}`, {
        method: 'POST',
        headers: { 'x-access-token': token }
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
    setIsFormVisible(false);
  };

  const filteredBrands = brands.filter(b => 
    b.BrandName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-md shadow-md border border-gray-300 overflow-hidden mb-8">
      <div className="p-4 border-b border-gray-300 bg-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-xl font-extrabold text-gray-800 uppercase tracking-wider">
          Brand Master
        </h2>

        <div className="flex w-full md:w-auto gap-3">
          <input
            type="search"
            placeholder="Search brands..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-64 p-2 bg-white border border-gray-400 text-gray-900 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-sm"
          />
          {!isFormVisible && (
            <button
              type="button"
              onClick={() => {
                setBrandName('');
                setEditingId(null);
                setIsFormVisible(true);
              }}
              className="whitespace-nowrap px-5 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded shadow-sm transition-colors"
            >
              + Create New
            </button>
          )}
        </div>
      </div>

      {isFormVisible && (
        <div className="p-5 bg-blue-50 border-b border-blue-200">
          <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex flex-col gap-1 w-full md:w-1/3">
              <label className="text-xs font-bold text-gray-700 uppercase">Brand Name</label>
              <input
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="e.g., Tarwani Naturals"
                className="w-full p-2 bg-white border border-gray-400 text-gray-900 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div className="w-full md:w-auto flex gap-2">
              <button
                type="submit"
                className={`px-8 py-2 text-white font-bold rounded shadow-sm transition-colors ${editingId ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {editingId ? 'Update' : 'Save'}
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="px-6 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold rounded transition-colors"
              >
                Close
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="w-full overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-800">
          <thead className="text-xs uppercase bg-slate-700 text-white">
            <tr>
              <th className="px-4 py-3 font-bold w-24 border-r border-slate-600">ID</th>
              <th className="px-4 py-3 font-bold border-r border-slate-600">Brand Name</th>
              {user?.role === 'Admin' && (
                <>
                  <th className="px-4 py-3 font-bold w-24 text-center border-r border-slate-600">Edit</th>
                  <th className="px-4 py-3 font-bold w-24 text-center">Delete</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300">
            {filteredBrands.map((brand) => (
              <tr key={brand.BrandID} className="bg-white even:bg-gray-100 hover:bg-yellow-50 transition-colors">
                <td className="px-4 py-2 font-mono text-gray-600 border-r border-gray-200">{brand.BrandID}</td>
                <td className="px-4 py-2 font-semibold text-gray-900 border-r border-gray-200">{brand.BrandName}</td>
                {user?.role === 'Admin' && (
                  <>
                    <td className="px-4 py-2 text-center border-r border-gray-200">
                      <button
                        type="button"
                        onClick={() => handleEdit(brand)}
                        className="font-bold text-blue-600 hover:text-blue-800 underline transition-colors"
                      >
                        Edit
                      </button>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleDelete(brand.BrandID)}
                        className="font-bold text-red-600 hover:text-red-800 underline transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {filteredBrands.length === 0 && (
              <tr>
                <td colSpan={user?.role === 'Admin' ? 4 : 2} className="px-4 py-8 text-center text-gray-500 font-medium">
                  No brands found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}