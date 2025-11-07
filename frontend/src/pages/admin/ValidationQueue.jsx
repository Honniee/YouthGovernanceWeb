import React, { useState, useEffect, useMemo } from 'react';
import { 
  User,
  Eye,
  CheckCircle,
  XCircle,
  Filter,
  Search,
  Calendar,
  MapPin,
  BarChart3,
  Download,
  RefreshCw,
  ChevronDown,
  ArrowUpDown,
  UserCheck,
  UserX,
  Shield,
  Activity,
  Database,
  Globe,
  Grid,
  List
} from 'lucide-react';
import { 
  HeaderMainContent, 
  TabContainer, 
  Tab, 
  useTabState, 
  SearchBar, 
  SortButton,
  SortModal, 
  useSortModal, 
  FilterButton,
  FilterModal, 
  useFilterModal,
  Pagination, 
  usePagination, 
  Status, 
  ExportButton, 
  useExport,
  LoadingSpinner, 
  DataTable,
  BulkActionsBar,
  TabbedDetailModal
} from '../../components/portal_main_content';
import { ToastContainer, showSuccessToast, showErrorToast, showInfoToast, ConfirmationModal, useConfirmation } from '../../components/universal';
import { apiHelpers } from '../../services/api';
import { useBarangays } from '../../hooks/useBarangays';
import { useRealtime } from '../../realtime/useRealtime';
import { validationQueueConfig } from '../../components/portal_main_content/tabbedModalConfigs.jsx';

