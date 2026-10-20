import { useState } from 'react';

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const res = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const data = await res.json();

      if (res.ok) {
        // Save the digital ID card (token) and user details to the browser
        localStorage.setItem('erp_token', data.token);
        localStorage.setItem('erp_user', JSON.stringify(data.user));
        
        // Tell the main App that login was successful
        onLoginSuccess(data.user);
      } else {
        setError("Incorrect Username or Password. Please try again.");
      }
    } catch (err) {
      setError("System is currently offline. Contact Administrator.");
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#121212', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '400px', backgroundColor: '#1e1e1e', padding: '2.5rem', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', border: '1px solid #333' }}>
        
        <h1 style={{ color: '#fff', textAlign: 'center', marginBottom: '0.5rem', fontSize: '2rem' }}>Tarwani Soaps</h1>
        <p style={{ color: '#aaa', textAlign: 'center', marginBottom: '2rem', fontSize: '1.1rem' }}>Factory Management System</p>

        {error && (
          <div style={{ backgroundColor: '#dc3545', color: '#fff', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', textAlign: 'center', fontWeight: 'bold' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', color: '#ccc', marginBottom: '0.5rem', fontSize: '1.1rem' }}>Username</label>
            <input 
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              style={{ width: '100%', padding: '1rem', borderRadius: '8px', backgroundColor: '#2d2d2d', color: '#fff', border: '2px solid #444', fontSize: '1.1rem' }}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', color: '#ccc', marginBottom: '0.5rem', fontSize: '1.1rem' }}>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              style={{ width: '100%', padding: '1rem', borderRadius: '8px', backgroundColor: '#2d2d2d', color: '#fff', border: '2px solid #444', fontSize: '1.1rem' }}
              required
            />
          </div>

          <button type="submit" style={{ width: '100%', padding: '1.2rem', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer', marginTop: '1rem' }}>
            Secure Login
          </button>
        </form>

      </div>
    </div>
  );
}