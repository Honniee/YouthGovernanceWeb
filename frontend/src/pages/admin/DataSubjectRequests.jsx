import React, { useState, useEffect, useMemo } from 'react';
import { 
  User,
  Eye,
  CheckCircle,
  XCircle,
  Filter,
  Search,
  Calendar,
  Mail,
  BarChart3,
  Download,
  RefreshCw,
  ChevronDown,
  ArrowUpDown,
  UserCheck,
  UserX,
  Shield,
  Activity,
  FileText,
  Clock,
  AlertCircle,
  Grid,
  List,
  UserPlus,
  MessageSquare,
  Send
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
import dataSubjectRightsService from '../../services/dataSubjectRightsService.js';
import staffService from '../../services/staffService.js';
import { dataSubjectRequestDetailConfig } from '../../components/portal_main_content/tabbedModalConfigs.jsx';
import logger from '../../utils/logger.js';

const DataSubjectRequests = () => {
  // Confirmation modal hook
  const confirmation = useConfirmation();
  
  // Tab state
  const { activeTab: tabFilter, setActiveTab: setTabFilter } = useTabState('pending', async (tabId) => {
    setCurrentPage(1);
  });

  // UI state
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [viewMode, setViewMode] = useState('grid');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    in_progress: 0,
    completed: 0,
    rejected: 0,
    cancelled: 0
  });
  const [staffList, setStaffList] = useState([]);

  // Sort modal
  const sortModal = useSortModal('requestedAt', 'desc');
  
  // Reset to first page when sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [sortModal.sortBy, sortModal.sortOrder]);

  // Filter modal
  const filterModal = useFilterModal({});

  // Define filter configuration
  const modalFilters = useMemo(() => {
    return [
      {
        id: 'requestType',
        label: 'Request Type',
        type: 'select',
        placeholder: 'All types',
        options: [
          { value: 'access', label: 'Access' },
          { value: 'rectification', label: 'Rectification' },
          { value: 'erasure', label: 'Erasure' },
          { value: 'portability', label: 'Portability' },
          { value: 'object', label: 'Objection' },
          { value: 'consent_withdrawal', label: 'Consent Withdrawal' }
        ]
      },
      {
        id: 'status',
        label: 'Status',
        type: 'select',
        placeholder: 'All statuses',
        options: [
          { value: 'pending', label: 'Pending' },
          { value: 'in_progress', label: 'In Progress' },
          { value: 'completed', label: 'Completed' },
          { value: 'rejected', label: 'Rejected' },
          { value: 'cancelled', label: 'Cancelled' }
        ]
      },
      {
        id: 'startDate',
        label: 'Start Date',
        type: 'date',
        placeholder: 'From date'
      },
      {
        id: 'endDate',
        label: 'End Date',
        type: 'date',
        placeholder: 'To date'
      }
    ];
  }, []);
  
  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterModal.filterValues]);

  // Load staff list for assignment
  useEffect(() => {
    const loadStaff = async () => {
      try {
        const result = await staffService.getStaffList({ page: 1, limit: 100, status: 'active' });
        if (result.success && result.data?.data) {
          const staff = Array.isArray(result.data.data) 
            ? result.data.data 
            : (result.data.data.allRows || result.data.data.rows || []);
          setStaffList(staff);
        }
      } catch (error) {
        logger.error('Failed to load staff list', error);
      }
    };
    loadStaff();
  }, []);

  // Load requests
  const loadRequests = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const filters = {
        limit: 1000, // Get more requests for client-side filtering/pagination
        ...(tabFilter !== 'all' && { requestStatus: tabFilter }),
        ...(filterModal.filterValues?.requestType && { requestType: filterModal.filterValues.requestType }),
        ...(filterModal.filterValues?.status && { requestStatus: filterModal.filterValues.status }),
        ...(filterModal.filterValues?.startDate && { startDate: filterModal.filterValues.startDate }),
        ...(filterModal.filterValues?.endDate && { endDate: filterModal.filterValues.endDate })
      };

      const response = await dataSubjectRightsService.listRequests(filters);
      
      if (response.success) {
        // Backend returns { success: true, data: [...], count: ... }
        setRequests(response.data || []);
        // Update stats if available in response
        if (response.count !== undefined) {
          setStats(prev => ({ ...prev, total: response.count }));
        }
      } else {
        throw new Error(response.message || 'Failed to load requests');
      }

      // Load statistics
      try {
        const statsResponse = await dataSubjectRightsService.getStatistics();
        if (statsResponse.success && statsResponse.data) {
          // Backend returns { success: true, data: { total, byStatus: {...}, byType: {...}, overdue } }
          const statsData = statsResponse.data;
          setStats({
            total: statsData.total || 0,
            pending: statsData.byStatus?.pending || 0,
            in_progress: statsData.byStatus?.in_progress || 0,
            completed: statsData.byStatus?.completed || 0,
            rejected: statsData.byStatus?.rejected || 0,
            cancelled: statsData.byStatus?.cancelled || 0
          });
        }
      } catch (statsError) {
        logger.error('Failed to load data subject request statistics', statsError);
        // Don't fail the whole request if stats fail
      }
    } catch (err) {
      logger.error('Error loading data subject requests', err);
      setError(err.message);
      showErrorToast('Error', 'Failed to load data subject rights requests');
    } finally {
      setIsLoading(false);
    }
  };

  // Load requests when dependencies change (excluding pagination - handled client-side)
  useEffect(() => {
    loadRequests();
  }, [tabFilter, filterModal.filterValues]);
  
  // Reset to first page when search or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortModal.sortBy, sortModal.sortOrder]);

  // Filter and sort requests (memoized)
  const filteredRequests = useMemo(() => {
    let filtered = [...requests];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(request => 
        `${request.requester_name || ''} ${request.requester_email || ''}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (request.request_description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (request.request_id?.toString() || '').includes(searchQuery)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortModal.sortBy) {
        case 'requesterName':
          aValue = (a.requester_name || '').toLowerCase();
          bValue = (b.requester_name || '').toLowerCase();
          break;
        case 'requestType':
          aValue = (a.request_type || '').toLowerCase();
          bValue = (b.request_type || '').toLowerCase();
          break;
        case 'status':
          aValue = (a.request_status || '').toLowerCase();
          bValue = (b.request_status || '').toLowerCase();
          break;
        case 'dueDate':
          aValue = a.due_date ? new Date(a.due_date) : new Date(0);
          bValue = b.due_date ? new Date(b.due_date) : new Date(0);
          break;
        case 'requestedAt':
        default:
          aValue = a.requested_at ? new Date(a.requested_at) : new Date(0);
          bValue = b.requested_at ? new Date(b.requested_at) : new Date(0);
          break;
      }

      if (aValue < bValue) return sortModal.sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortModal.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [requests, searchQuery, sortModal.sortBy, sortModal.sortOrder]);

  // Pagination hook
  const pagination = usePagination({
    currentPage,
    totalItems: filteredRequests.length,
    itemsPerPage,
    onPageChange: setCurrentPage,
    onItemsPerPageChange: setItemsPerPage
  });

  // Get items to display (client-side pagination)
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredRequests.slice(start, end);
  }, [filteredRequests, currentPage, itemsPerPage]);

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
    const allSelected = paginatedItems.every(item => selectedItems.includes(item.request_id));
    
    if (allSelected) {
      setSelectedItems(prev => prev.filter(id => !paginatedItems.some(item => item.request_id === id)));
    } else {
      const newSelections = paginatedItems.filter(item => !selectedItems.includes(item.request_id)).map(item => item.request_id);
      setSelectedItems(prev => [...prev, ...newSelections]);
    }
  };

  // Handle card click to open request modal
  const handleCardClick = (request) => {
    setSelectedRequest(request);
    setShowRequestModal(true);
  };

  // Handle assign request
  const handleAssignRequest = async (requestId, userId) => {
    try {
      const response = await dataSubjectRightsService.assignRequest(requestId, userId);
      if (response.success) {
        showSuccessToast('Request assigned', 'Request has been assigned to staff member');
        // Reload request if modal is open
        if (selectedRequest && selectedRequest.request_id === requestId) {
          const updatedRequest = await dataSubjectRightsService.getRequest(requestId);
          if (updatedRequest.success) {
            setSelectedRequest(updatedRequest.data);
          }
        }
        await loadRequests();
      } else {
        throw new Error(response.message || 'Failed to assign request');
      }
    } catch (error) {
      logger.error('Failed to assign data subject request', error, { requestId, userId });
      showErrorToast('Error', 'Failed to assign request');
    }
  };

  // Handle process request
  const handleProcessRequest = async (request, action) => {
    // Close detail modal first
    setShowRequestModal(false);
    setSelectedRequest(null);
    
    // Small delay to ensure modal closes before showing confirmation
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Show confirmation dialog
    const actionLabels = {
      'access': 'Process Access Request',
      'rectification': 'Process Rectification Request',
      'erasure': 'Process Erasure Request',
      'portability': 'Process Portability Request',
      'objection': 'Process Objection Request',
      'consent_withdrawal': 'Process Consent Withdrawal Request'
    };

    const requestTypeLabel = getRequestTypeLabel(request.request_type || action);
    
    const confirmed = await confirmation.showConfirmation({
      title: actionLabels[action] || 'Process Request',
      message: `Are you sure you want to process this ${requestTypeLabel} request?`,
      confirmText: 'Process',
      cancelText: 'Cancel',
      variant: 'primary'
    });

    if (!confirmed) {
      // If cancelled, reopen the detail modal
      setSelectedRequest(request);
      setShowRequestModal(true);
      return;
    }

    try {
      confirmation.setLoading(true);
      let response;
      
      switch (action) {
        case 'access':
          response = await dataSubjectRightsService.processAccessRequest(request.request_id);
          break;
        case 'rectification':
          // For rectification, we need corrections - for now show error
          showErrorToast('Error', 'Rectification requests require corrections. Please use the request details to update data manually.');
          confirmation.hideConfirmation();
          return;
        case 'erasure':
          response = await dataSubjectRightsService.processErasureRequest(request.request_id);
          break;
        case 'portability':
          response = await dataSubjectRightsService.processPortabilityRequest(request.request_id);
          break;
        case 'objection':
          response = await dataSubjectRightsService.processObjectionRequest(request.request_id);
          break;
        case 'consent_withdrawal':
          response = await dataSubjectRightsService.processConsentWithdrawalRequest(request.request_id);
          break;
        default:
          throw new Error('Invalid action');
      }

      if (response.success) {
        showSuccessToast('Request processed', `Request has been processed successfully`);
        await loadRequests();
        confirmation.hideConfirmation();
      } else {
        throw new Error(response.message || 'Failed to process request');
      }
    } catch (error) {
      logger.error('Failed to process data subject request', error, { requestId: request.request_id, action });
      showErrorToast('Error', error.message || `Failed to process ${action} request`);
      confirmation.hideConfirmation();
      // Reopen detail modal on error so user can see the request
      setSelectedRequest(request);
      setShowRequestModal(true);
    }
  };

  // Handle status update
  const handleUpdateStatus = async (requestId, status, notes = null) => {
    try {
      const response = await dataSubjectRightsService.updateRequestStatus(requestId, status, notes);
      if (response.success) {
        showSuccessToast('Status updated', 'Request status has been updated');
        // Reload request if modal is open
        if (selectedRequest && selectedRequest.request_id === requestId) {
          const updatedRequest = await dataSubjectRightsService.getRequest(requestId);
          if (updatedRequest.success && updatedRequest.data) {
            setSelectedRequest(updatedRequest.data);
          }
        }
        await loadRequests();
      } else {
        throw new Error(response.message || 'Failed to update status');
      }
    } catch (error) {
      logger.error('Failed to update request status', error, { requestId, status });
      showErrorToast('Error', 'Failed to update request status');
    }
  };

  // Export helpers
  const escapeCsv = (v) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s;
  };
  
  const downloadFile = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; 
    link.download = filename; 
    document.body.appendChild(link);
    link.click(); 
    document.body.removeChild(link); 
    window.URL.revokeObjectURL(url);
  };
  
  const buildRequestCsvRows = (list) => {
    const headers = ['ID', 'Request Type', 'Requester Name', 'Requester Email', 'Status', 'Requested At', 'Due Date', 'Assigned To', 'Description'];
    const rows = list.map(request => [
      request.request_id || '',
      request.request_type || '',
      request.requester_name || '',
      request.requester_email || '',
      request.request_status || '',
      request.requested_at ? new Date(request.requested_at).toLocaleString() : '',
      request.due_date ? new Date(request.due_date).toLocaleString() : '',
      request.assigned_to_name || '—',
      (request.request_description || '').substring(0, 100)
    ]);
    return [headers, ...rows];
  };
  
  const downloadCsv = (filename, rows) => {
    const csv = rows.map(r => r.map(escapeCsv).join(',')).join('\n');
    downloadFile(new Blob(["\uFEFF"+csv], { type: 'text/csv;charset=utf-8;' }), filename);
  };

  // Export hooks
  const mainExport = useExport({
    exportFunction: async (format) => {
      try {
        const dataset = filteredRequests || [];
        const ts = new Date().toISOString().replace(/[:T]/g,'-').split('.')[0];
        
        if (format === 'csv') {
          const rows = buildRequestCsvRows(dataset);
          downloadCsv(`data-subject-requests-${ts}.csv`, rows);
          return { success: true };
        }
        
        throw new Error('Export format not supported');
      } catch (error) {
        throw new Error(error.message || 'Failed to export requests');
      }
    },
    onSuccess: () => showSuccessToast('Export completed', 'Data subject rights requests exported successfully'),
    onError: (error) => showErrorToast('Export failed', error.message)
  });

  // Helper functions
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'cancelled': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRequestTypeLabel = (type) => {
    const labels = {
      'access': 'Access',
      'rectification': 'Rectification',
      'erasure': 'Erasure',
      'portability': 'Portability',
      'object': 'Objection',
      'consent_withdrawal': 'Consent Withdrawal'
    };
    return labels[type] || type;
  };

  // Handle save notes
  const handleSaveNotes = async (updatedData) => {
    try {
      const notes = updatedData.notes || null;
      const response = await dataSubjectRightsService.updateRequestStatus(
        selectedRequest.request_id, 
        selectedRequest.request_status, 
        notes
      );
      
      if (response.success) {
        showSuccessToast('Notes saved', 'Internal notes have been updated');
        // Reload request to get updated data
        const updatedRequest = await dataSubjectRightsService.getRequest(selectedRequest.request_id);
        if (updatedRequest.success && updatedRequest.data) {
          setSelectedRequest(updatedRequest.data);
          await loadRequests();
          return updatedRequest.data; // Return updated data to modal
        }
        return updatedData; // Fallback to current data
      } else {
        throw new Error(response.message || 'Failed to save notes');
      }
    } catch (error) {
      logger.error('Failed to save request notes', error, { requestId: selectedRequest?.request_id });
      showErrorToast('Error', error.message || 'Failed to save notes');
      return false; // Prevent modal from updating
    }
  };

  // Detail modal config
  const detailModalConfig = useMemo(() => {
    if (!selectedRequest) return dataSubjectRequestDetailConfig;

    const canProcess = selectedRequest.request_status === 'pending' || selectedRequest.request_status === 'in_progress';
    const requestType = selectedRequest.request_type;

    const buttons = [
      {
        key: 'close',
        label: 'Close',
        variant: 'secondary',
        onClick: () => {
          setShowRequestModal(false);
          setSelectedRequest(null);
        }
      }
    ];

    if (canProcess) {
      // Add process button based on request type
      if (requestType === 'access' || requestType === 'erasure' || requestType === 'portability' || 
          requestType === 'object' || requestType === 'consent_withdrawal') {
        // Map request type to action type
        const actionType = requestType === 'object' ? 'objection' : requestType;
        buttons.push({
          key: 'process',
          label: `Process ${getRequestTypeLabel(requestType)}`,
          variant: 'primary',
          onClick: () => {
            handleProcessRequest(selectedRequest, actionType);
          }
        });
      }

      // Add status update buttons
      if (selectedRequest.request_status === 'pending') {
        buttons.push({
          key: 'mark-in-progress',
          label: 'Mark In Progress',
          variant: 'secondary',
          onClick: async () => {
            await handleUpdateStatus(selectedRequest.request_id, 'in_progress');
          }
        });
      }
    }

    // Add status update buttons for completed/rejected
    if (selectedRequest.request_status === 'in_progress') {
      buttons.push({
        key: 'mark-completed',
        label: 'Mark Completed',
        variant: 'success',
        onClick: async () => {
          await handleUpdateStatus(selectedRequest.request_id, 'completed');
        }
      });
    }

    return {
      ...dataSubjectRequestDetailConfig,
      footerButtons: () => buttons,
      onSave: handleSaveNotes // Add save handler for editable notes
    };
  }, [selectedRequest]);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <HeaderMainContent 
        title="Data Subject Rights Requests" 
        description="Manage data subject rights requests under RA 10173. Process access, rectification, erasure, portability, objection, and consent withdrawal requests."
      />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column - Requests List */}
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
                count={stats.pending} 
                color="yellow"
              />
              <Tab 
                id="in_progress" 
                label="In Progress" 
                count={stats.in_progress} 
                color="blue"
              />
              <Tab 
                id="completed" 
                label="Completed" 
                count={stats.completed} 
                color="green"
              />
              <Tab 
                id="all" 
                label="All" 
                count={stats.total} 
                color="gray"
              />
            </TabContainer>

            {/* Controls */}
            <div className="px-5 py-4 border-t border-gray-100">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 overflow-x-auto pb-2 md:pb-0">
                  <SearchBar
                    value={searchQuery}
                    onChange={handleSearchChange}
                    placeholder="Search by name, email, or request ID..." 
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
                    formats={['csv']}
                    onExport={(format) => mainExport.handleExport(format)}
                    isExporting={mainExport.isExporting}
                    label="Export"
                    size="md"
                  />
                </div>
              </div>
            </div>

            {/* Content Area */}
            {isLoading ? (
              <LoadingSpinner 
                variant="spinner"
                message="Loading requests..." 
                size="md"
                color="blue"
                height="h-64"
              />
            ) : (
              <>
                {paginatedItems.length === 0 ? (
                  <DataTable
                    data={[]}
                    selectedItems={[]}
                    onSelectItem={() => {}}
                    onSelectAll={() => {}}
                    viewMode={viewMode}
                    keyField="request_id"
                    displayFields={{}}
                    selectAllLabel="Select All Requests"
                    emptyMessage="No data subject rights requests found"
                    styling={{ theme: 'blue' }}
                  />
                ) : (
                  <DataTable
                    data={paginatedItems}
                    selectedItems={selectedItems}
                    onSelectItem={handleSelectItem}
                    onSelectAll={handleSelectAll}
                    onCardClick={handleCardClick}
                    viewMode={viewMode}
                    keyField="request_id"
                    displayFields={{
                      avatar: (item) => {
                        const nameParts = (item.requester_name || '').split(' ');
                        return {
                          firstName: nameParts[0] || '',
                          lastName: nameParts.slice(1).join(' ') || '',
                          email: item.requester_email || '',
                          picture: null
                        };
                      },
                      title: (item) => item.requester_name || 'Unknown',
                      email: (item) => item.requester_email || '—',
                      status: (item) => item.request_status,
                      extraBadges: (item) => [
                        {
                          text: getRequestTypeLabel(item.request_type),
                          className: 'bg-purple-100 text-purple-700 border-purple-200'
                        }
                      ],
                      badge: (item) => item.assigned_to_name ? {
                        text: `Assigned: ${item.assigned_to_name}`,
                        className: 'bg-blue-100 text-blue-700 border border-blue-200 font-medium'
                      } : null,
                      date: 'requested_at',
                      dateLabel: 'Requested'
                    }}
                    selectAllLabel="Select All Requests"
                    emptyMessage="No data subject rights requests found"
                    styling={{
                      gridCols: 'grid-cols-1 lg:grid-cols-2',
                      cardHover: 'hover:border-blue-300 hover:shadow-xl hover:shadow-blue-100/50 hover:scale-[1.02]',
                      listHover: 'hover:bg-blue-50/30 hover:border-l-4 hover:border-l-blue-400',
                      theme: 'blue'
                    }}
                  />
                )}

                {/* Pagination */}
                {filteredRequests.length > 0 && (
                  <Pagination
                    currentPage={currentPage}
                    totalItems={filteredRequests.length}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                    onItemsPerPageChange={setItemsPerPage}
                    itemName="request"
                    itemNamePlural="requests"
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

        {/* Right Column - Statistics */}
        <div className="xl:col-span-1 space-y-6">
          {/* Statistics Card */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Request Statistics</h3>
                  <p className="text-xs text-gray-600">Overview of all requests</p>
                </div>
              </div>
            </div>
            
            <div className="p-5 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Requests</span>
                <span className="text-sm font-semibold text-gray-900">{stats.total}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Pending</span>
                <span className="text-sm font-semibold text-yellow-600">{stats.pending}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">In Progress</span>
                <span className="text-sm font-semibold text-blue-600">{stats.in_progress}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Completed</span>
                <span className="text-sm font-semibold text-green-600">{stats.completed}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Rejected</span>
                <span className="text-sm font-semibold text-red-600">{stats.rejected}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Request Detail Modal */}
      {showRequestModal && selectedRequest && (
        <TabbedDetailModal
          isOpen={showRequestModal}
          onClose={() => {
            setShowRequestModal(false);
            setSelectedRequest(null);
          }}
          data={selectedRequest}
          config={detailModalConfig}
        />
      )}

      {/* Filter Modal */}
      <FilterModal
        isOpen={filterModal.isOpen}
        onClose={filterModal.closeModal}
        filters={modalFilters}
        filterValues={filterModal.filterValues}
        onFilterChange={filterModal.setFilterValues}
        onReset={filterModal.resetFilters}
      />

      {/* Sort Modal */}
      <SortModal
        isOpen={sortModal.isOpen}
        onClose={sortModal.closeModal}
        sortBy={sortModal.sortBy}
        sortOrder={sortModal.sortOrder}
        onSortChange={sortModal.setSort}
        sortOptions={[
          { value: 'requestedAt', label: 'Requested Date' },
          { value: 'dueDate', label: 'Due Date' },
          { value: 'requesterName', label: 'Requester Name' },
          { value: 'requestType', label: 'Request Type' },
          { value: 'status', label: 'Status' }
        ]}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal {...confirmation.modalProps} />

      <ToastContainer />
    </div>
  );
};

export default DataSubjectRequests;

