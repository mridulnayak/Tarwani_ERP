import { useState, useEffect } from 'react';
import Select from 'react-select';
import { API_BASE_URL } from '../config';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  
  // Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('');
  const [fullName, setFullName] = useState(''); // New State

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('erp_token');
      const res = await fetch(`${API_BASE_URL}/users`, {
        method: 'GET',
        headers: { 'x-access-token': token }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const accessRoleOptions = [
    { value: 'Admin', label: 'Master Admin' },
    { value: 'Sales', label: 'Sales Team' },
    { value: 'Store', label: 'Store Manager' },
    { value: 'Production', label: 'Factory Floor' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password || !role || !fullName) return alert("All fields are required.");

    try {
      const res = await fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, role, fullName })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        alert("Employee Account Created Successfully!");
        setUsername('');
        setPassword('');
        setRole('');
        setFullName('');
        fetchUsers(); 
      } else {
        alert(data.error || "Failed to create account.");
      }
    } catch (error) {
      console.error("Error creating user:", error);
    }
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    if (!window.confirm(`Are you sure you want to ${currentStatus ? 'deactivate' : 'reactivate'} this account?`)) return;

    try {
      const token = localStorage.getItem('erp_token');
      const res = await fetch(`${API_BASE_URL}/users/toggle-status/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-token': token
        },
        body: JSON.stringify({ isActive: !currentStatus }) 
      });

      if (res.ok) {
        fetchUsers(); 
      } else {
        alert("Failed to update user status.");
      }
    } catch (error) {
      console.error("Error toggling status:", error);
    }
  }; 

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
      {/* HEADER */}
      <div className="p-5 border-b border-gray-200 bg-gray-50">
        <h2 className="text-lg font-bold text-gray-800 uppercase tracking-wide">System User Management</h2>
        <p className="text-sm text-gray-500 mt-1">Create and manage secure login credentials for factory employees.</p>
      </div>
      
      {/* FORM SECTION */}
      <div className="p-5 md:p-6">
        <form onSubmit={handleSubmit} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          {/* Changed grid to 4 columns to fit Full Name beautifully */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-5">
            
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">Full Name *</label>
              <input 
                type="text" 
                value={fullName} 
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g., Ravi Sharma"
                className="w-full p-2.5 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-blue-500 focus:bg-white transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">Username *</label>
              <input 
                type="text" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g., ravi_store"
                className="w-full p-2.5 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-blue-500 focus:bg-white transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">Temp Password *</label>
              <input 
                type="text" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Set a password"
                className="w-full p-2.5 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-blue-500 focus:bg-white transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">Access Role *</label>
              <Select
                options={accessRoleOptions}
                value={accessRoleOptions.find(opt => opt.value === role) || null}
                onChange={(selected) => setRole(selected ? selected.value : '')}
                isSearchable
                placeholder="Select role..."
                className="w-full text-gray-900 text-sm"
                
                // 🔥 THE FIX FOR DROPDOWNS GETTING CUT OFF IN TIGHT SPACES
                menuPortalTarget={document.body} 
                styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm transition-all active:scale-[0.99]"
          >
            + Create Employee Account
          </button>
        </form>
      </div>

      {/* DATA DISPLAY SECTION */}
      <div className="border-t border-gray-200">
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wide">Active System Users</h3>
        </div>

        {/* DESKTOP VIEW: Table */}
        <div className="hidden md:block w-full overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="text-xs text-gray-500 uppercase bg-white border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-semibold">Full Name</th>
                <th className="px-6 py-4 font-semibold">Username</th>
                <th className="px-6 py-4 font-semibold">System Role</th>
                <th className="px-6 py-4 font-semibold text-center">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(users || []).map((u) => (
                <tr key={u.UserID} className="hover:bg-slate-50 transition-colors bg-white">
                  <td className="px-6 py-4 font-bold text-gray-900">{u.fullName || '—'}</td>
                  <td className="px-6 py-4 font-mono text-gray-600">@{u.Username}</td>
                  <td className="px-6 py-4">
                    <span className="font-bold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-md border border-blue-100">
                      {u.Role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-[11px] uppercase tracking-wider font-bold ${u.IsActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {u.IsActive ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {u.Username !== 'admin' && (
                      <button 
                        onClick={() => toggleUserStatus(u.UserID, u.IsActive)}
                        className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${u.IsActive ? 'bg-white border border-gray-300 hover:bg-red-50 hover:text-red-700 text-gray-600' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                      >
                        {u.IsActive ? 'Deactivate' : 'Reactivate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}