import { useState, useEffect } from 'react';

export default function TankMaster({ user }) {
  const [tanks, setTanks] = useState([]);
  
  // Form State
  const [tankName, setTankName] = useState('');
  const [capacity, setCapacity] = useState('');
  
  // Enterprise Features State
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);

  const fetchTanks = async () => {
    try {
      const res = await fetch('/api/tanks');
      if (!res.ok) throw new Error(`Server responded with status: ${res.status}`);
      const data = await res.json();
      
      // SAFETY NET: Ensure data is an array before setting state
      setTanks(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching tanks:", error);
      // Fallback to empty array to prevent UI crashes
      setTanks([]);
    }
  };

  useEffect(() => { fetchTanks(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!tankName || !capacity) return;

    const method = editingId ? 'PUT' : 'POST';
    const url = editingId 
      ? `/api/tanks/${editingId}` 
      : '/api/tanks';

    try {
      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tankName, capacity: parseInt(capacity) })
      });
      
      if (res.ok) { 
        cancelEdit(); 
        fetchTanks(); 
      } else {
        alert("Failed to save tank.");
      }
    } catch (error) {
      console.error("Error saving tank:", error);
    }
  };

  const handleEdit = (tank) => {
    setTankName(tank.TankName);
    setCapacity(tank.Capacity);
    setEditingId(tank.TankID);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this tank? This action cannot be undone.")) return;

    try {
      const res = await fetch(`/api/tanks/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchTanks();
      } else {
        alert("Failed to delete. Tank might be tied to existing inventory records.");
      }
    } catch (error) {
      console.error("Error deleting tank:", error);
    }
  };

  const cancelEdit = () => {
    setTankName('');
    setCapacity('');
    setEditingId(null);
  };

  // Filter tanks based on search term (now perfectly safe)
  const filteredTanks = tanks.filter(t => 
    t.TankName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
      {/* HEADER */}
      <div className="p-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-800 uppercase tracking-wide">
          {editingId ? 'Edit Tank' : 'Tank Master'}
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
            <label className="text-xs font-semibold text-gray-500 uppercase">Tank Name</label>
            <input 
              type="text" 
              value={tankName} 
              onChange={(e) => setTankName(e.target.value)} 
              placeholder="e.g., Silo A" 
              className="w-full p-2.5 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-colors" 
            />
          </div>

          <div className="flex flex-col gap-1 md:col-span-1">
            <label className="text-xs font-semibold text-gray-500 uppercase">Max Capacity (L)</label>
            <input 
              type="number" 
              value={capacity} 
              onChange={(e) => setCapacity(e.target.value)} 
              placeholder="e.g., 5000" 
              className="w-full p-2.5 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-colors" 
            />
          </div>

          <div className="md:col-span-1 flex gap-2">
            <button 
              type="submit" 
              className={`flex-1 px-4 py-2.5 text-white font-bold rounded-lg shadow-sm transition-colors focus:ring-4 ${editingId ? 'bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-300' : 'bg-cyan-600 hover:bg-cyan-700 focus:ring-cyan-300'}`}
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
              placeholder="Search tanks..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 p-2.5 bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all"
            />
          </div>
        </div>

        {/* MOBILE VIEW: Cards */}
        <div className="md:hidden divide-y divide-gray-200">
          {filteredTanks.map((t) => (
            <div key={t.TankID} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex justify-between items-start mb-3">
                <span className="font-bold text-gray-900 text-lg flex items-center gap-2">
                  <span>🛢️</span> {t.TankName}
                </span>
                <span className="text-xs font-mono text-gray-400">#{t.TankID}</span>
              </div>
              <div className="flex justify-between items-center text-sm mb-3">
                <span className="text-gray-600">Capacity: {t.Capacity} L</span>
                <span className="px-3 py-1 bg-green-100 text-green-800 font-bold rounded-full border border-green-200">
                  Stock: {t.CurrentStock} L
                </span>
              </div>
              {/* Admin Actions Mobile */}
              {user?.role === 'Admin' && (
                <div className="flex gap-2 border-t border-gray-100 pt-3">
                  <button onClick={() => handleEdit(t)} className="flex-1 p-2 bg-blue-50 text-blue-700 rounded-md font-bold text-xs hover:bg-blue-100 transition-colors">Edit</button>
                  <button onClick={() => handleDelete(t.TankID)} className="flex-1 p-2 bg-red-50 text-red-700 rounded-md font-bold text-xs hover:bg-red-100 transition-colors">Delete</button>
                </div>
              )}
            </div>
          ))}
          {filteredTanks.length === 0 && (
             <div className="p-6 text-center text-gray-500">No tanks found.</div>
          )}
        </div>

        {/* DESKTOP VIEW: Table */}
        <div className="hidden md:block w-full overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="text-xs text-gray-700 uppercase bg-gray-100 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-semibold w-24">ID</th>
                <th className="px-6 py-4 font-semibold">Tank Name</th>
                <th className="px-6 py-4 font-semibold">Max Capacity</th>
                <th className="px-6 py-4 font-semibold">Current Stock</th>
                {user?.role === 'Admin' && (
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredTanks.map((t) => (
                <tr key={t.TankID} className="hover:bg-gray-50 transition-colors bg-white group">
                  <td className="px-6 py-4 font-mono text-gray-500">{t.TankID}</td>
                  <td className="px-6 py-4 font-bold text-gray-900 flex items-center gap-2">
                    <span className="text-gray-400">🛢️</span> {t.TankName}
                  </td>
                  <td className="px-6 py-4">{t.Capacity} L</td>
                  <td className="px-6 py-4">
                    <span className="font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-md border border-green-100">
                      {t.CurrentStock} L
                    </span>
                  </td>
                  {/* Admin Actions Desktop */}
                  {user?.role === 'Admin' && (
                    <td className="px-6 py-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleEdit(t)}
                        className="text-blue-600 hover:text-blue-800 font-semibold mr-4 transition-colors"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDelete(t.TankID)}
                        className="text-red-600 hover:text-red-800 font-semibold transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {filteredTanks.length === 0 && (
                <tr>
                  <td colSpan={user?.role === 'Admin' ? 5 : 4} className="px-6 py-8 text-center text-gray-500">
                    No tanks found matching your search.
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