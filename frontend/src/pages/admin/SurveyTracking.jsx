import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Filter,
  Calendar,
  Users,
  TrendingUp,
  AlertCircle,
  BarChart3,
  MapPin,
  CheckCircle2,
  XCircle,
  FileText,
  Download,
  ChevronDown,
  ChevronRight,
  Target,
  Activity,
  Building2,
  X,
  Mail,
  Phone,
  User,
  Eye,
  CheckCircle,
  Clock
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
import surveyTrackingService from '../../services/surveyTrackingService';
import api from '../../services/api';

const SurveyTracking = () => {
  // Tab state
  const { activeTab, setActiveTab } = useTabState('all');

  // UI state
  const [barangayYouth, setBarangayYouth] = useState([]);
  const [currentBatch, setCurrentBatch] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBarangay, setSelectedBarangay] = useState(null);
  const [expandedBarangays, setExpandedBarangays] = useState(new Set());

  // Sort modal (disabled - not used in barangay view)
  // const sortModal = useSortModal('last_name', 'asc');

  // Filter modal (disabled for now)
  const filterModal = useFilterModal({
    filters: [],
    onFilterChange: () => {}
  });

  // Statistics state
  const [stats, setStats] = useState({
    totalBarangays: 0,
    totalYouth: 0,
    totalParticipated: 0,
    totalNotParticipated: 0,
    overallParticipationRate: 0
  });

  // Load barangay youth data
  const loadBarangayYouth = async () => {
    try {
      setIsLoading(true);

      const result = await surveyTrackingService.getBarangayYouth();
      
      if (result.success && result.data) {
        setBarangayYouth(result.data.data || []);
        setCurrentBatch(result.data.currentBatch || null);
        
        if (result.data.statistics) {
          setStats(result.data.statistics);
        }

        // Auto-expand first barangay if none selected
        if (expandedBarangays.size === 0 && result.data.data && result.data.data.length > 0) {
          setExpandedBarangays(new Set([result.data.data[0].barangayId]));
        }
      }
    } catch (error) {
      console.error('Error loading barangay youth:', error);
      showErrorToast('Error', 'Failed to load barangay youth data');
    } finally {
      setIsLoading(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    loadBarangayYouth();
  }, []);

  // Filter barangay youth based on active tab and search
  const getFilteredBarangayYouth = () => {
    let filtered = [...barangayYouth];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.map(barangay => ({
        ...barangay,
        youth: barangay.youth.filter(y => 
          y.fullName.toLowerCase().includes(query) ||
          y.youthId.toLowerCase().includes(query) ||
          (y.barangayName && y.barangayName.toLowerCase().includes(query))
        )
      })).filter(barangay => barangay.youth.length > 0);
    }

    // Filter by tab
    if (activeTab === 'participated') {
      filtered = filtered.map(barangay => ({
        ...barangay,
        youth: barangay.youth.filter(y => y.participatedInCurrent)
      })).filter(barangay => barangay.youth.length > 0);
    } else if (activeTab === 'not-participated') {
      filtered = filtered.map(barangay => ({
        ...barangay,
        youth: barangay.youth.filter(y => !y.participatedInCurrent)
      })).filter(barangay => barangay.youth.length > 0);
    }

    return filtered;
  };

  // Toggle barangay expansion
  const toggleBarangay = (barangayId) => {
    setExpandedBarangays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(barangayId)) {
        newSet.delete(barangayId);
      } else {
        newSet.add(barangayId);
      }
      return newSet;
    });
  };

  // Calculate statistics for display (use all barangay data, not filtered)
  const getBarangayStats = useMemo(() => {
    return barangayYouth.map(b => ({
      ...b,
      participatedInCurrent: b.youth.filter(y => y.participatedInCurrent).length,
      notParticipatedInCurrent: b.youth.filter(y => !y.participatedInCurrent).length
    }));
  }, [barangayYouth]);

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
  const buildYouthCsvRows = (barangayData) => {
    const headers = ['Barangay', 'Youth ID', 'Name', 'Age', 'Gender', 'Participated in Current Survey'];
    const rows = [];
    barangayData.forEach(barangay => {
      barangay.youth.forEach(youth => {
        rows.push([
          barangay.barangayName || '',
          youth.youthId || '',
          youth.fullName || '',
          youth.age || '',
          youth.gender || '',
          youth.participatedInCurrent ? 'Yes' : 'No'
        ]);
      });
    });
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

  // Export hook
  const mainExport = useExport({
    exportFunction: async (format) => {
      const dataset = getFilteredBarangayYouth();
      if (!dataset || dataset.length === 0) throw new Error('No youth data to export');
      const ts = new Date().toISOString().replace(/[:T]/g,'-').split('.')[0];
      if (format === 'pdf') {
        const rows = buildYouthCsvRows(dataset);
        openPrintPdf('Youth Participation by Barangay', rows[0], rows);
        return { success: true };
      }
      if (format === 'excel' || format === 'xlsx') {
        const rows = buildYouthCsvRows(dataset);
        const xml = buildExcelXml('Youth Participation', rows);
        downloadFile(new Blob([xml], { type: 'application/vnd.ms-excel' }), `youth-participation-${ts}.xls`);
        return { success: true };
      }
      const rows = buildYouthCsvRows(dataset);
      downloadCsv(`youth-participation-${ts}.csv`, rows);
      return { success: true };
    },
    onSuccess: () => showSuccessToast('Export Successful', 'Youth participation data exported successfully'),
    onError: (error) => showErrorToast('Export Failed', error.message)
  });

  // Determine if there are active filters
  const hasActiveFilters = useMemo(() => {
    const values = filterModal.filterValues || {};
    return Object.values(values).some(val => val !== undefined && val !== null && val !== '');
  }, [filterModal.filterValues]);

  // Handle search change
  const handleSearchChange = (newQuery) => {
    setSearchQuery(newQuery);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <HeaderMainContent 
        title="Survey Tracking" 
        description="Track youth participation by barangay. See which youth answered the current survey and identify areas needing follow-up."
      />

      {/* Activity Status Banner */}
      {currentBatch && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Target className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Current Survey Batch</h3>
                <p className="text-sm text-gray-700">
                  {currentBatch.batchName} • {new Date(currentBatch.startDate).toLocaleDateString()} - {new Date(currentBatch.endDate).toLocaleDateString()}
                </p>
              </div>
            </div>
            <Status status="active" />
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column - Youth List */}
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
                label="All Youth" 
                count={stats.totalYouth} 
                color="blue"
              />
              <Tab 
                id="participated" 
                label="Participated" 
                count={stats.totalParticipated} 
                color="green"
              />
              <Tab 
                id="not-participated" 
                label="Not Participated" 
                count={stats.totalNotParticipated} 
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
                    placeholder="Search by name, youth ID..." 
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

            {/* Sort Modal - Disabled for now as we're grouping by barangay */}
            {/* <SortModal
              isOpen={sortModal.isOpen}
              onClose={sortModal.closeModal}
              triggerRef={sortModal.triggerRef}
              title="Sort Options"
              sortFields={[
                { value: 'barangay_name', label: 'Barangay Name' },
                { value: 'participation_rate', label: 'Participation Rate' },
                { value: 'total_youth', label: 'Total Youth' }
              ]}
              sortBy={sortModal.sortBy}
              sortOrder={sortModal.sortOrder}
              onSortChange={sortModal.updateSort}
              onReset={sortModal.resetSort}
              defaultSortBy="barangay_name"
              defaultSortOrder="asc"
            /> */}

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
                    message="Loading youth participation data..." 
                    size="md"
                    color="blue"
                    height="h-64"
                  />
                </div>
              ) : (
                <>
                  {getFilteredBarangayYouth().length === 0 ? (
                    <div className="p-12 text-center">
                      <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No barangay data found</p>
                    </div>
                  ) : (
                    <>
                      {/* Barangay List with Youth */}
                      <div className="p-5 space-y-4">
                        {getFilteredBarangayYouth().map((barangay) => {
                          const isExpanded = expandedBarangays.has(barangay.barangayId);
                          const participatedYouth = barangay.youth.filter(y => y.participatedInCurrent);
                          const notParticipatedYouth = barangay.youth.filter(y => !y.participatedInCurrent);

                          return (
                            <div 
                              id={`barangay-${barangay.barangayId}`}
                              key={barangay.barangayId} 
                              className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:border-gray-300 hover:shadow-md transition-all duration-200"
                            >
                              {/* Barangay Header */}
                              <button
                                onClick={() => toggleBarangay(barangay.barangayId)}
                                className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                              >
                                <div className="flex items-center space-x-4 flex-1">
                                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                    <Building2 className="w-5 h-5 text-blue-600" />
                                  </div>
                                  <div className="flex-1 text-left">
                                    <div className="flex items-center space-x-3 mb-1">
                                      <h3 className="text-lg font-semibold text-gray-900">{barangay.barangayName}</h3>
                                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                        {barangay.totalYouth} youth
                                      </span>
                                    </div>
                                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                                      <div className="flex items-center space-x-1">
                                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                                        <span>{barangay.participatedCount} participated</span>
                                      </div>
                                      <div className="flex items-center space-x-1">
                                        <XCircle className="w-4 h-4 text-red-500" />
                                        <span>{barangay.notParticipatedCount} not participated</span>
                                      </div>
                                      <div className="flex items-center space-x-1">
                                        <TrendingUp className="w-4 h-4 text-blue-600" />
                                        <span>{barangay.participationRate}% rate</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <div className="w-32 bg-gray-200 rounded-full h-2">
                                    <div 
                                      className={`h-2 rounded-full transition-all ${
                                        barangay.participationRate >= 70 ? 'bg-green-500' :
                                        barangay.participationRate >= 50 ? 'bg-yellow-500' :
                                        'bg-red-500'
                                      }`}
                                      style={{ width: `${Math.min(Math.max(barangay.participationRate, 0), 100)}%` }}
                                    ></div>
                                  </div>
                                  {isExpanded ? (
                                    <ChevronDown className="w-5 h-5 text-gray-400" />
                                  ) : (
                                    <ChevronRight className="w-5 h-5 text-gray-400" />
                                  )}
                                </div>
                              </button>

                              {/* Youth List - Expandable */}
                              {isExpanded && (
                                <div className="border-t border-gray-100 bg-gray-50">
                                  <div className="p-4 space-y-3 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                                    {/* Participated Youth */}
                                    {participatedYouth.length > 0 && (
                                      <div>
                                        <div className="flex items-center space-x-2 mb-2">
                                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                                          <h4 className="text-sm font-semibold text-gray-900">
                                            Participated ({participatedYouth.length})
                                          </h4>
                                        </div>
                                        <div className="space-y-2">
                                          {participatedYouth.map((youth) => (
                                            <div 
                                              key={youth.youthId}
                                              className="bg-white border border-green-200 rounded-lg p-3 hover:bg-green-50 transition-colors"
                                            >
                                              <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                  <div className="font-medium text-gray-900">{youth.fullName}</div>
                                                  <div className="text-xs text-gray-600 mt-1">
                                                    {youth.age} years old • {youth.gender} • {youth.purokZone || 'N/A'}
                                                  </div>
                                                </div>
                                                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Not Participated Youth */}
                                    {notParticipatedYouth.length > 0 && (
                                      <div>
                                        <div className="flex items-center space-x-2 mb-2">
                                          <XCircle className="w-4 h-4 text-red-600" />
                                          <h4 className="text-sm font-semibold text-gray-900">
                                            Not Participated ({notParticipatedYouth.length})
                                          </h4>
                                        </div>
                                        <div className="space-y-2">
                                          {notParticipatedYouth.map((youth) => (
                                            <div 
                                              key={youth.youthId}
                                              className="bg-white border border-red-200 rounded-lg p-3 hover:bg-red-50 transition-colors"
                                            >
                                              <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                  <div className="font-medium text-gray-900">{youth.fullName}</div>
                                                  <div className="text-xs text-gray-600 mt-1">
                                                    {youth.age} years old • {youth.gender} • {youth.purokZone || 'N/A'}
                                                  </div>
                                                </div>
                                                <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {barangay.youth.length === 0 && (
                                      <div className="text-center py-4 text-gray-500 text-sm">
                                        No youth found in this barangay
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
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
          {/* Overall Statistics */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Overall Statistics</h3>
                  <p className="text-xs text-gray-600">Current survey participation</p>
                </div>
              </div>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-2xl font-bold text-green-600">{stats.totalParticipated}</div>
                  <div className="text-xs text-gray-600 mt-1">Participated</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="text-2xl font-bold text-red-600">{stats.totalNotParticipated}</div>
                  <div className="text-xs text-gray-600 mt-1">Not Participated</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Youth</span>
                  <span className="font-medium text-gray-900">{stats.totalYouth}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Barangays</span>
                  <span className="font-medium text-gray-900">{stats.totalBarangays}</span>
                </div>
                
                {stats.totalYouth > 0 && (
                  <div className="pt-2 border-t border-gray-100">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">Participation Rate</span>
                      <span className="text-sm font-semibold text-blue-600">
                        {stats.overallParticipationRate}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${stats.overallParticipationRate}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* By Barangay Stats */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-green-50 to-emerald-50">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">By Barangay</h3>
                  <p className="text-xs text-gray-600">Participation breakdown</p>
                </div>
              </div>
            </div>
            
            <div className="p-5 space-y-3 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              {getBarangayStats
                .sort((a, b) => b.participationRate - a.participationRate)
                .map((barangay) => (
                  <div 
                    key={barangay.barangayId} 
                    className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedBarangay(barangay.barangayId);
                      if (!expandedBarangays.has(barangay.barangayId)) {
                        toggleBarangay(barangay.barangayId);
                      }
                      // Scroll to barangay in main list
                      const element = document.getElementById(`barangay-${barangay.barangayId}`);
                      if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }
                    }}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-900 truncate">{barangay.barangayName}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                        barangay.participationRate >= 70 ? 'bg-green-100 text-green-700' :
                        barangay.participationRate >= 50 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {barangay.participationRate}%
                      </span>
                    </div>
                    <div className="space-y-1 text-xs text-gray-600">
                      <div className="flex justify-between">
                        <span>Total:</span>
                        <span className="font-medium">{barangay.totalYouth}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Participated:</span>
                        <span className="font-medium text-green-600">{barangay.participatedCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Not Participated:</span>
                        <span className="font-medium text-red-600">{barangay.notParticipatedCount}</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                      <div 
                        className={`h-1.5 rounded-full transition-all ${
                          barangay.participationRate >= 70 ? 'bg-green-500' :
                          barangay.participationRate >= 50 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(Math.max(barangay.participationRate, 0), 100)}%` }}
                      ></div>
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

export default SurveyTracking;
