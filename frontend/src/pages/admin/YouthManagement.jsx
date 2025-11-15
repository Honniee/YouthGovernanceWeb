import React, { useState, useEffect, useMemo } from 'react';
import { 
  User,
  Users,
  Calendar,
  MapPin,
  Filter,
  Search,
  Eye,
  Archive,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  Download,
  ChevronDown,
  ArrowUpDown,
  UserCheck,
  UserX,
  Shield,
  Activity,
  Grid,
  List,
  X,
  Mail,
  Phone,
  FileText,
  CheckCircle2
} from 'lucide-react';
import { 
  HeaderMainContent, 
  TabContainer, 
  Tab, 
  useTabState, 
  SearchBar, 
  SortModal, 
  useSortModal, 
  FilterModal, 
  useFilterModal,
  FilterButton,
  Pagination, 
  usePagination, 
  Status, 
  ExportButton, 
  useExport,
  LoadingSpinner, 
  DataTable,
  BulkActionsBar,
  SortButton,
  TabbedDetailModal
} from '../../components/portal_main_content';
import { ToastContainer, showSuccessToast, showErrorToast, showInfoToast, ConfirmationModal, useConfirmation } from '../../components/universal';
import { useBarangays } from '../../hooks/useBarangays.js';
import { apiHelpers } from '../../services/api.js';
import { youthDetailConfig } from '../../components/portal_main_content/tabbedModalConfigs.jsx';
import logger from '../../utils/logger.js';

