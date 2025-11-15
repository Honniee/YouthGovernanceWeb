import React, { useState, useEffect, useMemo } from 'react';
import { 
  Activity,
  User,
  Calendar,
  Shield,
  CheckCircle,
  XCircle,
  Filter,
  Search,
  Eye,
  Download,
  ArrowUpDown,
  AlertTriangle,
  Database,
  BarChart3,
  TrendingUp,
  Clock,
  FileText
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
  LoadingSpinner
} from '../../components/portal_main_content';
import { ToastContainer, showSuccessToast, showErrorToast } from '../../components/universal';
import activityLogsService from '../../services/activityLogsService.js';
import api from '../../services/api.js';
import { formatAsiaManilaTime } from '../../utils/timezone.js';
import logger from '../../utils/logger.js';

const ActivityLogs = () => {
  // Tab state for filtering by category or status
  const { activeTab, setActiveTab } = useTabState('all', async (tabId) => {
    setCurrentPage(1);
  });

  // UI state
  const [activityLogs, setActivityLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [totalLogs, setTotalLogs] = useState(0);

  // Sort modal
  const sortModal = useSortModal('created_at', 'desc', () => {
    setCurrentPage(1);
  });

  // Filter modal
  const filterModal = useFilterModal({
    filters: [
      {
        id: 'userType',
        label: 'User Type',
        type: 'select',
        placeholder: 'All User Types',
        options: [
          { value: 'admin', label: 'Admin' },
          { value: 'lydo_staff', label: 'LYDO Staff' },
          { value: 'sk_official', label: 'SK Official' },
          { value: 'youth', label: 'Youth' },
          { value: 'anonymous', label: 'Anonymous' }
        ]
      },
      {
        id: 'category',
        label: 'Category',
        type: 'select',
        placeholder: 'All Categories',
        options: [
          { value: 'Authentication', label: 'Authentication' },
          { value: 'User Management', label: 'User Management' },
          { value: 'Survey Management', label: 'Survey Management' },
          { value: 'Data Export', label: 'Data Export' },
          { value: 'Data Management', label: 'Data Management' },
          { value: 'System Management', label: 'System Management' },
          { value: 'SK Management', label: 'SK Management' },
          { value: 'Term Management', label: 'Term Management' },
          { value: 'Youth Management', label: 'Youth Management' },
          { value: 'Announcement', label: 'Announcement' },
          { value: 'Activity Log', label: 'Activity Log' },
          { value: 'Notification Management', label: 'Notification Management' },
          { value: 'Bulk Operations', label: 'Bulk Operations' },
          { value: 'System Events', label: 'System Events' },
          { value: 'Data Validation', label: 'Data Validation' },
          { value: 'Report Generation', label: 'Report Generation' }
        ]
      },
      {
        id: 'success',
        label: 'Status',
        type: 'select',
        placeholder: 'All Status',
        options: [
          { value: 'true', label: 'Success' },
          { value: 'false', label: 'Failed' }
        ]
      },
      {
        id: 'dateFrom',
        label: 'From Date',
        type: 'date',
        placeholder: 'Start date'
      },
      {
        id: 'dateTo',
        label: 'To Date',
        type: 'date',
        placeholder: 'End date'
      }
    ],
    onFilterChange: () => setCurrentPage(1)
  });

  // Load activity logs
  const loadActivityLogs = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = {
        page: currentPage,
        perPage: itemsPerPage,
        sortBy: sortModal.sortBy,
        sortOrder: sortModal.sortOrder
      };

      // Add search
      if (searchQuery) {
        params.search = searchQuery;
      }

      // Add tab filter (category)
      if (activeTab !== 'all' && activeTab !== 'success' && activeTab !== 'failed') {
        params.category = activeTab;
      }

      // Add success filter from tab
      if (activeTab === 'success') {
        params.success = 'true';
      } else if (activeTab === 'failed') {
        params.success = 'false';
      }

      // Add filter modal filters
      if (filterModal.filterValues) {
        if (filterModal.filterValues.userType) {
          params.userType = filterModal.filterValues.userType;
        }
        if (filterModal.filterValues.category && activeTab === 'all') {
          params.category = filterModal.filterValues.category;
        }
        if (filterModal.filterValues.success && activeTab !== 'success' && activeTab !== 'failed') {
          params.success = filterModal.filterValues.success;
        }
        if (filterModal.filterValues.dateFrom) {
          params.dateFrom = filterModal.filterValues.dateFrom;
        }
        if (filterModal.filterValues.dateTo) {
          params.dateTo = filterModal.filterValues.dateTo;
        }
      }

      const response = await api.get('/activity-logs', { params });
      
      if (response.data?.success) {
        const logs = response.data.data || [];
        setActivityLogs(logs);
        // Use total from pagination metadata if available
        if (response.data.pagination?.total !== undefined) {
          setTotalLogs(response.data.pagination.total);
        } else {
          // Fallback to array length if pagination metadata not available
          setTotalLogs(logs.length);
        }
      } else {
        throw new Error(response.data?.message || 'Failed to load activity logs');
      }
    } catch (error) {
      logger.error('Failed to load activity logs', error);
      setError(error.message || 'Failed to load activity logs');
      setActivityLogs([]);
      showErrorToast('Error', 'Failed to load activity logs');
    } finally {
      setIsLoading(false);
    }
  };

  // Load data on mount and when dependencies change
  useEffect(() => {
    loadActivityLogs();
  }, [currentPage, itemsPerPage, searchQuery, sortModal.sortBy, sortModal.sortOrder, activeTab, filterModal.filterValues]);

  // Statistics state (fetched separately to get totals across all logs)
  const [logStats, setLogStats] = useState({
    total: 0,
    success: 0,
    failed: 0,
    byCategory: {},
    byUserType: {},
    recent: 0
  });

  // Load statistics (all logs, no pagination)
  const loadStatistics = async () => {
    try {
      // Fetch stats with a large limit to get comprehensive statistics
      // In production, you might want a dedicated stats endpoint
      const statsParams = {
        perPage: 1000, // Get a large sample for stats
        page: 1,
        sortBy: 'created_at',
        sortOrder: 'desc'
      };

      const response = await api.get('/activity-logs', { params: statsParams });
      
      if (response.data?.success) {
        const allLogs = response.data.data || [];
        const statsTotal = response.data.pagination?.total || allLogs.length;
        
        // Calculate statistics from the fetched logs
        const success = allLogs.filter(log => log.success === true || log.success === 'true').length;
        const failed = allLogs.filter(log => log.success === false || log.success === 'false').length;
        
        // Count by category
        const byCategory = allLogs.reduce((acc, log) => {
          const cat = log.category || 'Unknown';
          acc[cat] = (acc[cat] || 0) + 1;
          return acc;
        }, {});

        // Count by user type
        const byUserType = allLogs.reduce((acc, log) => {
          const type = log.user_type || 'unknown';
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {});

        // Recent activity (last 24 hours)
        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const recent = allLogs.filter(log => {
          const logDate = new Date(log.created_at);
          return logDate >= yesterday;
        }).length;

        setLogStats({
          total: statsTotal,
          success: success,
          failed: failed,
          byCategory,
          byUserType,
          recent
        });
      }
    } catch (error) {
      logger.error('Failed to load activity log statistics', error);
      // Don't show error toast for stats, just log it
    }
  };

  // Load statistics on mount
  useEffect(() => {
    loadStatistics();
  }, []);

  // Pagination hook
  const pagination = usePagination({
    currentPage,
    totalItems: totalLogs,
    itemsPerPage,
    onPageChange: setCurrentPage,
    onItemsPerPageChange: setItemsPerPage
  });

  // Get paginated logs (activityLogs is already paginated from backend)
  const getPaginatedLogs = () => {
    return activityLogs; // Backend already returns paginated results
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
    const paginatedLogs = getPaginatedLogs();
    const allSelected = paginatedLogs.every(log => selectedItems.includes(log.log_id || log.logId));
    
    if (allSelected) {
      setSelectedItems(prev => prev.filter(id => !paginatedLogs.some(log => (log.log_id || log.logId) === id)));
    } else {
      const newSelections = paginatedLogs.filter(log => !selectedItems.includes(log.log_id || log.logId)).map(log => log.log_id || log.logId);
      setSelectedItems(prev => [...prev, ...newSelections]);
    }
  };

  // Export helpers (CSV, Excel XML, PDF)
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
  const buildLogCsvRows = (list) => {
    const headers = ['Log ID', 'Date & Time', 'User Type', 'Category', 'Message', 'Action', 'Resource Type', 'Resource Name', 'Success', 'Error'];
    const rows = list.map(log => [
      log.log_id || log.logId || '',
      log.created_at ? formatAsiaManilaTime(log.created_at) : '',
      log.user_type || '',
      log.category || '',
      log.message || log.action || '',
      log.action || '',
      log.resource_type || '',
      log.resource_name || '',
      log.success === true || log.success === 'true' ? 'Yes' : 'No',
      log.error_message || ''
    ]);
    return [headers, ...rows];
  };
  const downloadCsv = (filename, rows) => {
    const csv = rows.map(r => r.map(escapeCsv).join(',')).join('\n');
    downloadFile(new Blob(["\uFEFF"+csv], { type: 'text/csv;charset=utf-8;' }), filename);
  };
  const buildExcelXml = (sheetName, rows) => {
    const rowXml = rows.map(r => `<Row>${r.map(c => `<Cell><Data ss:Type="String">${String(c??'')}</Data></Cell>`).join('')}</Row>`).join('');
    return `<?xml version="1.0"?>\n<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="${sheetName}"><Table>${rowXml}</Table></Worksheet></Workbook>`;
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
      const dataset = getFilteredLogs();
      if (!dataset || dataset.length === 0) throw new Error('No activity logs to export');
      const ts = new Date().toISOString().replace(/[:T]/g,'-').split('.')[0];
      if (format === 'pdf') {
        const rows = buildLogCsvRows(dataset);
        openPrintPdf('Activity Logs', rows[0], rows);
        return { success: true };
      }
      if (format === 'excel' || format === 'xlsx') {
        const rows = buildLogCsvRows(dataset);
        const xml = buildExcelXml('Activity Logs', rows);
        downloadFile(new Blob([xml], { type: 'application/vnd.ms-excel' }), `activity-logs-${ts}.xls`);
        return { success: true };
      }
      const rows = buildLogCsvRows(dataset);
      downloadCsv(`activity-logs-${ts}.csv`, rows);
      return { success: true };
    },
    onSuccess: () => showSuccessToast('Export Successful', 'Activity logs exported successfully'),
    onError: (error) => showErrorToast('Export Failed', error.message)
  });

  // Get unique categories for tabs
  const uniqueCategories = useMemo(() => {
    const categories = [...new Set(activityLogs.map(log => log.category).filter(Boolean))].sort();
    return categories;
  }, [activityLogs]);

  // Get status color
  const getStatusColor = (success) => {
    return success === true || success === 'true' 
      ? 'bg-green-100 text-green-800 border-green-200' 
      : 'bg-red-100 text-red-800 border-red-200';
  };

  // Get user type color
  const getUserTypeColor = (userType) => {
    switch (userType) {
      case 'admin': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'lydo_staff': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'sk_official': return 'bg-green-100 text-green-700 border-green-200';
      case 'youth': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'anonymous': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // Format details JSON
  const formatDetails = (details) => {
    if (!details) return '—';
    if (typeof details === 'string') {
      try {
        const parsed = JSON.parse(details);
        return JSON.stringify(parsed, null, 0).substring(0, 50) + (JSON.stringify(parsed, null, 0).length > 50 ? '...' : '');
      } catch {
        return details.substring(0, 50) + (details.length > 50 ? '...' : '');
      }
    }
    if (typeof details === 'object') {
      return JSON.stringify(details, null, 0).substring(0, 50) + (JSON.stringify(details, null, 0).length > 50 ? '...' : '');
    }
    return String(details).substring(0, 50);
  };

  // Determine if there are active filters
  const hasActiveFilters = useMemo(() => {
    const values = filterModal.filterValues || {};
    return Object.values(values).some(val => val !== undefined && val !== null && val !== '');
  }, [filterModal.filterValues]);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <HeaderMainContent 
        title="Activity Logs" 
        description="Monitor and review system activity logs, user actions, and audit trails for security and compliance."
      />

      {/* Activity Status Banner */}
      <div className="bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200 rounded-xl p-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
            <Activity className="w-5 h-5 text-gray-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">System Activity Monitor</h3>
            <p className="text-sm text-gray-700">
              {logStats.total} total logs • {logStats.success} successful • {logStats.failed} failed • {logStats.recent} in last 24 hours
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column - Activity Logs List */}
        <div className="xl:col-span-2">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Tab Container */}
            <TabContainer
              activeTab={activeTab}
              onTabChange={setActiveTab}
              variant="underline"
              size="md"
            >
              <Tab 
                id="all" 
                label="All Logs" 
                count={logStats.total} 
                color="blue"
              />
              <Tab 
                id="success" 
                label="Success" 
                count={logStats.success} 
                color="green"
              />
              <Tab 
                id="failed" 
                label="Failed" 
                count={logStats.failed} 
                color="red"
              />
            </TabContainer>

            {/* Controls */}
            <div className="px-5 py-4 border-t border-gray-100">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 overflow-x-auto pb-2 md:pb-0 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                  <SearchBar
                    value={searchQuery}
                    onChange={handleSearchChange}
                    placeholder="Search by action, resource, or user..." 
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
                    variant="blue"
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
                { value: 'created_at', label: 'Date & Time' },
                { value: 'user_type', label: 'User Type' },
                { value: 'category', label: 'Category' },
                { value: 'action', label: 'Action' },
                { value: 'resource_type', label: 'Resource Type' }
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
              isOpen={filterModal.isOpen}
              onClose={filterModal.closeModal}
              triggerRef={filterModal.triggerRef}
              title="Filter Options"
              filters={filterModal.filters}
              values={filterModal.filterValues || {}}
              onChange={filterModal.updateFilterValues}
              onApply={filterModal.closeModal}
              onClear={filterModal.resetFilters}
            />

            {/* Content Area - Scrollable */}
            <div className="overflow-y-auto max-h-[calc(100vh-180px)]">
              {isLoading ? (
                <div className="p-12">
                  <LoadingSpinner 
                    variant="spinner"
                    message="Loading activity logs..." 
                    size="md"
                    color="blue"
                    height="h-64"
                  />
                </div>
              ) : (
                <>
                  {getPaginatedLogs().length === 0 ? (
                    <div className="p-12 text-center">
                      <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No activity logs found</p>
                    </div>
                  ) : (
                    <>
                      {/* Select All Checkbox */}
                      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 sticky top-0 z-10">
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={getPaginatedLogs().length > 0 && getPaginatedLogs().every(log => selectedItems.includes(log.log_id || log.logId))}
                            onChange={handleSelectAll}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="text-sm text-gray-700">Select All ({getPaginatedLogs().length} logs)</span>
                        </label>
                      </div>

                      {/* Card Grid View */}
                      <div className="p-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                          {getPaginatedLogs().map((log) => {
                            const logId = log.log_id || log.logId;
                            return (
                              <div 
                                key={logId} 
                                className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-md transition-all duration-200"
                              >
                                {/* Card Header */}
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex items-center space-x-2 flex-1">
                                    <input
                                      type="checkbox"
                                      checked={selectedItems.includes(logId)}
                                      onChange={() => handleSelectItem(logId)}
                                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center space-x-2 mb-1">
                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(log.success)}`}>
                                          {log.success === true || log.success === 'true' ? (
                                            <><CheckCircle className="w-3 h-3 mr-1" /> Success</>
                                          ) : (
                                            <><XCircle className="w-3 h-3 mr-1" /> Failed</>
                                          )}
                                        </span>
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getUserTypeColor(log.user_type)}`}>
                                          {log.user_type || 'Unknown'}
                                        </span>
                                      </div>
                                      <div className="space-y-1">
                                        <div className="flex items-center space-x-1 text-xs text-gray-700">
                                          <User className="w-3 h-3" />
                                          <span className="font-medium">{log.user_name || 'System'}</span>
                                        </div>
                                        <div className="flex items-center space-x-1 text-xs text-gray-500">
                                          <Calendar className="w-3 h-3" />
                                          <span>{log.created_at ? formatAsiaManilaTime(log.created_at) : '—'}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  <button className="text-blue-600 hover:text-blue-900 p-1.5 hover:bg-blue-50 rounded-lg transition-colors">
                                    <Eye className="w-4 h-4" />
                                  </button>
                                </div>

                                {/* Card Body */}
                                <div className="space-y-2">
                                  <div>
                                    <h3 className="text-sm font-semibold text-gray-900 mb-1">
                                      {log.message || log.action || '—'}
                                    </h3>
                                    <div className="text-xs text-gray-500">
                                      {log.category || '—'} {log.message && log.action !== log.message && `• ${log.action}`}
                                    </div>
                                  </div>

                                  <div className="pt-2 border-t border-gray-100">
                                    <div className="text-xs text-gray-600 space-y-1">
                                      <div className="flex items-center justify-between">
                                        <span className="font-medium">Resource Type:</span>
                                        <span className="text-gray-900">{log.resource_type || '—'}</span>
                                      </div>
                                      {log.resource_name && (
                                        <div className="flex items-center justify-between">
                                          <span className="font-medium">Resource Name:</span>
                                          <span className="text-gray-900 truncate ml-2">{log.resource_name}</span>
                                        </div>
                                      )}
                                      {log.resource_id && (
                                        <div className="flex items-center justify-between">
                                          <span className="font-medium">Resource ID:</span>
                                          <span className="text-gray-900">{log.resource_id}</span>
                                        </div>
                                      )}
                                      {log.error_message && (
                                        <div className="pt-1">
                                          <div className="flex items-start">
                                            <span className="font-medium text-red-600">Error:</span>
                                            <span className="text-red-600 text-xs ml-2">{log.error_message}</span>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Pagination */}
                      <div className="px-5 pb-5 border-t border-gray-100 bg-gray-50 sticky bottom-0">
                        <Pagination
                          currentPage={currentPage}
                          totalItems={totalLogs}
                          itemsPerPage={itemsPerPage}
                          onPageChange={setCurrentPage}
                          onItemsPerPageChange={setItemsPerPage}
                          itemName="log entry"
                          itemNamePlural="log entries"
                          showItemsPerPage={true}
                          showInfo={true}
                          size="md"
                          variant="default"
                          itemsPerPageOptions={[10, 20, 50, 100]}
                        />
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Statistics & Dashboard */}
        <div className="xl:col-span-1 space-y-6">
          {/* Activity Statistics */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Activity Statistics</h3>
                  <p className="text-xs text-gray-600">Overview and metrics</p>
                </div>
              </div>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{logStats.success}</div>
                  <div className="text-xs text-gray-600">Successful</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{logStats.failed}</div>
                  <div className="text-xs text-gray-600">Failed</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Logs</span>
                  <span className="font-medium">{logStats.total}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Last 24 Hours</span>
                  <span className="font-medium">{logStats.recent}</span>
                </div>
              </div>
            </div>
          </div>

          {/* By Category */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-green-50 to-emerald-50">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">By Category</h3>
                  <p className="text-xs text-gray-600">Activity breakdown</p>
                </div>
              </div>
            </div>
            
            <div className="p-5 space-y-3 max-h-64 overflow-y-auto">
              {Object.entries(logStats.byCategory)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 8)
                .map(([category, count]) => (
                  <div key={category} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 truncate">{category}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-12 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full" 
                          style={{ width: `${(count / Math.max(...Object.values(logStats.byCategory))) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900 w-6 text-right">{count}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* By User Type */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                  <User className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">By User Type</h3>
                  <p className="text-xs text-gray-600">User activity breakdown</p>
                </div>
              </div>
            </div>
            
            <div className="p-5 space-y-3">
              {Object.entries(logStats.byUserType)
                .sort(([,a], [,b]) => b - a)
                .map(([userType, count]) => (
                  <div key={userType} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 capitalize">{userType.replace('_', ' ')}</span>
                    <span className="text-sm font-medium text-gray-900">{count}</span>
                  </div>
                ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Recent Activity</h3>
                  <p className="text-xs text-gray-600">Latest log entries</p>
                </div>
              </div>
            </div>
            
            <div className="p-5 space-y-3 max-h-64 overflow-y-auto">
              {activityLogs
                .slice(0, 5)
                .map(log => (
                  <div key={log.log_id || log.logId} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg transition-colors">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      log.success === true || log.success === 'true' ? 'bg-green-400' : 'bg-red-400'
                    }`}></div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{log.message || log.action}</div>
                      <div className="text-xs text-gray-500">
                        {log.category} • {log.user_type || 'Unknown'}
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 flex-shrink-0">
                      {log.created_at ? new Date(log.created_at).toLocaleTimeString() : '—'}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Toast Container */}
      <ToastContainer position="top-right" maxToasts={5} />
    </div>
  );
};

export default ActivityLogs;

