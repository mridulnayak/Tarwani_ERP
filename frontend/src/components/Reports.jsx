import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { API_BASE_URL } from '../config';

const REPORT_TYPES = [
  { id: 'sales', label: 'Sales Orders', needsDate: true, roles: ['Admin', 'Master Admin', 'Sales', 'Sales Team'] },
  { id: 'stock', label: 'Inventory Stock', needsDate: false, roles: ['Admin', 'Master Admin', 'Store', 'Store Manager', 'Production', 'Factory Floor'] },
  { id: 'production', label: 'Production Yield', needsDate: true, roles: ['Admin', 'Master Admin', 'Production', 'Factory Floor'] },
  { id: 'purchases', label: 'Purchase GRN', needsDate: true, roles: ['Admin', 'Master Admin', 'Store', 'Store Manager'] }
];

export default function Reports({ user }) {
  const allowedReports = REPORT_TYPES.filter(
    (r) => !user?.role || r.roles.includes(user.role)
  );

  const today = new Date().toISOString().slice(0, 10);
  const firstOfMonth = `${today.slice(0, 7)}-01`;

  const [activeReport, setActiveReport] = useState(allowedReports[0]?.id || 'sales');
  const [fromDate, setFromDate] = useState(firstOfMonth);
  const [toDate, setToDate] = useState(today);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const currentMeta = REPORT_TYPES.find((r) => r.id === activeReport);

  const fetchReport = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('erp_token');
      const params = currentMeta?.needsDate ? `?from=${fromDate}&to=${toDate}` : '';
      const res = await fetch(`${API_BASE_URL}/reports/${activeReport}${params}`, {
        headers: { 'x-access-token': token }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load report');
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [activeReport]);

  const getFileName = (ext) => {
    const suffix = currentMeta?.needsDate ? `${fromDate}_to_${toDate}` : today;
    return `Tarwani_${activeReport}_report_${suffix}.${ext}`;
  };

  // --- EXPORT AS REAL EXCEL (.xlsx) ---
  const exportToExcel = () => {
    if (rows.length === 0) return alert('No data to export.');

    const worksheet = XLSX.utils.json_to_sheet(rows);

    // Auto-size columns based on header & content length
    const headers = Object.keys(rows[0]);
    worksheet['!cols'] = headers.map((key) => {
      const maxLen = Math.max(
        key.length,
        ...rows.map((row) => String(row[key] ?? '').length)
      );
      return { wch: Math.min(maxLen + 4, 35) };
    });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, currentMeta?.label || 'Report');
    XLSX.writeFile(workbook, getFileName('xlsx'));
  };

  // --- EXPORT AS CSV (.csv with UTF-8 BOM for ₹ symbol support) ---
  const exportToCSV = () => {
    if (rows.length === 0) return alert('No data to export.');

    const headers = Object.keys(rows[0]);
    const escapeCell = (val) => {
      const str = String(val ?? '');
      return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
    };

    const csvLines = [
      headers.map(escapeCell).join(','),
      ...rows.map((row) => headers.map((h) => escapeCell(row[h])).join(','))
    ];

    const blob = new Blob(['\uFEFF' + csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = getFileName('csv');
    link.click();
    URL.revokeObjectURL(url);
  };

  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
      {/* HEADER */}
      <div className="p-5 border-b border-gray-200 bg-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-800 uppercase tracking-wide">Reports & Exports</h2>
          <p className="text-sm text-gray-500 mt-1">Filter operational data and download Excel (.xlsx) or CSV spreadsheets.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportToExcel}
            disabled={rows.length === 0 || loading}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
          >
            📊 Export Excel (.xlsx)
          </button>
          <button
            type="button"
            onClick={exportToCSV}
            disabled={rows.length === 0 || loading}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-900 disabled:bg-gray-300 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
          >
            📄 Export CSV
          </button>
        </div>
      </div>

      {/* REPORT TABS & DATE FILTERS */}
      <div className="p-4 border-b border-gray-200 bg-white flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex flex-wrap gap-2">
          {allowedReports.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveReport(tab.id)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                activeReport === tab.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {currentMeta?.needsDate && (
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs text-gray-900"
            />
            <span className="text-xs text-gray-400 font-bold">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs text-gray-900"
            />
            <button
              type="button"
              onClick={fetchReport}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors"
            >
              Apply
            </button>
          </div>
        )}
      </div>

      {/* STATUS & DATA TABLE */}
      {error && <div className="p-4 bg-red-50 text-red-700 text-sm font-semibold">{error}</div>}

      <div className="w-full overflow-x-auto">
        {loading ? (
          <div className="p-10 text-center text-gray-500 font-bold text-sm">Loading report data...</div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">No records found for this filter.</div>
        ) : (
          <table className="w-full text-left text-xs text-gray-700">
            <thead className="bg-gray-100 text-gray-600 uppercase border-b border-gray-200">
              <tr>
                {columns.map((col) => (
                  <th key={col} className="px-4 py-3 font-bold whitespace-nowrap">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rows.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50 bg-white">
                  {columns.map((col) => (
                    <td key={col} className="px-4 py-3 whitespace-nowrap font-medium">
                      {row[col] === 'LOW STOCK' ? (
                        <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold text-[11px]">
                          LOW STOCK
                        </span>
                      ) : (
                        row[col] ?? '—'
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* FOOTER COUNT */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 font-semibold flex justify-between">
        <span>Total Records: {rows.length}</span>
        {activeReport === 'sales' && rows.length > 0 && (
          <span className="text-green-700 font-bold">
            Total Sales Value: ₹
            {rows.reduce((sum, r) => sum + Number(r['Line Total'] || 0), 0).toLocaleString('en-IN')}
          </span>
        )}
      </div>
    </div>
  );
}