const YouthManagement = () => {
  // Tab state for filtering youth by status
  const { activeTab, setActiveTab } = useTabState('active', async (tabId) => {
    setCurrentPage(1);
  });

  // UI state
  const [viewMode, setViewMode] = useState('grid');
  const [selectedItems, setSelectedItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isLoading, setIsLoading] = useState(false);


  // Load validated youth data from API with pagination
  const loadValidatedYouth = async () => {
    try {
      setIsLoading(true);
      logger.debug('Loading validated youth from API');
      
      // Build query parameters for pagination and filtering
      const params = new URLSearchParams();
      params.append('page', '1');
      params.append('limit', '100000'); // Very high limit to fetch ALL records
      
      if (searchQuery) params.append('search', searchQuery);
      
      // Apply tab filter as status (if needed)
      if (activeTab && activeTab !== 'all') {
        // Note: Status filtering is now done on frontend for now
        // Backend can be enhanced to support status filtering
      }
      
      // Call the real API endpoint using the configured API service
      const result = await apiHelpers.get(`/youth/validated?${params.toString()}`);
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to load validated youth');
      }
      
      // Backend returns data with pagination info
      const validatedYouthData = Array.isArray(result.data) 
        ? result.data 
        : (result.data?.data || result.data || []);
      
      // Backend already calculates age and status, so we can use it directly
      setValidatedYouth(validatedYouthData);
      logger.debug('Validated youth loaded', { count: validatedYouthData.length });
    } catch (error) {
      logger.error('Failed to load validated youth', error);
      showErrorToast('Error', `Failed to load validated youth: ${error.message}`);
      
      // Set empty array if API fails - no fallback data
      setValidatedYouth([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate age from birthday
  const calculateAge = (birthday) => {
    const today = new Date();
    const birthDate = new Date(birthday);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  // State for validated youth data
  const [validatedYouth, setValidatedYouth] = useState([]);
  // Confirmation modal
  const confirmation = useConfirmation();
  
  // Modal state for youth details
  const [selectedYouth, setSelectedYouth] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Bulk operations state
  const [bulkAction, setBulkAction] = useState('');
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // Load full barangay list for filter options
  const { barangays } = useBarangays({ per_page: 1000 });

  // Load data on component mount and when filters change
  useEffect(() => {
    loadValidatedYouth();
  }, [currentPage, searchQuery, activeTab]);


  // Calculate statistics
  const youthStats = useMemo(() => {
    const total = validatedYouth.length;
    const active = validatedYouth.filter(y => y.status === 'active').length;
    const ageWarning = validatedYouth.filter(y => y.status === 'age_warning').length;
    const ageOut = validatedYouth.filter(y => y.status === 'age_out').length;
    const archived = validatedYouth.filter(y => y.status === 'archived').length;
    
    // Age distribution
    const ageGroups = {
      '15-20': validatedYouth.filter(y => y.age >= 15 && y.age <= 20).length,
      '21-25': validatedYouth.filter(y => y.age >= 21 && y.age <= 25).length,
      '26-29': validatedYouth.filter(y => y.age >= 26 && y.age <= 29).length,
      '30+': validatedYouth.filter(y => y.age >= 30).length
    };

    return {
      total,
      active,
      ageWarning,
      ageOut,
      archived,
      ageGroups
    };
  }, [validatedYouth]);

  // Dynamic filter option sources
  const barangayOptions = useMemo(() => {
    if (Array.isArray(barangays) && barangays.length > 0) {
      return barangays
        .map(b => ({ value: b.barangay_name || b.name || b.barangay_id, label: b.barangay_name || b.name || b.barangay_id }))
        .filter(opt => opt.value)
        .sort((a, b) => a.label.localeCompare(b.label));
    }
    // Fallback to values present in the loaded youth data
    const set = new Set(validatedYouth.map(y => y.barangay).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b)).map(name => ({ value: name, label: name }));
  }, [barangays, validatedYouth]);

  const validatorOptions = useMemo(() => {
    const set = new Set(validatedYouth.map(y => y.validatedBy || 'System').filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b)).map(name => ({ value: name, label: name }));
  }, [validatedYouth]);

  // Filter youth based on active tab and search
  const getFilteredYouth = () => {
    let filtered = [...validatedYouth];

    // Apply tab filter - use status field for consistency with stats
    if (activeTab === 'active') {
      filtered = filtered.filter(y => y.status === 'active');
    } else if (activeTab === 'age_warning') {
      filtered = filtered.filter(y => y.status === 'age_warning');
    } else if (activeTab === 'age_out') {
      filtered = filtered.filter(y => y.status === 'age_out');
    } else if (activeTab === 'archived') {
      filtered = filtered.filter(y => y.status === 'archived');
    }

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(y => 
        `${y.firstName} ${y.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        y.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        y.barangay.toLowerCase().includes(searchQuery.toLowerCase()) ||
        y.validatedBy.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply filter modal filters
    if (filterModal.filterValues && filterModal.filterValues.eligibilityStatus) {
      filtered = filtered.filter(y => y.eligibilityStatus === filterModal.filterValues.eligibilityStatus);
    }
    
    if (filterModal.filterValues && filterModal.filterValues.barangay) {
      filtered = filtered.filter(y => y.barangay === filterModal.filterValues.barangay);
    }
    
    if (filterModal.filterValues && filterModal.filterValues.validatedBy) {
      filtered = filtered.filter(y => y.validatedBy === filterModal.filterValues.validatedBy);
    }
    
    if (filterModal.filterValues && filterModal.filterValues.ageRange) {
      const [minAge, maxAge] = filterModal.filterValues.ageRange;
      filtered = filtered.filter(y => y.age >= minAge && y.age <= maxAge);
    }

    // Apply sorting based on sort modal selection
    if (sortModal && sortModal.sortBy) {
      const { sortBy, sortOrder } = sortModal;
      const direction = sortOrder === 'desc' ? -1 : 1;

      const getValue = (y) => {
        switch (sortBy) {
          case 'firstName':
            return (y.firstName || '').toLowerCase();
          case 'lastName':
            return (y.lastName || '').toLowerCase();
          case 'age':
            return Number.isFinite(y.age) ? y.age : -Infinity;
          case 'barangay':
            return (y.barangay || '').toLowerCase();
          case 'validatedAt':
            return y.validatedAt ? new Date(y.validatedAt).getTime() : 0;
          case 'lastSurveyDate':
            return y.lastSurveyDate ? new Date(y.lastSurveyDate).getTime() : 0;
          case 'createdAt':
          default:
            return y.createdAt ? new Date(y.createdAt).getTime() : 0;
        }
      };

      filtered.sort((a, b) => {
        const va = getValue(a);
        const vb = getValue(b);
        if (va < vb) return -1 * direction;
        if (va > vb) return 1 * direction;
        return 0;
      });
    }

    return filtered;
  };

  // Sort modal state
  const sortModal = useSortModal('createdAt', 'desc', (newSortBy, newSortOrder) => {
    // TODO: Implement sorting
    logger.debug('YouthManagement sort change', { newSortBy, newSortOrder });
  });

  // Filter modal state
  const filterModal = useFilterModal({});

  // Determine if there are active filters (for button styling)
  const hasActiveFilters = useMemo(() => {
    const values = (filterModal && filterModal.filterValues) ? filterModal.filterValues : {};
    return Object.values(values).some((val) => {
      if (Array.isArray(val)) return val.length > 0;
      return val !== undefined && val !== null && val !== '';
    });
  }, [filterModal && filterModal.filterValues]);

  // Pagination hook
  const pagination = usePagination({
    currentPage,
    totalItems: getFilteredYouth().length,
    itemsPerPage,
    onPageChange: setCurrentPage,
    onItemsPerPageChange: setItemsPerPage
  });

  // Get paginated youth
  const getPaginatedYouth = () => {
    const filtered = getFilteredYouth();
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filtered.slice(startIndex, startIndex + itemsPerPage);
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
    const paginatedYouth = getPaginatedYouth();
    const allSelected = paginatedYouth.length > 0 && paginatedYouth.every(y => selectedItems.includes(y.id));
    
    if (allSelected) {
      setSelectedItems(prev => prev.filter(id => !paginatedYouth.some(y => y.id === id)));
    } else {
      const newSelections = paginatedYouth.filter(y => !selectedItems.includes(y.id)).map(y => y.id);
      setSelectedItems(prev => [...prev, ...newSelections]);
    }
  };

  // Get action menu items for youth
  const getActionMenuItems = (item) => {
    const items = [
      {
        id: 'view',
        label: 'View Details',
        icon: <Eye className="w-4 h-4" />,
        action: 'view'
      }
    ];

    // Archive/Unarchive based on status
    if (item.isActive && item.status !== 'age_out') {
      items.push({
        id: 'archive',
        label: 'Archive',
        icon: <Archive className="w-4 h-4" />,
        action: 'archive'
      });
    } else if (!item.isActive) {
      items.push({
        id: 'unarchive',
        label: 'Restore',
        icon: <CheckCircle className="w-4 h-4" />,
        action: 'unarchive'
      });
    }

    return items;
  };

  // Handle action clicks
  const handleActionClick = async (action, item) => {
    switch (action) {
      case 'view':
        // TODO: Implement view details modal
        logger.debug('Viewing youth details', { item });
        break;
      case 'archive':
        await handleArchive(item);
        break;
      case 'unarchive':
        await handleUnarchive(item);
        break;
      default:
        break;
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
  const buildYouthCsvRows = (list) => {
    const headers = ['ID','Name','Age','Barangay','Eligibility','Validated By','Surveys','Last Survey'];
    const rows = list.map(y => [
      y.id || '',
      `${y.firstName || ''} ${y.lastName || ''}`.trim(),
      Number.isFinite(y.age) ? y.age : '',
      y.barangay || '',
      (y.eligibilityStatus || '').replace('_',' '),
      y.validatedBy || '',
      y.surveysCompleted ?? '',
      y.lastSurveyDate ? new Date(y.lastSurveyDate).toLocaleDateString() : ''
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
        body { font-family: Arial, sans-serif; color: #111; }
        h1 { font-size: 16px; margin: 0 0 8px; font-weight: 700; text-align: left; }
        table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        th, td { border: 1px solid #666; padding: 6px 8px; font-size: 11px; line-height: 1.15; }
        thead th { background: #f3f4f6 !important; font-weight: 700; }
        thead { display: table-header-group; }
        .meta { font-size: 10px; color: #555; margin: 6px 0 12px; }
        @page { size: A4 landscape; margin: 12mm; }
      </style>`;
    const ts = new Date().toLocaleString();
    const host = location?.hostname || '';
    win.document.write(`<!doctype html><html><head><meta charset='utf-8'><title>${escapeHtml(title)}</title>${styles}</head><body><h1>${escapeHtml(title)}</h1><div class='meta'>Generated on ${escapeHtml(ts)} ${host ? `• ${escapeHtml(host)}` : ''}</div><table>${thead}<tbody>${tbody}</tbody></table><script>window.onload=()=>{window.print();}</script></body></html>`);
    win.document.close();
  };

  // Export hooks
  const mainExport = useExport({
    exportFunction: async (format) => {
      // Get filtered dataset based on current tab, search, and filters
      const dataset = getFilteredYouth();
      
      // Debug logging
      logger.debug('Youth export dataset', {
        activeTab,
        totalYouth: validatedYouth.length,
        filteredCount: dataset.length,
        sampleFiltered: dataset.slice(0, 3).map(y => ({ id: y.id, name: `${y.firstName} ${y.lastName}`, isActive: y.isActive, age: y.age, status: y.status }))
      });
      
      if (!dataset || dataset.length === 0) throw new Error('No youth to export');
      
      // Determine title based on active tab
      const getTabTitle = () => {
        switch (activeTab) {
          case 'active': return 'Active Youth';
          case 'age_warning': return 'Age Warning Youth';
          case 'age_out': return 'Age Out Youth';
          case 'archived': return 'Archived Youth';
          case 'all': return 'All Youth';
          default: return 'Youth';
        }
      };
      
      const tabTitle = getTabTitle();
      const ts = new Date().toISOString().replace(/[:T]/g,'-').split('.')[0];
      const filenamePrefix = activeTab === 'all' ? 'youth' : `youth-${activeTab}`;
      
      if (format === 'pdf') {
        const rows = buildYouthCsvRows(dataset);
        openPrintPdf(tabTitle, rows[0], rows);
      } else if (format === 'excel' || format === 'xlsx') {
        const rows = buildYouthCsvRows(dataset);
        const xml = buildExcelXml(tabTitle, rows);
        downloadFile(new Blob([xml], { type: 'application/vnd.ms-excel' }), `${filenamePrefix}-${ts}.xls`);
      } else {
        const rows = buildYouthCsvRows(dataset);
        downloadCsv(`${filenamePrefix}-${ts}.csv`, rows);
      }
      
      // Log export to backend for activity logs (fire and forget)
      // Use JSON format to avoid file download, but pass actual format in query for correct logging
      const actualFormat = format === 'xlsx' ? 'excel' : format;
      try {
        const queryParams = new URLSearchParams();
        queryParams.append('format', 'json'); // Use JSON to avoid download
        queryParams.append('logFormat', actualFormat); // Pass actual format for logging
        queryParams.append('count', dataset.length.toString()); // Pass actual filtered count
        if (activeTab !== 'all') {
          queryParams.append('tab', activeTab); // Pass tab info for logging
        }
        
        const apiModule = await import('../../services/api.js');
        const api = apiModule.default;
        api.get(`/youth/export?${queryParams.toString()}`).catch(err => {
          logger.error('Failed to log youth export activity', err);
        });
      } catch (err) {
        logger.error('Failed to log youth export activity', err);
      }
      
      return { success: true };
    }
  });

  const bulkExportHook = useExport({
    exportFunction: async (format) => {
      const dataset = getFilteredYouth().filter(y => selectedItems.includes(y.id));
      if (dataset.length === 0) throw new Error('No selected youth to export');
      const ts = new Date().toISOString().replace(/[:T]/g,'-').split('.')[0];
      if (format === 'pdf') {
        const rows = buildYouthCsvRows(dataset);
        openPrintPdf('Selected Youth', rows[0], rows);
      } else if (format === 'excel' || format === 'xlsx') {
        const rows = buildYouthCsvRows(dataset);
        const xml = buildExcelXml('Selected Youth', rows);
        downloadFile(new Blob([xml], { type: 'application/vnd.ms-excel' }), `youth-selected-${ts}.xls`);
      } else {
        const rows = buildYouthCsvRows(dataset);
        downloadCsv(`youth-selected-${ts}.csv`, rows);
      }
      
      // Log export to backend for activity logs (fire and forget)
      // Use JSON format to avoid file download, but pass actual format in query for correct logging
      const actualFormat = format === 'xlsx' ? 'excel' : format;
      try {
        const queryParams = new URLSearchParams();
        queryParams.append('format', 'json'); // Use JSON to avoid download
        queryParams.append('logFormat', actualFormat); // Pass actual format for logging
        queryParams.append('selectedIds', selectedItems.join(','));
        
        const apiModule = await import('../../services/api.js');
        const api = apiModule.default;
        api.get(`/youth/export?${queryParams.toString()}`).catch(err => {
          logger.error('Failed to log youth export activity', err);
        });
      } catch (err) {
        logger.error('Failed to log youth export activity', err);
      }
      
      return { success: true };
    }
  });

  // Derive status from age helper
  const deriveStatusFromAge = (age) => {
    if (age >= 30) return { status: 'age_out', eligibilityStatus: 'archived' };
    if (age >= 28) return { status: 'age_warning', eligibilityStatus: 'age_warning' };
    return { status: 'active', eligibilityStatus: 'eligible' };
  };

  // Archive / Unarchive handlers
  const handleArchive = async (youth) => {
    const confirmed = await confirmation.confirmArchive(
      `Archive ${youth.firstName} ${youth.lastName}? They will be moved to Archived and excluded from active lists.`,
      async () => {
        await apiHelpers.patch(`/youth/${youth.id}/archive`);
        setValidatedYouth(prev => prev.map(y => {
          if (y.id !== youth.id) return y;
          return { ...y, isActive: false, status: 'archived', eligibilityStatus: 'archived' };
        }));
        showSuccessToast('Archived', `${youth.firstName} ${youth.lastName} archived`);
      }
    );
    return confirmed;
  };

  const handleUnarchive = async (youth) => {
    const confirmed = await confirmation.confirmRestore(
      `Restore ${youth.firstName} ${youth.lastName} to active lists?`,
      async () => {
        await apiHelpers.patch(`/youth/${youth.id}/unarchive`);
        setValidatedYouth(prev => prev.map(y => {
          if (y.id !== youth.id) return y;
          const derived = deriveStatusFromAge(y.age);
          return { ...y, isActive: true, status: derived.status, eligibilityStatus: derived.eligibilityStatus };
        }));
        showSuccessToast('Unarchived', `${youth.firstName} ${youth.lastName} unarchived`);
      }
    );
    return confirmed;
  };

  // Handle bulk operations
  const handleBulkOperation = async () => {
    if (!bulkAction || selectedItems.length === 0) {
      showErrorToast('Selection Required', 'Please select an action and at least one youth member');
      return;
    }

    // Close the action selection modal first
    setShowBulkModal(false);

    // Get selected youth details for confirmation
    const selectedYouthItems = validatedYouth.filter(y => selectedItems.includes(y.id));
    const youthNames = selectedYouthItems.map(y => `${y.firstName} ${y.lastName}`).join(', ');
    
    // Show confirmation dialog
    const actionText = bulkAction === 'archive' ? 'Archive' : 'Restore';
    const confirmed = await confirmation.confirmBulkOperation(
      actionText,
      selectedItems.length,
      'youth',
      youthNames
    );
    
    if (!confirmed) {
      // Reset bulk action if user cancels
      setBulkAction('');
      return;
    }

    confirmation.setLoading(true);
    setIsBulkProcessing(true);
    
    try {
      const response = await apiHelpers.post('/youth/bulk', {
        ids: selectedItems,
        action: bulkAction
      });
      
      if (response.success) {
        confirmation.hideConfirmation();
        
        // Update local state based on action
        if (bulkAction === 'archive') {
          setValidatedYouth(prev => prev.map(y => {
            if (!selectedItems.includes(y.id)) return y;
            return { ...y, isActive: false, status: 'archived', eligibilityStatus: 'archived' };
          }));
          showSuccessToast('Archived', `Successfully archived ${response.processed || selectedItems.length} youth`);
        } else {
          setValidatedYouth(prev => prev.map(y => {
            if (!selectedItems.includes(y.id)) return y;
            const derived = deriveStatusFromAge(y.age);
            return { ...y, isActive: true, status: derived.status, eligibilityStatus: derived.eligibilityStatus };
          }));
          showSuccessToast('Restored', `Successfully restored ${response.processed || selectedItems.length} youth`);
        }
        
        setSelectedItems([]); // Clear selection
        setBulkAction(''); // Reset bulk action
      } else {
        confirmation.hideConfirmation();
        setBulkAction(''); // Reset bulk action on error
        showErrorToast('Bulk Operation Failed', response.message);
      }
    } catch (error) {
      logger.error('Error in youth bulk operation', error, { bulkAction, selectedCount: selectedItems.length });
      confirmation.hideConfirmation();
      setBulkAction(''); // Reset bulk action on error
      showErrorToast('Bulk Operation Error', error.message || 'Error performing bulk operation');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'age_warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'age_out': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'archived': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get eligibility status color
  const getEligibilityColor = (eligibilityStatus) => {
    switch (eligibilityStatus) {
      case 'eligible': return 'bg-green-100 text-green-700 border-green-200';
      case 'age_warning': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'age_out': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'archived': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <HeaderMainContent
        title="Youth Management"
        description="Manage validated youth participants and monitor age-based eligibility. Only shows youth who have been validated through the validation queue."
      />



      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column - Youth List */}
        <div className="xl:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Tabs */}
            <TabContainer
              activeTab={activeTab}
              onTabChange={setActiveTab}
              variant="underline"
              size="md"
            >
              <Tab 
                id="active" 
                label="Active Youth" 
            count={youthStats.active} 
                color="green"
              />
              <Tab 
            id="age_warning" 
            label="Age Warning" 
            count={youthStats.ageWarning} 
                color="yellow"
              />
              <Tab 
            id="age_out" 
            label="Age Out" 
            count={youthStats.ageOut} 
                color="orange"
              />
              <Tab 
                id="archived" 
            label="Archived" 
            count={youthStats.archived} 
                color="gray"
              />
          <Tab 
            id="all" 
            label="All Youth" 
            count={youthStats.total} 
            color="blue"
              />
            </TabContainer>

        {/* Controls */}
        <div className="px-5 py-4 border-t border-gray-100">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 overflow-x-auto pb-2 md:pb-0 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                      <SearchBar
                value={searchQuery}
                        onChange={handleSearchChange}
                placeholder="Search by name, email, barangay, or validator..." 
                        expandOnMobile={true}
                        showIndicator={true}
                        indicatorText="Search"
                        indicatorColor="blue"
                        size="md"
                />

                <FilterButton
                  ref={filterModal.triggerRef}
                  onClick={filterModal.toggleModal}
                  isOpen={filterModal.isOpen}
                  isActive={hasActiveFilters}
                  size="md"
                  variant="green"
                  responsive={true}
                  label="Filter"
                />
                
                          <SortButton
                      ref={sortModal.triggerRef}
                      onClick={sortModal.toggleModal}
                      isOpen={sortModal.isOpen}
                      isActive={!sortModal.isDefaultSort}
                      sortOrder={sortModal.sortOrder}
                      size="md"
                      variant="blue"
                      responsive={true}
                      label="Sort"
                      showIndicator={true}
                      indicatorStyle="arrow"
                    />

                      </div>
                      
                <div className="flex items-center space-x-3 flex-shrink-0">
                  <ExportButton
                    formats={['csv', 'xlsx', 'pdf']}
                    onExport={(format) => mainExport.handleExport(format)}
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
                        </div>

        <BulkActionsBar
          selectedCount={selectedItems.length}
          itemName="youth member"
          itemNamePlural="youth members"
          onBulkAction={() => {
            // Determine default action based on context
            const selectedYouth = validatedYouth.filter(y => selectedItems.includes(y.id));
            const allArchived = selectedYouth.length > 0 && selectedYouth.every(y => y.isActive === false);
            const defaultAction = activeTab === 'archived' || allArchived ? 'unarchive' : 'archive';
            setBulkAction(defaultAction);
            setShowBulkModal(true);
          }}
          exportConfig={{
            formats: ['csv', 'xlsx', 'pdf'],
            onExport: (format) => bulkExportHook.handleExport(format),
            isExporting: bulkExportHook.isExporting,
            label: 'Export',
            position: 'auto',
            responsive: true
          }}
          primaryColor="green"
        />

            {/* Bulk Operations Modal */}
            {showBulkModal && createPortal(
              <div className="fixed inset-0 flex items-center justify-center z-[99999] p-4 backdrop-blur-[1px]" onClick={() => setShowBulkModal(false)}>
                <div className="bg-white rounded-lg shadow-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Bulk Operations</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {selectedItems.length} youth member{selectedItems.length > 1 ? 's' : ''} selected
                    </p>
                  </div>
                  
                  <div className="px-6 py-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Action
                      </label>
                      <select
                        value={bulkAction}
                        onChange={(e) => setBulkAction(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select an action</option>
                        <option value="archive">Archive</option>
                        <option value="unarchive">Restore</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                    <button
                      onClick={() => {
                        setShowBulkModal(false);
                        setBulkAction('');
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleBulkOperation}
                      disabled={!bulkAction || isBulkProcessing}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isBulkProcessing ? 'Processing...' : 'Execute'}
                    </button>
                  </div>
                </div>
              </div>,
              document.body
            )}
                        
              {/* Sort Modal */}
              <SortModal
                isOpen={sortModal.isOpen}
                onClose={sortModal.closeModal}
                triggerRef={sortModal.triggerRef}
                title="Sort Options"
                sortFields={[
                  { value: 'firstName', label: 'First Name' },
                  { value: 'lastName', label: 'Last Name' },
                  { value: 'age', label: 'Age' },
                  { value: 'barangay', label: 'Barangay' },
            { value: 'validatedAt', label: 'Validation Date' },
            { value: 'lastSurveyDate', label: 'Last Survey' }
                ]}
                sortBy={sortModal.sortBy}
                sortOrder={sortModal.sortOrder}
                onSortChange={sortModal.updateSort}
                onReset={sortModal.resetSort}
                defaultSortBy="createdAt"
                defaultSortOrder="desc"
              />

              {/* Filter Modal */}
              <FilterModal
                isOpen={filterModal.isOpen}
                onClose={filterModal.closeModal}
                triggerRef={filterModal.triggerRef}
                title="Filter Options"
                filters={[
                  {
                    id: 'eligibilityStatus', 
                    label: 'Eligibility Status', 
                    type: 'select',
                    placeholder: 'All Statuses',
                    options: [
                      { value: 'eligible', label: 'Eligible (15-27)' },
                      { value: 'age_warning', label: 'Age Warning (28-29)' },
                      { value: 'age_out', label: 'Aged Out (30+)' },
                      { value: 'archived', label: 'Archived' }
                    ]
                  },
                  {
                    id: 'barangay',
                    label: 'Barangay',
                    type: 'select',
                    placeholder: 'All Barangays',
                    options: barangayOptions
                  },
                  { 
                    id: 'validatedBy', 
                    label: 'Validated By', 
                    type: 'select',
                    placeholder: 'All Validators',
                    options: validatorOptions
                  },
                  { 
                    id: 'ageRange', 
                    label: 'Age Range', 
                    type: 'range',
                    min: 15,
                    max: 35
                  }
                ]}
                values={filterModal.filterValues || {}}
                onChange={filterModal.updateFilterValues}
                onApply={filterModal.closeModal}
                onClear={filterModal.resetFilters}
            />

            {/* Content Area */}
        {isLoading ? (
              <LoadingSpinner 
                variant="spinner"
            message="Loading validated youth..." 
                size="md"
                color="blue"
                height="h-64"
              />
            ) : (
              <DataTable
                data={getPaginatedYouth()}
                selectedItems={selectedItems}
                onSelectItem={handleSelectItem}
                onSelectAll={handleSelectAll}
                getActionMenuItems={getActionMenuItems}
                onActionClick={handleActionClick}
                onCardClick={(item) => {
                  setSelectedYouth(item);
                  setIsModalOpen(true);
                }}
                viewMode={viewMode}
                keyField="id"
                displayFields={{
                  avatar: {
                    firstName: 'firstName',
                    lastName: 'lastName',
                    email: 'email',
                    picture: 'profilePicture'
                  },
                  title: (item) => `${item.firstName} ${item.lastName}`,
                  email: (item) => item.email,
                  status: (item) => item.status,
                  position: (item) => item.surveysCompleted ? `${item.surveysCompleted} survey${item.surveysCompleted !== 1 ? 's' : ''}` : 'No surveys',
                  badge: (item) => ({
                    text: item.isInVotersList ? 'In Voters List' : 'Not in Voters List',
                    className: item.isInVotersList 
                      ? 'bg-green-100 text-green-700 border border-green-200 font-medium' 
                      : 'bg-gray-100 text-gray-700 border border-gray-200 font-medium'
                  }),
                  date: 'lastSurveyDate'
                }}
                selectAllLabel="Select All Youth"
                emptyMessage={`No youth found${activeTab !== 'all' ? ` for ${activeTab.replace('_', ' ')}` : ''}`}
                styling={{
                  gridCols: 'grid-cols-1 lg:grid-cols-2',
                  cardHover: 'hover:border-blue-300 hover:shadow-xl hover:shadow-blue-100/50 hover:scale-[1.02]',
                  listHover: 'hover:bg-blue-50/30 hover:border-l-4 hover:border-l-blue-400',
                  theme: 'blue'
                }}
              />
            )}

            {/* Pagination */}
            {!isLoading && getFilteredYouth().length > 0 && (
              <Pagination
                currentPage={currentPage}
              totalItems={getFilteredYouth().length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setItemsPerPage}
                itemName="youth member"
                itemNamePlural="youth members"
                showItemsPerPage={true}
                showInfo={true}
                size="md"
                variant="default"
                itemsPerPageOptions={[5, 10, 20, 50]}
              />
            )}
          </div>
                        </div>
                        
        {/* Right Column - Dashboard & Analytics */}
        <div className="xl:col-span-1 space-y-6">
          {/* Age Distribution Chart */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                </div>
                        <div>
                  <h3 className="text-sm font-semibold text-gray-900">Age Distribution</h3>
                  <p className="text-xs text-gray-600">Youth by age groups</p>
                </div>
                        </div>
                      </div>
                      
            <div className="p-5 space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">15-20 years</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{ width: `${(youthStats.ageGroups['15-20'] / youthStats.total) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-8 text-right">{youthStats.ageGroups['15-20']}</span>
                  </div>
              </div>
              
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">21-25 years</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ width: `${(youthStats.ageGroups['21-25'] / youthStats.total) * 100}%` }}
                      ></div>
                        </div>
                    <span className="text-sm font-medium text-gray-900 w-8 text-right">{youthStats.ageGroups['21-25']}</span>
                      </div>
                  </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">26-29 years</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-yellow-500 h-2 rounded-full" 
                        style={{ width: `${(youthStats.ageGroups['26-29'] / youthStats.total) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-8 text-right">{youthStats.ageGroups['26-29']}</span>
                        </div>
                      </div>
                      
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">30+ years</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-gray-500 h-2 rounded-full" 
                        style={{ width: `${(youthStats.ageGroups['30+'] / youthStats.total) * 100}%` }}
                      ></div>
                </div>
                    <span className="text-sm font-medium text-gray-900 w-8 text-right">{youthStats.ageGroups['30+']}</span>
                  </div>
                </div>
                </div>
              </div>
                        </div>
                        
          {/* Validation Summary */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="px-4 py-3 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-gray-600" />
                <h3 className="text-sm font-medium text-gray-900">Validation Summary</h3>
              </div>
            </div>
            
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-xl font-semibold text-green-600">{youthStats.active}</div>
                  <div className="text-xs text-gray-600">Active Youth</div>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-xl font-semibold text-blue-600">{youthStats.total}</div>
                  <div className="text-xs text-gray-600">Total Validated</div>
                </div>
                        </div>
                        
              <div className="space-y-2">
                <div className="flex justify-between items-center py-1">
                  <span className="text-sm text-gray-600">Eligible (15-27)</span>
                  <span className="text-sm font-medium text-gray-900">{youthStats.active}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-sm text-gray-600">Age Warning (28-29)</span>
                  <span className="text-sm font-medium text-gray-900">{youthStats.ageWarning}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-sm text-gray-600">Aged Out (30+)</span>
                  <span className="text-sm font-medium text-gray-900">{youthStats.ageOut}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-sm text-gray-600">Archived</span>
                  <span className="text-sm font-medium text-gray-900">{youthStats.archived}</span>
                </div>
              </div>
            </div>
                        </div>
                        
          {/* Recent Activity */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-green-600" />
                </div>
                        <div>
                  <h3 className="text-sm font-semibold text-gray-900">Recent Activity</h3>
                  <p className="text-xs text-gray-600">Latest youth validations</p>
                </div>
                        </div>
                      </div>
                      
            <div className="p-5 space-y-3">
              {validatedYouth
                .sort((a, b) => new Date(b.validatedAt) - new Date(a.validatedAt))
                .slice(0, 4)
                .map(youth => (
                  <div key={youth.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg transition-colors">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{youth.firstName} {youth.lastName}</div>
                      <div className="text-xs text-gray-500">
                        {youth.age} years • {youth.barangay}
                      </div>
                    </div>
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      youth.status === 'active' ? 'bg-green-400' :
                      youth.status === 'age_warning' ? 'bg-yellow-400' :
                      youth.status === 'age_out' ? 'bg-orange-400' :
                      'bg-gray-400'
                    }`}></div>
                  </div>
                ))}
        </div>
      </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                  <UserCheck className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                  <h3 className="text-sm font-semibold text-gray-900">Quick Actions</h3>
                  <p className="text-xs text-gray-600">Common management tasks</p>
                  </div>
                      </div>
                    </div>

            <div className="p-5 space-y-3">
              <button
                onClick={() => setActiveTab('age_warning')}
                className="w-full px-4 py-2 bg-yellow-50 text-yellow-700 text-sm font-medium rounded-lg hover:bg-yellow-100 transition-colors border border-yellow-200"
              >
                Review Age Warnings ({youthStats.ageWarning})
              </button>
              
              <button
                onClick={() => setActiveTab('age_out')}
                className="w-full px-4 py-2 bg-orange-50 text-orange-700 text-sm font-medium rounded-lg hover:bg-orange-100 transition-colors border border-orange-200"
              >
                Process Age Outs ({youthStats.ageOut})
              </button>
              
                <button
                onClick={() => setActiveTab('archived')}
                className="w-full px-4 py-2 bg-gray-50 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
                >
                View Archived ({youthStats.archived})
                  </button>
              </div>
                </div>
                </div>
                </div>
                
      <TabbedDetailModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedYouth(null);
        }}
        data={selectedYouth || {}}
        mode="view"
        config={youthDetailConfig}
      />

      {/* Toast Container */}
      <ToastContainer position="top-right" maxToasts={5} />
      <ConfirmationModal {...confirmation.modalProps} />
    </div>
  );
};

export default YouthManagement;