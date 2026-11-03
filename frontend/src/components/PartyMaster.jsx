import { useState, useEffect } from 'react';
import Select from 'react-select'; 

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
  
  // Enterprise Features & Filter State
  const [searchTerm, setSearchTerm] = useState(''); 
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('ALL'); // 👈 NEW: Type Filter State
  const [editingId, setEditingId] = useState(null);
  const [isFormVisible, setIsFormVisible] = useState(false);

  const partyTypeOptions = [
    { value: 'Employee', label: 'Employee' },
    { value: 'Vendor', label: 'Vendor' },
    { value: 'Customer', label: 'Customer' }
  ];

  const typeFilterOptions = [
    { value: 'ALL', label: 'All Types (All)' },
    { value: 'Employee', label: 'Employees Only' },
    { value: 'Vendor', label: 'Vendors Only' },
    { value: 'Customer', label: 'Customers Only' }
  ];

  const fetchData = async () => {
    const token = localStorage.getItem('erp_token');

    try {
      const pRes = await fetch('https://sms.uvtechsolutions.co.in/api/parties', {
        method: 'GET',
        headers: { 'x-access-token': token }
      });
      if (!pRes.ok) throw new Error(`Parties API Error: ${pRes.status}`);
      const pData = await pRes.json();
      setParties(Array.isArray(pData) ? pData : []);
    } catch (error) { 
      console.error("Error fetching parties:", error); 
      setParties([]); 
    }

    try {
      const dRes = await fetch('https://sms.uvtechsolutions.co.in/api/designations', {
        method: 'GET',
        headers: { 'x-access-token': token }
      });
      if (!dRes.ok) throw new Error(`Designations API Error: ${dRes.status}`);
      const dData = await dRes.json();
      setDesignations(Array.isArray(dData) ? dData : []);
    } catch (error) { 
      console.error("Error fetching designations:", error); 
      setDesignations([]); 
    }
  };

  useEffect(() => { fetchData(); }, []);

  const designationOptions = designations.map(d => ({
    value: d.DesignationID,
    label: d.DesignationName
  }));
  const selectedDesigOption = designationOptions.find(opt => opt.value === selectedDesignationId) || null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!partyName || !partyType) return alert("Please fill in all required fields.");

    const url = editingId 
      ? `https://sms.uvtechsolutions.co.in/api/parties/edit/${editingId}`
      : 'https://sms.uvtechsolutions.co.in/api/parties';

    try {
      const token = localStorage.getItem('erp_token');
      const res = await fetch(url, {
        method: 'POST', 
        headers: { 
          'Content-Type': 'application/json',
          'x-access-token': token 
        },
        body: JSON.stringify({ 
          partyName, 
          partyType, 
          designationId: partyType === 'Employee' ? selectedDesignationId : null,
          phone: contactNumber, 
          address, 
          gstNumber 
        })
      });

      if (res.ok) {
        cancelEdit();
        fetchData();
      } else {
        const errData = await res.json();
        alert(`Failed to save party: ${errData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error saving party:', error);
      alert('Network error while saving party.');
    }
  };

  const handleEdit = (party) => {
    setPartyName(party.PartyName);
    setPartyType(party.PartyType);
    setSelectedDesignationId(party.DesignationID || '');
    setContactNumber(party.ContactNumber || '');
    setAddress(party.Address || '');
    setGstNumber(party.GSTNumber || '');
    setEditingId(party.PartyID);
    setIsFormVisible(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this entity? This action cannot be undone.")) return;

    try {
      const token = localStorage.getItem('erp_token');
      const res = await fetch(`https://sms.uvtechsolutions.co.in/api/parties/delete/${id}`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'x-access-token': token 
        }
      });
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
    setIsFormVisible(false);
  };

  // 👈 UPDATED FILTER LOGIC: Checks both Type dropdown filter and search box keyword
  const filteredParties = parties.filter((p) => {
    const matchesType = selectedTypeFilter === 'ALL' || p.PartyType === selectedTypeFilter;
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = (
      p.PartyName.toLowerCase().includes(searchLower) ||
      p.PartyType.toLowerCase().includes(searchLower) ||
      (p.ContactNumber && p.ContactNumber.toLowerCase().includes(searchLower)) ||
      (p.GSTNumber && p.GSTNumber.toLowerCase().includes(searchLower)) ||
      (p.DesignationName && p.DesignationName.toLowerCase().includes(searchLower))
    );
    return matchesType && matchesSearch;
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
    <div className="bg-white rounded-md shadow-md border border-gray-300 overflow-hidden mb-8">
      
      {/* ENTERPRISE TOOLBAR WITH TYPE FILTER */}
      <div className="p-4 border-b border-gray-300 bg-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-xl font-extrabold text-gray-800 uppercase tracking-wider">
          Party Master
        </h2>
        
        <div className="flex flex-col md:flex-row w-full md:w-auto gap-3 items-center">
          {/* 👈 NEW TYPE FILTER DROPDOWN */}
          <div className="w-full md:w-48">
            <Select
              options={typeFilterOptions}
              value={typeFilterOptions.find(opt => opt.value === selectedTypeFilter) || typeFilterOptions[0]}
              onChange={(selected) => setSelectedTypeFilter(selected ? selected.value : 'ALL')}
              isSearchable={false}
              className="text-gray-900 text-sm"
              classNamePrefix="erp-select"
            />
          </div>

          <input
            type="search"
            placeholder="Search Parties..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-64 p-2 bg-white border border-gray-400 text-gray-900 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-sm text-sm"
          />
          {!isFormVisible && (
            <button
              type="button"
              onClick={() => {
                cancelEdit();
                setIsFormVisible(true);
              }}
              className="whitespace-nowrap w-full md:w-auto px-5 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded shadow-sm transition-colors"
            >
              + Create New
            </button>
          )}
        </div>
      </div>

      {/* DATA ENTRY FORM (Hidden by default) */}
      {isFormVisible && (
        <div className="p-5 bg-blue-50 border-b border-blue-200">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-gray-700 uppercase">Party Type</label>
              <Select
                options={partyTypeOptions}
                value={partyTypeOptions.find(opt => opt.value === partyType) || null}
                onChange={(selected) => {
                  const nextPartyType = selected ? selected.value : '';
                  setPartyType(nextPartyType);
                  if (nextPartyType !== 'Employee') setSelectedDesignationId('');
                }}
                isSearchable
                isClearable={false}
                isDisabled={editingId !== null}
                className="w-full text-gray-900 text-sm"
                classNamePrefix="erp-select"
              />
            </div>
            
            <div className="flex flex-col gap-1 md:col-span-2">
              <label className="text-xs font-bold text-gray-700 uppercase">{partyType} Name</label>
              <input 
                type="text" 
                value={partyName} 
                onChange={(e) => setPartyName(e.target.value)} 
                placeholder={`Enter ${partyType} Name...`} 
                className="w-full p-2 bg-white border border-gray-400 text-gray-900 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {partyType === 'Employee' ? (
              <div className="flex flex-col gap-1 md:col-span-1">
                <label className="text-xs font-bold text-gray-700 uppercase">Designation</label>
                <Select
                  options={designationOptions}
                  value={selectedDesigOption}
                  onChange={(selected) => setSelectedDesignationId(selected ? selected.value : '')}
                  isSearchable
                  isClearable
                  placeholder="Search designation..."
                  className="text-gray-900 text-sm"
                  classNamePrefix="erp-select"
                />
              </div>
            ) : null}

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-gray-700 uppercase">Contact Number</label>
              <input type="text" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} placeholder="Phone/Mobile" className="w-full p-2 bg-white border border-gray-400 text-gray-900 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-gray-700 uppercase">Address</label>
              <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Full Address" className="w-full p-2 bg-white border border-gray-400 text-gray-900 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>

            {partyType !== 'Employee' && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-700 uppercase">GST Number</label>
                <input type="text" value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} placeholder="Optional" className="w-full p-2 bg-white border border-gray-400 text-gray-900 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button 
              type="submit" 
              className={`px-8 py-2 text-white font-bold rounded shadow-sm transition-colors ${editingId ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {editingId ? 'Update' : 'Save'}
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              className="px-6 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold rounded transition-colors"
            >
              Close
            </button>
          </div>
          </form>
        </div>
      )}

      {/* DENSE TABULAR DATA DISPLAY */}
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[800px] text-left text-sm text-gray-800">
          <thead className="text-xs uppercase bg-slate-700 text-white">
            <tr>
              <th className="px-4 py-3 font-bold w-24 border-r border-slate-600">ID</th>
              <th className="px-4 py-3 font-bold border-r border-slate-600">Type</th>
              <th className="px-4 py-3 font-bold border-r border-slate-600">Name</th>
              <th className="px-4 py-3 font-bold border-r border-slate-600">Details</th>
              {user?.role === 'Admin' && (
                <>
                  <th className="px-4 py-3 font-bold w-24 text-center border-r border-slate-600">Edit</th>
                  <th className="px-4 py-3 font-bold w-24 text-center">Delete</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300">
            {filteredParties.map((party) => (
              <tr key={party.PartyID} className="bg-white even:bg-gray-100 hover:bg-yellow-50 transition-colors">
                <td className="px-4 py-2 font-mono text-gray-600 border-r border-gray-200">{party.PartyID}</td>
                <td className="px-4 py-2 border-r border-gray-200">
                  <span className={`px-2 py-0.5 border rounded text-xs font-semibold ${getBadgeStyle(party.PartyType)}`}>
                    {party.PartyType}
                  </span>
                </td>
                <td className="px-4 py-2 font-semibold text-gray-900 border-r border-gray-200">{party.PartyName}</td>
                <td className="px-4 py-2 text-gray-700 border-r border-gray-200">
                  {party.PartyType === 'Employee' ? (
                    <span>Role: {party.DesignationName || 'N/A'}</span>
                  ) : (
                    <span>
                      {party.ContactNumber || 'N/A'}
                      {party.Address && ` | ${party.Address}`}
                      {party.GSTNumber ? ` | GST: ${party.GSTNumber}` : ''}
                    </span>
                  )}
                </td>
                {user?.role === 'Admin' && (
                  <>
                    <td className="px-4 py-2 text-center border-r border-gray-200">
                      <button
                        type="button"
                        onClick={() => handleEdit(party)}
                        className="font-bold text-blue-600 hover:text-blue-800 underline transition-colors"
                      >
                        Edit
                      </button>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleDelete(party.PartyID)}
                        className="font-bold text-red-600 hover:text-red-800 underline transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {filteredParties.length === 0 && (
              <tr>
                <td colSpan={user?.role === 'Admin' ? 6 : 4} className="px-4 py-8 text-center text-gray-500 font-medium">
                  No records found matching your filter and search criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}