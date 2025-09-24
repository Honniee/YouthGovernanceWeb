import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Filter,
  ChevronDown,
  ArrowUpDown,
  FileText,
  User,
  Clock,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import {
  HeaderMainContent,
  SearchBar,
  SortModal,
  FilterModal,
  ExportButton,
  LoadingSpinner,
  Status
} from '../../components/portal_main_content';
import { ToastContainer, showSuccessToast, showErrorToast } from '../../components/universal';
import skTermsService from '../../services/skTermsService.js';

// Sample static data for UI mock (replace with real service later)
const SAMPLE_HISTORY = [
  {
    id: 'evt-001',
    termId: 'TERM-2025-2027',
    termName: '2025-2027 Term',
    action: 'create',
    actor: { name: 'Admin User', role: 'Admin' },
    timestamp: '2025-01-10T09:24:00Z',
    details: { from: null, to: { termName: '2025-2027 Term', startDate: '2025-06-28', endDate: '2027-08-28' } }
  },
  {
    id: 'evt-002',
    termId: 'TERM-2025-2027',
    termName: '2025-2027 Term',
    action: 'activate',
    actor: { name: 'Clerk Anna', role: 'Staff' },
    timestamp: '2025-06-28T08:00:00Z',
    details: { reason: 'Start of elected term' }
  },
  {
    id: 'evt-003',
    termId: 'TERM-2025-2027',
    termName: '2025-2027 Term',
    action: 'extend',
    actor: { name: 'Mayor Office', role: 'Admin' },
    timestamp: '2027-06-30T13:40:00Z',
    details: { from: { endDate: '2027-06-30' }, to: { endDate: '2027-08-28' }, reason: 'Elections scheduling' }
  },
  {
    id: 'evt-004',
    termId: 'TERM-2025-2027',
    termName: '2025-2027 Term',
    action: 'complete',
    actor: { name: 'Admin User', role: 'Admin' },
    timestamp: '2027-08-28T17:15:00Z',
    details: { force: false }
  },
  {
    id: 'evt-005',
    termId: 'TERM-2024-2025',
    termName: '2024-2025 Interim',
    action: 'complete',
    actor: { name: 'System', role: 'System' },
    timestamp: '2025-01-09T22:10:00Z',
    details: { force: true, reason: 'Superseded by elected council' }
  }
];

const actionToStatus = (action) => {
  switch (action) {
    case 'create':
      return 'info';
    case 'activate':
      return 'active';
    case 'extend':
      return 'warning';
    case 'complete':
      return 'success';
    default:
      return 'default';
  }
};

// Simple per-session cache to reduce refetching
const HISTORY_CACHE = {};
const STALE_MS = 60 * 1000; // 60s

const formatRelativeTime = (iso) => {
  try {
    const now = Date.now();
    const t = new Date(iso).getTime();
    const diff = Math.max(0, now - t);
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  } catch {
    return '';
  }
};

