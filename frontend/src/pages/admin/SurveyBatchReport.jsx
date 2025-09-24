import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  ArrowLeft,
  BarChart3,
  Users,
  CheckCircle,
  Clock,
  Target,
  TrendingUp,
  FileText,
  Download,
  RefreshCw,
  Eye,
  AlertCircle,
  Calendar,
  MapPin,
  UserCheck,
  UserX,
  PieChart,
  Activity,
  Filter,
  Search,
  ArrowUpDown,
  ChevronDown,
  Grid,
  List
} from 'lucide-react';
import { HeaderMainContent, TabContainer, Tab, useTabState, LoadingSpinner, ExportButton, useExport, SearchBar, SortModal, useSortModal, FilterModal, Pagination, usePagination, Status } from '../../components/portal_main_content';
import { ToastContainer, showSuccessToast, showErrorToast } from '../../components/universal';
import surveyBatchesService from '../../services/surveyBatchesService.js';
import skService from '../../services/skService.js';

const SurveyBatchReport = () => {
  console.log('🔍 SurveyBatchReport component rendering...');
  
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const batchIdParam = queryParams.get('batchId');
  
  console.log('🔍 SurveyBatchReport - batchIdParam:', batchIdParam);
  console.log('🔍 SurveyBatchReport - location:', location);

  // State management
  const [reportBatch, setReportBatch] = useState(null);
  const [isLoadingReportBatch, setIsLoadingReportBatch] = useState(false);
  const [batchStatistics, setBatchStatistics] = useState(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [responses, setResponses] = useState([]);
  const [isLoadingResponses, setIsLoadingResponses] = useState(false);

  // Tab state with loading indicator
  const [tabLoading, setTabLoading] = useState(false);
  const { activeTab: viewMode, setActiveTab: setViewMode } = useTabState('overview', async (tabId) => {
    setTabLoading(true);
    try {
      setCurrentPage(1);
      // Load responses when switching to responses tab
      if (tabId === 'responses' && responses.length === 0) {
        await loadResponses();
      }
    } finally {
      setTabLoading(false);
    }
  });

  // Filter and search state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortBy, setSortBy] = useState('submittedDate');
  const [sortOrder, setSortOrder] = useState('desc');
  // Active filter indicator
  const activeFilterCount = (statusFilter !== 'all' ? 1 : 0) + (locationFilter !== 'all' ? 1 : 0);
  const hasActiveFilters = activeFilterCount > 0;
  // Master barangay list (optional) to populate filters with all barangays
  const [allBarangays, setAllBarangays] = useState([]);
  const [isLoadingBarangays, setIsLoadingBarangays] = useState(false);

  // Filter modal state
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterValues, setFilterValues] = useState({
    status: '',
    location: '',
    dateRange: ''
  });
  const filterTriggerRef = React.useRef(null);

  // Sort modal state
  const sortModal = useSortModal('submittedDate', 'desc', (newSortBy, newSortOrder) => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    setCurrentPage(1);
  });

  // Pagination state
  const pagination = usePagination({
    initialPage: currentPage,
    initialItemsPerPage: itemsPerPage,
    totalItems: responses.length,
    onPageChange: (page) => {
      setCurrentPage(page);
    },
    onItemsPerPageChange: (itemsPerPage) => {
      setItemsPerPage(itemsPerPage);
      setCurrentPage(1);
    }
  });

  // Load batch data when component mounts
  useEffect(() => {
    console.log('🔍 useEffect - batchIdParam changed:', batchIdParam);
    if (batchIdParam) {
      const loadBatch = async () => {
        try {
          setIsLoadingReportBatch(true);
          console.log('🔍 Loading batch data for batchIdParam:', batchIdParam);
          
          // Load batch details with statistics
          const batchResp = await surveyBatchesService.getSurveyBatchById(batchIdParam, true);
          const batch = batchResp?.data?.data || batchResp?.data || batchResp;
          console.log('🔍 Batch response:', batchResp);
          console.log('🔍 Processed batch:', batch);
          
          if (batch) {
            // Extract statistics from the batch data
            const statistics = {
              totalResponses: batch.statisticsTotalResponses || batch.total_responses || 0,
              validatedResponses: batch.statisticsValidatedResponses || batch.validated_responses || 0,
              rejectedResponses: batch.statisticsRejectedResponses || batch.rejected_responses || 0,
              pendingResponses: batch.statisticsPendingResponses || batch.pending_responses || 0,
              totalYouths: batch.statisticsTotalYouths || batch.total_youths || 0,
              totalYouthsSurveyed: batch.statisticsTotalYouthsSurveyed || batch.total_youths_surveyed || 0,
              totalYouthsNotSurveyed: batch.statisticsTotalYouthsNotSurveyed || batch.total_youths_not_surveyed || 0,
              responseRate: batch.responseRate || batch.response_rate || 0,
              validationRate: batch.validationRate || batch.validation_rate || 0
            };

            const reportBatchData = {
              batchId: batch.batchId || batch.batch_id || batch.id,
              batchName: batch.batchName || batch.batch_name,
              description: batch.description,
              startDate: batch.startDate || batch.start_date,
              endDate: batch.endDate || batch.end_date,
              status: batch.status,
              targetAgeMin: batch.targetAgeMin || batch.target_age_min,
              targetAgeMax: batch.targetAgeMax || batch.target_age_max,
              statistics: statistics
            };
            console.log('🔍 Setting reportBatch:', reportBatchData);
            setReportBatch(reportBatchData);
            setBatchStatistics(statistics);
            // Preload responses so the tab badge count updates immediately
            try {
              await loadResponses(reportBatchData.batchId);
            } catch (e) {
              console.warn('⚠️ Preload responses failed (non-blocking):', e?.message || e);
            }
          }
        } catch (error) {
          console.error('❌ Error loading batch:', error);
          showErrorToast('Failed to load batch data', error.message);
        } finally {
          setIsLoadingReportBatch(false);
        }
      };
      loadBatch();
    }
  }, [batchIdParam]);

  // Sample data removed; rely solely on API responses

  // Load responses function
  const loadResponses = async (batchIdOverride = null) => {
    const effectiveBatchId = batchIdOverride || reportBatch?.batchId;
    if (!effectiveBatchId) return;
    
    try {
      setIsLoadingResponses(true);
      console.log('🔍 Loading responses for batchId:', effectiveBatchId);
      
      const responsesResp = await surveyBatchesService.getBatchResponses(effectiveBatchId);
      console.log('🔍 Responses response:', responsesResp);
      console.log('🔍 Responses response success:', responsesResp?.success);
      console.log('🔍 Responses response data:', responsesResp?.data);
      console.log('🔍 Responses response data type:', typeof responsesResp?.data);
      console.log('🔍 Responses response data keys:', responsesResp?.data ? Object.keys(responsesResp.data) : 'no data');
      
      if (responsesResp?.success) {
        const items = Array.isArray(responsesResp?.data?.data)
          ? responsesResp.data.data
          : Array.isArray(responsesResp?.data)
            ? responsesResp.data
            : Array.isArray(responsesResp?.items)
              ? responsesResp.items
              : Array.isArray(responsesResp?.data?.items)
                ? responsesResp.data.items
                : [];
        console.log('🔍 Extracted items:', items);
        console.log('🔍 Items length:', items.length);
        setResponses(items);
      } else {
        console.error('❌ Failed to load responses:', responsesResp?.message);
        console.error('❌ Full error response:', responsesResp);
        setResponses([]);
      }
    } catch (error) {
      console.error('❌ Error loading responses:', error);
      setResponses([]);
    } finally {
      setIsLoadingResponses(false);
    }
  };

  // Load responses when batch is available
  useEffect(() => {
    if (reportBatch?.batchId && viewMode === 'responses') {
      loadResponses();
    }
  }, [reportBatch?.batchId, viewMode]);

  // Load master list of barangays for dropdown (fallback to responses otherwise)
  useEffect(() => {
    const loadBarangays = async () => {
      try {
        setIsLoadingBarangays(true);
        if (typeof skService?.getAllBarangays === 'function') {
          const resp = await skService.getAllBarangays();
          if (Array.isArray(resp)) {
            setAllBarangays(resp);
          } else if (resp && resp.success && Array.isArray(resp.data)) {
            setAllBarangays(resp.data);
          }
        }
      } catch (e) {
        // ignore silently
      } finally {
        setIsLoadingBarangays(false);
      }
    };
    loadBarangays();
  }, []);

  // Export functionality
  const buildBatchCsvRows = (responses = []) => {
    const rows = [];
    rows.push([
      'Region', 'Province', 'City/Municipality', 'Barangay', 'Name', 'Age', 'Birthday M', 'Birthday D', 'Birthday Y',
      'Sex Assigned at Birth', 'Civil Status', 'Youth Classification', 'Age Group', 'Email Address', 'Contact Number',
      'Home Address', 'Highest Educational Attainment', 'Work Status', 'Registered Voter? (Y/N)',
      'Voted Last Election? (Y/N)', 'Attended KK Assembly? (Y/N)', 'If yes, how many times?'
    ]);
    (responses || []).forEach((r) => {
      const region = r.region || r.addressRegion || '';
      const province = r.province || r.addressProvince || '';
      const city = r.cityMunicipality || r.city || r.municipality || r.addressCity || '';
      const barangay = r.location || r.barangay || '';
      const name = r.youthName || r.name || [r.lastName, r.firstName].filter(Boolean).join(', ') || '';
      const age = r.age ?? '';
      const d = r.birthDate || r.birthday ? new Date(r.birthDate || r.birthday) : null;
      const bMonth = d ? String(d.getMonth() + 1) : '';
      const bDay = d ? String(d.getDate()) : '';
      const bYear = d ? String(d.getFullYear()) : '';
      const sexAtBirth = r.sexAtBirth || r.sex_assigned_at_birth || r.sexAssignedAtBirth || r.sex || r.gender || '';
      const civilStatus = r.civilStatus || '';
      const classification = r.youthClassification || r.classification || r.classify || '';
      const ageGroup = r.youthAgeGroup || r.ageGroup || '';
      const email = r.email || '';
      const phone = r.phone || r.contactNumber || '';
      const homeAddress = r.homeAddress || r.address || [barangay, city, province].filter(Boolean).join(', ');
      const education = r.education || r.highestEducationalAttainment || '';
      const workStatus = r.workStatus || r.employmentStatus || '';
      const regVoter = r.registeredVoter !== undefined ? (r.registeredVoter ? 'Y' : 'N') : (r.isRegisteredVoter ? 'Y' : '');
      const votedLastRaw = (r.votedLastElection !== undefined ? r.votedLastElection : (r.voted_last_SK !== undefined ? r.voted_last_SK : undefined));
      const attendedRaw = (r.attendedKKAssembly !== undefined ? r.attendedKKAssembly : (r.attended_KK_assembly !== undefined ? r.attended_KK_assembly : undefined));
      const votedLast = votedLastRaw !== undefined ? (Boolean(votedLastRaw) ? 'Y' : 'N') : '';
      const attendedKK = attendedRaw !== undefined ? (Boolean(attendedRaw) ? 'Y' : 'N') : '';
      const attendanceCount = (r.kkAssemblyAttendanceCount ?? r.kkAssemblyCount ?? r.times_attended ?? '');
      rows.push([
        region, province, city, barangay, name, age, bMonth, bDay, bYear, sexAtBirth, civilStatus, classification,
        ageGroup, email, phone, homeAddress, education, workStatus, regVoter, votedLast, attendedKK, attendanceCount
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

  // Excel (XLS via XML) export for responses
  const buildResponsesExcelXml = (responses = []) => {
    const headerRow = `
      <Row>
        <Cell><Data ss:Type="String">Region</Data></Cell>
        <Cell><Data ss:Type="String">Province</Data></Cell>
        <Cell><Data ss:Type="String">City/Municipality</Data></Cell>
        <Cell><Data ss:Type="String">Barangay</Data></Cell>
        <Cell><Data ss:Type="String">Name</Data></Cell>
        <Cell><Data ss:Type="String">Age</Data></Cell>
        <Cell><Data ss:Type="String">Birthday M</Data></Cell>
        <Cell><Data ss:Type="String">Birthday D</Data></Cell>
        <Cell><Data ss:Type="String">Birthday Y</Data></Cell>
        <Cell><Data ss:Type="String">Sex Assigned at Birth</Data></Cell>
        <Cell><Data ss:Type="String">Civil Status</Data></Cell>
        <Cell><Data ss:Type="String">Youth Classification</Data></Cell>
        <Cell><Data ss:Type="String">Age Group</Data></Cell>
        <Cell><Data ss:Type="String">Email Address</Data></Cell>
        <Cell><Data ss:Type="String">Contact Number</Data></Cell>
        <Cell><Data ss:Type="String">Home Address</Data></Cell>
        <Cell><Data ss:Type="String">Highest Educational Attainment</Data></Cell>
        <Cell><Data ss:Type="String">Work Status</Data></Cell>
        <Cell><Data ss:Type="String">Registered Voter? (Y/N)</Data></Cell>
        <Cell><Data ss:Type="String">Voted Last Election? (Y/N)</Data></Cell>
        <Cell><Data ss:Type="String">Attended KK Assembly? (Y/N)</Data></Cell>
        <Cell><Data ss:Type="String">If yes, how many times?</Data></Cell>
      </Row>`;

    const bodyRows = (responses || []).map((r) => {
      const region = r.region || r.addressRegion || '';
      const province = r.province || r.addressProvince || '';
      const city = r.cityMunicipality || r.city || r.municipality || r.addressCity || '';
      const barangay = r.location || r.barangay || '';
      const name = r.youthName || r.name || [r.lastName, r.firstName].filter(Boolean).join(', ') || '';
      const age = r.age ?? '';
      const d = r.birthDate || r.birthday ? new Date(r.birthDate || r.birthday) : null;
      const bMonth = d ? String(d.getMonth() + 1) : '';
      const bDay = d ? String(d.getDate()) : '';
      const bYear = d ? String(d.getFullYear()) : '';
      const sexAtBirth = r.sexAtBirth || r.sex_assigned_at_birth || r.sexAssignedAtBirth || r.sex || r.gender || '';
      const civilStatus = r.civilStatus || '';
      const classification = r.youthClassification || r.classification || r.classify || '';
      const ageGroup = r.youthAgeGroup || r.ageGroup || '';
      const email = r.email || '';
      const phone = r.phone || r.contactNumber || '';
      const homeAddress = r.homeAddress || r.address || [barangay, city, province].filter(Boolean).join(', ');
      const education = r.education || r.highestEducationalAttainment || '';
      const workStatus = r.workStatus || r.employmentStatus || '';
      const regVoter = r.registeredVoter !== undefined ? (r.registeredVoter ? 'Y' : 'N') : (r.isRegisteredVoter ? 'Y' : '');
      const votedLastRaw = (r.votedLastElection !== undefined ? r.votedLastElection : (r.voted_last_SK !== undefined ? r.voted_last_SK : undefined));
      const attendedRaw = (r.attendedKKAssembly !== undefined ? r.attendedKKAssembly : (r.attended_KK_assembly !== undefined ? r.attended_KK_assembly : undefined));
      const votedLast = votedLastRaw !== undefined ? (Boolean(votedLastRaw) ? 'Y' : 'N') : '';
      const attendedKK = attendedRaw !== undefined ? (Boolean(attendedRaw) ? 'Y' : 'N') : '';
      const attendanceCount = (r.kkAssemblyAttendanceCount ?? r.kkAssemblyCount ?? r.times_attended ?? '');
      return `
      <Row>
        <Cell><Data ss:Type="String">${region}</Data></Cell>
        <Cell><Data ss:Type="String">${province}</Data></Cell>
        <Cell><Data ss:Type="String">${city}</Data></Cell>
        <Cell><Data ss:Type="String">${barangay}</Data></Cell>
        <Cell><Data ss:Type="String">${name}</Data></Cell>
        <Cell><Data ss:Type="String">${age}</Data></Cell>
        <Cell><Data ss:Type="String">${bMonth}</Data></Cell>
        <Cell><Data ss:Type="String">${bDay}</Data></Cell>
        <Cell><Data ss:Type="String">${bYear}</Data></Cell>
        <Cell><Data ss:Type="String">${sexAtBirth}</Data></Cell>
        <Cell><Data ss:Type="String">${civilStatus}</Data></Cell>
        <Cell><Data ss:Type="String">${classification}</Data></Cell>
        <Cell><Data ss:Type="String">${ageGroup}</Data></Cell>
        <Cell><Data ss:Type="String">${email}</Data></Cell>
        <Cell><Data ss:Type="String">${phone}</Data></Cell>
        <Cell><Data ss:Type="String">${homeAddress}</Data></Cell>
        <Cell><Data ss:Type="String">${education}</Data></Cell>
        <Cell><Data ss:Type="String">${workStatus}</Data></Cell>
        <Cell><Data ss:Type="String">${regVoter}</Data></Cell>
        <Cell><Data ss:Type="String">${votedLast}</Data></Cell>
        <Cell><Data ss:Type="String">${attendedKK}</Data></Cell>
        <Cell><Data ss:Type="String">${attendanceCount}</Data></Cell>
      </Row>`;
    }).join('');

    return `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
<Worksheet ss:Name="Responses">
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

  const openBatchPrintPdf = (title, responses = []) => {
    const win = window.open('', '_blank');
    if (!win) return;
    const styles = `
      <style>
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        body { font-family: Arial, sans-serif; color: #111; margin: 6mm; }
        h1 { font-size: 16px; margin: 0 0 8px; font-weight: 700; text-align: left; }
        h2 { font-size: 15px; margin: 12px 0 8px; font-weight: 700; text-align: center; text-transform: uppercase; }
        .instructions { font-size: 11px; color: #111; line-height: 1.4; margin-bottom: 10px; }
        .instructions b { font-weight: 700; }
        table { width: 100%; border-collapse: collapse; table-layout: auto; page-break-inside: avoid; }
        th, td { border: 1.2px solid #666; padding: 3px 5px; font-size: 9px; line-height: 1.1; vertical-align: top; }
        thead th { background: #eef3ff !important; font-weight: 700; white-space: nowrap; text-align: center; vertical-align: middle; }
        thead th.date { text-align: center !important; vertical-align: middle !important; }
        thead th.wrap { white-space: normal; word-break: normal; hyphens: none; font-size: 8.5px; text-align: center; vertical-align: middle; }
        .col-yn { width: 3.5%; text-align: center; }
        .col-times { width: 6%; text-align: center; }
        tbody td { white-space: nowrap; }
        thead { display: table-header-group; }
        .name { width: 14%; }
        .email { width: 12%; }
        .phone { width: 9%; }
        .age { width: 4%; text-align: center; }
        .date { width: 7%; text-align: left; }
        .location { width: 14%; }
        /* Use US Legal paper in landscape; browsers that don't support 'legal' will fallback to the body width */
        @page { size: legal landscape; margin: 6mm; }
      </style>`;
    const header = `
      <thead>
        <tr>
          <th rowspan="2">Region</th>
          <th rowspan="2">Province</th>
          <th rowspan="2">City/Municipality</th>
          <th rowspan="2">Barangay</th>
          <th rowspan="2" class="name">Name</th>
          <th rowspan="2" class="age">Age</th>
          <th colspan="3" class="date">Birthday</th>
          <th rowspan="2">Sex Assigned at Birth</th>
          <th rowspan="2">Civil Status</th>
          <th rowspan="2">Youth Classification</th>
          <th rowspan="2">Age Group</th>
          <th rowspan="2" class="email">Email Address</th>
          <th rowspan="2" class="phone">Contact Number</th>
          <th rowspan="2" class="location">Home Address</th>
          <th rowspan="2">Highest Educational Attainment</th>
          <th rowspan="2">Work Status</th>
          <th rowspan="2" class="wrap col-yn">Reg. Voter<br/>(Y/N)</th>
          <th rowspan="2" class="wrap col-yn">Voted Last<br/>(Y/N)</th>
          <th rowspan="2" class="wrap col-yn">Attended KK<br/>(Y/N)</th>
          <th rowspan="2" class="wrap col-times">If yes,<br/>how many?</th>
        </tr>
        <tr>
          <th class="age date">M</th>
          <th class="age date">D</th>
          <th class="age date">Y</th>
        </tr>
      </thead>`;
    const rows = (responses || []).map((r) => {
      const region = r.region || r.addressRegion || '';
      const province = r.province || r.addressProvince || '';
      const city = r.cityMunicipality || r.city || r.municipality || r.addressCity || '';
      const barangay = r.location || r.barangay || '';
      const name = r.youthName || r.name || [r.lastName, r.firstName].filter(Boolean).join(', ') || '';
      const age = r.age ?? '';
      const birthday = r.birthDate || r.birthday || '';
      const d = birthday ? new Date(birthday) : null;
      const bMonth = d ? String(d.getMonth() + 1) : '';
      const bDay = d ? String(d.getDate()) : '';
      const bYear = d ? String(d.getFullYear()) : '';
      const sexAtBirth = r.sexAtBirth || r.sex_assigned_at_birth || r.sexAssignedAtBirth || r.sex || r.gender || '';
      const civilStatus = r.civilStatus || '';
      const classification = r.youthClassification || r.classification || r.classify || '';
      const ageGroup = r.youthAgeGroup || r.ageGroup || '';
      const email = r.email || '';
      const phone = r.phone || r.contactNumber || '';
      const homeAddress = r.homeAddress || r.address || [barangay, city, province].filter(Boolean).join(', ');
      const education = r.education || r.highestEducationalAttainment || '';
      const workStatus = r.workStatus || r.employmentStatus || '';
      const regVoter = r.registeredVoter !== undefined ? (r.registeredVoter ? 'Y' : 'N') : (r.isRegisteredVoter ? 'Y' : '');
      const votedLastRaw = (r.votedLastElection !== undefined ? r.votedLastElection : (r.voted_last_SK !== undefined ? r.voted_last_SK : undefined));
      const attendedRaw = (r.attendedKKAssembly !== undefined ? r.attendedKKAssembly : (r.attended_KK_assembly !== undefined ? r.attended_KK_assembly : undefined));
      const votedLast = votedLastRaw !== undefined ? (Boolean(votedLastRaw) ? 'Y' : 'N') : '';
      const attendedKK = attendedRaw !== undefined ? (Boolean(attendedRaw) ? 'Y' : 'N') : '';
      const attendanceCount = (r.kkAssemblyAttendanceCount ?? r.kkAssemblyCount ?? r.times_attended ?? '');
      return `
        <tr>
          <td>${region || '&nbsp;'}</td>
          <td>${province || '&nbsp;'}</td>
          <td>${city || '&nbsp;'}</td>
          <td>${barangay || '&nbsp;'}</td>
          <td class="name">${name || '&nbsp;'}</td>
          <td class="age">${age || '&nbsp;'}</td>
          <td class="age">${bMonth || '&nbsp;'}</td>
          <td class="age">${bDay || '&nbsp;'}</td>
          <td class="age">${bYear || '&nbsp;'}</td>
          <td>${sexAtBirth || '&nbsp;'}</td>
          <td>${civilStatus || '&nbsp;'}</td>
          <td>${classification || '&nbsp;'}</td>
          <td>${ageGroup || '&nbsp;'}</td>
          <td class="email">${email || '&nbsp;'}</td>
          <td class="phone">${phone || '&nbsp;'}</td>
          <td class="location">${homeAddress || '&nbsp;'}</td>
          <td>${education || '&nbsp;'}</td>
          <td>${workStatus || '&nbsp;'}</td>
          <td>${regVoter || '&nbsp;'}</td>
          <td>${votedLast || '&nbsp;'}</td>
          <td>${attendedKK || '&nbsp;'}</td>
          <td>${attendanceCount || '&nbsp;'}</td>
        </tr>`;
    }).join('');

    win.document.write(`
      <html>
        <head>
          <title>${title}</title>
          ${styles}
        </head>
        <body>
          <div class="instructions">
            <div><b>ANNEX 4</b></div>
            <div><b>Instructions:</b></div>
            <p>Dear SK Officials,</p>
            <p>Congratulations for being elected as primary movers in youth development in your locality.</p>
            <p>The fundamental purpose of youth profiling is to be able to come up with a complete list of all youth ages 15-30 years old in your respective barangay. The said data gathering also aim to come up with relevant interventions through programs and projects based on the profiles of the youth in the area and identified issues and recommendations.</p>
            <p>Please ensure that all youth in the barangay including yourselves are part of the list.</p>
            <p><b>Mabuhay ang Kabataang Pilipino!</b></p>
          </div>
          <h2>KATIPUNAN NG KABATAAN YOUTH PROFILE</h2>
          <table>
            ${header}
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  };

  const mainExport = useExport({
    exportFunction: async (format, style = null) => {
      try {
        const filteredResponses = getFilteredResponses();
        const validatedOnly = (filteredResponses || []).filter(r => (
          (r.status || r.validationStatus || '').toString().toLowerCase() === 'validated'
        ));
        if (format === 'csv') {
          const rows = buildBatchCsvRows(validatedOnly);
          downloadCsv(`${reportBatch?.batchName || 'survey-batch'}-responses.csv`, rows);
        } else if (format === 'pdf') {
          openBatchPrintPdf(`${reportBatch?.batchName || 'Survey Batch'} - Responses`, validatedOnly);
        } else if (format === 'xlsx' || format === 'excel') {
          const xml = buildResponsesExcelXml(validatedOnly);
          downloadExcel(`${reportBatch?.batchName || 'survey-batch'}-responses.xls`, xml);
        }
        return { success: true };
      } catch (error) {
        throw new Error(error.message || 'Failed to export batch data');
      }
    },
    onSuccess: () => showSuccessToast('Export completed', 'Batch report exported successfully'),
    onError: (error) => showErrorToast('Export failed', error.message)
  });

  // Helper function to get status color
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'validated':
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'rejected':
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'draft':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  // Helper function to format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  // Helper function to get response rate
  const getResponseRate = () => {
    if (!batchStatistics) return 0;
    const total = batchStatistics.totalResponses || 0;
    const target = batchStatistics.targetYouth || 0;
    return target > 0 ? Math.round((total / target) * 100) : 0;
  };

  // Helper function to get validation rate
  const getValidationRate = () => {
    if (!batchStatistics) return 0;
    const total = batchStatistics.totalResponses || 0;
    const validated = batchStatistics.validatedResponses || 0;
    return total > 0 ? Math.round((validated / total) * 100) : 0;
  };

  // Filter and sort responses
  const getFilteredResponses = () => {
    let filtered = [...responses];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(response => 
        (response.youthName || response.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (response.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (response.location || response.barangay || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter (normalize status/validationStatus)
    if (statusFilter !== 'all') {
      filtered = filtered.filter(response => {
        const s = (response.status || response.validationStatus || '').toString();
        return s === statusFilter;
      });
    }

    // Apply location filter (barangay)
    if (locationFilter !== 'all') {
      filtered = filtered.filter(response => {
        const loc = (response.location || response.barangay || '').toString();
        return loc === locationFilter;
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = (a.youthName || a.name || '').toLowerCase();
          bValue = (b.youthName || b.name || '').toLowerCase();
          break;
        case 'status':
          aValue = (a.status || '').toLowerCase();
          bValue = (b.status || '').toLowerCase();
          break;
        case 'location':
          aValue = (a.location || a.barangay || '').toLowerCase();
          bValue = (b.location || b.barangay || '').toLowerCase();
          break;
        case 'submittedDate':
        default:
          aValue = new Date(a.submittedDate || 0).getTime();
          bValue = new Date(b.submittedDate || 0).getTime();
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

  // Get unique locations for filter
  const getLocationOptions = () => {
    // Prefer complete master list if available
    if (Array.isArray(allBarangays) && allBarangays.length > 0) {
      return allBarangays.map(b => ({ value: b.barangayName || b.name || b.barangay_id || b.id, label: b.barangayName || b.name }))
        .filter(o => o.value && o.label);
    }
    const locations = [...new Set(responses.map(r => (r.location || r.barangay)).filter(Boolean))];
    return locations.map(location => ({ value: location, label: location }));
  };

  // Get unique statuses for filter
  const getStatusOptions = () => {
    const statuses = [...new Set(
      responses.map(r => (r.status || r.validationStatus)).filter(Boolean)
    )];
    return statuses.map(status => ({ value: status, label: status }));
  };

  // Render overview cards
  const renderOverviewCards = () => {
    const filtered = getFilteredResponses();
    const totalResponses = filtered.length || 0;
    const validatedResponses = filtered.filter(r => (r.status || r.validationStatus || '').toString().toLowerCase() === 'validated').length;
    const pendingResponses = filtered.filter(r => (r.status || r.validationStatus || '').toString().toLowerCase() === 'pending').length;
    const rejectedResponses = filtered.filter(r => (r.status || r.validationStatus || '').toString().toLowerCase() === 'rejected').length;
    const targetYouth = batchStatistics?.targetYouth || 0;
    const responseRate = totalResponses; // raw count for card usage
    const validationRate = totalResponses > 0 ? Math.round((validatedResponses / totalResponses) * 100) : 0;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Responses Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-3xl font-bold text-gray-900">{totalResponses}</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Total Responses</h3>
          <p className="text-gray-600 text-sm">Survey submissions received</p>
        </div>

        {/* Validated Responses Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-3xl font-bold text-gray-900">{validatedResponses}</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Validated</h3>
          <p className="text-gray-600 text-sm">Approved responses</p>
        </div>

        {/* Pending Responses Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <span className="text-3xl font-bold text-gray-900">{pendingResponses}</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Pending</h3>
          <p className="text-gray-600 text-sm">Awaiting validation</p>
        </div>

        {/* Response Rate Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Target className="w-6 h-6 text-purple-600" />
            </div>
            <span className="text-3xl font-bold text-gray-900">{responseRate}%</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Response Rate</h3>
          <p className="text-gray-600 text-sm">Target achievement</p>
        </div>
      </div>
    );
  };

  // Render status breakdown
  const renderStatusBreakdown = () => {
    const filtered = getFilteredResponses();
    const totalResponses = filtered.length || 0;
    const validatedResponses = filtered.filter(r => (r.status || r.validationStatus || '').toString().toLowerCase() === 'validated').length;
    const pendingResponses = filtered.filter(r => (r.status || r.validationStatus || '').toString().toLowerCase() === 'pending').length;
    const rejectedResponses = filtered.filter(r => (r.status || r.validationStatus || '').toString().toLowerCase() === 'rejected').length;

    const statusData = [
      {
        status: 'Validated',
        count: validatedResponses,
        percentage: totalResponses > 0 ? Math.round((validatedResponses / totalResponses) * 100) : 0,
        color: 'green',
        icon: <CheckCircle className="w-4 h-4 text-green-600" />
      },
      {
        status: 'Pending',
        count: pendingResponses,
        percentage: totalResponses > 0 ? Math.round((pendingResponses / totalResponses) * 100) : 0,
        color: 'yellow',
        icon: <Clock className="w-4 h-4 text-yellow-600" />
      },
      {
        status: 'Rejected',
        count: rejectedResponses,
        percentage: totalResponses > 0 ? Math.round((rejectedResponses / totalResponses) * 100) : 0,
        color: 'red',
        icon: <UserX className="w-4 h-4 text-red-600" />
      }
    ];

    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900 flex items-center">
            <PieChart className="w-6 h-6 mr-3 text-blue-600" />
            Response Status Breakdown
          </h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {statusData.map((status) => (
            <div key={status.status} className={`bg-${status.color}-50 border border-${status.color}-200 rounded-lg p-5`}>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-900 text-lg">{status.status}</h4>
                <div className={`w-8 h-8 bg-${status.color}-100 rounded-lg flex items-center justify-center`}>
                  {status.icon}
                </div>
              </div>
              
              <div className="space-y-3 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Count:</span>
                  <span className={`font-semibold text-${status.color}-600`}>{status.count}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Percentage:</span>
                  <span className={`font-semibold text-${status.color}-600`}>{status.percentage}%</span>
                </div>
              </div>
              
              {/* Progress bar */}
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`bg-${status.color}-500 h-2 rounded-full transition-all duration-500`}
                    style={{ width: `${status.percentage}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (isLoadingReportBatch) {
    return (
      <div className="space-y-5">
        <HeaderMainContent
          title="Survey Batch Report"
          description="Loading batch report..."
        />
        <LoadingSpinner 
          variant="spinner"
          message="Loading batch data..." 
          size="lg"
          color="blue"
          height="h-96"
        />
      </div>
    );
  }

  if (!reportBatch) {
    return (
      <div className="space-y-5">
        <HeaderMainContent
          title="Survey Batch Report"
          description="Batch not found"
        />
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Batch Not Found</h3>
          <p className="text-gray-600 max-w-md mx-auto mb-6">
            The requested survey batch could not be found or you don't have permission to view it.
          </p>
          <button
            onClick={() => navigate('/admin/survey/batches')}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Survey Batches
          </button>
        </div>
      </div>
    );
  }

  const filteredResponses = getFilteredResponses();

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/admin/survey/batches')}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </button>
              <div className="h-8 w-px bg-gray-300"></div>
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <h1 className="text-xl font-bold text-gray-900">
                    {reportBatch ? `${reportBatch.batchName} Report` : 'Survey Batch Report'}
                  </h1>
                  {reportBatch && (
                    <Status 
                      status={reportBatch.status === 'active' ? 'active' : reportBatch.status === 'closed' ? 'closed' : 'draft'}
                      size="sm"
                      variant="pill"
                    />
                  )}
                  {reportBatch && (
                    <div className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-md border border-gray-200">
                      ID: {reportBatch.batchId}
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  {reportBatch && reportBatch.startDate && reportBatch.endDate && (
                    <>
                      <div className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        <span>
                          {formatDate(reportBatch.startDate)} - {formatDate(reportBatch.endDate)}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <FileText className="w-3 h-3 mr-1" />
                        <span>Survey Batch Report</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

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
                id="responses" 
                label="Responses" 
                shortLabel="Responses"
                count={responses.length}
                color="green"
              />
              <Tab 
                id="analytics" 
                label="Analytics" 
                shortLabel="Analytics"
                color="purple"
              />
              <Tab 
                id="recommendations" 
                label="Recommendations" 
                shortLabel="Recs"
                color="yellow"
              />
            </TabContainer>

            {/* Overview Controls - location (barangay) filter + export, mirroring SKTermReport */}
            {viewMode === 'overview' && (
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 overflow-x-auto pb-2 md:pb-0">
                    <div className="flex items-center space-x-3 min-w-max">
                      <div className="flex items-center">
                        <label className="sr-only" htmlFor="overviewLocationFilter">Location</label>
                        <select
                          id="overviewLocationFilter"
                          value={locationFilter}
                          onChange={(e) => { setLocationFilter(e.target.value); setCurrentPage(1); }}
                          className="ml-0 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        >
                          <option value="all">All Locations</option>
                          {getLocationOptions().map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
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
            )}

            {/* Controls */}
            {viewMode === 'responses' && (
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 overflow-x-auto pb-2 md:pb-0">
                  <div className="flex items-center space-x-3 min-w-max">
                    {/* Search Bar */}
                    <div className="flex-shrink-0">
                      <SearchBar
                        value={searchQuery}
                        onChange={setSearchQuery}
                        placeholder="Search responses..." 
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
                      className={`inline-flex items-center border rounded-lg font-medium transition-all duration-200 px-2 py-1.5 sm:px-3 sm:py-2 whitespace-nowrap flex-shrink-0 ${
                        hasActiveFilters ? 'border-blue-500 text-blue-600 bg-blue-50' : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Filter</span>
                      <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1" />
                      {hasActiveFilters && (
                        <div className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full border border-blue-200">{activeFilterCount}</div>
                      )}
                    </button>

                    {/* Sort Button */}
                    <button 
                      ref={sortModal.triggerRef}
                      onClick={sortModal.toggleModal}
                      className={`inline-flex items-center border rounded-lg font-medium transition-all duration-200 px-2 py-1.5 sm:px-3 sm:py-2 whitespace-nowrap flex-shrink-0 ${
                        !(sortBy === 'submittedDate' && sortOrder === 'desc') ? 'border-blue-500 text-blue-600 bg-blue-50' : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <ArrowUpDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Sort</span>
                      <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1" />
                      {!(sortBy === 'submittedDate' && sortOrder === 'desc') && (
                        <div className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full border border-blue-200">{sortOrder === 'asc' ? '↑' : '↓'}</div>
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center space-x-3 flex-shrink-0">
                  <div className="text-sm text-gray-600">
                    {filteredResponses.length} response{filteredResponses.length !== 1 ? 's' : ''}
                  </div>
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

              {/* Sort Modal */}
              <SortModal
                isOpen={sortModal.isOpen}
                onClose={sortModal.closeModal}
                triggerRef={sortModal.triggerRef}
                title="Sort Options"
                sortFields={[
                  { value: 'submittedDate', label: 'Submitted Date' },
                  { value: 'name', label: 'Youth Name' },
                  { value: 'status', label: 'Status' },
                  { value: 'location', label: 'Location' }
                ]}
                sortBy={sortModal.sortBy}
                sortOrder={sortModal.sortOrder}
                onSortChange={sortModal.updateSort}
                onReset={sortModal.resetSort}
                defaultSortBy="submittedDate"
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
                    id: 'status',
                    label: 'Status',
                    type: 'select',
                    placeholder: 'All Statuses',
                    options: getStatusOptions(),
                    description: 'Filter by response status'
                  },
                  {
                    id: 'location',
                    label: 'Barangay',
                    type: 'select',
                    placeholder: 'All Barangays',
                    options: getLocationOptions(),
                    description: 'Filter by barangay'
                  },
                  {
                    // Removed generic Location filter per request
                  }
                ]}
                values={filterValues}
                onChange={setFilterValues}
                onApply={(appliedValues) => {
                  setStatusFilter(appliedValues.status || 'all');
                  setLocationFilter(appliedValues.location || 'all');
                  setCurrentPage(1);
                }}
                onClear={(clearedValues) => {
                  setStatusFilter('all');
                  setLocationFilter('all');
                  setCurrentPage(1);
                }}
                applyButtonText="Apply Filters"
                clearButtonText="Clear All"
              />
            </div>
            )}

            {/* Analytics controls - show barangay filter */}
            {viewMode === 'analytics' && (
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 overflow-x-auto pb-2 md:pb-0">
                    <div className="flex items-center space-x-3 min-w-max">
                      <div className="flex items-center">
                        <label className="sr-only" htmlFor="analyticsBarangayFilter">Barangay</label>
                        <select
                          id="analyticsBarangayFilter"
                          value={locationFilter}
                          onChange={(e) => { setLocationFilter(e.target.value); setCurrentPage(1); }}
                          className="ml-0 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        >
                          <option value="all">All Barangays</option>
                          {getLocationOptions().map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 flex-shrink-0">
                    <div className="text-sm text-gray-600">
                      {getFilteredResponses().length} response{getFilteredResponses().length !== 1 ? 's' : ''}
                    </div>
                    <ExportButton
                      formats={["csv","xlsx","pdf"]}
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
            )}

            {/* Recommendations Controls - filter by barangay/location and export */}
            {viewMode === 'recommendations' && (
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 overflow-x-auto pb-2 md:pb-0">
                    <div className="flex items-center space-x-3 min-w-max">
                      <div className="flex items-center">
                        <label className="sr-only" htmlFor="recLocationFilter">Location</label>
                        <select
                          id="recLocationFilter"
                          value={locationFilter}
                          onChange={(e) => { setLocationFilter(e.target.value); setCurrentPage(1); }}
                          className="ml-0 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        >
                          <option value="all">All Locations</option>
                          {getLocationOptions().map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 flex-shrink-0">
                    <div className="text-sm text-gray-600">
                      {getFilteredResponses().length} response{getFilteredResponses().length !== 1 ? 's' : ''}
                    </div>
                    <ExportButton
                      formats={['csv','xlsx','pdf']}
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
            )}

            {/* Content Area */}
            {isLoadingReportBatch || tabLoading || isLoadingResponses ? (
              <LoadingSpinner 
                variant="spinner"
                message="Loading data..." 
                size="md"
                color="blue"
                height="h-64"
              />
            ) : (
              <div className="p-6">
                {/* Overview Tab */}
                {viewMode === 'overview' && (
                  <>
                    {renderOverviewCards()}
                    {renderStatusBreakdown()}
                  </>
                )}

                {/* Responses Tab */}
                {viewMode === 'responses' && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Region</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Province</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">City/Municipality</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Barangay</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Age</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Birthday (MM/DD/YYYY)</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Sex Assigned at birth</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Civil Status</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Youth Classification</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Age Group</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email Address</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact Number</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Home Address</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Highest Educational Attainment</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Work Status</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Registered Voter? (Y/N)</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Voted Last Election? (Y/N)</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Attended KK Assembly? (Y/N)</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">If yes, how many times?</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredResponses.length === 0 ? (
                          <tr>
                            <td colSpan="20" className="px-4 py-16 text-center">
                              <div className="flex flex-col items-center">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                  <FileText className="w-8 h-8 text-gray-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Responses Found</h3>
                                <p className="text-gray-600">
                                  {responses.length === 0 
                                    ? "This survey batch hasn't received any responses yet."
                                    : "No responses match your current filters."
                                  }
                                </p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          filteredResponses.map((r, idx) => {
                            const region = r.region || r.addressRegion || '';
                            const province = r.province || r.addressProvince || '';
                            const city = r.cityMunicipality || r.city || r.municipality || r.addressCity || '';
                            const barangay = r.location || r.barangay || '';
                            const status = (r.status || r.validationStatus || '').toLowerCase();
                            const statusLabel = status ? status.charAt(0).toUpperCase() + status.slice(1) : '';
                            const name = r.youthName || r.name || [r.lastName, r.firstName].filter(Boolean).join(', ') || 'N/A';
                            const age = r.age ?? '';
                            const birthday = r.birthDate || r.birthday || '';
                            const sexAtBirth = r.sexAtBirth || r.sex_assigned_at_birth || r.sexAssignedAtBirth || r.sex || r.gender || '';
                            const civilStatus = r.civilStatus || '';
                            const classification = r.youthClassification || r.classification || r.classify || '';
                            const ageGroup = r.youthAgeGroup || r.ageGroup || '';
                            const email = r.email || '';
                            const phone = r.phone || r.contactNumber || '';
                            const homeAddress = r.homeAddress || r.address || [barangay, city, province].filter(Boolean).join(', ');
                            const education = r.education || r.highestEducationalAttainment || '';
                            const workStatus = r.workStatus || r.employmentStatus || '';
                            const registeredVoter = r.registeredVoter !== undefined ? (r.registeredVoter ? 'Y' : 'N') : (r.isRegisteredVoter ? 'Y' : '');
                            const votedLastRaw = (r.votedLastElection !== undefined ? r.votedLastElection : (r.voted_last_SK !== undefined ? r.voted_last_SK : undefined));
                            const attendedRaw = (r.attendedKKAssembly !== undefined ? r.attendedKKAssembly : (r.attended_KK_assembly !== undefined ? r.attended_KK_assembly : undefined));
                            const votedLast = votedLastRaw !== undefined ? (Boolean(votedLastRaw) ? 'Y' : 'N') : '';
                            const attendedKK = attendedRaw !== undefined ? (Boolean(attendedRaw) ? 'Y' : 'N') : '';
                            const attendanceCount = (r.kkAssemblyAttendanceCount ?? r.kkAssemblyCount ?? r.times_attended ?? '');
                            const bdayStr = birthday ? new Date(birthday).toLocaleDateString('en-US') : '';
                            return (
                              <tr key={r.responseId || r.id || idx} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                  {status ? (
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-medium ${getStatusColor(status)}`}>
                                      {statusLabel}
                                    </span>
                                  ) : 'N/A'}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{region}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{province}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{city}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{barangay}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{name}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-700">{age}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{bdayStr}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-700">{sexAtBirth}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-700">{civilStatus}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{classification}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-700">{ageGroup}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{email || 'N/A'}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{phone || 'N/A'}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{homeAddress}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{education}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{workStatus}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-700">{registeredVoter}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-700">{votedLast}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-700">{attendedKK}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-700">{attendanceCount}</td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Analytics Tab */}
                {viewMode === 'analytics' && (
                  <div className="space-y-8">
                    {(() => {
                      const src = getFilteredResponses();
                      const total = src.length || 1;

                      const distribution = (label, items) => (
                        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                          <h4 className="text-lg font-semibold text-gray-900 mb-4">{label}</h4>
                          <div className="space-y-3">
                            {items.map((i) => {
                              const count = i.count;
                              const pct = Math.round((count / (src.length || 1)) * 100);
                              return (
                                <div key={i.label} className="">
                                  <div className="flex items-center justify-between text-sm mb-1">
                                    <span className="text-gray-700">{i.label}</span>
                                    <span className="text-gray-800 font-medium">{count} ({pct}%)</span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${pct}%` }}></div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );

                      const countBy = (getter, values) => {
                        const map = new Map();
                        (values || []).forEach(v => map.set(v, 0));
                        src.forEach(r => {
                          const v = getter(r);
                          const key = (v ?? '').toString();
                          if (!map.has(key)) map.set(key, 0);
                          map.set(key, (map.get(key) || 0) + 1);
                        });
                        return Array.from(map.entries())
                          .filter(([k]) => k !== '')
                          .map(([k, c]) => ({ label: k, count: c }));
                      };

                      const civ = countBy(r => r.civilStatus, [
                        'Single','Married','Widowed','Divorced','Separated','Annulled','Unknown','Live-in'
                      ]);
                      const youthClass = countBy(r => (r.youthClassification || r.classification), [
                        'In School Youth','Out of School Youth','Working Youth','Youth w/Specific Needs'
                      ]);
                      const ageGroup = countBy(r => (r.youthAgeGroup || r.ageGroup), [
                        'Child Youth (15-17 yrs old)','Core Youth (18-24 yrs old)','Young Adult (15-30 yrs old)'
                      ]);
                      const education = countBy(r => (r.education || r.highestEducationalAttainment), [
                        'Elementary Level','Elementary Grad','High School Level','High School Grad','Vocational Grad','College Level','College Grad','Masters Level','Masters Grad','Doctorate Level','Doctorate Graduate'
                      ]);
                      const workStatus = countBy(r => (r.workStatus || r.employmentStatus), [
                        'Employed','Unemployed','Self-Employed','Currently looking for a Job','Not interested looking for a job'
                      ]);
                      const skVoter = countBy(r => ((r.registeredVoter !== undefined ? r.registeredVoter : r.isRegisteredVoter) ? 'Yes' : 'No'), ['Yes','No']);
                      const votedLast = countBy(r => (((r.votedLastElection !== undefined ? r.votedLastElection : r.voted_last_SK) ? 'Yes' : 'No')), ['Yes','No']);
                      const attended = countBy(r => (((r.attendedKKAssembly !== undefined ? r.attendedKKAssembly : r.attended_KK_assembly) ? 'Yes' : 'No')), ['Yes','No']);
                      const times = countBy(r => (r.kkAssemblyAttendanceCount || r.kkAssemblyCount || ''), ['1-2 Times','3-4 Times','5 and above']);

                      return (
                        <>
                          {distribution('Civil Status', civ)}
                          {distribution('Youth Classification', youthClass)}
                          {distribution('Youth Age Group', ageGroup)}
                          {distribution('Educational Background', education)}
                          {distribution('Work Status', workStatus)}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {distribution('Registered SK Voter', skVoter)}
                            {distribution('Voted Last SK Election', votedLast)}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {distribution('Attended KK Assembly', attended)}
                            {distribution('If Yes, How Many Times?', times)}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}

                {/* Recommendations Tab */}
                {viewMode === 'recommendations' && (
                  <div className="space-y-6">
                    {(() => {
                      // Build simple rules-based recommendations
                      const source = getFilteredResponses();
                      const recs = [];
                      const total = source.length;
                      const validated = source.filter(r => (r.status || '').toLowerCase() === 'validated').length;
                      const rejected = source.filter(r => (r.status || '').toLowerCase() === 'rejected').length;
                      const pending = source.filter(r => (r.status || '').toLowerCase() === 'pending').length;

                      const byBarangay = {};
                      source.forEach(r => {
                        const b = r.location || r.barangay || 'Unknown';
                        if (!byBarangay[b]) byBarangay[b] = { total: 0, validated: 0, rejected: 0, pending: 0 };
                        byBarangay[b].total++;
                        const s = (r.status || '').toLowerCase();
                        if (s === 'validated') byBarangay[b].validated++;
                        else if (s === 'rejected') byBarangay[b].rejected++;
                        else if (s === 'pending') byBarangay[b].pending++;
                      });

                      // Global recs
                      if (pending / (total || 1) > 0.3) {
                        recs.push({
                          title: 'Accelerate Validation Workflow',
                          priority: 'High',
                          rationale: `${pending} pending out of ${total} responses (>30%). Streamline reviewer assignments and automate reminders.`
                        });
                      }
                      if (rejected > 0) {
                        recs.push({
                          title: 'Targeted Re-submission Guidance',
                          priority: 'Medium',
                          rationale: `${rejected} responses were rejected. Provide clear guidance and sample answers to improve acceptance rate.`
                        });
                      }
                      if (validated / (total || 1) < 0.5 && total > 20) {
                        recs.push({
                          title: 'Boost Participation Campaign',
                          priority: 'High',
                          rationale: `Only ${validated}/${total} validated. Consider social media pushes and barangay ambassadors to increase participation quality.`
                        });
                      }

                      // Barangay-specific recs
                      Object.entries(byBarangay).forEach(([b, s]) => {
                        if (locationFilter !== 'all' && b !== locationFilter) return;
                        if (s.total >= 10 && s.pending / s.total > 0.4) {
                          recs.push({
                            title: `Barangay ${b}: On-site Validation Clinic`,
                            priority: 'High',
                            rationale: `${s.pending}/${s.total} pending. Set up a local validation day with LYDO staff support.`
                          });
                        }
                        if (s.rejected >= 5) {
                          recs.push({
                            title: `Barangay ${b}: Orientation Session`,
                            priority: 'Medium',
                            rationale: `${s.rejected} rejected responses. Run a short orientation on survey requirements and proper submission.`
                          });
                        }
                        if (s.validated / (s.total || 1) >= 0.7) {
                          recs.push({
                            title: `Barangay ${b}: Program Rollout Readiness`,
                            priority: 'Low',
                            rationale: `Validation is strong (${s.validated}/${s.total}). Begin planning program implementation logistics.`
                          });
                        }
                      });

                      if (recs.length === 0) {
                        return (
                          <div className="text-center py-16">
                            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                              <FileText className="w-10 h-10 text-gray-400" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">No recommendations yet</h3>
                            <p className="text-gray-600 max-w-md mx-auto">Not enough data to generate recommendations. Collect more responses or adjust filters.</p>
                          </div>
                        );
                      }

                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {recs.map((rec, idx) => (
                            <div key={idx} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="text-lg font-semibold text-gray-900">{rec.title}</h4>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${rec.priority === 'High' ? 'bg-red-50 text-red-700 border-red-200' : rec.priority === 'Medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-green-50 text-green-700 border-green-200'}`}>{rec.priority} Priority</span>
                              </div>
                              <p className="text-sm text-gray-700">{rec.rationale}</p>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}

            {/* Pagination */}
            {!isLoadingReportBatch && !tabLoading && viewMode === 'responses' && filteredResponses.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalItems={filteredResponses.length}
                itemsPerPage={itemsPerPage}
                onPageChange={pagination.handlePageChange}
                onItemsPerPageChange={pagination.handleItemsPerPageChange}
                itemName="response"
                itemNamePlural="responses"
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
    </div>
  );
};

export default SurveyBatchReport;