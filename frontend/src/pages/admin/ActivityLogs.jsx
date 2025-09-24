import React, { useEffect, useMemo, useState } from 'react';
import { HeaderMainContent, TabContainer, Tab, useTabState, SearchBar, SortModal, FilterModal, Pagination, DataTable, ExportButton, LoadingSpinner, useSortModal } from '../../components/portal_main_content';
import { ToastContainer, showErrorToast } from '../../components/universal';
import { Filter as FilterIcon, ArrowUpDown, Grid, List, ChevronDown, Clock, User, Activity, AlertCircle, CheckCircle2, Eye } from 'lucide-react';
import activityLogsService from '../../services/activityLogsService.js';

const ActivityLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ category: '', status: '', dateFrom: '', dateTo: '', userType: '' });
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [expandedLogId, setExpandedLogId] = useState(null);
  const filterTriggerRef = React.useRef(null);
  const sortModal = useSortModal(sortBy, sortOrder);

  // Tabs scoped by user type (admin, staff, sk, youth, all)
  const { activeTab, setActiveTab } = useTabState('all', async (tabId) => {
    // Map tab IDs to user types for filtering
    const userTypeMap = {
      'all': '',
      'admin': 'admin',
      'staff': 'lydo_staff', 
      'sk': 'sk_official',
      'youth': 'youth'
    };
    
    setFilters(prev => ({ ...prev, userType: userTypeMap[tabId] || '' }));
    setPage(1);
  });

  // Tab counts derived from current logs
  const tabCounts = useMemo(() => {
    const total = logs.length;
    const byType = (t) => logs.filter(l => (l.user_type || '').toLowerCase() === t.toLowerCase()).length;
    return {
      total,
      admin: byType('admin'),
      staff: byType('lydo_staff'),
      sk: byType('sk_official'),
      youth: byType('youth'),
    };
  }, [logs]);

  const hasActiveFilters = useMemo(() => Object.values(filters).some(v => v), [filters]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const resp = await activityLogsService.getLogs({
        search,
        category: filters.category,
        success: filters.status === '' ? undefined : filters.status === 'success',
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        userType: filters.userType,
        sortBy,
        sortOrder,
        page,
        perPage
      });
      const items = resp?.data || resp?.items || [];
      setLogs(items);
    } catch (e) {
      showErrorToast('Failed to load activity logs', e?.message || '');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadLogs(); }, [search, filters, sortBy, sortOrder, page, perPage]);

  // Sync local sort state with sort modal hook
  useEffect(() => {
    setSortBy(sortModal.sortBy);
    setSortOrder(sortModal.sortOrder);
  }, [sortModal.sortBy, sortModal.sortOrder]);

  // Enhanced columns for list view
  const columns = useMemo(() => ({
    activity: (row) => {
      const actionText = (row.action || row.resource_name || 'Activity').toString().replaceAll('_', ' ');
      const isExpanded = expandedLogId === (row.log_id || row.id);
      
      return (
        <div className="flex items-start gap-3 py-2">
          {/* Status Icon */}
          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5 ${
            row.success ? 'bg-emerald-100' : 'bg-red-100'
          }`}>
            {row.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            {/* Main Action */}
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-gray-900 text-sm">{actionText}</span>
              {(row.log_id || row.id) && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  {(row.log_id || row.id).toString().slice(-6)}
                </span>
              )}
            </div>
            
            {/* Resource Info */}
            {row.resource_name && (
              <div className="text-xs text-gray-700 mb-1 truncate">
                <span className="font-medium">Resource:</span> {row.resource_name}
              </div>
            )}
            
            {/* User Info */}
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <User className="w-3 h-3" />
              <span>{row.user_name || 'Unknown'}</span>
              <span className="text-gray-400">•</span>
              <span className="capitalize">{(row.user_type || row.user_role || 'user').replaceAll('_', ' ')}</span>
            </div>
            
            {/* Expanded Details */}
            {isExpanded && (
              <div className="mt-2 pt-2 border-t border-gray-100 space-y-2">
                {row.details && (
                  <div className="text-xs text-gray-700 bg-gray-50 border border-gray-100 rounded-md p-2">
                    <span className="font-medium">Details:</span> {row.details}
                  </div>
                )}
                {!row.success && row.error_message && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-2">
                    <div className="text-[11px] font-semibold text-red-700 mb-1">Error:</div>
                    <div className="text-xs text-red-700">{row.error_message}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    },
    
    category: (row) => {
      const catClasses = getCategoryColor(row.category);
      return (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${catClasses}`}>
            {String(row.category || 'General').replaceAll('_', ' ')}
          </span>
          {row.resource_type && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
              {row.resource_type}
            </span>
          )}
          {row.resource_id && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-50 text-gray-700 border border-gray-200">
              #{row.resource_id}
            </span>
          )}
        </div>
      );
    },
    
    status: (row) => (
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${
          row.success 
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
            : 'bg-red-50 text-red-700 border-red-200'
        }`}>
          {row.success ? 'Success' : 'Failed'}
        </span>
      </div>
    ),
    
    timestamp: (row) => {
      const date = row.created_at || row.timestamp;
      try {
        const d = new Date(date);
        return (
          <div className="text-right">
            <div className="flex items-center gap-1 text-xs text-gray-600 mb-0.5">
              <Clock className="w-3 h-3" />
              <span>{d.toLocaleDateString()}</span>
            </div>
            <div className="text-[11px] text-gray-500">
              {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        );
      } catch {
        return <span className="text-xs text-gray-500">{date}</span>;
      }
    },
    
    actions: (row) => {
      const isExpanded = expandedLogId === (row.log_id || row.id);
      const hasExpandableContent = row.details || (!row.success && row.error_message);
      
      return (
        <div className="flex items-center gap-2">
          {hasExpandableContent && (
            <button
              onClick={() => setExpandedLogId(isExpanded ? null : (row.log_id || row.id))}
              className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                isExpanded 
                  ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <Eye className="w-3 h-3" />
              {isExpanded ? 'Hide' : 'Details'}
            </button>
          )}
        </div>
      );
    }
  }), [expandedLogId]);

  // Card helpers
  const getCategoryColor = (category) => {
    switch ((category || '').toUpperCase()) {
      case 'SURVEY MANAGEMENT':
      case 'SURVEY_MANAGEMENT':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'USER MANAGEMENT':
      case 'USER_MANAGEMENT':
        return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'DATA EXPORT':
      case 'DATA_EXPORT':
        return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case 'DATA MANAGEMENT':
      case 'DATA_MANAGEMENT':
        return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'AUTHENTICATION':
        return 'text-cyan-700 bg-cyan-50 border-cyan-200';
      case 'SYSTEM MANAGEMENT':
      case 'SYSTEM_MANAGEMENT':
        return 'text-red-700 bg-red-50 border-red-200';
      default:
        return 'text-slate-700 bg-slate-50 border-slate-200';
    }
  };

  const ActivityLogCard = ({ row }) => {
    const renderText = (value) => {
      if (value === null || value === undefined) return '';
      if (typeof value === 'object') {
        try {
          return JSON.stringify(value);
        } catch (e) {
          return String(value);
        }
      }
      return String(value);
    };
    const catClasses = getCategoryColor(row.category);
    const [isExpanded, setIsExpanded] = useState(false);
    const hasExpandableContent = row.details || (!row.success && row.error_message);
    
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3 hover:shadow-md transition-shadow duration-200">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${catClasses}`}>
                {String(row.category || 'Activity').replaceAll('_', ' ')}
              </span>
              {(row.user_type || row.user_role) && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-slate-50 text-slate-700 border-slate-200">
                  {String(row.user_type || row.user_role).replaceAll('_', ' ')}
                </span>
              )}
              <div className={`flex items-center gap-1 ${row.success ? 'text-emerald-600' : 'text-red-600'}`}>
                {row.success ? (
                  <CheckCircle2 className="w-3 h-3" />
                ) : (
                  <AlertCircle className="w-3 h-3" />
                )}
                <span className="text-[10px] font-medium">
                  {row.success ? 'Success' : 'Failed'}
                </span>
              </div>
            </div>
            
            <div className="mb-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-gray-900">
                  {(row.action || '').replaceAll('_', ' ') || 'Activity'}
                </span>
                {(row.log_id || row.id) && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                    {(row.log_id || row.id).toString().slice(-6)}
                  </span>
                )}
              </div>
              
              {row.resource_name && (
                <div className="text-xs text-gray-700 mb-1">
                  <span className="font-medium">Resource:</span> {renderText(row.resource_name)}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-2">
              <User className="w-3 h-3" />
              <span>{renderText(row.user_name) || 'Unknown'}</span>
              <span className="text-gray-400">•</span>
              <span className="capitalize">{renderText(row.user_type || row.user_role) || 'user'}</span>
            </div>
          </div>
          
          <div className="text-right shrink-0">
            <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
              <Clock className="w-3 h-3" />
              <span>{new Date(row.created_at || row.timestamp).toLocaleDateString()}</span>
            </div>
            <div className="text-[11px] text-gray-500">
              {new Date(row.created_at || row.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            {row.resource_type && (
              <div className="text-[11px] text-gray-500 mt-1">{renderText(row.resource_type)}</div>
            )}
          </div>
        </div>
        
        {(row.resource_type || row.resource_id) && (
          <div className="flex flex-wrap items-center gap-2">
            {row.resource_type && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                {renderText(row.resource_type)}
              </span>
            )}
            {row.resource_id && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-50 text-gray-700 border border-gray-200">
                #{renderText(row.resource_id)}
              </span>
            )}
          </div>
        )}
        
        {/* Expandable Content */}
        {isExpanded && (
          <div className="space-y-2 pt-2 border-t border-gray-100">
            {row.details && (
              <div className="text-xs text-gray-700 bg-gray-50 border border-gray-100 rounded-lg p-2">
                <span className="font-medium">Details:</span> {renderText(row.details)}
              </div>
            )}
            {!row.success && row.error_message && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-2">
                <div className="text-[11px] font-semibold text-red-700 mb-0.5">Error Details:</div>
                <div className="text-xs text-red-700">{renderText(row.error_message)}</div>
              </div>
            )}
          </div>
        )}
        
        <div className="flex justify-between items-center pt-2 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <Activity className="w-3 h-3 text-gray-400" />
            <span className="text-[11px] text-gray-500">
              ID: {(row.log_id || row.id).toString()}
            </span>
          </div>
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
          >
            <Eye className="w-3 h-3" />
            <span>{isExpanded ? 'Hide Details' : 'View Details'}</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <HeaderMainContent
        title="Activity Logs"
        description="System-wide audit trail of actions and events"
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Tabs for quick scoping */}
            <TabContainer
              activeTab={activeTab}
              onTabChange={setActiveTab}
              variant="underline"
              size="md"
            >
              <Tab id="all" label="All Logs" shortLabel="All" count={tabCounts.total} color="blue" />
              <Tab id="admin" label="Admin" count={tabCounts.admin} color="purple" />
              <Tab id="staff" label="Staff" count={tabCounts.staff} color="pink" />
              <Tab id="sk" label="SK Officials" shortLabel="SK" count={tabCounts.sk} color="green" />
              <Tab id="youth" label="Youth" count={tabCounts.youth} color="yellow" />
            </TabContainer>

            <div className="px-5 py-4 border-t border-gray-100">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 overflow-x-auto pb-2 md:pb-0">
                  <SearchBar
                    value={search}
                    onChange={setSearch}
                    placeholder="Search actions, users, resources..."
                    expandOnMobile={true}
                    showIndicator={true}
                    indicatorText="Search"
                    indicatorColor="blue"
                    size="md"
                    debounceMs={300}
                  />

                  <button
                    ref={filterTriggerRef}
                    onClick={() => setShowFilterModal(true)}
                    className={`inline-flex items-center border rounded-lg font-medium transition-all duration-200 ${
                      showFilterModal || hasActiveFilters ? 'border-blue-500 text-blue-600 bg-blue-50' : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                    } px-2 py-1.5 sm:px-3 sm:py-2 whitespace-nowrap`}
                  >
                    <FilterIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Filter</span>
                    <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1" />
                    {hasActiveFilters && (
                      <div className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full border border-blue-200">
                        {Object.values(filters).filter(Boolean).length}
                      </div>
                    )}
                  </button>

                  <button
                    ref={sortModal.triggerRef}
                    onClick={sortModal.toggleModal}
                    className={`inline-flex items-center border rounded-lg font-medium transition-all duration-200 ${
                      sortModal.isOpen || !sortModal.isDefaultSort ? 'border-blue-500 text-blue-600 bg-blue-50' : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                    } px-2 py-1.5 sm:px-3 sm:py-2 whitespace-nowrap`}
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

                <div className="flex items-center gap-3">
                  <ExportButton
                    formats={['csv','xlsx','pdf']}
                    onExport={(fmt) => console.log('Export logs as', fmt)}
                    label="Export"
                    size="md"
                  />

                  {/* View mode toggle */}
                  <div className="flex items-center border border-gray-200 rounded-lg p-1">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-1.5 rounded transition-all duration-200 ${
                        viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      <Grid className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-1.5 rounded transition-all duration-200 ${
                        viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {loading ? (
              <LoadingSpinner variant="spinner" message="Loading activity logs..." size="md" color="blue" height="h-64" />
            ) : viewMode === 'list' ? (
              <div className="overflow-hidden">
                {logs.length === 0 ? (
                  <div className="text-center text-sm text-gray-500 py-10">No activity logs found</div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {/* Table Header */}
                    <div className="bg-gray-50 px-5 py-3 grid grid-cols-12 gap-4 text-xs font-medium text-gray-600 uppercase tracking-wider">
                      <div className="col-span-4">Activity</div>
                      <div className="col-span-3">Category & Tags</div>
                      <div className="col-span-2">Status</div>
                      <div className="col-span-2">Timestamp</div>
                      <div className="col-span-1">Actions</div>
                    </div>
                    {/* Table Rows */}
                    {logs.map((row) => (
                      <div key={row.log_id || row.id} className="px-5 py-2 grid grid-cols-12 gap-4 hover:bg-blue-50/30 hover:border-l-4 hover:border-l-blue-400 transition-all duration-200">
                        <div className="col-span-4">{columns.activity(row)}</div>
                        <div className="col-span-3">{columns.category(row)}</div>
                        <div className="col-span-2">{columns.status(row)}</div>
                        <div className="col-span-2">{columns.timestamp(row)}</div>
                        <div className="col-span-1">{columns.actions(row)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-5 pt-0">
                {logs.length === 0 ? (
                  <div className="col-span-full text-center text-sm text-gray-500 py-10">No activity logs found</div>
                ) : (
                  logs.map((row) => (
                    <ActivityLogCard key={row.log_id || row.id} row={row} />
                  ))
                )}
              </div>
            )}

            <Pagination
              currentPage={page}
              totalItems={logs?.length || 0}
              itemsPerPage={perPage}
              onPageChange={setPage}
              onItemsPerPageChange={setPerPage}
              itemName="log"
              itemNamePlural="logs"
              size="md"
              variant="default"
              itemsPerPageOptions={[10,20,50]}
            />
          </div>
        </div>

        {/* Right Column - Stats */}
        <div className="xl:col-span-1 space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Activity Statistics</h3>
                  <p className="text-xs text-gray-600">System activity overview</p>
                </div>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{logs.length}</div>
                  <div className="text-xs text-gray-600">Total Logs</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-600">{logs.filter(l => l.success).length}</div>
                  <div className="text-xs text-gray-600">Successful</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{Math.max(0, logs.length - logs.filter(l => l.success).length)}</div>
                  <div className="text-xs text-gray-600">Failed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{new Set(logs.map(l => (l.user_id || l.user_name || '').toString())).size}</div>
                  <div className="text-xs text-gray-600">Active Users</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ToastContainer position="top-right" maxToasts={5} />

      <FilterModal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        title="Filter Logs"
        triggerRef={filterTriggerRef}
        filters={[
          { id: 'userType', label: 'User Type', type: 'select', options: [
            { value: '', label: 'All Users' },
            { value: 'admin', label: 'Admin' },
            { value: 'lydo_staff', label: 'Staff' },
            { value: 'sk_official', label: 'SK Officials' },
            { value: 'youth', label: 'Youth' },
          ] },
          { id: 'category', label: 'Category', type: 'select', options: [
            { value: '', label: 'All Categories' },
            { value: 'Authentication', label: 'Authentication' },
            { value: 'User Management', label: 'User Management' },
            { value: 'Survey Management', label: 'Survey Management' },
            { value: 'Announcement', label: 'Announcement' },
            { value: 'Activity Log', label: 'Activity Log' },
            { value: 'Data Export', label: 'Data Export' },
            { value: 'Data Management', label: 'Data Management' },
            { value: 'System Management', label: 'System Management' },
          ] },
          { id: 'status', label: 'Status', type: 'select', options: [
            { value: '', label: 'All Status' },
            { value: 'success', label: 'Success' },
            { value: 'error', label: 'Error' },
          ] },
          { id: 'dateFrom', label: 'Date From', type: 'date' },
          { id: 'dateTo', label: 'Date To', type: 'date' },
        ]}
        values={filters}
        onChange={setFilters}
        onApply={(v) => { setFilters(v); setShowFilterModal(false); }}
        onClear={() => setFilters({ category:'', status:'', dateFrom:'', dateTo:'', userType:'' })}
      />

      <SortModal
        isOpen={sortModal.isOpen}
        onClose={sortModal.closeModal}
        triggerRef={sortModal.triggerRef}
        title="Sort Logs"
        sortFields={[
          { value: 'created_at', label: 'Date' },
          { value: 'user_type', label: 'User Type' },
          { value: 'category', label: 'Category' },
        ]}
        sortBy={sortModal.sortBy}
        sortOrder={sortModal.sortOrder}
        onSortChange={sortModal.updateSort}
        onReset={sortModal.resetSort}
        defaultSortBy="created_at"
        defaultSortOrder="desc"
      />
    </div>
  );
};

export default ActivityLogs;