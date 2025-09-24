import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  ChevronLeft, 
  ChevronRight,
  Grid,
  List,
  MoreHorizontal,
  Trash2,
  Archive,
  Eye,
  X,
  Plus,
  User,
  Mail,
  Briefcase,
  Building,
  Phone,
  MapPin,
  Calendar,
  Save,
  UserPlus,
  ChevronDown,
  Upload,
  ChevronUp,
  ArrowUpDown,
  Filter,
  Pin,
  BarChart3,
  Users,
  CheckCircle,
  AlertCircle,
  Info,
  Clock,
  Edit,
  Play,
  Pause,
  RotateCcw,
  FileText,
  Download,
  Settings,
  AlertTriangle
} from 'lucide-react';
import { HeaderMainContent, TabContainer, Tab, useTabState, ActionMenu, SearchBar, SortModal, FilterModal, BulkModal, Pagination, useSortModal, useBulkModal, usePagination, Avatar, Status, ExportButton, useExport, LoadingSpinner, BulkActionsBar, CollapsibleForm, DataTable, ActiveTermBanner } from '../../components/portal_main_content';
import { extractTermStats } from '../../utils/termStats';
import { ToastContainer, showSuccessToast, showErrorToast, showInfoToast, ConfirmationModal, useConfirmation } from '../../components/universal';
import skTermsService from '../../services/skTermsService.js';
import { useActiveTerm } from '../../hooks/useActiveTerm.js';
import skService from '../../services/skService.js';



