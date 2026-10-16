import { useState, useEffect } from 'react';

function PartyMaster() {
  const [parties, setParties] = useState([]);
  const [designations, setDesignations] = useState([]);

  const [partyName, setPartyName] = useState('');
  const [partyType, setPartyType] = useState('Employee');
  const [selectedDesignationId, setSelectedDesignationId] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [address, setAddress] = useState('');

  const fetchParties = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/parties');
      setParties(await res.json());
    } catch (error) {
      console.error(error);
    }
  };

  const fetchDesignations = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/designations');
      setDesignations(await res.json());
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchParties();
    fetchDesignations();
  }, []);

  const handlePartySubmit = async (e) => {
    e.preventDefault();

    try {
      const payload =
        partyType === 'Employee'
          ? {
              partyName: partyName,
              partyType: partyType,
              designationId: selectedDesignationId,
            }
          : {
              partyName: partyName,
              partyType: partyType,
              contactNumber: contactNumber,
              address: address,
            };

      const res = await fetch('http://localhost:5000/api/parties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setPartyName('');
        setSelectedDesignationId('');
        setContactNumber('');
        setAddress('');

        fetchParties();
      }
    } catch (error) {
      console.error('Error saving party:', error);
    }
  };

  return (
    <div
      style={{
        padding: '1.5rem',
        backgroundColor: '#1e1e1e',
        borderRadius: '8px',
        marginBottom: '2rem',
        border: '1px solid #333',
      }}
    >
      <h2>Party Master (Employees, Vendors, Customers)</h2>

      <form
        onSubmit={handlePartySubmit}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <select
            value={partyType}
            onChange={(e) => setPartyType(e.target.value)}
            style={{
              padding: '0.75rem',
              flex: 1,
              minWidth: '150px',
              borderRadius: '4px',
              backgroundColor: '#2d2d2d',
              color: '#fff',
            }}
          >
            <option value="Employee">Employee</option>
            <option value="Vendor">Vendor</option>
            <option value="Customer">Customer</option>
          </select>

          <input
            type="text"
            value={partyName}
            onChange={(e) => setPartyName(e.target.value)}
            placeholder={`${partyType} Name`}
            style={{
              padding: '0.75rem',
              flex: 2,
              minWidth: '200px',
              borderRadius: '4px',
              backgroundColor: '#2d2d2d',
              color: '#fff',
            }}
          />
        </div>

        <div
          style={{
            display: 'flex',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          {partyType === 'Employee' && (
            <select
              value={selectedDesignationId}
              onChange={(e) => setSelectedDesignationId(e.target.value)}
              style={{
                padding: '0.75rem',
                flex: 1,
                borderRadius: '4px',
                backgroundColor: '#2d2d2d',
                color: '#fff',
              }}
            >
              <option value="">
                -- Select Designation --
              </option>

              {designations.map((desig) => (
                <option
                  key={desig.DesignationID}
                  value={desig.DesignationID}
                >
                  {desig.DesignationName}
                </option>
              ))}
            </select>
          )}

          {partyType !== 'Employee' && (
            <>
              <input
                type="text"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                placeholder="Contact Number"
                style={{
                  padding: '0.75rem',
                  flex: 1,
                  borderRadius: '4px',
                  backgroundColor: '#2d2d2d',
                  color: '#fff',
                }}
              />

              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Full Address"
                style={{
                  padding: '0.75rem',
                  flex: 2,
                  borderRadius: '4px',
                  backgroundColor: '#2d2d2d',
                  color: '#fff',
                }}
              />
            </>
          )}
        </div>

        <button
          type="submit"
          style={{
            padding: '0.75rem',
            backgroundColor: '#28a745',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          Save {partyType}
        </button>
      </form>

      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          textAlign: 'left',
          fontSize: '0.9rem',
        }}
      >
        <thead>
          <tr style={{ backgroundColor: '#2d2d2d' }}>
            <th style={{ padding: '0.75rem' }}>Type</th>
            <th style={{ padding: '0.75rem' }}>Name</th>
            <th style={{ padding: '0.75rem' }}>Details</th>
          </tr>
        </thead>

        <tbody>
          {parties.map((p) => (
            <tr
              key={p.PartyID}
              style={{
                borderBottom: '1px solid #333',
              }}
            >
              <td style={{ padding: '0.75rem' }}>
                <span
                  style={{
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    backgroundColor:
                      p.PartyType === 'Employee'
                        ? '#007bff'
                        : p.PartyType === 'Vendor'
                        ? '#fd7e14'
                        : '#6f42c1',
                  }}
                >
                  {p.PartyType}
                </span>
              </td>

              <td
                style={{
                  padding: '0.75rem',
                  fontWeight: 'bold',
                }}
              >
                {p.PartyName}
              </td>

              <td
                style={{
                  padding: '0.75rem',
                  color: '#aaa',
                }}
              >
                {p.PartyType === 'Employee'
                  ? `Role: ${p.DesignationName}`
                  : `${p.ContactNumber} | ${p.Address}`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default PartyMaster;