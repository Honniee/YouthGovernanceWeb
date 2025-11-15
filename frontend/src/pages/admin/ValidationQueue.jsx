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
  List,
  Phone,
  Mail,
  AlertCircle,
  AlertTriangle,
  UserPlus,
  ArrowRightLeft
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
import logger from '../../utils/logger.js';

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
  const [showContactMismatchModal, setShowContactMismatchModal] = useState(false);
  const [contactMismatchAction, setContactMismatchAction] = useState(null);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [rejectionComments, setRejectionComments] = useState('');
  const [rejectionLoading, setRejectionLoading] = useState(false); // 'update', 'create_new', 'reassign'
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
      logger.debug('Loading admin validation items', { currentPage, itemsPerPage, searchQuery, tabFilter });
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
          
          // Debug: Log contact mismatch data
          if (item.contactMismatch) {
            logger.debug('Contact mismatch found in API response', {
              itemId: item.id,
              type: item.contactMismatch.type,
              severity: item.contactMismatch.severity
            });
          }
          
          // IMPORTANT: Preserve ALL fields including contactMismatch
          const normalizedItem = {
            ...item, // Spread all fields first
            status: item.status === 'validated' ? 'completed' : item.status,
            validationScore: normalizedScore,
            // Explicitly preserve contactMismatch (even if null/undefined)
            contactMismatch: item.contactMismatch !== undefined ? item.contactMismatch : null
          };
          
          // Verify contactMismatch is preserved
          if (item.contactMismatch && !normalizedItem.contactMismatch) {
            logger.error('Contact mismatch was lost during normalization', null, {
              itemId: item.id,
              original: item.contactMismatch,
              normalized: normalizedItem.contactMismatch
            });
          }
          
          return normalizedItem;
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
        
        logger.debug(`Loaded ${data.data.length} validation items`, { totalItems: data.pagination?.totalItems || 0 });
      } else {
        throw new Error(data.message || 'Failed to load validation items');
      }
    } catch (error) {
      logger.error('Failed to load validation items', error, { params });
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
      logger.error('Failed to load validation stats', error);
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
        logger.error('Export logging error (GET)', error, { format, logFormat, count: dataset.length });
        // Retry via POST body (some proxies strip query params)
        try {
          await apiHelpers.post('/validation-queue/export', {
            format: format === 'excel' ? 'excel' : format,
            logFormat: logFormat,
            count: dataset.length,
            status: tabFilter !== 'all' ? tabFilter : undefined
          });
        } catch (postErr) {
          logger.error('Export logging error (POST)', postErr, { format, logFormat });
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
          logger.error('Export logging error (GET selected)', logError, { format, count: selectedItemsData.length });
          try {
            await apiHelpers.post('/validation-queue/export', {
              format: format === 'excel' ? 'excel' : format,
              logFormat: logFormat,
              selectedIds: selectedItems.join(','),
              count: selectedItemsData.length,
              status: 'selected'
            });
          } catch (postErr) {
            logger.error('Export logging error (POST selected)', postErr, { format, count: selectedItemsData.length });
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
    // Debug: Check if contact mismatch data is present
    logger.debug('Card clicked', {
      itemId: item.id,
      name: `${item.firstName} ${item.lastName}`,
      hasContactMismatch: !!item.contactMismatch,
      contactMismatchType: item.contactMismatch?.type
    });
    
    if (item.contactMismatch) {
      logger.debug('Contact mismatch detected in card click', {
        itemId: item.id,
        type: item.contactMismatch.type,
        severity: item.contactMismatch.severity
      });
    }
    
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

    // Check if this is a contact mismatch scenario
    const hasContactMismatch = item.contactMismatch && action === 'approve';
    
    // Debug logging
    logger.debug('handleValidateItem called', {
      itemId: item.id,
      action,
      hasContactMismatch
    });

    const impactLine = action === 'approve'
      ? 'This will mark the response as validated.'
      : 'This will mark the response as rejected and remove it from the queue.';

    // Build contact mismatch content if present
    const contactMismatchContent = hasContactMismatch ? (
      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="w-4 h-4 text-yellow-600" />
          <span className="font-semibold text-yellow-900 text-sm">Contact Mismatch Detected</span>
        </div>
        <div className="text-xs text-yellow-800 space-y-1">
          <p><strong>Existing:</strong> {item.contactMismatch.existing?.contact || 'N/A'} / {item.contactMismatch.existing?.email || 'N/A'}</p>
          <p><strong>New:</strong> {item.contactMismatch.new?.contact || 'N/A'} / {item.contactMismatch.new?.email || 'N/A'}</p>
        </div>
        <div className="mt-2 text-xs text-yellow-700">
          <p>⚠️ Verify if this is the same person with updated contact info or a different person.</p>
        </div>
      </div>
    ) : null;

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

        {/* Contact Mismatch Alert */}
        {contactMismatchContent}
      </div>
    );

    // If contact mismatch and approve, show special handling modal INSTEAD of confirmation
    if (hasContactMismatch) {
      logger.debug('Contact mismatch detected, showing contact mismatch modal', {
        itemId: item.id,
        type: item.contactMismatch?.type,
        severity: item.contactMismatch?.severity
      });
      
      // Close validation modal first
      setShowValidationModal(false);
      
      // Set the item and show contact mismatch modal
      setSelectedValidationItem(item);
      setContactMismatchAction('approve');
      
      // Use requestAnimationFrame to ensure modal closes before opening new one
      requestAnimationFrame(() => {
        setShowContactMismatchModal(true);
      });
      
      return; // IMPORTANT: Return early, don't show confirmation dialog
    }

    // If rejecting, show rejection modal with comments field
    if (action === 'reject') {
      // Close validation modal first
      setShowValidationModal(false);
      
      // Set the item and show rejection modal
      setSelectedValidationItem(item);
      setRejectionComments('');
      setShowRejectionModal(true);
      
      return; // Return early, don't show confirmation dialog
    }

    // For approve action, show confirmation dialog
    const confirmed = await confirmation.showConfirmation({
      title: 'Approve Validation',
      message: `${impactLine}`,
      content: detailsContent,
      confirmText: 'Approve',
      cancelText: 'Cancel',
      variant: 'success'
    });

    if (!confirmed) return;

    try {
      confirmation.setLoading(true);
      const data = await apiHelpers.patch(`/validation-queue/${item.id}/validate`, {
        action: 'approve',
        comments: null,
        updateContactInfo: false
      });

      if (data.success) {
        await loadValidationItems();
        showSuccessToast('Validation completed', 'Item approved successfully');
      } else {
        throw new Error(data.message || 'Failed to validate item');
      }
    } catch (error) {
      logger.error('Failed to validate item', error, { itemId: item.id, action });
      showErrorToast('Error', 'Failed to validate item');
    } finally {
      confirmation.hideConfirmation();
    }
  };

  // Handle rejection with comments
  const handleRejection = async () => {
    if (!selectedValidationItem) return;

    setRejectionLoading(true);

    try {
      const data = await apiHelpers.patch(`/validation-queue/${selectedValidationItem.id}/validate`, {
        action: 'reject',
        comments: rejectionComments.trim() || null,
        updateContactInfo: false
      });

      if (data.success) {
        await loadValidationItems();
        showSuccessToast('Rejection completed', 'Item rejected successfully');
        setShowRejectionModal(false);
        setSelectedValidationItem(null);
        setRejectionComments('');
      } else {
        throw new Error(data.message || 'Failed to reject item');
      }
    } catch (error) {
      logger.error('Failed to reject item', error, { itemId: selectedValidationItem.id });
      showErrorToast('Error', error.message || 'Failed to reject item');
    } finally {
      setRejectionLoading(false);
    }
  };

  // Handle contact mismatch actions
  const handleContactMismatchAction = async (actionType) => {
    if (!selectedValidationItem) return;

    try {
      if (actionType === 'update_contact') {
        // Same person - approve with contact update
        const data = await apiHelpers.patch(`/validation-queue/${selectedValidationItem.id}/validate`, {
          action: 'approve',
          comments: 'Verified same person - contact info updated',
          updateContactInfo: true
        });

        if (data.success) {
          await loadValidationItems();
          showSuccessToast('Validation completed', 'Response approved and contact info updated successfully');
          setShowContactMismatchModal(false);
          setSelectedValidationItem(null);
        } else {
          throw new Error(data.message || 'Failed to validate item');
        }
      } else if (actionType === 'create_new_profile') {
        // Different person - create new profile
        const mismatch = selectedValidationItem.contactMismatch;
        const personalData = {
          first_name: selectedValidationItem.firstName,
          last_name: selectedValidationItem.lastName,
          middle_name: selectedValidationItem.middleName || null,
          suffix: selectedValidationItem.suffix || null,
          age: selectedValidationItem.age,
          gender: selectedValidationItem.gender,
          contact_number: mismatch.new.contact,
          email: mismatch.new.email,
          barangay_id: selectedValidationItem.barangayId,
          purok_zone: null, // Not available in validation queue data
          birth_date: selectedValidationItem.birthDate
        };

        const data = await apiHelpers.post(`/validation-queue/${selectedValidationItem.id}/reassign`, {
          createNewProfile: true,
          personalData: personalData
        });

        if (data.success) {
          // After creating new profile, approve the response
          const approveData = await apiHelpers.patch(`/validation-queue/${selectedValidationItem.id}/validate`, {
            action: 'approve',
            comments: 'Created new youth profile - different person with same demographics'
          });

          if (approveData.success) {
            await loadValidationItems();
            showSuccessToast('Profile created', 'New youth profile created and response approved successfully');
            setShowContactMismatchModal(false);
            setSelectedValidationItem(null);
          } else {
            throw new Error(approveData.message || 'Failed to approve after reassignment');
          }
        } else {
          throw new Error(data.message || 'Failed to create new profile');
        }
      } else if (actionType === 'reassign_existing') {
        // Different person - reassign to existing profile (would need youth ID input)
        showInfoToast('Reassign to Existing', 'Please use the reassign feature to select an existing youth profile');
        // TODO: Implement reassign to existing profile UI
      }
    } catch (error) {
      logger.error('Failed to handle contact mismatch', error, { itemId: selectedValidationItem.id, actionType });
      showErrorToast('Error', error.message || 'Failed to handle contact mismatch');
    }
  };

  const handleModalValidationAction = async (action) => {
    if (!selectedValidationItem) return;
    
    logger.debug('handleModalValidationAction called', {
      action,
      itemId: selectedValidationItem.id,
      hasContactMismatch: !!selectedValidationItem.contactMismatch
    });
    
    // Check for contact mismatch BEFORE calling handleValidateItem
    // If contact mismatch exists and action is approve, show contact mismatch modal directly
    if (selectedValidationItem.contactMismatch && action === 'approve') {
      logger.debug('Contact mismatch detected in handleModalValidationAction - showing contact mismatch modal', {
        itemId: selectedValidationItem.id,
        type: selectedValidationItem.contactMismatch?.type
      });
      
      // Close the detail modal
      setShowValidationModal(false);
      
      // Show contact mismatch modal with a small delay to ensure smooth transition
      setTimeout(() => {
        setShowContactMismatchModal(true);
      }, 150);
      
      return; // Don't proceed to handleValidateItem
    }
    
    // For reject or no contact mismatch, proceed with normal flow
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
                        logger.error('Bulk approve error', error, { itemIds: selectedItems });
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
                        logger.error('Bulk reject error', error, { itemIds: selectedItems });
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
                        
                        // Contact mismatch badge (highest priority - show first)
                        if (item.contactMismatch) {
                          badges.push({
                            text: 'contact mismatch',
                            className: item.contactMismatch.severity === 'high' 
                              ? 'bg-red-100 text-red-700 border border-red-200 font-medium'
                              : 'bg-yellow-100 text-yellow-700 border border-yellow-200 font-medium'
                          });
                        }
                        
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

      {/* Contact Mismatch Handling Modal */}
      {showContactMismatchModal && selectedValidationItem && selectedValidationItem.contactMismatch && (
        <div 
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 p-4"
          onClick={() => {
            setShowContactMismatchModal(false);
            setSelectedValidationItem(null);
          }}
        >
          <div 
            className="relative flex w-full max-w-2xl max-h-[90vh] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                {selectedValidationItem.contactMismatch.severity === 'high' ? (
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-yellow-600" />
                )}
                <h2 className="text-xl font-bold text-gray-900">Contact Mismatch Detected</h2>
              </div>
              <button
                onClick={() => {
                  setShowContactMismatchModal(false);
                  setSelectedValidationItem(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6" style={{ scrollbarGutter: 'stable' }}>
              {/* Youth Info */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Youth Information</h3>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-gray-900 font-medium">
                    {selectedValidationItem.firstName} {selectedValidationItem.middleName || ''} {selectedValidationItem.lastName} {selectedValidationItem.suffix || ''}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Age: {selectedValidationItem.age} • Gender: {selectedValidationItem.gender} • Barangay: {selectedValidationItem.barangay}
                  </p>
                </div>
              </div>

              {/* Contact Comparison */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Contact Information Comparison</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm font-semibold text-gray-700">Existing (in Profile)</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Phone className="w-4 h-4" />
                        <span>{selectedValidationItem.contactMismatch.existing?.contact || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Mail className="w-4 h-4" />
                        <span>{selectedValidationItem.contactMismatch.existing?.email || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-semibold text-gray-700">New (from Submission)</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Phone className="w-4 h-4" />
                        <span>{selectedValidationItem.contactMismatch.new?.contact || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Mail className="w-4 h-4" />
                        <span>{selectedValidationItem.contactMismatch.new?.email || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Options */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">How would you like to proceed?</h3>
                <div className="space-y-3">
                  {/* Option 1: Same Person - Update Contact */}
                  <button
                    onClick={() => handleContactMismatchAction('update_contact')}
                    className="w-full text-left p-4 border-2 border-green-200 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-1">Same Person - Update Contact Info</h4>
                        <p className="text-sm text-gray-600">
                          Approve the response and update the youth profile with the new contact information. Use this when you've verified it's the same person with updated contact details.
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Option 2: Different Person - Create New Profile */}
                  <button
                    onClick={() => handleContactMismatchAction('create_new_profile')}
                    className="w-full text-left p-4 border-2 border-blue-200 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                        <UserPlus className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-1">Different Person - Create New Profile</h4>
                        <p className="text-sm text-gray-600">
                          Create a new youth profile with the new contact information and reassign the response. Use this when it's a different person (e.g., sibling, cousin) with the same name and demographics.
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Option 3: Reject */}
                  <button
                    onClick={() => {
                      setShowContactMismatchModal(false);
                      setRejectionComments('');
                      // Use requestAnimationFrame to ensure smooth transition
                      requestAnimationFrame(() => {
                        setShowRejectionModal(true);
                      });
                    }}
                    className="w-full text-left p-4 border-2 border-red-200 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                        <XCircle className="w-5 h-5 text-red-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-1">Reject Response</h4>
                        <p className="text-sm text-gray-600">
                          Reject this response if there's an error or you need more information. The response will be removed from the validation queue.
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Warning for High Severity */}
              {selectedValidationItem.contactMismatch.severity === 'high' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-red-900 mb-1">High Priority - Contact Conflict</p>
                      <p className="text-xs text-red-800">
                        The new contact information is already used by another profile. This requires careful verification to determine if profiles should be merged or kept separate.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-gray-200 bg-white px-6 py-4">
              <button
                onClick={() => {
                  setShowContactMismatchModal(false);
                  setSelectedValidationItem(null);
                }}
                className="px-5 py-2 rounded-lg text-sm font-medium text-gray-700 transition hover:bg-gray-100 flex items-center gap-2"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Container */}
      <ToastContainer position="top-right" maxToasts={5} />

      {/* Rejection Modal with Comments */}
      {showRejectionModal && selectedValidationItem && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 p-4"
          onClick={() => {
            setShowRejectionModal(false);
            setSelectedValidationItem(null);
            setRejectionComments('');
          }}
        >
          <div
            className="relative flex w-full max-w-2xl max-h-[90vh] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                  <XCircle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Reject Validation</h2>
                  <p className="text-sm text-gray-500">Provide a reason for rejecting this submission</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6" style={{ scrollbarGutter: 'stable' }}>
              {/* Youth Information */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                  <User className="w-4 h-4 mr-2 text-blue-600" />
                  Submission Details
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Name:</span>
                    <span className="text-sm text-gray-900">
                      {selectedValidationItem.firstName} {selectedValidationItem.lastName}
                    </span>
                  </div>
                  {selectedValidationItem.age && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Age:</span>
                      <span className="text-sm text-gray-900">{selectedValidationItem.age} years</span>
                    </div>
                  )}
                  {selectedValidationItem.gender && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Gender:</span>
                      <span className="text-sm text-gray-900">{selectedValidationItem.gender}</span>
                    </div>
                  )}
                  {selectedValidationItem.barangay && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Barangay:</span>
                      <span className="text-sm text-gray-900">{selectedValidationItem.barangay}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Rejection Reason/Comments */}
              <div className="space-y-3">
                <div>
                  <label htmlFor="rejection-comments" className="block text-sm font-semibold text-gray-900 mb-2">
                    Rejection Reason <span className="text-gray-500 font-normal">(Optional but recommended)</span>
                  </label>
                  <textarea
                    id="rejection-comments"
                    value={rejectionComments}
                    onChange={(e) => setRejectionComments(e.target.value)}
                    placeholder="Enter the reason for rejection (e.g., incomplete information, duplicate submission, invalid data, etc.)"
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 resize-none text-sm"
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    This comment will be visible to the youth when they check their submission status and will help them understand what needs to be corrected.
                  </p>
                </div>
              </div>

              {/* Warning */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-red-900 mb-1">Are you sure you want to reject this submission?</p>
                    <p className="text-xs text-red-800">
                      This action will mark the submission as rejected and remove it from the validation queue. The youth will be notified via email.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-gray-200 bg-white px-6 py-4">
              <button
                onClick={() => {
                  setShowRejectionModal(false);
                  setSelectedValidationItem(null);
                  setRejectionComments('');
                }}
                disabled={rejectionLoading}
                className="px-5 py-2 rounded-lg text-sm font-medium text-gray-700 transition hover:bg-gray-100 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleRejection}
                disabled={rejectionLoading}
                className="px-5 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {rejectionLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Rejecting...
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    Reject Submission
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ValidationQueue;