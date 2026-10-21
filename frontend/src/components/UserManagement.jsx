import { useState, useEffect } from 'react';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  
  // Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('');

  const fetchUsers = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/users');
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
      const res = await fetch('http://localhost:5000/api/users', {
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
        fetchUsers(); // Refresh the table
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
      const res = await fetch(`http://localhost:5000/api/users/${userId}/toggle-status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }) // Flip the status
      });

      if (res.ok) {
        fetchUsers(); // Refresh the table to show the new status
      } else {
        alert("Failed to update user status.");
      }
    } catch (error) {
      console.error("Error toggling status:", error);
    }
  }; 

  return (
    <div style={{ padding: '1.5rem', backgroundColor: '#1e1e1e', borderRadius: '8px', marginBottom: '2rem', border: '1px solid #333' }}>
      <h2 style={{ marginTop: 0 }}>System User Management</h2>
      <p style={{ color: '#aaa', marginBottom: '2rem' }}>Create secure login credentials for factory employees.</p>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem', backgroundColor: '#252525', padding: '1.5rem', borderRadius: '8px', border: '1px solid #444' }}>
        
        <div style={{ flex: 1, minWidth: '200px' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Employee Username</label>
          <input 
            type="text" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g., ravi_store"
            style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', backgroundColor: '#2d2d2d', color: '#fff', border: '1px solid #555' }}
          />
        </div>

        <div style={{ flex: 1, minWidth: '200px' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Temporary Password</label>
          <input 
            type="text" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Set a password"
            style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', backgroundColor: '#2d2d2d', color: '#fff', border: '1px solid #555' }}
          />
        </div>

        <div style={{ flex: 1, minWidth: '200px' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Access Role</label>
          <select 
            value={role} 
            onChange={(e) => setRole(e.target.value)}
            style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', backgroundColor: '#2d2d2d', color: '#fff', border: '1px solid #555' }}
          >
            <option value="" disabled>-- Select Module Access --</option>
            <option value="Admin">Master Admin (Full Access)</option>
            <option value="Sales">Sales Team (Sales & Dispatch)</option>
            <option value="Store">Store Manager (Purchase & Issual)</option>
            <option value="Production">Factory Floor (Production & Finished Goods)</option>
          </select>
        </div>

        <button type="submit" style={{ flex: '1 1 100%', padding: '1rem', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1.1rem', fontWeight: 'bold', marginTop: '0.5rem' }}>
          + Create Employee Account
        </button>
      </form>

      {/* ACTIVE USERS TABLE */}
      <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Active System Users</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
        <thead>
          <tr style={{ backgroundColor: '#2d2d2d' }}>
            <th style={{ padding: '0.75rem', borderBottom: '2px solid #444' }}>Username</th>
            <th style={{ padding: '0.75rem', borderBottom: '2px solid #444' }}>System Role</th>
            <th style={{ padding: '0.75rem', borderBottom: '2px solid #444' }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.UserID} style={{ borderBottom: '1px solid #333' }}>
<td style={{ padding: '0.75rem', fontWeight: 'bold' }}>{u.Username}</td>
              <td style={{ padding: '0.75rem', color: '#007bff', fontWeight: 'bold' }}>{u.Role}</td>
              <td style={{ padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold', backgroundColor: u.IsActive ? '#28a745' : '#dc3545', color: '#fff' }}>
                  {u.IsActive ? 'Active' : 'Disabled'}
                </span>
                
                {/* Prevent the Admin from deactivating their own account */}
                {u.Username !== 'admin' && (
                  <button 
                    onClick={() => toggleUserStatus(u.UserID, u.IsActive)}
                    style={{ padding: '0.3rem 0.6rem', backgroundColor: u.IsActive ? '#ffc107' : '#17a2b8', color: '#000', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
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
  );
}