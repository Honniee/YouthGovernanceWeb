import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  FileText
} from 'lucide-react';
import { HeaderMainContent, TabContainer, Tab, useTabState, ActionMenu, SearchBar, FilterButton, SortButton, SortModal, Pagination, useSortModal, usePagination, Avatar, Status, ExportButton, useExport, LoadingSpinner, BulkActionsBar, CollapsibleForm, DataTable, TabbedDetailModal } from '../../components/portal_main_content';
import { ToastContainer, showStaffSuccessToast, showSuccessToast, showErrorToast, showInfoToast, showWarningToast, ConfirmationModal } from '../../components/universal';
import useConfirmation from '../../hooks/useConfirmation';
import staffService from '../../services/staffService.js';
import { staffDetailConfig } from '../../components/portal_main_content/tabbedModalConfigs.jsx';
import logger from '../../utils/logger.js';

const StaffManagement = () => {
  // Use our reusable tab state hook
  const { activeTab, setActiveTab } = useTabState('all', async (tabId) => {
    setTabLoading(true);
    setStatusFilter(tabId);
    setCurrentPage(1); // Reset to first page when changing tabs
    
    // Wait a bit to show loading effect and then load data
    try {
      // Add a minimum loading time to make the effect visible
      const [dataResult] = await Promise.all([
        loadStaffData(tabId, 1), // Load data for the new tab
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
  const [isLoading, setIsLoading] = useState(false);
  const [tabLoading, setTabLoading] = useState(false);
  // Search expand state is now handled by the SearchBar component
  // Action menu state is now handled by the ActionMenu component
  // Search ref is now handled by the SearchBar component
  // Export state is now handled by the ExportButton component
  
  // Staff data state
  const [staffData, setStaffData] = useState([]);
  const [totalStaff, setTotalStaff] = useState(0);
  const [staffStats, setStaffStats] = useState({
    total: 0,
    active: 0,
    deactivated: 0
  });
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Form state
  const [formData, setFormData] = useState({
    lastName: '',
    firstName: '',
    middleName: '',
    suffix: '',
    personalEmail: ''
  });
  
  // Collapse state for Add Staff form
  const [formCollapsed, setFormCollapsed] = useState(true);
  
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
  const [uploadCollapsed, setUploadCollapsed] = useState(true);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [duplicateStrategy, setDuplicateStrategy] = useState('skip');
  const [importSummary, setImportSummary] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] ?? null;
    setUploadedFile(file);
    setValidationResult(null);
    setImportSummary(null);
    setDuplicateStrategy('skip');
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
      const response = await staffService.validateBulkImport(uploadedFile);
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
      const response = await staffService.bulkImportStaff(uploadedFile, duplicateStrategy);
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
            `${importedCount}/${computedSummary.total} staff members imported successfully.`
          );
        }

        await loadStaffData();
        await loadStaffStats();
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
      Personal_Email: row.normalized?.personal_email ?? '',
      Duplicate_In_File: row.duplicate?.inFile
        ? row.duplicate?.isPrimaryInFile
          ? 'Yes (first occurrence)'
          : 'Yes'
        : 'No',
      Duplicate_System_Active: row.duplicate?.inDbActive ? 'Yes' : 'No',
      Duplicate_System_Inactive: row.duplicate?.inDbArchived ? 'Yes' : 'No'
    }));

    downloadReportCsv(csvRows, 'staff_validation_report.csv');
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
      Validation_Status: row.validationStatus ?? '',
      Validation_Issues: (row.validationIssues || []).join('; ')
    }));

    downloadReportCsv(csvRows, 'staff_import_report.csv');
  };

  // Modal state management using custom hooks
  const sortModal = useSortModal(sortBy, sortOrder);
  
  // Pagination state management using custom hook
  const pagination = usePagination({
    initialPage: currentPage,
    initialItemsPerPage: itemsPerPage,
    totalItems: totalStaff,
    onPageChange: setCurrentPage,
    onItemsPerPageChange: setItemsPerPage
  });

  // Confirmation modal hook
  const confirmation = useConfirmation();

  // Export state management using custom hooks - Enhanced with Universal Toast
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
  const buildStaffCsvRows = (list) => {
    const headers = ['LYDO ID', 'Name', 'Email', 'Status'];
    const rows = list.map(s => [
      s.lydoId || '',
      `${s.firstName || ''} ${s.lastName || ''}`.trim(),
      s.personalEmail || '',
      (s.isActive && !s.deactivated) ? 'Active' : 'Deactivated'
    ]);
    return [headers, ...rows];
  };
  const downloadCsv = (filename, rows) => {
    const csv = rows.map(r => r.map(escapeCsv).join(',')).join('\n');
    downloadFile(new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' }), filename);
  };
  const buildExcelXml = (sheetName, rows) => {
    const rowXml = rows.map(r => `<Row>${r.map(c => `<Cell><Data ss:Type="String">${String(c??'')}</Data></Cell>`).join('')}</Row>`).join('');
    return `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
<Worksheet ss:Name="${sheetName}">
<Table>
${rowXml}
</Table>
</Worksheet>
</Workbook>`;
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
    exportFunction: async (format, style = null) => {
      try {
        const filteredStaff = statusFilter === 'all' ? staffData : staffData.filter(s => (s.isActive && !s.deactivated ? 'active' : 'deactivated') === statusFilter);
        if (format === 'csv') {
          const rows = buildStaffCsvRows(filteredStaff);
          downloadCsv('staff.csv', rows);
        } else if (format === 'excel') {
          const rows = buildStaffCsvRows(filteredStaff);
          const xml = buildExcelXml('Staff', rows);
          downloadExcel('staff.xls', xml);
        } else if (format === 'pdf') {
          const rows = buildStaffCsvRows(filteredStaff);
          openPrintPdf('LYDO Staff', rows[0], rows.slice(1));
        }
        
        // Log export to backend for activity logs (fire and forget)
        // Use JSON format to avoid file download, but pass actual format in query for correct logging
        const status = statusFilter === 'all' ? 'all' : statusFilter;
        const actualFormat = format; // Keep track of actual format exported
        try {
          const queryParams = new URLSearchParams();
          queryParams.append('format', 'json'); // Use JSON to avoid download
          queryParams.append('logFormat', actualFormat); // Pass actual format for logging
          if (status !== 'all') {
            queryParams.append('status', status);
          }
          
          const apiModule = await import('../../services/api.js');
          const api = apiModule.default;
          api.get(`/staff/export?${queryParams.toString()}`).catch(err => {
            logger.error('Failed to log export activity', err, { format });
          });
      } catch (err) {
        logger.error('Failed to log export activity', err, { format });
      }
        
        return { success: true };
      } catch (error) {
        throw new Error(error.message || 'Failed to export staff data');
      }
    },
    onSuccess: () => showStaffSuccessToast('exported', null, [
      { label: "Export Another", onClick: () => {} }
    ]),
    onError: (error) => showErrorToast('Export Failed', error.message)
  });

  const bulkExportHook = useExport({
    exportFunction: async (format, style = null) => {
      try {
        const selectedStaffData = staffData.filter(staff => selectedItems.includes(staff.lydoId));
        if (selectedStaffData.length === 0) {
          throw new Error('No staff selected for export');
        }

        if (format === 'csv') {
          const rows = buildStaffCsvRows(selectedStaffData);
          downloadCsv('staff-selected.csv', rows);
        } else if (format === 'excel') {
          const rows = buildStaffCsvRows(selectedStaffData);
          const xml = buildExcelXml('Selected Staff', rows);
          downloadExcel('staff-selected.xls', xml);
        } else if (format === 'pdf') {
          const rows = buildStaffCsvRows(selectedStaffData);
          openPrintPdf('Selected Staff', rows[0], rows.slice(1));
        }
        
        // Log export to backend for activity logs (fire and forget)
        // Use JSON format to avoid file download, but pass actual format in query for correct logging
        try {
          const queryParams = new URLSearchParams();
          queryParams.append('format', 'json'); // Use JSON to avoid download
          queryParams.append('logFormat', format); // Pass actual format for logging
          queryParams.append('selectedIds', selectedItems.join(','));
          
          const apiModule = await import('../../services/api.js');
          const api = apiModule.default;
          api.get(`/staff/export?${queryParams.toString()}`).catch(err => {
            logger.error('Failed to log export activity', err, { format });
          });
      } catch (err) {
        logger.error('Failed to log export activity', err, { format });
      }
        
        return { success: true };
      } catch (error) {
        throw new Error(error.message || 'Failed to export selected staff');
      }
    },
    onSuccess: () => showStaffSuccessToast('exported', null, [
      { label: `Exported ${selectedItems.length} staff members`, onClick: () => {} }
    ]),
    onError: (error) => showErrorToast('Bulk Export Failed', error.message)
  });

  // Sync modal state with existing state variables
  React.useEffect(() => {
    setSortBy(sortModal.sortBy);
    setSortOrder(sortModal.sortOrder);
  }, [sortModal.sortBy, sortModal.sortOrder]);

  // Load staff data
  const loadStaffData = async (customStatus = null, customPage = null) => {
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

      const response = await staffService.getStaffList(params);
      if (response.success) {
        setStaffData(response.data.items || []);
        setTotalStaff(response.data.total || 0);
      } else {
        logger.error('Failed to load staff', null, { message: response.message, params });
        showErrorToast('Load Error', 'Failed to load staff data: ' + response.message);
      }
    } catch (error) {
      logger.error('Error loading staff', error, { params });
      showErrorToast('Load Error', 'Error loading staff data');
    } finally {
      setIsLoading(false);
    }
  };

  // Load staff statistics
  const loadStaffStats = async () => {
    try {
      const response = await staffService.getStaffStats();
      if (response.success) {
        setStaffStats(response.data);
        logger.debug('Staff stats loaded', { statsKeys: Object.keys(response.data || {}) });
      } else {
        logger.error('Failed to load staff stats', null, { message: response.message });
      }
    } catch (error) {
      logger.error('Error loading staff stats', error);
    }
  };

  // Load data on component mount and when dependencies change
  useEffect(() => {
    loadStaffData();
    loadStaffStats();
  }, [currentPage, itemsPerPage, sortBy, sortOrder, searchQuery, statusFilter]);

  // Reset current page if it's out of bounds
  useEffect(() => {
    if (totalStaff > 0) {
      const maxPage = Math.ceil(totalStaff / itemsPerPage);
      if (currentPage > maxPage) {
        setCurrentPage(1);
      }
    }
  }, [totalStaff, itemsPerPage, currentPage]);

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
    setSelectedItems(selectedItems.length === staffData.length ? [] : staffData.map(item => item.lydoId));
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle search query changes
  const handleSearchChange = (newQuery) => {
    setSearchQuery(newQuery);
    setCurrentPage(1); // Reset to first page when searching
  };

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
            await handleStatusUpdate(item.lydoId, 'deactivated');
            confirmation.hideConfirmation();
          }
        }
        break;
      case 'activate':
        {
          const confirmed = await confirmation.confirmActivate(`${item.firstName} ${item.lastName}`);
          if (confirmed) {
            confirmation.setLoading(true);
            await handleStatusUpdate(item.lydoId, 'active');
            confirmation.hideConfirmation();
          }
        }
        break;
      case 'delete':
        {
          const confirmed = await confirmation.confirmDelete(`${item.firstName} ${item.lastName}`);
          if (confirmed) {
            confirmation.setLoading(true);
            await handleDeleteStaff(item.lydoId);
            confirmation.hideConfirmation();
          }
        }
        break;
      default:
        break;
    }
  };

  // Handle status update - Enhanced with Universal Toast (keeping original error handling)
  const handleStatusUpdate = async (id, status, reason = '') => {
    try {
      const response = await staffService.updateStaffStatus(id, status, reason);
      if (response.success) {
        // Find the staff member for better toast message
        const staffMember = staffData.find(s => s.lydoId === id);
        
        // Show beautiful toast instead of basic alert
        showStaffSuccessToast(
          status === 'active' ? 'activated' : 'deactivated',
          staffMember,
          [
            {
              label: "View Profile",
              onClick: () => {
                setSelectedStaffMember(staffMember);
                setShowViewModal(true);
              }
            }
          ]
        );
        
        loadStaffData(); // Reload data
        loadStaffStats(); // Reload stats
      } else {
        // Keep original error handling for now
        alert('Failed to update status: ' + response.message);
      }
    } catch (error) {
      logger.error('Error updating status', error, { id });
      // Keep original error handling for now
      alert('Error updating staff status');
    }
  };

  // Handle delete staff
  const handleDeleteStaff = async (id) => {
    try {
      const response = await staffService.deleteStaff(id);
      if (response.success) {
        showStaffSuccessToast('deleted', { firstName: 'Staff member', lastName: '' }, [
          {
            label: "View All Staff",
            onClick: () => {
              setActiveTab('all');
              setCurrentPage(1);
            }
          }
        ]);
        loadStaffData(); // Reload data
        loadStaffStats(); // Reload stats
      } else {
        showErrorToast('Delete Failed', response.message);
      }
    } catch (error) {
      logger.error('Error deleting staff', error, { id });
      showErrorToast('Delete Error', 'Error deleting staff member');
    }
  };

  // Handle edit staff save
  const handleEditSave = async (updatedStaffMember) => {
    setIsEditingSaving(true);
    try {
      const updateData = {
        firstName: updatedStaffMember.firstName,
        lastName: updatedStaffMember.lastName,
        middleName: updatedStaffMember.middleName,
        suffix: updatedStaffMember.suffix,
        personalEmail: updatedStaffMember.personalEmail
      };

      const response = await staffService.updateStaff(updatedStaffMember.lydoId, updateData);
      if (response.success) {
        showStaffSuccessToast('updated', updatedStaffMember, [
          {
            label: "View Profile",
            onClick: () => {
              setSelectedStaffMember(updatedStaffMember);
              setShowViewModal(true);
            }
          }
        ]);
        setShowEditModal(false);
        setSelectedStaffMember(null);
        loadStaffData(); // Reload data
        loadStaffStats(); // Reload stats
      } else {
        showErrorToast('Update Failed', response.message);
      }
    } catch (error) {
      logger.error('Error updating staff', error, { lydoId: updatedStaffMember.lydoId });
      showErrorToast('Update Error', 'Error updating staff member');
    } finally {
      setIsEditingSaving(false);
    }
  };

  // Handle bulk operations
  const handleBulkOperation = async () => {
    if (!bulkAction || selectedItems.length === 0) {
      showErrorToast('Selection Required', 'Please select an action and at least one staff member');
      return;
    }

    // selectedItems already contains LYDO IDs, not objects
    const validation = staffService.validateBulkOperation(selectedItems, bulkAction);
    
    if (!validation.isValid) {
      showErrorToast('Validation Failed', validation.errors.join(', '));
      return;
    }

    // Close the action selection modal first
    setShowBulkModal(false);

    // Get selected staff details for confirmation
    const selectedStaff = staffData.filter(staff => selectedItems.includes(staff.lydoId));
    const staffNames = selectedStaff.map(staff => `${staff.firstName} ${staff.lastName}`).join(', ');
    
    // Show beautiful confirmation dialog
    const actionText = bulkAction === 'activate' ? 'activate' : 'deactivate';
    const confirmed = await confirmation.confirmBulkOperation(
      actionText,
      selectedItems.length, 
      'staff member',
      staffNames
    );
    
    if (!confirmed) {
      // Reset bulk action and show the selection modal again if user cancels
      setBulkAction('');
      return;
    }
    
    confirmation.setLoading(true);
    setIsBulkProcessing(true);
    
    try {
      const response = await staffService.bulkUpdateStatus(selectedItems, bulkAction);
      if (response.success) {
        confirmation.hideConfirmation();
        showStaffSuccessToast('bulk_operation', null, [
          {
            label: `${bulkAction === 'activate' ? 'Activated' : 'Deactivated'} ${response.data.processed} staff members`,
            onClick: () => {
              setActiveTab(bulkAction === 'activate' ? 'active' : 'deactivated');
              setCurrentPage(1);
            }
          }
        ]);
        setSelectedItems([]); // Clear selection
        setBulkAction(''); // Reset bulk action
        loadStaffData(); // Reload data
        loadStaffStats(); // Reload stats
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
    const validation = staffService.validateStaffData(formData, false);
    if (!validation.isValid) {
      showErrorToast('Validation Failed', validation.errors.join(', '));
      return;
    }

    try {
      const response = await staffService.createStaff(formData);
      if (response.success) {
        // Enhanced success with Universal Toast
        const { credentials, staff } = response.data;
        
        showStaffSuccessToast(
          'created',
          { firstName: formData.firstName, lastName: formData.lastName },
          [
            {
              label: "View Profile",
              onClick: () => {
                // Find the created staff member and show profile
                const createdStaff = { ...formData, lydoId: credentials?.lydoId };
                setSelectedStaffMember(createdStaff);
                setShowViewModal(true);
              },
              variant: 'primary'
            },
            {
              label: "Create Another",
              onClick: () => {
                // Keep form open for another creation
                setFormCollapsed(false);
              }
            }
          ]
        );
        
        // Reset form
        setFormData({
          lastName: '',
          firstName: '',
          middleName: '',
          suffix: '',
          personalEmail: ''
        });
        setFormCollapsed(true);
        loadStaffData(); // Reload data
        loadStaffStats(); // Reload stats
      } else {
        showErrorToast('Creation Failed', response.message);
      }
    } catch (error) {
      logger.error('Error creating staff', error);
      showErrorToast('Creation Error', 'Error creating staff member');
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
  const canImport = isValidationPass;
  const currentStep = !hasFileSelected ? 1 : !hasValidation ? 2 : canImport ? 3 : 2;
  const problemRows = hasValidation
    ? (validationResult.rows || []).filter((row) => row.status !== 'valid').slice(0, 5)
    : [];

  return (
    <div className="space-y-5">
      {/* Header Section */}
      <HeaderMainContent
        title="Staff Management"
        description="Manage LYDO Staff"
      />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column - Staff List */}
        <div className="xl:col-span-2">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Tabs - Using Reusable Tab Components */}
            <TabContainer
              activeTab={activeTab}
              onTabChange={setActiveTab}
              variant="underline"
              size="md"
            >
              <Tab 
                id="all" 
                label="All Staff" 
                shortLabel="All"
                count={staffStats.total} 
                color="blue"
              />
              <Tab 
                id="active" 
                label="Active" 
                count={staffStats.active} 
                color="green"
              />
              <Tab 
                id="deactivated" 
                label="Deactivated" 
                count={staffStats.deactivated} 
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
                        onChange={handleSearchChange}
                        placeholder="Search staff members..." 
                        expandOnMobile={true}
                        showIndicator={true}
                        indicatorText="Search"
                        indicatorColor="orange"
                        size="md"
                        autoFocus={false}
                        debounceMs={300}
                      />
                    </div>

                    {/* Sort Button */}
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
                </div>

                {/* Right Controls */}
                <div className="flex items-center space-x-3 flex-shrink-0">
                  {/* Export Button */}
                  <ExportButton
                    formats={['csv', 'xlsx', 'pdf']}
                    onExport={(format) => mainExport.handleExport(format === 'xlsx' ? 'excel' : format)}
                    isExporting={mainExport.isExporting}
                    label="Export"
                    size="md"
                    position="auto"
                    responsive={true}
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

              {/* Modals */}
              <SortModal
                isOpen={sortModal.isOpen}
                onClose={sortModal.closeModal}
                triggerRef={sortModal.triggerRef}
                title="Sort Options"
                sortFields={[
                  { value: 'last_name', label: 'Last Name' },
                  { value: 'first_name', label: 'First Name' },
                  { value: 'email', label: 'Email' },
                  { value: 'created_at', label: 'Date Created' },
                  { value: 'is_active', label: 'Status' }
                ]}
                sortBy={sortModal.sortBy}
                sortOrder={sortModal.sortOrder}
                onSortChange={sortModal.updateSort}
                onReset={sortModal.resetSort}
                defaultSortBy="last_name"
                defaultSortOrder="asc"
              />
            </div>

          {/* Bulk Actions */}
          <BulkActionsBar
            selectedCount={selectedItems.length}
            itemName="staff member"
            itemNamePlural="staff members"
            onBulkAction={() => setShowBulkModal(true)}
            exportConfig={{
              formats: ['csv', 'xlsx', 'pdf'],
              onExport: (format) => bulkExportHook.handleExport(format === 'xlsx' ? 'excel' : format),
              isExporting: bulkExportHook.isExporting
            }}
            primaryColor="green"
          />

            {/* Bulk Operations Modal */}
            {showBulkModal && createPortal(
              <div className="fixed inset-0 flex items-center justify-center z-[99999] p-4 backdrop-blur-[1px]" onClick={() => setShowBulkModal(false)}>
                <div className="bg-white rounded-lg shadow-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Bulk Operations</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {selectedItems.length} staff member{selectedItems.length > 1 ? 's' : ''} selected
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
          {tabLoading ? (
            <LoadingSpinner 
              variant="spinner"
              message="Loading staff data..." 
              size="md"
              color="blue"
              height="h-64"
            />
          ) : (
            <DataTable
              data={staffData}
              selectedItems={selectedItems}
              onSelectItem={handleSelectItem}
              onSelectAll={handleSelectAll}
              getActionMenuItems={getActionMenuItems}
              onActionClick={handleActionClick}
            onCardClick={(item) => {
              setSelectedStaffMember(item);
              setShowViewModal(true);
            }}
              viewMode={viewMode}
              keyField="lydoId"
              displayFields={{
                avatar: { 
                  firstName: 'firstName', 
                  lastName: 'lastName', 
                  email: 'personalEmail', 
                  picture: 'profilePicture' 
                },
                title: (item) => `${item.firstName} ${item.lastName}`,
                subtitle: 'personalEmail',
                status: (item) => item.isActive && !item.deactivated ? 'active' : 'deactivated',
                date: 'createdAt'
              }}
              selectAllLabel="Select All Staff Members"
              emptyMessage="No staff members found"
              styling={{
                gridCols: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
                cardHover: 'hover:border-gray-300 hover:shadow-lg',
                listHover: 'hover:bg-blue-50/30 hover:border-l-4 hover:border-l-blue-400',
                theme: 'blue'
              }}
            />
          )}

            {/* Pagination - Always visible */}
            {!tabLoading && (
              <Pagination
                currentPage={currentPage}
                totalItems={totalStaff}
                itemsPerPage={itemsPerPage}
                onPageChange={pagination.handlePageChange}
                onItemsPerPageChange={pagination.handleItemsPerPageChange}
                itemName="staff member"
                itemNamePlural="staff members"
                showItemsPerPage={true}
                showInfo={true}
                size="md"
                variant="default"
                itemsPerPageOptions={[5, 10, 20, 50]}
              />
            )}
          </div>
        </div>

        {/* Right Column - Add New Staff Form */}
        <div className="xl:col-span-1">
          {/* Bulk Import - Upload File (now first) */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden sticky top-4">
            <button
              type="button"
              onClick={() => setUploadCollapsed(prev => !prev)}
              className={`w-full px-5 py-4 flex items-center justify-between transition-colors duration-200 ${uploadCollapsed ? 'bg-gray-50 border-b border-gray-100' : 'bg-emerald-50 border-b border-emerald-200'}`}
            >
              <div className="flex items-center">
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                  <Upload className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="text-left">
                  <h2 className="text-lg font-bold text-gray-900">Bulk Import</h2>
                  <p className="text-sm text-gray-600">Upload a CSV or Excel file to import staff</p>
                </div>
              </div>
              <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${uploadCollapsed ? 'rotate-180' : 'rotate-0'}`} />
            </button>
            <div className={`p-5 space-y-4 ${uploadCollapsed ? 'hidden' : ''}`}>
              {/* Stepper */}
              <div className="flex items-center justify-between text-xs font-medium">
                <div className={`flex items-center flex-1 min-w-0 ${currentStep >= 1 ? 'text-indigo-700' : 'text-gray-400'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 ${currentStep >= 1 ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-400'}`}>1</div>
                  <span className="truncate">Select File</span>
                </div>
                <div className={`h-px flex-1 mx-2 ${currentStep > 1 ? 'bg-indigo-300' : 'bg-gray-200'}`} />
                <div className={`flex items-center flex-1 min-w-0 ${currentStep >= 2 ? 'text-indigo-700' : 'text-gray-400'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 ${currentStep >= 2 ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-400'}`}>2</div>
                  <span className="truncate">Validate</span>
                </div>
                <div className={`h-px flex-1 mx-2 ${currentStep > 2 ? 'bg-indigo-300' : 'bg-gray-200'}`} />
                <div className={`flex items-center flex-1 min-w-0 ${currentStep >= 3 ? 'text-indigo-700' : 'text-gray-400'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 ${currentStep >= 3 ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-400'}`}>3</div>
                  <span className="truncate">Import</span>
                </div>
              </div>

              {/* Template links */}
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>Need a sample? Includes required columns.</span>
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => staffService.downloadTemplate('csv')}
                    disabled={isValidating || isImporting}
                    className="inline-flex items-center text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
                  >
                    <FileText className="w-3.5 h-3.5 mr-1" /> CSV Template
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={() => staffService.downloadTemplate('xlsx')}
                    disabled={isValidating || isImporting}
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
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                  disabled={isValidating || isImporting}
                  className={`w-full border-2 border-dashed rounded-lg p-4 text-left transition-colors duration-200 ${uploadedFile ? 'border-emerald-300 bg-emerald-50/30 hover:bg-emerald-50' : 'border-gray-300 hover:bg-gray-50'}`}
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
                          onClick={(e) => { e.stopPropagation(); fileInputRef.current && fileInputRef.current.click(); }}
                          disabled={isValidating || isImporting}
                          className="px-2.5 py-1 text-xs font-medium rounded border border-emerald-200 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                        >
                          Change
                </button>
                <button
                  type="button"
                          onClick={(e) => { e.stopPropagation(); clearFile(); }}
                          disabled={isValidating || isImporting}
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
                  disabled={!uploadedFile || isValidating || isImporting}
                  className="px-4 py-2 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={validateFile}
                  disabled={!uploadedFile || isValidating || isImporting}
                  className={`inline-flex items-center px-4 py-2 rounded-lg font-medium text-white disabled:opacity-50 ${uploadedFile ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-300'}`}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {isValidating ? 'Validating...' : 'Validate'}
                </button>
              </div>

              {/* Validation summary */}
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
                        <span className="font-medium">Existing inactive:</span> {validationSummary?.duplicateInDbArchived ?? 0}
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
                            name="staffDuplicateStrategy"
                            value="skip"
                            checked={duplicateStrategy === 'skip'}
                            onChange={(e) => setDuplicateStrategy(e.target.value)}
                          />
                          <span>Skip duplicates (no changes to existing staff)</span>
                        </label>
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="radio"
                            name="staffDuplicateStrategy"
                            value="update"
                            checked={duplicateStrategy === 'update'}
                            onChange={(e) => setDuplicateStrategy(e.target.value)}
                          />
                          <span>Update existing staff when a duplicate is active</span>
                        </label>
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="radio"
                            name="staffDuplicateStrategy"
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
                  {isImporting ? 'Importing...' : 'Import Staff'}
                </button>
              )}

              <p className="text-xs text-gray-500">Supported formats: CSV, XLSX. Max 10MB.</p>
            </div>
          </div>

          {/* Add New Staff (now second) */}
          <CollapsibleForm
            title="Add New Staff"
            description="Create a new staff member profile"
            icon={<UserPlus className="w-5 h-5" />}
            defaultCollapsed={formCollapsed}
            onToggle={setFormCollapsed}
            iconBgColor="bg-blue-100"
            iconTextColor="text-blue-600"
            className="mt-6"
            stickyTop="top-[calc(1rem+56px)]"
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                  <User className="w-4 h-4 mr-2 text-blue-600" />
                  Basic Information
                </h3>
                
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleFormChange}
                      required
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      placeholder="Doe"
                    />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleFormChange}
                    required
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    placeholder="John"
                  />
              </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Middle Name</label>
                  <input
                    type="text"
                    name="middleName"
                    value={formData.middleName}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    placeholder="Michael"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Suffix</label>
                  <input
                    type="text"
                    name="suffix"
                    value={formData.suffix}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    placeholder="Jr., Sr., III"
                  />
                </div>
              </div>

              {/* Personal Email */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                  <Mail className="w-4 h-4 mr-2 text-blue-600" />
                  Contact Information
                </h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Personal Email *</label>
                  <input
                    type="email"
                    name="personalEmail"
                    value={formData.personalEmail}
                    onChange={handleFormChange}
                    required
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    placeholder="john.doe@example.com"
                  />
                </div>
      </div>

              {/* Form Actions */}
              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setFormData({
                    lastName: '',
                    firstName: '',
                    middleName: '',
                    suffix: '',
                    personalEmail: ''
                  })}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-200 transition-all duration-200"
                >
                  Clear Form
                </button>
                <button
                  type="submit"
                  className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Add Staff
                </button>
          </div>
            </form>
          </CollapsibleForm>
          </div>
        </div>

      <TabbedDetailModal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setSelectedStaffMember(null);
        }}
        data={selectedStaffMember || {}}
        mode="view"
        config={staffDetailConfig}
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
          ...staffDetailConfig,
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

      {/* Universal Toast Notifications - Safe Addition */}
      <ToastContainer position="top-right" maxToasts={5} />
      
      {/* Universal Confirmation Modal - Beautiful replacement for browser confirm() */}
      <ConfirmationModal {...confirmation.modalProps} />
    </div>
  );
};

export default StaffManagement;