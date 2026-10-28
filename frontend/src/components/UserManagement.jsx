import { useState, useEffect } from 'react';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  
  // Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('');

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) setUsers(await res.json());
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password || !role) return alert("All fields are required.");

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, role })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        alert("Employee Account Created Successfully!");
        setUsername('');
        setPassword('');
        setRole('');
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
      const res = await fetch(`/api/users/${userId}/toggle-status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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
        <form onSubmit={handleSubmit} className="bg-gray-50 p-5 rounded-xl border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">Employee Username</label>
              <input 
                type="text" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g., ravi_store"
                className="w-full p-2.5 bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-blue-500 focus:border-blue-500 shadow-sm"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">Temporary Password</label>
              <input 
                type="text" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Set a password"
                className="w-full p-2.5 bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-blue-500 focus:border-blue-500 shadow-sm"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">Access Role</label>
              <select 
                value={role} 
                onChange={(e) => setRole(e.target.value)}
                className="w-full p-2.5 bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-blue-500 focus:border-blue-500 shadow-sm"
              >
                <option value="" disabled>-- Select Module Access --</option>
                <option value="Admin">Master Admin (Full Access)</option>
                <option value="Sales">Sales Team (Sales & Dispatch)</option>
                <option value="Store">Store Manager (Purchase & Issual)</option>
                <option value="Production">Factory Floor (Production)</option>
              </select>
            </div>
          </div>

          <button 
            type="submit" 
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm transition-colors focus:ring-4 focus:ring-blue-300"
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

        {/* MOBILE VIEW: Cards */}
        <div className="md:hidden divide-y divide-gray-200">
          {(users || []).map((u) => (
            <div key={u.UserID} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <span className="font-bold text-gray-900 text-lg">@{u.Username}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${u.IsActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {u.IsActive ? 'Active' : 'Disabled'}
                </span>
              </div>
              <div className="flex justify-between items-center mt-3">
                <span className="text-sm font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-md border border-blue-100">
                  {u.Role}
                </span>
                {u.Username !== 'admin' && (
                  <button 
                    onClick={() => toggleUserStatus(u.UserID, u.IsActive)}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${u.IsActive ? 'bg-yellow-100 hover:bg-yellow-200 text-yellow-800' : 'bg-green-100 hover:bg-green-200 text-green-800'}`}
                  >
                    {u.IsActive ? 'Deactivate' : 'Reactivate'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* DESKTOP VIEW: Table */}
        <div className="hidden md:block w-full overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="text-xs text-gray-700 uppercase bg-gray-100 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-semibold">Username</th>
                <th className="px-6 py-4 font-semibold">System Role</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {(users || []).map((u) => (
                <tr key={u.UserID} className="hover:bg-gray-50 bg-white">
                  <td className="px-6 py-4 font-bold text-gray-900">@{u.Username}</td>
                  <td className="px-6 py-4">
                    <span className="font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
                      {u.Role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${u.IsActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {u.IsActive ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {u.Username !== 'admin' && (
                      <button 
                        onClick={() => toggleUserStatus(u.UserID, u.IsActive)}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${u.IsActive ? 'bg-yellow-100 hover:bg-yellow-200 text-yellow-800' : 'bg-green-100 hover:bg-green-200 text-green-800'}`}
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