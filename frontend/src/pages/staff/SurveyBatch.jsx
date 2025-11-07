import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  ChevronLeft, 
  ChevronRight,
  Grid,
  List,
  Trash2,
  X,
  User,
  Mail,
  Briefcase,
  Building,
  Phone,
  MapPin,
  Calendar,
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
import { HeaderMainContent, TabContainer, Tab, useTabState, SearchBar, SortModal, FilterModal, Pagination, useSortModal, usePagination, Avatar, Status, ExportButton, useExport, LoadingSpinner, BulkActionsBar, DataTable, ActiveSurveyBanner } from '../../components/portal_main_content';
import { ToastContainer, showSuccessToast, showErrorToast, showInfoToast, ConfirmationModal, useConfirmation } from '../../components/universal';
import surveyBatchesService from '../../services/surveyBatchesService';
import { useActiveSurvey } from '../../hooks/useActiveSurvey';
import { useRealtime } from '../../realtime/useRealtime';

const SurveyBatch = () => {
  const navigate = useNavigate();
  
  // Helpers for announcement-style grid cards
  const formatDate = (value) => {
    if (!value) return '';
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };
  const getStatusStyles = (status) => {
    const s = (status || '').toString().toLowerCase();
    switch (s) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'closed':
      case 'inactive':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };
  const getBatchFallbackImage = (status, title) => {
    const s = (status || '').toString().toLowerCase();
    let from = '#64748b', to = '#111827';
    if (s === 'active') { from = '#10b981'; to = '#065f46'; }
    else if (s === 'draft') { from = '#f59e0b'; to = '#92400e'; }
    else if (s === 'closed' || s === 'inactive') { from = '#9ca3af'; to = '#374151'; }
    const displayTitle = (title || '').toString().slice(0, 42);
    const svg = `
      <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 675' preserveAspectRatio='xMidYMid slice'>
        <defs>
          <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
            <stop offset='0%' stop-color='${from}'/>
            <stop offset='100%' stop-color='${to}'/>
          </linearGradient>
        </defs>
        <rect width='1200' height='675' fill='url(#g)'/>
        <g fill='rgba(255,255,255,0.25)'>
          <circle cx='150' cy='120' r='90'/>
          <circle cx='1050' cy='560' r='120'/>
          <circle cx='950' cy='90' r='60'/>
        </g>
        ${displayTitle ? `
        <text x='600' y='350' text-anchor='middle' fill='white' font-family='Arial, sans-serif' font-size='32' font-weight='bold' opacity='0.9'>
          <tspan x='600' dy='0'>${displayTitle}</tspan>
        </text>` : ''}
      </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  };
  
  // Tab state hook for status filtering
  const { activeTab, setActiveTab } = useTabState('all', async (tabId) => {
    setTabLoading(true);
    setStatusFilter(tabId);
    setCurrentPage(1); // Reset to first page when changing tabs
    
    try {
      // Add a minimum loading time to make the effect visible
      const [dataResult] = await Promise.all([
        loadBatchData(tabId, 1), // Load data for the new tab
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
  const [isLoading, setIsLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);

  // Survey batch data state
  const [batches, setBatches] = useState([]);
  const [totalBatches, setTotalBatches] = useState(0);
  const [batchStats, setBatchStats] = useState({
    total: 0,
    active: 0,
    draft: 0,
    closed: 0
  });
  
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
  
  // No form state needed - staff are view-only

  // Confirmation modal hook
  const confirmation = useConfirmation();

  // Active survey hook
  const { activeSurvey, hasActiveSurvey, isLoading: isLoadingActiveSurvey, error: activeSurveyError, refreshActiveSurvey } = useActiveSurvey();

  // Modal state management using custom hooks
  const sortModal = useSortModal(sortBy, sortOrder);
  
  // Pagination state management using custom hook - RESTORED like StaffManagement
  const pagination = usePagination({
    initialPage: currentPage,
    initialItemsPerPage: itemsPerPage,
    totalItems: totalBatches || 0,
    onPageChange: setCurrentPage,
    onItemsPerPageChange: setItemsPerPage
  });

  // Sync modal state with existing state variables
  useEffect(() => {
    setSortBy(sortModal.sortBy);
    setSortOrder(sortModal.sortOrder);
  }, [sortModal.sortBy, sortModal.sortOrder]);

  // Sync pagination state when totalBatches changes - RESTORED like StaffManagement
  useEffect(() => {
    if (totalBatches > 0 && pagination.totalItems !== totalBatches) {
      console.log('🔄 Syncing pagination with totalBatches:', { totalBatches, paginationTotal: pagination.totalItems });
    }
  }, [totalBatches, pagination.totalItems]);

  // Reset to first page when filters change
  useEffect(() => {
    if (currentPage > 1) {
      setCurrentPage(1);
    }
  }, [searchQuery, statusFilter, sortBy, sortOrder]);

  // Debug itemsPerPage changes
  useEffect(() => {
    console.log('🔍 Frontend - itemsPerPage changed to:', itemsPerPage);
  }, [itemsPerPage]);

  // Debug currentPage changes
  useEffect(() => {
    console.log('🔍 Frontend - currentPage changed to:', currentPage);
  }, [currentPage]);

  // Debug pagination hook state
  useEffect(() => {
    console.log('🔍 Frontend - pagination hook state:', {
      currentPage: pagination.currentPage,
      itemsPerPage: pagination.itemsPerPage,
      totalItems: pagination.totalItems
    });
  }, [pagination.currentPage, pagination.itemsPerPage, pagination.totalItems]);

  // Load survey batch data (supports silent refresh)
  const loadBatchData = async (...args) => {
    let customStatus = null, customPage = null, silent = false;
    if (args.length > 0 && typeof args[0] === 'object' && args[0] !== null) {
      ({ customStatus = null, customPage = null, silent = false } = args[0]);
    } else {
      customStatus = args[0] ?? null;
      customPage = args[1] ?? null;
    }
    if (!silent) setIsLoading(true);
    try {
      const params = {
        page: customPage || currentPage,
        limit: itemsPerPage,
        sortBy,
        sortOrder,
        search: searchQuery || undefined,
        status: customStatus !== null ? (customStatus !== 'all' ? customStatus : undefined) : (statusFilter !== 'all' ? statusFilter : undefined),
        includeStats: true // Always include statistics for proper display
      };

      const response = await surveyBatchesService.getSurveyBatches(params);
      console.log('🔍 Frontend - API Response:', response);
      
      if (response.success) {
        const batchData = response.data.data || [];
        console.log('🔍 Frontend - Batch Data:', batchData);
        console.log('🔍 Frontend - First Batch:', batchData[0]);
        
        setBatches(batchData);
        setTotalBatches(response.data.pagination?.total || response.data.total || 0);
      } else {
        console.error('Failed to load batches:', response.message);
        showErrorToast('Load Error', 'Failed to load survey batches: ' + response.message);
      }
    } catch (error) {
      console.error('Error loading batches:', error);
      showErrorToast('Load Error', 'Error loading survey batch data');
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  // Load survey batch statistics (supports silent refresh)
  const loadBatchStats = useCallback(async (opts = { silent: false }) => {
    try {
      console.log('🔍 Loading batch statistics...');
      const response = await surveyBatchesService.getBatchStats();
      console.log('🔍 Batch stats response:', response);
      
      if (response.success) {
        // Map backend field names to frontend format
        // The response structure can be: response.data.data or response.data
        const backendData = response.data?.data || response.data || {};
        console.log('🔍 Backend data:', backendData);
        
        const mappedStats = {
          total: parseInt(backendData.total_batches || backendData.total || 0) || 0,
          active: parseInt(backendData.active_batches || backendData.active || 0) || 0,
          draft: parseInt(backendData.draft_batches || backendData.draft || 0) || 0,
          closed: parseInt(backendData.closed_batches || backendData.closed || 0) || 0
        };
        console.log('🔍 Mapped stats:', mappedStats);
        setBatchStats(mappedStats);
      } else {
        console.error('Failed to load batch stats:', response.message || response.error);
        // Don't use fallback calculation as it causes incorrect tab counts
        // The stats should only come from the backend API
      }
    } catch (error) {
      console.error('Error loading batch stats:', error);
      // Don't use fallback calculation as it causes incorrect tab counts
      // The stats should only come from the backend API
    }
  }, []);

  // NOTE: Removed calculateStatsFromBatches function as it was causing incorrect tab counts
  // The tab statistics should only come from the backend API to ensure accuracy

  // Memoize loadBatchData to prevent infinite re-renders
  const memoizedLoadBatchData = React.useCallback(loadBatchData, [
    currentPage, 
    itemsPerPage, 
    sortBy, 
    sortOrder, 
    searchQuery, 
    statusFilter
  ]);

  // Auto-update batch statuses based on dates
  const autoUpdateBatchStatuses = async (batches) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const batchesToUpdate = [];
    
    for (const batch of batches) {
      const startDate = new Date(batch.startDate);
      const endDate = new Date(batch.endDate);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);
      
      let newStatus = null;
      let action = null;
      
      // Draft → Active (if today >= start date and today <= end date)
      if (batch.status === 'draft' && today >= startDate && today <= endDate) {
        newStatus = 'active';
        action = 'activate';
      }
      
      // Active → Closed (if today > end date)
      if (batch.status === 'active' && today > endDate) {
        newStatus = 'closed';
        action = 'close';
      }
      
      // Draft → Closed (if today > end date and it was never activated)
      // Need to go through 'active' first, then 'closed'
      if (batch.status === 'draft' && today > endDate) {
        newStatus = 'closed';
        action = 'force-close'; // Use force-close to bypass normal transition rules
      }
      
      if (newStatus) {
        batchesToUpdate.push({
          batchId: batch.batchId,
          batchName: batch.batchName,
          currentStatus: batch.status,
          newStatus: newStatus,
          action: action,
          reason: `Auto-update: ${batch.status} → ${newStatus} based on date range`
        });
      }
    }

    if (batchesToUpdate.length > 0) {
      console.log(`🔄 Auto-updating ${batchesToUpdate.length} survey batch statuses...`, batchesToUpdate);
      
      // Update each batch
      for (const update of batchesToUpdate) {
        try {
          // Use the appropriate action for the status transition
          await surveyBatchesService.updateBatchStatus(update.batchId, update.newStatus, update.action, update.reason);
          console.log(`✅ Updated ${update.batchName} from ${update.currentStatus} to ${update.newStatus}`);
        } catch (error) {
          console.error(`❌ Failed to update ${update.batchName}:`, error);
        }
      }
      
      showInfoToast('Status Updates', `${batchesToUpdate.length} batch${batchesToUpdate.length > 1 ? 'es' : ''} automatically updated based on dates`);
      
      // Reload data to reflect changes
      await loadBatchData();
      await loadBatchStats();
      refreshActiveSurvey();
    }
  };

  // Load data on component mount and when dependencies change
  // Add ref to prevent duplicate calls in React StrictMode
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
        await memoizedLoadBatchData();
        await loadBatchStats();
        isInitialMount.current = false;
      } else {
        // Only reload data on subsequent changes
        await memoizedLoadBatchData();
      }
    }, 300); // Longer delay to avoid rapid requests

    return () => clearTimeout(timeoutId);
  }, [memoizedLoadBatchData, loadBatchStats]);

  // Realtime: refresh when batches or responses change
  useRealtime('survey:batchUpdated', async () => {
    await loadBatchData({ silent: true });
    await loadBatchStats({ silent: true });
    refreshActiveSurvey();
  });
  useRealtime('survey:responsesUpdated', async () => {
    await loadBatchData({ silent: true });
    await loadBatchStats({ silent: true });
  });

  // Track if auto-update has been run to prevent infinite loops
  const autoUpdateRunRef = React.useRef(false);
  
  // Separate effect to handle auto-updates after batches are loaded
  useEffect(() => {
    if (batches.length > 0 && isInitialMount.current === false && !autoUpdateRunRef.current) {
      // Only run auto-update once after initial load is complete
      autoUpdateRunRef.current = true;
      autoUpdateBatchStatuses(batches);
    }
  }, [batches]);

  // NOTE: Removed the useEffect that recalculates stats when batches data changes
  // This was causing the tab counts to be based on the currently filtered batches,
  // instead of the global counts from the API. The global batchStats should only 
  // be updated by loadBatchStats() which fetches the correct global counts.

  // Reset current page if it's out of bounds
  useEffect(() => {
    if (totalBatches > 0) {
      const maxPage = Math.ceil(totalBatches / itemsPerPage);
      if (currentPage > maxPage) {
        setCurrentPage(1);
      }
    }
  }, [totalBatches, itemsPerPage, currentPage]);

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
    console.log('Filters applied:', appliedValues);
  };

  const handleFilterClear = (clearedValues) => {
    setFilterValues(clearedValues);
    console.log('Filters cleared');
  };

  const handleSelectItem = (id) => {
    console.log('🔍 handleSelectItem called with id:', id, 'current selectedItems:', selectedItems);
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const allBatchIds = batches.map(item => item.batchId).filter(Boolean); // Filter out any undefined values
    console.log('🔍 handleSelectAll - allBatchIds:', allBatchIds, 'current selectedItems:', selectedItems);
    setSelectedItems(selectedItems.length === allBatchIds.length ? [] : allBatchIds);
  };

  // Handle search query changes
  const handleSearchChange = (newQuery) => {
    setSearchQuery(newQuery);
    setCurrentPage(1); // Reset to first page when searching
  };

  // Get batch display fields for DataTable
  const getBatchDisplayFields = () => ({
    title: (item) => {
      return (
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex-shrink-0">
            <ClipboardList className="w-4 h-4" />
          </span>
          <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 min-w-0">
              <span className="font-medium text-gray-900 text-sm sm:text-base truncate">{item.batchName}</span>
              <span className="inline-flex items-center px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 flex-shrink-0">
                {item.batchId}
              </span>
            </div>
          </div>
        </div>
      );
    },
    subtitle: (item) => {
      // Use real statistics from database (calculated dynamically)
      const totalResponses = item.statisticsTotalResponses || 0;
      const validatedResponses = item.statisticsValidatedResponses || 0;
      const pendingResponses = item.statisticsPendingResponses || 0;
      const rejectedResponses = item.statisticsRejectedResponses || 0;
      const totalYouths = item.statisticsTotalYouths || 0;  // Real count from Voters_List
      
      // Calculate days remaining if not provided by backend
      let daysRemaining = item.daysRemaining;
      let isOverdue = item.isOverdue;
      
      if (item.status === 'active' && (daysRemaining === null || daysRemaining === undefined)) {
        try {
          const today = new Date();
          today.setHours(0, 0, 0, 0); // Reset time to start of day
          
          const endDate = new Date(item.endDate);
          endDate.setHours(0, 0, 0, 0); // Reset time to start of day
          
          const timeDiff = endDate.getTime() - today.getTime();
          daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
          isOverdue = daysRemaining < 0;
          
          console.log('📅 Days calculation:', {
            today: today.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            timeDiff,
            daysRemaining,
            isOverdue
          });
        } catch (error) {
          console.error('Error calculating days remaining:', error);
          daysRemaining = null;
          isOverdue = false;
        }
      }
      
      // Debug: Log the item data to see what we're receiving (without responseRate)
      console.log('🔍 Batch item data:', {
        batchId: item.batchId,
        status: item.status,
        endDate: item.endDate,
        daysRemaining: item.daysRemaining,
        calculatedDaysRemaining: daysRemaining,
        isOverdue: item.isOverdue,
        calculatedIsOverdue: isOverdue,
        totalResponses,
        validatedResponses,
        pendingResponses,
        rejectedResponses,
        totalYouths
      });
      
      // Debug: Log the raw item object to see all available fields
      console.log('🔍 Raw item object:', item);
      
      // Debug: Check if statistics fields exist
      console.log('🔍 Statistics field check:', {
        hasTotalResponses: 'statisticsTotalResponses' in item,
        hasValidatedResponses: 'statisticsValidatedResponses' in item,
        hasPendingResponses: 'statisticsPendingResponses' in item,
        hasRejectedResponses: 'statisticsRejectedResponses' in item,
        hasTotalYouths: 'statisticsTotalYouths' in item,
        totalResponsesValue: item.statisticsTotalResponses,
        validatedResponsesValue: item.statisticsValidatedResponses,
        pendingResponsesValue: item.statisticsPendingResponses,
        rejectedResponsesValue: item.statisticsRejectedResponses,
        totalYouthsValue: item.statisticsTotalYouths
      });
      
      return (
        <div className="space-y-1.5 sm:space-y-2">
          {/* Description - More visible on mobile */}
          {item.description && (
            <p className="text-xs sm:text-sm text-gray-600 line-clamp-1 sm:line-clamp-2">
              {item.description}
            </p>
          )}
          
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
          
          {/* Statistics - Mobile-friendly layout (Rate and Target removed) */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-1 sm:gap-2">
            
            {/* Total Responses */}
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 w-fit">
              <Users className="w-3 h-3 mr-1 flex-shrink-0" />
              <span className="truncate">{totalResponses} Responses</span>
            </span>
            
            {/* Validated Responses - Always show */}
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 w-fit">
              <CheckCircle className="w-3 h-3 mr-1 flex-shrink-0" />
              <span className="truncate">{validatedResponses} Validated</span>
            </span>
            
            {/* Pending Responses - Always show */}
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200 w-fit">
                <Clock className="w-3 h-3 mr-1 flex-shrink-0" />
                <span className="truncate">{pendingResponses} Pending</span>
              </span>
            
            {/* Rejected Responses - Always show */}
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200 w-fit">
              <AlertCircle className="w-3 h-3 mr-1 flex-shrink-0" />
              <span className="truncate">{rejectedResponses} Rejected</span>
              </span>
            
            {/* Days Remaining - Only for active batches */}
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
            
            {/* Overdue Indicator - Only for overdue active batches */}
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
      return s === 'inactive' ? 'closed' : s;
    },
    date: 'createdAt',
    // Remove footer badge to avoid duplicate "Rate" display. The inline chips show rate already.
    badge: null
  });

  // Export helper functions
  const buildBatchCsvRows = (batches = []) => {
    const rows = [];
    rows.push(['Batch ID', 'Batch Name', 'Description', 'Start Date', 'End Date', 'Status', 'Total Responses', 'Validated', 'Pending', 'Rejected', 'Response Rate', 'Created By']);
    (batches || []).forEach((b) => {
      // Use real statistics from database (calculated dynamically)
      const totalResponses = b.statisticsTotalResponses || 0;
      const validatedResponses = b.statisticsValidatedResponses || 0;
      const pendingResponses = b.statisticsPendingResponses || 0;
      const rejectedResponses = b.statisticsRejectedResponses || 0;
      const totalYouths = b.statisticsTotalYouths || 0;  // Real count from Voters_List
      
      const responseRate = totalYouths > 0 
        ? Math.round((validatedResponses / totalYouths) * 100)
        : 0;
      rows.push([
        b.batchId || '',
        b.batchName || '',
        b.description || '',
        b.startDate ? new Date(b.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '',
        b.endDate ? new Date(b.endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '',
        (b.status || '').toString(),
        totalResponses,
        validatedResponses,
        pendingResponses,
        rejectedResponses,
        `${responseRate}%`,
        b.createdBy || ''
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
  const buildBatchExcelXml = (batches = []) => {
    const headerRow = `
      <Row>
        <Cell><Data ss:Type="String">Batch ID</Data></Cell>
        <Cell><Data ss:Type="String">Batch Name</Data></Cell>
        <Cell><Data ss:Type="String">Description</Data></Cell>
        <Cell><Data ss:Type="String">Start Date</Data></Cell>
        <Cell><Data ss:Type="String">End Date</Data></Cell>
        <Cell><Data ss:Type="String">Status</Data></Cell>
        <Cell><Data ss:Type="String">Total Responses</Data></Cell>
        <Cell><Data ss:Type="String">Validated</Data></Cell>
        <Cell><Data ss:Type="String">Pending</Data></Cell>
        <Cell><Data ss:Type="String">Rejected</Data></Cell>
        <Cell><Data ss:Type="String">Response Rate</Data></Cell>
        <Cell><Data ss:Type="String">Created By</Data></Cell>
      </Row>`;

    const bodyRows = (batches || []).map((b) => {
      const totalResponses = b.statisticsTotalResponses || 0;
      const validatedResponses = b.statisticsValidatedResponses || 0;
      const pendingResponses = b.statisticsPendingResponses || 0;
      const rejectedResponses = b.statisticsRejectedResponses || 0;
      const totalYouths = b.statisticsTotalYouths || 0;
      const responseRate = totalYouths > 0 ? Math.round((validatedResponses / totalYouths) * 100) : 0;
      return `
        <Row>
          <Cell><Data ss:Type="String">${(b.batchId || '').toString()}</Data></Cell>
          <Cell><Data ss:Type="String">${(b.batchName || '').toString()}</Data></Cell>
          <Cell><Data ss:Type="String">${(b.description || '').toString()}</Data></Cell>
          <Cell><Data ss:Type="String">${b.startDate ? new Date(b.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : ''}</Data></Cell>
          <Cell><Data ss:Type="String">${b.endDate ? new Date(b.endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : ''}</Data></Cell>
          <Cell><Data ss:Type="String">${((b.status || '').toString())}</Data></Cell>
          <Cell><Data ss:Type="Number">${totalResponses}</Data></Cell>
          <Cell><Data ss:Type="Number">${validatedResponses}</Data></Cell>
          <Cell><Data ss:Type="Number">${pendingResponses}</Data></Cell>
          <Cell><Data ss:Type="Number">${rejectedResponses}</Data></Cell>
          <Cell><Data ss:Type="String">${responseRate}%</Data></Cell>
          <Cell><Data ss:Type="String">${(b.createdBy || '').toString()}</Data></Cell>
        </Row>`;
    }).join('');

    return `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
<Worksheet ss:Name="Survey Batches">
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
  const openPrintPdf = (title, batches = []) => {
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
          <th>Batch ID</th>
          <th>Batch Name</th>
          <th>Status</th>
          <th>Start Date</th>
          <th>End Date</th>
          <th>Total</th>
          <th>Validated</th>
          <th>Pending</th>
          <th>Rejected</th>
          <th>Response Rate</th>
        </tr>
      </thead>`;
    const rows = (batches || []).map((b) => {
      const totalResponses = b.statisticsTotalResponses || 0;
      const validatedResponses = b.statisticsValidatedResponses || 0;
      const pendingResponses = b.statisticsPendingResponses || 0;
      const rejectedResponses = b.statisticsRejectedResponses || 0;
      const totalYouths = b.statisticsTotalYouths || 0;
      const responseRate = totalYouths > 0 ? Math.round((validatedResponses / totalYouths) * 100) : 0;
      return `
        <tr>
          <td>${b.batchId || ''}</td>
          <td>${b.batchName || ''}</td>
          <td>${b.status || ''}</td>
          <td>${b.startDate ? new Date(b.startDate).toLocaleDateString() : ''}</td>
          <td>${b.endDate ? new Date(b.endDate).toLocaleDateString() : ''}</td>
          <td>${totalResponses}</td>
          <td>${validatedResponses}</td>
          <td>${pendingResponses}</td>
          <td>${rejectedResponses}</td>
          <td>${responseRate}%</td>
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
        const filteredBatches = statusFilter === 'all' ? batches : batches.filter(b => b.status === statusFilter);
        
        // Log export activity to backend
        const logFormat = format === 'excel' ? 'xlsx' : format;
        await surveyBatchesService.logExport({
          format: format === 'excel' ? 'excel' : format,
          logFormat: logFormat,
          count: filteredBatches.length,
          status: statusFilter !== 'all' ? statusFilter : undefined
        });

        // Perform actual export
        if (format === 'csv') {
          const rows = buildBatchCsvRows(filteredBatches);
          downloadCsv('survey-batches.csv', rows);
        } else if (format === 'excel' || format === 'xlsx') {
          const xml = buildBatchExcelXml(filteredBatches);
          downloadExcel('survey-batches.xls', xml);
        } else if (format === 'pdf') {
          openPrintPdf('Survey Batches', filteredBatches);
        }
        return { success: true };
      } catch (error) {
        throw new Error(error.message || 'Failed to export batches data');
      }
    },
    onSuccess: () => showSuccessToast('Export completed', 'Batches exported successfully'),
    onError: (error) => showErrorToast('Export failed', error.message)
  });


  const bulkExportHook = useExport({
    exportFunction: async (format, style = null) => {
      try {
        const selectedBatchesData = batches.filter(batch => selectedItems.includes(batch.batchId));
        if (selectedBatchesData.length === 0) {
          throw new Error('No batches selected for export');
        }

        // Log bulk export activity to backend
        const logFormat = format === 'excel' ? 'xlsx' : format;
        await surveyBatchesService.logExport({
          format: format === 'excel' ? 'excel' : format,
          logFormat: logFormat,
          selectedIds: selectedItems,
          count: selectedBatchesData.length
        });

        // Perform actual export
        if (format === 'csv') {
          const rows = buildBatchCsvRows(selectedBatchesData);
          downloadCsv('survey-batches-selected.csv', rows);
        } else if (format === 'excel' || format === 'xlsx') {
          const xml = buildBatchExcelXml(selectedBatchesData);
          downloadExcel('survey-batches-selected.xls', xml);
        } else if (format === 'pdf') {
          openPrintPdf('Survey Batches (Selected)', selectedBatchesData);
        }
        return { success: true };
      } catch (error) {
        throw new Error(error.message || 'Failed to export selected batches');
      }
    },
    onSuccess: () => showSuccessToast('Bulk export completed', 'Selected batches exported successfully'),
    onError: (error) => showErrorToast('Bulk export failed', error.message)
  });

  return (
    <div className="space-y-5">
      {/* Header Section */}
      <HeaderMainContent
        title="Survey Batches Management"
        description="Create, manage, and track KK surveys and data collection batches"
      />

      {/* Active Survey Banner */}
      <ActiveSurveyBanner
        activeSurvey={activeSurvey}
        hasActiveSurvey={hasActiveSurvey}
        isLoading={isLoadingActiveSurvey}
        onNavigateToActive={() => setActiveTab('active')}
        onViewSurvey={(survey) => {
          navigate(`/staff/survey/batches/batch-report?batchId=${survey.batchId}`);
        }}
        variant="report"
      />

      {/* Main Content */}
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
                label="All Batches" 
                shortLabel="All"
                count={batchStats.total} 
                color="blue"
              />
              <Tab 
                id="active" 
                label="Active" 
                count={batchStats.active} 
                color="green"
              />
              <Tab 
                id="closed" 
                label="Closed" 
                count={batchStats.closed} 
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
                        placeholder="Search batches..." 
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
                  { value: 'batch_name', label: 'Batch Name' },
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
                    description: 'Show batches created after this date'
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
              itemName="batch"
              itemNamePlural="batches"
              exportConfig={{
                formats: ['csv', 'xlsx', 'pdf'],
                onExport: (format) => bulkExportHook.handleExport(format === 'xlsx' ? 'excel' : format),
                isExporting: bulkExportHook.isExporting
              }}
              primaryColor="blue"
            />

            {/* Content Area */}
            {(tabLoading || isLoading) ? (
              <LoadingSpinner 
                variant="spinner"
                message="Loading survey batches..." 
                size="md"
                color="blue"
                height="h-64"
              />
            ) : (
              <>
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                    {(batches || []).length === 0 ? (
                      <div className="col-span-full">
                        <div className="flex flex-col items-center justify-center text-center border border-dashed border-gray-300 rounded-2xl p-10 bg-gray-50/60">
                          <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-3">
                            <ClipboardList className="w-7 h-7" />
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">No survey batches</h3>
                          <p className="text-gray-600">Try adjusting your filters to see more results.</p>
                        </div>
                      </div>
                    ) : (
                      batches.map((item) => {
                        const totalResponses = item.statisticsTotalResponses || 0;
                        const validatedResponses = item.statisticsValidatedResponses || 0;
                        const pendingResponses = item.statisticsPendingResponses || 0;
                        const rejectedResponses = item.statisticsRejectedResponses || 0;
                        const status = (item.status || '').toString().toLowerCase() === 'inactive' ? 'closed' : (item.status || '').toString();
                        // Days remaining for active
                        let daysRemaining = null;
                        if (status === 'active' && item.endDate) {
                          try {
                            const today = new Date(); today.setHours(0,0,0,0);
                            const end = new Date(item.endDate); end.setHours(0,0,0,0);
                            daysRemaining = Math.ceil((end.getTime() - today.getTime()) / (1000*3600*24));
                          } catch {}
                        }
                        return (
                          <div key={item.batchId} className="group relative h-full">
                            {/* Glow */}
                            <div className="absolute -inset-2 rounded-2xl bg-gradient-to-br from-blue-300/20 via-indigo-200/20 to-purple-300/20 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" aria-hidden="true" />
                            {/* Card */}
                              <div className="relative rounded-2xl overflow-hidden shadow-sm transition-all duration-200 group-hover:shadow-lg h-full flex flex-col cursor-pointer bg-white ring-1 ring-gray-200" onClick={() => navigate(`/staff/survey/batches/batch-report?batchId=${item.batchId}`)}>
                              {/* Image header */}
                              <div className="relative overflow-hidden flex-shrink-0 aspect-[16/9]">
                                <img src={getBatchFallbackImage(status, item.batchName)} alt={item.batchName} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" decoding="async" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                              </div>
                              {/* Content */}
                              <div className="flex flex-col flex-1 p-6">
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <h3 className="font-semibold text-gray-900 line-clamp-2 text-lg">{item.batchName}</h3>
                                      {status === 'active' && daysRemaining !== null && (
                                        <span className={`inline-flex items-center px-2 py-1 rounded-lg text-[11px] font-medium border whitespace-nowrap ${daysRemaining > 0 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                          {daysRemaining > 0 ? `${daysRemaining} days left` : daysRemaining === 0 ? 'Ends today' : `${Math.abs(daysRemaining)} days overdue`}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 ml-3">
                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusStyles(status)}`}>
                                      {status.charAt(0).toUpperCase() + status.slice(1)}
                                    </span>
                                    {!!item.pausedAt && (
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border bg-orange-100 text-orange-800 border-orange-200">
                                        Paused
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {/* Dates under title with calendar and label */}
                                <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                                  <Calendar className="w-4 h-4 text-blue-500" />
                                  <span className="text-gray-500">Date range:</span>
                                  <span>{formatDate(item.startDate)} - {formatDate(item.endDate)}</span>
                                </div>
                                {/* Description under date */}
                                {item.description && (
                                  <p className="text-sm text-gray-700 mb-3 line-clamp-2">{item.description}</p>
                                )}
                                {/* Metrics strip (same data, new layout) */}
                                <div className="mb-4 bg-gray-50 rounded-xl px-4 py-3 grid grid-cols-4 gap-2 text-center">
                                  <div className="flex flex-col items-center">
                                    <div className="text-base sm:text-lg font-semibold text-gray-900">{totalResponses}</div>
                                    <div className="text-[11px] sm:text-xs text-gray-500">Total</div>
                                  </div>
                                  <div className="flex flex-col items-center">
                                    <div className="text-base sm:text-lg font-semibold text-gray-900">{validatedResponses}</div>
                                    <div className="text-[11px] sm:text-xs text-gray-500">Validated</div>
                                  </div>
                                  <div className="flex flex-col items-center">
                                    <div className="text-base sm:text-lg font-semibold text-gray-900">{pendingResponses}</div>
                                    <div className="text-[11px] sm:text-xs text-gray-500">Pending</div>
                                  </div>
                                  <div className="flex flex-col items-center">
                                    <div className="text-base sm:text-lg font-semibold text-gray-900">{rejectedResponses}</div>
                                    <div className="text-[11px] sm:text-xs text-gray-500">Rejected</div>
                                  </div>
                                </div>
                                
                                {/* Days badge moved next to title */}
                                <div className="flex-1" />
                                {/* Footer */}
                                <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-auto text-xs text-gray-500">
                                  <span>Created: {formatDate(item.createdAt)}</span>
                                  <span>Updated: {formatDate(item.updatedAt)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                ) : (
                  <DataTable
                    data={batches}
                    selectedItems={selectedItems}
                    onSelectItem={handleSelectItem}
                    onSelectAll={handleSelectAll}
                    viewMode={viewMode}
                    keyField="batchId"
                    displayFields={getBatchDisplayFields()}
                    selectAllLabel="Select All Batches"
                    emptyMessage="No survey batches found"
                    styling={{
                      gridCols: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
                      cardHover: 'hover:border-blue-300 hover:shadow-xl hover:shadow-blue-100/50 hover:scale-[1.02]',
                      listHover: 'hover:bg-blue-50/30 hover:border-l-4 hover:border-l-blue-400',
                      theme: 'blue'
                    }}
                  />
                )}
              </>
            )}

            {/* Bottom Pagination - Always visible when data is loaded (single pager like StaffManagement) */}
            {!tabLoading && (
              <Pagination
                key={`pagination-${totalBatches}-${itemsPerPage}`}
                currentPage={currentPage}
                totalItems={Math.max(totalBatches || 0, batches?.length || 0)}
                itemsPerPage={itemsPerPage}
                onPageChange={pagination.handlePageChange}
                onItemsPerPageChange={pagination.handleItemsPerPageChange}
                itemName="batch"
                itemNamePlural="batches"
                showItemsPerPage={true}
                showInfo={true}
                size="md"
                variant="default"
                itemsPerPageOptions={[5, 10, 20, 50]}
              />
            )}
      </div>

      {/* Batch Details View Modal removed - navigating on card click */}
      {/* Edit and Extend modals removed - staff are view-only */}

      {/* Universal Toast Container */}
      <ToastContainer position="top-right" maxToasts={5} />
      
      {/* Universal Confirmation Modal */}
      <ConfirmationModal {...confirmation.modalProps} />
    </div>
  );
};

export default SurveyBatch;