const ValidationQueue = () => {
  // Confirmation modal hook
  const confirmation = useConfirmation();
  
  // Tab state
  const { activeTab: tabFilter, setActiveTab: setTabFilter } = useTabState('pending', async (tabId) => {
    setCurrentPage(1);
  });

  // UI state
  const [validationItems, setValidationItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [completedToday, setCompletedToday] = useState([]);
  const [viewMode, setViewMode] = useState('grid');
  const [selectedValidationItem, setSelectedValidationItem] = useState(null);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [paginationData, setPaginationData] = useState({
    totalItems: 0,
    totalPages: 0,
    currentPage: 1,
    itemsPerPage: 10
  });

  // Sort modal
  const sortModal = useSortModal('submittedAt', 'desc');
  
  // Reset to first page when sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [sortModal.sortBy, sortModal.sortOrder]);

  // Filter modal
  const filterModal = useFilterModal({});

  // Barangays lookup for readable names
  const { barangays, loading: barangaysLoading, error: barangaysError } = useBarangays();

  // Dynamic barangay options (value = barangay_id, label = barangay_name)
  const barangayOptions = useMemo(() => {
    if (!Array.isArray(barangays)) return [];
    return barangays
      .map(b => ({ value: b.barangay_id || b.id, label: b.barangay_name || b.name }))
      .filter(opt => opt.value && opt.label);
  }, [barangays]);

  // Define filter configuration with id (not key) for FilterModal
  const modalFilters = useMemo(() => {
    const baseFilters = [
      {
        id: 'barangay',
        label: 'Barangay',
        type: 'select',
        placeholder: 'All barangays',
        options: barangayOptions
      },
      {
        id: 'voterMatch',
        label: 'Voter Match',
        type: 'select',
        placeholder: 'All matches',
        options: [
          { value: 'exact', label: 'Exact Match' },
          { value: 'partial', label: 'Partial Match' },
          { value: 'no_match', label: 'No Match' }
        ]
      },
      {
        id: 'scoreRange',
        label: 'Score Range',
        type: 'range',
        min: 0,
        max: 100
      }
    ];
    return baseFilters;
  }, [barangayOptions]);
  
  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterModal.filterValues]);

  // Batch name lookup (id -> name)
  const [batchIdToName, setBatchIdToName] = useState({});

  useEffect(() => {
    const loadBatches = async () => {
      try {
        // Try to fetch batches; ignore errors silently and fallback to showing ID
        const data = await apiHelpers.get('/survey-batches', { params: { page: 1, limit: 500 } });
        // Be resilient to different shapes: {data: [...]}, {data: {allRows: [...] | rows: [...] | items: [...]}}
        const list = (
          Array.isArray(data?.data?.allRows) ? data.data.allRows :
          Array.isArray(data?.data?.rows) ? data.data.rows :
          Array.isArray(data?.data?.items) ? data.data.items :
          Array.isArray(data?.data) ? data.data :
          Array.isArray(data?.rows) ? data.rows :
          Array.isArray(data?.batches) ? data.batches :
          []
        );
        const map = {};
        for (const b of list) {
          const id = b.batch_id || b.id;
          const name = b.batch_name || b.name;
          if (id && name) map[id] = name;
        }
        setBatchIdToName(map);
      } catch (e) {
        // no-op
      }
    };
    loadBatches();
  }, []);

  const getBarangayName = (barangayIdOrName) => {
    if (!barangayIdOrName) return '—';
    // If already a readable name (not an ID-like code), return as is
    if (typeof barangayIdOrName === 'string' && barangayIdOrName.length > 0 && /[a-zA-Z]/.test(barangayIdOrName) && !/^[A-Z]{2,}\d+$/i.test(barangayIdOrName)) {
      return barangayIdOrName;
    }
    if (barangays && Array.isArray(barangays)) {
      const match = barangays.find(b => b.barangay_id === barangayIdOrName || b.id === barangayIdOrName);
      if (match) return match.barangay_name || match.name || barangayIdOrName;
    }
    return barangayIdOrName; // fallback to ID
  };

  // Mock data for admin - more comprehensive than SK version
  const mockValidationItems = [
    {
      id: '1',
      firstName: 'Juan',
      lastName: 'Dela Cruz',
      age: 22,
      barangay: 'San Jose',
      submittedAt: '2024-01-15T10:30:00Z',
      validationTier: 'manual',
      status: 'pending',
      voterMatch: 'partial',
      validationScore: 0.75,
      needsReview: true,
      batchId: 'BATCH001',
      batchName: 'Q1 2024 Youth Survey',
      validatedBy: null,
      validatedAt: null
    },
    {
      id: '2',
      firstName: 'Maria',
      lastName: 'Santos',
      age: 19,
      barangay: 'San Jose',
      submittedAt: '2024-01-15T09:15:00Z',
      validationTier: 'manual',
      status: 'pending',
      voterMatch: 'no_match',
      validationScore: 0.30,
      needsReview: true,
      batchId: 'BATCH001',
      batchName: 'Q1 2024 Youth Survey',
      validatedBy: null,
      validatedAt: null
    },
    {
      id: '3',
      firstName: 'Pedro',
      lastName: 'Garcia',
      age: 25,
      barangay: 'Poblacion',
      submittedAt: '2024-01-15T08:45:00Z',
      validationTier: 'automatic',
      status: 'completed',
      voterMatch: 'exact',
      validationScore: 0.95,
      needsReview: false,
      batchId: 'BATCH001',
      batchName: 'Q1 2024 Youth Survey',
      validatedBy: 'System',
      validatedAt: '2024-01-15T08:46:00Z'
    },
    {
      id: '4',
      firstName: 'Ana',
      lastName: 'Lopez',
      age: 17,
      barangay: 'Bagong Silang',
      submittedAt: '2024-01-15T07:20:00Z',
      validationTier: 'manual',
      status: 'pending',
      voterMatch: 'partial',
      validationScore: 0.60,
      needsReview: true,
      batchId: 'BATCH001',
      batchName: 'Q1 2024 Youth Survey',
      validatedBy: null,
      validatedAt: null
    },
    {
      id: '5',
      firstName: 'Luis',
      lastName: 'Fernandez',
      age: 28,
      barangay: 'San Jose',
      submittedAt: '2024-01-15T06:30:00Z',
      validationTier: 'manual',
      status: 'rejected',
      voterMatch: 'no_match',
      validationScore: 0.20,
      needsReview: false,
      batchId: 'BATCH001',
      batchName: 'Q1 2024 Youth Survey',
      validatedBy: 'Maria Santos (SK Official)',
      validatedAt: '2024-01-15T06:45:00Z'
    }
  ];

  // Load validation items
  const loadValidationItems = async () => {
    try {
      console.log('📋 Loading admin validation items...');
      setIsLoading(true);
      setError(null);

      // Build query parameters for axios
      const sortByParam = typeof sortModal.sortBy === 'string' ? sortModal.sortBy : 'submittedAt';
      const sortOrderParam = sortModal.sortOrder === 'asc' ? 'asc' : 'desc';
      const params = {
        page: currentPage,
        limit: itemsPerPage,
        search: searchQuery || '',
        sortBy: sortByParam,
        sortOrder: sortOrderParam
      };

      // Add tab filter as status parameter (for rejected tab, backend will query from KK_Survey_Responses)
      // Tab filter takes priority over filter modal
      if (tabFilter === 'rejected') {
        params.status = 'rejected';
      } else if (tabFilter === 'pending') {
        params.status = 'pending';
      } else if (tabFilter === 'all') {
        params.status = 'all'; // Explicitly send 'all' to backend
      }

      // Add filter parameters (but don't override tab filter status)
      if (filterModal.filterValues) {
        if (filterModal.filterValues.status && !params.status) {
          // Map UI 'completed' -> API 'validated'
          params.status = filterModal.filterValues.status === 'completed' ? 'validated' : filterModal.filterValues.status;
        }
        if (filterModal.filterValues.barangay) {
          params.barangay = filterModal.filterValues.barangay;
        }
        if (filterModal.filterValues.voterMatch) {
          params.voterMatch = filterModal.filterValues.voterMatch;
        }
        if (filterModal.filterValues.scoreRange) {
          const [min, max] = filterModal.filterValues.scoreRange;
          params.scoreMin = min;
          params.scoreMax = max;
        }
      }

      const data = await apiHelpers.get('/validation-queue', { params });

      if (data.success) {
        // Normalize backend to UI: status and score (0..1)
        const normalized = (data.data || []).map((item) => {
          const rawScore = typeof item.validationScore === 'number' ? item.validationScore : 0;
          const normalizedScore = rawScore > 1 ? rawScore / 100 : rawScore;
          
          return {
            ...item,
            status: item.status === 'validated' ? 'completed' : item.status,
            validationScore: normalizedScore
          };
        });
        setValidationItems(normalized);
        
        // Store pagination data from backend
        if (data.pagination) {
          setPaginationData({
            totalItems: data.pagination.totalItems || 0,
            totalPages: data.pagination.totalPages || 0,
            currentPage: data.pagination.currentPage || currentPage,
            itemsPerPage: data.pagination.itemsPerPage || itemsPerPage
          });
        }
        
        console.log(`✅ Loaded ${data.data.length} validation items (${data.pagination?.totalItems || 0} total)`);
      } else {
        throw new Error(data.message || 'Failed to load validation items');
      }
    } catch (error) {
      console.error('Failed to load validation items:', error);
      setError(typeof error?.message === 'string' ? error.message : 'Failed to load validation items');
      // Avoid mock fallback to ensure real empty state if API fails
      setValidationItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCompletedToday = async () => {
    try {
      const data = await apiHelpers.get('/validation-queue/completed-today', { params: { page: 1, limit: 50 } });
      if (data?.success) {
        const normalized = (data.data || []).map((item) => ({
          ...item,
          status: 'completed',
          validationScore: 1
        }));
        setCompletedToday(normalized);
      } else {
        setCompletedToday([]);
      }
    } catch {
      setCompletedToday([]);
    }
  };

  const loadStats = async () => {
    try {
      const data = await apiHelpers.get('/validation-queue/stats');
      if (data?.success) {
        setApiStats(data.data);
      }
    } catch (error) {
      console.error('Failed to load validation stats:', error);
    }
  };

  // Load data on component mount and when dependencies change
  useEffect(() => {
    loadValidationItems();
    loadCompletedToday();
    loadStats();
  }, [currentPage, itemsPerPage, searchQuery, sortModal.sortBy, sortModal.sortOrder, filterModal.filterValues, tabFilter]);

  // Realtime subscriptions (validation queue and survey responses)
  useRealtime('validation:queueUpdated', async () => {
    await loadValidationItems();
    await loadCompletedToday();
    await loadStats();
  });
  useRealtime('survey:responsesUpdated', async () => {
    await loadValidationItems();
    await loadCompletedToday();
    await loadStats();
  });

  // Handle refresh (if needed in future)
  // const handleRefresh = async () => {
  //   await loadValidationItems();
  // };

  // State for validation stats from API
  const [apiStats, setApiStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    rejected: 0,
    byBarangay: {},
    recentValidations: []
  });

  // Calculate statistics - use API stats for overall counts (not filtered by tab)
  const validationStats = useMemo(() => {
    return {
      total: apiStats.total,
      pending: apiStats.pending,
      completed: apiStats.completed,
      rejected: apiStats.rejected,
      byBarangay: apiStats.byBarangay || {},
    validatedBy: validationItems.reduce((acc, item) => {
      if (item.validatedBy) {
        acc[item.validatedBy] = (acc[item.validatedBy] || 0) + 1;
      }
      return acc;
    }, {})
  };
  }, [validationItems, apiStats]);

  // Filter validation items
  const getFilteredItems = () => {
    let filtered = [...validationItems];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(item => 
        `${item.firstName} ${item.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.barangay.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.validatedBy && item.validatedBy.toLowerCase().includes(searchQuery.toLowerCase())) ||
        item.batchName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply tab filter
    if (tabFilter === 'pending') {
      filtered = filtered.filter(item => item.status === 'pending');
    } else if (tabFilter === 'rejected') {
      filtered = filtered.filter(item => item.status === 'rejected');
    } else if (tabFilter === 'all') {
      // Include all items except completed (but include completed today)
      filtered = filtered.filter(item => item.status !== 'completed');
      // Add completed today items to "All" tab
      filtered = [...filtered, ...completedToday];
    } else if (tabFilter === 'completed_today') {
      // Show completed today items
      filtered = completedToday;
    }

    // Apply filter modal filters
    if (filterModal.filterValues) {
      if (filterModal.filterValues.status) {
        filtered = filtered.filter(item => item.status === filterModal.filterValues.status);
      }
      if (filterModal.filterValues.barangay) {
        filtered = filtered.filter(item => (item.barangayId || item.barangay_id) === filterModal.filterValues.barangay);
      }
      if (filterModal.filterValues.voterMatch) {
        filtered = filtered.filter(item => item.voterMatch === filterModal.filterValues.voterMatch);
      }
      if (filterModal.filterValues.scoreRange) {
        const [min, max] = filterModal.filterValues.scoreRange;
        filtered = filtered.filter(item => {
          const score = Math.round(item.validationScore * 100);
          return score >= min && score <= max;
        });
      }
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortModal.sortBy) {
        case 'firstName':
          aValue = a.firstName.toLowerCase();
          bValue = b.firstName.toLowerCase();
          break;
        case 'lastName':
          aValue = a.lastName.toLowerCase();
          bValue = b.lastName.toLowerCase();
          break;
        case 'age':
          aValue = a.age;
          bValue = b.age;
          break;
        case 'barangay':
          aValue = a.barangay.toLowerCase();
          bValue = b.barangay.toLowerCase();
          break;
        case 'validatedBy':
          aValue = (a.validatedBy || '').toLowerCase();
          bValue = (b.validatedBy || '').toLowerCase();
          break;
        case 'validationScore':
          aValue = a.validationScore;
          bValue = b.validationScore;
          break;
        case 'submittedAt':
        default:
          aValue = new Date(a.submittedAt);
          bValue = new Date(b.submittedAt);
          break;
      }

      if (aValue < bValue) return sortModal.sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortModal.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  };

  // Pagination hook - use backend pagination data
  const pagination = usePagination({
    currentPage,
    totalItems: paginationData.totalItems,
    itemsPerPage,
    onPageChange: setCurrentPage,
    onItemsPerPageChange: setItemsPerPage
  });

  // Get items to display - backend already handles pagination, so just return the items
  const getPaginatedItems = () => {
    // Backend already paginated, so just return validationItems (no client-side slicing)
    return validationItems;
  };

  // Handle search change
  const handleSearchChange = (newQuery) => {
    setSearchQuery(newQuery);
    setCurrentPage(1);
  };

  // Handle item selection
  const handleSelectItem = (id) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  // Handle select all
  const handleSelectAll = () => {
    const paginatedItems = getPaginatedItems();
    const allSelected = paginatedItems.every(item => selectedItems.includes(item.id));
    
    if (allSelected) {
      setSelectedItems(prev => prev.filter(id => !paginatedItems.some(item => item.id === id)));
    } else {
      const newSelections = paginatedItems.filter(item => !selectedItems.includes(item.id)).map(item => item.id);
      setSelectedItems(prev => [...prev, ...newSelections]);
    }
  };

  // ===== Export helpers (CSV, Excel XML, PDF) =====
  const escapeCsv = (v) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s;
  };
  const downloadFile = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = filename; document.body.appendChild(link);
    link.click(); document.body.removeChild(link); window.URL.revokeObjectURL(url);
  };
  const buildValidationCsvRows = (list) => {
    const headers = ['ID','Name','Age','Barangay','Status','Voter Match','Score','Submitted','Validated By','Validated At','Batch'];
    const rows = list.map(item => [
      item.id || '',
      `${item.firstName || ''} ${item.lastName || ''}`.trim(),
      Number.isFinite(item.age) ? item.age : '',
      item.barangay || item.barangayName || '',
      item.status || '',
      (item.voterMatch || '').replace('_',' '),
      typeof item.validationScore === 'number' ? Math.round(item.validationScore * 100) + '%' : '',
      item.submittedAt ? new Date(item.submittedAt).toLocaleString() : '',
      item.validatedBy || '',
      item.validatedAt ? new Date(item.validatedAt).toLocaleString() : '',
      item.batchName || item.batchId || ''
    ]);
    return [headers, ...rows];
  };
  const downloadCsv = (filename, rows) => {
    const csv = rows.map(r => r.map(escapeCsv).join(',')).join('\n');
    downloadFile(new Blob(["\uFEFF"+csv], { type: 'text/csv;charset=utf-8;' }), filename);
  };
  const buildExcelXml = (sheetName, rows) => {
    const rowXml = rows.map(r => `<Row>${r.map(c => `<Cell><Data ss:Type=\"String\">${String(c??'')}</Data></Cell>`).join('')}</Row>`).join('');
    return `<?xml version=\"1.0\"?>\n<Workbook xmlns=\"urn:schemas-microsoft-com:office:spreadsheet\" xmlns:ss=\"urn:schemas-microsoft-com:office:spreadsheet\"><Worksheet ss:Name=\"${sheetName}\"><Table>${rowXml}</Table></Worksheet></Workbook>`;
  };
  const escapeHtml = (s) => String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  const openPrintPdf = (title, headers, rows) => {
    const win = window.open('', '_blank');
    if (!win) return;
    const thead = `<thead><tr>${headers.map(h=>`<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>`;
    const tbody = rows.slice(1).map(r=>`<tr>${r.map(c=>`<td>${escapeHtml(String(c??''))}</td>`).join('')}</tr>`).join('');
    const styles = `
      <style>
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        body { font-family: Arial, sans-serif; color: #111; margin: 0; padding: 0; }
        .container { padding: 12mm; }
        h1 { font-size: 16px; margin: 0 0 4px; font-weight: 700; text-align: left; }
        .meta { font-size: 10px; color: #555; margin-bottom: 12px; }
        table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        th, td { border: 1px solid #666; padding: 6px 8px; font-size: 11px; line-height: 1.15; }
        thead th { background: #f3f4f6 !important; font-weight: 700; }
        thead { display: table-header-group; }
        @page { size: A4 landscape; margin: 12mm; }
      </style>`;
    const ts = new Date().toLocaleString();
    const host = location?.hostname || '';
    win.document.write(`<!doctype html><html><head><meta charset='utf-8'><title>${escapeHtml(title)}</title>${styles}</head><body><div class="container"><h1>${escapeHtml(title)}</h1><div class="meta">Generated on ${escapeHtml(ts)} ${host ? `• ${escapeHtml(host)}` : ''}</div><table>${thead}<tbody>${tbody}</tbody></table></div><script>window.onload=()=>{window.print();}</script></body></html>`);
    win.document.close();
  };

  // Export hooks
  const mainExport = useExport({
    exportFunction: async (format) => {
      try {
        const dataset = getFilteredItems() || [];
        const ts = new Date().toISOString().replace(/[:T]/g,'-').split('.')[0];
        
        // Log export activity to backend
        const logFormat = format === 'excel' ? 'xlsx' : format;
        await apiHelpers.get('/validation-queue/export', {
          params: {
            format: format === 'excel' ? 'excel' : format,
            logFormat: logFormat,
            count: dataset.length,
            status: tabFilter !== 'all' ? tabFilter : undefined
          }
        });

        // Perform actual export
        if (format === 'pdf') {
          const rows = buildValidationCsvRows(dataset);
          openPrintPdf('Validation Queue', rows[0], rows);
          return { success: true };
        }
        if (format === 'excel' || format === 'xlsx') {
          const rows = buildValidationCsvRows(dataset);
          const xml = buildExcelXml('Validation Queue', rows);
          downloadFile(new Blob([xml], { type: 'application/vnd.ms-excel' }), `validation-queue-${ts}.xls`);
          return { success: true };
        }
        const rows = buildValidationCsvRows(dataset);
        downloadCsv(`validation-queue-${ts}.csv`, rows);
        return { success: true };
      } catch (error) {
        console.error('Export logging error (GET):', error);
        // Retry via POST body (some proxies strip query params)
        try {
          await apiHelpers.post('/validation-queue/export', {
            format: format === 'excel' ? 'excel' : format,
            logFormat: logFormat,
            count: dataset.length,
            status: tabFilter !== 'all' ? tabFilter : undefined
          });
        } catch (postErr) {
          console.error('Export logging error (POST):', postErr);
        }
        // Continue with export even if logging fails
        const dataset = getFilteredItems() || [];
        const ts = new Date().toISOString().replace(/[:T]/g,'-').split('.')[0];
        if (format === 'pdf') {
          const rows = buildValidationCsvRows(dataset);
          openPrintPdf('Validation Queue', rows[0], rows);
        } else if (format === 'excel' || format === 'xlsx') {
          const rows = buildValidationCsvRows(dataset);
          const xml = buildExcelXml('Validation Queue', rows);
          downloadFile(new Blob([xml], { type: 'application/vnd.ms-excel' }), `validation-queue-${ts}.xls`);
        } else {
          const rows = buildValidationCsvRows(dataset);
          downloadCsv(`validation-queue-${ts}.csv`, rows);
        }
        return { success: true };
      }
    },
    onSuccess: () => showSuccessToast('Export completed', 'Validation queue exported successfully'),
    onError: (error) => showErrorToast('Export failed', error.message)
  });

  // Bulk export hook for selected items
  const bulkExportHook = useExport({
    exportFunction: async (format) => {
      if (selectedItems.length === 0) {
        throw new Error('No items selected for export');
      }

      try {
        // Filter selected items from validation items
        const selectedItemsData = validationItems.filter(item => selectedItems.includes(item.id));
        
        if (selectedItemsData.length === 0) {
          throw new Error('No selected items found to export');
        }

        const ts = new Date().toISOString().replace(/[:T]/g,'-').split('.')[0];
        const logFormat = format === 'excel' ? 'xlsx' : format;

        // Log bulk export activity to backend
        try {
          await apiHelpers.get('/validation-queue/export', {
            params: {
              format: format === 'excel' ? 'excel' : format,
              logFormat: logFormat,
              selectedIds: selectedItems.join(','),
              count: selectedItemsData.length,
              status: 'selected'
            }
          });
        } catch (logError) {
          console.error('Export logging error (GET selected):', logError);
          try {
            await apiHelpers.post('/validation-queue/export', {
              format: format === 'excel' ? 'excel' : format,
              logFormat: logFormat,
              selectedIds: selectedItems.join(','),
              count: selectedItemsData.length,
              status: 'selected'
            });
          } catch (postErr) {
            console.error('Export logging error (POST selected):', postErr);
          }
          // Continue with export even if logging fails
        }

        // Perform actual export
        if (format === 'pdf') {
          const rows = buildValidationCsvRows(selectedItemsData);
          openPrintPdf('Validation Queue (Selected)', rows[0], rows);
          return { success: true, count: selectedItemsData.length };
        }
        
        if (format === 'excel' || format === 'xlsx') {
          const rows = buildValidationCsvRows(selectedItemsData);
          const xml = buildExcelXml('Validation Queue (Selected)', rows);
          downloadFile(new Blob([xml], { type: 'application/vnd.ms-excel' }), `validation-queue-selected-${ts}.xls`);
          return { success: true, count: selectedItemsData.length };
        }
        
        const rows = buildValidationCsvRows(selectedItemsData);
        downloadCsv(`validation-queue-selected-${ts}.csv`, rows);
        return { success: true, count: selectedItemsData.length };
      } catch (error) {
        throw new Error(error.message || 'Failed to export selected items');
      }
    },
    onSuccess: (res) => showSuccessToast('Bulk export completed', `${res.count} item(s) exported successfully`),
    onError: (error) => showErrorToast('Bulk export failed', error.message)
  });

  // Handle validation action
  // Handle card click to open validation modal
  const handleCardClick = (item) => {
    setSelectedValidationItem(item);
    setShowValidationModal(true);
  };

  const handleValidateItem = async (item, action) => {
    // Ask for confirmation (like YouthManagement.jsx)
    const nameLine = `${item?.firstName ?? ''} ${item?.lastName ?? ''}`.trim();
    const ageText = Number.isFinite(item?.age) ? `Age: ${item.age} years` : '';
    const genderValue = typeof item?.gender === 'string' ? item.gender : '';
    const genderText = genderValue ? `Gender: ${genderValue.charAt(0).toUpperCase()}${genderValue.slice(1).toLowerCase()}` : '';
    const ageGenderLine = [ageText, genderText].filter(Boolean).join(' • ');
    const barangayLine = item?.barangay ? `Barangay: ${item.barangay}` : '';
    const submittedAtText = item?.submittedAt
      ? new Date(item.submittedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
      : '';
    const submittedLine = submittedAtText ? `Submitted: ${submittedAtText}` : '';

    const impactLine = action === 'approve'
      ? 'This will mark the response as validated.'
      : 'This will mark the response as rejected and remove it from the queue.';

    const detailsContent = (
      <div className="space-y-2 text-sm">
        {/* Name */}
        <div className="flex items-center text-gray-900 font-medium">
          <User className="w-4 h-4 text-gray-500 mr-2" />
          <span>{nameLine}</span>
        </div>

        {/* Gender */}
        {genderValue && (
          <div className="flex items-center text-gray-700">
            <User className="w-4 h-4 text-gray-400 mr-2" />
            <span>Gender: {genderText.replace('Gender: ', '')}</span>
          </div>
        )}

        {/* Age */}
        {Number.isFinite(item?.age) && (
          <div className="flex items-center text-gray-700">
            <Calendar className="w-4 h-4 text-gray-400 mr-2" />
            <span>Age: {item.age} years</span>
          </div>
        )}

        {/* Barangay */}
        {item?.barangay && (
          <div className="flex items-center text-gray-700">
            <MapPin className="w-4 h-4 text-gray-400 mr-2" />
            <span>Barangay: {item.barangay}</span>
          </div>
        )}

        {/* Submitted Date */}
        {submittedAtText && (
          <div className="flex items-center text-gray-700">
            <Calendar className="w-4 h-4 text-gray-400 mr-2" />
            <span>Submitted date: {submittedAtText}</span>
          </div>
        )}
      </div>
    );

    const confirmed = await confirmation.showConfirmation({
      title: action === 'approve' ? 'Approve Validation' : 'Reject Validation',
      message: `${impactLine}`,
      content: detailsContent,
      confirmText: action === 'approve' ? 'Approve' : 'Reject',
      cancelText: 'Cancel',
      variant: action === 'approve' ? 'success' : 'danger'
    });

    if (!confirmed) return;

    try {
      confirmation.setLoading(true);
      const data = await apiHelpers.patch(`/validation-queue/${item.id}/validate`, {
        action,
        comments: null
      });

      if (data.success) {
        await loadValidationItems();
        showSuccessToast('Validation completed', `Item ${action === 'approve' ? 'approved' : 'rejected'} successfully`);
      } else {
        throw new Error(data.message || 'Failed to validate item');
      }
    } catch (error) {
      console.error('Failed to validate item:', error);
      showErrorToast('Error', 'Failed to validate item');
    } finally {
      confirmation.hideConfirmation();
    }
  };

  const handleModalValidationAction = (action) => {
    if (!selectedValidationItem) return;
    setShowValidationModal(false);
    handleValidateItem(selectedValidationItem, action);
  };

  const detailModalConfig = useMemo(() => {
    const actions =
      selectedValidationItem &&
      selectedValidationItem.status === 'pending' &&
      tabFilter !== 'rejected'
        ? [
            {
              label: 'Reject',
              variant: 'secondary',
              key: 'reject',
              onClick: () => handleModalValidationAction && handleModalValidationAction('reject')
            },
            {
              label: 'Approve',
              variant: 'primary',
              key: 'approve',
              onClick: () => handleModalValidationAction && handleModalValidationAction('approve')
            }
          ]
        : [];

    return {
      ...validationQueueConfig,
      footerButtons: (data) => {
        const buttons = [
          {
            key: 'close',
            label: 'Close',
            variant: 'secondary',
            onClick: () => {
              setShowValidationModal(false);
              setSelectedValidationItem(null);
            }
          }
        ];

        if (actions.length) {
          buttons.push({ ...actions[0], onClick: () => handleModalValidationAction('reject') });
          buttons.push({ ...actions[1], onClick: () => handleModalValidationAction('approve') });
        }

        return buttons;
      }
    };
  }, [selectedValidationItem, tabFilter, handleModalValidationAction]);

  // Helper functions
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getVoterMatchColor = (match) => {
    switch (match) {
      case 'exact': return 'bg-green-100 text-green-700 border-green-200';
      case 'partial': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'no_match': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getValidationScoreColor = (score) => {
    if (score >= 0.8) return 'bg-green-100 text-green-700 border-green-200';
    if (score >= 0.5) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    return 'bg-red-100 text-red-700 border-red-200';
  };

  // Get unique barangays for filter
  const uniqueBarangays = [...new Set(validationItems.map(item => item.barangay))].sort();

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <HeaderMainContent 
        title="Validation Queue" 
        description="Review and validate youth survey submissions that require manual verification. Only shows pending validations that need manual review."
      />

      {/* Admin Status Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <Database className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-blue-900">System-wide Validation Dashboard</h3>
            <p className="text-sm text-blue-700">
              {validationStats.pending} pending validations across {Object.keys(validationStats.byBarangay).length} barangays
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column - Validation Queue */}
        <div className="xl:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Tab Container */}
            <TabContainer
              activeTab={tabFilter}
              onTabChange={setTabFilter}
              variant="underline"
              size="md"
            >
              <Tab 
                id="pending" 
                label="Pending" 
                count={validationStats.pending} 
                color="yellow"
               />
              <Tab 
                id="rejected" 
                label="Rejected" 
                count={validationStats.rejected} 
                color="red"
              />
              <Tab 
                id="all" 
                label="All" 
                count={validationStats.pending + validationStats.rejected} 
                color="blue"
              />
              <Tab 
                id="completed_today" 
                label="Completed (Today)" 
                count={completedToday.length} 
                color="green"
              />
            </TabContainer>

            {/* Controls */}
            <div className="px-5 py-4 border-t border-gray-100">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 overflow-x-auto pb-2 md:pb-0 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                  <SearchBar
                    value={searchQuery}
                    onChange={handleSearchChange}
                    placeholder="Search by name, barangay, validator, or batch..." 
                    expandOnMobile={true}
                    showIndicator={true}
                    indicatorText="Search"
                    indicatorColor="blue"
                    size="md"
                  />

                  <FilterButton
                    ref={filterModal.triggerRef}
                    onClick={filterModal.openModal}
                    isActive={filterModal.isOpen || Object.keys(filterModal.filterValues || {}).some(key => filterModal.filterValues[key])}
                    label="Filter"
                    size="md"
                  />

                  <SortButton
                    ref={sortModal.triggerRef}
                    onClick={sortModal.openModal}
                    isActive={sortModal.isOpen}
                    label="Sort"
                    size="md"
                  />
                </div>

                <div className="flex items-center space-x-3 flex-shrink-0">
                  {/* View Mode Toggle */}
                  <div className="flex items-center bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-2 rounded-md transition-colors ${
                        viewMode === 'grid'
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                      title="Grid View"
                    >
                      <Grid className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-2 rounded-md transition-colors ${
                        viewMode === 'list'
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                      title="List View"
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <ExportButton
                    formats={['csv', 'xlsx', 'pdf']}
                    onExport={(format) => mainExport.handleExport(format)}
                    isExporting={mainExport.isExporting}
                    label="Export"
                    size="md"
                  />
                </div>
              </div>
            </div>

            {/* Bulk Actions Bar */}
            {selectedItems.length > 0 && (
              <BulkActionsBar
                selectedCount={selectedItems.length}
                itemName="validation queue item"
                itemNamePlural="validation queue items"
                onClearSelection={() => setSelectedItems([])}
                exportConfig={{
                  formats: ['csv', 'xlsx', 'pdf'],
                  onExport: (format) => bulkExportHook.handleExport(format === 'xlsx' ? 'excel' : format),
                  isExporting: bulkExportHook.isExporting
                }}
                actions={[
                  {
                    label: 'Approve Selected',
                    onClick: async () => {
                      try {
                        // Get selected items details for confirmation
                        const selectedItemsData = validationItems.filter(item => selectedItems.includes(item.id));
                        const itemNames = selectedItemsData.map(item => `${item.firstName} ${item.lastName}`).join(', ');
                        
                        // Show confirmation dialog
                        const confirmed = await confirmation.confirmBulkOperation(
                          'approve',
                          selectedItems.length,
                          'validation queue item',
                          itemNames
                        );
                        
                        if (!confirmed) return;
                        
                        confirmation.setLoading(true);
                        
                        const data = await apiHelpers.patch('/validation-queue/bulk-validate', {
                          ids: selectedItems,
                          action: 'approve',
                          comments: null
                        });

                        if (data.success) {
                          confirmation.hideConfirmation();
                          showSuccessToast('Bulk approve completed', `Successfully approved ${data.data.success} item${data.data.success > 1 ? 's' : ''}`);
                          setSelectedItems([]);
                          await loadValidationItems();
                        } else {
                          confirmation.hideConfirmation();
                          throw new Error(data.message || 'Failed to approve items');
                        }
                      } catch (error) {
                        console.error('Bulk approve error:', error);
                        confirmation.hideConfirmation();
                        showErrorToast('Error', 'Failed to approve selected items');
                      }
                    },
                    icon: CheckCircle,
                    variant: 'success'
                  },
                  {
                    label: 'Reject Selected',
                    onClick: async () => {
                      try {
                        // Get selected items details for confirmation
                        const selectedItemsData = validationItems.filter(item => selectedItems.includes(item.id));
                        const itemNames = selectedItemsData.map(item => `${item.firstName} ${item.lastName}`).join(', ');
                        
                        // Show confirmation dialog
                        const confirmed = await confirmation.confirmBulkOperation(
                          'reject',
                          selectedItems.length,
                          'validation queue item',
                          itemNames
                        );
                        
                        if (!confirmed) return;
                        
                        confirmation.setLoading(true);
                        
                        const data = await apiHelpers.patch('/validation-queue/bulk-validate', {
                          ids: selectedItems,
                          action: 'reject',
                          comments: null
                        });

                        if (data.success) {
                          confirmation.hideConfirmation();
                          showSuccessToast('Bulk reject completed', `Successfully rejected ${data.data.success} item${data.data.success > 1 ? 's' : ''}`);
                          setSelectedItems([]);
                          await loadValidationItems();
                        } else {
                          confirmation.hideConfirmation();
                          throw new Error(data.message || 'Failed to reject items');
                        }
                      } catch (error) {
                        console.error('Bulk reject error:', error);
                        confirmation.hideConfirmation();
                        showErrorToast('Error', 'Failed to reject selected items');
                      }
                    },
                    icon: XCircle,
                    variant: 'danger'
                  }
                ]}
                primaryColor="blue"
              />
            )}

            {/* Content Area */}
            {isLoading ? (
              <LoadingSpinner 
                variant="spinner"
                message="Loading validation items..." 
                size="md"
                color="blue"
                height="h-64"
              />
            ) : (
              <>
                {(tabFilter === 'completed_today' ? completedToday : getPaginatedItems()).length === 0 ? (
                  <DataTable
                    data={[]}
                    selectedItems={[]}
                    onSelectItem={() => {}}
                    onSelectAll={() => {}}
                    viewMode={viewMode}
                    keyField="id"
                    displayFields={{}}
                    selectAllLabel="Select All Items"
                    emptyMessage={
                      tabFilter === 'completed_today' 
                        ? "No validations were completed today." 
                        : "No validation items found"
                    }
                    styling={{ theme: 'blue' }}
                  />
                ) : (
                  <DataTable
                    data={tabFilter === 'completed_today' ? completedToday : getPaginatedItems()}
                    selectedItems={selectedItems}
                    onSelectItem={handleSelectItem}
                    onSelectAll={handleSelectAll}
                    onCardClick={handleCardClick}
                    viewMode={viewMode}
                    keyField="id"
                    displayFields={{
                      avatar: {
                        firstName: 'firstName',
                        lastName: 'lastName',
                        email: 'email',
                        picture: null
                      },
                      title: (item) => `${item.firstName} ${item.lastName}`,
                      email: (item) => item.email || '—',
                      status: (item) => item.status,
                      extraBadges: (item) => {
                        if (tabFilter === 'completed_today' || tabFilter === 'rejected') return [];
                        const badges = [];
                        if (item.voterMatch) {
                          badges.push({
                            text: item.voterMatch.replace('_', ' '),
                            className: getVoterMatchColor(item.voterMatch)
                          });
                        }
                        if (item.validationScore !== undefined && item.validationScore !== null) {
                          badges.push({
                            text: `${Math.round(item.validationScore * 100)}%`,
                            className: getValidationScoreColor(item.validationScore)
                          });
                        }
                        return badges;
                      },
                      badge: (item) => ({
                        text: getBarangayName(item.barangay || item.barangayName || item.barangayId || item.barangay_id),
                        className: 'bg-gray-100 text-gray-700 border border-gray-200 font-medium'
                      }),
                      date: 'submittedAt',
                      dateLabel: 'Submitted'
                    }}
                    selectAllLabel="Select All Items"
                    emptyMessage={
                      tabFilter === 'completed_today' 
                        ? "No validations were completed today." 
                        : "No validation items found"
                    }
                    styling={{
                      gridCols: 'grid-cols-1 lg:grid-cols-2',
                      cardHover: 'hover:border-blue-300 hover:shadow-xl hover:shadow-blue-100/50 hover:scale-[1.02]',
                      listHover: 'hover:bg-blue-50/30 hover:border-l-4 hover:border-l-blue-400',
                      theme: 'blue'
                    }}
                  />
                )}

                {/* Pagination */}
                {(tabFilter === 'completed_today' ? completedToday : getPaginatedItems()).length > 0 && (
                <Pagination
                  currentPage={currentPage}
                  totalItems={paginationData.totalItems}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={setItemsPerPage}
                  itemName="validation item"
                  itemNamePlural="validation items"
                  showItemsPerPage={true}
                  showInfo={true}
                  size="md"
                  variant="default"
                  itemsPerPageOptions={[5, 10, 20, 50]}
                />
                )}
              </>
            )}
          </div>
        </div>

        {/* Right Column - Dashboard & Analytics */}
        <div className="xl:col-span-1 space-y-6">
          {/* Barangay Distribution */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-green-50 to-emerald-50">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">By Barangay</h3>
                  <p className="text-xs text-gray-600">Pending validations by location</p>
                </div>
              </div>
            </div>
            
            <div className="p-5 space-y-3">
              {Object.keys(validationStats.byBarangay).length > 0 ? (
                Object.entries(validationStats.byBarangay)
                  .filter(([barangay]) => barangay && barangay !== 'Unknown')
                .sort(([,a], [,b]) => b - a)
                .slice(0, 5)
                  .map(([barangay, count]) => {
                    const allCounts = Object.values(validationStats.byBarangay);
                    const maxCount = allCounts.length > 0 ? Math.max(...allCounts) : 1;
                    const barangayName = getBarangayName(barangay);
                    return (
                  <div key={barangay} className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 truncate">{barangayName}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-12 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full" 
                              style={{ width: `${maxCount > 0 ? (count / maxCount) * 100 : 0}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900 w-6 text-right">{count}</span>
                    </div>
                  </div>
                    );
                  })
              ) : (
                <div className="text-sm text-gray-500 text-center py-4">No barangay data available</div>
              )}
            </div>
          </div>

          {/* Recent Validations */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Recent Validations</h3>
                  <p className="text-xs text-gray-600">Latest validation activities</p>
                </div>
              </div>
            </div>
            
            <div className="p-5 space-y-3">
              {apiStats.recentValidations && apiStats.recentValidations.length > 0 ? (
                apiStats.recentValidations.map((item, index) => (
                  <div key={index} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg transition-colors">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {item.firstName} {item.lastName}
                      </div>
                      <div className="text-xs text-gray-500">
                        {item.barangay || '—'} • {item.validatedBy || 'System'}
                        {item.validatedAt && (
                          <span className="ml-2">
                            • {new Date(item.validatedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      item.status === 'validated' || item.status === 'completed' ? 'bg-green-400' :
                      item.status === 'rejected' ? 'bg-red-400' :
                      'bg-yellow-400'
                    }`}></div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">No recent validations</p>
                  <p className="text-xs text-gray-400 mt-1">Validation activity will appear here</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Filter className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Quick Actions</h3>
                  <p className="text-xs text-gray-600">Common validation tasks</p>
                </div>
              </div>
            </div>
            
            <div className="p-5 space-y-3">
              <button 
                onClick={() => setTabFilter('pending')}
                className="w-full px-4 py-2 bg-yellow-50 text-yellow-700 text-sm font-medium rounded-lg hover:bg-yellow-100 transition-colors border border-yellow-200"
              >
                Review Pending ({validationStats.pending})
              </button>
              
              
              <button 
                onClick={() => setTabFilter('completed')}
                className="w-full px-4 py-2 bg-green-50 text-green-700 text-sm font-medium rounded-lg hover:bg-green-100 transition-colors border border-green-200"
              >
                View Completed ({validationStats.completed})
              </button>
              
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ConfirmationModal {...confirmation.modalProps} />
      <SortModal
        isOpen={sortModal.isOpen}
        onClose={sortModal.closeModal}
        triggerRef={sortModal.triggerRef}
        sortBy={sortModal.sortBy}
        sortOrder={sortModal.sortOrder}
        onSortChange={sortModal.updateSort}
        sortFields={[
          { value: 'submittedAt', label: 'Submitted Date' },
          { value: 'firstName', label: 'First Name' },
          { value: 'lastName', label: 'Last Name' },
          { value: 'age', label: 'Age' },
          { value: 'barangay', label: 'Barangay' },
          { value: 'validatedBy', label: 'Validated By' },
          { value: 'validationScore', label: 'Validation Score' }
        ]}
      />

      <FilterModal
        isOpen={filterModal.isOpen}
        onClose={filterModal.closeModal}
        triggerRef={filterModal.triggerRef}
        filters={modalFilters}
        values={filterModal.filterValues}
        onChange={filterModal.updateFilterValues}
        onApply={filterModal.applyFilters}
        onClear={filterModal.clearFilters}
      />

      <TabbedDetailModal
        isOpen={showValidationModal}
        onClose={() => {
            setShowValidationModal(false);
            setSelectedValidationItem(null);
          }}
        data={selectedValidationItem || {}}
        mode="view"
        config={detailModalConfig}
      />

      {/* Toast Container */}
      <ToastContainer position="top-right" maxToasts={5} />
    </div>
  );
};

export default ValidationQueue;