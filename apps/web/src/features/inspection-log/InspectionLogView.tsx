import React, { useState, useMemo } from 'react';
import {
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import type { InspectionEvent } from '@hawkeye/shared';
import { formatTime, formatDateTime, formatDimension, formatConfidence } from '@/lib/format';
import { StatusPill } from '@/components/ui/StatusPill';

interface InspectionLogViewProps {
  events: InspectionEvent[];
}

export const InspectionLogView: React.FC<InspectionLogViewProps> = ({ events }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [defectFilter, setDefectFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [sortField, setSortField] = useState<'timestamp' | 'billetId' | 'status'>('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const filteredEvents = useMemo(() => {
    return events
      .filter((ev) => {
        if (searchQuery.trim() && !ev.billetId.toLowerCase().includes(searchQuery.toLowerCase().trim())) {
          return false;
        }
        if (statusFilter !== 'ALL' && ev.status !== statusFilter) {
          return false;
        }
        if (defectFilter !== 'ALL') {
          if (defectFilter === 'Crack' && ev.defectCategory !== 'Crack') return false;
          if (defectFilter === 'Scratch' && ev.defectCategory !== 'Scratch') return false;
          if (defectFilter === 'Dimension' && ev.defectCategory !== 'Dimension') return false;
          if (defectFilter === 'OCR' && ev.defectCategory !== 'OCR') return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortField === 'timestamp') {
          const tA = new Date(a.timestamp).getTime();
          const tB = new Date(b.timestamp).getTime();
          return sortOrder === 'asc' ? tA - tB : tB - tA;
        } else if (sortField === 'billetId') {
          return sortOrder === 'asc'
            ? a.billetId.localeCompare(b.billetId)
            : b.billetId.localeCompare(a.billetId);
        } else {
          return sortOrder === 'asc'
            ? a.status.localeCompare(b.status)
            : b.status.localeCompare(a.status);
        }
      });
  }, [events, searchQuery, statusFilter, defectFilter, sortField, sortOrder]);

  const totalRows = filteredEvents.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const startIndex = (currentPage - 1) * rowsPerPage;
  const currentRows = filteredEvents.slice(startIndex, startIndex + rowsPerPage);

  const handleExportExcel = () => {
    const exportData = filteredEvents.map((row) => ({
      Timestamp: formatDateTime(row.timestamp),
      'Billet ID': row.billetId,
      'Length (mm)': row.lengthMm,
      'Width (mm)': row.widthMm,
      'Height (mm)': row.heightMm,
      Defect: row.defect,
      'Confidence (%)': Math.round(row.confidence * 100),
      Status: row.status,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inspection_Log');
    const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');
    XLSX.writeFile(workbook, `Hawkeye_Inspection_Log_${timestampStr}.xlsx`);
  };

  const handleSort = (field: 'timestamp' | 'billetId' | 'status') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div
        className="bv-card"
        style={{
          padding: '12px var(--space-6)',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 'var(--space-4)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: '320px' }}>
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              placeholder="Search billet ID"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                width: '100%',
                height: '40px',
                paddingLeft: '38px',
                paddingRight: '12px',
                borderRadius: 'var(--radius-control)',
                border: '1px solid var(--border-strong)',
                backgroundColor: 'var(--surface-card)',
                color: 'var(--text-primary)',
                fontSize: '0.875rem',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                height: '40px',
                padding: '0 12px',
                borderRadius: 'var(--radius-control)',
                border: '1px solid var(--border-strong)',
                backgroundColor: 'var(--surface-card)',
                color: 'var(--text-primary)',
                fontSize: '0.875rem',
              }}
            >
              <option value="ALL">All Statuses</option>
              <option value="PASS">PASS</option>
              <option value="FAIL">FAIL</option>
              <option value="REWORK">REWORK</option>
              <option value="REVIEW">REVIEW</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Defect:</span>
            <select
              value={defectFilter}
              onChange={(e) => {
                setDefectFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                height: '40px',
                padding: '0 12px',
                borderRadius: 'var(--radius-control)',
                border: '1px solid var(--border-strong)',
                backgroundColor: 'var(--surface-card)',
                color: 'var(--text-primary)',
                fontSize: '0.875rem',
              }}
            >
              <option value="ALL">All Defects</option>
              <option value="Crack">Crack</option>
              <option value="Scratch">Scratch</option>
              <option value="Dimension">Dimension</option>
              <option value="OCR">OCR</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleExportExcel}
          title="Exports the current filters"
          style={{
            height: '40px',
            padding: '0 20px',
            borderRadius: 'var(--radius-control)',
            backgroundColor: 'var(--accent)',
            color: '#FFFFFF',
            fontSize: '1rem',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 1px 2px rgba(47, 111, 237, 0.2)',
            transition: 'background-color 150ms ease-out',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent)')}
        >
          <Download size={18} strokeWidth={2} />
          <span>Export to Excel</span>
        </button>
      </div>

      <div
        className="bv-card"
        style={{
          padding: 0,
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr
                style={{
                  backgroundColor: 'var(--surface-sunken)',
                  height: '44px',
                  borderBottom: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                }}
              >
                <th
                  onClick={() => handleSort('timestamp')}
                  style={{ padding: '0 20px', cursor: 'pointer', userSelect: 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>Time</span>
                    <ArrowUpDown size={14} />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('billetId')}
                  style={{ padding: '0 20px', cursor: 'pointer', userSelect: 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>Billet ID</span>
                    <ArrowUpDown size={14} />
                  </div>
                </th>
                <th style={{ padding: '0 20px', textAlign: 'right' }}>Length</th>
                <th style={{ padding: '0 20px', textAlign: 'right' }}>Width</th>
                <th style={{ padding: '0 20px', textAlign: 'right' }}>Height</th>
                <th style={{ padding: '0 20px' }}>Defect</th>
                <th style={{ padding: '0 20px', textAlign: 'right' }}>Confidence</th>
                <th
                  onClick={() => handleSort('status')}
                  style={{ padding: '0 20px', cursor: 'pointer', userSelect: 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>Status</span>
                    <ArrowUpDown size={14} />
                  </div>
                </th>
              </tr>
            </thead>

            <tbody>
              {currentRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      padding: '48px 0',
                      textAlign: 'center',
                      color: 'var(--text-muted)',
                      fontSize: '0.875rem',
                    }}
                  >
                    No matching inspection records found.
                  </td>
                </tr>
              ) : (
                currentRows.map((row) => (
                  <tr
                    key={row.eventId}
                    style={{
                      height: '52px',
                      borderBottom: '1px solid var(--border)',
                      fontSize: '1rem',
                      color: 'var(--text-primary)',
                      transition: 'background-color 150ms ease-out',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F7F9FC')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td className="tabular" style={{ padding: '0 20px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                      {formatTime(row.timestamp)}
                    </td>
                    <td className="font-mono" style={{ padding: '0 20px', fontWeight: 500 }}>
                      {row.billetId}
                    </td>
                    <td className="tabular" style={{ padding: '0 20px', textAlign: 'right' }}>
                      {formatDimension(row.lengthMm, true)}
                    </td>
                    <td
                      className="tabular"
                      style={{
                        padding: '0 20px',
                        textAlign: 'right',
                        color:
                          row.widthMm < 148 || row.widthMm > 152
                            ? 'var(--status-fail-text)'
                            : 'inherit',
                      }}
                    >
                      {formatDimension(row.widthMm)}
                    </td>
                    <td className="tabular" style={{ padding: '0 20px', textAlign: 'right' }}>
                      {formatDimension(row.heightMm)}
                    </td>
                    <td style={{ padding: '0 20px', color: row.defect === 'None' ? 'var(--text-muted)' : 'inherit' }}>
                      {row.defect}
                    </td>
                    <td className="tabular" style={{ padding: '0 20px', textAlign: 'right' }}>
                      {formatConfidence(row.confidence)}
                    </td>
                    <td style={{ padding: '0 20px' }}>
                      <StatusPill status={row.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div
          style={{
            height: '56px',
            padding: '0 var(--space-6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid var(--border)',
            backgroundColor: 'var(--surface-card)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            <span>Rows per page:</span>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              style={{
                height: '36px',
                padding: '0 8px',
                borderRadius: 'var(--radius-control)',
                border: '1px solid var(--border-strong)',
                backgroundColor: 'var(--surface-card)',
              }}
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>

          <div className="tabular" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            {totalRows > 0 ? `${startIndex + 1}–${Math.min(startIndex + rowsPerPage, totalRows)} of ${totalRows}` : '0 of 0'}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              style={{
                width: '44px',
                height: '44px',
                borderRadius: 'var(--radius-control)',
                border: '1px solid var(--border-strong)',
                backgroundColor: 'var(--surface-card)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: currentPage <= 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
              }}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              style={{
                width: '44px',
                height: '44px',
                borderRadius: 'var(--radius-control)',
                border: '1px solid var(--border-strong)',
                backgroundColor: 'var(--surface-card)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: currentPage >= totalPages ? 'var(--text-muted)' : 'var(--text-primary)',
                cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
              }}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
