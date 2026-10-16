import { useState, useEffect } from 'react';

export default function BrandMaster() {
  const [brands, setBrands] = useState([]);
  const [brandName, setBrandName] = useState('');

  const fetchBrands = async () => {
    const res = await fetch('http://localhost:5000/api/brands');
    setBrands(await res.json());
  };

  useEffect(() => { fetchBrands(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!brandName) return;
    const res = await fetch('http://localhost:5000/api/brands', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brandName })
    });
    if (res.ok) { setBrandName(''); fetchBrands(); }
  };

  return (
    <div style={{ padding: '1.5rem', backgroundColor: '#1e1e1e', borderRadius: '8px', marginBottom: '2rem', border: '1px solid #333' }}>
      <h2 style={{ marginTop: 0 }}>Brand Master</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
        <input type="text" value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="Brand Name" style={{ padding: '0.75rem', flex: 1, borderRadius: '4px', backgroundColor: '#2d2d2d', color: '#fff', border: '1px solid #444' }} />
        <button type="submit" style={{ padding: '0.75rem 1.5rem', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Save Brand</button>
      </form>

      {/* BRAND DATA TABLE */}
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
        <thead>
          <tr style={{ backgroundColor: '#2d2d2d' }}>
            <th style={{ padding: '0.75rem', borderBottom: '2px solid #444' }}>ID</th>
            <th style={{ padding: '0.75rem', borderBottom: '2px solid #444' }}>Brand Name</th>
          </tr>
        </thead>
        <tbody>
          {brands.map((b) => (
            <tr key={b.BrandID} style={{ borderBottom: '1px solid #333' }}>
              <td style={{ padding: '0.75rem' }}>{b.BrandID}</td>
              <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>{b.BrandName}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}