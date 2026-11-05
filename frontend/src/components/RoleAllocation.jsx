import { useState, useEffect } from 'react';
import Select from 'react-select';
import { API_BASE_URL } from '../config';

export default function RoleAllocation({ user }) {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Track which roles are being changed in the UI before saving
  const [pendingRoleChanges, setPendingRoleChanges] = useState({});

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('erp_token');
      const res = await fetch(`${API_BASE_URL}/users/roles`, {
        method: 'GET',
        headers: { 'x-access-token': token }
      });
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching users:", error);
      setUsers([]);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleSelect = (userId, newRole) => {
    setPendingRoleChanges(prev => ({
      ...prev,
      [userId]: newRole
    }));
  };

  const saveRoleUpdate = async (userId) => {
    const newRole = pendingRoleChanges[userId];
    if (!newRole) return;

    try {
      const token = localStorage.getItem('erp_token');
      const res = await fetch(`${API_BASE_URL}/users/roles/edit/${userId}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-access-token': token 
        },
        body: JSON.stringify({ newRole })
      });

      if (res.ok) {
        // Clear the pending change and refresh the list to show the new committed role
        setPendingRoleChanges(prev => {
          const newState = { ...prev };
          delete newState[userId];
          return newState;
        });
        fetchUsers();
        alert("User role updated successfully.");
      } else {
        alert("Failed to update role.");
      }
    } catch (error) {
      console.error("Error updating role:", error);
    }
  };

  // Prevent non-admins from viewing this page entirely
  if (user?.role !== 'Admin') {
    return (
      <div className="p-8 text-center bg-red-50 border border-red-200 rounded-lg mt-8">
        <h2 className="text-2xl font-bold text-red-700">Access Denied</h2>
        <p className="text-red-600 mt-2">You do not have the required Administrator privileges to view this page.</p>
      </div>
    );
  }

  const filteredUsers = users.filter(u => 
    u.Username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.fullName && u.fullName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const availableRoles = ['Admin', 'Production', 'Store', 'Sales', 'Staff'];
  const roleOptions = availableRoles.map(role => ({ value: role, label: role }));

  return (
    <div className="bg-white rounded-md shadow-md border border-gray-300 overflow-hidden mb-8">
      
      <div className="p-4 border-b border-gray-300 bg-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-gray-800 uppercase tracking-wider">
            System Role Allocation
          </h2>
          <p className="text-xs font-bold text-gray-500 mt-1">Manage system access and modular permissions.</p>
        </div>
        
        <input
          type="search"
          placeholder="Search by username or name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full md:w-72 p-2 bg-white border border-gray-400 text-gray-900 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-sm"
        />
      </div>

      <div className="w-full overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-800 min-w-[700px]">
          <thead className="text-xs uppercase bg-slate-700 text-white">
            <tr>
              <th className="px-4 py-3 font-bold w-16 border-r border-slate-600">ID</th>
              <th className="px-4 py-3 font-bold border-r border-slate-600">Username</th>
              <th className="px-4 py-3 font-bold border-r border-slate-600">Full Name</th>
              <th className="px-4 py-3 font-bold border-r border-slate-600 w-48">Current Role</th>
              <th className="px-4 py-3 font-bold border-r border-slate-600 w-48">Assign New Role</th>
              <th className="px-4 py-3 font-bold w-32 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300">
            {filteredUsers.map((u) => {
              const hasPendingChange = pendingRoleChanges[u.UserID] && pendingRoleChanges[u.UserID] !== u.Role;
              
              return (
                <tr key={u.UserID} className="bg-white even:bg-gray-100 hover:bg-yellow-50 transition-colors">
                  <td className="px-4 py-2 font-mono text-gray-600 border-r border-gray-200">{u.UserID}</td>
                  <td className="px-4 py-2 font-bold text-gray-900 border-r border-gray-200">{u.Username}</td>
                  <td className="px-4 py-2 border-r border-gray-200">{u.fullName || 'N/A'}</td>
                  
                  <td className="px-4 py-2 border-r border-gray-200">
                    <span className={`px-2.5 py-1 rounded text-xs font-bold ${u.Role === 'Admin' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                      {u.Role || 'Unassigned'}
                    </span>
                  </td>
                  
                  <td className="px-4 py-2 border-r border-gray-200">
                    <Select
                      options={roleOptions}
                      value={roleOptions.find(opt => opt.value === (pendingRoleChanges[u.UserID] || u.Role || '')) || null}
                      onChange={(selected) => handleRoleSelect(u.UserID, selected ? selected.value : '')}
                      isSearchable
                      isClearable
                      placeholder="Search roles..."
                      className="w-full text-gray-900 text-sm"
                      classNamePrefix="erp-select"
                    />
                  </td>
                  
                  <td className="px-4 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => saveRoleUpdate(u.UserID)}
                      disabled={!hasPendingChange}
                      className={`px-4 py-1.5 rounded font-bold text-xs transition-colors ${
                        hasPendingChange 
                          ? 'bg-green-600 hover:bg-green-700 text-white shadow-sm' 
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      Update
                    </button>
                  </td>
                </tr>
              );
            })}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan="6" className="px-4 py-8 text-center text-gray-500 font-medium">
                  No system users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}