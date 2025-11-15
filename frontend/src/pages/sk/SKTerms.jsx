import React, { useState, useEffect, useRef } from 'react';
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
  AlertTriangle,
  Target,
  TrendingUp,
  Activity,
  Zap,
  BookOpen,
  Heart,
  ClipboardList
} from 'lucide-react';
import { HeaderMainContent, TabContainer, Tab, useTabState, ActionMenu, SearchBar, SortModal, FilterModal, BulkModal, Pagination, useSortModal, useBulkModal, usePagination, Avatar, Status, ExportButton, useExport, LoadingSpinner, BulkActionsBar, CollapsibleForm, DataTable, ActiveTermBanner } from '../../components/portal_main_content';
import { extractTermStats } from '../../utils/termStats';
import { ToastContainer, showSuccessToast, showErrorToast, showInfoToast, ConfirmationModal, useConfirmation } from '../../components/universal';
import skTermsService from '../../services/skTermsService';
import { useActiveTerm } from '../../hooks/useActiveTerm';
import logger from '../../utils/logger.js';

const SKTermsManagement = () => {
  const navigate = useNavigate();

  // Tab state hook for status filtering
  const { activeTab, setActiveTab } = useTabState('all', async (tabId) => {
    setTabLoading(true);
    setStatusFilter(tabId);
    setCurrentPage(1); // Reset to first page when changing tabs
    
    try {
      // Add a minimum loading time to make the effect visible
      const [dataResult] = await Promise.all([
        loadTermData(tabId, 1), // Load data for the new tab
        new Promise(resolve => setTimeout(resolve, 300)) // Minimum 300ms loading
      ]);
    } finally {
      setTabLoading(false);
    }
  });

  // UI state
  const [viewMode, setViewMode] = useState('grid');
  const [selectedItems, setSelectedItems] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [isLoading, setIsLoading] = useState(false);
  const [tabLoading, setTabLoading] = useState(false);

  // SK Term data state
  const [terms, setTerms] = useState([]);
  const [totalTerms, setTotalTerms] = useState(0);
  const [termStats, setTermStats] = useState({
    total: 0,
    active: 0,
    upcoming: 0,
    completed: 0
  });
  
  // Active term state using custom hook
  const { activeTerm, isLoading: isLoadingActiveTerm, error: activeTermError, hasActiveTerm } = useActiveTerm();
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Filter modal state
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterValues, setFilterValues] = useState({
    dateCreated: ''
  });
  const filterTriggerRef = React.useRef(null);
  
  // Form state for creating new terms
  const [formData, setFormData] = useState({
    termName: '',
    startDate: '',
    endDate: ''
  });

  // Separate form state for editing existing terms
  const [editFormData, setEditFormData] = useState({
    termName: '',
    startDate: '',
    endDate: ''
  });

  // Helper: format any date-like value to yyyy-MM-dd for <input type="date">
  const formatDateForInput = (value) => {
    if (!value) return '';
    const date = (value instanceof Date) ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };
  
  // Collapse state for Add Term form
  const [formCollapsed, setFormCollapsed] = useState(true);
  
  // Form saving state
  const [isSaving, setIsSaving] = useState(false);
  
  // Bulk operations state
  const [bulkAction, setBulkAction] = useState('');
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // Term details modal state
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState(null);
  const [isEditingSaving, setIsEditingSaving] = useState(false);
  const [extensionData, setExtensionData] = useState({ newEndDate: '' });
  const [isExtending, setIsExtending] = useState(false);
  
  // Confirmation modal hook
  const confirmation = useConfirmation();

  // Modal state management using custom hooks
  const sortModal = useSortModal(sortBy, sortOrder);
  const bulkModal = useBulkModal();
  
  // Pagination state management using custom hook
  const pagination = usePagination({
    initialPage: currentPage,
    initialItemsPerPage: itemsPerPage,
    totalItems: totalTerms || 0,
    onPageChange: setCurrentPage,
    onItemsPerPageChange: setItemsPerPage
  });

  // Sync modal state with existing state variables
  useEffect(() => {
    setSortBy(sortModal.sortBy);
    setSortOrder(sortModal.sortOrder);
  }, [sortModal.sortBy, sortModal.sortOrder]);

  // Sync pagination state when totalTerms changes
  useEffect(() => {
    if (totalTerms > 0 && pagination.totalItems !== totalTerms) {
      logger.debug('Syncing pagination with totalTerms', { totalTerms, paginationTotal: pagination.totalItems });
    }
  }, [totalTerms, pagination.totalItems]);

  // Reset to first page when filters change
  useEffect(() => {
    if (currentPage > 1) {
      setCurrentPage(1);
    }
  }, [searchQuery, statusFilter, sortBy, sortOrder]);

  // Load SK term data
  const loadTermData = async (customStatus = null, customPage = null) => {
      setIsLoading(true);
    try {
      const params = {
        page: customPage || currentPage,
        limit: itemsPerPage,
        sortBy,
        sortOrder,
        q: searchQuery || undefined,
        status: customStatus !== null ? (customStatus !== 'all' ? customStatus : undefined) : (statusFilter !== 'all' ? statusFilter : undefined)
      };

      const response = await skTermsService.getSKTerms(params);
      logger.debug('Frontend - API Response', { success: response.success, hasData: !!response.data });
      
      if (response.success) {
        const termData = response.data.data?.terms || response.data.data || [];
        logger.debug('Frontend - Term Data', { count: termData.length, hasFirst: !!termData[0] });
        
        setTerms(termData);
        setTotalTerms(response.data.data?.pagination?.totalRecords || response.data.data?.pagination?.total || termData.length || 0);
      } else {
        logger.error('Failed to load terms', null, { message: response.message });
        showErrorToast('Load Error', 'Failed to load SK terms: ' + response.message);
      }
    } catch (error) {
      logger.error('Error loading terms', error);
      showErrorToast('Load Error', 'Error loading SK term data');
    } finally {
      setIsLoading(false);
    }
  };

  // Load SK term statistics
  const loadTermStats = async () => {
    try {
      logger.debug('Loading term statistics');
      
      // Get all terms for stats calculation
      const statsParams = {
        limit: 1000,
        sortBy: 'created_at',
        sortOrder: 'desc'
      };
      
      const statsResponse = await skTermsService.getSKTerms(statsParams);
      logger.debug('Term stats response', { success: statsResponse.success, hasData: !!statsResponse.data });
      
      if (statsResponse.success) {
        const allTerms = statsResponse.data.data?.terms || statsResponse.data.data || [];
        logger.debug('All terms data', { count: allTerms.length });
        
        const mappedStats = {
          total: allTerms.length,
          active: allTerms.filter(t => t.status === 'active').length,
          upcoming: allTerms.filter(t => t.status === 'upcoming').length,
          completed: allTerms.filter(t => t.status === 'completed').length
        };
        logger.debug('Mapped stats', mappedStats);
        setTermStats(mappedStats);
            } else {
        logger.error('Failed to load term stats', null, { message: statsResponse.message });
            }
          } catch (error) {
      logger.error('Error loading term stats', error);
    }
  };

  // Memoize loadTermData to prevent infinite re-renders
  const memoizedLoadTermData = React.useCallback(loadTermData, [
    currentPage, 
    itemsPerPage, 
    sortBy, 
    sortOrder, 
    searchQuery, 
    statusFilter
  ]);

  // Load data on component mount and when dependencies change
  const isInitialMount = React.useRef(true);
  const lastLoadParams = React.useRef(null);
  
  useEffect(() => {
    // Create param signature for comparison
    const currentParams = `${currentPage}-${itemsPerPage}-${sortBy}-${sortOrder}-${searchQuery}-${statusFilter}`;
    
    const isFirstLoad = isInitialMount.current;
    // Skip if same parameters (prevents duplicate calls), but NOT on the very first load
    if (!isFirstLoad && lastLoadParams.current === currentParams) {
      return;
    }
    
    lastLoadParams.current = currentParams;
    
    const timeoutId = setTimeout(async () => {
      if (isFirstLoad) {
        // Load both data and stats on initial mount
        await memoizedLoadTermData();
        await loadTermStats();
        isInitialMount.current = false;
      } else {
        // Only reload data on subsequent changes
        await memoizedLoadTermData();
      }
    }, 300); // Longer delay to avoid rapid requests

    return () => clearTimeout(timeoutId);
  }, [memoizedLoadTermData, loadTermStats]);

  // Reset current page if it's out of bounds
  useEffect(() => {
    if (totalTerms > 0) {
      const maxPage = Math.ceil(totalTerms / itemsPerPage);
      if (currentPage > maxPage) {
        setCurrentPage(1);
      }
    }
  }, [totalTerms, itemsPerPage, currentPage]);

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
    logger.debug('Filters applied', appliedValues);
  };

  const handleFilterClear = (clearedValues) => {
    setFilterValues(clearedValues);
    logger.debug('Filters cleared');
  };

  // Get action menu items for a term (staff can only view reports)
  const getActionMenuItems = (item) => {
    return [
      {
        id: 'report',
        label: 'View Term Report',
        icon: <BarChart3 className="w-4 h-4" />,
        action: 'report'
      }
    ];
  };

  const handleActionClick = async (action, item) => {
    // Staff can only view reports
    if (action === 'report') {
      navigate(`/staff/sk-governance/term-report?termId=${item.termId}`);
    }
  };

  const handleSelectItem = (id) => {
    logger.debug('handleSelectItem called', { id, selectedCount: selectedItems.length });
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const allTermIds = terms.map(item => item.termId).filter(Boolean);
    logger.debug('handleSelectAll', { allTermIdsCount: allTermIds.length, currentSelectedCount: selectedItems.length });
    setSelectedItems(selectedItems.length === allTermIds.length ? [] : allTermIds);
  };

  // Handle search query changes
  const handleSearchChange = (newQuery) => {
    setSearchQuery(newQuery);
    setCurrentPage(1); // Reset to first page when searching
  };

  // Form handlers
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.termName || !formData.startDate || !formData.endDate) {
      showErrorToast('Validation failed', 'Please fill in all required fields');
      return;
    }
    
    setIsSaving(true);
    try {
      // Call API to create term
      const response = await skTermsService.createSKTerm(formData);
      logger.debug('Create Term Response', { success: response.success, hasData: !!response.data });
      
      if (response.success) {
        showSuccessToast('Term created', `${formData.termName} has been created successfully`);
      
      // Reset form
      setFormData({
        termName: '',
        startDate: '',
          endDate: ''
      });
        setFormCollapsed(true);
        
        // Reload data
        await loadTermData();
        await loadTermStats();
      } else {
        // Enhanced error handling with specific validation errors
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
        
        // Log suggested dates for debugging
        if (response.details && response.details.suggestions) {
          logger.debug('Suggested dates', { suggestions: response.details.suggestions });
        }
        
        showErrorToast('Term Creation Failed', errorMessage);
        logger.error('API Error Response', null, { response });
      }
    } catch (error) {
      logger.error('Error creating term', error, { formData });
      
      // Enhanced error message for network/technical errors
      let errorMessage = 'Failed to create term';
      if (error.message) {
        errorMessage = error.message;
      } else if (error.response && error.response.data && error.response.data.message) {
        errorMessage = error.response.data.message;
        
        // Also check for errors array in response
        if (error.response.data.errors && Array.isArray(error.response.data.errors)) {
          if (error.response.data.errors.length === 1) {
            errorMessage = error.response.data.errors[0];
          } else if (error.response.data.errors.length === 2) {
            errorMessage = `${error.response.data.errors[0]} and ${error.response.data.errors[1].toLowerCase()}`;
          } else {
            errorMessage = `Please fix ${error.response.data.errors.length} issues: ${error.response.data.errors.slice(0, 2).join(', ')}${error.response.data.errors.length > 2 ? ' and more...' : ''}`;
          }
        }
      }
      
      showErrorToast('Creation Failed', errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  // Helper functions for statistics
  const getTermStatistics = (item) => {
    const stats = extractTermStats(item) || {};
    return {
      totalOfficials: stats.total || 0,
      filledPositions: stats.filled || 0,
      vacantPositions: stats.vacant || 0,
      fillPercent: stats.percent || 0,
      barangays: stats.barangays || null
    };
  };

  // Get term display fields for DataTable
  const getTermDisplayFields = () => ({
    title: (item) => {
      return (
      <div className="flex items-center space-x-2">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex-shrink-0">
          <Calendar className="w-4 h-4" />
        </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 min-w-0">
                <span className="font-medium text-gray-900 text-sm sm:text-base truncate">{item.termName}</span>
                <span className="inline-flex items-center px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 flex-shrink-0">
                  {item.termId}
                </span>
      </div>
            </div>
          </div>
        </div>
      );
    },
    subtitle: (item) => {
      const stats = getTermStatistics(item);
      
      // Calculate days remaining if active
      let daysRemaining = null;
      let isOverdue = false;
      
      if (item.status === 'active' && item.endDate) {
        try {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const endDate = new Date(item.endDate);
          endDate.setHours(0, 0, 0, 0);
          
          const timeDiff = endDate.getTime() - today.getTime();
          daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
          isOverdue = daysRemaining < 0;
        } catch (error) {
          logger.error('Error calculating days remaining', error, { termId: item.termId });
        }
      }
      
              return (
        <div className="space-y-1.5 sm:space-y-2">
          {/* Date Range - Responsive format */}
          <div className="flex items-center text-xs sm:text-sm text-gray-600">
            <Calendar className="w-3 h-3 mr-1 flex-shrink-0" />
            <div className="truncate">
              {/* Mobile format */}
              <span className="sm:hidden">
                {new Date(item.startDate).toLocaleDateString('en-US', { 
                  year: '2-digit', 
                  month: 'short', 
                  day: 'numeric' 
                })} - {new Date(item.endDate).toLocaleDateString('en-US', { 
                  year: '2-digit', 
                  month: 'short', 
                  day: 'numeric' 
                })}
                </span>
              {/* Desktop format */}
              <span className="hidden sm:inline">
                {new Date(item.startDate).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric' 
                })} - {new Date(item.endDate).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric' 
                })}
                </span>
            </div>
        </div>
        
          {/* Statistics - Mobile-friendly layout */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-1 sm:gap-2">
            {/* Fill Rate - Most Important (Always First) */}
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200 w-fit">
              <TrendingUp className="w-3 h-3 mr-1 flex-shrink-0" />
              <span className="truncate">{stats.fillPercent}% Filled</span>
            </span>
            
            {/* Total Positions */}
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 w-fit">
              <Users className="w-3 h-3 mr-1 flex-shrink-0" />
              <span className="truncate">{stats.filledPositions}/{stats.totalOfficials} Positions</span>
          </span>
            
            {/* Filled Positions - Always show */}
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 w-fit">
              <CheckCircle className="w-3 h-3 mr-1 flex-shrink-0" />
              <span className="truncate">{stats.filledPositions} Filled</span>
            </span>
            
            {/* Vacant Positions - Always show */}
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border w-fit ${
              stats.vacantPositions > 0 
                ? 'bg-orange-50 text-orange-700 border-orange-200' 
                : 'bg-gray-50 text-gray-700 border-gray-200'
            }`}>
              <AlertCircle className="w-3 h-3 mr-1 flex-shrink-0" />
              <span className="truncate">{stats.vacantPositions} Vacant</span>
            </span>
            
            {/* Barangays Count - If available */}
            {stats.barangays !== null && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200 w-fit">
                <Target className="w-3 h-3 mr-1 flex-shrink-0" />
                <span className="truncate">{stats.barangays} Barangays</span>
            </span>
          )}
            
            {/* Days Remaining - Only for active terms */}
            {item.status === 'active' && daysRemaining !== null && (
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border w-fit ${
                daysRemaining > 0 
                  ? 'bg-yellow-50 text-yellow-700 border-yellow-200' 
                  : 'bg-red-50 text-red-700 border-red-200'
              }`}>
                <Clock className="w-3 h-3 mr-1 flex-shrink-0" />
                <span className="truncate">
                  {daysRemaining > 0 
                    ? `${daysRemaining} days left` 
                    : daysRemaining === 0 
                      ? 'Ends today' 
                      : `${Math.abs(daysRemaining)} days overdue`
                  }
                </span>
              </span>
            )}
            
            {/* Overdue Indicator - Only for overdue active terms */}
            {item.status === 'active' && isOverdue && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200 w-fit">
                <AlertTriangle className="w-3 h-3 mr-1 flex-shrink-0" />
                <span className="truncate">Overdue</span>
              </span>
            )}
        </div>
      </div>
      );
    },
    status: (item) => {
      const s = (item.status || '').toString().toLowerCase();
      return s === 'inactive' ? 'completed' : s;
    },
    date: 'createdAt',
    badge: null // Remove badge to avoid duplicate display
  });

  // Export helper functions
  const buildTermCsvRows = (terms = []) => {
    const rows = [];
    rows.push(['Term ID', 'Term Name', 'Start Date', 'End Date', 'Status', 'Total Officials', 'Filled', 'Vacant', 'Fill Rate', 'Created At']);
    (terms || []).forEach((t) => {
      const stats = getTermStatistics(t);
      rows.push([
        t.termId || '',
        t.termName || '',
        t.startDate ? new Date(t.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '',
        t.endDate ? new Date(t.endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '',
        (t.status || '').toString(),
        stats.totalOfficials,
        stats.filledPositions,
        stats.vacantPositions,
        `${stats.fillPercent}%`,
        t.createdAt ? new Date(t.createdAt).toLocaleDateString() : ''
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

  // Excel (XLS via XML) export
  const buildTermExcelXml = (terms = []) => {
    const headerRow = `
      <Row>
        <Cell><Data ss:Type="String">Term ID</Data></Cell>
        <Cell><Data ss:Type="String">Term Name</Data></Cell>
        <Cell><Data ss:Type="String">Start Date</Data></Cell>
        <Cell><Data ss:Type="String">End Date</Data></Cell>
        <Cell><Data ss:Type="String">Status</Data></Cell>
        <Cell><Data ss:Type="String">Total Officials</Data></Cell>
        <Cell><Data ss:Type="String">Filled</Data></Cell>
        <Cell><Data ss:Type="String">Vacant</Data></Cell>
        <Cell><Data ss:Type="String">Fill Rate</Data></Cell>
        <Cell><Data ss:Type="String">Created At</Data></Cell>
      </Row>`;

    const bodyRows = (terms || []).map((t) => {
      const stats = getTermStatistics(t);
      return `
        <Row>
          <Cell><Data ss:Type="String">${(t.termId || '').toString()}</Data></Cell>
          <Cell><Data ss:Type="String">${(t.termName || '').toString()}</Data></Cell>
          <Cell><Data ss:Type="String">${t.startDate ? new Date(t.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : ''}</Data></Cell>
          <Cell><Data ss:Type="String">${t.endDate ? new Date(t.endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : ''}</Data></Cell>
          <Cell><Data ss:Type="String">${((t.status || '').toString())}</Data></Cell>
          <Cell><Data ss:Type="Number">${stats.totalOfficials}</Data></Cell>
          <Cell><Data ss:Type="Number">${stats.filledPositions}</Data></Cell>
          <Cell><Data ss:Type="Number">${stats.vacantPositions}</Data></Cell>
          <Cell><Data ss:Type="String">${stats.fillPercent}%</Data></Cell>
          <Cell><Data ss:Type="String">${t.createdAt ? new Date(t.createdAt).toLocaleDateString() : ''}</Data></Cell>
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

  // PDF export via print-friendly window
  const openPrintPdf = (title, terms = []) => {
    const win = window.open('', '_blank');
    if (!win) return;
    const styles = `
      <style>
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        body { font-family: Arial, sans-serif; color: #111; }
        h1 { font-size: 16px; margin: 0 0 8px; font-weight: 700; text-align: left; }
        table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        th, td { border: 1px solid #666; padding: 6px 8px; font-size: 11px; line-height: 1.15; }
        thead th { background: #f3f4f6 !important; font-weight: 700; }
        thead { display: table-header-group; }
        @page { size: A4 landscape; margin: 12mm; }
      </style>`;
    const header = `
      <thead>
        <tr>
          <th>Term ID</th>
          <th>Term Name</th>
          <th>Status</th>
          <th>Start Date</th>
          <th>End Date</th>
          <th>Total</th>
          <th>Filled</th>
          <th>Vacant</th>
          <th>Fill Rate</th>
        </tr>
      </thead>`;
    const rows = (terms || []).map((t) => {
      const stats = getTermStatistics(t);
      return `
        <tr>
          <td>${t.termId || ''}</td>
          <td>${t.termName || ''}</td>
          <td>${t.status || ''}</td>
          <td>${t.startDate ? new Date(t.startDate).toLocaleDateString() : ''}</td>
          <td>${t.endDate ? new Date(t.endDate).toLocaleDateString() : ''}</td>
          <td>${stats.totalOfficials}</td>
          <td>${stats.filledPositions}</td>
          <td>${stats.vacantPositions}</td>
          <td>${stats.fillPercent}%</td>
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
      </html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  };

  const mainExport = useExport({
    exportFunction: async (format, style = null) => {
      try {
        const filteredTerms = statusFilter === 'all' ? terms : terms.filter(t => t.status === statusFilter);
        
        if (format === 'csv') {
          const rows = buildTermCsvRows(filteredTerms);
          downloadCsv('sk-terms.csv', rows);
        } else if (format === 'excel') {
          const xml = buildTermExcelXml(filteredTerms);
          downloadExcel('sk-terms.xls', xml);
        } else if (format === 'pdf') {
          openPrintPdf('SK Terms', filteredTerms);
        }
        
        // Log export to backend for activity logs (fire and forget)
        // Use JSON format to avoid file download, but pass actual format in query for correct logging
        const actualFormat = format === 'xlsx' ? 'excel' : format;
        try {
          const queryParams = new URLSearchParams();
          queryParams.append('format', 'json'); // Use JSON to avoid download
          queryParams.append('logFormat', actualFormat); // Pass actual format for logging
          queryParams.append('count', filteredTerms.length.toString()); // Pass actual filtered count
          if (statusFilter !== 'all') {
            queryParams.append('tab', statusFilter); // Pass tab info for logging
          }
          
          const apiModule = await import('../../services/api.js');
          const api = apiModule.default;
          api.get(`/sk-terms/export?${queryParams.toString()}`).catch(err => {
            logger.error('Failed to log export activity', err);
          });
        } catch (err) {
          logger.error('Failed to log export activity', err);
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
        const selectedTermsData = terms.filter(term => selectedItems.includes(term.termId));
        if (selectedTermsData.length === 0) {
          throw new Error('No terms selected for export');
        }

        if (format === 'csv') {
          const rows = buildTermCsvRows(selectedTermsData);
          downloadCsv('sk-terms-selected.csv', rows);
        } else if (format === 'excel') {
          const xml = buildTermExcelXml(selectedTermsData);
          downloadExcel('sk-terms-selected.xls', xml);
        } else if (format === 'pdf') {
          openPrintPdf('SK Terms (Selected)', selectedTermsData);
        }
        
        // Log export to backend for activity logs (fire and forget)
        // Use JSON format to avoid file download, but pass actual format in query for correct logging
        const actualFormat = format === 'xlsx' ? 'excel' : format;
        try {
          const queryParams = new URLSearchParams();
          queryParams.append('format', 'json'); // Use JSON to avoid download
          queryParams.append('logFormat', actualFormat); // Pass actual format for logging
          queryParams.append('count', selectedTermsData.length.toString()); // Number of exported terms
          queryParams.append('selectedIds', selectedItems.join(',')); // Selected term IDs
          queryParams.append('exportType', 'bulk'); // Indicate this is a bulk export
          
          const apiModule = await import('../../services/api.js');
          const api = apiModule.default;
          api.get(`/sk-terms/export?${queryParams.toString()}`).catch(err => {
            logger.error('Failed to log export activity', err);
          });
        } catch (err) {
          logger.error('Failed to log export activity', err);
        }
        
        return { success: true };
      } catch (error) {
        throw new Error(error.message || 'Failed to export selected terms');
      }
    },
    onSuccess: () => showSuccessToast('Bulk export completed', 'Selected terms exported successfully'),
    onError: (error) => showErrorToast('Bulk export failed', error.message)
  });

  return (
    <div className="space-y-5">
      {/* Header Section */}
      <HeaderMainContent
        title="SK Terms Management"
        description="Create, manage, and track SK terms and their lifecycle"
      />

      {/* Active Term Banner */}
            <ActiveTermBanner
        activeTerm={activeTerm}
        hasActiveTerm={hasActiveTerm}
        isLoading={isLoadingActiveTerm}
        onNavigateToReport={() => navigate(`/staff/sk-governance/term-report?termId=${activeTerm?.termId}`)}
        onCreateTerm={null}
        variant="terms"
      />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6">
        {/* Terms List - Full Width */}
        <div className="xl:col-span-1">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Tabs */}
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
                count={termStats.total} 
                color="blue"
              />
              <Tab 
                id="active" 
                label="Active" 
                count={termStats.active} 
                color="green"
              />
              <Tab 
                id="completed" 
                label="Completed" 
                count={termStats.completed} 
                color="gray"
              />
            </TabContainer>

            {/* Controls */}
            <div className="px-5 py-4 border-t border-gray-100">
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
                    formats={['csv','xlsx','pdf']}
                    onExport={(format) => mainExport.handleExport(format === 'xlsx' ? 'excel' : format)}
                    isExporting={mainExport.isExporting}
                    label="Export"
                    size="md"
                    position="auto"
                    responsive={true}
                    customFormats={{ pdf: { label: 'Export as PDF', icon: <FileText className="w-4 h-4" />, description: 'Portable document format', styles: [] } }}
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
                  { value: 'created_at', label: 'Date Created' },
                  { value: 'status', label: 'Status' }
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
              exportConfig={{
                formats: ['csv', 'xlsx', 'pdf'],
                onExport: (format) => bulkExportHook.handleExport(format === 'xlsx' ? 'excel' : format),
                isExporting: bulkExportHook.isExporting,
                customFormats: { pdf: { label: 'Export as PDF', icon: <FileText className="w-4 h-4" />, description: 'Portable document format', styles: [] } }
              }}
              primaryColor="blue"
            />

            {/* Content Area */}
            {tabLoading ? (
              <LoadingSpinner 
                variant="spinner"
                message="Loading SK terms..." 
                size="md"
                color="blue"
                height="h-64"
              />
            ) : (
              <>
              <DataTable
                  data={terms}
                selectedItems={selectedItems}
                onSelectItem={handleSelectItem}
                onSelectAll={handleSelectAll}
                getActionMenuItems={getActionMenuItems}
                onActionClick={handleActionClick}
                viewMode={viewMode}
                keyField="termId"
                displayFields={getTermDisplayFields()}
                selectAllLabel="Select All Terms"
                  emptyMessage="No SK terms found"
                                 styling={{
                   gridCols: 'grid-cols-1 lg:grid-cols-2',
                  cardHover: 'hover:border-blue-300 hover:shadow-xl hover:shadow-blue-100/50 hover:scale-[1.02]',
                  listHover: 'hover:bg-blue-50/30 hover:border-l-4 hover:border-l-blue-400',
                  theme: 'blue'
                 }}
              />
              </>
            )}

            {/* Bottom Pagination - Always visible when data is loaded */}
            {!tabLoading && (
              <Pagination
                key={`pagination-${totalTerms}-${itemsPerPage}`}
                currentPage={currentPage}
                totalItems={Math.max(totalTerms || 0, terms?.length || 0)}
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
      </div>

      {/* Term Details View Modal */}
      {showViewModal && selectedTerm && createPortal(
        <div className="fixed inset-0 flex items-center justify-center z-[99999] p-4 backdrop-blur-[1px]" onClick={() => setShowViewModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-100 text-blue-600">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{selectedTerm.termName}</h3>
                    <p className="text-sm text-gray-600">SK Term Details</p>
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
              {/* Basic Information Section */}
              <div className="mb-8">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                  Basic Information
                </h4>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Term Name</label>
                      <p className="text-lg font-semibold text-gray-900">{selectedTerm.termName}</p>
                  </div>
                  
                    <div className="bg-gray-50 rounded-lg p-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                      <p className="text-sm text-gray-900">
                        {new Date(selectedTerm.startDate).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric' 
                        })} - {new Date(selectedTerm.endDate).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <div className="mt-1">
                      <Status status={selectedTerm.status} />
                    </div>
                  </div>
                </div>
                    </div>
                    </div>
                    
              {/* Statistics Section */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
                  Term Statistics
                </h4>
                
                {/* Primary Statistics - Key Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-3xl font-bold text-blue-800">{getTermStatistics(selectedTerm).totalOfficials}</div>
                        <div className="text-sm font-medium text-blue-600">Total Positions</div>
                    </div>
                      <div className="w-12 h-12 bg-blue-200 rounded-full flex items-center justify-center">
                        <Users className="w-6 h-6 text-blue-700" />
                  </div>
                </div>
              </div>
              
                  <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-3xl font-bold text-green-800">{getTermStatistics(selectedTerm).filledPositions}</div>
                        <div className="text-sm font-medium text-green-600">Filled Positions</div>
                      </div>
                      <div className="w-12 h-12 bg-green-200 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-6 h-6 text-green-700" />
                    </div>
                  </div>
                      </div>
                    
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-3xl font-bold text-purple-800">
                          {getTermStatistics(selectedTerm).fillPercent}%
                    </div>
                        <div className="text-sm font-medium text-purple-600">Fill Rate</div>
                  </div>
                      <div className="w-12 h-12 bg-purple-200 rounded-full flex items-center justify-center">
                        <Target className="w-6 h-6 text-purple-700" />
              </div>
            </div>
                </div>
          </div>

                {/* Secondary Statistics - Detailed Breakdown */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-orange-800">{getTermStatistics(selectedTerm).vacantPositions}</div>
                    <div className="text-sm text-orange-600">Vacant</div>
            </div>
            
                  {getTermStatistics(selectedTerm).barangays !== null && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-gray-800">{getTermStatistics(selectedTerm).barangays}</div>
                      <div className="text-sm text-gray-600">Barangays</div>
                </div>
                  )}
              </div>
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
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Term Modal - Removed for staff (view-only) */}
      {false && showEditModal && selectedTerm && createPortal(
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
                    <h3 className="text-lg font-bold text-gray-900">Edit SK Term</h3>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Term Name *</label>
                    <input
                      type="text"
                      value={editFormData.termName}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, termName: e.target.value }))}
                      placeholder="Enter term name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 gap-3">
                  <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start Date *</label>
                    <input
                      type="date"
                        value={editFormData.startDate}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, startDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">End Date *</label>
                    <input
                      type="date"
                        value={editFormData.endDate}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, endDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                    </div>
                  </div>
                </div>

                {/* Preview */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">Preview Changes</h4>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">New Term Name</label>
                        <p className="mt-1 text-sm text-gray-900 font-medium">{editFormData.termName || selectedTerm.termName}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">New Date Range</label>
                        <p className="mt-1 text-sm text-gray-900">
                          {(editFormData.startDate ? new Date(editFormData.startDate) : new Date(selectedTerm.startDate)).toLocaleDateString()} - {(editFormData.endDate ? new Date(editFormData.endDate) : new Date(selectedTerm.endDate)).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end space-x-3">
              <button
                onClick={() => { setShowEditModal(false); }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!editFormData.termName || !editFormData.startDate || !editFormData.endDate) {
                    showErrorToast('Validation failed', 'Term name, start date, and end date are required');
                    return;
                  }
                  try {
                    setIsEditingSaving(true);
                    const payload = {
                      termName: editFormData.termName,
                      startDate: editFormData.startDate,
                      endDate: editFormData.endDate
                    };
                    const resp = await skTermsService.updateSKTerm(selectedTerm.termId, payload);
                    if (resp.success) {
                      showSuccessToast('Term updated', `${editFormData.termName} has been updated successfully`);
                      setShowEditModal(false);
                      await loadTermData();
                      await loadTermStats();
                    } else {
                      const details = resp.message || resp.error || 'Failed to update term';
                      showErrorToast('Update failed', details);
                    }
                    } catch (error) {
                    logger.error('Update error', error, { termId: editingTerm?.termId });
                    const details = error?.response?.data?.message || error?.message || 'An error occurred while updating the term';
                    showErrorToast('Update failed', details);
                  } finally {
                    setIsEditingSaving(false);
                  }
                }}
                disabled={isEditingSaving}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isEditingSaving ? 'Updating...' : 'Update Term'}
                    </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Term Extension Modal - Removed for staff (view-only) */}
      {false && showExtendModal && selectedTerm && createPortal(
        <div className="fixed inset-0 flex items-center justify-center z-[99999] p-4 bg-black/30 backdrop-blur-sm" onClick={() => setShowExtendModal(false)}>
          <div className="relative bg-white rounded-xl shadow-2xl border border-gray-200/60 max-w-md w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Header - match other modals */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Clock className="w-5 h-5 text-blue-600" />
            </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Extend SK Term</h3>
                    <p className="text-sm text-gray-600">Extend the end date for {selectedTerm.termName}</p>
                </div>
              </div>
                <button
                  onClick={() => setShowExtendModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                    </div>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">New End Date *</label>
                <input
                  type="date"
                  value={extensionData?.newEndDate || ''}
                  onChange={(e) => setExtensionData(prev => ({ ...(prev||{}), newEndDate: e.target.value }))}
                  min={formatDateForInput(selectedTerm.endDate)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">New end date must be after current end date</p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end space-x-3">
              <button
                onClick={() => { setShowExtendModal(false); setExtensionData({ newEndDate: '' }); }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
                </button>
              <button
                onClick={async () => {
                  if (!extensionData?.newEndDate) {
                    showErrorToast('Validation failed', 'New end date is required');
                    return;
                  }
                  try {
                    setIsExtending(true);
                    const resp = await skTermsService.extendSKTerm(selectedTerm.termId, extensionData.newEndDate);
                    if (resp.success) {
                      showSuccessToast('Term extended', `${selectedTerm.termName} has been extended successfully`);
                      setShowExtendModal(false);
                      setExtensionData({ newEndDate: '' });
                      await loadTermData();
                      await loadTermStats();
                        } else {
                      showErrorToast('Extension failed', resp.message || resp.error || 'Failed to extend term');
                        }
                      } catch (error) {
                    logger.error('Extension error', error, { termId: extendingTerm?.termId });
                    showErrorToast('Extension failed', error?.message || 'An error occurred while extending the term');
                  } finally {
                    setIsExtending(false);
                  }
                }}
                disabled={!extensionData?.newEndDate || isExtending}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed inline-flex items-center"
              >
                {isExtending ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  'Extend Term'
                )}
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

export default SKTermsManagement;

