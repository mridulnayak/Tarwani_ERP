import { useState, useEffect } from 'react';

function DesignationMaster() {
  const [designations, setDesignations] = useState([]);
  const [designationName, setDesignationName] = useState('');

  const fetchDesignations = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/designations');
      setDesignations(await res.json());
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchDesignations();
  }, []);

  const handleDesignationSubmit = async (e) => {
    e.preventDefault();

    if (!designationName) return;

    try {
      const res = await fetch('http://localhost:5000/api/designations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ designationName }),
      });

      if (res.ok) {
        setDesignationName('');
        fetchDesignations();
      }
    } catch (error) {
      console.error('Error saving designation:', error);
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
      <h2>Designation Master</h2>

      <form
        onSubmit={handleDesignationSubmit}
        style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '1rem',
        }}
      >
        <input
          type="text"
          value={designationName}
          onChange={(e) => setDesignationName(e.target.value)}
          placeholder="Designation Name"
          style={{
            flex: 1,
            padding: '0.75rem',
            backgroundColor: '#2d2d2d',
            color: '#fff',
            borderRadius: '4px',
          }}
        />

        <button
          type="submit"
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: '#007bff',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
          }}
        >
          Save Designation
        </button>
      </form>

      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
        }}
      >
        <thead>
          <tr>
            <th
              style={{
                padding: '0.75rem',
                borderBottom: '1px solid #444',
                textAlign: 'left',
              }}
            >
              ID
            </th>

            <th
              style={{
                padding: '0.75rem',
                borderBottom: '1px solid #444',
                textAlign: 'left',
              }}
            >
              Designation
            </th>
          </tr>
        </thead>

        <tbody>
          {designations.map((designation) => (
            <tr key={designation.DesignationID}>
              <td style={{ padding: '0.75rem' }}>
                {designation.DesignationID}
              </td>

              <td style={{ padding: '0.75rem' }}>
                {designation.DesignationName}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default DesignationMaster;