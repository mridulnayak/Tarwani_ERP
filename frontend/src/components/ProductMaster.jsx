import { useState, useEffect } from 'react';

export default function ProductMaster() {
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [productName, setProductName] = useState('');
  const [brandId, setBrandId] = useState('');

  const fetchData = async () => {
    const pRes = await fetch('http://localhost:5000/api/products');
    setProducts(await pRes.json());
    const bRes = await fetch('http://localhost:5000/api/brands');
    setBrands(await bRes.json());
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!productName || !brandId) return alert("Select a brand and enter a product name");
    const res = await fetch('http://localhost:5000/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productName, brandId })
    });
    if (res.ok) { setProductName(''); setBrandId(''); fetchData(); }
  };

  return (
    <div style={{ padding: '1.5rem', backgroundColor: '#1e1e1e', borderRadius: '8px', marginBottom: '2rem', border: '1px solid #333' }}>
      <h2 style={{ marginTop: 0 }}>Product Master</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
        <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Product Name" style={{ padding: '0.75rem', flex: 2, borderRadius: '4px', backgroundColor: '#2d2d2d', color: '#fff', border: '1px solid #444' }} />
        <select value={brandId} onChange={(e) => setBrandId(e.target.value)} style={{ padding: '0.75rem', flex: 1, borderRadius: '4px', backgroundColor: '#2d2d2d', color: '#fff', border: '1px solid #444' }}>
          <option value="" disabled>-- Select Brand --</option>
          {brands.map(b => <option key={b.BrandID} value={b.BrandID}>{b.BrandName}</option>)}
        </select>
        <button type="submit" style={{ padding: '0.75rem 1.5rem', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Save Product</button>
      </form>

      {/* PRODUCT DATA TABLE */}
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
        <thead>
          <tr style={{ backgroundColor: '#2d2d2d' }}>
            <th style={{ padding: '0.75rem', borderBottom: '2px solid #444' }}>ID</th>
            <th style={{ padding: '0.75rem', borderBottom: '2px solid #444' }}>Product Name</th>
            <th style={{ padding: '0.75rem', borderBottom: '2px solid #444' }}>Brand</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.ProductID} style={{ borderBottom: '1px solid #333' }}>
              <td style={{ padding: '0.75rem' }}>{p.ProductID}</td>
              <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>{p.ProductName}</td>
              <td style={{ padding: '0.75rem', color: '#aaa' }}>{p.BrandName}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}