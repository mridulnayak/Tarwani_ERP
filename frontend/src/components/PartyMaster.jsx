import { useState, useEffect } from 'react';

export default function PartyMaster() {
  const [parties, setParties] = useState([]);
  const [partyName, setPartyName] = useState('');
  const [partyType, setPartyType] = useState('Employee'); 
  const [selectedDesignationId, setSelectedDesignationId] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [address, setAddress] = useState('');
  const [gstNumber, setGstNumber] = useState(''); // New GST State
  
  const [searchTerm, setSearchTerm] = useState(''); // New Search State
  const [designations, setDesignations] = useState([]);

  const fetchData = async () => {
    try {
      const pRes = await fetch('http://localhost:5000/api/parties');
      setParties(await pRes.json());
      const dRes = await fetch('http://localhost:5000/api/designations');
      setDesignations(await dRes.json());
    } catch (error) { console.error(error); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!partyName) return alert("Name is required");
    if (partyType === 'Employee' && !selectedDesignationId) return alert("Select a designation");

    try {
      const res = await fetch('http://localhost:5000/api/parties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          partyName, partyType, designationId: selectedDesignationId, contactNumber, address, gstNumber 
        })
      });
      
      if (res.ok) {
        setPartyName(''); setSelectedDesignationId(''); setContactNumber(''); setAddress(''); setGstNumber('');
        fetchData(); 
      }
    } catch (error) { console.error("Error saving party:", error); }
  };

  // REAL-TIME SEARCH LOGIC
  const filteredParties = parties.filter((p) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      p.PartyName.toLowerCase().includes(searchLower) ||
      p.PartyType.toLowerCase().includes(searchLower) ||
      (p.ContactNumber && p.ContactNumber.toLowerCase().includes(searchLower)) ||
      (p.GSTNumber && p.GSTNumber.toLowerCase().includes(searchLower))
    );
  });

  return (
    <div style={{ padding: '1.5rem', backgroundColor: '#1e1e1e', borderRadius: '8px', marginBottom: '2rem', border: '1px solid #333' }}>
      <h2 style={{ marginTop: 0 }}>Party Master</h2>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <select value={partyType} onChange={(e) => setPartyType(e.target.value)} style={{ padding: '0.75rem', flex: 1, minWidth: '150px', borderRadius: '4px', backgroundColor: '#2d2d2d', color: '#fff', border: '1px solid #444' }}>
            <option value="Employee">Employee</option>
            <option value="Vendor">Vendor</option>
            <option value="Customer">Customer</option>
          </select>
          <input type="text" value={partyName} onChange={(e) => setPartyName(e.target.value)} placeholder={`${partyType} Name`} style={{ padding: '0.75rem', flex: 2, minWidth: '200px', borderRadius: '4px', backgroundColor: '#2d2d2d', color: '#fff', border: '1px solid #444' }} />
        </div>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {partyType === 'Employee' && (
            <select value={selectedDesignationId} onChange={(e) => setSelectedDesignationId(e.target.value)} style={{ padding: '0.75rem', flex: 1, borderRadius: '4px', backgroundColor: '#2d2d2d', color: '#fff', border: '1px solid #444' }}>
              <option value="" disabled>-- Select Designation --</option>
              {designations.map((desig) => (
                <option key={desig.DesignationID} value={desig.DesignationID}>{desig.DesignationName}</option>
              ))}
            </select>
          )}

          {partyType !== 'Employee' && (
            <>
              <input type="text" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} placeholder="Contact Number" style={{ padding: '0.75rem', flex: 1, borderRadius: '4px', backgroundColor: '#2d2d2d', color: '#fff', border: '1px solid #444' }} />
              <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Full Address" style={{ padding: '0.75rem', flex: 2, borderRadius: '4px', backgroundColor: '#2d2d2d', color: '#fff', border: '1px solid #444' }} />
              {/* NEW OPTIONAL GST INPUT */}
              <input type="text" value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} placeholder="GST Number (Optional)" style={{ padding: '0.75rem', flex: 1, borderRadius: '4px', backgroundColor: '#2d2d2d', color: '#fff', border: '1px solid #444' }} />
            </>
          )}
        </div>
        <button type="submit" style={{ padding: '0.75rem', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Save {partyType}</button>
      </form>

      {/* SEARCH BAR UI */}
      <div style={{ marginBottom: '1rem' }}>
        <input 
          type="text" 
          placeholder="🔍 Search Parties by Name, Type, or GST..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', backgroundColor: '#2d2d2d', color: '#fff', border: '1px solid #007bff' }}
        />
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
        <thead>
          <tr style={{ backgroundColor: '#2d2d2d' }}>
            <th style={{ padding: '0.75rem', borderBottom: '2px solid #444' }}>Type</th>
            <th style={{ padding: '0.75rem', borderBottom: '2px solid #444' }}>Name</th>
            <th style={{ padding: '0.75rem', borderBottom: '2px solid #444' }}>Details / GST</th>
          </tr>
        </thead>
        <tbody>
          {/* We map over filteredParties instead of parties */}
          {filteredParties.map((p) => (
            <tr key={p.PartyID} style={{ borderBottom: '1px solid #333' }}>
              <td style={{ padding: '0.75rem' }}>
                <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', backgroundColor: p.PartyType === 'Employee' ? '#007bff' : p.PartyType === 'Vendor' ? '#fd7e14' : '#6f42c1' }}>
                  {p.PartyType}
                </span>
              </td>
              <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>{p.PartyName}</td>
              <td style={{ padding: '0.75rem', color: '#aaa' }}>
                {p.PartyType === 'Employee' 
                  ? `Role: ${p.DesignationName}` 
                  : `${p.ContactNumber} | ${p.GSTNumber ? `GST: ${p.GSTNumber}` : 'No GST'}`}
              </td>
            </tr>
          ))}
          {filteredParties.length === 0 && (
             <tr><td colSpan="3" style={{ padding: '1rem', textAlign: 'center', color: '#888' }}>No records found.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}