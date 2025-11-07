import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  MapPin, 
  Users, 
  TrendingUp, 
  TrendingDown,
  Filter,
  Download,
  RefreshCw,
  BarChart3,
  Building2,
  UserCheck,
  UserX,
  Calendar,
  Plus,
  ArrowUpDown,
  ChevronDown,
  Grid,
  List,
  ArrowLeft,
  Target,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Eye,
  FileText,
  PieChart
} from 'lucide-react';
import { HeaderMainContent, TabContainer, Tab, useTabState, ActionMenu, BulkModal, Pagination, useBulkModal, usePagination, Avatar, Status, ExportButton, useExport, BulkActionsBar, CollapsibleForm, DataTable, ViewStaffModal, EditStaffModal, ActiveTermBanner } from '../../components/portal_main_content';
import { extractTermStats } from '../../utils/termStats';
import { ToastContainer, showSKSuccessToast, showSuccessToast, showErrorToast, showInfoToast } from '../../components/universal';
// Removed useActiveTerm import since we always use termId parameter now
import { useSKValidation } from '../../hooks/useSKValidation.js';
import skService from '../../services/skService.js';
import skTermsService from '../../services/skTermsService.js';

const SKTermReport = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const termIdParam = queryParams.get('termId');
  // Removed useActiveTerm since we always use termId parameter now
  const [reportTerm, setReportTerm] = useState(null);
  const [isLoadingReportTerm, setIsLoadingReportTerm] = useState(false);
  const {
    barangayVacancies,
    overallVacancyStats,
    isLoadingVacancies,
    validationError,
    loadBarangayVacancies,
    loadAllBarangayVacancies,
    loadOverallVacancyStats,
    getVacancySummary,
    POSITION_LIMITS
  } = useSKValidation();

  // Override data when ?termId is provided
  const [ovrBarangayVacancies, setOvrBarangayVacancies] = useState(null);
  const [ovrOverallVacancyStats, setOvrOverallVacancyStats] = useState(null);

  // State management
  const [overviewBarangay, setOverviewBarangay] = useState('all');
  const [barangayDetailsBarangay, setBarangayDetailsBarangay] = useState('all');
  const [detailedBarangayFilter, setDetailedBarangayFilter] = useState('all');
  const [allBarangays, setAllBarangays] = useState([]);
  const [isLoadingBarangays, setIsLoadingBarangays] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState('all');
  // Tab state with loading indicator on tab switch
  const [tabLoading, setTabLoading] = useState(false);
  const { activeTab: viewMode, setActiveTab: setViewMode } = useTabState('overview', async (tabId) => {
    setTabLoading(true);
    try {
      setCurrentPage(1);
      // Ensure all-barangays data is available when switching to Barangay tab
      if (tabId === 'barangay') {
        const hasAny = barangayVacancies && Object.keys(barangayVacancies).length > 0;
        if (!hasAny && typeof loadAllBarangayVacancies === 'function') {
          await loadAllBarangayVacancies();
        }
      }
    } finally {
      setTabLoading(false);
    }
  });
  // Federation state (view-only for staff)
  const [federation, setFederation] = useState([]);
  const [isLoadingFederation, setIsLoadingFederation] = useState(false);
  // Federation table search/sort
  const [fedTableSearch, setFedTableSearch] = useState('');
  const [fedSortBy, setFedSortBy] = useState('position'); // position | name | barangay
  const [fedSortOrder, setFedSortOrder] = useState('asc'); // asc | desc
  const FED_POSITIONS = [
    'President',
    'Vice President',
    'Secretary',
    'Treasurer',
    'Auditor',
    'PRO',
    'Sergeant-at-Arms'
  ];
  const [sortBy, setSortBy] = useState('name'); // 'name', 'vacancy_rate', 'total_vacant'
  const [sortOrder, setSortOrder] = useState('asc');
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedItems, setSelectedItems] = useState([]);
  const [detailedBarangays, setDetailedBarangays] = useState([]);
  const [isLoadingDetailed, setIsLoadingDetailed] = useState(false);

  // Removed filter/search/sort state

  // Modal state management using custom hooks
  const bulkModal = useBulkModal();

  // Pagination state management using custom hook
  const pagination = usePagination({
    initialPage: currentPage,
    initialItemsPerPage: itemsPerPage,
    totalItems: 0,
    onPageChange: setCurrentPage,
    onItemsPerPageChange: setItemsPerPage
  });

  // Load federation when the tab is active and term is available (view-only for staff)
  useEffect(() => {
    const loadFederation = async () => {
      if (viewMode !== 'federation' || !reportTerm?.termId) return;
      setIsLoadingFederation(true);
      try {
        const resp = await skService.getFederation(reportTerm.termId);
        if (resp.success) {
          const rows = Array.isArray(resp.data) ? resp.data : [];
          setFederation(rows);
        } else {
          showErrorToast('Failed to load SK Federation', resp.message || '');
          setFederation([]);
        }
      } catch (e) {
        setFederation([]);
      } finally {
        setIsLoadingFederation(false);
      }
    };
    loadFederation();
  }, [viewMode, reportTerm?.termId]);

  // Export state management
  const mainExport = useExport({
    exportFunction: (format, style = null) =>
      skService.exportSKOfficials(format, 'all', [], style, reportTerm?.termId),
    onSuccess: () =>
      showSuccessToast('Term report exported successfully!'),
    onError: (error) => showErrorToast('Export failed', error.message)
  });

  // Unified handler for the blue Export button
  const handleGlobalExport = async (format) => {
    // Always export using the Detailed format for consistency across tabs
    const tid = reportTerm?.termId;
    const resp = tid ? await skService.exportTermDetailed(tid, 'json') : { success: false };
    const barangays = resp.success ? (resp.data?.barangays || []) : detailedBarangays;
    if (resp.success) showSuccessToast('Export logged', 'Your export was recorded successfully');
    const name = (reportTerm?.termName || 'sk-term');
    if (format === 'csv') return downloadCsv(`${name}-detailed.csv`, buildCsvRows(barangays));
    if (format === 'excel') return downloadExcel(`${name}-detailed.xls`, buildExcelXml(barangays));
    if (format === 'pdf') return openPrintPdf(`${(reportTerm?.termName || 'SK Term')} - Detailed Report`, barangays);
  };

  // CSV export helpers for Detailed view
  const buildCsvRows = (barangays) => {
    const rows = [];
    // Header
    rows.push(['Barangay', 'Name', 'Position', 'Age', 'Gender', 'Contact number', 'Email Address', 'School / Company']);
    (barangays || []).forEach((b) => {
      (b.officials || []).forEach((o) => {
        rows.push([
          b.barangayName || '',
          o.name || '',
          o.position || '',
          o.age ?? '',
          o.gender || '',
          o.contactNumber || '',
          o.emailAddress || '',
          o.schoolOrCompany || ''
        ]);
      });
    });
    return rows;
  };

  const downloadCsv = (filename, rows) => {
    const csv = rows
      .map(r => r.map(field => {
        const v = (field ?? '').toString();
        // Escape double quotes and wrap fields with commas/newlines/quotes
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

  // Excel (XLS via XML) export for Detailed view
  const buildExcelXml = (barangays) => {
    const headerRow = `
      <Row>
        <Cell><Data ss:Type="String">Barangay</Data></Cell>
        <Cell><Data ss:Type="String">Name</Data></Cell>
        <Cell><Data ss:Type="String">Position</Data></Cell>
        <Cell><Data ss:Type="String">Age</Data></Cell>
        <Cell><Data ss:Type="String">Gender</Data></Cell>
        <Cell><Data ss:Type="String">Contact number</Data></Cell>
        <Cell><Data ss:Type="String">Email Address</Data></Cell>
        <Cell><Data ss:Type="String">School / Company</Data></Cell>
      </Row>`;

    const bodyRows = (barangays || []).map(b => (b.officials || []).map(o => `
      <Row>
        <Cell><Data ss:Type="String">${(b.barangayName || '').toString()}</Data></Cell>
        <Cell><Data ss:Type="String">${(o.name || '').toString()}</Data></Cell>
        <Cell><Data ss:Type="String">${(o.position || '').toString()}</Data></Cell>
        <Cell><Data ss:Type="String">${(o.age ?? '').toString()}</Data></Cell>
        <Cell><Data ss:Type="String">${(o.gender || '').toString()}</Data></Cell>
        <Cell><Data ss:Type="String">${(o.contactNumber || '').toString()}</Data></Cell>
        <Cell><Data ss:Type="String">${(o.emailAddress || '').toString()}</Data></Cell>
        <Cell><Data ss:Type="String">${(o.schoolOrCompany || '').toString()}</Data></Cell>
      </Row>`).join('')).join('');

    return `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
<Worksheet ss:Name="Detailed">
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

  // PDF export via print-friendly window (user can Save as PDF)
  const openPrintPdf = (title, barangays) => {
    const win = window.open('', '_blank');
    if (!win) return;
    const styles = `
      <style>
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        body { font-family: Arial, sans-serif; color: #111; }
        h1 { font-size: 16px; margin: 0 0 8px; font-weight: 700; text-align: left; }
        h2 { font-size: 13px; margin: 6px 0 6px; font-weight: 700; text-transform: uppercase; text-align: center; }
        .sub { font-size: 11px; margin: 0 0 10px; font-weight: 600; text-align: center; }
        table { width: 100%; border-collapse: collapse; table-layout: fixed; page-break-inside: avoid; }
        th, td { border: 1.2px solid #666; padding: 6px 8px; font-size: 11px; line-height: 1.15; }
        thead th { background: #eaf2ff !important; font-weight: 700; }
        thead { display: table-header-group; }
        .num { width: 28px; text-align: center; }
        .name { width: 210px; }
        .pos { width: 120px; text-align: left; }
        .age { width: 40px; text-align: center; }
        .gender { width: 60px; text-align: center; }
        .contact { width: 150px; }
        .email { width: 220px; }
        .school { width: 220px; }
        .title { text-align: center; font-weight: 700; text-transform: uppercase; }
        @page { size: A4 landscape; margin: 12mm; }
        .section { margin-bottom: 18px; }
      </style>`;
    const header = `
      <thead>
        <tr>
          <th class="num">#</th>
          <th class="name">Name</th>
          <th class="pos">Position</th>
          <th class="age">Age</th>
          <th class="gender">Gender</th>
          <th class="contact">Contact number</th>
          <th class="email">Email Address</th>
          <th class="school">School / Company</th>
        </tr>
      </thead>`;
    const sections = (barangays || []).map(b => {
      const slots = (Array.isArray(b.officials) ? buildPositionSlots(b.officials) : buildPositionSlots([]));
      const rows = slots.map((o, idx) => `
        <tr>
          <td class="num">${idx + 1}</td>
          <td class="name">${o?.name ? o.name.toUpperCase() : ''}</td>
          <td class="pos">${(o && o.positionLabel) ? String(o.positionLabel).toUpperCase() : ''}</td>
          <td class="age">${o?.age ?? ''}</td>
          <td class="gender">${o?.gender ? String(o.gender).toUpperCase() : ''}</td>
          <td class="contact">${o?.contactNumber ? String(o.contactNumber).toUpperCase() : ''}</td>
          <td class="email">${o?.emailAddress || ''}</td>
          <td class="school">${o?.schoolOrCompany ? String(o.schoolOrCompany).toUpperCase() : ''}</td>
        </tr>`).join('');
      return `
        <div class="section">
          <div class="title">MUNICIPALITY OF SAN JOSE, BATANGAS</div>
          <div class="sub">Barangay ${b.barangayName || ''}</div>
          <table>
            ${header}
            <tbody>${rows}</tbody>
          </table>
        </div>`;
    }).join('');

    win.document.write(`
      <html>
        <head>
          <title>${title}</title>
          ${styles}
        </head>
        <body>
          <h1>${title}</h1>
          ${sections}
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  };

  // Load data when component mounts or active term changes
  useEffect(() => {
    console.log('🔍 useEffect - termIdParam changed:', termIdParam);
    // Always load the specific term when termId is provided
    if (termIdParam) {
      const loadTerm = async () => {
        try {
          setIsLoadingReportTerm(true);
          console.log('🔍 Loading term data for termIdParam:', termIdParam);
          const resp = await skTermsService.getSKTermById(termIdParam);
          console.log('🔍 Term response:', resp);
          
          if (!resp.success) {
            console.error('❌ Failed to load term:', resp.message);
            showErrorToast('Failed to load term data', resp.message || 'Unknown error');
            return;
          }
          
          const term = resp?.data?.data || resp?.data || resp;
          console.log('🔍 Processed term:', term);
          
          if (term) {
            const reportTermData = {
              termId: term.termId || term.term_id || term.id,
              termName: term.termName || term.term_name,
              startDate: term.startDate || term.start_date,
              endDate: term.endDate || term.end_date,
              status: term.status,
              statistics: term.statistics // Include statistics
            };
            console.log('🔍 Setting reportTerm:', reportTermData);
            setReportTerm(reportTermData);
          } else {
            console.error('❌ No term data found in response');
            showErrorToast('No term data found', 'The term data could not be loaded');
          }
        } catch (error) {
          console.error('❌ Error loading term:', error);
          showErrorToast('Error loading term', error.message || 'Unknown error');
        } finally {
          setIsLoadingReportTerm(false);
        }
      };
      loadTerm();
    }
  }, [termIdParam]);

  useEffect(() => {
    console.log('🔍 useEffect - reportTerm?.termId changed:', reportTerm?.termId);
    // Always load term-specific data when we have a reportTerm
    if (reportTerm?.termId) {
      console.log('🔍 Calling loadTermSpecificData for termId:', reportTerm.termId);
      loadTermSpecificData();
    } else {
      console.log('🔍 No reportTerm.termId available');
    }
  }, [reportTerm?.termId]);

  // Force reload data when component mounts
  useEffect(() => {
    if (termIdParam && !ovrOverallVacancyStats) {
      console.log('🔍 Force reloading data for termIdParam:', termIdParam);
      loadTermSpecificData();
    }
  }, [termIdParam, ovrOverallVacancyStats]);

  // Additional force reload when reportTerm is available but no override data
  useEffect(() => {
    if (reportTerm?.termId && !ovrOverallVacancyStats) {
      console.log('🔍 Force reloading data for reportTerm.termId:', reportTerm.termId);
      loadTermSpecificData();
    }
  }, [reportTerm?.termId, ovrOverallVacancyStats]);

  // Manual trigger for debugging - force load data after 2 seconds if not loaded
  useEffect(() => {
    if (reportTerm?.termId && !ovrOverallVacancyStats) {
      const timer = setTimeout(() => {
        console.log('🔍 Manual trigger - forcing loadTermSpecificData after timeout');
        loadTermSpecificData();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [reportTerm?.termId, ovrOverallVacancyStats]);

  // Reset filters when switching tabs to avoid cross-tab leakage
  useEffect(() => {
    if (viewMode === 'overview') {
      setBarangayDetailsBarangay('all');
      setDetailedBarangayFilter('all');
    } else if (viewMode === 'barangay') {
      setOverviewBarangay('all');
      setDetailedBarangayFilter('all');
    } else if (viewMode === 'detailed') {
      setOverviewBarangay('all');
      setBarangayDetailsBarangay('all');
    }
  }, [viewMode]);

  // Removed loadData function - now always use term-specific data

  // Load term-specific data when termId is provided
  const loadTermSpecificData = async () => {
    console.log('🔍 loadTermSpecificData called with reportTerm:', reportTerm);
    if (!reportTerm?.termId) {
      console.log('🔍 loadTermSpecificData - No reportTerm.termId available');
      return;
    }
    
    setIsLoading(true);
    try {
      console.log('🔍 Loading term-specific data for termId:', reportTerm.termId);
      
      // Load all barangays first
      const barangaysResp = await skService.getAllBarangays();
      console.log('🔍 getAllBarangays response:', barangaysResp);
      if (Array.isArray(barangaysResp)) {
        setAllBarangays(barangaysResp);
        console.log('🔍 Loaded barangays:', barangaysResp.length);
      } else if (barangaysResp && barangaysResp.success) {
        setAllBarangays(barangaysResp.data || []);
        console.log('🔍 Loaded barangays:', barangaysResp.data?.length || 0);
      } else {
        console.log('🔍 Failed to load barangays:', barangaysResp);
      }

      // Load term-specific officials data
      const officialsResp = await skService.getTermOfficialsByBarangay(reportTerm.termId);
      console.log('🔍 Officials response:', officialsResp);
      
      if (officialsResp.success) {
        const barangaysFromApi = Array.isArray(officialsResp.data?.barangays) 
          ? officialsResp.data.barangays 
          : (Array.isArray(officialsResp.data) ? officialsResp.data : []);
        
        console.log('🔍 Processed barangays from API:', barangaysFromApi.length);
        console.log('🔍 Sample barangay data:', barangaysFromApi[0]);
        
        // Build vacancy data from officials
        const vacancyData = {};
        const overallStats = {};
        
        // Initialize overall stats
        Object.keys(POSITION_LIMITS).forEach(position => {
          overallStats[position] = { filled: 0, max: 0 };
        });

        // Create a map of barangays with officials for quick lookup
        const barangayWithOfficials = {};
        barangaysFromApi.forEach(barangay => {
          barangayWithOfficials[barangay.barangayId] = barangay;
        });
        
        // Get all barangays to ensure we process all 33 barangays
        const allBarangays = await skService.getAllBarangays();
        const masterBarangayList = Array.isArray(allBarangays) ? allBarangays : (allBarangays?.success ? allBarangays.data : []);
        console.log('🔍 Master barangay list:', masterBarangayList.length, 'barangays');
        
        // Process ALL barangays (not just those with officials)
        masterBarangayList.forEach(masterBarangay => {
          const barangayId = masterBarangay.barangayId || masterBarangay.id;
          const barangayName = masterBarangay.barangayName || masterBarangay.name;
          
          // Get officials for this barangay (if any)
          const barangayWithData = barangayWithOfficials[barangayId];
          const officials = barangayWithData?.officials || [];
          
          console.log(`🔍 Processing barangay ${barangayId}:`, officials.length, 'officials');
          
          // Count officials by position for this barangay
          const positionCounts = {};
          Object.keys(POSITION_LIMITS).forEach(position => {
            positionCounts[position] = officials.filter(o => o.position === position).length;
          });

          // Build vacancy data for this barangay (even if no officials)
          vacancyData[barangayId] = {
            barangayName: barangayName,
            vacancies: positionCounts,
            officials: officials
          };

          // Add to overall stats
          Object.keys(POSITION_LIMITS).forEach(position => {
            overallStats[position].filled += positionCounts[position];
            overallStats[position].max += POSITION_LIMITS[position];
          });
        });

        console.log('🔍 Final vacancy data:', vacancyData);
        console.log('🔍 Final overall stats:', overallStats);

        console.log('🔍 loadTermSpecificData - setting data:', { vacancyData, overallStats });
        // Set the override data
        setOvrBarangayVacancies(vacancyData);
        setOvrOverallVacancyStats(overallStats);
      } else {
        console.error('❌ Failed to load officials:', officialsResp.message);
      }
    } catch (error) {
      console.error('❌ Error in loadTermSpecificData:', error);
      showErrorToast('Failed to load term-specific data', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Load Detailed tab data on demand
  useEffect(() => {
    const fetchDetailed = async () => {
      const tid = reportTerm?.termId;
      if (!tid || viewMode !== 'detailed') return;
      setIsLoadingDetailed(true);
      try {
        const resp = await skService.getTermOfficialsByBarangay(tid);
        if (resp.success) {
          const barangaysFromApi = Array.isArray(resp.data?.barangays) ? resp.data.barangays : (Array.isArray(resp.data) ? resp.data : []);
          // Merge with full barangay list so even those with no records appear
          const master = getBarangayOptions().map(b => ({ id: b.id, name: b.name }));
          const byId = {};
          (barangaysFromApi || []).forEach(b => { byId[b.barangayId] = b; });

          const merged = master.map(m => {
            const found = byId[m.id];
            return {
              barangayId: m.id,
              barangayName: m.name,
              officials: found?.officials || []
            };
          });

          setDetailedBarangays(merged);
        } else {
          showErrorToast('Failed to load detailed report', resp.message || '');
          setDetailedBarangays([]);
        }
      } catch (e) {
        setDetailedBarangays([]);
      } finally {
        setIsLoadingDetailed(false);
      }
    };
    fetchDetailed();
  }, [viewMode, reportTerm?.termId]);

  // Removed computeOverrides - using loadTermSpecificData instead to avoid duplicate data loading


  // Build 10-slot hierarchy per barangay: 1 Chairperson, 7 Councilors, 1 Secretary, 1 Treasurer
  const buildPositionSlots = (officials = []) => {
    const chair = officials.find(o => o.position === 'SK Chairperson');
    const councilors = officials.filter(o => o.position === 'SK Councilor').slice(0, 7);
    const secretary = officials.find(o => o.position === 'SK Secretary');
    const treasurer = officials.find(o => o.position === 'SK Treasurer');

    const slots = new Array(10).fill(null);
    slots[0] = chair || null;
    for (let i = 0; i < 7; i++) {
      slots[1 + i] = councilors[i] || null;
    }
    slots[8] = secretary || null;
    slots[9] = treasurer || null;

    // Attach label for position column based on index
    const positionByIndex = [
      'SK Chairperson',
      'SK Councilor',
      'SK Councilor',
      'SK Councilor',
      'SK Councilor',
      'SK Councilor',
      'SK Councilor',
      'SK Councilor',
      'SK Secretary',
      'SK Treasurer'
    ];

    return slots.map((o, idx) => ({
      index: idx + 1,
      positionLabel: positionByIndex[idx],
      ...o
    }));
  };

  // Uppercase helper for non-email values
  const toUpper = (value) => {
    if (value === null || value === undefined) return '';
    return String(value).toUpperCase();
  };

  // Load master list of barangays for the dropdown as a fallback
  useEffect(() => {
    const loadBarangays = async () => {
      try {
        setIsLoadingBarangays(true);
        if (typeof skService.getAllBarangays === 'function') {
          const resp = await skService.getAllBarangays();
          // Support both sync array and API-style response
          if (Array.isArray(resp)) {
            setAllBarangays(resp);
          } else if (resp && resp.success && Array.isArray(resp.data)) {
            setAllBarangays(resp.data);
          }
        }
      } catch (e) {
        // ignore silently for dropdown fallback
      } finally {
        setIsLoadingBarangays(false);
      }
    };
    loadBarangays();
  }, []);

  const handleRefresh = () => {
    loadData();
  };

  // Ensure selected barangay data is loaded when user changes selection
  useEffect(() => {
    if (overviewBarangay && overviewBarangay !== 'all') {
      if (!barangayVacancies || !barangayVacancies[overviewBarangay]) {
        if (typeof loadBarangayVacancies === 'function') {
          loadBarangayVacancies(overviewBarangay);
        }
      }
    }
  }, [overviewBarangay, barangayVacancies, loadBarangayVacancies]);

  // Ensure all-barangays data is loaded when entering the Barangay Details tab
  useEffect(() => {
    if (viewMode === 'barangay') {
      const hasAny = barangayVacancies && Object.keys(barangayVacancies).length > 0;
      if (!hasAny && typeof loadAllBarangayVacancies === 'function') {
        loadAllBarangayVacancies();
      }
    }
  }, [viewMode, barangayVacancies, loadAllBarangayVacancies]);

  // Get the appropriate barangay filter based on current tab
  const getCurrentBarangayFilter = () => {
    if (viewMode === 'overview') return overviewBarangay;
    if (viewMode === 'barangay') return barangayDetailsBarangay;
    return detailedBarangayFilter;
  };

  // Per-barangay export router
  const exportBarangay = async (format, barangay) => {
    const resp = reportTerm?.termId ? await skService.exportTermDetailed(reportTerm.termId, 'json', barangay.barangayId) : { success: false };
    const bag = resp.success ? (resp.data?.barangays || [barangay]) : [barangay];
    if (resp.success) showSuccessToast('Export logged', `Barangay ${barangay.barangayName} export recorded`);
    if (format === 'csv') return downloadCsv(`${(reportTerm?.termName || 'sk-term')}-${barangay.barangayName}-detailed.csv`, buildCsvRows(bag));
    if (format === 'excel' || format === 'xlsx') return downloadExcel(`${(reportTerm?.termName || 'sk-term')}-${barangay.barangayName}-detailed.xls`, buildExcelXml(bag));
    if (format === 'pdf') return openPrintPdf(`${(reportTerm?.termName || 'SK Term')} - Barangay ${barangay.barangayName}`, bag);
  };

  // Handle barangay filter change based on current tab
  const handleBarangayFilterChange = (value) => {
    if (viewMode === 'overview') {
      setOverviewBarangay(value);
    } else if (viewMode === 'barangay') {
      setBarangayDetailsBarangay(value);
    } else {
      setDetailedBarangayFilter(value);
    }
  };

  const getVacancySummaryData = () => {
    console.log('🔍 getVacancySummaryData called');
    console.log('🔍 ovrOverallVacancyStats:', ovrOverallVacancyStats);
    console.log('🔍 ovrOverallVacancyStats keys:', Object.keys(ovrOverallVacancyStats || {}));
    console.log('🔍 ovrOverallVacancyStats length:', Object.keys(ovrOverallVacancyStats || {}).length);
    
    // Use override data (barangay-specific) as primary source for consistency
    if (ovrOverallVacancyStats && Object.keys(ovrOverallVacancyStats).length > 0) {
      console.log('🔍 getVacancySummaryData - ovrOverallVacancyStats:', ovrOverallVacancyStats);
      
      // Calculate totals from the overall stats
      const totalPositions = Object.values(ovrOverallVacancyStats).reduce((sum, pos) => sum + (pos.max || 0), 0);
      const filledPositions = Object.values(ovrOverallVacancyStats).reduce((sum, pos) => sum + (pos.filled || 0), 0);
      const vacantPositions = Math.max(0, totalPositions - filledPositions);
      const vacancyRate = totalPositions > 0 ? Math.round((vacantPositions / totalPositions) * 100) : 0;
      
      console.log('🔍 getVacancySummaryData - Using override data:', {
        totalPositions,
        filledPositions,
        vacantPositions,
        vacancyRate,
        ovrOverallVacancyStats
      });
      
      return { totalPositions, filledPositions, vacantPositions, vacancyRate };
    }
    
    // Fallback to term statistics if override data not available
    if (reportTerm?.statistics) {
      console.log('🔍 getVacancySummaryData - using reportTerm.statistics:', reportTerm.statistics);
      const stats = extractTermStats(reportTerm);
      console.log('🔍 getVacancySummaryData - extracted stats:', stats);
      if (stats) {
        const result = {
          totalPositions: stats.total || 0,
          filledPositions: stats.filled || 0,
          vacantPositions: stats.vacant || 0,
          vacancyRate: 100 - (stats.percent || 0)  // Convert completion % to vacancy %
        };
        console.log('🔍 getVacancySummaryData - returning term stats result:', result);
        return result;
      }
    }
    
    // Alternative fallback: Use the position breakdown data that's working correctly
    console.log('🔍 getVacancySummaryData - falling back to position breakdown calculation');
    const positionStats = getPositionStats();
    if (positionStats && positionStats.length > 0) {
      const totalPositions = positionStats.reduce((sum, stat) => sum + (stat.total || 0), 0);
      const filledPositions = positionStats.reduce((sum, stat) => sum + (stat.filled || 0), 0);
      const vacantPositions = positionStats.reduce((sum, stat) => sum + (stat.available || 0), 0);
      const vacancyRate = totalPositions > 0 ? Math.round((vacantPositions / totalPositions) * 100) : 0;
      
      console.log('🔍 getVacancySummaryData - calculated from position stats:', {
        totalPositions,
        filledPositions,
        vacantPositions,
        vacancyRate,
        positionStats
      });
      
      return { totalPositions, filledPositions, vacantPositions, vacancyRate };
    }
    
    // Final fallback to validation hook data
    const summary = getVacancySummary();
    return {
      totalPositions: summary?.totalPositions || 0,
      filledPositions: summary?.filledPositions || 0,
      vacantPositions: summary?.vacantPositions || 0,
      vacancyRate: summary?.vacancyRate || 0
    };
  };

  const getFilteredBarangays = () => {
    const source = ovrBarangayVacancies || barangayVacancies;
    console.log('🔍 getFilteredBarangays - source:', source);
    console.log('🔍 getFilteredBarangays - ovrBarangayVacancies:', ovrBarangayVacancies);
    console.log('🔍 getFilteredBarangays - barangayVacancies:', barangayVacancies);
    if (!source) return [];

    // backend shape: { [barangayId]: { barangayName, vacancies, officials } }
    let filtered = Object.entries(source).map(([barangayId, info]) => {
      const vacancies = (info && info.vacancies) ? info.vacancies : (info || {});
      const officials = (info && info.officials) ? info.officials : [];
      const barangayName = (info && info.barangayName) || skService.getBarangayById?.(barangayId)?.name;
      
      console.log(`🔍 Processing barangay ${barangayId} in getFilteredBarangays:`, { vacancies, officials: officials.length });
      
      const totalPositions = Object.values(POSITION_LIMITS || {}).reduce((sum, limit) => sum + (limit || 0), 0);
      
      // Calculate filled positions from vacancies (which contains the count directly)
      const filledPositions = Object.values(vacancies || {}).reduce((sum, count) => sum + (count || 0), 0);
      
      // Alternative: count from officials array if vacancies is empty
      const filledFromOfficials = officials.length;
      const finalFilledPositions = filledPositions > 0 ? filledPositions : filledFromOfficials;
      
      const vacantPositions = Math.max(0, totalPositions - finalFilledPositions);
      const vacancyRate = totalPositions > 0 ? ((vacantPositions / totalPositions) * 100).toFixed(1) : '0.0';

      console.log(`🔍 Barangay ${barangayId} summary: total=${totalPositions}, filled=${finalFilledPositions}, vacant=${vacantPositions}, rate=${vacancyRate}%`);

      return {
        id: barangayId,
        name: barangayName || `Barangay ${barangayId}`,
        vacancies: vacancies || {},
        officials: officials || [],
        totalPositions: totalPositions || 0,
        filledPositions: finalFilledPositions || 0,
        vacantPositions: vacantPositions || 0,
        vacancyRate: parseFloat(vacancyRate) || 0
      };
    });

    // Apply filters
    if (getCurrentBarangayFilter() !== 'all') {
      filtered = filtered.filter(b => b.id === getCurrentBarangayFilter());
    }

    if (selectedPosition !== 'all') {
      filtered = filtered.filter(b => {
        const positionData = b.vacancies[selectedPosition];
        return positionData && positionData.available > 0;
      });
    }

    // Apply search
    if (searchQuery) {
      filtered = filtered.filter(b => 
        b.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'vacancy_rate':
          aValue = a.vacancyRate;
          bValue = b.vacancyRate;
          break;
        case 'total_vacant':
          aValue = a.vacantPositions;
          bValue = b.vacantPositions;
          break;
        case 'name':
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  };

  const getPositionStats = () => {
    // Check if we're filtering by a specific barangay
    const currentBarangayFilter = getCurrentBarangayFilter();
    
    if (currentBarangayFilter !== 'all') {
      // Use barangay-specific data when filtering
      const vacancySource = ovrBarangayVacancies || barangayVacancies;
      const barangayData = vacancySource && vacancySource[currentBarangayFilter];
      
      if (barangayData) {
        console.log('🔍 getPositionStats - using barangay-specific data for:', currentBarangayFilter, barangayData);
        console.log('🔍 barangayData.vacancies:', barangayData.vacancies);
        console.log('🔍 barangayData.officials:', barangayData.officials);
        
        return Object.entries(POSITION_LIMITS).map(([position, perBarangayLimit]) => {
          // Try to get filled count from vacancies first
          let filled = barangayData.vacancies?.[position] || 0;
          
          // If vacancies doesn't have the data, count from officials array
          if (filled === 0 && barangayData.officials) {
            filled = barangayData.officials.filter(o => o.position === position).length;
            console.log(`🔍 Counted ${filled} officials for position ${position} from officials array`);
          }
          
          const total = perBarangayLimit;
          const available = Math.max(0, total - filled);
          const vacancyRate = total > 0 ? ((available / total) * 100).toFixed(1) : '0.0';

          console.log(`🔍 Position ${position}: filled=${filled}, total=${total}, available=${available}`);

      return {
        position,
            total,
            filled,
            available,
        vacancyRate: parseFloat(vacancyRate)
      };
    });
      }
    }
    
    // Use overall term statistics when not filtering by barangay
    if (reportTerm?.statistics) {
      const stats = extractTermStats(reportTerm);
      if (stats) {
        return Object.entries(POSITION_LIMITS).map(([position, perBarangayLimit]) => {
          // Map position names to the correct keys in the stats
          let positionKey;
          switch (position) {
            case 'SK Chairperson':
              positionKey = 'chairpersons';
              break;
            case 'SK Secretary':
              positionKey = 'secretaries';
              break;
            case 'SK Treasurer':
              positionKey = 'treasurers';
              break;
            case 'SK Councilor':
              positionKey = 'councilors';
              break;
            default:
              positionKey = position.toLowerCase().replace('sk ', '');
          }
          
          const filled = stats.byPosition?.[positionKey] || 0;
          const total = stats.capacityByPosition?.[positionKey] || 0;
          const available = Math.max(0, total - filled);
          const vacancyRate = total > 0 ? ((available / total) * 100).toFixed(1) : '0.0';

          return {
            position,
            total,
            filled,
            available,
            vacancyRate: parseFloat(vacancyRate)
          };
        });
      }
    }
    
    // Fallback to override data
    const statsSource = ovrOverallVacancyStats || overallVacancyStats;
    if (!statsSource) return [];

    const normalized = extractTermStats(reportTerm);
    const barangaysCount = normalized?.barangays || Object.keys(ovrBarangayVacancies || {}).length || 0;

    return Object.entries(POSITION_LIMITS).map(([position, perBarangayLimit]) => {
      const stats = statsSource[position] || { filled: 0, max: perBarangayLimit };
      const total = (stats.max && stats.max > 0)
        ? stats.max
        : barangaysCount * perBarangayLimit;
      const filled = stats.filled || 0;
      const available = Math.max(0, total - filled);
      const vacancyRate = total > 0 ? ((available / total) * 100).toFixed(1) : '0.0';

      return {
        position,
        total,
        filled,
        available,
        vacancyRate: parseFloat(vacancyRate)
      };
    });
  };

  const getBarangayOptions = () => {
    // Prefer the complete master list if available so options don't shrink after selection
    if (Array.isArray(allBarangays) && allBarangays.length > 0) {
      return allBarangays.map(b => ({ id: b.barangayId || b.id || b.code, name: b.barangayName || b.name }));
    }

    // Otherwise, use whatever we have in the vacancies cache (including override data)
    const vacancySource = ovrBarangayVacancies || barangayVacancies;
    if (vacancySource && Object.keys(vacancySource).length > 0) {
      return Object.entries(vacancySource).map(([barangayId, info]) => {
        const name = (info && info.barangayName) || skService.getBarangayById?.(barangayId)?.name || `Barangay ${barangayId}`;
        return { id: barangayId, name };
      });
    }

    return [];
  };

  const getPositionOptions = () => {
    return Object.keys(POSITION_LIMITS).map(position => ({
      value: position,
      label: position
    }));
  };

  // Filter configuration
  const filterConfig = [
    {
      id: 'barangayName',
      label: 'Barangay',
      type: 'select',
      placeholder: 'All Barangays',
      options: getBarangayOptions().map(b => ({ value: b.name, label: b.name })),
      description: 'Filter by specific barangay'
    },
    {
      id: 'position',
      label: 'Position',
      type: 'select',
      placeholder: 'All Positions',
      options: getPositionOptions().map(p => ({ value: p.label, label: p.label })),
      description: 'Filter by SK position'
    },
    {
      id: 'vacancyRate',
      label: 'Vacancy Rate',
      type: 'select',
      placeholder: 'All Rates',
      options: [
        { value: 'low', label: 'Low (0-10%)' },
        { value: 'medium', label: 'Medium (11-20%)' },
        { value: 'high', label: 'High (21%+)' }
      ],
      description: 'Filter by vacancy rate range'
    }
  ];

  // Handle search query changes
  const handleSearchChange = (newQuery) => {
    setSearchQuery(newQuery);
    setCurrentPage(1);
  };

  // Handle filter changes
  const handleFilterChange = (newValues) => {
    setFilterValues(newValues);
  };

  // Removed old filter handlers and flags

  const renderOverviewCards = () => {
    let summary = {
      totalPositions: 0,
      filledPositions: 0,
      vacantPositions: 0,
      vacancyRate: 0
    };
    
    // Get filtered data based on all active filters
    const filteredBarangays = getFilteredBarangays();
    
    // Debug logging
    console.log('Overview Cards Debug:', {
      overviewBarangay,
      selectedPosition,
      vacancySource: ovrBarangayVacancies || barangayVacancies,
      filteredBarangays: filteredBarangays.length,
      currentFilter: getCurrentBarangayFilter()
    });
    
    // If viewing a specific barangay, use that barangay's data
    if (overviewBarangay !== 'all') {
      const vacancySource = ovrBarangayVacancies || barangayVacancies;
      const entry = vacancySource && vacancySource[overviewBarangay];
      console.log('Barangay Entry:', { overviewBarangay, entry, vacancySourceKeys: Object.keys(vacancySource || {}) });
      
      if (entry) {
        const v = (entry && entry.vacancies) ? entry.vacancies : (entry || {});
        console.log('Vacancy Data:', { v, entry });
        
        // Apply position filter if selected
        let totalPerBarangay, filledPerBarangay;
        if (selectedPosition !== 'all') {
          const positionLimit = POSITION_LIMITS[selectedPosition] || 0;
          const positionData = v[selectedPosition] || {};
          totalPerBarangay = positionLimit;
          filledPerBarangay = positionData?.current || positionData?.filled || 0;
        } else {
          totalPerBarangay = Object.values(POSITION_LIMITS).reduce((sum, lim) => sum + lim, 0);
          // Count filled positions from the officials array
          filledPerBarangay = entry.officials ? entry.officials.length : 0;
        }
        
        const vacantPerBarangay = Math.max(0, totalPerBarangay - filledPerBarangay);
        const rate = totalPerBarangay > 0 ? Math.round((vacantPerBarangay / totalPerBarangay) * 100) : 0;
        summary = {
          totalPositions: totalPerBarangay,
          filledPositions: filledPerBarangay,
          vacantPositions: vacantPerBarangay,
          vacancyRate: rate
        };
        
        console.log('Barangay Summary:', summary);
      }
    } else {
      console.log('🔍 renderOverviewCards - overviewBarangay is "all", calling getVacancySummaryData');
      // Always use getVacancySummaryData for overall summary when viewing all barangays
      const overallSummary = getVacancySummaryData();
      console.log('🔍 getVacancySummaryData returned:', overallSummary);
      if (overallSummary) {
        summary = overallSummary;
        console.log('🔍 Using getVacancySummaryData result:', overallSummary);
      } else {
        console.log('🔍 getVacancySummaryData returned null/undefined');
      }
    }
    
    console.log('Final Summary:', summary);
    console.log('🔍 POSITION_LIMITS:', POSITION_LIMITS);
    console.log('🔍 ovrOverallVacancyStats:', ovrOverallVacancyStats);
    console.log('🔍 ovrBarangayVacancies keys:', Object.keys(ovrBarangayVacancies || {}));

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Positions Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-gray-900">Total Positions</h4>
                <p className="text-[11px] text-gray-600">Available across all barangays</p>
              </div>
            </div>
          </div>
          <div className="p-5">
            <div className="flex items-end justify-between">
              <div className="text-3xl font-bold text-gray-900">{summary.totalPositions}</div>
              <span className="px-2 py-1 text-xs rounded-lg bg-blue-50 text-blue-700 border border-blue-200">capacity</span>
            </div>
          </div>
        </div>

        {/* Filled Positions Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                <UserCheck className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-gray-900">Filled Positions</h4>
                <p className="text-[11px] text-gray-600">Currently occupied</p>
              </div>
            </div>
          </div>
          <div className="p-5">
            <div className="flex items-end justify-between">
              <div className="text-3xl font-bold text-gray-900">{summary.filledPositions}</div>
              <span className="px-2 py-1 text-xs rounded-lg bg-green-50 text-green-700 border border-green-200">filled</span>
            </div>
          </div>
        </div>

        {/* Vacant Positions Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-gradient-to-r from-amber-50 to-yellow-50 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                <UserX className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-gray-900">Vacant Positions</h4>
                <p className="text-[11px] text-gray-600">Need to be filled</p>
              </div>
            </div>
          </div>
          <div className="p-5">
            <div className="flex items-end justify-between">
              <div className="text-3xl font-bold text-gray-900">{summary.vacantPositions}</div>
              <span className="px-2 py-1 text-xs rounded-lg bg-amber-50 text-amber-700 border border-amber-200">open</span>
            </div>
          </div>
        </div>

        {/* Vacancy Rate Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-gradient-to-r from-red-50 to-rose-50 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-gray-900">Vacancy Rate</h4>
                <p className="text-[11px] text-gray-600">Percentage unfilled</p>
              </div>
            </div>
          </div>
          <div className="p-5">
            <div className="flex items-end justify-between">
              <div className="text-3xl font-bold text-gray-900">{summary.vacancyRate}%</div>
              <span className="px-2 py-1 text-xs rounded-lg bg-rose-50 text-rose-700 border border-rose-200">rate</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Overview meta: term period and duration (match SurveyBatchReport styling)
  const renderOverviewMeta = () => {
    const start = termCtx?.startDate ? new Date(termCtx.startDate) : null;
    const end = termCtx?.endDate ? new Date(termCtx.endDate) : null;
    const durationDays = (start && end && !isNaN(start) && !isNaN(end))
      ? Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)))
      : null;

    const formatLong = (d) => {
      if (!d) return 'N/A';
      const dt = new Date(d);
      if (isNaN(dt)) return 'N/A';
      return dt.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    };

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Term Period Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-gray-900">Term Period</h4>
                <p className="text-[11px] text-gray-600">Start and end dates</p>
              </div>
            </div>
          </div>
          <div className="p-5">
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
              <span className="text-gray-600">Start:</span>
              <span className="font-medium text-gray-900">{formatLong(termCtx?.startDate)}</span>
              <span className="mx-2 text-gray-400">to</span>
              <span className="text-gray-600">End:</span>
              <span className="font-medium text-gray-900">{formatLong(termCtx?.endDate)}</span>
            </div>
          </div>
        </div>

        {/* Term Duration Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-gradient-to-r from-emerald-50 to-green-50 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Clock className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-gray-900">Term Duration</h4>
                <p className="text-[11px] text-gray-600">Total days</p>
              </div>
            </div>
          </div>
          <div className="p-5">
            <div className="flex items-end justify-between">
              <div className="text-3xl font-bold text-gray-900">{durationDays ?? '—'}</div>
              <span className="px-2 py-1 text-xs rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">day{durationDays === 1 ? '' : 's'}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderPositionBreakdown = () => {
    console.log('🔍 renderPositionBreakdown called with overviewBarangay:', overviewBarangay);
    
    // Always use getPositionStats() which now handles barangay filtering correctly
    const positionStats = getPositionStats();
    
    console.log('🔍 renderPositionBreakdown - positionStats:', positionStats);

    // Map position to color scheme classes
    const getPositionClasses = (position) => {
      if (position.includes('Chairperson')) {
        return {
          gradient: 'bg-gradient-to-r from-purple-50 to-indigo-50',
          bg: 'bg-purple-100',
          icon: 'text-purple-600'
        };
      }
      if (position.includes('Secretary')) {
        return {
          gradient: 'bg-gradient-to-r from-blue-50 to-cyan-50',
          bg: 'bg-blue-100',
          icon: 'text-blue-600'
        };
      }
      if (position.includes('Treasurer')) {
        return {
          gradient: 'bg-gradient-to-r from-emerald-50 to-teal-50',
          bg: 'bg-emerald-100',
          icon: 'text-emerald-600'
        };
      }
      // Councilor
      return {
        gradient: 'bg-gradient-to-r from-green-50 to-emerald-50',
        bg: 'bg-green-100',
        icon: 'text-green-600'
      };
    };

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {positionStats.map((stat) => {
          const classes = getPositionClasses(stat.position);
          return (
            <div key={stat.position} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200">
              <div className={`px-5 py-3 ${classes.gradient} border-b border-gray-100`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg ${classes.bg} flex items-center justify-center`}>
                      <Users className={`w-4 h-4 ${classes.icon}`} />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-gray-900">{stat.position}</h4>
                      <p className="text-[11px] text-gray-600">Position status</p>
                    </div>
                  </div>
                  <Status 
                    status={stat.vacancyRate > 20 ? 'error' : stat.vacancyRate > 10 ? 'warning' : 'success'}
                    size="sm"
                    variant="pill"
                    className="px-2 py-0.5"
                    customLabel={<span className="text-[10px]">{stat.vacancyRate > 20 ? 'High Vacancy' : stat.vacancyRate > 10 ? 'Moderate' : 'Well Staffed'}</span>}
                  />
                </div>
              </div>
              
              <div className="p-5 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">Filled:</span>
                  <span className="text-sm font-semibold text-green-600">{stat.filled}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">Available:</span>
                  <span className="text-sm font-semibold text-orange-600">{stat.available}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">Total:</span>
                  <span className="text-sm font-semibold text-gray-900">{stat.total}</span>
                </div>
                
                {/* Progress bar */}
                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${stat.total > 0 ? (stat.filled / stat.total) * 100 : 0}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-500 mt-2">
                    <span>{stat.filled} filled</span>
                    <span>{stat.available} vacant</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Helpers for federation table
  const getBarangayName = (barangayId) => {
    return (typeof skService.getBarangayById === 'function'
      ? (skService.getBarangayById(barangayId)?.name || '')
      : '') || '';
  };

  const getFederationRows = () => {
    const rows = FED_POSITIONS.map((pos) => {
      const found = (federation || []).find(r => r.position === pos);
      const name = found ? [found.first_name, found.last_name].filter(Boolean).join(' ') : '';
      const barangay = found ? (getBarangayName(found.barangay_id) || found.barangay_id || '') : '';
      return { position: pos, name, barangay, assigned: !!found };
    });

    // Search filter
    const q = fedTableSearch.trim().toLowerCase();
    const filtered = q
      ? rows.filter(r => (
          r.position.toLowerCase().includes(q) ||
          r.name.toLowerCase().includes(q) ||
          r.barangay.toLowerCase().includes(q)
        ))
      : rows;

    // Sort
    filtered.sort((a, b) => {
      const key = fedSortBy;
      const av = (a[key] || '').toString().toLowerCase();
      const bv = (b[key] || '').toString().toLowerCase();
      if (av === bv) return 0;
      const cmp = av > bv ? 1 : -1;
      return fedSortOrder === 'asc' ? cmp : -cmp;
    });

    return filtered;
  };

  const exportFederationCsv = () => {
    const rows = [['Position', 'Name', 'Barangay']];
    getFederationRows().forEach(r => rows.push([r.position, r.name || 'Unassigned', r.barangay || '']));
    const csv = rows.map(r => r.map(v => {
      const s = (v ?? '').toString().replace(/"/g, '""');
      return /[",\n]/.test(s) ? `"${s}"` : s;
    }).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${(termCtx?.termName || 'sk-term')}-federation.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  // Debug logging
  console.log('SKTermReport Debug:', { 
    termIdParam,
    reportTerm,
    isLoadingReportTerm
  });

  const termCtx = reportTerm;
  const hasTerm = !!termCtx;

  // Show no term banner when no termId is provided
  if (!termIdParam) {
    return (
      <div className="space-y-5">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate(-1)}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </button>
                <div className="h-6 w-px bg-gray-300"></div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 mb-1">SK Term Report</h1>
                  <p className="text-sm text-gray-600">Comprehensive overview of SK official vacancies and term progress</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <ActiveTermBanner
          activeTerm={null}
          hasActiveTerm={false}
          isLoading={false}
          onNavigateToTerms={() => navigate('/staff/sk-governance/terms')}
          onCreateTerm={undefined}
          variant="report"
        />
      </div>
    );
  }

  const filteredBarangays = getFilteredBarangays();

  return (
    <div className="space-y-6">
      {/* Header Section (matches SurveyBatchReport header pattern) */}
      <HeaderMainContent
        leading={(
          <button
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="inline-flex items-center p-1 text-gray-700 text-base sm:text-sm sm:px-3 sm:py-2 sm:border sm:border-gray-300 sm:rounded-lg hover:bg-transparent sm:hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-0 sm:mr-2" />
            <span className="hidden sm:inline">Back</span>
          </button>
        )}
        title={(
          <div className="flex items-center space-x-2">
            <h1 className="text-base sm:text-xl font-bold text-gray-900 truncate">
              {hasTerm ? `${(termCtx?.termName || 'SK Term')} Report` : 'SK Term Report'}
            </h1>
            {hasTerm && (
              <Status
                status={
                  (termCtx?.status === 'active') ? 'active' :
                  (termCtx?.status === 'upcoming') ? 'warning' :
                  (termCtx?.status === 'completed') ? 'closed' :
                  'draft'
                }
                size="sm"
                variant="pill"
                className="px-2 py-0.5 sm:px-3 sm:py-1"
                customLabel={<span className="hidden sm:inline">{
                  (termCtx?.status === 'active') ? 'Active' :
                  (termCtx?.status === 'upcoming') ? 'Upcoming' :
                  (termCtx?.status === 'completed') ? 'Completed' :
                  'Draft'
                }</span>}
              />
            )}
          </div>
        )}
        description=""
      />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column - Report Content */}
        <div className="xl:col-span-3">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Tabs - Using Reusable Tab Components */}
            <TabContainer
              activeTab={viewMode}
              onTabChange={setViewMode}
              variant="underline"
              size="md"
            >
              <Tab 
                id="overview" 
                label="Overview" 
                shortLabel="Overview"
                color="blue"
              />
              <Tab 
                id="barangay" 
                label="Barangay Details" 
                shortLabel="Barangay"
                color="green"
              />
              <Tab 
                id="detailed" 
                label="Detailed Report" 
                shortLabel="Detailed"
                color="yellow"
              />
            <Tab 
              id="federation" 
              label="Federation" 
              shortLabel="Federation"
              color="purple"
            />
            </TabContainer>

            {/* Controls */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 overflow-x-auto pb-2 md:pb-0">
                  <div className="flex items-center space-x-3 min-w-max">
                    

                    <div className="flex items-center">
                      <label className="sr-only" htmlFor="barangayFilter">Barangay</label>
                      <select
                        id="barangayFilter"
                        value={getCurrentBarangayFilter()}
                        onChange={(e) => handleBarangayFilterChange(e.target.value)}
                        className="ml-2 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      >
                        <option value="all">All Barangays</option>
                        {getBarangayOptions().map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                        </div>

                    

                    
                  </div>
                </div>

                <div className="flex items-center space-x-3 flex-shrink-0">
                  <ExportButton
                    formats={['csv', 'xlsx', 'pdf']}
                    onExport={(format) => handleGlobalExport(format === 'xlsx' ? 'excel' : format)}
                    isExporting={mainExport.isExporting}
                    label="Export"
                    size="md"
                    position="auto"
                    responsive={true}
                    customFormats={{ pdf: { label: 'Export as PDF', icon: <FileText className="w-4 h-4" />, description: 'Portable document format', styles: [] } }}
                  />
                </div>
              </div>

              
            </div>

            {/* Content Area */}
            {isLoadingReportTerm || isLoading || tabLoading || isLoadingDetailed || isLoadingFederation ? (
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                  <div className="relative">
                    <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-600 animate-pulse" />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-3 font-medium">Loading data...</p>
                  <p className="text-xs text-gray-500 mt-1">Fetching term report information</p>
                </div>
              </div>
            ) : (
              <div className="p-6">
                {/* Overview Tab */}
                {viewMode === 'overview' && (
                  <>
                    {renderOverviewMeta()}
                    {renderOverviewCards()}
                    {renderPositionBreakdown()}
                  </>
                )}

                {/* Barangay Tab */}
                {viewMode === 'barangay' && (
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                        <Building2 className="w-5 h-5 mr-2 text-green-600" />
                        Barangay Capacity Overview
                      </h3>
                    </div>
                    
                    {/* Always show table view; it will be filtered by selectedBarangay */}
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Barangay
                            </th>
                            {Object.keys(POSITION_LIMITS).map(position => (
                              <th key={position} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                {position}
                              </th>
                            ))}
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Total Vacant
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Vacancy Rate
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredBarangays.length === 0 ? (
                              <tr>
                                <td colSpan={Object.keys(POSITION_LIMITS).length + 4} className="px-6 py-10 text-center text-gray-500">
                                  No barangay data available.
                                </td>
                              </tr>
                            ) : (
                              filteredBarangays.map((barangay) => (
                            <tr key={barangay.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                                  <span className="text-sm font-medium text-gray-900">{barangay.name}</span>
                                </div>
                              </td>
                              {Object.keys(POSITION_LIMITS).map(position => {
                                const positionData = barangay.vacancies[position];
                                const limit = POSITION_LIMITS[position];
                                    // positionData is the count directly, not an object with current/filled properties
                                    const filled = positionData || 0;
                                const available = limit - filled;
                                return (
                                  <td key={position} className="px-6 py-4 whitespace-nowrap text-center">
                                    <div className="flex flex-col items-center">
                                          <span className={`text-sm font-medium ${available > 0 ? 'text-orange-600' : 'text-green-600'}`}>{filled}/{limit}</span>
                                      {available > 0 && (
                                            <span className="text-xs text-orange-600 font-medium">{available} vacant</span>
                                      )}
                                    </div>
                                  </td>
                                );
                              })}
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                    <span className={`text-sm font-medium ${barangay.vacantPositions > 0 ? 'text-orange-600' : 'text-green-600'}`}>{barangay.vacantPositions}</span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                    <Status status={barangay.vacancyRate > 20 ? 'error' : barangay.vacancyRate > 10 ? 'warning' : 'success'} size="sm" variant="pill" customLabel={`${barangay.vacancyRate}%`} />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                    {/* Add Official button removed - staff users are view-only */}
                              </td>
                            </tr>
                              ))
                            )}
                        </tbody>
                      </table>
                    </div>
                    
                  </div>
                )}

                {/* Detailed Tab */}
                {viewMode === 'detailed' && (
                  <div className="space-y-8">
                    {/* Top-right per-tab export removed; use the blue Export button above */}
                    {(!detailedBarangays || detailedBarangays.length === 0) ? (
                      <div className="text-center py-16">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                          <FileText className="w-10 h-10 text-gray-400" />
                    </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">No data available</h3>
                        <p className="text-gray-600 max-w-md mx-auto">We couldn't find officials for the selected term.</p>
                      </div>
                    ) : (
                      (getCurrentBarangayFilter() !== 'all'
                        ? detailedBarangays.filter((db) => db.barangayId === getCurrentBarangayFilter())
                        : detailedBarangays
                      ).map((b) => (
                        <div key={b.barangayId} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                              <Building2 className="w-5 h-5 mr-2 text-green-600" />
                              Barangay {b.barangayName}
                            </h3>
                            <div className="flex items-center space-x-3">
                              <ExportButton
                                formats={['csv','xlsx','pdf']}
                                onExport={(format) => exportBarangay(format === 'xlsx' ? 'excel' : format, b)}
                                variant="outline"
                                size="sm"
                                label="Export"
                                customFormats={{ pdf: { label: 'Export as PDF', icon: <FileText className='w-4 h-4' />, description: 'Portable document format', styles: [] } }}
                              />
                            </div>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Age</th>
                                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Gender</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact number</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email Address</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">School / Company</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {buildPositionSlots(b.officials).map((o, idx) => (
                                  <tr key={o.skId || `${b.barangayId}-${idx}`} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700">{o.index}</td>
                                    <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{o?.name ? o.name.toUpperCase() : ''}</td>
                                    <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700">{o?.positionLabel ? String(o.positionLabel).toUpperCase() : ''}</td>
                                    <td className="px-6 py-3 whitespace-nowrap text-center text-sm text-gray-700">{o?.age ?? ''}</td>
                                    <td className="px-6 py-3 whitespace-nowrap text-center text-sm text-gray-700">{o?.gender ? String(o.gender).toUpperCase() : ''}</td>
                                    <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700">{o?.contactNumber ? String(o.contactNumber).toUpperCase() : ''}</td>
                                    <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700">{o?.emailAddress || ''}</td>
                                    <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700">{o?.schoolOrCompany ? String(o.schoolOrCompany).toUpperCase() : ''}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Federation Tab */}
                {viewMode === 'federation' && (
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                        <Users className="w-5 h-5 mr-2 text-purple-600" />
                        SK Federation Officers
                      </h3>
                      <div className="flex items-center gap-2">
                        <div className="hidden sm:flex items-center gap-2">
                          <input
                            type="text"
                            value={fedTableSearch}
                            onChange={(e) => setFedTableSearch(e.target.value)}
                            placeholder="Search position, name, barangay..."
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                          />
                          <select
                            value={fedSortBy}
                            onChange={(e) => setFedSortBy(e.target.value)}
                            className="px-2 py-2 border border-gray-200 rounded-lg text-sm"
                          >
                            <option value="position">Position</option>
                            <option value="name">Name</option>
                            <option value="barangay">Barangay</option>
                          </select>
                          <select
                            value={fedSortOrder}
                            onChange={(e) => setFedSortOrder(e.target.value)}
                            className="px-2 py-2 border border-gray-200 rounded-lg text-sm"
                          >
                            <option value="asc">Asc</option>
                            <option value="desc">Desc</option>
                          </select>
                          <button
                            onClick={exportFederationCsv}
                            className="px-3 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50"
                          >
                            Export CSV
                          </button>
                        </div>
                        {/* Edit Federation button removed - staff users are view-only */}
                      </div>
                    </div>
                    <div className="px-4 pt-3 sm:hidden">
                      <input
                        type="text"
                        value={fedTableSearch}
                        onChange={(e) => setFedTableSearch(e.target.value)}
                        placeholder="Search position, name, barangay..."
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      />
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Barangay</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {getFederationRows().map((row) => (
                            <tr key={row.position} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.position}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{row.name || 'Unassigned'}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{row.barangay}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-right">
                                <button
                                  onClick={() => { setEditingPosition(row.position); setShowEditFederation(true); }}
                                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                  {row.assigned ? 'Change' : 'Assign'}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Pagination - Always visible */}
            {!isLoading && viewMode === 'barangay' && (
              <Pagination
                currentPage={currentPage}
                totalItems={filteredBarangays.length}
                itemsPerPage={itemsPerPage}
                onPageChange={pagination.handlePageChange}
                onItemsPerPageChange={pagination.handleItemsPerPageChange}
                itemName="barangay"
                itemNamePlural="barangays"
                showItemsPerPage={true}
                showInfo={true}
                size="md"
                variant="default"
                itemsPerPageOptions={[5, 10, 20, 50]}
              />
            )}
          </div>
        </div>

        
      </div>

      {/* Universal Toast Container */}
      <ToastContainer position="top-right" maxToasts={5} />
      
      {/* Federation editing removed - staff users are view-only */}
    </div>
  );
};

export default SKTermReport;
