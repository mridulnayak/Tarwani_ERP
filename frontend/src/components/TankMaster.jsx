import { useState, useEffect } from 'react';

export default function TankMaster() {
  const [tanks, setTanks] = useState([]);
  const [tankName, setTankName] = useState('');
  const [capacity, setCapacity] = useState('');

  const fetchTanks = async () => {
    const res = await fetch('http://localhost:5000/api/tanks');
    setTanks(await res.json());
  };

  useEffect(() => { fetchTanks(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!tankName || !capacity) return;
    const res = await fetch('http://localhost:5000/api/tanks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tankName, capacity: parseInt(capacity) })
    });
    if (res.ok) { setTankName(''); setCapacity(''); fetchTanks(); }
  };

  return (
    <div style={{ padding: '1.5rem', backgroundColor: '#1e1e1e', borderRadius: '8px', marginBottom: '2rem', border: '1px solid #333' }}>
      <h2 style={{ marginTop: 0 }}>Tank Master</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <input type="text" value={tankName} onChange={(e) => setTankName(e.target.value)} placeholder="Tank Name (e.g., Silo A)" style={{ padding: '0.75rem', flex: 2, minWidth: '200px', borderRadius: '4px', backgroundColor: '#2d2d2d', color: '#fff', border: '1px solid #444' }} />
        <input type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="Capacity (Liters)" style={{ padding: '0.75rem', flex: 1, minWidth: '150px', borderRadius: '4px', backgroundColor: '#2d2d2d', color: '#fff', border: '1px solid #444' }} />
        <button type="submit" style={{ padding: '0.75rem 1.5rem', backgroundColor: '#17a2b8', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Save Tank</button>
      </form>

      {/* TANK DATA TABLE */}
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
        <thead>
          <tr style={{ backgroundColor: '#2d2d2d' }}>
            <th style={{ padding: '0.75rem', borderBottom: '2px solid #444' }}>ID</th>
            <th style={{ padding: '0.75rem', borderBottom: '2px solid #444' }}>Tank Name</th>
            <th style={{ padding: '0.75rem', borderBottom: '2px solid #444' }}>Max Capacity</th>
            <th style={{ padding: '0.75rem', borderBottom: '2px solid #444' }}>Current Stock</th>
          </tr>
        </thead>
        <tbody>
          {tanks.map((t) => (
            <tr key={t.TankID} style={{ borderBottom: '1px solid #333' }}>
              <td style={{ padding: '0.75rem' }}>{t.TankID}</td>
              <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>{t.TankName}</td>
              <td style={{ padding: '0.75rem', color: '#aaa' }}>{t.Capacity}</td>
              <td style={{ padding: '0.75rem', color: '#28a745', fontWeight: 'bold' }}>{t.CurrentStock}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}