const TermHistory = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryTermId = new URLSearchParams(location.search).get('termId');

  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterValues, setFilterValues] = useState({
    termId: queryTermId || 'all',
    action: 'all',
    dateFrom: '',
    dateTo: ''
  });
  const [sortState, setSortState] = useState({ sortBy: 'timestamp', sortOrder: 'desc' });
  const [isLoading, setIsLoading] = useState(false);
  const [historyRows, setHistoryRows] = useState(SAMPLE_HISTORY);

  // Load live data when termId is provided
  useEffect(() => {
    const load = async () => {
      if (!queryTermId) return; // keep sample when no filter
      try {
        setIsLoading(true);
        // Serve from cache if fresh
        const cached = HISTORY_CACHE[queryTermId];
        if (cached && Date.now() - cached.fetchedAt < STALE_MS) {
          setHistoryRows(cached.data);
          setIsLoading(false);
          return;
        }

        const resp = await skTermsService.getTermHistory(queryTermId);
        let data = [];
        // Support multiple shapes defensively
        if (resp?.success) {
          const raw = resp.data?.data || resp.data || resp?.history || [];
          data = Array.isArray(raw) ? raw : [];
        }
        // Fallback to existing sample if no data
        if (!Array.isArray(data) || data.length === 0) {
          // Fallback to sample data (show all so the UI isn't empty during wiring)
          setHistoryRows(SAMPLE_HISTORY);
          setFilterValues(v => ({ ...v, termId: 'all' }));
        } else {
          // Map generic audit rows to our view model if needed
          const mapped = data.map((r, idx) => ({
            id: r.id || r.logId || `row-${idx}`,
            termId: r.termId || r.resourceId || r.term_id || 'UNKNOWN',
            termName: r.termName || r.term_name || r.resourceName || r.termId || 'Term',
            action: (r.action || r.event || '').toString().toLowerCase() || 'update',
            actor: { name: r.actorName || r.userName || 'System', role: r.userType || r.role || 'system' },
            timestamp: r.timestamp || r.createdAt || r.created_at || new Date().toISOString(),
            details: r.details || r.meta || {}
          }));
          setHistoryRows(mapped);
          HISTORY_CACHE[queryTermId] = { data: mapped, fetchedAt: Date.now() };
        }
      } catch (e) {
        // Fallback to sample data and clear strict term filter so something renders
        setHistoryRows(SAMPLE_HISTORY);
        setFilterValues(v => ({ ...v, termId: 'all' }));
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [queryTermId]);

  const sortModal = {
    isOpen: false,
    triggerRef: React.useRef(null),
    sortBy: sortState.sortBy,
    sortOrder: sortState.sortOrder,
    toggleModal: () => {},
    closeModal: () => {},
    isDefaultSort: sortState.sortBy === 'timestamp' && sortState.sortOrder === 'desc',
    updateSort: (s, o) => setSortState({ sortBy: s, sortOrder: o }),
    resetSort: () => setSortState({ sortBy: 'timestamp', sortOrder: 'desc' })
  };

  const filtered = useMemo(() => {
    let list = historyRows.slice();
    if (filterValues.termId && filterValues.termId !== 'all') {
      list = list.filter(h => h.termId === filterValues.termId);
    }
    if (filterValues.action && filterValues.action !== 'all') {
      list = list.filter(h => h.action === filterValues.action);
    }
    if (filterValues.dateFrom) {
      const from = new Date(filterValues.dateFrom).getTime();
      list = list.filter(h => new Date(h.timestamp).getTime() >= from);
    }
    if (filterValues.dateTo) {
      const to = new Date(filterValues.dateTo).getTime();
      list = list.filter(h => new Date(h.timestamp).getTime() <= to);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(h =>
        h.termName.toLowerCase().includes(q) ||
        h.actor.name.toLowerCase().includes(q) ||
        h.action.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      const dir = sortState.sortOrder === 'asc' ? 1 : -1;
      if (sortState.sortBy === 'timestamp') {
        return (new Date(a.timestamp) - new Date(b.timestamp)) * dir;
      }
      if (sortState.sortBy === 'action') {
        return a.action.localeCompare(b.action) * dir;
      }
      return a.termName.localeCompare(b.termName) * dir;
    });
    return list;
  }, [searchQuery, filterValues, sortState]);

  const buildCsvRows = (rows) => {
    const out = [['Term', 'Action', 'Actor', 'Role', 'Timestamp', 'Details']];
    rows.forEach(h => {
      const detail = h.details?.reason || h.details?.to?.endDate || '';
      out.push([
        h.termName,
        h.action,
        h.actor.name,
        h.actor.role,
        new Date(h.timestamp).toLocaleString(),
        detail
      ]);
    });
    return out;
  };

  const downloadCsv = (filename, rows) => {
    const csv = rows.map(r => r.map(v => {
      const s = (v ?? '').toString();
      const e = s.replace(/"/g, '""');
      return /[",\n]/.test(e) ? `"${e}"` : e;
    }).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const buildExcelXml = (rows) => {
    const headerRow = `
      <Row>
        <Cell><Data ss:Type="String">Term</Data></Cell>
        <Cell><Data ss:Type="String">Action</Data></Cell>
        <Cell><Data ss:Type="String">Actor</Data></Cell>
        <Cell><Data ss:Type="String">Role</Data></Cell>
        <Cell><Data ss:Type="String">Timestamp</Data></Cell>
        <Cell><Data ss:Type="String">Details</Data></Cell>
      </Row>`;
    const bodyRows = rows.map(h => `
      <Row>
        <Cell><Data ss:Type="String">${(h.termName || '').toString()}</Data></Cell>
        <Cell><Data ss:Type="String">${(h.action || '').toString()}</Data></Cell>
        <Cell><Data ss:Type="String">${(h.actor?.name || '').toString()}</Data></Cell>
        <Cell><Data ss:Type="String">${(h.actor?.role || '').toString()}</Data></Cell>
        <Cell><Data ss:Type="String">${new Date(h.timestamp).toLocaleString()}</Data></Cell>
        <Cell><Data ss:Type="String">${(h.details?.reason || h.details?.to?.endDate || '').toString()}</Data></Cell>
      </Row>`).join('');
    return `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
<Worksheet ss:Name="Term History">
<Table>
${headerRow}
${bodyRows}
</Table>
</Worksheet>
</Workbook>`;
  };

  const downloadExcel = (filename, xmlString) => {
    const blob = new Blob([xmlString], { type: 'application/vnd.ms-excel' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.endsWith('.xls') ? filename : `${filename}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const openPrintPdf = (title, rows) => {
    const win = window.open('', '_blank');
    if (!win) return;
    const styles = `
      <style>
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        body { font-family: Arial, sans-serif; color: #111; }
        h1 { font-size: 16px; margin: 0 0 8px; font-weight: 700; text-align: left; }
        table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        th, td { border: 1.2px solid #666; padding: 6px 8px; font-size: 11px; line-height: 1.15; }
        thead th { background: #eaf2ff !important; font-weight: 700; }
        .term { width: 220px; }
        .action { width: 90px; }
        .actor { width: 160px; }
        .time { width: 160px; }
        .details { width: 280px; }
        @page { size: A4 landscape; margin: 12mm; }
      </style>`;
    const header = `
      <thead>
        <tr>
          <th class="term">Term</th>
          <th class="action">Action</th>
          <th class="actor">Actor</th>
          <th class="time">Timestamp</th>
          <th class="details">Details</th>
        </tr>
      </thead>`;
    const body = rows.map(h => `
      <tr>
        <td class="term">${h.termName}</td>
        <td class="action">${h.action}</td>
        <td class="actor">${h.actor.name} (${h.actor.role})</td>
        <td class="time">${new Date(h.timestamp).toLocaleString()}</td>
        <td class="details">${h.details?.reason || h.details?.to?.endDate || ''}</td>
      </tr>`).join('');
    win.document.write(`
      <html>
        <head><title>${title}</title>${styles}</head>
        <body>
          <h1>${title}</h1>
          <table>
            ${header}
            <tbody>${body}</tbody>
          </table>
        </body>
      </html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  };

  const handleExport = async (format) => {
    try {
      const rows = filtered;
      if (format === 'csv') return downloadCsv('term-history.csv', buildCsvRows(rows));
      if (format === 'excel') return downloadExcel('term-history.xls', buildExcelXml(rows));
      if (format === 'pdf') return openPrintPdf('Term History', rows);
      showSuccessToast('Export ready');
    } catch (e) {
      showErrorToast('Export failed', e.message);
    }
  };

  const hasActiveFilters = Object.values(filterValues).some(v => v && v !== 'all');

  return (
    <div className="space-y-5">
      <HeaderMainContent
        title="Term History"
        description="Timeline of SK term lifecycle events"
      />

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 overflow-x-auto pb-2 md:pb-0">
              <button
                onClick={() => navigate(-1)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </button>
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search history..."
                expandOnMobile={true}
                showIndicator={true}
                indicatorText="Search"
                indicatorColor="blue"
                size="md"
              />
              <button
                onClick={() => setShowFilterModal(true)}
                className={`inline-flex items-center border rounded-lg font-medium transition-all duration-200 ${
                  showFilterModal || hasActiveFilters
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                } px-2 py-1.5 sm:px-3 sm:py-2 whitespace-nowrap flex-shrink-0`}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filter
                <ChevronDown className="w-4 h-4 ml-1" />
              </button>
              <button
                ref={sortModal.triggerRef}
                onClick={() => {}}
                className={`inline-flex items-center border rounded-lg font-medium transition-all duration-200 ${
                  sortModal.isOpen || !sortModal.isDefaultSort
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                } px-2 py-1.5 sm:px-3 sm:py-2 whitespace-nowrap flex-shrink-0`}
              >
                <ArrowUpDown className="w-4 h-4 mr-2" />
                Sort
                <ChevronDown className="w-4 h-4 ml-1" />
              </button>
            </div>

            <div className="flex items-center space-x-3 flex-shrink-0">
              <ExportButton
                formats={['csv', 'xlsx', 'pdf']}
                onExport={(fmt) => handleExport(fmt === 'xlsx' ? 'excel' : fmt)}
                label="Export"
                size="md"
                position="auto"
                responsive={true}
              />
            </div>
          </div>
          {/* Quick filter chips */}
          <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
            {[
              { id: 'all', label: 'All' },
              { id: 'create', label: 'Create' },
              { id: 'activate', label: 'Activate' },
              { id: 'extend', label: 'Extend' },
              { id: 'complete', label: 'Complete' }
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => setFilterValues(v => ({ ...v, action: opt.id }))}
                className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                  filterValues.action === opt.id
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
            {filterValues.action !== 'all' && (
              <button
                onClick={() => setFilterValues(v => ({ ...v, action: 'all' }))}
                className="px-2 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <LoadingSpinner variant="spinner" message="Loading history..." size="md" color="blue" height="h-64" />
        ) : (
          <div className="p-5">
            {/* Timeline grouped by date */}
            <div className="space-y-6">
              {(() => {
                const groups = {};
                filtered.forEach(evt => {
                  const key = new Date(evt.timestamp).toLocaleDateString();
                  if (!groups[key]) groups[key] = [];
                  groups[key].push(evt);
                });
                const ordered = Object.entries(groups).sort((a, b) => new Date(b[0]) - new Date(a[0]));
                return ordered.map(([date, items]) => (
                  <div key={date}>
                    <div className="sticky top-0 bg-white/80 backdrop-blur border-b border-gray-100 py-2 mb-3 z-10">
                      <div className="text-xs font-semibold text-gray-600 flex items-center">
                        <Calendar className="w-3.5 h-3.5 mr-2 text-blue-600" />
                        {date}
                      </div>
                    </div>
                    <div className="space-y-4">
                      {items.map((evt) => (
                        <div key={evt.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3">
                              <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
                                {evt.action === 'complete' ? (
                                  <CheckCircle className="w-5 h-5 text-green-600" />
                                ) : evt.action === 'extend' ? (
                                  <Clock className="w-5 h-5 text-orange-600" />
                                ) : evt.action === 'activate' ? (
                                  <Calendar className="w-5 h-5 text-blue-600" />
                                ) : evt.action === 'create' ? (
                                  <User className="w-5 h-5 text-indigo-600" />
                                ) : (
                                  <AlertTriangle className="w-5 h-5 text-gray-600" />
                                )}
                              </div>
                              <div>
                                <div className="flex items-center space-x-2">
                                  <span className="font-semibold text-gray-900">{evt.termName}</span>
                                  <Status status={actionToStatus(evt.action)} size="sm" variant="pill" customLabel={evt.action} />
                                </div>
                                <div className="text-sm text-gray-600 mt-1">
                                  <span className="mr-2">{new Date(evt.timestamp).toLocaleString()}</span>
                                  <span className="text-gray-400">({formatRelativeTime(evt.timestamp)})</span>
                                  <span className="ml-2">by {evt.actor.name} ({evt.actor.role})</span>
                                </div>
                                <div className="text-sm text-gray-800 mt-2">
                                  {evt.action === 'extend' && (
                                    <span>End date: {evt.details?.from?.endDate} → <b>{evt.details?.to?.endDate}</b> {evt.details?.reason ? `— ${evt.details.reason}` : ''}</span>
                                  )}
                                  {evt.action === 'create' && (
                                    <span>Created with date range {evt.details?.to?.startDate} - {evt.details?.to?.endDate}</span>
                                  )}
                                  {evt.action === 'complete' && (
                                    <span>Completed {evt.details?.force ? '(force)' : '(regular)'} {evt.details?.reason ? `— ${evt.details.reason}` : ''}</span>
                                  )}
                                  {evt.action === 'activate' && (
                                    <span>Activated — {evt.details?.reason || 'Start of term'}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ));
              })()}
              {filtered.length === 0 && (
                <div className="text-center py-12 text-gray-500">No history found.</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Filter Modal */}
      <FilterModal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        title="Filters"
        filters={[
          { id: 'termId', label: 'Term', type: 'text', placeholder: 'TERM-2025-2027' },
          { id: 'action', label: 'Action', type: 'select', options: [
            { value: 'all', label: 'All' },
            { value: 'create', label: 'Create' },
            { value: 'activate', label: 'Activate' },
            { value: 'extend', label: 'Extend' },
            { value: 'complete', label: 'Complete' }
          ]},
          { id: 'dateFrom', label: 'From', type: 'date' },
          { id: 'dateTo', label: 'To', type: 'date' }
        ]}
        values={filterValues}
        onChange={setFilterValues}
        onApply={() => setShowFilterModal(false)}
        onClear={() => setFilterValues({ termId: 'all', action: 'all', dateFrom: '', dateTo: '' })}
      />

      <ToastContainer position="top-right" maxToasts={5} />
    </div>
  );
};

export default TermHistory;


