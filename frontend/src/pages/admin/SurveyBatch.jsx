import React, { useState, useEffect } from 'react';
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
  AlertTriangle,
  Target,
  TrendingUp,
  Activity,
  Zap,
  BookOpen,
  Heart,
  ClipboardList
} from 'lucide-react';
import { HeaderMainContent, TabContainer, Tab, useTabState, ActionMenu, SearchBar, SortModal, FilterModal, BulkModal, Pagination, useSortModal, useBulkModal, usePagination, Avatar, Status, ExportButton, useExport, LoadingSpinner, BulkActionsBar, CollapsibleForm, DataTable, ActiveSurveyBanner } from '../../components/portal_main_content';
import { ToastContainer, showSuccessToast, showErrorToast, showInfoToast, ConfirmationModal, useConfirmation } from '../../components/universal';
import surveyBatchesService from '../../services/surveyBatchesService';
import { useActiveSurvey } from '../../hooks/useActiveSurvey';

const SurveyBatch = () => {
  const navigate = useNavigate();
  
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
  const [isLoading, setIsLoading] = useState(false);
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
  
  // Form state for creating new batches
  const [formData, setFormData] = useState({
    batchName: '',
    description: '',
    startDate: '',
    endDate: '',
    targetAgeMin: 15,
    targetAgeMax: 30
  });

  // Separate form state for editing existing batches
  const [editFormData, setEditFormData] = useState({
    batchName: '',
    description: '',
    startDate: '',
    endDate: '',
    targetAgeMin: 15,
    targetAgeMax: 30
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
  
  // Collapse state for Add Batch form
  const [formCollapsed, setFormCollapsed] = useState(true);
  
  // Form saving state
  const [isSaving, setIsSaving] = useState(false);

  // Bulk operations state
  const [bulkAction, setBulkAction] = useState('');
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // Batch details modal state
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [isEditingSaving, setIsEditingSaving] = useState(false);
  const [extensionData, setExtensionData] = useState({ newEndDate: '' });

  // Confirmation modal hook
  const confirmation = useConfirmation();

  // Active survey hook
  const { activeSurvey, hasActiveSurvey, isLoading: isLoadingActiveSurvey, error: activeSurveyError, refreshActiveSurvey } = useActiveSurvey();

  // Modal state management using custom hooks
  const sortModal = useSortModal(sortBy, sortOrder);
  const bulkModal = useBulkModal();
  
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

  // Load survey batch data
  const loadBatchData = async (customStatus = null, customPage = null) => {
    setIsLoading(true);
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
      setIsLoading(false);
    }
  };

  // Load survey batch statistics
  const loadBatchStats = async () => {
    try {
      console.log('🔍 Loading batch statistics...');
      const response = await surveyBatchesService.getBatchStats();
      console.log('🔍 Batch stats response:', response);
      
      if (response.success) {
        // Map backend field names to frontend format
        const backendData = response.data.data || response.data;
        console.log('🔍 Backend data:', backendData);
        
        const mappedStats = {
          total: parseInt(backendData.total_batches) || 0,
          active: parseInt(backendData.active_batches) || 0,
          draft: parseInt(backendData.draft_batches) || 0,
          closed: parseInt(backendData.closed_batches) || 0
        };
        console.log('🔍 Mapped stats:', mappedStats);
        setBatchStats(mappedStats);
      } else {
        console.error('Failed to load batch stats:', response.message);
        // Don't use fallback calculation as it causes incorrect tab counts
        // The stats should only come from the backend API
      }
    } catch (error) {
      console.error('Error loading batch stats:', error);
      // Don't use fallback calculation as it causes incorrect tab counts
      // The stats should only come from the backend API
    }
  };

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

  // Get action menu items for a batch
  const getActionMenuItems = (item) => {
    const items = [
      {
        id: 'view',
        label: 'View Details',
        icon: <Eye className="w-4 h-4" />,
        action: 'view'
      },
      {
        id: 'report',
        label: 'View Batch Report',
        icon: <BarChart3 className="w-4 h-4" />,
        action: 'report'
      },
      {
        id: 'edit',
        label: 'Edit Batch',
        icon: <Edit className="w-4 h-4" />,
        action: 'edit'
      }
    ];

    // Status-specific actions
    switch (item.status) {
      case 'draft':
        items.push({
          id: 'activate',
          label: 'Activate Batch',
          icon: <Play className="w-4 h-4" />,
          action: 'activate'
        });
        break;
        
      case 'active':
        items.push({
          id: 'close',
          label: 'Mark as Closed',
          icon: <Archive className="w-4 h-4" />,
          action: 'close'
        });
        break;
      case 'closed':
        items.push({
          id: 'extend',
          label: 'Extend Batch',
          icon: <Clock className="w-4 h-4" />,
          action: 'extend'
        });
        break;
    }

    return items;
  };

  const handleActionClick = async (action, item) => {
    setSelectedBatch(item);
    
    switch (action) {
      case 'view':
        setShowViewModal(true);
        break;
      case 'report':
        // Navigate to batch report page (following SKTerms pattern)
        navigate(`/admin/survey/batches/batch-report?batchId=${item.batchId}`);
        break;
      case 'edit':
        setEditFormData({
          batchName: item.batchName || '',
          description: item.description || '',
          startDate: formatDateForInput(item.startDate),
          endDate: formatDateForInput(item.endDate),
          targetAgeMin: item.targetAgeMin || 15,
          targetAgeMax: item.targetAgeMax || 30
        });
        setShowEditModal(true);
        break;
      case 'extend':
        {
          if ((item.status || '').toString().toLowerCase() !== 'closed') {
            showErrorToast('Invalid action', 'Only closed batches can be extended');
            break;
          }
          setShowExtendModal(true);
        }
        break;
      case 'activate':
        {
          const today = new Date();
          today.setHours(0,0,0,0);
          const start = new Date(item.startDate);
          start.setHours(0,0,0,0);

          // If start date is in the future, treat Activate as Force Activate with reason
          const shouldForce = start > today;
          let confirmed = false;
          if (shouldForce) {
            confirmed = await confirmation.showConfirmation({
              title: 'Force Activate Confirmation',
              message: `This batch has a future start date (${new Date(item.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}).\n\nActivating now will set the start date to today and make the survey immediately active. Do you want to proceed?`,
              confirmText: 'Force Activate',
              cancelText: 'Cancel',
              variant: 'warning'
            });
          } else {
            confirmed = await confirmation.confirmActivate(item.batchName);
          }
          if (!confirmed) break;
          let reason = '';

            confirmation.setLoading(true);
            try {
            let response;
            if (shouldForce) {
              response = await surveyBatchesService.updateBatchStatus(item.batchId, 'active', 'force-activate');
            } else {
              response = await surveyBatchesService.activateBatch(item.batchId);
            }

            if (response.success) {
              showSuccessToast('Batch activated', `${item.batchName} has been activated successfully${shouldForce ? ' (start date adjusted)' : ''}`);
                await loadBatchData(); // Reload data
                await loadBatchStats(); // Reload stats
                refreshActiveSurvey(); // Refresh active survey banner
              } else {
              showErrorToast('Activation failed', response.message || response.error || 'Failed to activate batch');
              }
            } catch (error) {
              showErrorToast('Activation failed', 'Failed to activate survey batch');
            } finally {
              confirmation.hideConfirmation();
          }
        }
        break;
      case 'close':
        {
          const confirmed = await confirmation.showConfirmation({
            title: 'Close Survey Batch',
            message: `Mark ${item.batchName} as closed? This will set the end date to today and stop further submissions.`,
            confirmText: 'Close Now',
            cancelText: 'Cancel',
            variant: 'warning'
          });
          if (confirmed) {
            confirmation.setLoading(true);
            try {
              const closeResponse = await surveyBatchesService.updateBatchStatus(item.batchId, 'closed');
              if (closeResponse.success) {
                showSuccessToast('Batch closed', `${item.batchName} has been closed successfully`);
                await loadBatchData(); // Reload data
                await loadBatchStats(); // Reload stats
                refreshActiveSurvey(); // Refresh active survey banner
              } else {
                showErrorToast('Close failed', closeResponse.message || closeResponse.error || 'Failed to close batch');
              }
            } catch (error) {
              showErrorToast('Close failed', 'Failed to close survey batch');
            } finally {
              confirmation.hideConfirmation();
            }
          }
        }
        break;
      case 'pause':
        {
          const confirmed = await confirmation.showConfirmation({
            title: 'Pause Confirmation',
            message: `Pausing ${item.batchName} will temporarily stop survey submissions. You can resume anytime. Proceed?`,
            confirmText: 'Pause',
            cancelText: 'Cancel',
            variant: 'warning'
          });
          if (confirmed) {
            confirmation.setLoading(true);
            try {
              const resp = await surveyBatchesService.pauseBatch(item.batchId, 'maintenance');
              if (resp.success) {
                showSuccessToast('Batch paused', `${item.batchName} has been paused`);
                await loadBatchData();
                await loadBatchStats();
                refreshActiveSurvey();
              } else {
                showErrorToast('Pause failed', resp.message || resp.error || 'Failed to pause batch');
              }
            } catch (error) {
              showErrorToast('Pause failed', 'Failed to pause survey batch');
            } finally {
              confirmation.hideConfirmation();
            }
          }
        }
        break;
      case 'resume':
        {
          const confirmed = await confirmation.showConfirmation({
            title: 'Resume Confirmation',
            message: `Resume ${item.batchName}? Survey submissions will be allowed again.`,
            confirmText: 'Resume',
            cancelText: 'Cancel',
            variant: 'success'
          });
          if (confirmed) {
            confirmation.setLoading(true);
            try {
              const resp = await surveyBatchesService.resumeBatch(item.batchId);
              if (resp.success) {
                showSuccessToast('Batch resumed', `${item.batchName} has been resumed`);
                await loadBatchData();
                await loadBatchStats();
                refreshActiveSurvey();
              } else {
                showErrorToast('Resume failed', resp.message || resp.error || 'Failed to resume batch');
              }
            } catch (error) {
              showErrorToast('Resume failed', 'Failed to resume survey batch');
            } finally {
              confirmation.hideConfirmation();
            }
          }
        }
        break;
    }
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

  // Form handlers
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.batchName || !formData.startDate || !formData.endDate) {
      showErrorToast('Validation failed', 'Please fill in all required fields');
      return;
    }
    
    setIsSaving(true);
    try {
      // Call API to create batch
      const response = await surveyBatchesService.createSurveyBatch(formData);
      console.log('🔍 Create Batch Response:', response);
      console.log('🔍 Response success:', response.success);
      console.log('🔍 Response message:', response.message);
      console.log('🔍 Response error:', response.error);
      
      if (response.success) {
        showSuccessToast('Batch created', `${formData.batchName} has been created successfully`);
        
        // Reset form
        setFormData({
          batchName: '',
          description: '',
          startDate: '',
          endDate: '',
          targetAgeMin: 15,
          targetAgeMax: 30
        });
        setFormCollapsed(true);
        
        // Reload data
        await loadBatchData();
        await loadBatchStats();
        
        // Refresh active survey if the new batch is active
        if (response.data?.status === 'active') {
          refreshActiveSurvey();
        }
      } else {
        // Show detailed error message from API response
        const errorMessage = response.message || response.error || response.details || 'Unknown error occurred';
        showErrorToast('Creation Failed', errorMessage);
        console.error('🔍 API Error Response:', response);
      }
    } catch (error) {
      console.error('🔍 Error creating batch:', error);
      console.error('🔍 Error type:', typeof error);
      console.error('🔍 Error response:', error.response);
      console.error('🔍 Error message:', error.message);
      
      // Extract detailed error information
      let errorMessage = 'Failed to create survey batch';
      
      if (error.response) {
        // Server responded with error status
        const status = error.response.status;
        const data = error.response.data;
        
        errorMessage = `Server Error (${status})`;
        if (data?.message) {
          errorMessage = data.message;
        }
        
        console.error('🔍 Server Error Details:', {
          status,
          data,
          url: error.config?.url,
          method: error.config?.method
        });
      } else if (error.message && error.message.includes('Date conflicts')) {
        // Handle specific error messages from the service
        errorMessage = error.message;
      } else if (error.request) {
        // Request was made but no response received
        errorMessage = 'Network Error - No response from server';
        console.error('🔍 Network Error:', error.request);
      } else {
        // Something else happened
        errorMessage = error.message || 'Unknown error occurred';
        console.error('🔍 Other Error:', error);
      }
      
      showErrorToast('Creation Failed', errorMessage);
    } finally {
      setIsSaving(false);
    }
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
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 min-w-0">
              <span className="font-medium text-gray-900 text-sm sm:text-base truncate">{item.batchName}</span>
              <span className="inline-flex items-center px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 flex-shrink-0">
                {item.batchId}
              </span>
            </div>
              {viewMode === 'list' && item.status === 'active' && (
                <div className="hidden sm:flex items-center gap-2">
                  {!item.pausedAt ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleActionClick('pause', item); }}
                      className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-700 hover:bg-orange-200"
                    >
                      <Pause className="w-3 h-3 mr-1" /> Pause
                    </button>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleActionClick('resume', item); }}
                      className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200"
                    >
                      <Play className="w-3 h-3 mr-1" /> Resume
                    </button>
                  )}
                </div>
              )}
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
      
      const responseRate = totalYouths > 0 
        ? Math.round((validatedResponses / totalYouths) * 100)
        : 0;
      
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
      
      // Debug: Log the item data to see what we're receiving
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
        totalYouths,
        responseRate
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
          
          {/* Statistics - Mobile-friendly layout */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-1 sm:gap-2">
            {/* Response Rate - Most Important (Always First) */}
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200 w-fit">
              <TrendingUp className="w-3 h-3 mr-1 flex-shrink-0" />
              <span className="truncate">{responseRate}% Rate</span>
            </span>
            
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
            
            {/* Target Population */}
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200 w-fit">
              <Target className="w-3 h-3 mr-1 flex-shrink-0" />
              <span className="truncate">{totalYouths} Target</span>
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

          {/* Inline Maintenance Controls (Grid view only) */}
          {viewMode === 'grid' && (item.status || '').toString().toLowerCase() === 'active' && (
            <div className="flex items-center gap-2 pt-1 justify-end">
              {!item.pausedAt ? (
                <button
                  onClick={(e) => { e.stopPropagation(); handleActionClick('pause', item); }}
                  className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-700 hover:bg-orange-200"
                >
                  <Pause className="w-3 h-3 mr-1" /> Pause
                </button>
              ) : (
                <button
                  onClick={(e) => { e.stopPropagation(); handleActionClick('resume', item); }}
                  className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200"
                >
                  <Play className="w-3 h-3 mr-1" /> Resume
                </button>
              )}
            </div>
          )}
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
        showSuccessToast('Export logged', 'Your export was recorded successfully');

        const filteredBatches = statusFilter === 'all' ? batches : batches.filter(b => b.status === statusFilter);
        if (format === 'csv') {
          const rows = buildBatchCsvRows(filteredBatches);
          downloadCsv('survey-batches.csv', rows);
        } else if (format === 'excel') {
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

        if (format === 'csv') {
          const rows = buildBatchCsvRows(selectedBatchesData);
          downloadCsv('survey-batches-selected.csv', rows);
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
        onCreateSurvey={() => setFormCollapsed(false)}
        onViewSurvey={(survey) => {
          setSelectedBatch(survey);
          setShowViewModal(true);
        }}
        variant="report"
      />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column - Batches List */}
        <div className="xl:col-span-2">
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
                id="draft" 
                label="Draft" 
                count={batchStats.draft} 
                color="yellow"
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
              onBulkAction={() => bulkModal.showModal()}
              exportConfig={{
                formats: ['csv'],
                onExport: (format) => bulkExportHook.handleExport(format),
                isExporting: bulkExportHook.isExporting
              }}
              primaryColor="blue"
            />

            {/* Content Area */}
            {tabLoading ? (
              <LoadingSpinner 
                variant="spinner"
                message="Loading survey batches..." 
                size="md"
                color="blue"
                height="h-64"
              />
            ) : (
              <>
                <DataTable
                  data={batches}
                  selectedItems={selectedItems}
                  onSelectItem={handleSelectItem}
                  onSelectAll={handleSelectAll}
                  getActionMenuItems={getActionMenuItems}
                  onActionClick={handleActionClick}
                  viewMode={viewMode}
                  keyField="batchId"
                  displayFields={getBatchDisplayFields()}
                  selectAllLabel="Select All Batches"
                  emptyMessage="No survey batches found"
                  styling={{
                    gridCols: 'grid-cols-1 lg:grid-cols-2',
                    cardHover: 'hover:border-blue-300 hover:shadow-xl hover:shadow-blue-100/50 hover:scale-[1.02]',
                    listHover: 'hover:bg-blue-50/30 hover:border-l-4 hover:border-l-blue-400',
                    theme: 'blue'
                  }}
                />
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
        </div>

        {/* Right Column - Add New Batch Form */}
        <div className="xl:col-span-1">
          <CollapsibleForm
            title="Create New Survey Batch"
            description="Create a new KK survey batch for data collection"
            icon={<Plus className="w-5 h-5" />}
            defaultCollapsed={formCollapsed}
            onToggle={setFormCollapsed}
            iconBgColor="bg-blue-100"
            iconTextColor="text-blue-600"
            className="sticky top-4"
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Batch Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                  <BarChart3 className="w-4 h-4 mr-2 text-blue-600" />
                  Batch Information
                </h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Batch Name *</label>
                  <input
                    type="text"
                    name="batchName"
                    value={formData.batchName}
                    onChange={handleFormChange}
                    required
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    placeholder="e.g., KK Survey 2024 Q2"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Note: Only one KK survey can be active at a time
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    name="description"
                    value={formData.description ?? ''}
                    onChange={handleFormChange}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    placeholder="Brief description of survey objectives"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
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

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Min Age</label>
                    <input
                      type="number"
                      name="targetAgeMin"
                      value={formData.targetAgeMin}
                      onChange={handleFormChange}
                      min="10"
                      max="50"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Age</label>
                    <input
                      type="number"
                      name="targetAgeMax"
                      value={formData.targetAgeMax}
                      onChange={handleFormChange}
                      min="10"
                      max="50"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    />
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setFormData({
                    batchName: '',
                    description: '',
                    startDate: '',
                    endDate: '',
                    targetAgeMin: 15,
                    targetAgeMax: 30
                  })}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-200 transition-all duration-200"
                >
                  Clear Form
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-200 transition-all duration-200 disabled:opacity-50"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving ? 'Creating...' : 'Create Batch'}
                </button>
              </div>
            </form>
          </CollapsibleForm>
        </div>
      </div>

      {/* Batch Details View Modal */}
      {showViewModal && selectedBatch && createPortal(
        <div className="fixed inset-0 flex items-center justify-center z-[99999] p-4 backdrop-blur-[1px]" onClick={() => setShowViewModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-100 text-blue-600">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{selectedBatch.batchName}</h3>
                    <p className="text-sm text-gray-600">Survey Batch Details</p>
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
                  <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
                  Basic Information
                </h4>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Batch Name</label>
                      <p className="text-lg font-semibold text-gray-900">{selectedBatch.batchName}</p>
                  </div>
                  
                    <div className="bg-gray-50 rounded-lg p-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <p className="text-sm text-gray-900">{selectedBatch.description || 'No description provided'}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                      <p className="text-sm text-gray-900">
                      {new Date(selectedBatch.startDate).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })} - {new Date(selectedBatch.endDate).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                  
                    <div className="bg-gray-50 rounded-lg p-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <div className="mt-1">
                      <Status status={selectedBatch.status} />
                      </div>
                    </div>
                    </div>
                  </div>
                </div>
                
              {/* Response Statistics Section */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
                  Response Statistics
                </h4>
                
                {/* Primary Statistics - Key Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-3xl font-bold text-blue-800">{selectedBatch.statisticsTotalResponses || 0}</div>
                        <div className="text-sm font-medium text-blue-600">Total Responses</div>
                      </div>
                      <div className="w-12 h-12 bg-blue-200 rounded-full flex items-center justify-center">
                        <Users className="w-6 h-6 text-blue-700" />
                      </div>
                    </div>
                    </div>
                    
                  <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-3xl font-bold text-green-800">{selectedBatch.statisticsValidatedResponses || 0}</div>
                        <div className="text-sm font-medium text-green-600">Validated</div>
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
                          {selectedBatch.statisticsTotalYouths > 0 
                            ? Math.round((selectedBatch.statisticsValidatedResponses / selectedBatch.statisticsTotalYouths) * 100)
                            : 0}%
                        </div>
                        <div className="text-sm font-medium text-purple-600">Response Rate</div>
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
                    <div className="text-2xl font-bold text-orange-800">{selectedBatch.statisticsPendingResponses || 0}</div>
                      <div className="text-sm text-orange-600">Pending</div>
                    </div>
                    
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-red-800">{selectedBatch.statisticsRejectedResponses || 0}</div>
                    <div className="text-sm text-red-600">Rejected</div>
                  </div>
                  
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-gray-800">{selectedBatch.statisticsTotalYouths || 0}</div>
                    <div className="text-sm text-gray-600">Target Youth</div>
                  </div>
                  
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-indigo-800">
                        {selectedBatch.statisticsTotalYouths > 0 
                        ? Math.round(((selectedBatch.statisticsTotalResponses || 0) / selectedBatch.statisticsTotalYouths) * 100)
                          : 0}%
                      </div>
                    <div className="text-sm text-indigo-600">Participation</div>
                  </div>
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

      {/* Edit Batch Modal */}
      {showEditModal && selectedBatch && createPortal(
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
                    <h3 className="text-lg font-bold text-gray-900">Edit Survey Batch</h3>
                    <p className="text-sm text-gray-600">Update details for {selectedBatch.batchName}</p>
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
                <h4 className="font-semibold text-gray-900 mb-4">Current Batch Information</h4>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-blue-700">Batch Name</label>
                      <p className="mt-1 text-sm text-blue-900 font-medium">{selectedBatch.batchName}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-blue-700">Status</label>
                      <div className="mt-1">
                        <Status status={selectedBatch.status} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-blue-700">Current Date Range</label>
                      <p className="mt-1 text-sm text-blue-900">
                        {new Date(selectedBatch.startDate).toLocaleDateString()} - {new Date(selectedBatch.endDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Edit Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">Edit Batch Details</h4>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Batch Name *</label>
                    <input
                      type="text"
                      value={editFormData.batchName}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, batchName: e.target.value }))}
                      placeholder="Enter batch name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      value={editFormData.description ?? ''}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Brief description"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      rows="3"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
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

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Min Age</label>
                      <input
                        type="number"
                        value={editFormData.targetAgeMin}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, targetAgeMin: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Max Age</label>
                      <input
                        type="number"
                        value={editFormData.targetAgeMax}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, targetAgeMax: e.target.value }))}
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
                        <label className="block text-sm font-medium text-gray-700">New Batch Name</label>
                        <p className="mt-1 text-sm text-gray-900 font-medium">{editFormData.batchName || selectedBatch.batchName}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">New Date Range</label>
                        <p className="mt-1 text-sm text-gray-900">
                          {(editFormData.startDate ? new Date(editFormData.startDate) : new Date(selectedBatch.startDate)).toLocaleDateString()} - {(editFormData.endDate ? new Date(editFormData.endDate) : new Date(selectedBatch.endDate)).toLocaleDateString()}
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
                  if (!editFormData.batchName || !editFormData.startDate || !editFormData.endDate) {
                    showErrorToast('Validation failed', 'Batch name, start date, and end date are required');
                    return;
                  }
                  try {
                    setIsEditingSaving(true);
                    const payload = {
                      batch_name: editFormData.batchName,
                      description: editFormData.description ?? '',
                      start_date: editFormData.startDate,
                      end_date: editFormData.endDate,
                      target_age_min: editFormData.targetAgeMin,
                      target_age_max: editFormData.targetAgeMax
                    };
                    const resp = await surveyBatchesService.updateSurveyBatch(selectedBatch.batchId, payload);
                    if (resp.success) {
                      showSuccessToast('Batch updated', `${editFormData.batchName} has been updated successfully`);
                      setShowEditModal(false);
                      await loadBatchData();
                      await loadBatchStats();
                    } else {
                      const details = Array.isArray(resp.errors) && resp.errors.length
                        ? resp.errors.map(e => e.msg || e.message || e).join('; ')
                        : (resp.data?.message || resp.message || resp.error || 'Failed to update batch');
                      showErrorToast('Update failed', details);
                    }
                  } catch (error) {
                    console.error('Update error:', error);
                    const apiErrors = error?.response?.data?.errors;
                    const details = Array.isArray(apiErrors) && apiErrors.length
                      ? apiErrors.map(e => e.msg || e.message || e).join('; ')
                      : (error?.response?.data?.message || error?.message || 'An error occurred while updating the batch');
                    showErrorToast('Update failed', details);
                  } finally {
                    setIsEditingSaving(false);
                  }
                }}
                disabled={isEditingSaving}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isEditingSaving ? 'Updating...' : 'Update Batch'}
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
        description={`${selectedItems.length} batch${selectedItems.length > 1 ? 'es' : ''} selected`}
        actions={[
          { value: 'activate', label: 'Activate Batches' },
          { value: 'close', label: 'Close Batches' }
        ]}
        selectedAction={bulkAction}
        onActionChange={setBulkAction}
        onExecute={async () => {
          try {
            setIsBulkProcessing(true);
            
            // Simulate bulk operations
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            showSuccessToast('Bulk operation completed', `${bulkAction} operation completed successfully`);
            setSelectedItems([]);
            
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

      {/* Batch Extension Modal */}
      {showExtendModal && selectedBatch && createPortal(
        <div className="fixed inset-0 flex items-center justify-center z-[99999] p-4 backdrop-blur-[1px]" onClick={() => setShowExtendModal(false)}>
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Extend Survey Batch</h3>
              <p className="text-sm text-gray-600 mt-1">Extend the end date for {selectedBatch.batchName}</p>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Current Batch Information</h4>
                <div className="text-sm text-blue-700">
                  <p><strong>Batch:</strong> {selectedBatch.batchName}</p>
                  <p><strong>Current End Date:</strong> {new Date(selectedBatch.endDate).toLocaleDateString()}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">New End Date *</label>
                <input
                  type="date"
                  value={extensionData?.newEndDate || ''}
                  onChange={(e) => setExtensionData(prev => ({ ...(prev||{}), newEndDate: e.target.value }))}
                  min={formatDateForInput(selectedBatch.endDate)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">New end date must be after current end date and must not overlap an existing active batch today</p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => { setShowExtendModal(false); setExtensionData({ newEndDate: '' }); }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
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
                    const resp = await surveyBatchesService.updateSurveyBatch(selectedBatch.batchId, { end_date: extensionData.newEndDate });
                    if (resp.success) {
                      showSuccessToast('Batch extended', `${selectedBatch.batchName} has been extended successfully`);
                      setShowExtendModal(false);
                      setExtensionData({ newEndDate: '' });
                      await loadBatchData();
                      await loadBatchStats();
                      refreshActiveSurvey(); // Refresh the active survey banner
                    } else {
                      showErrorToast('Extension failed', resp.message || resp.error || 'Failed to extend batch');
                    }
                  } catch (error) {
                    console.error('Extension error:', error);
                    showErrorToast('Extension failed', error?.message || 'An error occurred while extending the batch');
                  }
                }}
                disabled={!extensionData?.newEndDate}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Extend Batch
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

export default SurveyBatch;
