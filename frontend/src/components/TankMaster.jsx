import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

export default function TankMaster({ user }) {
  const [tanks, setTanks] = useState([]);
  
  // Form State
  const [tankName, setTankName] = useState('');
  const [capacity, setCapacity] = useState('');
  
  // Enterprise Features State
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [isFormVisible, setIsFormVisible] = useState(false);

  const fetchTanks = async () => {
    try {
      const token = localStorage.getItem('erp_token');
      const res = await fetch(`${API_BASE_URL}/tanks`, {
        method: 'GET',
        headers: { 'x-access-token': token }
      });
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

    const method = 'POST';
    const url = editingId 
      ? `${API_BASE_URL}/tanks/edit/${editingId}`
      : `${API_BASE_URL}/tanks`;

    try {
      const token = localStorage.getItem('erp_token');
      const res = await fetch(url, {
        method: method,
        headers: { 
          'Content-Type': 'application/json',
          'x-access-token': token
        },
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
    setIsFormVisible(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this tank? This action cannot be undone.")) return;

    try {
      const token = localStorage.getItem('erp_token');
      const res = await fetch(`${API_BASE_URL}/tanks/delete/${id}`, {
        method: 'POST',
        headers: { 'x-access-token': token}
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
    setIsFormVisible(false);
  };

  // Filter tanks based on search term (now perfectly safe)
  const filteredTanks = tanks.filter(t => 
    t.TankName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-md shadow-md border border-gray-300 overflow-hidden mb-8">
      {/* ENTERPRISE TOOLBAR */}
      <div className="p-4 border-b border-gray-300 bg-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-xl font-extrabold text-gray-800 uppercase tracking-wider">
          Tank Master
        </h2>

        <div className="flex w-full md:w-auto gap-3">
          <input
            type="search"
            placeholder="Search tanks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-64 p-2 bg-white border border-gray-400 text-gray-900 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-sm"
          />
          {!isFormVisible && (
            <button
              type="button"
              onClick={() => {
                setTankName('');
                setCapacity('');
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

      {/* DATA ENTRY FORM (Hidden by default) */}
      {isFormVisible && (
        <div className="p-5 bg-blue-50 border-b border-blue-200">
          <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex flex-col gap-1 w-full md:w-1/3">
              <label className="text-xs font-bold text-gray-700 uppercase">Tank Name</label>
              <input
                type="text"
                value={tankName}
                onChange={(e) => setTankName(e.target.value)}
                placeholder="e.g., Silo A"
                className="w-full p-2 bg-white border border-gray-400 text-gray-900 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1 w-full md:w-1/3">
              <label className="text-xs font-bold text-gray-700 uppercase">Max Capacity (L)</label>
              <input
                type="number"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder="e.g., 5000"
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

      {/* DENSE TABULAR DATA DISPLAY */}
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-800">
          <thead className="text-xs uppercase bg-slate-700 text-white">
            <tr>
              <th className="px-4 py-3 font-bold w-24 border-r border-slate-600">ID</th>
              <th className="px-4 py-3 font-bold border-r border-slate-600">Tank Name</th>
              <th className="px-4 py-3 font-bold border-r border-slate-600">Max Capacity</th>
              <th className="px-4 py-3 font-bold border-r border-slate-600">Current Stock</th>
              {user?.role === 'Admin' && (
                <>
                  <th className="px-4 py-3 font-bold w-24 text-center border-r border-slate-600">Edit</th>
                  <th className="px-4 py-3 font-bold w-24 text-center">Delete</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300">
            {filteredTanks.map((tank) => {
              // Calculate fill percentage safely
              const capacity = parseFloat(tank.Capacity) || 1;
              const stock = parseFloat(tank.CurrentStock) || 0;
              const percentage = Math.min((stock / capacity) * 100, 100).toFixed(1);
              
              // Dynamic color coding based on fill level
              let barColor = 'bg-green-500';
              if (percentage > 90) barColor = 'bg-red-500'; // Critical
              else if (percentage > 75) barColor = 'bg-yellow-500'; // Warning

              return (
                <tr key={tank.TankID} className="bg-white even:bg-gray-100 hover:bg-yellow-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-gray-600 border-r border-gray-200">{tank.TankID}</td>
                  <td className="px-4 py-3 font-bold text-gray-900 border-r border-gray-200">{tank.TankName}</td>
                  <td className="px-4 py-3 font-mono text-gray-700 border-r border-gray-200">{tank.Capacity} L</td>
                  
                  {/* VISUAL FILL STATUS DASHBOARD COLUMN */}
                  <td className="px-4 py-3 border-r border-gray-200 w-64">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-bold text-gray-900">{stock} L</span>
                      <span className="font-mono font-bold text-gray-600">{percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-300 rounded-full h-3 shadow-inner">
                      <div 
                        className={`h-3 rounded-full ${barColor} transition-all duration-500`} 
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </td>
                  
                  {user?.role === 'Admin' && (
                    <>
                      <td className="px-4 py-3 text-center border-r border-gray-200">
                        <button
                          type="button"
                          onClick={() => handleEdit(tank)}
                          className="font-bold text-blue-600 hover:text-blue-800 underline transition-colors"
                        >
                          Edit
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleDelete(tank.TankID)}
                          className="font-bold text-red-600 hover:text-red-800 underline transition-colors"
                        >
                          Delete
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
            {filteredTanks.length === 0 && (
              <tr>
                <td colSpan={user?.role === 'Admin' ? 6 : 4} className="px-4 py-8 text-center text-gray-500 font-medium">
                  No tanks found matching your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}