const SKTerms = () => {
  const navigate = useNavigate();

  // Helper function to format dates for HTML date inputs
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD
  };

  // Helper function to get days remaining for active term
  const getActiveTermDaysRemaining = (endDate) => {
    if (!endDate) return null;
    const end = new Date(endDate).getTime();
    const today = new Date().setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Helper function to check if term is overdue (end date passed but still active)
  const isTermOverdue = (term) => {
    if (term.status !== 'active') return false;
    const end = new Date(term.endDate).getTime();
    const today = new Date().setHours(0, 0, 0, 0);
    return end < today;
  };

  // Helper function to get overdue days
  const getOverdueDays = (endDate) => {
    if (!endDate) return 0;
    const end = new Date(endDate).getTime();
    const today = new Date().setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((today - end) / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  // Use our reusable tab state hook
  const { activeTab, setActiveTab } = useTabState('all', async (tabId) => {
    setTabLoading(true);
    setStatusFilter(tabId);
    setCurrentPage(1);
    
    try {
      await loadTermsData(tabId);
    } finally {
      setTabLoading(false);
    }
  });

  const [viewMode, setViewMode] = useState('grid');
  const [selectedItems, setSelectedItems] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [isLoading, setIsLoading] = useState(false);
  const [tabLoading, setTabLoading] = useState(false);

  // Terms data state
  const [termsData, setTermsData] = useState([]);
  const [totalTerms, setTotalTerms] = useState(0);
  const [termsStats, setTermsStats] = useState({
    total: 0,
    active: 0,
    completed: 0,
    upcoming: 0
  });
  
  // Active term state using custom hook (like SKManagement)
  const { activeTerm, isLoading: isLoadingActiveTerm, error: activeTermError, hasActiveTerm } = useActiveTerm();
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Filter modal state
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterValues, setFilterValues] = useState({
    termName: '',
    status: '',
    dateCreated: ''
  });
  const filterTriggerRef = React.useRef(null);
  
  // Form state
  const [formData, setFormData] = useState({
    termName: '',
    startDate: '',
    endDate: ''
  });
  
  // Collapse state for Add Term form
  const [formCollapsed, setFormCollapsed] = useState(true);
  
  // Bulk operations state
  const [bulkAction, setBulkAction] = useState('');
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // Term details modal state
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showExtensionModal, setShowExtensionModal] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState(null);
  const [isEditingSaving, setIsEditingSaving] = useState(false);
   
     // Extension modal state
  const [extensionData, setExtensionData] = useState({
    newEndDate: '',
    reason: ''
  });

  // Edit modal state
  const [editData, setEditData] = useState({
    termName: '',
    startDate: '',
    endDate: ''
  });

  // Completion options modal state
  const [showCompletionOptionsModal, setShowCompletionOptionsModal] = useState(false);
  const [completionTerm, setCompletionTerm] = useState(null);
  
  // Confirmation modal hook
  const confirmation = useConfirmation();

  // Modal state management using custom hooks
  const sortModal = useSortModal('created_at', 'desc', (newSortBy, newSortOrder) => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    // Use overrides so the latest values are applied immediately
    loadTermsData(activeTab, { sortBy: newSortBy, sortOrder: newSortOrder });
  });
  const bulkModal = useBulkModal();
  
  // Pagination state management using custom hook
  const pagination = usePagination({
    initialPage: currentPage,
    initialItemsPerPage: itemsPerPage,
    totalItems: totalTerms,
    onPageChange: (page) => {
      setCurrentPage(page);
      loadTermsData(activeTab);
    },
    onItemsPerPageChange: (itemsPerPage) => {
      setItemsPerPage(itemsPerPage);
      setCurrentPage(1);
      loadTermsData(activeTab);
    }
  });

  // Export state management using generic export hook
  // ===== Export Helpers (match SKTermReport look-and-feel) =====
  const buildTermCsvRows = (terms = []) => {
    const rows = [];
    rows.push(['Term Name', 'Start Date', 'End Date', 'Status', 'Filled', 'Vacant', 'Total', 'Fill Rate', 'Barangays']);
    (terms || []).forEach((t) => {
      const stats = extractTermStats(t) || {};
      rows.push([
        t.termName || '',
        t.startDate ? new Date(t.startDate).toLocaleDateString() : '',
        t.endDate ? new Date(t.endDate).toLocaleDateString() : '',
        (t.status || '').toString(),
        stats.filled ?? (t?.statistics?.capacity?.filledPositions ?? t?.filledPositions ?? ''),
        stats.vacant ?? (t?.statistics?.capacity?.vacantPositions ?? t?.vacantPositions ?? ''),
        stats.total ?? (t?.statistics?.capacity?.totalPositions ?? t?.officialsCount ?? ''),
        stats.percent != null ? `${stats.percent}%` : '',
        stats.barangays ?? ''
      ]);
    });
    return rows;
  };

  const downloadCsv = (filename, rows) => {
    const csv = rows
      .map(r => r.map(field => {
        const v = (field ?? '').toString();
        const escaped = v.replace(/"/g, '""');
        return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
      }).join(','))
      .join('\n');
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

  const openTermsPrintPdf = (title, terms = []) => {
    const win = window.open('', '_blank');
    if (!win) return;
    const styles = `
      <style>
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        body { font-family: Arial, sans-serif; color: #111; }
        h1 { font-size: 16px; margin: 0 0 8px; font-weight: 700; text-align: left; }
        table { width: 100%; border-collapse: collapse; table-layout: fixed; page-break-inside: avoid; }
        th, td { border: 1.2px solid #666; padding: 6px 8px; font-size: 11px; line-height: 1.15; }
        thead th { background: #eaf2ff !important; font-weight: 700; }
        thead { display: table-header-group; }
        .name { width: 220px; }
        .date { width: 110px; text-align: left; }
        .status { width: 80px; text-transform: capitalize; text-align: center; }
        .num { width: 60px; text-align: center; }
        .rate { width: 70px; text-align: center; }
        .brgy { width: 80px; text-align: center; }
        @page { size: A4 landscape; margin: 12mm; }
      </style>`;
    const header = `
      <thead>
        <tr>
          <th class="name">Term Name</th>
          <th class="date">Start Date</th>
          <th class="date">End Date</th>
          <th class="status">Status</th>
          <th class="num">Filled</th>
          <th class="num">Vacant</th>
          <th class="num">Total</th>
          <th class="rate">Fill %</th>
          <th class="brgy">Barangays</th>
        </tr>
      </thead>`;
    const rows = (terms || []).map((t) => {
      const s = extractTermStats(t) || {};
      const filled = s.filled ?? (t?.statistics?.capacity?.filledPositions ?? t?.filledPositions ?? '');
      const vacant = s.vacant ?? (t?.statistics?.capacity?.vacantPositions ?? t?.vacantPositions ?? '');
      const total = s.total ?? (t?.statistics?.capacity?.totalPositions ?? t?.officialsCount ?? '');
      const percent = s.percent != null ? `${s.percent}%` : '';
      const barangays = s.barangays ?? '';
      return `
        <tr>
          <td class="name">${(t.termName || '').toString()}</td>
          <td class="date">${t.startDate ? new Date(t.startDate).toLocaleDateString() : ''}</td>
          <td class="date">${t.endDate ? new Date(t.endDate).toLocaleDateString() : ''}</td>
          <td class="status">${(t.status || '').toString()}</td>
          <td class="num">${filled}</td>
          <td class="num">${vacant}</td>
          <td class="num">${total}</td>
          <td class="rate">${percent}</td>
          <td class="brgy">${barangays}</td>
        </tr>`;
    }).join('');

    win.document.write(`
      <html>
        <head>
          <title>${title}</title>
          ${styles}
        </head>
        <body>
          <h1>${title}</h1>
          <table>
            ${header}
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  };

  // Excel (XLS via XML) export (matches SKTermReport approach)
  const buildExcelXml = (terms = []) => {
    const headerRow = `
      <Row>
        <Cell><Data ss:Type="String">Term Name</Data></Cell>
        <Cell><Data ss:Type="String">Start Date</Data></Cell>
        <Cell><Data ss:Type="String">End Date</Data></Cell>
        <Cell><Data ss:Type="String">Status</Data></Cell>
        <Cell><Data ss:Type="String">Filled</Data></Cell>
        <Cell><Data ss:Type="String">Vacant</Data></Cell>
        <Cell><Data ss:Type="String">Total</Data></Cell>
        <Cell><Data ss:Type="String">Fill %</Data></Cell>
        <Cell><Data ss:Type="String">Barangays</Data></Cell>
      </Row>`;

    const bodyRows = (terms || []).map(t => {
      const s = extractTermStats(t) || {};
      const filled = s.filled ?? (t?.statistics?.capacity?.filledPositions ?? t?.filledPositions ?? '');
      const vacant = s.vacant ?? (t?.statistics?.capacity?.vacantPositions ?? t?.vacantPositions ?? '');
      const total = s.total ?? (t?.statistics?.capacity?.totalPositions ?? t?.officialsCount ?? '');
      const percent = s.percent != null ? `${s.percent}%` : '';
      const barangays = s.barangays ?? '';
      return `
        <Row>
          <Cell><Data ss:Type="String">${(t.termName || '').toString()}</Data></Cell>
          <Cell><Data ss:Type="String">${t.startDate ? new Date(t.startDate).toLocaleDateString() : ''}</Data></Cell>
          <Cell><Data ss:Type="String">${t.endDate ? new Date(t.endDate).toLocaleDateString() : ''}</Data></Cell>
          <Cell><Data ss:Type="String">${(t.status || '').toString()}</Data></Cell>
          <Cell><Data ss:Type="String">${filled}</Data></Cell>
          <Cell><Data ss:Type="String">${vacant}</Data></Cell>
          <Cell><Data ss:Type="String">${total}</Data></Cell>
          <Cell><Data ss:Type="String">${percent}</Data></Cell>
          <Cell><Data ss:Type="String">${barangays}</Data></Cell>
        </Row>`;
    }).join('');

    return `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
<Worksheet ss:Name="SK Terms">
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

  const mainExport = useExport({
    exportFunction: async (format, style = null) => {
      try {
        // Mirror SKTermReport: hit backend to log activity/notifications
        const resp = activeTerm?.termId ? await skService.exportTermDetailed(activeTerm.termId, 'json') : { success: false };
        if (resp.success) showSuccessToast('Export logged', 'Your export was recorded successfully');

        const response = await skTermsService.getSKTerms({
          limit: 1000,
          status: activeTab === 'all' ? undefined : activeTab,
          sortBy: 'created_at',
          sortOrder: 'desc'
        });
        if (!response.success) throw new Error(response.message || 'Failed to load terms');

        const terms = response.data?.data?.terms || response.data?.data || [];
        if (format === 'csv') {
          const rows = buildTermCsvRows(terms);
          downloadCsv('sk-terms.csv', rows);
        } else if (format === 'pdf') {
          openTermsPrintPdf('SK Terms', terms);
        } else if (format === 'excel') {
          const xml = buildExcelXml(terms);
          downloadExcel('sk-terms.xls', xml);
        }
        return { success: true };
      } catch (error) {
        throw new Error(error.message || 'Failed to export terms data');
      }
    },
    onSuccess: () => showSuccessToast('Export completed', 'Terms exported successfully'),
    onError: (error) => showErrorToast('Export failed', error.message)
  });

  const bulkExportHook = useExport({
    exportFunction: async (format, style = null) => {
      try {
        // Mirror SKTermReport for logging/notifications
        const resp = activeTerm?.termId ? await skService.exportTermDetailed(activeTerm.termId, 'json') : { success: false };
        if (resp.success) showSuccessToast('Export logged', 'Your export was recorded successfully');

        const selectedTermsData = termsData.filter(term => selectedItems.includes(term.termId));
        if (selectedTermsData.length === 0) {
          throw new Error('No terms selected for export');
        }

        if (format === 'csv') {
          const rows = buildTermCsvRows(selectedTermsData);
          downloadCsv('sk-terms-selected.csv', rows);
        } else if (format === 'pdf') {
          openTermsPrintPdf('SK Terms (Selected)', selectedTermsData);
        } else if (format === 'excel') {
          const xml = buildExcelXml(selectedTermsData);
          downloadExcel('sk-terms-selected.xls', xml);
        }
        return { success: true };
      } catch (error) {
        throw new Error(error.message || 'Failed to export selected terms');
      }
    },
    onSuccess: () => showSuccessToast('Bulk export completed', 'Selected terms exported successfully'),
    onError: (error) => showErrorToast('Bulk export failed', error.message)
  });

  // Load terms data from API
  const loadTermsData = async (statusFilter = 'all', overrides = {}) => {
    try {
      setIsLoading(true);
      
      // Load terms with filters for display
      const params = {
        page: currentPage,
        limit: itemsPerPage,
        q: searchQuery,
        sortBy: overrides.sortBy || sortBy,
        sortOrder: overrides.sortOrder || sortOrder
      };
      
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      
      const termsResponse = await skTermsService.getSKTerms(params);
      
      if (termsResponse.success) {
        let terms = termsResponse.data.data.terms || [];
        // Apply local filters (e.g., dateCreated) immediately
        const appliedFilters = overrides.filters || filterValues;
        if (appliedFilters?.dateCreated) {
          const cutoff = new Date(appliedFilters.dateCreated).setHours(0,0,0,0);
          terms = terms.filter(t => {
            const created = new Date(t.createdAt || t.created_at || t.created_at_ts || t.created_at_date).getTime();
            return Number.isFinite(created) ? created >= cutoff : true;
          });
        }
        setTermsData(terms);
        setTotalTerms(terms.length);
      } else {
        showErrorToast('Failed to load terms', termsResponse.message);
      }
      
      // Load complete dataset for stats calculation (always load all terms for accurate tab counts)
      const statsParams = {
        limit: 1000, // Get all terms for stats
        sortBy: 'created_at',
        sortOrder: 'desc'
      };
      
      const statsResponse = await skTermsService.getSKTerms(statsParams);
      
      if (statsResponse.success) {
        const allTerms = statsResponse.data.data.terms || [];
        
        // Calculate stats from complete dataset
        const stats = {
          total: allTerms.length,
          active: allTerms.filter(t => t.status === 'active').length,
          completed: allTerms.filter(t => t.status === 'completed').length,
          upcoming: allTerms.filter(t => t.status === 'upcoming').length
        };
        setTermsStats(stats);
      }
      
      // Active term is now handled by useActiveTerm hook
      // No need to manually load it here
      
    } catch (error) {
      console.error('Error loading terms data:', error);
      showErrorToast('Failed to load terms', 'An error occurred while loading terms data');
    } finally {
      setIsLoading(false);
    }
  };

  // Load data on component mount and check for overdue terms
  useEffect(() => {
    const initializeData = async () => {
      console.log('🔄 Initializing SK Terms page...');
      
      // First load the data
      await loadTermsData();
      
      // Wait a bit for the data to be set
      setTimeout(async () => {
        console.log('🔍 Checking for overdue terms...');
        console.log('Current terms data:', termsData);
        
        // Then check if there are any overdue terms and update them automatically
        const overdueTerms = termsData.filter(isTermOverdue);
        console.log('Overdue terms found:', overdueTerms);
        
        if (overdueTerms.length > 0) {
          console.log(`🔄 Found ${overdueTerms.length} overdue terms, updating automatically...`);
          try {
            const response = await skTermsService.triggerManualStatusUpdate();
            console.log('Manual status update response:', response);
            
            if (response.success) {
              console.log('✅ Automatic term status update completed');
              // Reload data to show updated statuses
              await loadTermsData();
            } else {
              console.log('❌ Automatic update failed:', response.message);
            }
          } catch (error) {
            console.error('❌ Automatic update error:', error);
          }
        } else {
          console.log('✅ No overdue terms found');
        }
      }, 1000); // Wait 1 second for data to load
    };
    
    initializeData();
  }, []);

  // Reload terms data without refreshing active term (for completion operations)
  const reloadTermsDataWithoutActiveTerm = async (statusFilter = 'all') => {
    try {
      setIsLoading(true);
      
      // Load terms with filters for display
      const params = {
        page: currentPage,
        limit: itemsPerPage,
        q: searchQuery,
        sortBy: sortBy,
        sortOrder: sortOrder
      };
      
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      
      const termsResponse = await skTermsService.getSKTerms(params);
      
      if (termsResponse.success) {
        const terms = termsResponse.data.data.terms || [];
        setTermsData(terms);
        setTotalTerms(termsResponse.data.data.pagination?.totalRecords || terms.length);
      } else {
        showErrorToast('Failed to load terms', termsResponse.message);
      }
      
      // Load complete dataset for stats calculation (always load all terms for accurate tab counts)
      const statsParams = {
        limit: 1000, // Get all terms for stats
        sortBy: 'created_at',
        sortOrder: 'desc'
      };
      
      const statsResponse = await skTermsService.getSKTerms(statsParams);
      
      if (statsResponse.success) {
        const allTerms = statsResponse.data.data.terms || [];
        
        // Calculate stats from complete dataset
        const stats = {
          total: allTerms.length,
          active: allTerms.filter(t => t.status === 'active').length,
          completed: allTerms.filter(t => t.status === 'completed').length,
          upcoming: allTerms.filter(t => t.status === 'upcoming').length
        };
        setTermsStats(stats);
      }
      
      // Active term is now handled by useActiveTerm hook
      // No need to manually clear it
      
    } catch (error) {
      console.error('Error reloading terms data:', error);
      showErrorToast('Failed to reload terms', 'An error occurred while reloading terms data');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter terms by status (for local filtering if needed)
  const filterTermsByStatus = (terms, status) => {
    if (status === 'all') return terms;
    return terms.filter(term => term.status === status);
  };

  // Check if any filters are active
  const hasActiveFilters = Object.values(filterValues).some(value => {
    if (Array.isArray(value)) return value.length > 0;
    return value && value !== '';
  });

  // Handle filter changes
  const handleFilterChange = (newValues) => {
    setFilterValues(newValues);
  };

  const handleFilterApply = (appliedValues) => {
    setFilterValues(appliedValues);
    setCurrentPage(1); // Reset to first page when filtering
    loadTermsData(activeTab, { filters: appliedValues });
  };

  const handleFilterClear = (clearedValues) => {
    setFilterValues(clearedValues);
    setCurrentPage(1);
    loadTermsData(activeTab, { filters: clearedValues });
  };

  // Get action menu items for a term
  const getActionMenuItems = (item) => {
    const items = [
      {
        id: 'view',
        label: 'View Details',
        icon: <Eye className="w-4 h-4" />,
        action: 'view'
      },
      {
        id: 'history',
        label: 'View History',
        icon: <Clock className="w-4 h-4" />,
        action: 'history'
      },
      {
        id: 'report',
        label: 'Open Term Report',
        icon: <FileText className="w-4 h-4" />,
        action: 'report'
      },
      {
        id: 'edit',
        label: 'Edit Term',
        icon: <Edit className="w-4 h-4" />,
        action: 'edit'
      }
    ];

    // Status-specific actions
    switch (item.status) {
      case 'upcoming':
        items.push({
          id: 'activate',
          label: 'Activate Term',
          icon: <Play className="w-4 h-4" />,
          action: 'activate'
        });
        break;
        
      case 'active':
        items.push({
          id: 'complete',
          label: 'Complete Term',
          icon: <Pause className="w-4 h-4" />,
          action: 'complete'
        });
        break;
        
      case 'completed':
        items.push({
          id: 'extend',
          label: 'Extend Term',
          icon: <Clock className="w-4 h-4" />,
          action: 'extend'
        });
        break;
    }

    return items;
  };

  const handleActionClick = async (action, item) => {
    setSelectedTerm(item);
    
    switch (action) {
      case 'view':
        setShowViewModal(true);
        break;
      case 'edit':
        {
          // Populate edit form with current term data
          const formattedStartDate = formatDateForInput(item.startDate);
          const formattedEndDate = formatDateForInput(item.endDate);
          
          console.log('🔧 Edit term data:', {
            original: {
              termName: item.termName,
              startDate: item.startDate,
              endDate: item.endDate
            },
            formatted: {
              termName: item.termName,
              startDate: formattedStartDate,
              endDate: formattedEndDate
            }
          });
          
          setEditData({
            termName: item.termName,
            startDate: formattedStartDate,
            endDate: formattedEndDate
          });
        setShowEditModal(true);
        }
        break;
      case 'history':
        navigate(`/admin/sk-governance/term-history?termId=${item.termId}`);
        break;
      case 'report':
        navigate(`/admin/sk-governance/term-report?termId=${item.termId}`);
        break;
      case 'activate':
        {
          const confirmed = await confirmation.confirmActivate(item.termName);
          if (confirmed) {
            confirmation.setLoading(true);
            try {
              console.log('🔧 Attempting to activate term:', item.termId, item.termName);
              const response = await skTermsService.activateSKTerm(item.termId);
              
              if (response.success) {
            showSuccessToast('Term activated', `${item.termName} has been activated successfully`);
                await loadTermsData(activeTab); // Reload data
              } else {
                console.error('❌ Activation failed:', response);
                let errorMessage = response.message || 'Unknown error occurred';
                
                // If there are specific validation errors, show them
                if (response.errors && Array.isArray(response.errors)) {
                  if (response.errors.length === 1) {
                    errorMessage = response.errors[0];
                  } else if (response.errors.length === 2) {
                    errorMessage = `${response.errors[0]} and ${response.errors[1].toLowerCase()}`;
                  } else {
                    errorMessage = `Please fix ${response.errors.length} issues: ${response.errors.slice(0, 2).join(', ')}${response.errors.length > 2 ? ' and more...' : ''}`;
                  }
                }
                
                // If there are specific suggestions, add them to the error message
                if (response.details && response.details.specificSuggestions && response.details.specificSuggestions.length > 0) {
                  const suggestions = response.details.specificSuggestions.slice(0, 2); // Show max 2 suggestions
                  errorMessage += `\n\n💡 Suggestions:\n• ${suggestions.join('\n• ')}`;
                }
                
                showErrorToast('Term Activation Failed', errorMessage);
              }
            } catch (error) {
              console.error('❌ Exception during activation:', error);
              let errorMessage = 'An error occurred while activating the term';
              
              if (error.response) {
                const { data, status } = error.response;
                console.error('❌ HTTP Error:', status, data);
                
                if (data && data.message) {
                  errorMessage = data.message;
                } else if (data && data.errors) {
                  errorMessage = Array.isArray(data.errors) ? data.errors.join(', ') : JSON.stringify(data.errors);
                } else {
                  errorMessage = `HTTP ${status}: ${data || 'Unknown error'}`;
                }
              } else if (error.request) {
                errorMessage = 'Network error. Please check your connection.';
              } else {
                errorMessage = error.message || errorMessage;
              }
              
              showErrorToast('Activation failed', errorMessage);
            } finally {
            confirmation.hideConfirmation();
            }
          }
        }
        break;
      case 'complete':
        {
          // Show completion options modal instead of direct completion
          setCompletionTerm(item);
          setShowCompletionOptionsModal(true);
        }
        break;
      case 'extend':
        setShowExtensionModal(true);
        break;
    }
  };

  const handleSelectItem = (id) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedItems(selectedItems.length === termsData.length ? [] : termsData.map(item => item.termId));
  };

  const handleSearchChange = (newQuery) => {
    setSearchQuery(newQuery);
    setCurrentPage(1);
    // Debounce search to avoid too many API calls
    const timeoutId = setTimeout(() => {
      loadTermsData(activeTab);
    }, 500);
    return () => clearTimeout(timeoutId);
  };

  // Handle manual status update trigger
  const handleManualStatusUpdate = async () => {
    try {
      const response = await skTermsService.triggerManualStatusUpdate();
      if (response.success) {
        showSuccessToast('Status update triggered', 'Term statuses have been updated automatically');
        // Reload data to reflect changes
        await loadTermsData(activeTab);
      } else {
        showErrorToast('Status update failed', response.message || 'Failed to update term statuses');
      }
    } catch (error) {
      console.error('Manual status update error:', error);
      showErrorToast('Status update failed', 'An error occurred while updating term statuses');
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form data
    const validation = skTermsService.validateTermData(formData);
    if (!validation.isValid) {
      showErrorToast('Validation failed', validation.errors.join(', '));
      return;
    }
    
    try {
      setIsEditingSaving(true);
      
      console.log('📝 Creating term with data:', formData);
      const response = await skTermsService.createSKTerm(formData);
      console.log('📝 Create term response:', response);
      
      if (response.success) {
        // Enhanced success with Universal Toast (similar to StaffManagement)
        const { data } = response;
      
      showSuccessToast('Term created', `${formData.termName} has been created successfully`, [
        {
          label: "View Term",
          onClick: () => {
              // Find the created term and show details
              const createdTerm = { 
                termId: data.termId,
                termName: data.termName,
                startDate: data.startDate,
                endDate: data.endDate,
                status: data.status
              };
              setSelectedTerm(createdTerm);
              setShowViewModal(true);
            },
            variant: 'primary'
        },
          {
            label: "Create Another",
            onClick: () => {
              // Keep form open for another creation
              setFormCollapsed(false);
            }
          }
        ]);
      
      // Reset form
      setFormData({
        termName: '',
        startDate: '',
          endDate: ''
      });
        setFormCollapsed(true);
        
        // Reload data
        await loadTermsData(activeTab);
      } else {
        // Enhanced error handling with specific validation errors
        let errorMessage = response.message;
        
        // If there are specific validation errors, show them
        if (response.errors && Array.isArray(response.errors)) {
          if (response.errors.length === 1) {
            errorMessage = response.errors[0];
          } else if (response.errors.length === 2) {
            errorMessage = `${response.errors[0]} and ${response.errors[1].toLowerCase()}`;
          } else {
            errorMessage = `Please fix ${response.errors.length} issues: ${response.errors.slice(0, 2).join(', ')}${response.errors.length > 2 ? ' and more...' : ''}`;
          }
        }
        
        // If there are specific suggestions, add them to the error message
        if (response.details && response.details.specificSuggestions && response.details.specificSuggestions.length > 0) {
          const suggestions = response.details.specificSuggestions.slice(0, 2); // Show max 2 suggestions
          errorMessage += `\n\n💡 Suggestions:\n• ${suggestions.join('\n• ')}`;
        }
        
        // Log suggested dates for debugging
        if (response.details && response.details.suggestions) {
          console.log('💡 Suggested dates:', response.details.suggestions);
        }
        
        showErrorToast('Term Creation Failed', errorMessage);
      }
    } catch (error) {
      console.error('Error creating term:', error);
      
      // Enhanced error message for network/technical errors
      let errorMessage = 'Failed to create term';
      if (error.message) {
        errorMessage = error.message;
      } else if (error.response && error.response.data && error.response.data.message) {
        errorMessage = error.response.data.message;
      }
      
      showErrorToast('Creation Failed', errorMessage);
    } finally {
      setIsEditingSaving(false);
    }
  };

  // Helpers for card UI
  const getProgressPercent = (item) => extractTermStats(item)?.percent ?? 0;
  const getFilledVsTotal = (item) => {
    const s = extractTermStats(item);
    return s ? { filled: s.filled, total: s.total, vacant: s.vacant } : { filled: 0, total: 0, vacant: 0 };
  };
  const getBarangaysCount = (item) => extractTermStats(item)?.barangays ?? null;

  // Get term display fields for DataTable
  const getTermDisplayFields = () => ({
    title: (item) => (
      <div className="flex items-center space-x-2">
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 text-blue-600">
          <Calendar className="w-4 h-4" />
        </span>
        <span className="font-medium text-gray-900">{item.termName}</span>
      </div>
    ),
    subtitle: (item) => {
      const { filled, total, vacant } = getFilledVsTotal(item);
      const percent = getProgressPercent(item);
      const barangays = getBarangaysCount(item);
      return (
      <div className="space-y-2">
        {/* Date Range */}
        <div className="flex items-center text-sm text-gray-600">
          <Calendar className="w-3 h-3 mr-1" />
          {new Date(item.startDate).toLocaleDateString()} - {new Date(item.endDate).toLocaleDateString()}
          {(() => {
            const days = getActiveTermDaysRemaining(item.endDate);
            const isOverdue = isTermOverdue(item);
            const overdueDays = getOverdueDays(item.endDate);
            
            if (isOverdue) {
              return (
                <span className="ml-2 text-xs text-red-600 font-medium">
                  ⚠️ Overdue by {overdueDays} day{overdueDays !== 1 ? 's' : ''}
                </span>
              );
            } else if (days !== null) {
              return (
                <span className="ml-2 text-xs text-gray-500">
                  {days > 0 ? `• Ends in ${days} day${days !== 1 ? 's' : ''}` : days === 0 ? '• Ends today' : `• Ended ${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''} ago`}
                </span>
              );
            }
            return null;
          })()}
        </div>
        
        {/* Quick stats chips */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
              {filled}/{total} Positions
            </span>
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
              {percent}% Filled
          </span>
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${vacant > 0 ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
              {vacant} Vacant
            </span>
            {typeof barangays === 'number' && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200">
                {barangays} Barangays
            </span>
          )}
        </div>
        
        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div
            className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${percent}%` }}
          ></div>
        </div>
      </div>
      );
    },
    status: (item) => item.status,
    date: 'createdAt',
    badge: (item) => ({
      text: `${(item?.statistics?.capacity?.totalPositions ?? item?.officialsCount ?? 0)} Capacity`,
      className: 'bg-blue-100 text-blue-700 border border-blue-200'
    })
  });

  return (
    <div className="space-y-5">
      {/* Header Section */}
      <HeaderMainContent
        title="SK Terms Management"
        description="Create, manage, and track SK terms and their lifecycle"
      />



            <ActiveTermBanner
        activeTerm={activeTerm}
        hasActiveTerm={hasActiveTerm}
        isLoading={isLoadingActiveTerm}
        onNavigateToReport={() => navigate(`/admin/sk-governance/term-report?termId=${activeTerm?.termId}`)}
        onCreateTerm={() => setFormCollapsed(false)}
        variant="terms"
      />

      {/* Manual Status Update Button - Show if there are overdue terms */}
      {(() => {
        const overdueTerms = termsData.filter(isTermOverdue);
        if (overdueTerms.length > 0) {
          return (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <AlertTriangle className="w-5 h-5 text-orange-600 mr-3" />
            <div>
                    <h3 className="text-sm font-medium text-orange-800">
                      {overdueTerms.length} term{overdueTerms.length > 1 ? 's' : ''} overdue
                    </h3>
                    <p className="text-sm text-orange-700">
                      {overdueTerms.map(term => `${term.termName} (${getOverdueDays(term.endDate)} days)`).join(', ')}
                    </p>
            </div>
              </div>
                <button
                  onClick={handleManualStatusUpdate}
                  className="inline-flex items-center px-3 py-2 border border-orange-300 text-orange-700 text-sm font-medium rounded-lg hover:bg-orange-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Update Status
                </button>
              </div>
            </div>
          );
        }
        return null;
      })()}



      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column - Terms List */}
        <div className="xl:col-span-2">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Tabs - Using Reusable Tab Components */}
            <TabContainer
              activeTab={activeTab}
              onTabChange={setActiveTab}
              variant="underline"
              size="md"
            >
              <Tab 
                id="all" 
                label="All Terms" 
                shortLabel="All"
                count={termsStats.total} 
                color="blue"
              />
              <Tab 
                id="active" 
                label="Active" 
                count={termsStats.active} 
                color="green"
              />
              <Tab 
                id="upcoming" 
                label="Upcoming" 
                count={termsStats.upcoming} 
                color="yellow"
              />
              <Tab 
                id="completed" 
                label="Completed" 
                count={termsStats.completed} 
                color="gray"
              />
            </TabContainer>

            {/* Controls */}
            <div className="px-5 py-4 border-t border-gray-100">
              {/* Left/Right Layout with Single Row */}
              <div className="flex items-center justify-between gap-4">
                {/* Left Controls */}
                <div className="flex items-center gap-3 overflow-x-auto pb-2 md:pb-0 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                  <div className="flex items-center space-x-3 min-w-max">
                    {/* Search Bar */}
                    <div className="flex-shrink-0">
                      <SearchBar
                        value={searchQuery}
                        onChange={handleSearchChange}
                        placeholder="Search terms..." 
                        expandOnMobile={true}
                        showIndicator={true}
                        indicatorText="Search"
                        indicatorColor="blue"
                        size="md"
                        autoFocus={false}
                        debounceMs={300}
                      />
                    </div>

                    {/* Filter Button */}
                    <button 
                      ref={filterTriggerRef}
                      onClick={() => setShowFilterModal(true)}
                      className={`inline-flex items-center border rounded-lg font-medium transition-all duration-200 ${
                        showFilterModal || hasActiveFilters
                          ? 'border-blue-500 text-blue-600 bg-blue-50' 
                          : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                      } px-2 py-1.5 sm:px-3 sm:py-2 whitespace-nowrap flex-shrink-0`}
                    >
                      <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Filter</span>
                      <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1" />
                      
                      {/* Filter Indicator */}
                      {hasActiveFilters && (
                        <div className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full border border-blue-200">
                          {Object.values(filterValues).filter(v => v && v !== '' && (!Array.isArray(v) || v.length > 0)).length}
                        </div>
                      )}
                    </button>

                    {/* Sort Button */}
                    <button 
                      ref={sortModal.triggerRef}
                      onClick={sortModal.toggleModal}
                      className={`inline-flex items-center border rounded-lg font-medium transition-all duration-200 ${
                        sortModal.isOpen || !sortModal.isDefaultSort
                          ? 'border-blue-500 text-blue-600 bg-blue-50' 
                          : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                      } px-2 py-1.5 sm:px-3 sm:py-2 whitespace-nowrap flex-shrink-0`}
                    >
                      <ArrowUpDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Sort</span>
                      <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1" />
                      
                      {/* Sort Indicator */}
                      {!sortModal.isDefaultSort && (
                        <div className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full border border-blue-200">
                          {sortModal.sortOrder === 'asc' ? '↑' : '↓'}
                        </div>
                      )}
                    </button>
                  </div>
                </div>

                {/* Right Controls */}
                <div className="flex items-center space-x-3 flex-shrink-0">
                  {/* Export Button */}
                  <ExportButton
                    formats={['csv', 'xlsx', 'pdf']}
                    onExport={(format) => mainExport.handleExport(format === 'xlsx' ? 'excel' : format)}
                    isExporting={mainExport.isExporting}
                    label="Export"
                    size="md"
                    position="auto"
                    responsive={true}
                  />

                  {/* View Mode Toggle */}
                  <div className="flex items-center border border-gray-200 rounded-lg p-1">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-1.5 rounded transition-all duration-200 ${
                        viewMode === 'grid' 
                          ? 'bg-white text-blue-600 shadow-sm' 
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      <Grid className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-1.5 rounded transition-all duration-200 ${
                        viewMode === 'list' 
                          ? 'bg-white text-blue-600 shadow-sm' 
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Sort Modal */}
              <SortModal
                isOpen={sortModal.isOpen}
                onClose={sortModal.closeModal}
                triggerRef={sortModal.triggerRef}
                title="Sort Options"
                sortFields={[
                  { value: 'term_name', label: 'Term Name' },
                  { value: 'start_date', label: 'Start Date' },
                  { value: 'end_date', label: 'End Date' },
                  { value: 'status', label: 'Status' },
                  { value: 'created_at', label: 'Date Created' },
                  { value: 'statistics_total_officials', label: 'Total Officials' }
                ]}
                sortBy={sortModal.sortBy}
                sortOrder={sortModal.sortOrder}
                onSortChange={sortModal.updateSort}
                onReset={sortModal.resetSort}
                defaultSortBy="created_at"
                defaultSortOrder="desc"
              />

              {/* Filter Modal */}
              <FilterModal
                isOpen={showFilterModal}
                onClose={() => setShowFilterModal(false)}
                triggerRef={filterTriggerRef}
                title="Advanced Filters"
                filters={[
                  {
                    id: 'dateCreated',
                    label: 'Created After',
                    type: 'date',
                    description: 'Show terms created after this date'
                  }
                ]}
                values={filterValues}
                onChange={handleFilterChange}
                onApply={handleFilterApply}
                onClear={handleFilterClear}
                applyButtonText="Apply Filters"
                clearButtonText="Clear All"
              />
            </div>

            {/* Bulk Actions */}
            <BulkActionsBar
              selectedCount={selectedItems.length}
              itemName="term"
              itemNamePlural="terms"
              onBulkAction={() => bulkModal.showModal()}
              exportConfig={{
                formats: ['csv', 'xlsx', 'pdf'],
                onExport: (format) => bulkExportHook.handleExport(format === 'xlsx' ? 'excel' : format),
                isExporting: bulkExportHook.isExporting,
                // Keep PDF simple (no style submenu) to match top Export button feel
                customFormats: { pdf: { label: 'Export as PDF', icon: <FileText className="w-4 h-4" />, description: 'Portable document format', styles: [] } }
              }}
              primaryColor="blue"
            />

            {/* Content Area */}
            {tabLoading ? (
              <LoadingSpinner 
                variant="spinner"
                message="Loading terms data..." 
                size="md"
                color="blue"
                height="h-64"
              />
            ) : (
              <DataTable
                data={termsData}
                selectedItems={selectedItems}
                onSelectItem={handleSelectItem}
                onSelectAll={handleSelectAll}
                getActionMenuItems={getActionMenuItems}
                onActionClick={handleActionClick}
                viewMode={viewMode}
                keyField="termId"
                displayFields={getTermDisplayFields()}
                selectAllLabel="Select All Terms"
                emptyMessage="No terms found"
                                 styling={{
                   gridCols: 'grid-cols-1 lg:grid-cols-2',
                  cardHover: 'hover:border-blue-300 hover:shadow-xl hover:shadow-blue-100/50 hover:scale-[1.02]',
                  listHover: 'hover:bg-blue-50/30 hover:border-l-4 hover:border-l-blue-400',
                  theme: 'blue'
                 }}
              />
            )}

            {/* Pagination */}
            {!tabLoading && (
              <Pagination
                currentPage={currentPage}
                totalItems={totalTerms}
                itemsPerPage={itemsPerPage}
                onPageChange={pagination.handlePageChange}
                onItemsPerPageChange={pagination.handleItemsPerPageChange}
                itemName="term"
                itemNamePlural="terms"
                showItemsPerPage={true}
                showInfo={true}
                size="md"
                variant="default"
                itemsPerPageOptions={[5, 10, 20, 50]}
              />
            )}
          </div>
        </div>

        {/* Right Column - Add New Term Form */}
        <div className="xl:col-span-1">
          <CollapsibleForm
            title="Create New Term"
            description="Create a new SK term with start and end dates"
            icon={<Plus className="w-5 h-5" />}
            defaultCollapsed={formCollapsed}
            onToggle={setFormCollapsed}
            iconBgColor="bg-blue-100"
            iconTextColor="text-blue-600"
            className="sticky top-4"
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Term Information */}
                <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-blue-600" />
                  Term Information
                  </h3>
                  
                  <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Term Name *</label>
                    <input
                      type="text"
                      name="termName"
                      value={formData.termName}
                      onChange={handleFormChange}
                      required
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    placeholder="2025-2027 SK Term"
                    />
                  </div>

                  <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                    <input
                      type="date"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleFormChange}
                      required
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    />
                  </div>

                  <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
                    <input
                      type="date"
                      name="endDate"
                      value={formData.endDate}
                      onChange={handleFormChange}
                      required
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    />
                  </div>


                    </div>

              {/* Form Actions */}
              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setFormData({
                    termName: '',
                    startDate: '',
                    endDate: ''
                  })}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-200 transition-all duration-200"
                >
                  Clear Form
                </button>
                <button
                  type="submit"
                  disabled={isEditingSaving}
                  className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-200 transition-all duration-200 disabled:opacity-50"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isEditingSaving ? 'Creating...' : 'Create Term'}
                </button>
                </div>
            </form>
          </CollapsibleForm>
        </div>
      </div>

      {/* Term Details View Modal */}
      {showViewModal && selectedTerm && createPortal(
        <div className="fixed inset-0 flex items-center justify-center z-[99999] p-4 backdrop-blur-[1px]" onClick={() => setShowViewModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{selectedTerm.termName}</h3>
                    <p className="text-sm text-gray-600">Term Details</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">Basic Information</h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Term Name</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedTerm.termName}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Date Range</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {new Date(selectedTerm.startDate).toLocaleDateString()} - {new Date(selectedTerm.endDate).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <div className="mt-1">
                      <Status status={selectedTerm.status} />
                      {selectedTerm.isCurrent && (
                        <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                          Current Term
                        </span>
                      )}
                    </div>
                  </div>
                  

                </div>
                
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">Statistics</h4>
                  
                  {(() => {
                    const stats = extractTermStats(selectedTerm);
                    return (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <div className="text-2xl font-bold text-blue-800">{stats?.total || 0}</div>
                          <div className="text-sm text-blue-600">Total Positions</div>
                    </div>
                    
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <div className="text-2xl font-bold text-green-800">{stats?.filled || 0}</div>
                          <div className="text-sm text-green-600">Filled Positions</div>
                    </div>
                    
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                          <div className="text-2xl font-bold text-orange-800">{stats?.vacant || 0}</div>
                          <div className="text-sm text-orange-600">Vacant Positions</div>
                    </div>
                    
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                          <div className="text-2xl font-bold text-purple-800">{stats?.percent || 0}%</div>
                          <div className="text-sm text-purple-600">Fill Rate</div>
                    </div>
                  </div>
                    );
                  })()}
                </div>
              </div>
              
              {/* Position Breakdown */}
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-4">Position Breakdown</h4>
                {(() => {
                  const stats = extractTermStats(selectedTerm);
                  
                  if (!stats) {
                    return (
                      <div className="text-center py-8 text-gray-500">
                        <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p>No position data available for this term</p>
                      </div>
                    );
                  }
                  
                  const positions = [
                    {
                      name: 'SK Chairperson',
                      filled: stats.byPosition?.chairpersons || 0,
                      total: stats.capacityByPosition?.chairpersons || 0,
                      color: 'yellow',
                      icon: <User className="w-4 h-4 text-yellow-600" />
                    },
                    {
                      name: 'SK Secretary',
                      filled: stats.byPosition?.secretaries || 0,
                      total: stats.capacityByPosition?.secretaries || 0,
                      color: 'blue',
                      icon: <FileText className="w-4 h-4 text-blue-600" />
                    },
                    {
                      name: 'SK Treasurer',
                      filled: stats.byPosition?.treasurers || 0,
                      total: stats.capacityByPosition?.treasurers || 0,
                      color: 'green',
                      icon: <BarChart3 className="w-4 h-4 text-green-600" />
                    },
                    {
                      name: 'SK Councilor',
                      filled: stats.byPosition?.councilors || 0,
                      total: stats.capacityByPosition?.councilors || 0,
                      color: 'purple',
                      icon: <Users className="w-4 h-4 text-purple-600" />
                    }
                  ];
                  
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      {positions.map((position) => (
                        <div key={position.name} className={`bg-${position.color}-50 border border-${position.color}-200 rounded-lg p-4`}>
                    <div className="flex items-center justify-between">
                      <div>
                              <div className="text-lg font-semibold text-gray-800">{position.filled}</div>
                              <div className="text-sm text-gray-600">{position.name}</div>
                              <div className="text-xs text-gray-500 mt-1">
                                {position.filled} of {position.total} filled
                      </div>
                    </div>
                            <div className={`w-8 h-8 bg-${position.color}-100 rounded-lg flex items-center justify-center`}>
                              {position.icon}
                  </div>
                      </div>
                    </div>
                      ))}
                  </div>
                  );
                })()}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end space-x-3">
                    <button
                onClick={() => setShowViewModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                Close
                    </button>
                  <button
                onClick={() => {
                  setShowViewModal(false);
                  // Populate edit form with current term data
                  setEditData({
                    termName: selectedTerm.termName,
                    startDate: formatDateForInput(selectedTerm.startDate),
                    endDate: formatDateForInput(selectedTerm.endDate)
                  });
                  setShowEditModal(true);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Edit Term
                  </button>
                </div>
          </div>
        </div>,
        document.body
      )}

      {/* Term Extension Modal */}
      {showExtensionModal && selectedTerm && createPortal(
        <div className="fixed inset-0 flex items-center justify-center z-[99999] p-4 backdrop-blur-[1px]" onClick={() => setShowExtensionModal(false)}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Extend Term</h3>
              <p className="text-sm text-gray-600 mt-1">
                Extend the end date for {selectedTerm.termName}
              </p>
            </div>
            
            <div className="px-6 py-4 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Current Term Information</h4>
                <div className="text-sm text-blue-700">
                  <p><strong>Term:</strong> {selectedTerm.termName}</p>
                  <p><strong>Current End Date:</strong> {new Date(selectedTerm.endDate).toLocaleDateString()}</p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New End Date *
                </label>
                <input
                  type="date"
                  value={extensionData.newEndDate}
                  onChange={(e) => setExtensionData(prev => ({ ...prev, newEndDate: e.target.value }))}
                  min={selectedTerm.endDate}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  New end date must be after current end date
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason (Optional)
                </label>
                <textarea
                  value={extensionData.reason}
                  onChange={(e) => setExtensionData(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="Why is this term being extended?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows="3"
                />
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                    <button
                onClick={() => {
                  setShowExtensionModal(false);
                  setExtensionData({ newEndDate: '', reason: '' });
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
                    </button>
                    <button
                onClick={async () => {
                  if (!extensionData.newEndDate) {
                    showErrorToast('Validation failed', 'New end date is required');
                    return;
                  }
                  
                  try {
                    const response = await skTermsService.extendSKTerm(
                      selectedTerm.termId, 
                      extensionData.newEndDate, 
                      extensionData.reason
                    );
                    
                                         if (response.success) {
                  showSuccessToast('Term extended', `${selectedTerm.termName} has been extended successfully`);
                  setShowExtensionModal(false);
                       setExtensionData({ newEndDate: '', reason: '' });
                       
                       // Reload data and refresh active term since extension makes it active again
                       await loadTermsData(activeTab);
                     } else {
                      showErrorToast('Extension failed', response.message || 'Failed to extend term');
                    }
                  } catch (error) {
                    console.error('Extension error:', error);
                    showErrorToast('Extension failed', 'An error occurred while extending the term');
                  }
                }}
                disabled={!extensionData.newEndDate}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Extend Term
                    </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Term Edit Modal */}
      {showEditModal && selectedTerm && createPortal(
        <div className="fixed inset-0 flex items-center justify-center z-[99999] p-4 backdrop-blur-[1px]" onClick={() => setShowEditModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Edit className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Edit Term</h3>
                    <p className="text-sm text-gray-600">Update details for {selectedTerm.termName}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {/* Current Information */}
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-4">Current Term Information</h4>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-blue-700">Term Name</label>
                      <p className="mt-1 text-sm text-blue-900 font-medium">{selectedTerm.termName}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-blue-700">Status</label>
                      <div className="mt-1">
                        <Status status={selectedTerm.status} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-blue-700">Current Date Range</label>
                      <p className="mt-1 text-sm text-blue-900">
                        {new Date(selectedTerm.startDate).toLocaleDateString()} - {new Date(selectedTerm.endDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Edit Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">Edit Term Details</h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Term Name *
                    </label>
                    <input
                      type="text"
                      value={editData.termName}
                      onChange={(e) => setEditData(prev => ({ ...prev, termName: e.target.value }))}
                      placeholder="Enter term name (minimum 5 characters)"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                        editData.termName && editData.termName.length < 5 
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                          : 'border-gray-300'
                      }`}
                    />
                    {editData.termName && editData.termName.length < 5 && (
                      <p className="mt-1 text-sm text-red-600">
                        Term name must be at least 5 characters long
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      value={editData.startDate}
                      onChange={(e) => setEditData(prev => ({ ...prev, startDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date *
                    </label>
                    <input
                      type="date"
                      value={editData.endDate}
                      onChange={(e) => setEditData(prev => ({ ...prev, endDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Preview Changes */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">Preview Changes</h4>
                  
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">New Term Name</label>
                        <p className="mt-1 text-sm text-gray-900 font-medium">{editData.termName || selectedTerm.termName}</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">New Date Range</label>
                        <p className="mt-1 text-sm text-gray-900">
                          {editData.startDate ? new Date(editData.startDate).toLocaleDateString() : 'Not set'} - {editData.endDate ? new Date(editData.endDate).toLocaleDateString() : 'Not set'}
                        </p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Duration</label>
                        <p className="mt-1 text-sm text-gray-900">
                          {editData.startDate && editData.endDate ? 
                            `${Math.ceil((new Date(editData.endDate) - new Date(editData.startDate)) / (1000 * 60 * 60 * 24))} days` : 
                            'Not set'
                          }
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Validation Status */}
                  <div className={`border rounded-lg p-4 ${!editData.termName || !editData.startDate || !editData.endDate || (editData.termName && editData.termName.length < 5) ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                    <div className="flex items-center space-x-2">
                      {!editData.termName || !editData.startDate || !editData.endDate ? (
                        <>
                          <AlertCircle className="w-4 h-4 text-red-500" />
                          <span className="text-sm font-medium text-red-700">Please fill in all required fields</span>
                        </>
                      ) : editData.termName && editData.termName.length < 5 ? (
                        <>
                          <AlertCircle className="w-4 h-4 text-red-500" />
                          <span className="text-sm font-medium text-red-700">Term name must be at least 5 characters</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-sm font-medium text-green-700">All fields are valid</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditData({ termName: '', startDate: '', endDate: '' });
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!editData.termName || !editData.startDate || !editData.endDate) {
                    showErrorToast('Validation failed', 'All fields are required');
                    return;
                  }
                  
                  try {
                    setIsEditingSaving(true);
                    
                    console.log('🔧 Updating term with data:', {
                      termId: selectedTerm.termId,
                      editData: editData,
                      selectedTerm: selectedTerm
                    });
                    
                    // Try direct API call for debugging
                    let response;
                    try {
                      response = await skTermsService.updateSKTerm(selectedTerm.termId, editData);
                    } catch (directError) {
                      console.log('🔧 Direct error caught:', directError);
                      console.log('🔧 Direct error response:', directError.response);
                      console.log('🔧 Direct error data:', directError.response?.data);
                      
                      // Try to extract error details directly
                      const errorData = directError.response?.data;
                      if (errorData) {
                        response = {
                          success: false,
                          message: errorData.message || 'Update failed',
                          details: errorData.errors || [],
                          suggestions: errorData.suggestions || null
                        };
                      } else {
                        response = {
                          success: false,
                          message: 'Update failed',
                          details: [],
                          suggestions: null
                        };
                      }
                    }
                    
                    console.log('🔧 Frontend received response:', response);
                    console.log('🔧 Response type:', typeof response);
                    console.log('🔧 Response keys:', Object.keys(response));
                    
                    if (response.success) {
                      showSuccessToast('Term updated', `${selectedTerm.termName} has been updated successfully`);
                      setShowEditModal(false);
                      setEditData({ termName: '', startDate: '', endDate: '' });
                      
                      // Reload data
                      await loadTermsData(activeTab);
                    } else {
                      console.error('❌ Update failed:', response);
                      console.log('🔍 Response structure:', {
                        message: response.message,
                        details: response.details,
                        suggestions: response.suggestions,
                        status: response.status
                      });
                      console.log('🔍 Full response object:', JSON.stringify(response, null, 2));
                      
                      // Build error message
                      let errorMessage = 'Term update failed';
                      
                      console.log('🔍 Checking response.details:', response.details);
                      console.log('🔍 Checking response.errors:', response.errors);
                      console.log('🔍 Checking response.message:', response.message);
                      
                      // Add specific validation errors
                      if (response.details && Array.isArray(response.details) && response.details.length > 0) {
                        errorMessage = response.details.join('. ');
                        console.log('🔍 Using response.details:', errorMessage);
                      } else if (response.errors && Array.isArray(response.errors) && response.errors.length > 0) {
                        errorMessage = response.errors.join('. ');
                        console.log('🔍 Using response.errors:', errorMessage);
                      } else if (response.message && response.message !== 'Validation failed') {
                        errorMessage = response.message;
                        console.log('🔍 Using response.message:', errorMessage);
                      } else {
                        console.log('🔍 No specific error found, using default message');
                      }
                      
                      // Add suggestions if available
                      if (response.suggestions && response.suggestions.dates && response.suggestions.dates.length > 0) {
                        errorMessage += `\n\n💡 Suggested date ranges:\n• ${response.suggestions.dates.slice(0, 2).join('\n• ')}`;
                      }
                      
                      // Temporary debug: show what we have
                      console.log('🔍 Final error message:', errorMessage);
                      console.log('🔍 Error message length:', errorMessage.length);
                      
                      showErrorToast('Term Update Failed', errorMessage);
                    }
                  } catch (error) {
                    console.error('Update error:', error);
                    showErrorToast('Update failed', 'An error occurred while updating the term');
                  } finally {
                    setIsEditingSaving(false);
                  }
                }}
                disabled={!editData.termName || !editData.startDate || !editData.endDate || (editData.termName && editData.termName.length < 5) || isEditingSaving}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isEditingSaving ? 'Updating...' : 'Update Term'}
                    </button>
            </div>
          </div>
        </div>,
        document.body
      )}

            {/* Bulk Operations Modal */}
      <BulkModal
        isOpen={bulkModal.isOpen}
        onClose={bulkModal.hideModal}
        title="Bulk Operations"
        description={`${selectedItems.length} term${selectedItems.length > 1 ? 's' : ''} selected`}
        actions={[
          { value: 'activate', label: 'Activate Terms' },
           { value: 'complete', label: 'Complete Terms' }
        ]}
        selectedAction={bulkAction}
        onActionChange={setBulkAction}
        onExecute={async () => {
          try {
            setIsBulkProcessing(true);
            
            // Execute bulk operations
            const promises = selectedItems.map(async (termId) => {
              const term = termsData.find(t => t.termId === termId);
              if (!term) return;
              
              switch (bulkAction) {
                case 'activate':
                  if (term.status === 'upcoming') {
                    return skTermsService.activateSKTerm(termId);
                  }
                  break;
                case 'complete':
                  if (term.status === 'active') {
                    return skTermsService.completeSKTerm(termId);
                  }
                  break;
              }
            });
            
            await Promise.all(promises);
            
          showSuccessToast('Bulk operation completed', `${bulkAction} operation completed successfully`);
            await loadTermsData(activeTab); // Reload data
            setSelectedItems([]); // Clear selection
            
          } catch (error) {
            showErrorToast('Bulk operation failed', 'An error occurred during bulk operation');
          } finally {
            setIsBulkProcessing(false);
          bulkModal.hideModal();
          setBulkAction('');
          }
        }}
        isProcessing={isBulkProcessing}
      />

      {/* Completion Options Modal */}
      {showCompletionOptionsModal && completionTerm && createPortal(
        <div className="fixed inset-0 flex items-center justify-center z-[99999] p-4 backdrop-blur-[1px]" onClick={() => setShowCompletionOptionsModal(false)}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Complete Term</h3>
              <p className="text-sm text-gray-600 mt-1">
                Choose how to complete {completionTerm.termName}
              </p>
            </div>
            
            <div className="px-6 py-4 space-y-4">
              {/* Current Term Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Current Term Information</h4>
                <div className="text-sm text-blue-700">
                  <p><strong>Term:</strong> {completionTerm.termName}</p>
                  <p><strong>End Date:</strong> {new Date(completionTerm.endDate).toLocaleDateString()}</p>
                  <p><strong>Status:</strong> <span className="capitalize">{completionTerm.status}</span></p>
                </div>
              </div>
              
              {/* Completion Options */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Choose Completion Type:</h4>
                
                {/* Regular Completion */}
                <button
                  onClick={async () => {
                    setShowCompletionOptionsModal(false);
                    const confirmed = await confirmation.confirmComplete(completionTerm.termName);
                    if (confirmed) {
                      confirmation.setLoading(true);
                      try {
                        console.log('🔧 Attempting to complete term:', completionTerm.termId, completionTerm.termName);
                        const response = await skTermsService.completeSKTerm(completionTerm.termId, false);
                        
                        if (response.success) {
                          showSuccessToast('Term completed', `${completionTerm.termName} has been marked as completed`);
                          await reloadTermsDataWithoutActiveTerm();
                        } else {
                          console.error('❌ Completion failed:', response);
                          let errorMessage = response.message || 'Unknown error occurred';
                          
                          // Handle specific error details
                          if (response.details && Array.isArray(response.details)) {
                            errorMessage = response.details.join(', ');
                          } else if (response.details) {
                            errorMessage = typeof response.details === 'string' ? response.details : JSON.stringify(response.details);
                          }
                          
                          showErrorToast('Completion failed', errorMessage);
                        }
                      } catch (error) {
                        console.error('❌ Exception during completion:', error);
                        let errorMessage = 'An error occurred while completing the term';
                        
                        if (error.response) {
                          const { data, status } = error.response;
                          console.error('❌ HTTP Error:', status, data);
                          
                          if (data && data.message) {
                            errorMessage = data.message;
                          } else if (data && data.errors) {
                            errorMessage = Array.isArray(data.errors) ? data.errors.join(', ') : JSON.stringify(data.errors);
                          } else {
                            errorMessage = `HTTP ${status}: ${data || 'Unknown error'}`;
                          }
                        } else if (error.request) {
                          errorMessage = 'Network error. Please check your connection.';
                        } else {
                          errorMessage = error.message || errorMessage;
                        }
                        
                        showErrorToast('Completion failed', errorMessage);
                      } finally {
                        confirmation.hideConfirmation();
                      }
                    }
                  }}
                  className="w-full p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 text-left"
                >
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Pause className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900">Regular Completion</h5>
                      <p className="text-sm text-gray-600 mt-1">
                        Complete the term normally. Keeps the original end date and follows standard completion process.
                      </p>
                      <div className="mt-2 text-xs text-gray-500">
                        • Maintains original end date<br/>
                        • Standard completion process<br/>
                        • Officials lose account access
                      </div>
                    </div>
                  </div>
                </button>
                
                {/* Force Completion */}
                <button
                  onClick={async () => {
                    setShowCompletionOptionsModal(false);
                    const confirmed = await confirmation.confirmForceComplete(completionTerm.termName);
                    if (confirmed) {
                      confirmation.setLoading(true);
                      try {
                        console.log('🔧 Attempting to force complete term:', completionTerm.termId, completionTerm.termName);
                        const response = await skTermsService.completeSKTerm(completionTerm.termId, true);
                        
                        if (response.success) {
                          showSuccessToast('Term force completed', `${completionTerm.termName} has been force completed successfully`);
                          await reloadTermsDataWithoutActiveTerm();
                        } else {
                          console.error('❌ Force completion failed:', response);
                          let errorMessage = response.message || 'Unknown error occurred';
                          
                          // Handle specific error details
                          if (response.details && Array.isArray(response.details)) {
                            errorMessage = response.details.join(', ');
                          } else if (response.details) {
                            errorMessage = typeof response.details === 'string' ? response.details : JSON.stringify(response.details);
                          }
                          
                          showErrorToast('Force completion failed', errorMessage);
                        }
                      } catch (error) {
                        console.error('❌ Exception during force completion:', error);
                        let errorMessage = 'An error occurred while force completing the term';
                        
                        if (error.response) {
                          const { data, status } = error.response;
                          console.error('❌ HTTP Error:', status, data);
                          
                          if (data && data.message) {
                            errorMessage = data.message;
                          } else if (data && data.errors) {
                            errorMessage = Array.isArray(data.errors) ? data.errors.join(', ') : JSON.stringify(data.errors);
                          } else {
                            errorMessage = `HTTP ${status}: ${data || 'Unknown error'}`;
                          }
                        } else if (error.request) {
                          errorMessage = 'Network error. Please check your connection.';
                        } else {
                          errorMessage = error.message || errorMessage;
                        }
                        
                        showErrorToast('Force completion failed', errorMessage);
                      } finally {
                        confirmation.hideConfirmation();
                      }
                    }
                  }}
                  className="w-full p-4 border border-gray-200 rounded-lg hover:border-red-300 hover:bg-red-50 transition-all duration-200 text-left"
                >
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900">Force Completion</h5>
                      <p className="text-sm text-gray-600 mt-1">
                        Immediately end the term and update the end date to today. All officials lose account access immediately.
                      </p>
                      <div className="mt-2 text-xs text-red-600">
                        ⚠️ Updates end date to today<br/>
                        ⚠️ Immediate account access removal<br/>
                        ⚠️ Cannot be undone
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowCompletionOptionsModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Universal Toast Container */}
      <ToastContainer position="top-right" maxToasts={5} />
      
      {/* Universal Confirmation Modal */}
      <ConfirmationModal {...confirmation.modalProps} />
    </div>
  );
};

export default SKTerms;
