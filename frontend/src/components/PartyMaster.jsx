import { useState, useEffect } from 'react';
import Select from 'react-select'; // Enterprise searchable dropdown

export default function PartyMaster({ user }) {
  const [parties, setParties] = useState([]);
  const [designations, setDesignations] = useState([]);
  
  // Form State
  const [partyName, setPartyName] = useState('');
  const [partyType, setPartyType] = useState('Employee'); 
  const [selectedDesignationId, setSelectedDesignationId] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [address, setAddress] = useState('');
  const [gstNumber, setGstNumber] = useState(''); 
  
  // Enterprise Features State
  const [searchTerm, setSearchTerm] = useState(''); 
  const [editingId, setEditingId] = useState(null);

  const fetchData = async () => {
    try {
      const pRes = await fetch('http://localhost:5000/api/parties');
      setParties(await pRes.json());
      const dRes = await fetch('http://localhost:5000/api/designations');
      setDesignations(await dRes.json());
    } catch (error) { console.error(error); }
  };

  useEffect(() => { fetchData(); }, []);

  // Format designations for react-select
  const designationOptions = designations.map(d => ({
    value: d.DesignationID,
    label: d.DesignationName
  }));
  const selectedDesigOption = designationOptions.find(opt => opt.value === selectedDesignationId) || null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!partyName) return alert("Name is required");
    if (partyType === 'Employee' && !selectedDesignationId) return alert("Select a designation");

    const method = editingId ? 'PUT' : 'POST';
    const url = editingId 
      ? `http://localhost:5000/api/parties/${editingId}` 
      : 'http://localhost:5000/api/parties';

    try {
      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          partyName, 
          partyType, 
          designationId: partyType === 'Employee' ? selectedDesignationId : null, 
          contactNumber: partyType !== 'Employee' ? contactNumber : null, 
          address: partyType !== 'Employee' ? address : null, 
          gstNumber: partyType !== 'Employee' ? gstNumber : null 
        })
      });
      
      if (res.ok) {
        cancelEdit();
        fetchData(); 
      } else {
        alert("Failed to save party.");
      }
    } catch (error) { console.error("Error saving party:", error); }
  };

  const handleEdit = (party) => {
    setPartyName(party.PartyName);
    setPartyType(party.PartyType);
    setSelectedDesignationId(party.DesignationID || '');
    setContactNumber(party.ContactNumber || '');
    setAddress(party.Address || '');
    setGstNumber(party.GSTNumber || '');
    setEditingId(party.PartyID);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this entity? This action cannot be undone.")) return;

    try {
      const res = await fetch(`http://localhost:5000/api/parties/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
      } else {
        alert("Failed to delete. This party might be tied to existing orders or transactions.");
      }
    } catch (error) {
      console.error("Error deleting party:", error);
    }
  };

  const cancelEdit = () => {
    setPartyName(''); 
    setPartyType('Employee');
    setSelectedDesignationId(''); 
    setContactNumber(''); 
    setAddress(''); 
    setGstNumber('');
    setEditingId(null);
  };

  const filteredParties = parties.filter((p) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      p.PartyName.toLowerCase().includes(searchLower) ||
      p.PartyType.toLowerCase().includes(searchLower) ||
      (p.ContactNumber && p.ContactNumber.toLowerCase().includes(searchLower)) ||
      (p.GSTNumber && p.GSTNumber.toLowerCase().includes(searchLower)) ||
      (p.DesignationName && p.DesignationName.toLowerCase().includes(searchLower))
    );
  });

  const getBadgeStyle = (type) => {
    switch(type) {
      case 'Employee': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Vendor': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Customer': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
      
      {/* HEADER */}
      <div className="p-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-800 uppercase tracking-wide">
          {editingId ? 'Edit Party' : 'Party Master'}
        </h2>
        {editingId && (
          <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-3 py-1 rounded-full border border-yellow-200">
            Editing Mode Active
          </span>
        )}
      </div>
      
      {/* FORM SECTION */}
      <div className="p-5 md:p-6 bg-white">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          
          {/* Row 1: Type & Name */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">Party Type</label>
              <select 
                value={partyType} 
                onChange={(e) => {
                  setPartyType(e.target.value);
                  if (e.target.value !== 'Employee') setSelectedDesignationId('');
                }} 
                disabled={editingId !== null} // Prevent changing type while editing to maintain DB integrity
                className="w-full p-2.5 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
              >
                <option value="Employee">Employee</option>
                <option value="Vendor">Vendor</option>
                <option value="Customer">Customer</option>
              </select>
            </div>
            
            <div className="flex flex-col gap-1 md:col-span-2">
              <label className="text-xs font-semibold text-gray-500 uppercase">{partyType} Name</label>
              <input 
                type="text" 
                value={partyName} 
                onChange={(e) => setPartyName(e.target.value)} 
                placeholder={`Enter ${partyType} Name...`} 
                className="w-full p-2.5 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Row 2: Conditional Fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {partyType === 'Employee' ? (
              <div className="flex flex-col gap-1 md:col-span-1">
                <label className="text-xs font-semibold text-gray-500 uppercase">Designation</label>
                <Select
                  options={designationOptions}
                  value={selectedDesigOption}
                  onChange={(selected) => setSelectedDesignationId(selected ? selected.value : '')}
                  isClearable
                  placeholder="Search designation..."
                  className="text-gray-900 text-sm"
                  styles={{
                    control: (base) => ({
                      ...base, backgroundColor: '#f9fafb', borderColor: '#d1d5db', padding: '1px', borderRadius: '0.5rem', boxShadow: 'none', '&:hover': { borderColor: '#3b82f6' }
                    })
                  }}
                />
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase">Contact Number</label>
                  <input type="text" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} placeholder="Phone/Mobile" className="w-full p-2.5 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase">Address</label>
                  <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Full Address" className="w-full p-2.5 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase">GST Number</label>
                  <input type="text" value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} placeholder="Optional" className="w-full p-2.5 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-blue-500 focus:border-blue-500" />
                </div>
              </>
            )}
          </div>

          <div className="pt-2 flex gap-2">
            <button 
              type="submit" 
              className={`flex-1 md:w-auto px-8 py-2.5 text-white font-bold rounded-lg shadow-sm transition-colors focus:ring-4 ${editingId ? 'bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-300' : 'bg-green-600 hover:bg-green-700 focus:ring-green-300'}`}
            >
              {editingId ? `Update ${partyType}` : `+ Save ${partyType}`}
            </button>
            {editingId && (
              <button 
                type="button" 
                onClick={cancelEdit}
                className="px-6 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-lg transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* DATA DISPLAY SECTION */}
      <div className="border-t border-gray-200">
        
        {/* Search Bar */}
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <span className="text-gray-500">🔍</span>
            </div>
            <input 
              type="text" 
              placeholder="Search Parties by Name, Type, Role, or GST..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 p-2.5 bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all"
            />
          </div>
        </div>

        {/* MOBILE VIEW: Cards */}
        <div className="md:hidden divide-y divide-gray-200">
          {filteredParties.map((p) => (
            <div key={p.PartyID} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <span className="font-bold text-gray-900 text-lg">{p.PartyName}</span>
                <span className={`px-2.5 py-0.5 border rounded-full text-xs font-semibold ${getBadgeStyle(p.PartyType)}`}>
                  {p.PartyType}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                {p.PartyType === 'Employee' 
                  ? <p className="flex items-center gap-1"><span>💼</span> Role: <span className="font-semibold text-gray-800">{p.DesignationName}</span></p>
                  : (
                    <div className="flex flex-col gap-1 mt-2">
                      <p className="flex items-center gap-1"><span>📞</span> {p.ContactNumber || 'N/A'}</p>
                      <p className="flex items-center gap-1">
                        <span>🏢</span> {p.GSTNumber ? <span className="font-mono text-xs font-semibold text-gray-800">{p.GSTNumber}</span> : 'No GST'}
                      </p>
                    </div>
                  )
                }
              </div>
              {/* Admin Actions Mobile */}
              {user?.role === 'Admin' && (
                <div className="flex gap-2 mt-4 border-t border-gray-100 pt-3">
                  <button onClick={() => handleEdit(p)} className="flex-1 p-2 bg-blue-50 text-blue-700 rounded-md font-bold text-xs hover:bg-blue-100 transition-colors">Edit</button>
                  <button onClick={() => handleDelete(p.PartyID)} className="flex-1 p-2 bg-red-50 text-red-700 rounded-md font-bold text-xs hover:bg-red-100 transition-colors">Delete</button>
                </div>
              )}
            </div>
          ))}
          {filteredParties.length === 0 && (
             <div className="p-6 text-center text-gray-500">No records found matching your search.</div>
          )}
        </div>

        {/* DESKTOP VIEW: Table */}
        <div className="hidden md:block w-full overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="text-xs text-gray-700 uppercase bg-gray-100 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-semibold">Type</th>
                <th className="px-6 py-4 font-semibold">Name</th>
                <th className="px-6 py-4 font-semibold">Details / GST</th>
                {user?.role === 'Admin' && <th className="px-6 py-4 font-semibold text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredParties.map((p) => (
                <tr key={p.PartyID} className="hover:bg-gray-50 transition-colors bg-white group">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-1 border rounded-full text-xs font-semibold ${getBadgeStyle(p.PartyType)}`}>
                      {p.PartyType}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold text-gray-900 whitespace-nowrap">{p.PartyName}</td>
                  <td className="px-6 py-4">
                    {p.PartyType === 'Employee' 
                      ? <span className="font-semibold text-gray-800 bg-gray-100 px-2 py-1 rounded-md border border-gray-200">Role: {p.DesignationName}</span> 
                      : <span className="text-gray-500">{p.ContactNumber || 'N/A'} <span className="mx-2 text-gray-300">|</span> {p.GSTNumber ? <span className="font-mono font-semibold text-gray-800">GST: {p.GSTNumber}</span> : 'No GST'}</span>}
                  </td>
                  {/* Admin Actions Desktop */}
                  {user?.role === 'Admin' && (
                    <td className="px-6 py-4 text-right opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      <button onClick={() => handleEdit(p)} className="text-blue-600 hover:text-blue-800 font-semibold mr-4 transition-colors">Edit</button>
                      <button onClick={() => handleDelete(p.PartyID)} className="text-red-600 hover:text-red-800 font-semibold transition-colors">Delete</button>
                    </td>
                  )}
                </tr>
              ))}
              {filteredParties.length === 0 && (
                <tr>
                  <td colSpan={user?.role === 'Admin' ? 4 : 3} className="px-6 py-8 text-center text-gray-500">
                    No records found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}