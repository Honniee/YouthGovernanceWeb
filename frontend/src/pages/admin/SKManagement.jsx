import React, { useState, useRef, useEffect } from 'react';
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
  AlertTriangle,
  AlertCircle,
  Info,
  FileText
} from 'lucide-react';
import { HeaderMainContent, TabContainer, Tab, useTabState, ActionMenu, SearchBar, SortModal, FilterModal, BulkModal, Pagination, useSortModal, useBulkModal, usePagination, Avatar, Status, ExportButton, useExport, LoadingSpinner, BulkActionsBar, CollapsibleForm, DataTable, TabbedDetailModal, ActiveTermBanner } from '../../components/portal_main_content';
import { ToastContainer, showSKSuccessToast, showSuccessToast, showErrorToast, showInfoToast, showWarningToast, ConfirmationModal, useConfirmation } from '../../components/universal';
import skService from '../../services/skService.js';
import skTermsService from '../../services/skTermsService.js';
import { useActiveTerm } from '../../hooks/useActiveTerm.js';
import { useSKValidation } from '../../hooks/useSKValidation.js';
import { skDetailConfig } from '../../components/portal_main_content/tabbedModalConfigs.jsx';
import logger from '../../utils/logger.js';

// Toast helper functions are now imported from universal components



const SKManagement = () => {
  const navigate = useNavigate();

  // Dummy barangay data (from database schema)
  const barangayOptions = [
    { id: 'SJB001', name: 'Aguila' },
    { id: 'SJB002', name: 'Anus' },
    { id: 'SJB003', name: 'Aya' },
    { id: 'SJB004', name: 'Bagong Pook' },
    { id: 'SJB005', name: 'Balagtasin' },
    { id: 'SJB006', name: 'Balagtasin I' },
    { id: 'SJB007', name: 'Banaybanay I' },
    { id: 'SJB008', name: 'Banaybanay II' },
    { id: 'SJB009', name: 'Bigain I' },
    { id: 'SJB010', name: 'Bigain II' },
    { id: 'SJB011', name: 'Bigain South' },
    { id: 'SJB012', name: 'Calansayan' },
    { id: 'SJB013', name: 'Dagatan' },
    { id: 'SJB014', name: 'Don Luis' },
    { id: 'SJB015', name: 'Galamay-Amo' },
    { id: 'SJB016', name: 'Lalayat' },
    { id: 'SJB017', name: 'Lapolapo I' },
    { id: 'SJB018', name: 'Lapolapo II' },
    { id: 'SJB019', name: 'Lepute' },
    { id: 'SJB020', name: 'Lumil' },
    { id: 'SJB021', name: 'Mojon-Tampoy' },
    { id: 'SJB022', name: 'Natunuan' },
    { id: 'SJB023', name: 'Palanca' },
    { id: 'SJB024', name: 'Pinagtung-ulan' },
    { id: 'SJB025', name: 'Poblacion Barangay I' },
    { id: 'SJB026', name: 'Poblacion Barangay II' },
    { id: 'SJB027', name: 'Poblacion Barangay III' },
    { id: 'SJB028', name: 'Poblacion Barangay IV' },
    { id: 'SJB029', name: 'Sabang' },
    { id: 'SJB030', name: 'Salaban' },
    { id: 'SJB031', name: 'Santo Cristo' },
    { id: 'SJB032', name: 'Taysan' },
    { id: 'SJB033', name: 'Tugtug' }
  ];

  // SK position options (from database schema)
  const positionOptions = [
    'SK Chairperson',
    'SK Secretary', 
    'SK Treasurer',
    'SK Councilor'
  ];

  // Filter configuration for FilterModal
  const filterConfig = [
    {
      id: 'barangayName',
      label: 'Barangay',
      type: 'select',
      placeholder: 'All Barangays',
      options: barangayOptions.map(b => ({ value: b.name, label: b.name })),
      description: 'Filter by specific barangay'
    },
    {
      id: 'position',
      label: 'Position',
      type: 'select',
      placeholder: 'All Positions',
      options: positionOptions.map(p => ({ value: p, label: p })),
      description: 'Filter by SK position'
    },
    {
      id: 'dateCreated',
      label: 'Created After',
      type: 'date',
      description: 'Show officials created after this date'
    }
  ];

  // Use our reusable tab state hook
  const { activeTab, setActiveTab } = useTabState('all', async (tabId) => {
    setTabLoading(true);
    setStatusFilter(tabId);
    setCurrentPage(1); // Reset to first page when changing tabs
    
    // Wait a bit to show loading effect and then load data
    try {
      // Add a minimum loading time to make the effect visible
      const [dataResult] = await Promise.all([
        loadSKData(tabId, 1), // Load data for the new tab
        new Promise(resolve => setTimeout(resolve, 300)) // Minimum 300ms loading
      ]);
    } finally {
      setTabLoading(false);
    }
  });
  const [viewMode, setViewMode] = useState('grid');
  const [selectedItems, setSelectedItems] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('last_name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [isLoading, setIsLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);
  // Search expand state is now handled by the SearchBar component
  // Action menu state is now handled by the ActionMenu component
  // Search ref is now handled by the SearchBar component
  // Export state is now handled by the ExportButton component
  
  // Active term state using custom hook
  const { activeTerm, isLoading: isLoadingActiveTerm, error: activeTermError, hasActiveTerm } = useActiveTerm();
  
  // SK Validation hook for position limits and vacancy management
  const {
    barangayVacancies,
    overallVacancyStats,
    isLoadingVacancies,
    validationError,
    loadBarangayVacancies,
    loadOverallVacancyStats,
    validatePosition,
    getAvailablePositions,
    getAllPositionsWithAvailability,
    getVacancySummary,
    POSITION_LIMITS
  } = useSKValidation();
  
  const [termHistory, setTermHistory] = useState([]);

  // SK Officials data state (only for current active term)
  const [skData, setSkData] = useState([]);
  const [totalSK, setTotalSK] = useState(0);
  const [skStats, setSkStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    byPosition: {
      chairpersons: 0,
      secretaries: 0,
      treasurers: 0,
      councilors: 0
    },
    byBarangay: {}
  });
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Filter modal state
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterValues, setFilterValues] = useState({
    barangayName: '',
    position: '',
    term: '',
    dateCreated: ''
  });
  const filterTriggerRef = React.useRef(null);
  
  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    suffix: '',
    barangayName: '',
    position: '',
    personalEmail: ''
  });
  
  // Collapse state for Add Staff form
  const [formCollapsed, setFormCollapsed] = useState(true);
  
  // Step form state
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;

  // Confirmation modal hook
  const confirmation = useConfirmation();
  
  // Bulk operations state
  const [bulkAction, setBulkAction] = useState('');
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // Staff details modal state
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedStaffMember, setSelectedStaffMember] = useState(null);
  const [isEditingSaving, setIsEditingSaving] = useState(false);
  
  // Export state is now handled by the ExportButton component and useStaffExport hook
  
  // Action menu positioning is now handled by the ActionMenu component
  
  // Bulk import state
  const fileInputRef = useRef(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [duplicateStrategy, setDuplicateStrategy] = useState('skip');
  const [importSummary, setImportSummary] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleFileChange = (event) => {
    const file = event.target?.files?.[0] ?? null;
    setUploadedFile(file);
    setValidationResult(null);
    setImportSummary(null);
    setDuplicateStrategy('skip');
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0] ?? null;
    if (file) {
      setUploadedFile(file);
      setValidationResult(null);
      setImportSummary(null);
      setDuplicateStrategy('skip');
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const clearFile = () => {
    setUploadedFile(null);
    setValidationResult(null);
    setImportSummary(null);
    setDuplicateStrategy('skip');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateFile = async () => {
    if (!uploadedFile) return;
    setIsValidating(true);
    try {
      const response = await skService.validateBulkImport(uploadedFile);
      if (response.success) {
        const result = response.data;
        setValidationResult(result);
        setImportSummary(null);

        const summary = result.summary || {};
        const totalRecords = summary.totalRecords ?? 0;
        const invalidRecords = summary.invalidRecords ?? 0;
        const duplicateRecords = summary.duplicateRecords ?? 0;
        const validRecords = summary.validRecords ?? Math.max(totalRecords - invalidRecords, 0);

        if (invalidRecords > 0) {
          showInfoToast(
            'Validation Complete',
            `${validRecords}/${totalRecords} valid, ${invalidRecords} invalid records found. Fix issues and re-validate.`
          );
        } else if (duplicateRecords > 0) {
          showInfoToast(
            'Validation Complete',
            `${validRecords}/${totalRecords} records ready. ${duplicateRecords} duplicates detected – choose how to handle them before importing.`
          );
        } else {
          showSuccessToast(
            'Validation Complete',
            `${validRecords}/${totalRecords} valid records. Ready to import.`
          );
        }
      }
    } catch (error) {
      showErrorToast('Validation Failed', error.message);
    } finally {
      setIsValidating(false);
    }
  };

  const importFile = async () => {
    const invalidCount = validationResult?.summary?.invalidRecords ?? 0;
    if (!uploadedFile || invalidCount !== 0) return;

    setIsImporting(true);
    try {
      const response = await skService.bulkImportSKOfficials(uploadedFile, duplicateStrategy);
      if (response.success) {
        const result = response.data || {};
        const summaryPayload = response.summary || {};
        const computedSummary = {
          total: summaryPayload.total ?? result.total ?? 0,
          created: summaryPayload.created ?? result.created ?? 0,
          updated: summaryPayload.updated ?? result.updated ?? 0,
          restored: summaryPayload.restored ?? result.restored ?? 0,
          skipped: summaryPayload.skipped ?? result.skipped ?? 0,
          failed: summaryPayload.failed ?? result.failed ?? 0,
          duplicateStrategy: summaryPayload.duplicateStrategy ?? result.duplicateStrategy ?? duplicateStrategy
        };

        // Extract errors from rows or parse error strings
        let parsedErrors = [];
        if (result.rows && Array.isArray(result.rows)) {
          // Extract errors from failed/invalid rows
          const failedRows = result.rows.filter(
            (row) => row.action === 'failed' || row.action === 'invalid' || row.validationStatus === 'error'
          );
          parsedErrors = failedRows.map((row) => ({
            row: row.rowNumber || row.row || 0,
            reason: row.message || row.validationIssues?.join('; ') || row.issues?.join('; ') || 'Unknown error'
          }));
        }
        
        // Also check result.errors array (fallback)
        if (parsedErrors.length === 0 && result.errors && Array.isArray(result.errors)) {
          // Parse error strings like "Row 1: error message"
          parsedErrors = result.errors.map((errorStr) => {
            if (typeof errorStr === 'string') {
              const match = errorStr.match(/^Row (\d+):\s*(.+)$/);
              if (match) {
                return { row: parseInt(match[1]), reason: match[2] };
              }
              return { row: 0, reason: errorStr };
            }
            // If it's already an object
            return { row: errorStr.row || 0, reason: errorStr.reason || errorStr.message || 'Unknown error' };
          });
        }

        // Log for debugging if we have failures but no errors extracted
        if (computedSummary.failed > 0 && parsedErrors.length === 0) {
          logger.warn('Import had failures but no errors extracted', { failed: computedSummary.failed, total: computedSummary.total });
        }

        setImportSummary({ ...result, summary: computedSummary, errors: parsedErrors });

        const importedCount =
          (computedSummary.created ?? 0) +
          (computedSummary.updated ?? 0) +
          (computedSummary.restored ?? 0);

        const parts = [];
        if (computedSummary.created) parts.push(`${computedSummary.created} created`);
        if (computedSummary.updated) parts.push(`${computedSummary.updated} updated`);
        if (computedSummary.restored) parts.push(`${computedSummary.restored} restored`);
        if (computedSummary.skipped) parts.push(`${computedSummary.skipped} skipped`);
        if (computedSummary.failed) parts.push(`${computedSummary.failed} failed`);
        const summaryText = parts.length ? parts.join(', ') : 'No changes applied';

        if (computedSummary.failed > 0) {
          showWarningToast(
            'Import Completed with Issues',
            `${importedCount}/${computedSummary.total} processed. ${summaryText}.`
          );
        } else if (computedSummary.skipped > 0 || computedSummary.updated > 0 || computedSummary.restored > 0) {
          showInfoToast(
            'Import Completed',
            `${importedCount}/${computedSummary.total} processed. ${summaryText}.`
          );
        } else {
          showSuccessToast(
            'Import Completed',
            `${importedCount}/${computedSummary.total} SK officials processed successfully.`
          );
        }

        await loadSKData();
        await loadSKStats();
      }
    } catch (error) {
      showErrorToast('Import Failed', error.message);
    } finally {
      setIsImporting(false);
    }
  };

  const downloadReportCsv = (rows, filename) => {
    if (!rows || rows.length === 0) {
      showErrorToast('No data available for export');
      return;
    }

    const headers = Object.keys(rows[0]);
    const csvLines = [
      headers.join(','),
      ...rows.map((row) =>
        headers
          .map((header) => {
            const value = row[header] ?? '';
            const formatted = String(value).replace(/"/g, '""');
            return `"${formatted}"`;
          })
          .join(',')
      )
    ];

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleDownloadValidationReport = () => {
    if (!validationResult?.rows?.length) {
      showErrorToast('No validation details available');
      return;
    }

    const csvRows = validationResult.rows.map((row) => ({
      Row: row.rowNumber,
      Status: row.status,
      Issues: row.issues.join('; '),
      First_Name: row.normalized?.first_name ?? '',
      Last_Name: row.normalized?.last_name ?? '',
      Middle_Name: row.normalized?.middle_name ?? '',
      Suffix: row.normalized?.suffix ?? '',
      Position: row.normalized?.position ?? '',
      Barangay: row.resolvedBarangayName ?? '',
      Personal_Email: row.normalized?.personal_email ?? '',
      Duplicate_In_File: row.duplicate?.inFile
        ? row.duplicate?.isPrimaryInFile
          ? 'Yes (first occurrence)'
          : 'Yes'
        : 'No',
      Duplicate_System_Active: row.duplicate?.inDbActive ? 'Yes' : 'No',
      Duplicate_System_Inactive: row.duplicate?.inDbInactive ? 'Yes' : 'No'
    }));

    downloadReportCsv(csvRows, 'sk_validation_report.csv');
  };

  const handleDownloadImportReport = () => {
    if (!importSummary?.rows?.length) {
      showErrorToast('No import results available');
      return;
    }

    const csvRows = importSummary.rows.map((row) => ({
      Row: row.rowNumber,
      Action: row.action ?? '',
      Message: row.message ?? '',
      First_Name: row.data?.first_name ?? '',
      Last_Name: row.data?.last_name ?? '',
      Middle_Name: row.data?.middle_name ?? '',
      Suffix: row.data?.suffix ?? '',
      Personal_Email: row.data?.personal_email ?? '',
      Position: row.data?.position ?? '',
      Barangay: row.data?.barangay_name ?? '',
      Validation_Status: row.validationStatus ?? '',
      Validation_Issues: (row.validationIssues || []).join('; ')
    }));

    downloadReportCsv(csvRows, 'sk_import_report.csv');
  };
  
  // Collapse state for Bulk Import
  const [uploadCollapsed, setUploadCollapsed] = useState(true);

  // Modal state management using custom hooks
  const sortModal = useSortModal('last_name', 'asc');
  const bulkModal = useBulkModal();
  
  // Pagination state management using custom hook
  const pagination = usePagination({
    initialPage: currentPage,
    initialItemsPerPage: itemsPerPage,
    totalItems: totalSK,
    onPageChange: setCurrentPage,
    onItemsPerPageChange: setItemsPerPage
  });

  // Client-side export helpers (CSV, Excel XML, PDF)
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
  const buildSKCsvRows = (list) => {
    const headers = ['SK ID','Name','Barangay','Position','Status','Email'];
    const rows = list.map(o => [
      o.skId || '',
      `${o.firstName || ''} ${o.lastName || ''}`.trim(),
      o.barangayName || '',
      o.position || '',
      (o.isActive && !o.deactivated) ? 'Active' : 'Deactivated',
      o.personalEmail || ''
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

  const mainExport = useExport({
    exportFunction: async (format) => {
      if (!hasActiveTerm) throw new Error('No active term');
      const dataset = skData;
      if (!dataset || dataset.length === 0) throw new Error('No SK officials to export');
      const ts = new Date().toISOString().replace(/[:T]/g,'-').split('.')[0];
      if (format === 'pdf') {
        const rows = buildSKCsvRows(dataset);
        openPrintPdf(`SK Officials — ${activeTerm?.termName || ''}`.trim(), rows[0], rows);
      } else if (format === 'excel' || format === 'xlsx') {
        const rows = buildSKCsvRows(dataset);
        const xml = buildExcelXml('SK Officials', rows);
        downloadFile(new Blob([xml], { type: 'application/vnd.ms-excel' }), `sk-officials-${ts}.xls`);
      } else {
        const rows = buildSKCsvRows(dataset);
        downloadCsv(`sk-officials-${ts}.csv`, rows);
      }
      
      // Log export to backend for activity logs (fire and forget)
      // Use JSON format to avoid file download, but pass actual format in query for correct logging
      const actualFormat = format === 'xlsx' ? 'excel' : format;
      try {
        const queryParams = new URLSearchParams();
        queryParams.append('format', 'json'); // Use JSON to avoid download
        queryParams.append('logFormat', actualFormat); // Pass actual format for logging
        if (activeTerm?.termId) {
          queryParams.append('termId', activeTerm.termId);
        }
        if (statusFilter !== 'all') {
          queryParams.append('status', statusFilter);
        }
        
        const apiModule = await import('../../services/api.js');
        const api = apiModule.default;
        api.get(`/sk-officials/export/csv?${queryParams.toString()}`).catch(err => {
          logger.error('Failed to log export activity', err, { format });
        });
      } catch (err) {
        logger.error('Failed to log export activity', err, { format });
      }
      
      return { success: true };
    },
    onSuccess: () => showSKSuccessToast('exported', null, [{ label: 'Export Another', onClick: () => {} }]),
    onError: (error) => showErrorToast('Export failed', error.message)
  });

  const bulkExportHook = useExport({
    exportFunction: async (format) => {
      if (!hasActiveTerm) throw new Error('No active term');
      const selected = skData.filter(s => selectedItems.includes(s.skId));
      if (selected.length === 0) throw new Error('No SK officials selected');
      const ts = new Date().toISOString().replace(/[:T]/g,'-').split('.')[0];
      if (format === 'pdf') {
        const rows = buildSKCsvRows(selected);
        openPrintPdf('Selected SK Officials', rows[0], rows);
      } else if (format === 'excel' || format === 'xlsx') {
        const rows = buildSKCsvRows(selected);
        const xml = buildExcelXml('Selected SK Officials', rows);
        downloadFile(new Blob([xml], { type: 'application/vnd.ms-excel' }), `sk-officials-selected-${ts}.xls`);
      } else {
        const rows = buildSKCsvRows(selected);
        downloadCsv(`sk-officials-selected-${ts}.csv`, rows);
      }
      
      // Log export to backend for activity logs (fire and forget)
      // Use JSON format to avoid file download, but pass actual format in query for correct logging
      const actualFormat = format === 'xlsx' ? 'excel' : format;
      try {
        const queryParams = new URLSearchParams();
        queryParams.append('format', 'json'); // Use JSON to avoid download
        queryParams.append('logFormat', actualFormat); // Pass actual format for logging
        queryParams.append('selectedIds', selectedItems.join(','));
        if (activeTerm?.termId) {
          queryParams.append('termId', activeTerm.termId);
        }
        
        const apiModule = await import('../../services/api.js');
        const api = apiModule.default;
        api.get(`/sk-officials/export/csv?${queryParams.toString()}`).catch(err => {
          logger.error('Failed to log export activity', err, { format });
        });
      } catch (err) {
        logger.error('Failed to log export activity', err, { format });
      }
      
      return { success: true };
    },
    onSuccess: () => showSKSuccessToast('exported', null, [
      { label: `Exported ${selectedItems.length} SK officials`, onClick: () => {} },
      { label: 'Clear Selection', onClick: () => setSelectedItems([]) }
    ]),
    onError: (error) => showErrorToast('Bulk export failed', error.message)
  });

  // Sync modal state with existing state variables
  React.useEffect(() => {
    setSortBy(sortModal.sortBy);
    setSortOrder(sortModal.sortOrder);
  }, [sortModal.sortBy, sortModal.sortOrder]);

  // Load SK Officials data
  const loadSKData = async (customStatus = null, customPage = null) => {
    setIsLoading(true);
    try {
      const params = {
        page: customPage || currentPage,
        limit: itemsPerPage,
        sortBy,
        sortOrder,
        q: searchQuery || undefined,
        status: customStatus !== null ? (customStatus !== 'all' ? customStatus : undefined) : (statusFilter !== 'all' ? statusFilter : undefined),
        termId: activeTerm?.termId // Filter by active term
      };

      // Apply additional filters
      if (filterValues.barangayName) params.barangayName = filterValues.barangayName;
      if (filterValues.position) params.position = filterValues.position;

      const response = await skService.getSKOfficials(params);
      if (response.success) {
        logger.debug('SK Data loaded successfully', {
          itemsCount: response.data.data?.items?.length || 0,
          totalSK: response.data.data?.pagination?.totalItems || 0
        });
        setSkData(response.data.data?.items || []);
        setTotalSK(response.data.data?.pagination?.totalItems || 0);
      } else {
        logger.error('Failed to load SK officials', null, { message: response.message, params });
        showErrorToast('Failed to load data', 'Failed to load SK officials data: ' + response.message);
      }
    } catch (error) {
      logger.error('Error loading SK officials', error, { params });
      showErrorToast('Error loading data', 'An error occurred while loading SK officials data');
    } finally {
      setIsLoading(false);
    }
  };

  // Load SK statistics
  const loadSKStats = async () => {
    try {
      const response = await skService.getSKStatistics();
      if (response.success) {
        setSkStats(response.data);
        logger.debug('SK stats loaded', { statsKeys: Object.keys(response.data || {}) });
      } else {
        logger.error('Failed to load SK stats', null, { message: response.message });
      }
    } catch (error) {
      logger.error('Error loading SK stats', error);
    }
  };

  // Load active term data


  // Load term history
  const loadTermHistory = async () => {
    try {
      const response = await skTermsService.getTermHistory();
      if (response.success) {
        setTermHistory(response.data);
        logger.debug('Term history loaded', { historyCount: response.data?.length || 0 });
      } else {
        logger.error('Failed to load term history', null, { message: response.message });
      }
    } catch (error) {
      logger.error('Error loading term history', error);
    }
  };

  // Initialize data from backend
  useEffect(() => {
    const initializeData = async () => {
      try {
        // Load term history (active term is handled by useActiveTerm hook)
        await loadTermHistory();
        // Stats and SK data will be loaded when active term is available
      } catch (error) {
        logger.error('Error initializing SK Management data', error);
      }
    };

    initializeData();
  }, []);

  // Load SK data and stats when active term changes
  useEffect(() => {
    if (hasActiveTerm && activeTerm) {
      loadSKData();
      loadSKStats(); // Load stats when active term is available
    }
  }, [hasActiveTerm, activeTerm?.termId]);

  // Cleanup debounced calls on unmount
  useEffect(() => {
    return () => {
      if (debouncedLoadVacancies.current) {
        clearTimeout(debouncedLoadVacancies.current);
      }
    };
  }, []);

  // Load data when dependencies change
  useEffect(() => {
    if (activeTerm) {
      loadSKData();
    }
  }, [currentPage, itemsPerPage, sortBy, sortOrder, searchQuery, statusFilter, filterValues]);

  // Reset current page if it's out of bounds
  useEffect(() => {
    if (totalSK > 0) {
      const maxPage = Math.ceil(totalSK / itemsPerPage);
      if (currentPage > maxPage) {
        setCurrentPage(1);
      }
    }
  }, [totalSK, itemsPerPage, currentPage]);

  // Note: Tab sync is now handled by the useTabState hook

  // Click outside and escape handling is now managed by individual components
  // Export dropdowns: ExportButton component
  // Sort modal: SortModal component
  // Search: SearchBar component
  // Action menu: ActionMenu component

  // Tab data is now handled by individual Tab components

  const handleSelectItem = (id) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedItems(selectedItems.length === skData.length ? [] : skData.map(item => item.skId));
  };

  // Debounced vacancy loading
  const debouncedLoadVacancies = useRef(null);
  
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Load vacancy data when barangay changes (with debouncing)
    if (name === 'barangayName' && value) {
      // Clear existing timeout
      if (debouncedLoadVacancies.current) {
        clearTimeout(debouncedLoadVacancies.current);
      }
      
      // Set new timeout for debounced loading
      debouncedLoadVacancies.current = setTimeout(() => {
        const selectedBarangay = barangayOptions.find(b => b.name === value);
        if (selectedBarangay) {
          loadBarangayVacancies(selectedBarangay.id);
        }
      }, 300); // 300ms delay
    }
  };

  // Step navigation functions
  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      middleName: '',
      suffix: '',
      barangayName: '',
      position: '',
      personalEmail: ''
    });
    setCurrentStep(1);
  };

  // Get available positions for selected barangay
  const getAvailablePositionsForForm = () => {
    if (!formData.barangayName) return positionOptions.map(p => ({ value: p, label: p }));
    
    const selectedBarangay = barangayOptions.find(b => b.name === formData.barangayName);
    if (!selectedBarangay) return positionOptions.map(p => ({ value: p, label: p }));
    
    const positionsWithAvailability = getAllPositionsWithAvailability(selectedBarangay.id);
    return positionsWithAvailability.map(pos => ({
      value: pos.value,
      label: `${pos.label} ${pos.isAvailable ? `(${pos.available} available)` : '(Full)'}`,
      disabled: !pos.isAvailable,
      available: pos.available,
      current: pos.current,
      max: pos.max
    }));
  };

  // Validate current step
  const validateStep = (step) => {
    switch (step) {
      case 1:
        return formData.firstName.trim() && formData.lastName.trim();
      case 2:
        return formData.barangayName && formData.position;
      case 3:
        return formData.personalEmail.trim();
      default:
        return false;
    }
  };

  // Handle search query changes
  const handleSearchChange = (newQuery) => {
    setSearchQuery(newQuery);
    setCurrentPage(1); // Reset to first page when searching
  };

  // Handle filter changes
  const handleFilterChange = (newValues) => {
    setFilterValues(newValues);
  };

  const handleFilterApply = (appliedValues) => {
    setFilterValues(appliedValues);
    setCurrentPage(1); // Reset to first page when filtering
    logger.debug('Applied filters', { appliedValues });
    // TODO: Apply filters to data loading
  };

  const handleFilterClear = (clearedValues) => {
    setFilterValues(clearedValues);
    setCurrentPage(1);
    logger.debug('Cleared filters');
    // TODO: Clear filters from data loading
  };

  // Check if any filters are active
  const hasActiveFilters = Object.values(filterValues).some(value => {
    if (Array.isArray(value)) return value.length > 0;
    return value && value !== '';
  });

  // Get action menu items for a staff member
  const getActionMenuItems = (item) => {
    const statusAction = item.isActive && !item.deactivated ? 'deactivate' : 'activate';
    const statusLabel = item.isActive && !item.deactivated ? 'Deactivate' : 'Activate';
    
    logger.debug('Action Menu Items', {
      lydoId: item.lydoId,
      name: `${item.firstName} ${item.lastName}`,
      isActive: item.isActive,
      statusAction
    });
    
    return [
      {
        id: 'view',
        label: 'View Details',
        icon: <Eye className="w-4 h-4" />,
        action: 'view'
      },
      {
        id: 'edit',
        label: 'Edit Details',
        icon: <Save className="w-4 h-4" />,
        action: 'edit'
      },
      {
        id: statusAction,
        label: statusLabel,
        icon: <Archive className="w-4 h-4" />,
        action: statusAction
      }
    ];
  };

  const handleActionClick = async (action, item) => {
    logger.debug('Action Menu', { 
      action, 
      itemStatus: { 
        isActive: item.isActive, 
        deactivated: item.deactivated,
        lydoId: item.lydoId,
        name: `${item.firstName} ${item.lastName}`
      } 
    });
    
    switch (action) {
      case 'view':
        setSelectedStaffMember(item);
        setShowViewModal(true);
        break;
      case 'edit':
        setSelectedStaffMember(item);
        setShowEditModal(true);
        break;
      case 'deactivate':
        {
          const confirmed = await confirmation.confirmDeactivate(`${item.firstName} ${item.lastName}`);
          if (confirmed) {
            confirmation.setLoading(true);
            await handleStatusUpdate(item.skId, 'inactive');
            confirmation.hideConfirmation();
          }
        }
        break;
      case 'activate':
        {
          const confirmed = await confirmation.confirmActivate(`${item.firstName} ${item.lastName}`);
          if (confirmed) {
            confirmation.setLoading(true);
            await handleStatusUpdate(item.skId, 'active');
            confirmation.hideConfirmation();
          }
        }
        break;
      case 'delete':
        {
          const confirmed = await confirmation.confirmDelete(`${item.firstName} ${item.lastName}`, 'SK Official');
          if (confirmed) {
            confirmation.setLoading(true);
            await handleDeleteSKOfficial(item.skId);
            confirmation.hideConfirmation();
          }
        }
        break;
      default:
        break;
    }
  };

  // Handle status update
  const handleStatusUpdate = async (id, status, reason = '') => {
    try {
      const response = await skService.updateSKStatus(id, status, reason);
      if (response.success) {
        const skOfficial = skData.find(s => s.skId === id);
        showSKSuccessToast(
          status === 'active' ? 'activated' : 'deactivated',
          skOfficial,
          [
            {
              label: "View Profile",
              onClick: () => {
                setSelectedStaffMember(skOfficial);
                setShowViewModal(true);
              }
            }
          ]
        );
        loadSKData(); // Reload data
        loadSKStats(); // Reload stats
      } else {
        showErrorToast('Failed to update status', response.message);
      }
    } catch (error) {
      logger.error('Error updating status', error, { id });
      showErrorToast('Error updating status', 'An error occurred while updating SK official status');
    }
  };

  // Handle delete SK official
  const handleDeleteSKOfficial = async (id) => {
    try {
      const response = await skService.deleteSKOfficial(id);
      if (response.success) {
        const skOfficial = skData.find(s => s.skId === id);
        showSKSuccessToast('deleted', skOfficial);
        loadSKData(); // Reload data
        loadSKStats(); // Reload stats
      } else {
        showErrorToast('Failed to delete SK official', response.message);
      }
    } catch (error) {
      logger.error('Error deleting SK official', error, { id });
      showErrorToast('Error deleting SK official', 'An error occurred while deleting the SK official');
    }
  };

  // Handle edit SK official save
  const handleEditSave = async (updatedSKOfficial) => {
    setIsEditingSaving(true);
    try {
      const updateData = {
        firstName: updatedSKOfficial.firstName,
        lastName: updatedSKOfficial.lastName,
        middleName: updatedSKOfficial.middleName,
        suffix: updatedSKOfficial.suffix,
        personalEmail: updatedSKOfficial.personalEmail
        // Note: contactNumber is not supported in SK Officials schema
      };

      const response = await skService.updateSKOfficial(updatedSKOfficial.skId, updateData);
      if (response.success) {
        showSKSuccessToast('updated', updatedSKOfficial, [
          {
            label: "View Profile",
            onClick: () => {
              setSelectedStaffMember(updatedSKOfficial);
              setShowViewModal(true);
            }
          }
        ]);
        setShowEditModal(false);
        setSelectedStaffMember(null);
        loadSKData(); // Reload data
        loadSKStats(); // Reload stats
      } else {
        logger.error('Update failed', null, { response, skId: updatedSKOfficial.skId });
        const errorMessage = response.details 
          ? `${response.message}\n\nDetails:\n• ${response.details.join('\n• ')}`
          : response.message;
        showErrorToast('Failed to update SK official', errorMessage);
      }
    } catch (error) {
      logger.error('Error updating SK official', error, { skId: updatedSKOfficial.skId });
      showErrorToast('Error updating SK official', error.message || 'Unknown error occurred');
    } finally {
      setIsEditingSaving(false);
    }
  };

  // Handle bulk operations
  const handleBulkOperation = async () => {
    if (!bulkAction || selectedItems.length === 0) {
      showErrorToast('Selection Required', 'Please select an action and at least one SK official');
      return;
    }

    // selectedItems already contains SK IDs, not objects
    const validation = skService.validateBulkOperation(selectedItems, bulkAction);
    
    if (!validation.isValid) {
      showErrorToast('Validation Failed', validation.errors.join(', '));
      return;
    }

    // Close the action selection modal first
    setShowBulkModal(false);

    // Get selected SK official details for confirmation
    const selectedSK = skData.filter(sk => selectedItems.includes(sk.skId));
    const skNames = selectedSK.map(sk => `${sk.firstName} ${sk.lastName}`).join(', ');
    
    // Show beautiful confirmation dialog
    const actionText = bulkAction === 'activate' ? 'activate' : 'deactivate';
    const confirmed = await confirmation.confirmBulkOperation(
      actionText,
      selectedItems.length,
      'SK official',
      skNames
    );
    
    if (!confirmed) {
      // Reset bulk action if user cancels
      setBulkAction('');
      return;
    }

    confirmation.setLoading(true);
    setIsBulkProcessing(true);
    
    try {
      const response = await skService.bulkUpdateStatus(selectedItems, bulkAction);
      
      if (response.success) {
        confirmation.hideConfirmation();
        showSKSuccessToast('bulk_operation', null, [
          {
            label: `${bulkAction === 'activate' ? 'Activated' : 'Deactivated'} ${response.data.processed || selectedItems.length} SK officials`,
            onClick: () => {
              setActiveTab(bulkAction === 'activate' ? 'active' : 'inactive');
              setCurrentPage(1);
            }
          }
        ]);
        setSelectedItems([]); // Clear selection
        setBulkAction(''); // Reset bulk action
        loadSKData(); // Reload data
        loadSKStats(); // Reload stats
      } else {
        confirmation.hideConfirmation();
        setBulkAction(''); // Reset bulk action on error
        showErrorToast('Bulk Operation Failed', response.message);
      }
    } catch (error) {
      logger.error('Error in bulk operation', error, { bulkAction, itemIds: selectedItems });
      confirmation.hideConfirmation();
      setBulkAction(''); // Reset bulk action on error
      showErrorToast('Bulk Operation Error', 'Error performing bulk operation');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // Export functionality is now handled by the ExportButton component and useStaffExport/useBulkExport hooks

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form data
    const validation = skService.validateSKData(formData, false);
    if (!validation.isValid) {
      showErrorToast('Validation failed', validation.errors.join(', '));
      return;
    }

    try {
      // Convert barangayName to barangayId for backend compatibility
      const barangayOption = barangayOptions.find(b => b.name === formData.barangayName);
      if (!barangayOption) {
        showErrorToast('Invalid barangay', 'Selected barangay not found. Please select a valid barangay.');
        return;
      }

      // Validate position availability before submission
      const positionValidation = await validatePosition(barangayOption.id, formData.position);
      if (!positionValidation.isValid) {
        showErrorToast('Position not available', positionValidation.error);
        return;
      }

      // Prepare submit data - only include fields backend expects
      const submitData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        middleName: formData.middleName || '',
        suffix: formData.suffix || '',
        position: formData.position,
        barangayId: barangayOption.id,
        personalEmail: formData.personalEmail
      };

      logger.debug('Submitting SK official creation', { 
        hasBarangayId: !!submitData.barangayId,
        barangayId: submitData.barangayId,
        position: submitData.position,
        hasEmail: !!submitData.personalEmail
      });

      const response = await skService.createSKOfficial(submitData);
      if (response.success) {
        // Create success toast with actions
        const { credentials, skOfficial } = response.data;
        showSuccessToast(
          'SK Official created successfully!',
          `${formData.firstName} ${formData.lastName} has been added as ${formData.position} for ${formData.barangayName}. Welcome email sent to ${formData.personalEmail}.`,
          [
            {
              label: "View Profile",
              onClick: () => {
                const newSKOfficial = {
                  skId: credentials?.skId,
                  firstName: formData.firstName,
                  lastName: formData.lastName,
                  middleName: formData.middleName,
                  suffix: formData.suffix,
                  position: formData.position,
                  personalEmail: formData.personalEmail,
                  barangayName: formData.barangayName
                };
                setSelectedStaffMember(newSKOfficial);
                setShowViewModal(true);
              }
            },
            {
              label: "Add Another",
              onClick: () => {
                resetForm();
                setFormCollapsed(false);
              }
            }
          ]
        );
        
        // Reset form
        resetForm();
        setFormCollapsed(true);
        loadSKData(); // Reload data
        loadSKStats(); // Reload stats
      } else {
        // Show detailed error message
        const errorMessage = response.details 
          ? `${response.message}\n\nDetails:\n• ${Array.isArray(response.details) ? response.details.join('\n• ') : response.details}`
          : response.message || 'Failed to create SK official';
        logger.error('Failed to create SK official', null, { 
          message: response.message, 
          details: response.details,
          status: response.status,
          submitData: { ...submitData, personalEmail: '***' } // Hide email in logs
        });
        showErrorToast('Failed to create SK official', errorMessage);
      }
    } catch (error) {
      logger.error('Error creating SK official', error, { 
        formData: { ...formData, personalEmail: '***' } // Hide email in logs
      });
      const errorMessage = error.response?.data?.message 
        ? `${error.response.data.message}${error.response.data.errors ? '\n\n' + error.response.data.errors.join('\n') : ''}`
        : error.message || 'An error occurred while creating the SK official';
      showErrorToast('Error creating SK official', errorMessage);
    }
  };



  // Tab styling is now handled by the reusable Tab component



  // Sort modal content is now handled by the reusable SortModal component

  const validationSummary = validationResult?.summary || null;
  const hasFileSelected = !!uploadedFile;
  const hasValidation = !!validationResult;
  const invalidCount = validationSummary?.invalidRecords ?? 0;
  const duplicateCount = validationSummary?.duplicateRecords ?? 0;
  const isValidationPass = hasValidation && invalidCount === 0;
  const validationState = !hasValidation
    ? null
    : invalidCount > 0
      ? 'error'
      : duplicateCount > 0
        ? 'warning'
        : 'success';
  const canImport = isValidationPass && hasActiveTerm;
  const importStep = !hasFileSelected ? 1 : !hasValidation ? 2 : canImport ? 3 : 2;
  const problemRows = hasValidation
    ? (validationResult.rows || []).filter((row) => row.status !== 'valid').slice(0, 5)
    : [];

  // Helper functions for banner display
  const getCompletionPercentage = () => {
    if (!overallVacancyStats || Object.keys(overallVacancyStats).length === 0) {
      return 0;
    }

    const totalPositions = Object.values(overallVacancyStats).reduce((sum, stat) => sum + (stat.max || 0), 0);
    const filledPositions = Object.values(overallVacancyStats).reduce((sum, stat) => sum + (stat.filled || 0), 0);
    
    if (totalPositions === 0) return 0;
    
    return Math.round((filledPositions / totalPositions) * 100);
  };

  const getDaysRemaining = () => {
    if (!activeTerm?.endDate) return 0;
    
    const endDate = new Date(activeTerm.endDate);
    const today = new Date();
    const timeDiff = endDate.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    return Math.max(0, daysDiff);
  };

  const getFilledPositions = () => {
    if (!overallVacancyStats || Object.keys(overallVacancyStats).length === 0) {
      return 0;
    }
    return Object.values(overallVacancyStats).reduce((sum, stat) => sum + (stat.filled || 0), 0);
  };

  const getTotalPositions = () => {
    if (!overallVacancyStats || Object.keys(overallVacancyStats).length === 0) {
      return 0;
    }
    return Object.values(overallVacancyStats).reduce((sum, stat) => sum + (stat.max || 0), 0);
  };

  return (
    <div className="space-y-5">
      {/* Header Section */}
      <HeaderMainContent
        title="SK Management"
        description="Manage SK Officials"
      />

      <ActiveTermBanner
        activeTerm={activeTerm}
        hasActiveTerm={hasActiveTerm}
        isLoading={isLoadingActiveTerm}
        onNavigateToTerms={() => navigate('/admin/sk-governance/terms')}
        onNavigateToReport={() => navigate(`/admin/sk-governance/term-report?termId=${activeTerm?.termId}`)}
        variant="management"
      />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column - Staff List */}
        <div className="xl:col-span-2">
          <div className={`bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden ${!hasActiveTerm ? 'opacity-50' : ''}`}>
            {/* Tabs - Using Reusable Tab Components */}
            <TabContainer
              activeTab={activeTab}
              onTabChange={hasActiveTerm ? setActiveTab : undefined}
              variant="underline"
              size="md"
              disabled={!hasActiveTerm}
            >
              <Tab 
                id="all" 
                label="All SK Officials" 
                shortLabel="All"
                count={skStats?.total || 0} 
                color="blue"
              />
              <Tab 
                id="active" 
                label="Active" 
                count={skStats?.active || 0} 
                color="green"
              />
              <Tab 
                id="inactive" 
                label="Deactivated" 
                count={skStats?.inactive || 0} 
                color="yellow"
              />
            </TabContainer>

            {/* Controls */}
            <div className="px-5 py-4 border-t border-gray-100">
              {/* Left/Right Layout with Single Row */}
              <div className="flex items-center justify-between gap-4">
                {/* Left Controls */}
                <div className="flex items-center gap-3 overflow-x-auto pb-2 md:pb-0 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                  <div className="flex items-center space-x-3 min-w-max">
                    {/* Search Bar */}
                    <div className="flex-shrink-0">
                      <SearchBar
                        value={searchQuery}
                        onChange={hasActiveTerm ? handleSearchChange : undefined}
                        placeholder="Search SK officials..." 
                        expandOnMobile={true}
                        showIndicator={true}
                        indicatorText="Search"
                        indicatorColor="orange"
                        size="md"
                        autoFocus={false}
                        debounceMs={300}
                        disabled={!hasActiveTerm}
                      />
                    </div>

                    {/* Filter Button */}
                    <button 
                      ref={filterTriggerRef}
                      onClick={hasActiveTerm ? () => setShowFilterModal(true) : undefined}
                      disabled={!hasActiveTerm}
                      className={`inline-flex items-center border rounded-lg font-medium transition-all duration-200 ${
                        showFilterModal || hasActiveFilters
                          ? 'border-green-500 text-green-600 bg-green-50' 
                          : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                      } ${!hasActiveTerm ? 'opacity-50 cursor-not-allowed' : ''} px-2 py-1.5 sm:px-3 sm:py-2 whitespace-nowrap flex-shrink-0`}
                    >
                      <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Filter</span>
                      <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1" />
                      
                      {/* Filter Indicator */}
                      {hasActiveFilters && (
                        <div className="ml-2 px-1.5 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full border border-green-200">
                          {Object.values(filterValues).filter(v => v && v !== '' && (!Array.isArray(v) || v.length > 0)).length}
                        </div>
                      )}
                    </button>

                    {/* Sort Button */}
                    <button 
                      ref={sortModal.triggerRef}
                      onClick={hasActiveTerm ? sortModal.toggleModal : undefined}
                      disabled={!hasActiveTerm}
                      className={`inline-flex items-center border rounded-lg font-medium transition-all duration-200 ${
                        sortModal.isOpen || !sortModal.isDefaultSort
                          ? 'border-blue-500 text-blue-600 bg-blue-50' 
                          : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                      } ${!hasActiveTerm ? 'opacity-50 cursor-not-allowed' : ''} px-2 py-1.5 sm:px-3 sm:py-2 whitespace-nowrap flex-shrink-0`}
                    >
                      <ArrowUpDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Sort</span>
                      <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1" />
                      
                      {/* Sort Indicator */}
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
                    formats={['csv', 'xlsx', 'pdf']}
                    onExport={hasActiveTerm ? mainExport.handleExport : undefined}
                    isExporting={mainExport.isExporting}
                    label="Export"
                    size="md"
                    position="auto"
                    responsive={true}
                    disabled={!hasActiveTerm}
                  />

                  {/* View Mode Toggle */}
                  <div className={`flex items-center border border-gray-200 rounded-lg p-1 ${!hasActiveTerm ? 'opacity-50' : ''}`}>
                    <button
                      onClick={hasActiveTerm ? () => setViewMode('grid') : undefined}
                      disabled={!hasActiveTerm}
                      className={`p-1.5 rounded transition-all duration-200 ${
                        viewMode === 'grid' 
                          ? 'bg-white text-blue-600 shadow-sm' 
                          : 'text-gray-600 hover:text-gray-800'
                      } ${!hasActiveTerm ? 'cursor-not-allowed' : ''}`}
                    >
                      <Grid className="w-4 h-4" />
                    </button>
                    <button
                      onClick={hasActiveTerm ? () => setViewMode('list') : undefined}
                      disabled={!hasActiveTerm}
                      className={`p-1.5 rounded transition-all duration-200 ${
                        viewMode === 'list' 
                          ? 'bg-white text-blue-600 shadow-sm' 
                          : 'text-gray-600 hover:text-gray-800'
                      } ${!hasActiveTerm ? 'cursor-not-allowed' : ''}`}
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Modals */}
              <SortModal
                isOpen={sortModal.isOpen}
                onClose={sortModal.closeModal}
                triggerRef={sortModal.triggerRef}
                title="Sort Options"
                sortFields={[
                  { value: 'last_name', label: 'Last Name' },
                  { value: 'first_name', label: 'First Name' },
                  { value: 'full_name', label: 'Full Name' },
                  { value: 'position', label: 'Position' },
                  { value: 'barangay_name', label: 'Barangay' },
                  { value: 'created_at', label: 'Date Created' },
                  { value: 'is_active', label: 'Status' },
                  { value: 'email', label: 'Email Address' }
                ]}
                sortBy={sortModal.sortBy}
                sortOrder={sortModal.sortOrder}
                onSortChange={sortModal.updateSort}
                onReset={sortModal.resetSort}
                defaultSortBy="last_name"
                defaultSortOrder="asc"
              />

              <FilterModal
                isOpen={showFilterModal}
                onClose={() => setShowFilterModal(false)}
                triggerRef={filterTriggerRef}
                title="Advanced Filters"
                filters={filterConfig}
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
            itemName="SK official"
            itemNamePlural="SK officials"
            onBulkAction={hasActiveTerm ? () => setShowBulkModal(true) : undefined}
            exportConfig={{
              formats: ['csv', 'xlsx', 'pdf'],
              onExport: hasActiveTerm ? bulkExportHook.handleExport : undefined,
              isExporting: bulkExportHook.isExporting
            }}
            primaryColor="green"
            disabled={!hasActiveTerm}
          />

            {/* Bulk Operations Modal */}
            {showBulkModal && createPortal(
              <div className="fixed inset-0 flex items-center justify-center z-[99999] p-4 backdrop-blur-[1px]" onClick={() => setShowBulkModal(false)}>
                <div className="bg-white rounded-lg shadow-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Bulk Operations</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {selectedItems.length} SK official{selectedItems.length > 1 ? 's' : ''} selected
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
                        <option value="activate">Activate</option>
                        <option value="deactivate">Deactivate</option>
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

          {/* Content Area */}
          {(tabLoading || isLoading) ? (
            <LoadingSpinner 
              variant="spinner"
              message="Loading SK officials data..." 
              size="md"
              color="blue"
              height="h-64"
            />
          ) : (
            <div>
              <DataTable
                data={skData}
                selectedItems={selectedItems}
                onSelectItem={hasActiveTerm ? handleSelectItem : undefined}
                onSelectAll={hasActiveTerm ? handleSelectAll : undefined}
                getActionMenuItems={hasActiveTerm ? getActionMenuItems : undefined}
                onActionClick={hasActiveTerm ? handleActionClick : undefined}
                onCardClick={(item) => {
                  setSelectedStaffMember(item);
                  setShowViewModal(true);
                }}
                viewMode={viewMode}
                keyField="skId"
                disabled={!hasActiveTerm}
              displayFields={{
                avatar: { 
                  firstName: 'firstName', 
                  lastName: 'lastName', 
                  email: 'personalEmail', 
                  picture: 'profilePicture' 
                },
                title: (item) => `${item.firstName} ${item.lastName}`,
                email: (item) => item.personalEmail,
                status: (item) => item.isActive ? 'active' : 'deactivated',
                date: 'createdAt',
                position: (item) => item.position,
                badge: (item) => ({
                  text: item.barangayName,
                  className: 'bg-gray-100 text-gray-700 border border-gray-200 font-medium'
                })
              }}
              selectAllLabel="Select All SK Officials"
              emptyMessage={`No SK officials found${activeTerm ? ` for ${activeTerm.termName}` : ''}`}
              styling={{
                gridCols: 'grid-cols-1 lg:grid-cols-2',
                cardHover: 'hover:border-green-300 hover:shadow-xl hover:shadow-green-100/50 hover:scale-[1.02]',
                listHover: 'hover:bg-green-50/30 hover:border-l-4 hover:border-l-green-400',
                theme: 'green'
              }}
            />
            </div>
          )}

            {/* Pagination - Always visible */}
            {!(tabLoading || isLoading) && hasActiveTerm && (
              <Pagination
                currentPage={currentPage}
                totalItems={totalSK}
                itemsPerPage={itemsPerPage}
                onPageChange={pagination.handlePageChange}
                onItemsPerPageChange={pagination.handleItemsPerPageChange}
                itemName="SK official"
                itemNamePlural="SK officials"
                showItemsPerPage={true}
                showInfo={true}
                size="md"
                variant="default"
                itemsPerPageOptions={[5, 10, 20, 50]}
              />
            )}
          </div>
        </div>

        {/* Right Column - Add New SK Official Form */}
        <div className="xl:col-span-1">
          {/* Bulk Import - Upload File (now first) */}
          <div className={`bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden sticky top-4 ${!hasActiveTerm ? 'opacity-50' : ''}`}>
            <button
              type="button"
              onClick={hasActiveTerm ? () => setUploadCollapsed(prev => !prev) : undefined}
              disabled={!hasActiveTerm}
              className={`w-full px-5 py-4 flex items-center justify-between transition-colors duration-200 ${uploadCollapsed ? 'bg-gray-50 border-b border-gray-100' : 'bg-emerald-50 border-b border-emerald-200'} ${!hasActiveTerm ? 'cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center">
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                  <Upload className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="text-left">
                  <h2 className="text-lg font-bold text-gray-900">Bulk Import</h2>
                  <p className="text-sm text-gray-600">
                    {hasActiveTerm ? 'Upload a CSV or Excel file to import SK officials' : 'Activate an SK term to enable bulk import'}
                  </p>
                </div>
              </div>
              <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${uploadCollapsed ? 'rotate-180' : 'rotate-0'}`} />
            </button>
            <div className={`p-5 space-y-4 ${uploadCollapsed ? 'hidden' : ''}`}>
              {/* Stepper */}
              <div className="flex items-center justify-between text-xs font-medium">
                <div className={`flex items-center flex-1 min-w-0 ${importStep >= 1 ? 'text-indigo-700' : 'text-gray-400'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 ${importStep >= 1 ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-400'}`}>1</div>
                  <span className="truncate">Select File</span>
                </div>
                <div className={`h-px flex-1 mx-2 ${importStep > 1 ? 'bg-indigo-300' : 'bg-gray-200'}`} />
                <div className={`flex items-center flex-1 min-w-0 ${importStep >= 2 ? 'text-indigo-700' : 'text-gray-400'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 ${importStep >= 2 ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-400'}`}>2</div>
                  <span className="truncate">Validate</span>
                </div>
                <div className={`h-px flex-1 mx-2 ${importStep > 2 ? 'bg-indigo-300' : 'bg-gray-200'}`} />
                <div className={`flex items-center flex-1 min-w-0 ${importStep >= 3 ? 'text-indigo-700' : 'text-gray-400'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 ${importStep >= 3 ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-400'}`}>3</div>
                  <span className="truncate">Import</span>
                </div>
              </div>

              {/* Template links */}
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>Need a sample? Includes required columns.</span>
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await skService.downloadTemplate('csv');
                        showInfoToast('Template downloaded', 'CSV template has been downloaded to your computer.');
                      } catch (error) {
                        logger.error('CSV template download failed', error, { format: 'csv' });
                        showErrorToast('Download failed', 'Failed to download CSV template. Please try again.');
                      }
                    }}
                    disabled={!hasActiveTerm || isValidating || isImporting}
                    className="inline-flex items-center text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
                  >
                    <FileText className="w-3.5 h-3.5 mr-1" /> CSV Template
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await skService.downloadTemplate('xlsx');
                        showInfoToast('Template downloaded', 'Excel template has been downloaded to your computer.');
                      } catch (error) {
                        logger.error('Excel template download failed', error, { format: 'xlsx' });
                        showErrorToast('Download failed', 'Failed to download Excel template. Please try again.');
                      }
                    }}
                    disabled={!hasActiveTerm || isValidating || isImporting}
                    className="inline-flex items-center text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
                  >
                    <FileText className="w-3.5 h-3.5 mr-1" /> Excel Template
                  </button>
                </div>
              </div>

              {/* Choose File */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Choose file</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={!hasActiveTerm}
                />
                <button
                  type="button"
                  onClick={() => hasActiveTerm && fileInputRef.current && fileInputRef.current.click()}
                  onDrop={hasActiveTerm ? handleDrop : undefined}
                  onDragOver={hasActiveTerm ? handleDragOver : undefined}
                  disabled={!hasActiveTerm || isValidating || isImporting}
                  className={`w-full border-2 border-dashed rounded-lg p-4 text-left transition-colors duration-200 ${
                    uploadedFile ? 'border-emerald-300 bg-emerald-50/30 hover:bg-emerald-50' : 'border-gray-300 hover:bg-gray-50'
                  } ${!hasActiveTerm ? 'cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 ${uploadedFile ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                        <Upload className={`w-5 h-5 ${uploadedFile ? 'text-emerald-600' : 'text-gray-500'}`} />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-900">
                          {uploadedFile ? uploadedFile.name : 'Click to select a CSV or Excel file'}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          Supported: .csv, .xlsx • Max 10MB
                        </div>
                      </div>
                    </div>
                    {uploadedFile ? (
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!hasActiveTerm) return;
                            fileInputRef.current && fileInputRef.current.click();
                          }}
                          disabled={!hasActiveTerm || isValidating || isImporting}
                          className="px-2.5 py-1 text-xs font-medium rounded border border-emerald-200 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                        >
                          Change
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            clearFile();
                          }}
                          disabled={!hasActiveTerm || isValidating || isImporting}
                          className="px-2.5 py-1 text-xs font-medium rounded border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                          Clear
                        </button>
                      </div>
                    ) : (
                      <div className="text-xs font-medium text-indigo-700">Browse</div>
                    )}
                  </div>
                </button>
                {uploadedFile && (
                  <div className="mt-2 text-xs text-gray-600">
                    {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB • {uploadedFile.type || 'File'}
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={clearFile}
                  disabled={!uploadedFile || isValidating || isImporting || !hasActiveTerm}
                  className="px-4 py-2 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={validateFile}
                  disabled={!uploadedFile || isValidating || isImporting || !hasActiveTerm}
                  className={`inline-flex items-center px-4 py-2 rounded-lg font-medium text-white disabled:opacity-50 ${
                    uploadedFile ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-300'
                  }`}
                >
                  {isValidating ? 'Validating...' : 'Validate'}
                </button>
              </div>

              <p className="text-xs text-gray-500">
                Supported formats: CSV, XLSX. Max 10MB.
              </p>

              {hasValidation && (
                <div
                  className={`rounded-lg border p-3 ${
                    validationState === 'success'
                      ? 'border-green-200 bg-green-50'
                      : validationState === 'warning'
                        ? 'border-amber-200 bg-amber-50'
                        : 'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-gray-900">
                      {validationState === 'success'
                        ? 'Validation passed'
                        : validationState === 'warning'
                          ? 'Validation passed with duplicates'
                          : 'Validation completed with issues'}
                    </div>
                    {validationState === 'success' && <CheckCircle className="w-4 h-4 text-green-600" />}
                  </div>
                  <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-gray-700">
                    <div className="bg-white border border-gray-100 rounded px-2 py-1">
                      <span className="font-medium">Total:</span> {validationSummary?.totalRecords ?? 0}
                    </div>
                    <div className="bg-white border border-gray-100 rounded px-2 py-1">
                      <span className="font-medium">Valid:</span> {validationSummary?.validRecords ?? 0}
                    </div>
                    <div className="bg-white border border-gray-100 rounded px-2 py-1">
                      <span className="font-medium">Invalid:</span> {validationSummary?.invalidRecords ?? 0}
                    </div>
                    <div className="bg-white border border-gray-100 rounded px-2 py-1">
                      <span className="font-medium">Duplicates:</span> {duplicateCount}
                    </div>
                  </div>
                  {duplicateCount > 0 && (
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-gray-600">
                      <div className="bg-white border border-gray-100 rounded px-2 py-1">
                        <span className="font-medium">Within file:</span> {validationSummary?.duplicateInFile ?? 0}
                      </div>
                      <div className="bg-white border border-gray-100 rounded px-2 py-1">
                        <span className="font-medium">Existing active:</span> {validationSummary?.duplicateInDbActive ?? 0}
                      </div>
                      <div className="bg-white border border-gray-100 rounded px-2 py-1">
                        <span className="font-medium">Existing inactive:</span> {validationSummary?.duplicateInDbInactive ?? 0}
                      </div>
                    </div>
                  )}
                  {validationState === 'error' && (
                    <div className="mt-2 text-xs text-red-600">
                      Fix the highlighted issues in your file and re-validate.
                    </div>
                  )}
                  {validationState === 'warning' && (
                    <div className="mt-2 text-xs text-gray-600">
                      Duplicates detected. Choose how to handle them before importing.
                    </div>
                  )}
                  {problemRows.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-semibold text-gray-700">First few issues</p>
                      <ul className="mt-1 space-y-1 text-xs text-gray-600">
                        {problemRows.map((row) => (
                          <li key={row.rowNumber}>
                            <span className="font-medium">Row {row.rowNumber}:</span>{' '}
                            {row.issues.length > 0 ? row.issues.join('; ') : 'Potential duplicate'}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadValidationReport}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-50"
                    >
                      <FileText className="w-4 h-4 mr-1.5" />
                      Download validation report
                    </button>
                  </div>
                  {validationState !== 'error' && (
                    <div className="mt-3">
                      <p className="text-xs font-semibold text-gray-700 mb-1">Duplicate handling</p>
                      <div className="flex flex-col gap-1 text-xs text-gray-600">
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="radio"
                            name="skDuplicateStrategy"
                            value="skip"
                            checked={duplicateStrategy === 'skip'}
                            onChange={(e) => setDuplicateStrategy(e.target.value)}
                          />
                          <span>Skip duplicates (no changes to existing officials)</span>
                        </label>
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="radio"
                            name="skDuplicateStrategy"
                            value="update"
                            checked={duplicateStrategy === 'update'}
                            onChange={(e) => setDuplicateStrategy(e.target.value)}
                          />
                          <span>Update existing officials when a duplicate is active</span>
                        </label>
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="radio"
                            name="skDuplicateStrategy"
                            value="restore"
                            checked={duplicateStrategy === 'restore'}
                            onChange={(e) => setDuplicateStrategy(e.target.value)}
                          />
                          <span>Restore inactive duplicates (and update details)</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {importSummary && (
                <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-gray-900">Last Import Summary</div>
                    <button
                      type="button"
                      onClick={handleDownloadImportReport}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100"
                    >
                      <FileText className="w-4 h-4 mr-1.5" />
                      Download import report
                    </button>
                  </div>
                  <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div><span className="font-medium text-gray-900">Created:</span> {importSummary.summary?.created ?? importSummary.created ?? 0}</div>
                    <div><span className="font-medium text-gray-900">Updated:</span> {importSummary.summary?.updated ?? importSummary.updated ?? 0}</div>
                    <div><span className="font-medium text-gray-900">Restored:</span> {importSummary.summary?.restored ?? importSummary.restored ?? 0}</div>
                    <div><span className="font-medium text-gray-900">Skipped:</span> {importSummary.summary?.skipped ?? importSummary.skipped ?? 0}</div>
                    <div><span className="font-medium text-gray-900">Failed:</span> {importSummary.summary?.failed ?? importSummary.failed ?? 0}</div>
                    <div><span className="font-medium text-gray-900">Total:</span> {importSummary.summary?.total ?? importSummary.total ?? 0}</div>
                  </div>
                  {importSummary.errors?.length > 0 && (
                    <div className="mt-2">
                      <p className="font-semibold text-xs text-gray-800">First few issues</p>
                      <ul className="mt-1 space-y-1 text-xs text-gray-600">
                        {importSummary.errors.slice(0, 5).map((item, idx) => (
                          <li key={`error-${idx}-${item.row || idx}`}>
                            <span className="font-medium">
                              {item.row ? `Row ${item.row}:` : 'Error:'}
                            </span>{' '}
                            {item.reason || item.message || 'Unknown error'}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {canImport && (
                <button
                  type="button"
                  onClick={importFile}
                  disabled={isImporting}
                  className="w-full inline-flex items-center justify-center px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {isImporting ? 'Importing...' : 'Import SK Officials'}
                </button>
              )}

              {!hasActiveTerm && (
                <p className="text-xs text-red-500">
                  Activate an SK term before importing officials.
                </p>
              )}
            </div>
          </div>

          {/* Add New SK Official (now second) */}
          <div className={`mt-6 ${!hasActiveTerm ? 'opacity-50' : ''}`}>
            <CollapsibleForm
              title="Add New SK Official"
              description={hasActiveTerm ? `Create a new SK official profile for ${activeTerm?.termName || 'current term'}` : 'No active term available'}
              icon={<UserPlus className="w-5 h-5" />}
              defaultCollapsed={formCollapsed}
              onToggle={hasActiveTerm ? setFormCollapsed : undefined}
              iconBgColor={hasActiveTerm ? "bg-green-100" : "bg-gray-100"}
              iconTextColor={hasActiveTerm ? "text-green-600" : "text-gray-400"}
              className="sticky top-[calc(1rem+56px)]"
              disabled={!hasActiveTerm}
            >
            {/* Term Assignment Info */}
            {hasActiveTerm && activeTerm && !formCollapsed && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">
                    Official will be assigned to: {activeTerm.termName}
                  </span>
                </div>
                <p className="text-xs text-green-600 mt-1">
                  All new SK officials are automatically assigned to the current active term.
                </p>
              </div>
            )}


            {/* Step Progress Indicator */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Step {currentStep} of {totalSteps}</span>
                <span className="text-sm text-gray-500">
                  {currentStep === 1 && "Basic Information"}
                  {currentStep === 2 && "Barangay & Position Assignment"}
                  {currentStep === 3 && "Contact Information"}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                ></div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Step 1: Basic Information */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
                    <User className="w-5 h-5 mr-2 text-green-600" />
                    Basic Information
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Last Name *</label>
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleFormChange}
                        required
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
                        placeholder="Santos"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">First Name *</label>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleFormChange}
                        required
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
                        placeholder="Maria"
                      />
                    </div>
                  
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Middle Name</label>
                      <input
                        type="text"
                        name="middleName"
                        value={formData.middleName}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
                        placeholder="Cruz"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Suffix</label>
                      <input
                        type="text"
                        name="suffix"
                        value={formData.suffix}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
                        placeholder="Jr., Sr., III"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Barangay & Position Assignment */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
                    <Briefcase className="w-5 h-5 mr-2 text-green-600" />
                    Barangay & Position Assignment
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Barangay *</label>
                      <select
                        name="barangayName"
                        value={formData.barangayName}
                        onChange={handleFormChange}
                        required
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
                      >
                        <option value="">Select barangay</option>
                        {barangayOptions.map(barangay => (
                          <option key={barangay.id} value={barangay.name}>
                            {barangay.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Position *</label>
                      <select
                        name="position"
                        value={formData.position}
                        onChange={handleFormChange}
                        required
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
                      >
                        <option value="">Select position</option>
                        {getAvailablePositionsForForm().map(position => (
                          <option 
                            key={position.value} 
                            value={position.value}
                            disabled={position.disabled}
                            className={position.disabled ? 'text-gray-400' : ''}
                          >
                            {position.label}
                          </option>
                        ))}
                      </select>
                      
                      {/* Vacancy indicator */}
                      {formData.barangayName && (
                        <div className="mt-2">
                          {isLoadingVacancies ? (
                            <div className="text-sm text-gray-500">Loading vacancy data...</div>
                          ) : (
                            <div className="text-sm text-gray-600">
                              {formData.position && (() => {
                                const selectedBarangay = barangayOptions.find(b => b.name === formData.barangayName);
                                if (!selectedBarangay) return null;
                                
                                const vacancies = barangayVacancies[selectedBarangay.id];
                                if (!vacancies) return null;
                                
                                const positionData = vacancies[formData.position];
                                if (!positionData) return null;
                                
                                return (
                                  <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    positionData.available > 0 
                                      ? 'bg-green-100 text-green-700' 
                                      : 'bg-red-100 text-red-700'
                                  }`}>
                                    {positionData.available > 0 
                                      ? `${positionData.available} slot${positionData.available > 1 ? 's' : ''} available`
                                      : 'Position full'
                                    }
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Contact Information */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
                    <Mail className="w-5 h-5 mr-2 text-green-600" />
                    Contact Information
                  </h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Personal Email *</label>
                    <input
                      type="email"
                      name="personalEmail"
                      value={formData.personalEmail}
                      onChange={handleFormChange}
                      required
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
                      placeholder="maria.santos@gmail.com"
                    />
                  </div>

                  {/* Summary */}
                  <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
                    <h4 className="font-medium text-green-800 mb-3">Review Information</h4>
                    <div className="space-y-2 text-sm text-green-700">
                      <div><span className="font-medium">Name:</span> {formData.firstName} {formData.middleName} {formData.lastName} {formData.suffix}</div>
                      <div><span className="font-medium">Barangay:</span> {formData.barangayName || 'Not selected'}</div>
                      <div><span className="font-medium">Position:</span> {formData.position}</div>
                      <div><span className="font-medium">Email:</span> {formData.personalEmail}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step Navigation */}
              <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                <div className="flex space-x-3">
                  {currentStep > 1 && (
                    <button
                      type="button"
                      onClick={prevStep}
                      className="inline-flex items-center px-4 py-2 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-200 transition-all duration-200"
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Previous
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-200 transition-all duration-200"
                  >
                    Clear All
                  </button>
                </div>

                <div className="flex space-x-3">
                  {currentStep < totalSteps ? (
                    <button
                      type="button"
                      onClick={nextStep}
                      disabled={!validateStep(currentStep)}
                      className="inline-flex items-center px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={!validateStep(currentStep) || !hasActiveTerm}
                      className="inline-flex items-center px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Add SK Official
                    </button>
                  )}
                </div>
              </div>
            </form>
            </CollapsibleForm>
          </div>
        </div>
      </div>

      {/* Staff Details Modals */}
      <TabbedDetailModal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setSelectedStaffMember(null);
        }}
        data={selectedStaffMember || {}}
        mode="view"
        config={skDetailConfig}
      />

      <TabbedDetailModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedStaffMember(null);
        }}
        data={selectedStaffMember || {}}
        mode="edit"
        config={{
          ...skDetailConfig,
          onSave: async (form) => {
            await handleEditSave(form);
            return true;
          },
          onDiscard: () => {
            setShowEditModal(false);
            setSelectedStaffMember(null);
          }
        }}
      />
      
      {/* Universal Toast Container */}
      <ToastContainer position="top-right" maxToasts={5} />
      
      {/* Universal Confirmation Modal - Beautiful replacement for browser confirm() */}
      <ConfirmationModal {...confirmation.modalProps} />
    </div>
  );
};

export default SKManagement;