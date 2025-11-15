import React, { useState, useEffect, useMemo } from 'react';
import { 
  Eye,
  User,
  Calendar,
  Shield,
  CheckCircle,
  XCircle,
  Filter,
  Search,
  Download,
  ArrowUpDown,
  Database,
  BarChart3,
  Clock,
  FileText,
  UserCheck,
  Users
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
  ExportButton, 
  useExport,
  LoadingSpinner
} from '../../components/portal_main_content';
import { ToastContainer, showSuccessToast, showErrorToast } from '../../components/universal';
import validationLogsService from '../../services/validationLogsService.js';
import api from '../../services/api.js';
import logger from '../../utils/logger.js';

const ValidationLogs = () => {
  // Tab state for filtering by action (all, validated, rejected)
  const { activeTab, setActiveTab } = useTabState('all', async (tabId) => {
    setCurrentPage(1);
  });

  // UI state
  const [validationLogs, setValidationLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [totalLogs, setTotalLogs] = useState(0);

  // Sort modal
  const sortModal = useSortModal('validation_date', 'desc', () => {
    setCurrentPage(1);
  });

  // Filter modal
  const filterModal = useFilterModal({
    filters: [
      {
        id: 'tier',
        label: 'Validation Tier',
        type: 'select',
        placeholder: 'All Tiers',
        options: [
          { value: 'automatic', label: 'Automatic' },
          { value: 'manual', label: 'Manual' },
          { value: 'final', label: 'Final' }
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

  // Load validation logs
  const loadValidationLogs = async () => {
    let params = {};
    try {
      setIsLoading(true);
      setError(null);

      params = {
        page: currentPage,
        perPage: itemsPerPage,
        sortBy: sortModal.sortBy,
        sortOrder: sortModal.sortOrder
      };

      // Add search
      if (searchQuery) {
        params.search = searchQuery;
      }

      // Add tab filter (action)
      if (activeTab === 'validated') {
        params.action = 'validate';
      } else if (activeTab === 'rejected') {
        params.action = 'reject';
      }

      // Add filter modal filters
      if (filterModal.filterValues) {
        if (filterModal.filterValues.tier) {
          params.tier = filterModal.filterValues.tier;
        }
        if (filterModal.filterValues.dateFrom) {
          params.dateFrom = filterModal.filterValues.dateFrom;
        }
        if (filterModal.filterValues.dateTo) {
          params.dateTo = filterModal.filterValues.dateTo;
        }
      }

      const response = await validationLogsService.getValidationLogs(params);
      
      if (response?.success) {
        const logs = response.data || [];
        setValidationLogs(logs);
        if (response.pagination?.total !== undefined) {
          setTotalLogs(response.pagination.total);
        } else {
          setTotalLogs(logs.length);
        }
      } else {
        throw new Error(response?.message || 'Failed to load validation logs');
      }
    } catch (error) {
      logger.error('Failed to load validation logs', error, { params });
      setError(error.message || 'Failed to load validation logs');
      setValidationLogs([]);
      showErrorToast('Error', 'Failed to load validation logs');
    } finally {
      setIsLoading(false);
    }
  };

  // Load data on mount and when dependencies change
  useEffect(() => {
    loadValidationLogs();
  }, [currentPage, itemsPerPage, searchQuery, sortModal.sortBy, sortModal.sortOrder, activeTab, filterModal.filterValues]);

  // Statistics state
  const [logStats, setLogStats] = useState({
    total: 0,
    validated: 0,
    rejected: 0,
    byTier: {},
    recent: 0
  });

  // Load statistics
  const loadStatistics = async () => {
    try {
      const statsParams = {
        perPage: 1000,
        page: 1,
        sortBy: 'validation_date',
        sortOrder: 'desc'
      };

      const response = await validationLogsService.getValidationLogs(statsParams);
      
      if (response?.success) {
        const allLogs = response.data || [];
        const statsTotal = response.pagination?.total || allLogs.length;
        
        const validated = allLogs.filter(log => log.validation_action === 'validate').length;
        const rejected = allLogs.filter(log => log.validation_action === 'reject').length;
        
        // Count by tier
        const byTier = allLogs.reduce((acc, log) => {
          const tier = log.validation_tier || 'unknown';
          acc[tier] = (acc[tier] || 0) + 1;
          return acc;
        }, {});

        // Recent activity (last 24 hours)
        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const recent = allLogs.filter(log => {
          const logDate = new Date(log.validation_date);
          return logDate >= yesterday;
        }).length;

        setLogStats({
          total: statsTotal,
          validated,
          rejected,
          byTier,
          recent
        });
      }
    } catch (error) {
      logger.error('Failed to load validation log statistics', error);
    }
  };

  // Load statistics on mount
  useEffect(() => {
    loadStatistics();
  }, []);

  // Get paginated logs
  const getPaginatedLogs = () => {
    return validationLogs;
  };

  // Get filtered logs for export
  const getFilteredLogs = () => {
    return validationLogs;
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

  // Export helpers
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
    const headers = ['Log ID', 'Date & Time', 'Action', 'Tier', 'Validator', 'Validator Position', 'Youth', 'Batch', 'Comments'];
    const rows = list.map(log => [
      log.log_id || log.logId || '',
      log.validation_date ? new Date(log.validation_date).toLocaleString() : '',
      log.validation_action || '',
      log.validation_tier || '',
      log.validator_name || '',
      log.validator_position || '',
      log.youth_name || '',
      log.batch_name || '',
      log.validation_comments || ''
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
      if (!dataset || dataset.length === 0) throw new Error('No validation logs to export');
      const ts = new Date().toISOString().replace(/[:T]/g,'-').split('.')[0];
      if (format === 'pdf') {
        const rows = buildLogCsvRows(dataset);
        openPrintPdf('Validation Logs', rows[0], rows);
        return { success: true };
      }
      if (format === 'excel' || format === 'xlsx') {
        const rows = buildLogCsvRows(dataset);
        const xml = buildExcelXml('Validation Logs', rows);
        downloadFile(new Blob([xml], { type: 'application/vnd.ms-excel' }), `validation-logs-${ts}.xls`);
        return { success: true };
      }
      const rows = buildLogCsvRows(dataset);
      downloadCsv(`validation-logs-${ts}.csv`, rows);
      return { success: true };
    },
    onSuccess: () => showSuccessToast('Export Successful', 'Validation logs exported successfully'),
    onError: (error) => showErrorToast('Export Failed', error.message)
  });

  // Get action color
  const getActionColor = (action) => {
    return action === 'validate' 
      ? 'bg-green-100 text-green-800 border-green-200' 
      : 'bg-red-100 text-red-800 border-red-200';
  };

  // Get tier color
  const getTierColor = (tier) => {
    switch (tier) {
      case 'automatic': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'manual': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'final': return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
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
        title="Validation Logs" 
        description="Record of manual approvals and rejections performed by SK Officials on survey responses."
      />

      {/* Validation Status Banner */}
      <div className="bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200 rounded-xl p-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
            <Eye className="w-5 h-5 text-gray-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Validation Activity Monitor</h3>
            <p className="text-sm text-gray-700">
              {logStats.total} total logs • {logStats.validated} validated • {logStats.rejected} rejected • {logStats.recent} in last 24 hours
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column - Validation Logs List */}
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
                id="validated" 
                label="Validated" 
                count={logStats.validated} 
                color="green"
              />
              <Tab 
                id="rejected" 
                label="Rejected" 
                count={logStats.rejected} 
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
                    placeholder="Search by validator, youth, or comments..." 
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
                { value: 'validation_date', label: 'Date & Time' },
                { value: 'validation_action', label: 'Action' },
                { value: 'validation_tier', label: 'Tier' }
              ]}
              sortBy={sortModal.sortBy}
              sortOrder={sortModal.sortOrder}
              onSortChange={sortModal.updateSort}
              onReset={sortModal.resetSort}
              defaultSortBy="validation_date"
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
                    message="Loading validation logs..." 
                    size="md"
                    color="blue"
                    height="h-64"
                  />
                </div>
              ) : (
                <>
                  {getPaginatedLogs().length === 0 ? (
                    <div className="p-12 text-center">
                      <Eye className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No validation logs found</p>
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
                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getActionColor(log.validation_action)}`}>
                                          {log.validation_action === 'validate' ? (
                                            <><CheckCircle className="w-3 h-3 mr-1" /> Validated</>
                                          ) : (
                                            <><XCircle className="w-3 h-3 mr-1" /> Rejected</>
                                          )}
                                        </span>
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getTierColor(log.validation_tier)}`}>
                                          {log.validation_tier || 'Unknown'}
                                        </span>
                                      </div>
                                      <div className="space-y-1">
                                        <div className="flex items-center space-x-1 text-xs text-gray-700">
                                          <UserCheck className="w-3 h-3" />
                                          <span className="font-medium">{log.validator_name || 'Unknown Validator'}</span>
                                        </div>
                                        <div className="flex items-center space-x-1 text-xs text-gray-500">
                                          <Calendar className="w-3 h-3" />
                                          <span>{log.validation_date ? new Date(log.validation_date).toLocaleString() : '—'}</span>
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
                                    <h3 className="text-sm font-semibold text-gray-900 mb-1">{log.youth_name || 'Unknown Youth'}</h3>
                                    <div className="text-xs text-gray-500">
                                      Batch: {log.batch_name || '—'}
                                    </div>
                                  </div>

                                  <div className="pt-2 border-t border-gray-100">
                                    <div className="text-xs text-gray-600 space-y-1">
                                      {log.validator_position && (
                                        <div className="flex items-center justify-between">
                                          <span className="font-medium">Validator Position:</span>
                                          <span className="text-gray-900">{log.validator_position}</span>
                                        </div>
                                      )}
                                      {log.validator_barangay && (
                                        <div className="flex items-center justify-between">
                                          <span className="font-medium">Validator Barangay:</span>
                                          <span className="text-gray-900">{log.validator_barangay}</span>
                                        </div>
                                      )}
                                      {log.youth_barangay && (
                                        <div className="flex items-center justify-between">
                                          <span className="font-medium">Youth Barangay:</span>
                                          <span className="text-gray-900">{log.youth_barangay}</span>
                                        </div>
                                      )}
                                      {log.validation_comments && (
                                        <div className="pt-1">
                                          <div className="flex items-start">
                                            <span className="font-medium text-blue-600">Comments:</span>
                                            <span className="text-blue-600 text-xs ml-2">{log.validation_comments}</span>
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
          {/* Validation Statistics */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Validation Statistics</h3>
                  <p className="text-xs text-gray-600">Overview and metrics</p>
                </div>
              </div>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{logStats.validated}</div>
                  <div className="text-xs text-gray-600">Validated</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{logStats.rejected}</div>
                  <div className="text-xs text-gray-600">Rejected</div>
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

          {/* By Tier */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-green-50 to-emerald-50">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">By Validation Tier</h3>
                  <p className="text-xs text-gray-600">Tier breakdown</p>
                </div>
              </div>
            </div>
            
            <div className="p-5 space-y-3">
              {Object.entries(logStats.byTier)
                .sort(([,a], [,b]) => b - a)
                .map(([tier, count]) => (
                  <div key={tier} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 capitalize">{tier}</span>
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
                  <p className="text-xs text-gray-600">Latest validation logs</p>
                </div>
              </div>
            </div>
            
            <div className="p-5 space-y-3 max-h-64 overflow-y-auto">
              {validationLogs
                .slice(0, 5)
                .map(log => (
                  <div key={log.log_id || log.logId} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg transition-colors">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      log.validation_action === 'validate' ? 'bg-green-400' : 'bg-red-400'
                    }`}></div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{log.youth_name || 'Unknown Youth'}</div>
                      <div className="text-xs text-gray-500">
                        {log.validation_action} • {log.validation_tier || 'Unknown'}
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 flex-shrink-0">
                      {log.validation_date ? new Date(log.validation_date).toLocaleTimeString() : '—'}
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

export default ValidationLogs;

