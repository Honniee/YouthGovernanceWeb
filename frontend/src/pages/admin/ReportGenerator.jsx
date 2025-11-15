import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Settings, 
  BarChart3, 
  Users, 
  Calendar,
  MapPin,
  Shield,
  Activity,
  TrendingUp,
  Filter,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Eye,
  FileSpreadsheet,
  FileDown,
  ArrowUpDown
} from 'lucide-react';

import { HeaderMainContent, LoadingSpinner, ExportButton, useExport, CollapsibleForm } from '../../components/portal_main_content';
import { ToastContainer, showSuccessToast, showErrorToast } from '../../components/universal';
import surveyBatchesService from '../../services/surveyBatchesService.js';
import skTermsService from '../../services/skTermsService.js';
import skService from '../../services/skService.js';
import staffService from '../../services/staffService.js';
import youthService from '../../services/youthService.js';
import api from '../../services/api.js';
import logger from '../../utils/logger.js';

// Configuration Wizard Component
const ConfigurationWizard = ({
  selectedReportType,
  reportConfig,
  isGenerating,
  onConfigChange,
  onGenerate,
  renderConfigForm,
  renderDataFilters,
  renderExportOptions
}) => {
  const [activeTab, setActiveTab] = useState('settings');

  const tabs = [
    { id: 'settings', label: 'Report Settings', icon: Settings },
    { id: 'filters', label: 'Data Filters', icon: Filter },
    { id: 'export', label: 'Export Options', icon: FileDown }
  ];

  // Safety check
  if (!selectedReportType) {
    return null;
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Configure Report</h3>
        <p className="text-sm text-gray-500">{selectedReportType?.description || ''}</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px space-x-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 pb-3 px-1 border-b-2 transition-colors ${
                  isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 min-h-[300px]">
        {activeTab === 'settings' && (
          <div className="space-y-6">
            {renderConfigForm()}
          </div>
        )}

        {activeTab === 'filters' && (
          <div className="space-y-6">
            {renderDataFilters()}
          </div>
        )}

        {activeTab === 'export' && (
          <div className="space-y-6">
            {renderExportOptions()}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-2">
        <div className="text-sm text-gray-500">
          {activeTab === 'settings' && 'Step 1 of 3: Configure report settings'}
          {activeTab === 'filters' && 'Step 2 of 3: Apply data filters (optional)'}
          {activeTab === 'export' && 'Step 3 of 3: Choose export options'}
        </div>
        
        <div className="flex items-center space-x-3">
          {activeTab !== 'settings' && (
            <button
              onClick={() => {
                const currentIndex = tabs.findIndex(t => t.id === activeTab);
                if (currentIndex > 0) setActiveTab(tabs[currentIndex - 1].id);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Previous
            </button>
          )}
          
          {activeTab !== 'export' ? (
            <button
              onClick={() => {
                const currentIndex = tabs.findIndex(t => t.id === activeTab);
                if (currentIndex < tabs.length - 1) setActiveTab(tabs[currentIndex + 1].id);
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Next
            </button>
          ) : (
            <button
              onClick={onGenerate}
              disabled={isGenerating}
              className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shadow-sm transition-all"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <BarChart3 className="w-4 h-4" />
                  <span>Generate Report</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const ReportGenerator = () => {
  const [selectedReportType, setSelectedReportType] = useState(null);
  const [reportConfig, setReportConfig] = useState({
    startDate: '',
    endDate: '',
    exportFormat: 'csv',
    sortBy: 'created_at',
    sortOrder: 'desc',
    limit: 1000,
    includeSummary: true,
    batchId: '',
    batchIds: [], // Array for multiple batch selection
    allBatches: false, // Flag for "all batches" option
    termId: '',
    termIds: [], // Array for multiple term selection
    allTerms: false, // Flag for "all terms" option
    barangay: '',
    barangayIds: [], // Array for multiple barangay selection
    allBarangays: false, // Flag for "all barangays" option
    positionIds: [], // Array for multiple position selection
    allPositions: false, // Flag for "all positions" option
    fillStatus: 'all', // Filled/Vacant filter: 'all', 'filled', 'vacant'
    activeStatusIds: [], // Array for multiple active status selection: 'active', 'inactive'
    allActiveStatus: false, // Flag for "all active status" option
    staffStatusIds: [], // Array for multiple staff status selection: 'active', 'inactive'
    allStaffStatus: false, // Flag for "all staff status" option
    youthStatusIds: [], // Array for multiple youth status selection: 'active', 'inactive'
    allYouthStatus: false, // Flag for "all youth status" option
    surveyBatchStatusIds: [], // Array for multiple survey batch status selection: 'validated', 'pending', 'rejected'
    allSurveyBatchStatus: false, // Flag for "all survey batch status" option
    activityLogUserTypeIds: [], // Array for multiple user type selection: 'admin', 'lydo_staff', 'sk_official', 'youth', 'anonymous'
    allActivityLogUserTypes: false, // Flag for "all user types" option
    activityLogCategoryIds: [], // Array for multiple category selection
    allActivityLogCategories: false, // Flag for "all categories" option
    activityLogSuccessIds: [], // Array for multiple success status selection: 'success', 'failed'
    allActivityLogSuccess: false // Flag for "all success status" option
  });
  const [generatedData, setGeneratedData] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [barangays, setBarangays] = useState([]);
  const [batches, setBatches] = useState([]);
  const [terms, setTerms] = useState([]);
  const [positions, setPositions] = useState([]);
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [availableColumns, setAvailableColumns] = useState([]);

  // Report type definitions
  const reportTypes = [
    {
      id: 'survey_batch',
      name: 'Survey Batch Report',
      description: 'Detailed statistics and responses for survey batches',
      icon: FileText,
      category: 'Survey',
      color: 'blue'
    },
    {
      id: 'sk_term',
      name: 'SK Term Report',
      description: 'Governance statistics and vacancy reports for SK terms',
      icon: Shield,
      category: 'Governance',
      color: 'indigo'
    },
    {
      id: 'staff',
      name: 'Staff Report',
      description: 'LYDO staff member listing and statistics',
      icon: Users,
      category: 'Users',
      color: 'green'
    },
    {
      id: 'youth',
      name: 'Youth Report',
      description: 'Registered youth demographics and statistics',
      icon: Users,
      category: 'Users',
      color: 'teal'
    },
    {
      id: 'activity_logs',
      name: 'Activity Logs',
      description: 'System activity and audit logs',
      icon: Activity,
      category: 'System',
      color: 'gray'
    }
  ];

  useEffect(() => {
    loadBarangays();
    loadBatches();
    loadTerms();
  }, []);

  const loadBarangays = async () => {
    try {
      const response = await api.get('/barangays');
      if (response.data?.success) {
        setBarangays(response.data.data || []);
      }
    } catch (error) {
      logger.error('Failed to load barangays', error);
    }
  };

  const loadBatches = async () => {
    try {
      logger.debug('ReportGenerator - Loading batches');
      const response = await surveyBatchesService.getSurveyBatches({ limit: 1000 });
      logger.debug('ReportGenerator - Batch response', { response });
      
      if (response.success) {
        // Match the structure used in SurveyBatch.jsx
        const batchData = response.data?.data || [];
        logger.debug('ReportGenerator - Batch data', { batchData, count: batchData.length });
        
        if (Array.isArray(batchData) && batchData.length > 0) {
          // Filter out draft batches - only include active and closed batches
          const filteredBatches = batchData.filter(batch => {
            const status = batch.status?.toLowerCase() || '';
            return status !== 'draft';
          });
          
          logger.debug('ReportGenerator - Filtered batches (excluding draft)', { count: filteredBatches.length });
          setBatches(filteredBatches);
        } else {
          setBatches([]);
          logger.debug('ReportGenerator - No batches found');
        }
      } else {
        logger.error('ReportGenerator - Failed to load batches', null, { message: response.message });
        setBatches([]);
      }
    } catch (error) {
      logger.error('ReportGenerator - Error loading batches', error);
      setBatches([]);
      showErrorToast('Failed to load batches', 'Could not fetch survey batches. Please refresh the page.');
    }
  };

  const loadTerms = async () => {
    try {
      const response = await skTermsService.getSKTerms({ limit: 1000 });
      if (response.success) {
        const termData = response.data?.data?.terms || response.data?.terms || [];
        
        // Filter out upcoming terms - only include active and closed terms
        const filteredTerms = termData.filter(term => {
          const status = term.status?.toLowerCase() || '';
          return status !== 'upcoming' && status !== 'draft';
        });
        
        setTerms(filteredTerms);
      }
    } catch (error) {
      logger.error('Failed to load terms', error);
    }
  };

  const handleReportTypeSelect = (reportType) => {
    setSelectedReportType(reportType);
    setReportConfig({
      startDate: '',
      endDate: '',
      exportFormat: 'csv',
      sortBy: 'created_at',
      sortOrder: 'desc',
      limit: 1000,
      includeSummary: true,
      batchId: '',
      batchIds: [],
      allBatches: false,
      termId: '',
      termIds: [],
      allTerms: false,
      barangay: '',
      barangayIds: [],
      allBarangays: false,
      positionIds: [],
      allPositions: false,
      fillStatus: 'all',
      activeStatusIds: [],
      allActiveStatus: false,
      staffStatusIds: [],
      allStaffStatus: false,
      youthStatusIds: [],
      allYouthStatus: false,
      surveyBatchStatusIds: [],
      allSurveyBatchStatus: false,
      activityLogUserTypeIds: [],
      allActivityLogUserTypes: false,
      activityLogCategoryIds: [],
      allActivityLogCategories: false,
      activityLogSuccessIds: [],
      allActivityLogSuccess: false
    });
    setGeneratedData(null);
    setSelectedColumns([]);
    setAvailableColumns([]);
    
    // Reload batches if survey batch is selected
    if (reportType.id === 'survey_batch') {
      loadBatches();
    }
    // Reload terms if SK term is selected
    if (reportType.id === 'sk_term') {
      loadTerms();
      // Initialize positions from static SK positions list
      const skPositions = [
        'SK Chairperson',
        'SK Secretary',
        'SK Treasurer',
        'SK Councilor'
      ];
      setPositions(skPositions.map(p => ({ name: p })));
    }
  };

  const handleConfigChange = (key, value) => {
    setReportConfig(prev => ({ ...prev, [key]: value }));
  };

  const generateReport = async () => {
    if (!selectedReportType) return;

    setIsGenerating(true);
    try {
      let data = null;

      switch (selectedReportType.id) {
        case 'survey_batch':
          // Validate selection
          if (!reportConfig.allBatches && (!reportConfig.batchIds || reportConfig.batchIds.length === 0)) {
            showErrorToast('Configuration required', 'Please select at least one survey batch or select "All Batches"');
            setIsGenerating(false);
            return;
          }
          
          // Get list of batch IDs to process
          const batchIdsToProcess = reportConfig.allBatches 
            ? batches.map(b => b.batchId || b.batch_id).filter(Boolean)
            : reportConfig.batchIds;
          
          if (batchIdsToProcess.length === 0) {
            showErrorToast('Configuration required', 'No batches selected');
            setIsGenerating(false);
            return;
          }
          
          logger.debug('Processing batches', { count: batchIdsToProcess.length, batchIds: batchIdsToProcess });
          
          // Fetch data for all selected batches
          const allBatches = [];
          const allResponses = [];
          const allStatistics = [];
          
          for (const batchId of batchIdsToProcess) {
            try {
              // Fetch batch info
              const batchResp = await surveyBatchesService.getSurveyBatchById(batchId, true);
              if (batchResp.success) {
                const batch = batchResp.data?.data || batchResp.data;
                allBatches.push(batch);
                
                // Fetch statistics
                const statsResp = await surveyBatchesService.getBatchStatistics(batchId);
                if (statsResp.success) {
                  allStatistics.push({
                    batchId: batchId,
                    batchName: batch.batchName || batch.batch_name,
                    ...statsResp.data
                  });
                }
                
                // Fetch responses
                // Don't filter by barangay in API call if multiple barangays selected - filter client-side instead
                const barangayFilter = reportConfig.allBarangays || reportConfig.barangayIds.length === 0 
                  ? undefined 
                  : reportConfig.barangayIds.length === 1 
                    ? reportConfig.barangayIds[0] 
                    : undefined; // Multiple selected - filter client-side
                
                // Build status filter - if specific statuses selected, filter client-side
                // If all selected or none selected, pass undefined to API
                const surveyBatchStatusFilter = (!reportConfig.allSurveyBatchStatus && reportConfig.surveyBatchStatusIds.length > 0 && reportConfig.surveyBatchStatusIds.length === 1)
                  ? reportConfig.surveyBatchStatusIds[0] // Single status - use API filtering
                  : undefined; // Multiple or all - filter client-side
                
                const responsesResp = await surveyBatchesService.getBatchResponses(batchId, {
                  page: 1,
                  limit: reportConfig.limit || 10000,
                  status: surveyBatchStatusFilter,
                  search: reportConfig.search || undefined,
                  barangay: barangayFilter
                });
                
                // Handle different response structures
                if (responsesResp.success) {
                  const respData = responsesResp.data?.data || responsesResp.data;
                  let batchResponses = [];
                  
                  // Backend returns { data: [...], pagination: {...} }
                  if (respData?.data && Array.isArray(respData.data)) {
                    batchResponses = respData.data;
                  } else if (respData?.responses && Array.isArray(respData.responses)) {
                    batchResponses = respData.responses;
                  } else if (respData?.items && Array.isArray(respData.items)) {
                    batchResponses = respData.items;
                  } else if (Array.isArray(respData)) {
                    batchResponses = respData;
                  }
                  
                  logger.debug('ReportGenerator - Extracted batchResponses', { count: batchResponses.length, firstSample: batchResponses[0] });
                  
                  // Add batch info to each response
                  batchResponses = batchResponses.map(r => ({
                    ...r,
                    batchId: batchId,
                    batchName: batch.batchName || batch.batch_name
                  }));
                  
                // Filter by multiple barangays if specified (client-side filtering)
                if (!reportConfig.allBarangays && reportConfig.barangayIds.length > 1) {
                  batchResponses = batchResponses.filter(r => {
                    const responseBarangay = r.barangay_name || r.barangay || r.barangayName;
                    return reportConfig.barangayIds.includes(responseBarangay);
                  });
                }
                
                // Filter by status if multiple statuses selected or client-side filtering needed
                if (!reportConfig.allSurveyBatchStatus && reportConfig.surveyBatchStatusIds.length > 0) {
                  if (reportConfig.surveyBatchStatusIds.length === 3) {
                    // All three selected - no filtering needed (show all)
                  } else {
                    // Filter by selected status(es)
                    batchResponses = batchResponses.filter(r => {
                      const responseStatus = r.status || r.validation_status || 'pending';
                      return reportConfig.surveyBatchStatusIds.includes(responseStatus);
                    });
                  }
                }
                
                allResponses.push(...batchResponses);
              }
            }
            } catch (error) {
              logger.error(`Failed to load batch ${batchId}`, error);
              // Continue with other batches instead of failing completely
            }
          }
          
          if (allBatches.length === 0) {
            showErrorToast('Failed to load batches', 'Could not fetch any survey batches');
            setIsGenerating(false);
            return;
          }
          
          data = {
            type: 'survey_batch',
            batch: allBatches.length === 1 ? allBatches[0] : null, // Single batch or null for multiple
            batches: allBatches.length > 1 ? allBatches : null, // Multiple batches
            statistics: allStatistics.length > 0 ? allStatistics : null,
            responses: allResponses
          };
          break;

        case 'sk_term':
          // Validate selection
          if (!reportConfig.allTerms && (!reportConfig.termIds || reportConfig.termIds.length === 0)) {
            showErrorToast('Configuration required', 'Please select at least one SK term or select "All Terms"');
            setIsGenerating(false);
            return;
          }
          
          // Get list of term IDs to process
          const termIdsToProcess = reportConfig.allTerms 
            ? terms.map(t => t.id || t.term_id || t.termId).filter(Boolean)
            : reportConfig.termIds;
          
          if (termIdsToProcess.length === 0) {
            showErrorToast('Configuration required', 'No terms selected');
            setIsGenerating(false);
            return;
          }
          
          logger.debug('Processing SK terms', { count: termIdsToProcess.length, termIds: termIdsToProcess });
          
          // Fetch data for all selected terms
          const allTerms = [];
          const allVacancies = {};
          
          for (const termId of termIdsToProcess) {
            try {
              // Fetch term info
              const termResp = await skTermsService.getSKTermById(termId);
              if (termResp.success) {
                const term = termResp.data?.data || termResp.data;
                allTerms.push(term);
                
                // Fetch vacancies for this term (all barangays)
                const vacanciesResp = await skService.getAllBarangayVacancies(termId);
                logger.debug('SK Term Report - Vacancies response for term', { termId, response: vacanciesResp });
                if (vacanciesResp.success && vacanciesResp.data) {
                  // Merge vacancies data, adding term info to each entry
                  const termVacancies = vacanciesResp.data;
                  logger.debug('SK Term Report - Term vacancies data structure', { 
                    termVacancies, 
                    isObject: typeof termVacancies === 'object',
                    isArray: Array.isArray(termVacancies),
                    barangayKeys: Object.keys(termVacancies || {})
                  });
                  
                  // Backend structure: { [barangayId]: { barangayName, vacancies: { [position]: { current, max, available, ... } } } }
                  // Transform to: { [barangayName]: { [position]: positionData[] } }
                  if (typeof termVacancies === 'object' && !Array.isArray(termVacancies)) {
                    Object.entries(termVacancies).forEach(([barangayId, barangayData]) => {
                      logger.debug('SK Term Report - Processing barangay', { barangayId, barangayData });
                      const barangayName = barangayData.barangayName || barangayData.barangay_name || barangayId;
                      const positions = barangayData.vacancies || barangayData;
                      
                      logger.debug('SK Term Report - Barangay name and positions structure', { barangayName, positions });
                      
                      // Filter by selected barangays (use barangay name for filtering)
                      const shouldIncludeBarangay = reportConfig.allBarangays || 
                        reportConfig.barangayIds.length === 0 ||
                        reportConfig.barangayIds.includes(barangayName) ||
                        reportConfig.barangayIds.includes(barangayId);
                      
                      logger.debug('SK Term Report - Should include barangay?', {
                        shouldIncludeBarangay,
                        allBarangays: reportConfig.allBarangays,
                        barangayIds: reportConfig.barangayIds,
                        barangayName,
                        barangayId
                      });
                      
                      if (!shouldIncludeBarangay) return;
                      
                      if (!allVacancies[barangayName]) {
                        allVacancies[barangayName] = {};
                      }
                      
                      // Handle both structures: positions could be the vacancies object or directly the data
                      const positionsToProcess = positions.vacancies || positions;
                      logger.debug('SK Term Report - Positions to process', { 
                        positionsToProcess, 
                        positionKeys: Object.keys(positionsToProcess || {})
                      });
                      
                      if (!positionsToProcess || typeof positionsToProcess !== 'object') {
                        logger.warn('SK Term Report - No valid positions to process for barangay', null, { barangayName });
                        return;
                      }
                      
                      Object.entries(positionsToProcess).forEach(([position, positionData]) => {
                        logger.debug('SK Term Report - Processing position', { position, positionData });
                        // Filter by selected positions
                        const shouldIncludePosition = reportConfig.allPositions || 
                          reportConfig.positionIds.length === 0 ||
                          reportConfig.positionIds.includes(position);
                        
                        if (!shouldIncludePosition) return;
                        
                        if (!allVacancies[barangayName][position]) {
                          allVacancies[barangayName][position] = [];
                        }
                        
                        // Handle fill status filter (filled vs vacant)
                        // Position data structure from backend: { current, max, available, isFull }
                        const current = positionData.current || 0;
                        const max = positionData.max || 1;
                        const isFilled = current > 0;
                        const fillStatusFilter = reportConfig.fillStatus || 'all';
                        
                        // Filter by fill status
                        if (fillStatusFilter !== 'all') {
                          if (fillStatusFilter === 'filled' && !isFilled) return; // Skip vacant positions
                          if (fillStatusFilter === 'vacant' && isFilled) return; // Skip filled positions
                        }
                        
                        // For report generation, create a row entry for each position
                        // Vacancy data only has counts, not individual officials
                        const positionEntry = {
                          termId,
                          termName: term.termName || term.term_name,
                          position,
                          barangay: barangayName,
                          current,
                          max,
                          available: positionData.available || (max - current),
                          isFull: positionData.isFull || (current >= max),
                          status: isFilled ? 'filled' : 'vacant',
                          filled_date: positionData.filled_date || null,
                          name: positionData.name || (isFilled ? `${current} filled` : 'Vacant')
                        };
                        
                        // Add one entry per position (vacancy summary)
                        allVacancies[barangayName][position] = [positionEntry];
                      });
                    });
                  }
                }
              }
            } catch (error) {
              logger.error(`Failed to load term ${termId}`, error);
              // Continue with other terms instead of failing completely
            }
          }
          
          if (allTerms.length === 0) {
            showErrorToast('Failed to load terms', 'Could not fetch any SK terms');
            setIsGenerating(false);
            return;
          }
          
          // Count total positions for success message
          let totalPositions = 0;
          Object.values(allVacancies).forEach(positions => {
            totalPositions += Object.keys(positions).length;
          });
          
          logger.debug('SK Term Report - Summary', { 
            totalPositions, 
            vacanciesStructure: allVacancies, 
            numberOfTerms: allTerms.length 
          });
          
          data = {
            type: 'sk_term',
            term: allTerms.length === 1 ? allTerms[0] : null, // Single term or null for multiple
            terms: allTerms.length > 1 ? allTerms : null, // Multiple terms
            vacancies: Object.keys(allVacancies).length > 0 ? allVacancies : null
          };
          break;

        case 'staff':
          // Build status filter - if specific statuses selected, filter client-side
          // If all selected or none selected, pass undefined to API
          const staffStatusFilter = (!reportConfig.allStaffStatus && reportConfig.staffStatusIds.length > 0 && reportConfig.staffStatusIds.length < 2)
            ? reportConfig.staffStatusIds[0] // Single status - use API filtering
            : undefined; // Multiple or all - filter client-side
          
          const staffResp = await staffService.getStaffList({
            limit: reportConfig.limit || 10000,
            status: staffStatusFilter
          });
          if (staffResp.success) {
            // Handle paginated response
            let staffItems = staffResp.data?.items || staffResp.data?.staff || staffResp.data?.data?.items || [];
            
            // Filter by status if multiple statuses selected or client-side filtering needed
            if (!reportConfig.allStaffStatus && reportConfig.staffStatusIds.length > 0) {
              if (reportConfig.staffStatusIds.length === 2) {
                // Both selected - no filtering needed (show all)
              } else {
                // Filter by selected status(es)
                staffItems = staffItems.filter(item => {
                  const isActive = item.is_active !== undefined ? item.is_active : 
                                 (item.isActive !== undefined ? item.isActive : true);
                  const status = isActive ? 'active' : 'inactive';
                  return reportConfig.staffStatusIds.includes(status);
                });
              }
            }
            
            data = {
              type: 'staff',
              staff: Array.isArray(staffItems) ? staffItems : []
            };
          }
          break;

        case 'youth':
          // Handle single barangay filter via API, multiple via client-side filtering
          const youthBarangayFilter = reportConfig.allBarangays || reportConfig.barangayIds.length === 0 
            ? undefined 
            : reportConfig.barangayIds.length === 1 
              ? reportConfig.barangayIds[0] 
              : undefined;
          
          // Build status filter - if specific statuses selected, filter client-side
          // If all selected or none selected, pass undefined to API
          const youthStatusFilter = (!reportConfig.allYouthStatus && reportConfig.youthStatusIds.length > 0 && reportConfig.youthStatusIds.length < 2)
            ? reportConfig.youthStatusIds[0] // Single status - use API filtering
            : undefined; // Multiple or all - filter client-side
          
          const youthResp = await youthService.getYouth({
            limit: reportConfig.limit || 10000,
            barangay: youthBarangayFilter,
            ageMin: reportConfig.ageMin || undefined,
            ageMax: reportConfig.ageMax || undefined,
            status: youthStatusFilter
          });
          // Youth service returns data directly or in res.data format
          let youthData = youthResp?.data || youthResp?.items || (Array.isArray(youthResp) ? youthResp : []);
          
          // Filter by multiple barangays if specified (client-side filtering)
          if (!reportConfig.allBarangays && reportConfig.barangayIds.length > 1 && Array.isArray(youthData)) {
            youthData = youthData.filter(y => {
              const youthBarangay = y.barangay || y.barangayName || y.barangay_name || y.location;
              return reportConfig.barangayIds.includes(youthBarangay);
            });
          }
          
          // Filter by status if multiple statuses selected or client-side filtering needed
          if (!reportConfig.allYouthStatus && reportConfig.youthStatusIds.length > 0 && Array.isArray(youthData)) {
            if (reportConfig.youthStatusIds.length === 2) {
              // Both selected - no filtering needed (show all)
            } else {
              // Filter by selected status(es)
              youthData = youthData.filter(item => {
                const isActive = item.is_active !== undefined ? item.is_active : 
                               (item.isActive !== undefined ? item.isActive : true);
                const status = isActive ? 'active' : 'inactive';
                return reportConfig.youthStatusIds.includes(status);
              });
            }
          }
          
          if (Array.isArray(youthData) && youthData.length >= 0) {
            data = {
              type: 'youth',
              youth: youthData
            };
          }
          break;

        case 'activity_logs':
          // Build filter parameters
          const logParams = {
            perPage: reportConfig.limit || 1000,
            page: 1,
            sortBy: reportConfig.sortBy || 'created_at',
            sortOrder: reportConfig.sortOrder || 'desc'
          };

          // Date range filters
          if (reportConfig.startDate) logParams.dateFrom = reportConfig.startDate;
          if (reportConfig.endDate) logParams.dateTo = reportConfig.endDate;

          // User type filter (single selection for API, multiple filtered client-side)
          if (!reportConfig.allActivityLogUserTypes && reportConfig.activityLogUserTypeIds.length === 1) {
            logParams.userType = reportConfig.activityLogUserTypeIds[0];
          }

          // Category filter (single selection for API, multiple filtered client-side)
          if (!reportConfig.allActivityLogCategories && reportConfig.activityLogCategoryIds.length === 1) {
            logParams.category = reportConfig.activityLogCategoryIds[0];
          }

          // Success status filter (single selection for API, multiple filtered client-side)
          if (!reportConfig.allActivityLogSuccess && reportConfig.activityLogSuccessIds.length === 1) {
            logParams.success = reportConfig.activityLogSuccessIds[0] === 'success' ? 'true' : 'false';
          }

          const logsResp = await api.get('/activity-logs', { params: logParams });
          
          if (logsResp.data?.success) {
            let logs = logsResp.data.data || [];

            // Apply client-side filters for multiple selections
            // User type filter
            if (!reportConfig.allActivityLogUserTypes && reportConfig.activityLogUserTypeIds.length > 0) {
              if (reportConfig.activityLogUserTypeIds.length < 5) { // Not all selected
                logs = logs.filter(log => reportConfig.activityLogUserTypeIds.includes(log.user_type));
              }
            }

            // Category filter
            if (!reportConfig.allActivityLogCategories && reportConfig.activityLogCategoryIds.length > 0) {
              // Get unique categories from response to determine if all are selected
              const uniqueCategories = [...new Set(logs.map(log => log.category))];
              if (reportConfig.activityLogCategoryIds.length < uniqueCategories.length) {
                logs = logs.filter(log => reportConfig.activityLogCategoryIds.includes(log.category));
              }
            }

            // Success status filter
            if (!reportConfig.allActivityLogSuccess && reportConfig.activityLogSuccessIds.length > 0) {
              if (reportConfig.activityLogSuccessIds.length === 2) {
                // Both success and failed selected - no filtering needed
              } else {
                logs = logs.filter(log => {
                  const logSuccess = log.success === true || log.success === 'true';
                  return reportConfig.activityLogSuccessIds.includes(logSuccess ? 'success' : 'failed');
                });
              }
            }

            data = {
              type: 'activity_logs',
              logs: logs
            };
          }
          break;

        default:
          showErrorToast('Invalid report type', 'Selected report type is not supported');
          setIsGenerating(false);
          return;
      }

      setGeneratedData(data);
      
      // Initialize available columns based on report type
      const columns = getAvailableColumnsForReportType(selectedReportType.id, data);
      setAvailableColumns(columns);
      setSelectedColumns(columns.map(col => col.key)); // Select all columns by default
      
      // Generate success message with details
      let successMessage = 'Report data loaded successfully';
      if (selectedReportType.id === 'sk_term' && data.vacancies) {
        let positionCount = 0;
        Object.values(data.vacancies).forEach(positions => {
          positionCount += Object.keys(positions).length;
        });
        const termCount = data.terms ? data.terms.length : (data.term ? 1 : 0);
        successMessage = `Found ${positionCount} positions from ${termCount} term${termCount !== 1 ? 's' : ''}. Select columns and preview data below.`;
      } else if (selectedReportType.id === 'survey_batch' && data.responses) {
        const batchCount = data.batches ? data.batches.length : (data.batch ? 1 : 0);
        successMessage = `Found ${data.responses.length} responses from ${batchCount} batch${batchCount !== 1 ? 'es' : ''}. Select columns and preview data below.`;
      }
      
      showSuccessToast('Report generated successfully', successMessage);
    } catch (error) {
      showErrorToast('Generation failed', error.message || 'Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  // Get available columns for each report type
  const getAvailableColumnsForReportType = (reportTypeId, generatedData = null) => {
    switch (reportTypeId) {
      case 'survey_batch':
        const baseColumns = [
          { key: 'response_id', label: 'Response ID' },
          { key: 'name', label: 'Name' },
          { key: 'barangay', label: 'Barangay' },
          { key: 'age', label: 'Age' },
          { key: 'status', label: 'Status' },
          { key: 'submitted_at', label: 'Submitted Date' }
        ];
        // Add batch info columns if multiple batches are selected
        if (generatedData?.batches && generatedData.batches.length > 1) {
          return [
            { key: 'batchName', label: 'Batch Name' },
            { key: 'batchId', label: 'Batch ID' },
            ...baseColumns
          ];
        }
        return baseColumns;
      case 'sk_term':
        const skTermBaseColumns = [
          { key: 'barangay', label: 'Barangay' },
          { key: 'position', label: 'Position' },
          { key: 'status', label: 'Status' },
          { key: 'current', label: 'Current' },
          { key: 'max', label: 'Max' },
          { key: 'available', label: 'Available' },
          { key: 'filled_date', label: 'Filled Date' }
        ];
        // Add term info columns if multiple terms are selected
        if (generatedData?.terms && generatedData.terms.length > 1) {
          return [
            { key: 'termName', label: 'Term Name' },
            { key: 'termId', label: 'Term ID' },
            ...skTermBaseColumns
          ];
        }
        return skTermBaseColumns;
      case 'staff':
        return [
          { key: 'staff_id', label: 'Staff ID' },
          { key: 'name', label: 'Name' },
          { key: 'email', label: 'Email' },
          { key: 'status', label: 'Status' },
          { key: 'created_at', label: 'Created Date' }
        ];
      case 'youth':
        return [
          { key: 'youth_id', label: 'Youth ID' },
          { key: 'name', label: 'Name' },
          { key: 'age', label: 'Age' },
          { key: 'barangay', label: 'Barangay' },
          { key: 'gender', label: 'Gender' },
          { key: 'status', label: 'Status' }
        ];
      case 'activity_logs':
        return [
          { key: 'log_id', label: 'Log ID' },
          { key: 'created_at', label: 'Date & Time' },
          { key: 'user_id', label: 'User ID' },
          { key: 'user_type', label: 'User Type' },
          { key: 'category', label: 'Category' },
          { key: 'action', label: 'Action' },
          { key: 'resource_type', label: 'Resource Type' },
          { key: 'resource_id', label: 'Resource ID' },
          { key: 'resource_name', label: 'Resource Name' },
          { key: 'details', label: 'Details' },
          { key: 'success', label: 'Success' },
          { key: 'error_message', label: 'Error Message' }
        ];
      default:
        return [];
    }
  };

  // Export helpers
  const escapeCsv = (text) => {
    if (text == null) return '';
    const str = String(text);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const escapeHtml = (text) => {
    if (text == null) return '';
    const str = String(text);
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return str.replace(/[&<>"']/g, m => map[m]);
  };

  const downloadCsv = (filename, rows) => {
    const csvContent = rows.map(row => row.map(escapeCsv).join(',')).join('\n');
    const bom = '\uFEFF';
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const buildExcelXml = (headers, rows) => {
    const headerRow = `<Row>${headers.map(h => `<Cell><Data ss:Type="String">${escapeHtml(h)}</Data></Cell>`).join('')}</Row>`;
    const bodyRows = rows.map(row => 
      `<Row>${row.map(cell => `<Cell><Data ss:Type="String">${escapeHtml(cell)}</Data></Cell>`).join('')}</Row>`
    ).join('');
    
    return `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
<Worksheet ss:Name="Report">
<Table>
${headerRow}
${bodyRows}
</Table>
</Worksheet>
</Workbook>`;
  };

  const downloadExcel = (filename, xml) => {
    const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const openPrintPdf = (title, headers, rows) => {
    const timestamp = new Date().toLocaleString();
    const host = window.location.host;
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>${escapeHtml(title)}</title>
  <style>
    @media print {
      @page {
        size: A4 landscape;
        margin: 1cm;
      }
    }
    body {
      font-family: Arial, sans-serif;
      font-size: 10pt;
      color: black;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }
    .header {
      border-bottom: 2px solid #000;
      padding-bottom: 10px;
      margin-bottom: 15px;
    }
    .header h1 {
      margin: 0;
      font-size: 18pt;
    }
    .header .meta {
      font-size: 9pt;
      color: #666;
      margin-top: 5px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    th {
      background-color: #f3f4f6;
      border: 1px solid #000;
      padding: 8px;
      text-align: left;
      font-weight: bold;
    }
    td {
      border: 1px solid #000;
      padding: 6px;
    }
    tr:nth-child(even) {
      background-color: #f9fafb;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${escapeHtml(title)}</h1>
    <div class="meta">Generated: ${escapeHtml(timestamp)} | Source: ${escapeHtml(host)}</div>
  </div>
  <table>
    <thead>
      <tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr>
    </thead>
    <tbody>
      ${rows.map(row => `<tr>${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}
    </tbody>
  </table>
</body>
</html>`;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    setTimeout(() => {
      win.print();
    }, 250);
  };

  // Build headers and rows based on selected columns
  const buildExportData = () => {
    if (!generatedData || selectedColumns.length === 0) return { headers: [], rows: [] };

    // Get selected column definitions in order
    const selectedColDefs = availableColumns.filter(col => selectedColumns.includes(col.key));
    const headers = selectedColDefs.map(col => col.label);
    const rows = [];

    // Helper to get cell value - maps column keys to actual data fields
    const getCellValue = (item, key) => {
      if (!item) return '';
      
      switch (key) {
        // Survey Batch fields
        case 'response_id': 
          // Backend returns responseId (camelCase) or response_id (snake_case)
          return item.response_id || item.responseId || item.id || '';
        case 'name': 
          // Backend constructs youthName from first_name, middle_name, last_name
          // Also check if name fields exist directly
          if (item.youthName) return item.youthName;
          if (item.name) return item.name;
          // Construct from first_name, middle_name, last_name (from database if youthName not available)
          const first = item.first_name || item.firstName || '';
          const middle = item.middle_name || item.middleName || '';
          const last = item.last_name || item.lastName || '';
          const fullName = [first, middle, last].filter(Boolean).join(' ').trim();
          if (fullName) return fullName;
          // Fallback to other possible name fields
          return item.full_name || '';
        case 'barangay': 
          // Backend returns barangay (transformed) or barangay_name (original)
          return item.barangay || item.barangay_name || item.barangayName || item.location || '';
        case 'age': 
          return item.age !== undefined && item.age !== null ? String(item.age) : (item.youth_age !== undefined && item.youth_age !== null ? String(item.youth_age) : '');
        case 'status': 
          // Backend returns validationStatus (camelCase) or validation_status (snake_case)
          const validationStatus = item.validationStatus || item.validation_status || item.status || '';
          if (validationStatus) {
            return validationStatus.charAt(0).toUpperCase() + validationStatus.slice(1);
          }
          // Fallback for active/inactive status
          if (item.isActive !== undefined) {
            return item.isActive && !item.deactivated ? 'Active' : 'Inactive';
          }
          return '';
        case 'submitted_at': 
          // Backend doesn't have submitted_at, use createdAt (camelCase) or created_at (snake_case) instead
          if (item.submitted_at) {
            return new Date(item.submitted_at).toLocaleString();
          }
          if (item.submittedAt) {
            return new Date(item.submittedAt).toLocaleString();
          }
          if (item.createdAt) {
            return new Date(item.createdAt).toLocaleString();
          }
          if (item.created_at) {
            return new Date(item.created_at).toLocaleString();
          }
          return '';
        
        // SK Term fields
        case 'position': 
          return item.position || '';
        case 'filled_date': 
          return item.filled_date ? new Date(item.filled_date).toLocaleDateString() : '';
        case 'current':
          return item.current !== undefined ? String(item.current) : '';
        case 'max':
          return item.max !== undefined ? String(item.max) : '';
        case 'available':
          return item.available !== undefined ? String(item.available) : '';
        
        // Staff fields
        case 'staff_id': 
          return item.staff_id || item.id || item.lydoId || '';
        case 'email': 
          return item.email || item.personalEmail || '';
        case 'created_at': 
          return item.created_at ? new Date(item.created_at).toLocaleString() : item.createdAt ? new Date(item.createdAt).toLocaleString() : '';
        
        case 'official_id': 
          return item.official_id || item.id || item.skId || '';
        case 'term_name': 
          return item.termName || item.term_name || '';
        
        // Youth fields
        case 'youth_id': 
          return item.youth_id || item.id || '';
        case 'gender': 
          return item.gender || '';
        
        // Activity Log fields
        case 'log_id':
          return item.log_id || item.logId || '';
        case 'user_id': 
          return item.user_id || item.userId || item.user || '';
        case 'user_type': 
          return item.user_type || item.userType || '';
        case 'category':
          return item.category || '';
        case 'action': 
          return item.action || item.action_type || '';
        case 'resource_type': 
          return item.resource_type || item.resourceType || item.resource || '';
        case 'resource_id':
          return item.resource_id || item.resourceId || '';
        case 'resource_name': 
          return item.resource_name || item.resourceName || '';
        case 'details': 
          // Format JSON details as readable string
          if (item.details) {
            if (typeof item.details === 'string') {
              try {
                const parsed = JSON.parse(item.details);
                return JSON.stringify(parsed, null, 0).replace(/"/g, '');
              } catch {
                return item.details;
              }
            } else if (typeof item.details === 'object') {
              return JSON.stringify(item.details, null, 0).replace(/"/g, '');
            }
            return String(item.details);
          }
          return item.description || '';
        case 'success': 
          return item.success !== undefined ? (item.success === true || item.success === 'true' ? 'Yes' : 'No') : '';
        case 'error_message':
          return item.error_message || item.errorMessage || '';
        
        default: 
          return '';
      }
    };

    switch (generatedData.type) {
      case 'survey_batch':
        rows.push(...(generatedData.responses || []).map(r => 
          selectedColDefs.map(col => {
            // Handle batch info columns
            if (col.key === 'batchName') return r.batchName || '';
            if (col.key === 'batchId') return r.batchId || '';
            return getCellValue(r, col.key);
          })
        ));
        break;

      case 'sk_term':
        if (generatedData.vacancies) {
          Object.entries(generatedData.vacancies).forEach(([barangay, positions]) => {
            Object.entries(positions).forEach(([position, positionData]) => {
              // Handle both single object and array of data
              const dataItems = Array.isArray(positionData) ? positionData : [positionData];
              
              dataItems.forEach(data => {
                const row = selectedColDefs.map(col => {
                  if (col.key === 'barangay') return barangay;
                  if (col.key === 'position') return position;
                  // Handle term info columns
                  if (col.key === 'termName') return data.termName || '';
                  if (col.key === 'termId') return data.termId || '';
                  return getCellValue(data, col.key);
                });
                rows.push(row);
              });
            });
          });
        }
        break;

      case 'staff':
        rows.push(...(generatedData.staff || []).map(s => 
          selectedColDefs.map(col => getCellValue(s, col.key))
        ));
        break;

      case 'youth':
        rows.push(...(generatedData.youth || []).map(y => 
          selectedColDefs.map(col => getCellValue(y, col.key))
        ));
        break;

      case 'activity_logs':
        rows.push(...(generatedData.logs || []).map(l => 
          selectedColDefs.map(col => getCellValue(l, col.key))
        ));
        break;
    }

    if (rows.length === 0 && headers.length > 0) {
      rows.push(headers.map(() => 'No data available'));
    }

    return { headers, rows };
  };

  const exportReport = async (format) => {
    if (!generatedData) {
      showErrorToast('No data', 'Please generate a report first');
      return;
    }

    if (selectedColumns.length === 0) {
      showErrorToast('No columns selected', 'Please select at least one column to export');
      return;
    }

    try {
      const { headers, rows } = buildExportData();
      const reportTitle = selectedReportType?.name || 'Report';

      if (format === 'csv') {
        downloadCsv(`${reportTitle.toLowerCase().replace(/\s+/g, '-')}.csv`, [headers, ...rows]);
      } else if (format === 'excel') {
        const xml = buildExcelXml(headers, rows);
        downloadExcel(`${reportTitle.toLowerCase().replace(/\s+/g, '-')}.xls`, xml);
      } else if (format === 'pdf') {
        openPrintPdf(reportTitle, headers, rows);
      }

      showSuccessToast('Export completed', `${format.toUpperCase()} file downloaded successfully`);
    } catch (error) {
      showErrorToast('Export failed', error.message || 'Failed to export report');
    }
  };

  // Helper function to create a safe config with normalized arrays
  const getSafeConfig = () => {
    if (!reportConfig) {
      return {
        startDate: '',
        endDate: '',
        exportFormat: 'csv',
        sortBy: 'created_at',
        sortOrder: 'desc',
        limit: 1000,
        includeSummary: true,
        batchId: '',
        batchIds: [],
        allBatches: false,
        termId: '',
        termIds: [],
        allTerms: false,
        barangay: '',
        barangayIds: [],
        allBarangays: false,
        positionIds: [],
        allPositions: false,
        fillStatus: 'all',
        activeStatusIds: [],
        allActiveStatus: false,
        staffStatusIds: [],
        allStaffStatus: false,
        youthStatusIds: [],
        allYouthStatus: false,
        surveyBatchStatusIds: [],
        allSurveyBatchStatus: false,
        activityLogUserTypeIds: [],
        allActivityLogUserTypes: false,
        activityLogCategoryIds: [],
        allActivityLogCategories: false,
        activityLogSuccessIds: [],
        allActivityLogSuccess: false
      };
    }

    return {
      ...reportConfig,
      barangayIds: Array.isArray(reportConfig.barangayIds) ? reportConfig.barangayIds : [],
      batchIds: Array.isArray(reportConfig.batchIds) ? reportConfig.batchIds : [],
      termIds: Array.isArray(reportConfig.termIds) ? reportConfig.termIds : [],
      positionIds: Array.isArray(reportConfig.positionIds) ? reportConfig.positionIds : [],
      surveyBatchStatusIds: Array.isArray(reportConfig.surveyBatchStatusIds) ? reportConfig.surveyBatchStatusIds : [],
      staffStatusIds: Array.isArray(reportConfig.staffStatusIds) ? reportConfig.staffStatusIds : [],
      youthStatusIds: Array.isArray(reportConfig.youthStatusIds) ? reportConfig.youthStatusIds : [],
      activeStatusIds: Array.isArray(reportConfig.activeStatusIds) ? reportConfig.activeStatusIds : [],
      activityLogUserTypeIds: Array.isArray(reportConfig.activityLogUserTypeIds) ? reportConfig.activityLogUserTypeIds : [],
      activityLogCategoryIds: Array.isArray(reportConfig.activityLogCategoryIds) ? reportConfig.activityLogCategoryIds : [],
      activityLogSuccessIds: Array.isArray(reportConfig.activityLogSuccessIds) ? reportConfig.activityLogSuccessIds : []
    };
  };

  // Render data filters (date range, status, etc.)
  const renderDataFilters = () => {
    if (!selectedReportType || !reportConfig) return null;

    // Use safe config
    const config = getSafeConfig();

    return (
      <div className="space-y-6">
        {/* Date Range Section */}
        <div className="pb-4 border-b border-gray-200">
          <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
            <Calendar className="w-4 h-4 mr-2 text-blue-600" />
            Date Range
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Start Date</label>
              <input
                type="date"
                value={config.startDate || ''}
                onChange={(e) => handleConfigChange('startDate', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">End Date</label>
              <input
                type="date"
                value={config.endDate || ''}
                onChange={(e) => handleConfigChange('endDate', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Report-Specific Filters */}
        {selectedReportType.id === 'survey_batch' && (
          <div className="pb-4 border-b border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
              <Filter className="w-4 h-4 mr-2 text-blue-600" />
              Survey Filters
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-medium text-gray-600">Status</label>
                  <button
                    type="button"
                    onClick={() => {
                      if (config.allSurveyBatchStatus || config.surveyBatchStatusIds.length === 3) {
                        handleConfigChange('allSurveyBatchStatus', false);
                        handleConfigChange('surveyBatchStatusIds', []);
                      } else {
                        handleConfigChange('allSurveyBatchStatus', true);
                        handleConfigChange('surveyBatchStatusIds', ['validated', 'pending', 'rejected']);
                      }
                    }}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {config.allSurveyBatchStatus || config.surveyBatchStatusIds.length === 3 ? 'Clear All' : 'Select All'}
                  </button>
                </div>
                <div className="border border-gray-200 rounded-lg max-h-32 overflow-y-auto bg-white">
                  <label className="flex items-center px-3 py-2 hover:bg-gray-50 border-b border-gray-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.allSurveyBatchStatus}
                      onChange={(e) => {
                        handleConfigChange('allSurveyBatchStatus', e.target.checked);
                        handleConfigChange('surveyBatchStatusIds', e.target.checked ? ['validated', 'pending', 'rejected'] : []);
                      }}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">All Status</span>
                  </label>
                  <label className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100">
                    <input
                      type="checkbox"
                      checked={config.allSurveyBatchStatus || config.surveyBatchStatusIds.includes('validated')}
                      disabled={config.allSurveyBatchStatus}
                      onChange={(e) => {
                        if (config.allSurveyBatchStatus) return;
                        const currentIds = [...config.surveyBatchStatusIds];
                        if (e.target.checked) {
                          if (!currentIds.includes('validated')) currentIds.push('validated');
                        } else {
                          const index = currentIds.indexOf('validated');
                          if (index > -1) currentIds.splice(index, 1);
                        }
                        handleConfigChange('surveyBatchStatusIds', currentIds);
                      }}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Validated</span>
                  </label>
                  <label className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100">
                    <input
                      type="checkbox"
                      checked={config.allSurveyBatchStatus || config.surveyBatchStatusIds.includes('pending')}
                      disabled={config.allSurveyBatchStatus}
                      onChange={(e) => {
                        if (config.allSurveyBatchStatus) return;
                        const currentIds = [...config.surveyBatchStatusIds];
                        if (e.target.checked) {
                          if (!currentIds.includes('pending')) currentIds.push('pending');
                        } else {
                          const index = currentIds.indexOf('pending');
                          if (index > -1) currentIds.splice(index, 1);
                        }
                        handleConfigChange('surveyBatchStatusIds', currentIds);
                      }}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Pending</span>
                  </label>
                  <label className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0">
                    <input
                      type="checkbox"
                      checked={config.allSurveyBatchStatus || config.surveyBatchStatusIds.includes('rejected')}
                      disabled={config.allSurveyBatchStatus}
                      onChange={(e) => {
                        if (config.allSurveyBatchStatus) return;
                        const currentIds = [...config.surveyBatchStatusIds];
                        if (e.target.checked) {
                          if (!currentIds.includes('rejected')) currentIds.push('rejected');
                        } else {
                          const index = currentIds.indexOf('rejected');
                          if (index > -1) currentIds.splice(index, 1);
                        }
                        handleConfigChange('surveyBatchStatusIds', currentIds);
                      }}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Rejected</span>
                  </label>
                </div>
                {(config.allSurveyBatchStatus || config.surveyBatchStatusIds.length > 0) && (
                  <p className="text-xs text-gray-500 mt-2">
                    {config.allSurveyBatchStatus 
                      ? 'All statuses selected'
                      : `${config.surveyBatchStatusIds.length} status${config.surveyBatchStatusIds.length !== 1 ? 'es' : ''} selected`
                    }
                  </p>
                )}
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-medium text-gray-600">Barangay</label>
                  {barangays.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (config.allBarangays || config.barangayIds.length === barangays.length) {
                          handleConfigChange('allBarangays', false);
                          handleConfigChange('barangayIds', []);
                        } else {
                          const allIds = barangays.map(b => b.barangay_name).filter(Boolean);
                          handleConfigChange('allBarangays', true);
                          handleConfigChange('barangayIds', allIds);
                        }
                      }}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      {config.allBarangays || config.barangayIds.length === barangays.length ? 'Clear All' : 'Select All'}
                    </button>
                  )}
                </div>
                <div className="border border-gray-200 rounded-lg max-h-32 overflow-y-auto bg-white">
                  <label className="flex items-center px-3 py-2 hover:bg-gray-50 border-b border-gray-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.allBarangays}
                      onChange={(e) => {
                        const allIds = barangays.map(b => b.barangay_name).filter(Boolean);
                        handleConfigChange('allBarangays', e.target.checked);
                        handleConfigChange('barangayIds', e.target.checked ? allIds : []);
                      }}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">All Barangays ({barangays.length})</span>
                  </label>
                  {barangays.map(b => {
                    const id = b.barangay_name;
                    const isSelected = config.allBarangays || config.barangayIds.includes(id);
                    return (
                      <label key={b.barangay_id} className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={config.allBarangays}
                          onChange={(e) => {
                            if (config.allBarangays) return;
                            const currentIds = [...config.barangayIds];
                            if (e.target.checked) {
                              if (!currentIds.includes(id)) currentIds.push(id);
                            } else {
                              const index = currentIds.indexOf(id);
                              if (index > -1) currentIds.splice(index, 1);
                            }
                            handleConfigChange('barangayIds', currentIds);
                          }}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{b.barangay_name}</span>
                      </label>
                    );
                  })}
                </div>
                {(config.allBarangays || config.barangayIds.length > 0) && (
                  <p className="text-xs text-gray-500 mt-2">
                    {config.allBarangays 
                      ? `All ${barangays.length} barangays selected`
                      : `${config.barangayIds.length} barangay${config.barangayIds.length !== 1 ? 's' : ''} selected`
                    }
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {selectedReportType.id === 'staff' && (
          <div className="pb-4 border-b border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
              <Filter className="w-4 h-4 mr-2 text-blue-600" />
              Staff Filters
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-medium text-gray-600">Status</label>
                  <button
                    type="button"
                    onClick={() => {
                      if (config.allStaffStatus || config.staffStatusIds.length === 2) {
                        handleConfigChange('allStaffStatus', false);
                        handleConfigChange('staffStatusIds', []);
                      } else {
                        handleConfigChange('allStaffStatus', true);
                        handleConfigChange('staffStatusIds', ['active', 'inactive']);
                      }
                    }}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {config.allStaffStatus || config.staffStatusIds.length === 2 ? 'Clear All' : 'Select All'}
                  </button>
                </div>
                <div className="border border-gray-200 rounded-lg max-h-32 overflow-y-auto bg-white">
                  <label className="flex items-center px-3 py-2 hover:bg-gray-50 border-b border-gray-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.allStaffStatus}
                      onChange={(e) => {
                        handleConfigChange('allStaffStatus', e.target.checked);
                        handleConfigChange('staffStatusIds', e.target.checked ? ['active', 'inactive'] : []);
                      }}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">All Status</span>
                  </label>
                  <label className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100">
                    <input
                      type="checkbox"
                      checked={config.allStaffStatus || config.staffStatusIds.includes('active')}
                      disabled={config.allStaffStatus}
                      onChange={(e) => {
                        if (config.allStaffStatus) return;
                        const currentIds = [...config.staffStatusIds];
                        if (e.target.checked) {
                          if (!currentIds.includes('active')) currentIds.push('active');
                        } else {
                          const index = currentIds.indexOf('active');
                          if (index > -1) currentIds.splice(index, 1);
                        }
                        handleConfigChange('staffStatusIds', currentIds);
                      }}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Active</span>
                  </label>
                  <label className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0">
                    <input
                      type="checkbox"
                      checked={config.allStaffStatus || config.staffStatusIds.includes('inactive')}
                      disabled={config.allStaffStatus}
                      onChange={(e) => {
                        if (config.allStaffStatus) return;
                        const currentIds = [...config.staffStatusIds];
                        if (e.target.checked) {
                          if (!currentIds.includes('inactive')) currentIds.push('inactive');
                        } else {
                          const index = currentIds.indexOf('inactive');
                          if (index > -1) currentIds.splice(index, 1);
                        }
                        handleConfigChange('staffStatusIds', currentIds);
                      }}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Inactive</span>
                  </label>
                </div>
                {(config.allStaffStatus || config.staffStatusIds.length > 0) && (
                  <p className="text-xs text-gray-500 mt-2">
                    {config.allStaffStatus 
                      ? 'All statuses selected'
                      : `${config.staffStatusIds.length} status${config.staffStatusIds.length !== 1 ? 'es' : ''} selected`
                    }
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {selectedReportType.id === 'sk_term' && (
          <div className="pb-4 border-b border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
              <Filter className="w-4 h-4 mr-2 text-blue-600" />
              SK Term Filters
            </h4>
            <div className={`grid grid-cols-1 sm:grid-cols-2 ${config.fillStatus === 'filled' ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-4`}>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-medium text-gray-600">Barangay</label>
                  {barangays.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (config.allBarangays || config.barangayIds.length === barangays.length) {
                          handleConfigChange('allBarangays', false);
                          handleConfigChange('barangayIds', []);
                        } else {
                          const allIds = barangays.map(b => b.barangay_name).filter(Boolean);
                          handleConfigChange('allBarangays', true);
                          handleConfigChange('barangayIds', allIds);
                        }
                      }}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      {config.allBarangays || config.barangayIds.length === barangays.length ? 'Clear All' : 'Select All'}
                    </button>
                  )}
                </div>
                <div className="border border-gray-200 rounded-lg max-h-32 overflow-y-auto bg-white">
                  <label className="flex items-center px-3 py-2 hover:bg-gray-50 border-b border-gray-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.allBarangays}
                      onChange={(e) => {
                        const allIds = barangays.map(b => b.barangay_name).filter(Boolean);
                        handleConfigChange('allBarangays', e.target.checked);
                        handleConfigChange('barangayIds', e.target.checked ? allIds : []);
                      }}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">All Barangays ({barangays.length})</span>
                  </label>
                  {barangays.map(b => {
                    const id = b.barangay_name;
                    const isSelected = config.allBarangays || config.barangayIds.includes(id);
                    return (
                      <label key={b.barangay_id} className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={config.allBarangays}
                          onChange={(e) => {
                            if (config.allBarangays) return;
                            const currentIds = [...config.barangayIds];
                            if (e.target.checked) {
                              if (!currentIds.includes(id)) currentIds.push(id);
                            } else {
                              const index = currentIds.indexOf(id);
                              if (index > -1) currentIds.splice(index, 1);
                            }
                            handleConfigChange('barangayIds', currentIds);
                          }}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{b.barangay_name}</span>
                      </label>
                    );
                  })}
                </div>
                {(config.allBarangays || config.barangayIds.length > 0) && (
                  <p className="text-xs text-gray-500 mt-2">
                    {config.allBarangays 
                      ? `All ${barangays.length} barangays selected`
                      : `${config.barangayIds.length} barangay${config.barangayIds.length !== 1 ? 's' : ''} selected`
                    }
                  </p>
                )}
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-medium text-gray-600">Position</label>
                  {positions.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (config.allPositions || config.positionIds.length === positions.length) {
                          handleConfigChange('allPositions', false);
                          handleConfigChange('positionIds', []);
                        } else {
                          const allPos = positions.map(p => p.name || p).filter(Boolean);
                          handleConfigChange('allPositions', true);
                          handleConfigChange('positionIds', allPos);
                        }
                      }}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      {config.allPositions || config.positionIds.length === positions.length ? 'Clear All' : 'Select All'}
                    </button>
                  )}
                </div>
                <div className="border border-gray-200 rounded-lg max-h-32 overflow-y-auto bg-white">
                  <label className="flex items-center px-3 py-2 hover:bg-gray-50 border-b border-gray-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.allPositions}
                      onChange={(e) => {
                        const allPos = positions.map(p => p.name || p).filter(Boolean);
                        handleConfigChange('allPositions', e.target.checked);
                        handleConfigChange('positionIds', e.target.checked ? allPos : []);
                      }}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">All Positions ({positions.length})</span>
                  </label>
                  {positions.map(p => {
                    const posName = p.name || p;
                    const isSelected = config.allPositions || config.positionIds.includes(posName);
                    return (
                      <label key={posName} className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={config.allPositions}
                          onChange={(e) => {
                            if (config.allPositions) return;
                            const currentIds = [...config.positionIds];
                            if (e.target.checked) {
                              if (!currentIds.includes(posName)) currentIds.push(posName);
                            } else {
                              const index = currentIds.indexOf(posName);
                              if (index > -1) currentIds.splice(index, 1);
                            }
                            handleConfigChange('positionIds', currentIds);
                          }}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{posName}</span>
                      </label>
                    );
                  })}
                </div>
                {(config.allPositions || config.positionIds.length > 0) && (
                  <p className="text-xs text-gray-500 mt-2">
                    {config.allPositions 
                      ? `All ${positions.length} positions selected`
                      : `${config.positionIds.length} position${config.positionIds.length !== 1 ? 's' : ''} selected`
                    }
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Fill Status</label>
                <select
                  value={config.fillStatus || 'all'}
                  onChange={(e) => {
                    handleConfigChange('fillStatus', e.target.value);
                    // Reset active status if switching to vacant
                    if (e.target.value === 'vacant') {
                      handleConfigChange('activeStatusIds', []);
                      handleConfigChange('allActiveStatus', false);
                    }
                  }}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                >
                  <option value="all">All Positions</option>
                  <option value="filled">Filled</option>
                  <option value="vacant">Vacant</option>
                </select>
              </div>
              {config.fillStatus === 'filled' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-medium text-gray-600">Active Status</label>
                    <button
                      type="button"
                      onClick={() => {
                        if (config.allActiveStatus || config.activeStatusIds.length === 2) {
                          handleConfigChange('allActiveStatus', false);
                          handleConfigChange('activeStatusIds', []);
                        } else {
                          handleConfigChange('allActiveStatus', true);
                          handleConfigChange('activeStatusIds', ['active', 'inactive']);
                        }
                      }}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      {config.allActiveStatus || config.activeStatusIds.length === 2 ? 'Clear All' : 'Select All'}
                    </button>
                  </div>
                  <div className="border border-gray-200 rounded-lg max-h-32 overflow-y-auto bg-white">
                    <label className="flex items-center px-3 py-2 hover:bg-gray-50 border-b border-gray-100 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.allActiveStatus}
                        onChange={(e) => {
                          handleConfigChange('allActiveStatus', e.target.checked);
                          handleConfigChange('activeStatusIds', e.target.checked ? ['active', 'inactive'] : []);
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm font-medium text-gray-700">All Status</span>
                    </label>
                    <label className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100">
                      <input
                        type="checkbox"
                        checked={config.allActiveStatus || config.activeStatusIds.includes('active')}
                        disabled={config.allActiveStatus}
                        onChange={(e) => {
                          if (config.allActiveStatus) return;
                          const currentIds = [...config.activeStatusIds];
                          if (e.target.checked) {
                            if (!currentIds.includes('active')) currentIds.push('active');
                          } else {
                            const index = currentIds.indexOf('active');
                            if (index > -1) currentIds.splice(index, 1);
                          }
                          handleConfigChange('activeStatusIds', currentIds);
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Active</span>
                    </label>
                    <label className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0">
                      <input
                        type="checkbox"
                        checked={config.allActiveStatus || config.activeStatusIds.includes('inactive')}
                        disabled={config.allActiveStatus}
                        onChange={(e) => {
                          if (config.allActiveStatus) return;
                          const currentIds = [...config.activeStatusIds];
                          if (e.target.checked) {
                            if (!currentIds.includes('inactive')) currentIds.push('inactive');
                          } else {
                            const index = currentIds.indexOf('inactive');
                            if (index > -1) currentIds.splice(index, 1);
                          }
                          handleConfigChange('activeStatusIds', currentIds);
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Inactive</span>
                    </label>
                  </div>
                  {(config.allActiveStatus || config.activeStatusIds.length > 0) && (
                    <p className="text-xs text-gray-500 mt-2">
                      {config.allActiveStatus 
                        ? 'All statuses selected'
                        : `${config.activeStatusIds.length} status${config.activeStatusIds.length !== 1 ? 'es' : ''} selected`
                      }
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {selectedReportType.id === 'youth' && (
          <div className="pb-4 border-b border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
              <Filter className="w-4 h-4 mr-2 text-blue-600" />
              Youth Filters
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-medium text-gray-600">Barangay</label>
                  {barangays.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (config.allBarangays || config.barangayIds.length === barangays.length) {
                          handleConfigChange('allBarangays', false);
                          handleConfigChange('barangayIds', []);
                        } else {
                          const allIds = barangays.map(b => b.barangay_name).filter(Boolean);
                          handleConfigChange('allBarangays', true);
                          handleConfigChange('barangayIds', allIds);
                        }
                      }}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      {config.allBarangays || config.barangayIds.length === barangays.length ? 'Clear All' : 'Select All'}
                    </button>
                  )}
                </div>
                <div className="border border-gray-200 rounded-lg max-h-32 overflow-y-auto bg-white">
                  <label className="flex items-center px-3 py-2 hover:bg-gray-50 border-b border-gray-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.allBarangays}
                      onChange={(e) => {
                        const allIds = barangays.map(b => b.barangay_name).filter(Boolean);
                        handleConfigChange('allBarangays', e.target.checked);
                        handleConfigChange('barangayIds', e.target.checked ? allIds : []);
                      }}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">All Barangays ({barangays.length})</span>
                  </label>
                  {barangays.map(b => {
                    const id = b.barangay_name;
                    const isSelected = config.allBarangays || config.barangayIds.includes(id);
                    return (
                      <label key={b.barangay_id} className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={config.allBarangays}
                          onChange={(e) => {
                            if (config.allBarangays) return;
                            const currentIds = [...config.barangayIds];
                            if (e.target.checked) {
                              if (!currentIds.includes(id)) currentIds.push(id);
                            } else {
                              const index = currentIds.indexOf(id);
                              if (index > -1) currentIds.splice(index, 1);
                            }
                            handleConfigChange('barangayIds', currentIds);
                          }}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{b.barangay_name}</span>
                      </label>
                    );
                  })}
                </div>
                {(config.allBarangays || config.barangayIds.length > 0) && (
                  <p className="text-xs text-gray-500 mt-2">
                    {config.allBarangays 
                      ? `All ${barangays.length} barangays selected`
                      : `${config.barangayIds.length} barangay${config.barangayIds.length !== 1 ? 's' : ''} selected`
                    }
                  </p>
                )}
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-medium text-gray-600">Status</label>
                  <button
                    type="button"
                    onClick={() => {
                      if (config.allYouthStatus || config.youthStatusIds.length === 2) {
                        handleConfigChange('allYouthStatus', false);
                        handleConfigChange('youthStatusIds', []);
                      } else {
                        handleConfigChange('allYouthStatus', true);
                        handleConfigChange('youthStatusIds', ['active', 'inactive']);
                      }
                    }}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {config.allYouthStatus || config.youthStatusIds.length === 2 ? 'Clear All' : 'Select All'}
                  </button>
                </div>
                <div className="border border-gray-200 rounded-lg max-h-32 overflow-y-auto bg-white">
                  <label className="flex items-center px-3 py-2 hover:bg-gray-50 border-b border-gray-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.allYouthStatus}
                      onChange={(e) => {
                        handleConfigChange('allYouthStatus', e.target.checked);
                        handleConfigChange('youthStatusIds', e.target.checked ? ['active', 'inactive'] : []);
                      }}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">All Status</span>
                  </label>
                  <label className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100">
                    <input
                      type="checkbox"
                      checked={config.allYouthStatus || config.youthStatusIds.includes('active')}
                      disabled={config.allYouthStatus}
                      onChange={(e) => {
                        if (config.allYouthStatus) return;
                        const currentIds = [...config.youthStatusIds];
                        if (e.target.checked) {
                          if (!currentIds.includes('active')) currentIds.push('active');
                        } else {
                          const index = currentIds.indexOf('active');
                          if (index > -1) currentIds.splice(index, 1);
                        }
                        handleConfigChange('youthStatusIds', currentIds);
                      }}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Active</span>
                  </label>
                  <label className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0">
                    <input
                      type="checkbox"
                      checked={config.allYouthStatus || config.youthStatusIds.includes('inactive')}
                      disabled={config.allYouthStatus}
                      onChange={(e) => {
                        if (config.allYouthStatus) return;
                        const currentIds = [...config.youthStatusIds];
                        if (e.target.checked) {
                          if (!currentIds.includes('inactive')) currentIds.push('inactive');
                        } else {
                          const index = currentIds.indexOf('inactive');
                          if (index > -1) currentIds.splice(index, 1);
                        }
                        handleConfigChange('youthStatusIds', currentIds);
                      }}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Inactive</span>
                  </label>
                </div>
                {(config.allYouthStatus || config.youthStatusIds.length > 0) && (
                  <p className="text-xs text-gray-500 mt-2">
                    {config.allYouthStatus 
                      ? 'All statuses selected'
                      : `${config.youthStatusIds.length} status${config.youthStatusIds.length !== 1 ? 'es' : ''} selected`
                    }
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Min Age</label>
                <input
                  type="number"
                  value={config.ageMin || ''}
                  onChange={(e) => handleConfigChange('ageMin', e.target.value)}
                  placeholder="15"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Max Age</label>
                <input
                  type="number"
                  value={config.ageMax || ''}
                  onChange={(e) => handleConfigChange('ageMax', e.target.value)}
                  placeholder="29"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>
            </div>
          </div>
        )}

        {selectedReportType.id === 'activity_logs' && (
          <div className="pb-4 border-b border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
              <Filter className="w-4 h-4 mr-2 text-blue-600" />
              Activity Log Filters
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* User Type Filter */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-medium text-gray-600">User Type</label>
                  <button
                    type="button"
                    onClick={() => {
                      const allUserTypes = ['admin', 'lydo_staff', 'sk_official', 'youth', 'anonymous'];
                      if (config.allActivityLogUserTypes || config.activityLogUserTypeIds.length === 5) {
                        handleConfigChange('allActivityLogUserTypes', false);
                        handleConfigChange('activityLogUserTypeIds', []);
                      } else {
                        handleConfigChange('allActivityLogUserTypes', true);
                        handleConfigChange('activityLogUserTypeIds', allUserTypes);
                      }
                    }}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {config.allActivityLogUserTypes || config.activityLogUserTypeIds.length === 5 ? 'Clear All' : 'Select All'}
                  </button>
                </div>
                <div className="border border-gray-200 rounded-lg max-h-32 overflow-y-auto bg-white">
                  <label className="flex items-center px-3 py-2 hover:bg-gray-50 border-b border-gray-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.allActivityLogUserTypes}
                      onChange={(e) => {
                        const allUserTypes = ['admin', 'lydo_staff', 'sk_official', 'youth', 'anonymous'];
                        handleConfigChange('allActivityLogUserTypes', e.target.checked);
                        handleConfigChange('activityLogUserTypeIds', e.target.checked ? allUserTypes : []);
                      }}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">All User Types</span>
                  </label>
                  {['admin', 'lydo_staff', 'sk_official', 'youth', 'anonymous'].map(userType => {
                    const labelMap = {
                      admin: 'Admin',
                      lydo_staff: 'LYDO Staff',
                      sk_official: 'SK Official',
                      youth: 'Youth',
                      anonymous: 'Anonymous'
                    };
                    const isSelected = config.allActivityLogUserTypes || config.activityLogUserTypeIds.includes(userType);
                    return (
                      <label key={userType} className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={config.allActivityLogUserTypes}
                          onChange={(e) => {
                            if (config.allActivityLogUserTypes) return;
                            const currentIds = [...config.activityLogUserTypeIds];
                            if (e.target.checked) {
                              if (!currentIds.includes(userType)) currentIds.push(userType);
                            } else {
                              const index = currentIds.indexOf(userType);
                              if (index > -1) currentIds.splice(index, 1);
                            }
                            handleConfigChange('activityLogUserTypeIds', currentIds);
                          }}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{labelMap[userType]}</span>
                      </label>
                    );
                  })}
                </div>
                {(config.allActivityLogUserTypes || config.activityLogUserTypeIds.length > 0) && (
                  <p className="text-xs text-gray-500 mt-2">
                    {config.allActivityLogUserTypes 
                      ? 'All user types selected'
                      : `${config.activityLogUserTypeIds.length} user type${config.activityLogUserTypeIds.length !== 1 ? 's' : ''} selected`
                    }
                  </p>
                )}
              </div>

              {/* Category Filter */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-medium text-gray-600">Category</label>
                  <button
                    type="button"
                    onClick={() => {
                      // We'll dynamically determine all categories from loaded data
                      // For now, use common categories
                      const commonCategories = ['Authentication', 'User Management', 'Survey Management', 'Data Export', 'Data Management', 'System Management', 'SK Management', 'Term Management'];
                      if (config.allActivityLogCategories || config.activityLogCategoryIds.length === commonCategories.length) {
                        handleConfigChange('allActivityLogCategories', false);
                        handleConfigChange('activityLogCategoryIds', []);
                      } else {
                        handleConfigChange('allActivityLogCategories', true);
                        handleConfigChange('activityLogCategoryIds', commonCategories);
                      }
                    }}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {config.allActivityLogCategories ? 'Clear All' : 'Select All'}
                  </button>
                </div>
                <div className="border border-gray-200 rounded-lg max-h-32 overflow-y-auto bg-white">
                  <label className="flex items-center px-3 py-2 hover:bg-gray-50 border-b border-gray-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.allActivityLogCategories}
                      onChange={(e) => {
                        const commonCategories = ['Authentication', 'User Management', 'Survey Management', 'Data Export', 'Data Management', 'System Management', 'SK Management', 'Term Management'];
                        handleConfigChange('allActivityLogCategories', e.target.checked);
                        handleConfigChange('activityLogCategoryIds', e.target.checked ? commonCategories : []);
                      }}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">All Categories</span>
                  </label>
                  {['Authentication', 'User Management', 'Survey Management', 'Data Export', 'Data Management', 'System Management', 'SK Management', 'Term Management', 'Youth Management', 'Announcement', 'Activity Log', 'Notification Management', 'Bulk Operations', 'System Events', 'Data Validation', 'Report Generation'].map(category => {
                    const isSelected = config.allActivityLogCategories || config.activityLogCategoryIds.includes(category);
                    return (
                      <label key={category} className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={config.allActivityLogCategories}
                          onChange={(e) => {
                            if (config.allActivityLogCategories) return;
                            const currentIds = [...config.activityLogCategoryIds];
                            if (e.target.checked) {
                              if (!currentIds.includes(category)) currentIds.push(category);
                            } else {
                              const index = currentIds.indexOf(category);
                              if (index > -1) currentIds.splice(index, 1);
                            }
                            handleConfigChange('activityLogCategoryIds', currentIds);
                          }}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{category}</span>
                      </label>
                    );
                  })}
                </div>
                {(config.allActivityLogCategories || config.activityLogCategoryIds.length > 0) && (
                  <p className="text-xs text-gray-500 mt-2">
                    {config.allActivityLogCategories 
                      ? 'All categories selected'
                      : `${config.activityLogCategoryIds.length} categor${config.activityLogCategoryIds.length !== 1 ? 'ies' : 'y'} selected`
                    }
                  </p>
                )}
              </div>

              {/* Success Status Filter */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-medium text-gray-600">Success Status</label>
                  <button
                    type="button"
                    onClick={() => {
                      if (config.allActivityLogSuccess || config.activityLogSuccessIds.length === 2) {
                        handleConfigChange('allActivityLogSuccess', false);
                        handleConfigChange('activityLogSuccessIds', []);
                      } else {
                        handleConfigChange('allActivityLogSuccess', true);
                        handleConfigChange('activityLogSuccessIds', ['success', 'failed']);
                      }
                    }}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {config.allActivityLogSuccess || config.activityLogSuccessIds.length === 2 ? 'Clear All' : 'Select All'}
                  </button>
                </div>
                <div className="border border-gray-200 rounded-lg max-h-32 overflow-y-auto bg-white">
                  <label className="flex items-center px-3 py-2 hover:bg-gray-50 border-b border-gray-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.allActivityLogSuccess}
                      onChange={(e) => {
                        handleConfigChange('allActivityLogSuccess', e.target.checked);
                        handleConfigChange('activityLogSuccessIds', e.target.checked ? ['success', 'failed'] : []);
                      }}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">All Status</span>
                  </label>
                  {[
                    { id: 'success', label: 'Success' },
                    { id: 'failed', label: 'Failed' }
                  ].map(status => {
                    const isSelected = config.allActivityLogSuccess || config.activityLogSuccessIds.includes(status.id);
                    return (
                      <label key={status.id} className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={config.allActivityLogSuccess}
                          onChange={(e) => {
                            if (config.allActivityLogSuccess) return;
                            const currentIds = [...config.activityLogSuccessIds];
                            if (e.target.checked) {
                              if (!currentIds.includes(status.id)) currentIds.push(status.id);
                            } else {
                              const index = currentIds.indexOf(status.id);
                              if (index > -1) currentIds.splice(index, 1);
                            }
                            handleConfigChange('activityLogSuccessIds', currentIds);
                          }}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{status.label}</span>
                      </label>
                    );
                  })}
                </div>
                {(config.allActivityLogSuccess || config.activityLogSuccessIds.length > 0) && (
                  <p className="text-xs text-gray-500 mt-2">
                    {config.allActivityLogSuccess 
                      ? 'All statuses selected'
                      : `${config.activityLogSuccessIds.length} status${config.activityLogSuccessIds.length !== 1 ? 'es' : ''} selected`
                    }
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render export options (format, sorting, limits)
  const renderExportOptions = () => {
    const config = getSafeConfig();
    
    return (
      <div className="space-y-6">
        {/* Export Format Section */}
        <div className="pb-4 border-b border-gray-200">
          <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
            <FileDown className="w-4 h-4 mr-2 text-blue-600" />
            Export Format
          </h4>
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => handleConfigChange('exportFormat', 'csv')}
              className={`px-4 py-3 text-sm font-medium rounded-lg border-2 transition-all ${
                config.exportFormat === 'csv'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
              }`}
            >
              CSV
            </button>
            <button
              type="button"
              onClick={() => handleConfigChange('exportFormat', 'excel')}
              className={`px-4 py-3 text-sm font-medium rounded-lg border-2 transition-all ${
                config.exportFormat === 'excel'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
              }`}
            >
              Excel
            </button>
            <button
              type="button"
              onClick={() => handleConfigChange('exportFormat', 'pdf')}
              className={`px-4 py-3 text-sm font-medium rounded-lg border-2 transition-all ${
                config.exportFormat === 'pdf'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
              }`}
            >
              PDF
            </button>
          </div>
        </div>

        {/* Sorting Section */}
        <div className="pb-4 border-b border-gray-200">
          <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
            <ArrowUpDown className="w-4 h-4 mr-2 text-blue-600" />
            Sorting Options
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Sort By</label>
              <select
                value={config.sortBy || 'created_at'}
                onChange={(e) => handleConfigChange('sortBy', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              >
                <option value="created_at">Date Created</option>
                <option value="name">Name</option>
                <option value="updated_at">Last Updated</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Order</label>
              <select
                value={config.sortOrder || 'desc'}
                onChange={(e) => handleConfigChange('sortOrder', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          </div>
        </div>

        {/* Limits & Options Section */}
        <div className="pb-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
            <Settings className="w-4 h-4 mr-2 text-blue-600" />
            Additional Options
          </h4>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Max Records</label>
              <input
                type="number"
                value={config.limit || 1000}
                onChange={(e) => handleConfigChange('limit', e.target.value)}
                min="1"
                max="10000"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>
            <div className="flex items-start">
              <div className="flex items-start space-x-3 bg-blue-50 border border-blue-200 rounded-lg p-4 w-full cursor-pointer group hover:bg-blue-100 hover:border-blue-300 transition-all" onClick={() => handleConfigChange('includeSummary', !config.includeSummary)}>
                <div className="flex-shrink-0 mt-0.5">
                  <div className={`relative w-5 h-5 border-2 rounded transition-all ${
                    config.includeSummary !== false
                      ? 'bg-blue-600 border-blue-600 shadow-sm'
                      : 'bg-white border-gray-300 group-hover:border-blue-400'
                  }`}>
                    {config.includeSummary !== false && (
                      <svg className="w-3.5 h-3.5 text-white absolute top-0.5 left-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <FileSpreadsheet className={`w-4 h-4 transition-colors ${config.includeSummary !== false ? 'text-blue-600' : 'text-gray-500'}`} />
                    <span className={`text-sm font-medium transition-colors ${
                      config.includeSummary !== false ? 'text-blue-900' : 'text-gray-700'
                    }`}>
                      Include Summary
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    Add a summary section with total counts, date range, and applied filters at the beginning of the export
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderConfigForm = () => {
    if (!selectedReportType) return null;

    const config = getSafeConfig();

    switch (selectedReportType.id) {
      case 'survey_batch':
        return (
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
              <FileText className="w-4 h-4 mr-2 text-blue-600" />
              Report Selection
            </h4>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-medium text-gray-600">
                  Survey Batches <span className="text-red-500">*</span>
                </label>
                {batches.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (config.allBatches || config.batchIds.length === batches.length) {
                          handleConfigChange('allBatches', false);
                          handleConfigChange('batchIds', []);
                        } else {
                          const allIds = batches.map(b => b.batchId || b.batch_id).filter(Boolean);
                          handleConfigChange('allBatches', true);
                          handleConfigChange('batchIds', allIds);
                        }
                      }}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      {config.allBatches || config.batchIds.length === batches.length ? 'Clear All' : 'Select All'}
                    </button>
                  </div>
                )}
              </div>
              
              {batches.length === 0 ? (
                <div className="text-sm text-gray-500 py-2">No batches available</div>
              ) : (
                <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto bg-white">
                  {/* Select All Option */}
                  <label className="flex items-center px-3 py-2 hover:bg-gray-50 border-b border-gray-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.allBatches}
                      onChange={(e) => {
                        const allIds = batches.map(b => b.batchId || b.batch_id).filter(Boolean);
                        handleConfigChange('allBatches', e.target.checked);
                        handleConfigChange('batchIds', e.target.checked ? allIds : []);
                      }}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">
                      All Batches ({batches.length})
                    </span>
                  </label>
                  
                  {/* Individual Batch Options */}
                  {batches.map(batch => {
                    const id = batch.batchId || batch.batch_id;
                    const name = batch.batchName || batch.batch_name;
                    const status = batch.status || 'Unknown';
                    const isSelected = config.allBatches || config.batchIds.includes(id);
                    
                    return (
                      <label
                        key={id}
                        className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={config.allBatches}
                          onChange={(e) => {
                            if (config.allBatches) return;
                            
                            const currentIds = [...config.batchIds];
                            if (e.target.checked) {
                              if (!currentIds.includes(id)) {
                                currentIds.push(id);
                              }
                            } else {
                              const index = currentIds.indexOf(id);
                              if (index > -1) {
                                currentIds.splice(index, 1);
                              }
                            }
                            handleConfigChange('batchIds', currentIds);
                          }}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700 flex-1">
                          {name}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          status === 'active' ? 'bg-green-100 text-green-700' :
                          status === 'closed' ? 'bg-gray-100 text-gray-700' :
                          status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {status}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
              
              {/* Selected count display */}
              {(config.allBatches || config.batchIds.length > 0) && (
                <p className="text-xs text-gray-500 mt-2">
                  {config.allBatches 
                    ? `All ${batches.length} batches selected`
                    : `${config.batchIds.length} batch${config.batchIds.length !== 1 ? 'es' : ''} selected`
                  }
                </p>
              )}
            </div>
          </div>
        );

      case 'sk_term':
        return (
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
              <Shield className="w-4 h-4 mr-2 text-blue-600" />
              Report Selection
            </h4>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-medium text-gray-600">
                  SK Terms <span className="text-red-500">*</span>
                </label>
                {terms.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (config.allTerms || config.termIds.length === terms.length) {
                          handleConfigChange('allTerms', false);
                          handleConfigChange('termIds', []);
                        } else {
                          const allIds = terms.map(t => t.id || t.term_id || t.termId).filter(Boolean);
                          handleConfigChange('allTerms', true);
                          handleConfigChange('termIds', allIds);
                        }
                      }}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      {config.allTerms || config.termIds.length === terms.length ? 'Clear All' : 'Select All'}
                    </button>
                  </div>
                )}
              </div>
              
              {terms.length === 0 ? (
                <div className="text-sm text-gray-500 py-2">No terms available</div>
              ) : (
                <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto bg-white">
                  {/* Select All Option */}
                  <label className="flex items-center px-3 py-2 hover:bg-gray-50 border-b border-gray-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.allTerms}
                      onChange={(e) => {
                        const allIds = terms.map(t => t.term_id).filter(Boolean);
                        handleConfigChange('allTerms', e.target.checked);
                        handleConfigChange('termIds', e.target.checked ? allIds : []);
                      }}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">
                      All Terms ({terms.length})
                    </span>
                  </label>
                  
                  {/* Individual Term Options */}
                  {terms.map(term => {
                    const id = term.id || term.term_id || term.termId;
                    if (!id) {
                      logger.warn('Term missing ID field', null, { term });
                    }
                    const name = term.termName || term.term_name || 'Unnamed Term';
                    const status = term.status || 'Unknown';
                    const isSelected = config.allTerms || config.termIds.includes(id);
                    
                    return (
                      <label
                        key={id}
                        className={`flex items-center px-3 py-2 border-b border-gray-100 last:border-b-0 ${
                          config.allTerms ? 'cursor-not-allowed opacity-50' : 'hover:bg-gray-50 cursor-pointer'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={config.allTerms}
                          onChange={(e) => {
                            e.stopPropagation();
                            if (config.allTerms) {
                              // If allTerms is true, clicking should uncheck it and select just this term
                              const allIds = terms.map(t => t.id || t.term_id || t.termId).filter(Boolean);
                              setReportConfig(prev => ({
                                ...prev,
                                allTerms: false,
                                termIds: [id]
                              }));
                              return;
                            }
                            
                            setReportConfig(prev => {
                              const currentIds = [...prev.termIds];
                              const wasChecked = currentIds.includes(id);
                              
                              if (e.target.checked && !wasChecked) {
                                // Adding this term
                                currentIds.push(id);
                                logger.debug('Adding term', { termId: id, newTermIds: currentIds });
                              } else if (!e.target.checked && wasChecked) {
                                // Removing this term
                                const index = currentIds.indexOf(id);
                                if (index > -1) {
                                  currentIds.splice(index, 1);
                                }
                                logger.debug('Removing term', { termId: id, newTermIds: currentIds });
                              }
                              
                              return {
                                ...prev,
                                allTerms: false,
                                termIds: currentIds
                              };
                            });
                          }}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700 flex-1">
                          {name}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          status === 'active' ? 'bg-green-100 text-green-700' :
                          status === 'closed' ? 'bg-gray-100 text-gray-700' :
                          status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {status}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
              
              {/* Selected count display */}
              {(config.allTerms || config.termIds.length > 0) && (
                <p className="text-xs text-gray-500 mt-2">
                  {config.allTerms 
                    ? `All ${terms.length} terms selected`
                    : `${config.termIds.length} term${config.termIds.length !== 1 ? 's' : ''} selected`
                  }
                </p>
              )}
            </div>
          </div>
        );

      case 'staff':
        return (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Users className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900">No specific selection required</p>
                <p className="text-xs text-blue-700 mt-1">This report type includes all staff members. Configure filters in the next step to refine results.</p>
              </div>
            </div>
          </div>
        );

      case 'youth':
        return (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Users className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900">No specific selection required</p>
                <p className="text-xs text-blue-700 mt-1">This report type includes all registered youth. Configure filters in the next step to refine results.</p>
              </div>
            </div>
          </div>
        );

      case 'activity_logs':
        return (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Activity className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900">No specific selection required</p>
                <p className="text-xs text-blue-700 mt-1">This report type includes all activity logs. Configure filters in the next step to refine results.</p>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-600">No configuration needed for this report type.</p>
          </div>
        );
    }
  };

  // Export hook
  const mainExport = useExport({
    exportFunction: async (format) => {
      if (!generatedData) {
        throw new Error('Please generate a report first');
      }
      const exportFormat = format === 'xlsx' ? 'excel' : format;
      await exportReport(exportFormat);
      return { success: true };
    },
    onSuccess: () => showSuccessToast('Export completed', 'Report exported successfully'),
    onError: (error) => showErrorToast('Export failed', error.message)
  });

  const groupedReports = reportTypes.reduce((acc, report) => {
    if (!acc[report.category]) {
      acc[report.category] = [];
    }
    acc[report.category].push(report);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      {/* Header Section */}
      <HeaderMainContent
        title="Report Generator"
        description="Generate and export reports from any system module"
      />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left Column - Main Report Area */}
          <div className="xl:col-span-2">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Controls Section */}
              <div className="px-5 py-4 border-b border-gray-100">
                <div className="flex items-center justify-between gap-4">
                  {/* Left Controls */}
                  <div className="flex items-center gap-3">
                    <div className="text-sm text-gray-600">
                      {selectedReportType ? (
                        <span className="font-medium text-gray-900">{selectedReportType.name}</span>
                      ) : (
                        'Select a report type to begin'
                      )}
                    </div>
                  </div>

                  {/* Right Controls */}
                  <div className="flex items-center space-x-3 flex-shrink-0">
                    {generatedData && (
                      <ExportButton
                        formats={['csv', 'xlsx', 'pdf']}
                        onExport={(format) => mainExport.handleExport(format === 'xlsx' ? 'excel' : format)}
                        isExporting={mainExport.isExporting}
                        label="Export"
                        size="md"
                        position="auto"
                        responsive={true}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Content Area */}
              <div className="px-5 py-6">
                {!selectedReportType ? (
                  <div className="text-center py-12">
                    <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Report Selected</h3>
                    <p className="text-gray-600">Select a report type from the right panel to get started</p>
                  </div>
                ) : !generatedData ? (
                  <ConfigurationWizard
                    selectedReportType={selectedReportType}
                    reportConfig={reportConfig}
                    isGenerating={isGenerating}
                    onConfigChange={handleConfigChange}
                    onGenerate={generateReport}
                    renderConfigForm={renderConfigForm}
                    renderDataFilters={renderDataFilters}
                    renderExportOptions={renderExportOptions}
                  />
                ) : (
                  <div className="space-y-6">
                    {/* Success Message */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-green-900">Report generated successfully</p>
                          <p className="text-sm text-green-700 mt-1">
                            {(() => {
                              if (generatedData.type === 'survey_batch') {
                                const responseCount = generatedData.responses?.length || 0;
                                const batchCount = generatedData.batches?.length || (generatedData.batch ? 1 : 0);
                                return `Found ${responseCount} response${responseCount !== 1 ? 's' : ''} from ${batchCount} batch${batchCount !== 1 ? 'es' : ''}. Select columns and preview data below.`;
                              }
                              if (generatedData.type === 'sk_term') {
                                // Calculate total vacancies/positions
                                let vacancyCount = 0;
                                if (generatedData.vacancies) {
                                  Object.values(generatedData.vacancies).forEach(positions => {
                                    Object.values(positions).forEach(positionData => {
                                      vacancyCount += Array.isArray(positionData) ? positionData.length : 1;
                                    });
                                  });
                                }
                                const termCount = generatedData.terms?.length || (generatedData.term ? 1 : 0);
                                return `Found ${vacancyCount} position${vacancyCount !== 1 ? 's' : ''} from ${termCount} term${termCount !== 1 ? 's' : ''}. Select columns and preview data below.`;
                              }
                              const counts = {
                                'staff': generatedData.staff?.length || 0,
                                'youth': generatedData.youth?.length || 0,
                                'activity_logs': generatedData.logs?.length || 0
                              };
                              const count = counts[generatedData.type] || 0;
                              const labels = {
                                'staff': 'staff members',
                                'youth': 'youth',
                                'activity_logs': 'log entries'
                              };
                              return `Found ${count} ${labels[generatedData.type] || 'records'}. Select columns and preview data below.`;
                            })()}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Column Selector */}
                    <div className="bg-white border border-gray-200 rounded-lg p-5">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-semibold text-gray-900 flex items-center">
                          <Eye className="w-4 h-4 mr-2 text-blue-600" />
                          Select Columns to Export
                        </h4>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setSelectedColumns(availableColumns.map(col => col.key))}
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                          >
                            Select All
                          </button>
                          <span className="text-gray-300">|</span>
                          <button
                            onClick={() => setSelectedColumns([])}
                            className="text-xs text-gray-600 hover:text-gray-700 font-medium"
                          >
                            Clear All
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {availableColumns.map((column) => {
                          const isSelected = selectedColumns.includes(column.key);
                          return (
                            <label
                              key={column.key}
                              className={`flex items-center space-x-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                isSelected
                                  ? 'bg-blue-50 border-blue-300'
                                  : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedColumns([...selectedColumns, column.key]);
                                  } else {
                                    setSelectedColumns(selectedColumns.filter(key => key !== column.key));
                                  }
                                }}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <span className={`text-sm ${isSelected ? 'text-blue-900 font-medium' : 'text-gray-700'}`}>
                                {column.label}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                      {selectedColumns.length === 0 && (
                        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-xs text-yellow-800">
                            ⚠️ No columns selected. Please select at least one column to export.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Preview Table */}
                    {selectedColumns.length > 0 && (
                      <div className="bg-white border border-gray-200 rounded-lg p-5">
                        <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
                          <Eye className="w-4 h-4 mr-2 text-blue-600" />
                          Preview ({(() => {
                            const { rows } = buildExportData();
                            return rows.length;
                          })()} rows)
                        </h4>
                        <div className="overflow-x-auto border border-gray-200 rounded-lg">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                {buildExportData().headers.map((header, idx) => (
                                  <th
                                    key={idx}
                                    className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider"
                                  >
                                    {header}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {buildExportData().rows.slice(0, 10).map((row, rowIdx) => (
                                <tr key={rowIdx} className="hover:bg-gray-50">
                                  {row.map((cell, cellIdx) => (
                                    <td key={cellIdx} className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                      {cell || '-'}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {buildExportData().rows.length > 10 && (
                          <p className="text-xs text-gray-500 mt-3 text-center">
                            Showing first 10 of {buildExportData().rows.length} rows. Full data will be included in export.
                          </p>
                        )}
                        {buildExportData().rows.length === 0 && (
                          <div className="text-center py-8 text-gray-500 text-sm">
                            No data available for preview
                          </div>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                      <button
                        onClick={() => {
                          setGeneratedData(null);
                          setSelectedColumns([]);
                          setAvailableColumns([]);
                          setReportConfig({
                            startDate: '',
                            endDate: '',
                            exportFormat: 'csv',
                            sortBy: 'created_at',
                            sortOrder: 'desc',
                            limit: 1000,
                            includeSummary: true
                          });
                        }}
                        className="px-4 py-2 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
                      >
                        Generate New Report
                      </button>
                      {selectedColumns.length > 0 && (
                        <div className="text-sm text-gray-500">
                          {selectedColumns.length} of {availableColumns.length} columns selected
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Report Type Selection */}
          <div className="xl:col-span-1">
            <CollapsibleForm
              title="Select Report Type"
              description="Choose the type of report you want to generate"
              icon={<BarChart3 className="w-5 h-5" />}
              defaultCollapsed={false}
              className="sticky top-4"
            >
              <div className="space-y-4">
                {Object.entries(groupedReports).map(([category, reports]) => (
                  <div key={category}>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">{category}</h3>
                    <div className="space-y-2">
                      {reports.map(report => {
                        const Icon = report.icon;
                        const isSelected = selectedReportType?.id === report.id;
                        return (
                          <button
                            key={report.id}
                            onClick={() => handleReportTypeSelect(report)}
                            className={`w-full p-3 text-left rounded-lg border transition-all ${
                              isSelected
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-start space-x-3">
                              <div className={`p-2 rounded-lg flex-shrink-0 ${
                                isSelected ? 'bg-blue-100' : 'bg-gray-100'
                              }`}>
                                <Icon className={`w-4 h-4 ${
                                  isSelected ? 'text-blue-600' : 'text-gray-600'
                                }`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-medium text-gray-900">{report.name}</h4>
                                <p className="text-xs text-gray-500 mt-0.5">{report.description}</p>
                              </div>
                              {isSelected && (
                                <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-1" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleForm>
          </div>
        </div>

      <ToastContainer />
    </div>
  );
};

export default ReportGenerator;