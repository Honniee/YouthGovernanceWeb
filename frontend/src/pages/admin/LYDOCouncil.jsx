import React, { useState, useRef, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import { createPortal } from 'react-dom';
import { 
  Search, 
  Filter,
  Save, 
  Trash2,
  X,
  Plus,
  UserPlus,
  ChevronDown,
  Image as ImageIcon,
  Award,
  BadgeCheck,
  Users,
  Eye,
  Edit,
  MoreHorizontal,
  Grid,
  List
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
  FilterModal,
  Pagination, 
  usePagination,
  LoadingSpinner,
  CollapsibleForm,
  DataTable,
  ActionMenu,
  Status,
  BulkActionsBar,
  ExportButton,
  useBulkExport,
  useExport
} from '../../components/portal_main_content';
import { ToastContainer, showErrorToast, showSuccessToast, ConfirmationModal } from '../../components/universal';
import { authService } from '../../services/auth.js';
import useConfirmation from '../../hooks/useConfirmation';
import councilService, { logExport } from '../../services/councilService.js';

const LYDOCouncil = () => {
  // Tab state
  const { activeTab, setActiveTab } = useTabState('active');
  
  // View mode and bulk selection
  const [viewMode, setViewMode] = useState('grid');
  const [selectedItems, setSelectedItems] = useState([]);
  const [tabSelections, setTabSelections] = useState({ members: [], active: [], inactive: [], roles: [] });
  const prevActiveTabRef = useRef('active');
  
  // Data state
  const [roles, setRoles] = useState([]);
  const [members, setMembers] = useState([]);
  const [allMembers, setAllMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pageHero, setPageHero] = useState({ hero_url_1: '', hero_url_2: '', hero_url_3: '' });
  const [heroErrors, setHeroErrors] = useState({ hero_url_1: '', hero_url_2: '', hero_url_3: '' });
  const [isSavingHero, setIsSavingHero] = useState(false);
  const [heroDirty, setHeroDirty] = useState(false);
  const [heroJustSaved, setHeroJustSaved] = useState(false);
  const [heroLoadStatus, setHeroLoadStatus] = useState({ 1: null, 2: null, 3: null });
  // Left-side Page Settings shell state (local only for now)
  const [pageSettings, setPageSettings] = useState({
    defaultPageSize: 9,
    lastUpdatedBy: '—',
    lastUpdatedAt: ''
  });
  
  // Form states
  const [roleForm, setRoleForm] = useState({ role_name: '', role_description: '' });
  const [memberForm, setMemberForm] = useState({
    role_id: '',
    member_name: '',
    is_active: true
  });
  const [editingRoleId, setEditingRoleId] = useState(null);
  const [editingMemberId, setEditingMemberId] = useState(null);
  
  // Collapse states
  const [roleFormCollapsed, setRoleFormCollapsed] = useState(true);
  const [memberFormCollapsed, setMemberFormCollapsed] = useState(true);
  const [heroFormCollapsed, setHeroFormCollapsed] = useState(true);
  // Hero upload state (shared cropper like AdminProfile)
  const [heroUploadIdx, setHeroUploadIdx] = useState(null); // 1|2|3
  const [heroPreview, setHeroPreview] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  // Build absolute URL for previews (mirrors AdminProfile Avatar logic)
  const getFileUrl = (p) => {
    if (!p) return '';
    if (/^https?:\/\//i.test(p)) return p;
    let base = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/?api\/?$/, '');
    if (!base) {
      if (window.location && /localhost|127\.0\.0\.1/.test(window.location.hostname)) {
        base = 'http://localhost:3001';
      }
    }
    return `${base}${p}`;
  };
  
  // Search, filter and sort
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const sortModal = useSortModal(sortBy, sortOrder);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterValues, setFilterValues] = useState({ roleId: '', activeOnly: '' });
  const filterTriggerRef = useRef(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const pagination = usePagination({
    initialPage: currentPage,
    initialItemsPerPage: itemsPerPage,
    totalItems: members.length,
    onPageChange: setCurrentPage,
    onItemsPerPageChange: setItemsPerPage
  });
  
  // Confirmation modal
  const confirmation = useConfirmation();
  // Bulk operations state
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkAction, setBulkAction] = useState(''); // 'activate' | 'deactivate' | 'delete'
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  
  // Load data
  const loadRoles = async () => {
    setLoading(true);
    try {
      const data = await councilService.getCouncilRoles();
      setRoles(data);
    } catch (error) {
      showErrorToast('Load Error', 'Failed to load roles');
    } finally {
      setLoading(false);
    }
  };
  
  const loadMembers = async () => {
    setLoading(true);
    try {
      const activeData = await councilService.getCouncilMembers();
      setMembers(activeData);
      
      const allData = await councilService.getAllCouncilMembers();
      setAllMembers(allData);
    } catch (error) {
      showErrorToast('Load Error', 'Failed to load members');
    } finally {
      setLoading(false);
    }
  };
  
  const loadPageHero = async () => {
    try {
      const page = await councilService.getCouncilPage();
      setPageHero({
        hero_url_1: page?.hero_url_1 || '',
        hero_url_2: page?.hero_url_2 || '',
        hero_url_3: page?.hero_url_3 || ''
      });
      setHeroErrors({ hero_url_1: '', hero_url_2: '', hero_url_3: '' });
      setHeroDirty(false);
      setHeroLoadStatus({ 1: null, 2: null, 3: null });
    } catch (error) {
      console.error('Failed to load page hero:', error);
    }
  };
  
  useEffect(() => {
    loadRoles();
    loadMembers();
    loadPageHero();
  }, []);

  // Persist selections per tab; isolate selection to the active tab only
  useEffect(() => {
    // Save current tab's selections under previous tab key
    const prevTab = prevActiveTabRef.current;
    setTabSelections(prev => ({ ...prev, [prevTab]: selectedItems }));

    // Load selections for new active tab (or empty if none yet)
    setSelectedItems(tabSelections[activeTab] || []);

    // Update previous tab ref
    prevActiveTabRef.current = activeTab;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);
  
  // Sync sort modal
  useEffect(() => {
    setSortBy(sortModal.sortBy);
    setSortOrder(sortModal.sortOrder);
  }, [sortModal.sortBy, sortModal.sortOrder]);
  
  // Handle role form
  const handleRoleChange = (e) => {
    const { name, value } = e.target;
    setRoleForm(prev => ({ ...prev, [name]: value }));
  };
  
  const handleRoleEdit = (role) => {
    setEditingRoleId(role.id);
    setRoleForm({
      role_name: role.role_name || '',
      role_description: role.role_description || ''
    });
    setRoleFormCollapsed(false);
  };
  
  const handleRoleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingRoleId) {
        const confirmed = await confirmation.showConfirmation({
          title: 'Update Role',
          message: `Save changes to role \"${roleForm.role_name || ''}\"?`,
          confirmText: 'Update',
          cancelText: 'Cancel',
          variant: 'default'
        });
        if (!confirmed) return;
        try {
          confirmation.setLoading(true);
          await councilService.updateRole(editingRoleId, roleForm);
          showSuccessToast('Role updated successfully');
        } finally {
          confirmation.hideConfirmation();
        }
      } else {
        const confirmed = await confirmation.showConfirmation({
          title: 'Create Role',
          message: `Create new role \"${roleForm.role_name || ''}\"?`,
          confirmText: 'Create',
          cancelText: 'Cancel',
          variant: 'success'
        });
        if (!confirmed) return;
        try {
          confirmation.setLoading(true);
          await councilService.createRole(roleForm);
          showSuccessToast('Role created successfully');
        } finally {
          confirmation.hideConfirmation();
        }
      }
      setRoleForm({ role_name: '', role_description: '' });
      setEditingRoleId(null);
      setRoleFormCollapsed(true);
      await loadRoles();
    } catch (error) {
      showErrorToast('Save Failed', error.message);
    }
  };
  
  const handleRoleDelete = async (id) => {
    const confirmed = await confirmation.confirmDelete('this role');
    if (!confirmed) return;
    
    try {
      confirmation.setLoading(true);
      await councilService.deleteRole(id);
      showSuccessToast('Role deleted successfully');
      await loadRoles();
      await loadMembers(); // Reload members in case deleted role was referenced
    } catch (error) {
      showErrorToast('Delete Failed', error.message);
    } finally {
      confirmation.hideConfirmation();
    }
  };
  
  const handleRoleReset = () => {
    setRoleForm({ role_name: '', role_description: '' });
    setEditingRoleId(null);
  };
  
  // Handle member form
  const handleMemberChange = (e) => {
    const { name, value, type, checked } = e.target;
    setMemberForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };
  
  const handleMemberEdit = (member) => {
    setEditingMemberId(member.id);
    setMemberForm({
      role_id: member.role_id || '',
      member_name: member.name || '',
      is_active: member.is_active ?? true
    });
    setMemberFormCollapsed(false);
  };
  
  const handleMemberSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingMemberId) {
        // Ask for confirmation before saving edits (custom update modal)
        const confirmed = await confirmation.showConfirmation({
          title: 'Update Member',
          message: `Save changes to ${memberForm.member_name || 'this member'}?`,
          confirmText: 'Update',
          cancelText: 'Cancel',
          variant: 'default'
        });
        if (!confirmed) return;
        try {
          confirmation.setLoading(true);
          await councilService.updateMember(editingMemberId, memberForm);
          showSuccessToast('Member updated successfully');
        } finally {
          confirmation.hideConfirmation();
        }
      } else {
        await councilService.createMember(memberForm);
        showSuccessToast('Member created successfully');
      }
      setMemberForm({ role_id: '', member_name: '', is_active: true });
      setEditingMemberId(null);
      setMemberFormCollapsed(true);
      await loadMembers();
    } catch (error) {
      showErrorToast('Save Failed', error.message);
    }
  };
  
  const handleMemberDelete = async (id) => {
    const confirmed = await confirmation.confirmDelete('this member');
    if (!confirmed) return;
    
    try {
      confirmation.setLoading(true);
      await councilService.deleteMember(id);
      showSuccessToast('Member deleted successfully');
      await loadMembers();
    } catch (error) {
      showErrorToast('Delete Failed', error.message);
    } finally {
      confirmation.hideConfirmation();
    }
  };

  // Bulk operation handler (sequential with feedback)
  const handleBulkOperation = async () => {
    if (!bulkAction || selectedItems.length === 0) {
      showErrorToast('Selection Required', 'Choose an action and select at least one member');
      return;
    }
    // Ask for confirmation using global confirmation modal
    // Close the bulk modal so it doesn't cover the confirmation modal
    setShowBulkModal(false);
    let confirmed = false;
    if (bulkAction === 'delete') {
      confirmed = await confirmation.confirmDelete(
        `${selectedItems.length} selected member${selectedItems.length>1?'s':''}`
      );
    } else if (bulkAction === 'activate') {
      confirmed = await confirmation.confirmActivate(
        `${selectedItems.length} selected member${selectedItems.length>1?'s':''}`
      );
    } else if (bulkAction === 'deactivate') {
      confirmed = await confirmation.confirmDeactivate(
        `${selectedItems.length} selected member${selectedItems.length>1?'s':''}`
      );
    }
    if (!confirmed) {
      // Reopen the bulk modal so the user can change action or cancel
      setShowBulkModal(true);
      return;
    }
    // Show loading state on the confirmation modal while processing
    confirmation.setLoading(true);
    setIsBulkProcessing(true);
    try {
      // Use bulk endpoint for proper logging
      const response = await councilService.bulkUpdateMembers(selectedItems, bulkAction);
      if (response.success) {
        showSuccessToast('Bulk Action', `Completed ${bulkAction} for ${response.processed} member(s)`);
        if (response.errors && response.errors.length > 0) {
          console.warn('Some items failed:', response.errors);
        }
      } else {
        throw new Error(response.message || 'Bulk operation failed');
      }
      setSelectedItems([]);
      await loadMembers();
    } catch (e) {
      showErrorToast('Bulk Failed', e.message || 'Some items may not have updated');
    } finally {
      // Ensure the confirmation modal closes regardless of outcome
      confirmation.hideConfirmation();
      setIsBulkProcessing(false);
      setBulkAction('');
      setShowBulkModal(false);
    }
  };
  
  const handleMemberReset = () => {
    setMemberForm({ role_id: '', member_name: '', is_active: true });
    setEditingMemberId(null);
  };
  
  // Handle hero images
  const isValidHeroUrl = (val) => {
    if (!val) return true; // empty allowed
    if (val.startsWith('/')) return true; // relative API file path
    try {
      const u = new URL(val);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const setHeroField = (key, value) => {
    setPageHero(prev => ({ ...prev, [key]: value }));
    setHeroDirty(true);
    setHeroJustSaved(false);
    setHeroErrors(prev => ({ ...prev, [key]: isValidHeroUrl(value) ? '' : 'Enter a valid URL (http/https) or a path starting with /' }));
  };

  const handleHeroSubmit = async (e) => {
    e.preventDefault();
    // block submit if invalid
    const hasErrors = Object.values(heroErrors).some(Boolean) ||
      !isValidHeroUrl(pageHero.hero_url_1) ||
      !isValidHeroUrl(pageHero.hero_url_2) ||
      !isValidHeroUrl(pageHero.hero_url_3);
    if (hasErrors) {
      showErrorToast('Validation', 'Fix invalid hero URLs before saving');
      return;
    }
    try {
      const confirmed = await confirmation.showConfirmation({
        title: 'Update Page Hero Images',
        message: 'Save changes to the council page hero images?',
        confirmText: 'Save',
        cancelText: 'Cancel',
        variant: 'default'
      });
      if (!confirmed) return;
      confirmation.setLoading(true);
      setIsSavingHero(true);
      await councilService.updateCouncilPage(pageHero);
      showSuccessToast('Hero images updated successfully');
      setHeroFormCollapsed(true);
      setHeroDirty(false);
      setHeroJustSaved(true);
    } catch (error) {
      showErrorToast('Update Failed', error.message);
    } finally {
      confirmation.hideConfirmation();
      setIsSavingHero(false);
    }
  };

  const handleHeroRemove = async (idx) => {
    const key = idx === 1 ? 'hero_url_1' : idx === 2 ? 'hero_url_2' : 'hero_url_3';
    const next = { ...pageHero, [key]: '' };
    setPageHero(next);
    try {
      const confirmed = await confirmation.confirmDelete(`Hero Image ${idx}`);
      if (!confirmed) { setPageHero(pageHero); return; }
      confirmation.setLoading(true);
      await councilService.updateCouncilPage({
        hero_url_1: key === 'hero_url_1' ? '' : pageHero.hero_url_1 || null,
        hero_url_2: key === 'hero_url_2' ? '' : pageHero.hero_url_2 || null,
        hero_url_3: key === 'hero_url_3' ? '' : pageHero.hero_url_3 || null
      });
      showSuccessToast('Hero image removed');
      setHeroErrors(prev => ({ ...prev, [key]: '' }));
      setHeroDirty(false);
      setHeroJustSaved(true);
    } catch (e) {
      showErrorToast('Remove failed', e.message || 'Try again');
    } finally {
      confirmation.hideConfirmation();
    }
  };

  // Cropper helpers (mirrors AdminProfile flow)
  const onCropComplete = (_, croppedPixels) => setCroppedAreaPixels(croppedPixels);
  const getCroppedBlob = (image, area) => new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = area.width;
    canvas.height = area.height;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, area.width, area.height);
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.9);
    };
    img.src = URL.createObjectURL(image);
  });

  const handleHeroFileChange = (idx, e) => {
    const inputEl = e.target;
    const file = inputEl.files?.[0];
    if (!file) return;
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      showErrorToast('Invalid file', 'Use JPG/PNG/WEBP');
      // reset input so selecting the same file again triggers change
      try { inputEl.value = ''; } catch {}
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      showErrorToast('Too large', 'Max 3 MB');
      try { inputEl.value = ''; } catch {}
      return;
    }
    setHeroUploadIdx(idx);
    setSelectedFile(file);
    setHeroPreview(URL.createObjectURL(file));
    setCropOpen(true);
    // reset input so user can reselect the same file if needed
    try { inputEl.value = ''; } catch {}
  };

  const handleHeroCropSave = async () => {
    try {
      if (!selectedFile || !croppedAreaPixels || !heroUploadIdx) return;
      setIsUploading(true);
      setUploadProgress(0);
      const blob = await getCroppedBlob(selectedFile, croppedAreaPixels);
      const file = new File([blob], `hero_${heroUploadIdx}.jpg`, { type: 'image/jpeg' });
      // Upload directly to council endpoint (announcement-like flow)
      const res = await councilService.uploadCouncilHero(heroUploadIdx, file);
      if (res?.success && res.url) {
        const key = heroUploadIdx === 1 ? 'hero_url_1' : heroUploadIdx === 2 ? 'hero_url_2' : 'hero_url_3';
        const next = { ...pageHero, [key]: res.url };
        setPageHero(next);
        showSuccessToast('Hero image updated', `Image ${heroUploadIdx} saved.`);
        setHeroErrors(prev => ({ ...prev, [key]: '' }));
        setHeroDirty(false);
        setHeroJustSaved(true);
      } else {
        showErrorToast('Upload failed', res?.message || 'Try again');
      }
    } catch (e) {
      showErrorToast('Upload failed', e.message || 'Try again');
    } finally {
      setIsUploading(false);
      setCropOpen(false);
      setSelectedFile(null);
      setHeroUploadIdx(null);
      setHeroPreview('');
    }
  };

  // Export helpers (CSV, Excel XML, PDF)
  const escapeCsv = (v) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s;
  };
  const downloadFile = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = filename; document.body.appendChild(link);
    link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
  };
  const escapeHtml = (s) => String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  const buildMembersCsvRows = (list) => {
    const headers = ['ID','Name','Role','Role ID','Active'];
    const rows = list.map(m => [m.id, m.name||'', m.role||'', m.role_id||'', m.is_active?'Yes':'No']);
    return [headers, ...rows];
  };
  const buildRolesCsvRows = (list) => {
    const headers = ['ID','Role Name','Description'];
    const rows = list.map(r => [r.id, r.role_name||'', r.role_description||'']);
    return [headers, ...rows];
  };
  const downloadCsv = (filename, rows) => {
    const csv = rows.map(r => r.map(escapeCsv).join(',')).join('\n');
    downloadFile(new Blob(["\uFEFF"+csv], { type: 'text/csv;charset=utf-8;' }), filename);
  };
  const buildExcelXml = (sheetName, rows) => {
    const rowXml = rows.map(r => `<Row>${r.map(c => `<Cell><Data ss:Type="String">${String(c??'')}</Data></Cell>`).join('')}</Row>`).join('');
    return `<?xml version="1.0"?>\n<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n<Worksheet ss:Name="${sheetName}"><Table>${rowXml}</Table></Worksheet></Workbook>`;
  };
  const openPrintPdf = (title, headers, rows) => {
    const win = window.open('', '_blank');
    if (!win) throw new Error('Popup blocked. Allow popups to export PDF.');
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
    win.document.write(`<!doctype html><html><head><meta charset='utf-8'><title>${escapeHtml(title)}</title>${styles}</head><body><h1>${escapeHtml(title)}</h1><div class="meta">Generated on ${escapeHtml(ts)} ${host ? `• ${escapeHtml(host)}` : ''}</div><table>${thead}<tbody>${tbody}</tbody></table><script>window.onload=()=>{window.print();}</script></body></html>`);
    win.document.close();
  };

  // Export implementation
  const mainExport = useExport({
    exportFunction: async (format) => {
      const exportingRoles = activeTab === 'roles';
      const dataset = exportingRoles
        ? roles
        : (selectedItems.length > 0
            ? filteredMembers.filter(m => selectedItems.includes(m.id))
            : filteredMembers);

      if (!dataset || dataset.length === 0) {
        throw new Error(exportingRoles ? 'No roles to export' : 'No members to export');
      }

      const now = new Date();
      const ts = now.toISOString().replace(/[:T]/g,'-').split('.')[0];
      const title = exportingRoles ? 'LYDO Council Roles' : 'LYDO Council Members';
      const exportType = selectedItems.length > 0 ? 'selected' : 'all';
      const actualFormat = format === 'excel' || format === 'xlsx' ? 'xlsx' : format;

      // Log export activity
      try {
        await logExport(actualFormat, exportingRoles ? 'role' : 'member', dataset.length, exportType);
      } catch (err) {
        console.error('Failed to log export:', err);
      }

      if (format === 'pdf') {
        const rows = exportingRoles ? buildRolesCsvRows(dataset) : buildMembersCsvRows(dataset);
        openPrintPdf(title, rows[0], rows);
        return { success: true, count: dataset.length, filename: `${exportingRoles?'roles':'members'}-${ts}.pdf` };
      }

      if (format === 'excel' || format === 'xlsx') {
        const rows = exportingRoles ? buildRolesCsvRows(dataset) : buildMembersCsvRows(dataset);
        const xml = buildExcelXml(exportingRoles ? 'Roles' : 'Members', rows);
        downloadFile(new Blob([xml], { type: 'application/vnd.ms-excel' }), `council-${exportingRoles?'roles':'members'}-${ts}.xls`);
        return { success: true, count: dataset.length, filename: `council-${exportingRoles?'roles':'members'}-${ts}.xls` };
      }

      // CSV
      {
        const rows = exportingRoles ? buildRolesCsvRows(dataset) : buildMembersCsvRows(dataset);
        downloadCsv(`council-${exportingRoles?'roles':'members'}-${activeTab}-${ts}.csv`, rows);
        return { success: true, count: dataset.length };
      }
    },
    onSuccess: (res) => showSuccessToast('Export completed', `${res.count} ${activeTab==='roles'?'role(s)':'member(s)'} exported`),
    onError: (error) => showErrorToast('Export failed', error.message)
  });

  // Bulk export implementation
  const bulkExport = useExport({
    exportFunction: async (format) => {
      if (selectedItems.length === 0) {
        throw new Error('No items selected for export');
      }

      const exportingRoles = activeTab === 'roles';
      const dataset = exportingRoles
        ? roles.filter(r => selectedItems.includes(r.id))
        : allMembers.filter(m => selectedItems.includes(m.id));

      if (!dataset || dataset.length === 0) {
        throw new Error(exportingRoles ? 'No selected roles to export' : 'No selected members to export');
      }

      const now = new Date();
      const ts = now.toISOString().replace(/[:T]/g,'-').split('.')[0];
      const title = exportingRoles ? 'LYDO Council Roles (Selected)' : 'LYDO Council Members (Selected)';
      const actualFormat = format === 'excel' || format === 'xlsx' ? 'xlsx' : format;

      // Log bulk export activity
      try {
        await logExport(actualFormat, exportingRoles ? 'role' : 'member', dataset.length, 'selected');
      } catch (err) {
        console.error('Failed to log bulk export:', err);
      }

      if (format === 'pdf') {
        const rows = exportingRoles ? buildRolesCsvRows(dataset) : buildMembersCsvRows(dataset);
        openPrintPdf(title, rows[0], rows);
        return { success: true, count: dataset.length, filename: `council-${exportingRoles?'roles':'members'}-selected-${ts}.pdf` };
      }

      if (format === 'excel' || format === 'xlsx') {
        const rows = exportingRoles ? buildRolesCsvRows(dataset) : buildMembersCsvRows(dataset);
        const xml = buildExcelXml(exportingRoles ? 'Roles' : 'Members', rows);
        downloadFile(new Blob([xml], { type: 'application/vnd.ms-excel' }), `council-${exportingRoles?'roles':'members'}-selected-${ts}.xls`);
        return { success: true, count: dataset.length, filename: `council-${exportingRoles?'roles':'members'}-selected-${ts}.xls` };
      }

      // CSV
      {
        const rows = exportingRoles ? buildRolesCsvRows(dataset) : buildMembersCsvRows(dataset);
        downloadCsv(`council-${exportingRoles?'roles':'members'}-selected-${ts}.csv`, rows);
        return { success: true, count: dataset.length };
      }
    },
    onSuccess: (res) => showSuccessToast('Bulk export completed', `${res.count} ${activeTab==='roles'?'role(s)':'member(s)'} exported`),
    onError: (error) => showErrorToast('Bulk export failed', error.message)
  });
  
  // Action menu for roles
  const getRoleActionMenuItems = (role) => [
    {
      id: 'edit',
      label: 'Edit',
      icon: <Edit className="w-4 h-4" />,
      action: 'edit'
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: <Trash2 className="w-4 h-4" />,
      action: 'delete'
    }
  ];
  
  const handleRoleActionClick = (action, role) => {
    if (action === 'edit') {
      handleRoleEdit(role);
    } else if (action === 'delete') {
      handleRoleDelete(role.id);
    }
  };
  
  // Action menu for members
  const getMemberActionMenuItems = (member) => [
    {
      id: 'edit',
      label: 'Edit',
      icon: <Edit className="w-4 h-4" />,
      action: 'edit'
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: <Trash2 className="w-4 h-4" />,
      action: 'delete'
    }
  ];
  
  const handleMemberActionClick = (action, member) => {
    if (action === 'edit') {
      handleMemberEdit(member);
    } else if (action === 'delete') {
      handleMemberDelete(member.id);
    }
  };
  
  // Filter members based on active tab + filter modal
  const tabFilteredMembers = activeTab === 'active' 
    ? members.filter(m => m.is_active)
    : activeTab === 'inactive'
    ? allMembers.filter(m => !m.is_active)
    : allMembers;

  const filteredMembers = tabFilteredMembers.filter(m => {
    const roleIdOk = filterValues.roleId ? String(m.role_id) === String(filterValues.roleId) : true;
    const activeOk = filterValues.activeOnly === 'true' ? m.is_active : filterValues.activeOnly === 'false' ? !m.is_active : true;
    return roleIdOk && activeOk;
  });
  
  // Apply search
  const searchedMembers = filteredMembers.filter(member =>
    member.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.role?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.focus?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Filter and search roles
  const searchedRoles = roles.filter(role =>
    role.role_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    role.role_description?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Sort members
  const sortedMembers = [...searchedMembers].sort((a, b) => {
    const aVal = a[sortBy] || '';
    const bVal = b[sortBy] || '';
    return sortOrder === 'asc' 
      ? aVal.toString().localeCompare(bVal.toString())
      : bVal.toString().localeCompare(aVal.toString());
  });
  
  // Sort roles
  const sortedRoles = [...searchedRoles].sort((a, b) => {
    const aVal = a[sortBy] || '';
    const bVal = b[sortBy] || '';
    return sortOrder === 'asc' 
      ? aVal.toString().localeCompare(bVal.toString())
      : bVal.toString().localeCompare(aVal.toString());
  });
  
  // Paginate
  const paginatedMembers = sortedMembers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  
  const paginatedRoles = sortedRoles.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  
  // Bulk selection handlers (defined after paginated data)
  const handleSelectItem = (id) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (activeTab === 'roles') {
      setSelectedItems(selectedItems.length === paginatedRoles.length ? [] : paginatedRoles.map(item => item.id));
    } else {
      setSelectedItems(selectedItems.length === paginatedMembers.length ? [] : paginatedMembers.map(item => item.id));
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <HeaderMainContent
        title="LYDO Council Management"
        description="Manage council roles, members, and page settings"
      />
      
      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column - Content */}
        <div className="xl:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <TabContainer
              activeTab={activeTab}
              onTabChange={setActiveTab}
              variant="underline"
              size="md"
            >
              <Tab id="active" label="Active" count={members.length} color="green" />
              <Tab id="inactive" label="Inactive" count={allMembers.filter(m => !m.is_active).length} color="yellow" />
              <Tab id="members" label="All Members" count={allMembers.length} color="blue" />
              <Tab id="roles" label="Roles" count={roles.length} color="purple" />
              <Tab id="settings" label="Page Settings" color="indigo" />
            </TabContainer>
            
            {/* Controls */}
            {(activeTab === 'members' || activeTab === 'active' || activeTab === 'inactive' || activeTab === 'roles') && (
              <div className="px-6 py-5 border-t border-gray-100 bg-gray-50/50">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                  {/* Left Controls */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <SearchBar
                      value={searchQuery}
                      onChange={setSearchQuery}
                      placeholder={activeTab === 'roles' ? "Search roles..." : "Search members..."}
                      expandOnMobile={true}
                      showIndicator={true}
                      indicatorText="Search"
                      indicatorColor="blue"
                      size="md"
                      debounceMs={300}
                    />
                    {(activeTab === 'members' || activeTab === 'active' || activeTab === 'inactive') && (
                      <button 
                        ref={filterTriggerRef}
                        onClick={() => setShowFilterModal(true)}
                        className={`inline-flex items-center border rounded-lg font-medium transition-all duration-200 ${
                          showFilterModal || (filterValues.roleId || filterValues.activeOnly)
                            ? 'border-blue-500 text-blue-600 bg-blue-50' 
                            : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                        } px-3 py-2 whitespace-nowrap`}
                      >
                        <Filter className="w-4 h-4 mr-2" />
                        <span>Filter</span>
                        <ChevronDown className="w-4 h-4 ml-1" />
                        {(filterValues.roleId || filterValues.activeOnly) && (
                          <div className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full border border-blue-200">
                            {['roleId','activeOnly'].filter(k => !!filterValues[k]).length}
                          </div>
                        )}
                      </button>
                    )}
                    <SortButton
                      ref={sortModal.triggerRef}
                      onClick={sortModal.toggleModal}
                      isOpen={sortModal.isOpen}
                      isActive={!sortModal.isDefaultSort}
                      sortOrder={sortModal.sortOrder}
                    />
                  </div>

                  {/* Right Controls */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <ExportButton
                      formats={['csv','xlsx','pdf']}
                      onExport={(format) => mainExport.handleExport(format === 'xlsx' ? 'excel' : format)}
                      isExporting={mainExport.isExporting}
                      label="Export"
                      size="md"
                      position="auto"
                      responsive={true}
                    />
                    <div className="flex items-center border border-gray-200 rounded-lg p-1 bg-white">
                      <button
                        onClick={() => setViewMode('grid')}
                        className={`p-1.5 rounded transition-all duration-200 ${
                          viewMode === 'grid' 
                            ? 'bg-gray-100 text-blue-600 shadow-sm' 
                            : 'text-gray-600 hover:text-gray-800'
                        }`}
                      >
                        <Grid className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setViewMode('list')}
                        className={`p-1.5 rounded transition-all duration-200 ${
                          viewMode === 'list' 
                            ? 'bg-gray-100 text-blue-600 shadow-sm' 
                            : 'text-gray-600 hover:text-gray-800'
                        }`}
                      >
                        <List className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Content based on active tab */}
            <div className="min-h-[400px]">
          {activeTab === 'members' || activeTab === 'active' || activeTab === 'inactive' ? (
            <>
              {loading ? (
                <LoadingSpinner message="Loading members..." />
              ) : (
                <>
                  <DataTable
                    data={paginatedMembers}
                    selectedItems={selectedItems}
                    onSelectItem={handleSelectItem}
                    onSelectAll={handleSelectAll}
                    getActionMenuItems={getMemberActionMenuItems}
                    onActionClick={handleMemberActionClick}
                    viewMode={viewMode}
                    keyField="id"
                    displayFields={{
                      avatar: null,
                      title: (item) => item.name,
                      subtitle: (item) => item.role || '',
                      status: null,
                      date: null
                    }}
                    selectAllLabel="Select All Members"
                    emptyMessage="No members found"
                    styling={{
                      gridCols: 'grid-cols-1 lg:grid-cols-2',
                      cardHover: 'hover:border-blue-300 hover:shadow-xl hover:shadow-blue-100/50 hover:scale-[1.02]',
                      listHover: 'hover:bg-blue-50/30 hover:border-l-4 hover:border-l-blue-400',
                      theme: 'blue'
                    }}
                  />

                  <Pagination
                    currentPage={currentPage}
                    totalItems={searchedMembers.length}
                    itemsPerPage={itemsPerPage}
                    onPageChange={pagination.handlePageChange}
                    onItemsPerPageChange={pagination.handleItemsPerPageChange}
                    itemName="member"
                    itemNamePlural="members"
                    showItemsPerPage={true}
                    showInfo={true}
                    size="md"
                    variant="default"
                    itemsPerPageOptions={[5, 10, 20, 50]}
                  />
                  
                  {/* Bulk Actions */}
                  {selectedItems.length > 0 && (
                    <div className="mt-4">
                      <BulkActionsBar
                        selectedCount={selectedItems.length}
                        itemName="member"
                        itemNamePlural="members"
                        onBulkAction={() => setShowBulkModal(true)}
                        exportConfig={{
                          formats: ['csv', 'xlsx', 'pdf'],
                          onExport: (format) => bulkExport.handleExport(format === 'xlsx' ? 'excel' : format),
                          isExporting: bulkExport.isExporting
                        }}
                        primaryColor="blue"
                      />
                    </div>
                  )}
                </>
              )}
            </>
          ) : activeTab === 'roles' ? (
            <>
              {loading ? (
                <LoadingSpinner message="Loading roles..." />
              ) : (
                <>
                  <DataTable
                    data={paginatedRoles}
                    selectedItems={selectedItems}
                    onSelectItem={handleSelectItem}
                    onSelectAll={handleSelectAll}
                    getActionMenuItems={getRoleActionMenuItems}
                    onActionClick={handleRoleActionClick}
                    viewMode={viewMode}
                    keyField="id"
                    displayFields={{
                      avatar: null,
                      title: (item) => (
                        <div className="flex items-center space-x-2">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex-shrink-0">
                            <BadgeCheck className="w-4 h-4" />
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2 min-w-0">
                                <span className="font-medium text-gray-900 text-sm sm:text-base truncate">{item.role_name}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ),
                      subtitle: (item) => (
                        item.role_description ? (
                          <p className="text-xs sm:text-sm text-gray-600 line-clamp-1 sm:line-clamp-2">{item.role_description}</p>
                        ) : (
                          <span className="text-xs text-gray-500">No description</span>
                        )
                      ),
                      status: null,
                      date: null
                    }}
                    selectAllLabel="Select All Roles"
                    emptyMessage="No roles found"
                    styling={{
                      gridCols: 'grid-cols-1 lg:grid-cols-2',
                      cardHover: 'hover:border-blue-300 hover:shadow-xl hover:shadow-blue-100/50 hover:scale-[1.02]',
                      listHover: 'hover:bg-blue-50/30 hover:border-l-4 hover:border-l-blue-400',
                      theme: 'blue'
                    }}
                  />
                  
                  {/* Bulk Actions */}
                  {selectedItems.length > 0 && (
                    <div className="mt-4">
                      <BulkActionsBar
                        selectedCount={selectedItems.length}
                        itemName="role"
                        itemNamePlural="roles"
                        onBulkAction={null}
                        exportConfig={{
                          formats: ['csv', 'xlsx', 'pdf'],
                          onExport: (format) => bulkExport.handleExport(format === 'xlsx' ? 'excel' : format),
                          isExporting: bulkExport.isExporting
                        }}
                        primaryColor="blue"
                      />
                    </div>
                  )}
                  
                  <Pagination
                    currentPage={currentPage}
                    totalItems={searchedRoles.length}
                    itemsPerPage={itemsPerPage}
                    onPageChange={pagination.handlePageChange}
                    onItemsPerPageChange={pagination.handleItemsPerPageChange}
                    itemName="role"
                    itemNamePlural="roles"
                    showItemsPerPage={true}
                    showInfo={true}
                    size="md"
                    variant="default"
                    itemsPerPageOptions={[5, 10, 20, 50]}
                  />
                </>
              )}
            </>
          ) : activeTab === 'settings' && (
            <>
              <div className="px-6 py-6 border-t border-gray-100">
                <div className="space-y-6">
                  {/* Hero Images Summary */}
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">Hero Images</h3>
                      <p className="text-sm text-gray-600">Manage the carousel images displayed on the public council page. Use the form on the right to update hero images.</p>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {['hero_url_1','hero_url_2','hero_url_3'].map((k, i) => {
                        const idx = i + 1;
                        const val = pageHero[k];
                        const status = !val ? 'Not set' : heroLoadStatus[idx] === false ? 'Broken URL' : 'Set';
                        const statusColor = !val
                          ? 'text-gray-600'
                          : heroLoadStatus[idx] === false
                            ? 'text-red-600'
                            : 'text-emerald-600';
                        return (
                          <div key={k} className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
                            <div className="aspect-[16/9] rounded-lg overflow-hidden bg-gray-50 border border-gray-200">
                              {val ? (
                                <img
                                  src={getFileUrl(val)}
                                  alt={`Hero ${idx}`}
                                  className="w-full h-full object-cover"
                                  onLoad={() => setHeroLoadStatus(s => ({ ...s, [idx]: true }))}
                                  onError={() => setHeroLoadStatus(s => ({ ...s, [idx]: false }))}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <span className="text-xs text-gray-400">No image</span>
                                </div>
                              )}
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700">Hero Image {idx}</span>
                                <span className={`text-xs font-medium ${statusColor}`}>{status}</span>
                              </div>
                              <div className="flex flex-col gap-2">
                                <button
                                  type="button"
                                  onClick={() => setTimeout(() => document.getElementById(`left-hero-upload-${idx}`)?.click(), 0)}
                                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                  {val ? 'Replace' : 'Upload'}
                                </button>
                                <input
                                  id={`left-hero-upload-${idx}`}
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => handleHeroFileChange(idx, e)}
                                />
                                {val && (
                                  <button
                                    type="button"
                                    onClick={() => handleHeroRemove(idx)}
                                    className="w-full px-3 py-2 rounded-lg border border-red-300 text-sm font-medium text-red-700 hover:bg-red-50 transition-colors"
                                  >
                                    Remove
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-xs text-gray-500">Recommended: 1600×900, JPG/PNG/WEBP ≤ 3MB</p>
                  </div>

                  {/* Audit Info */}
                  <div className="pt-4 border-t border-gray-100">
                    <div className="text-xs text-gray-500">
                      <span className="font-medium">Last updated:</span> {pageSettings.lastUpdatedAt || '—'} 
                      {pageSettings.lastUpdatedBy !== '—' && (
                        <span> by <span className="font-medium">{pageSettings.lastUpdatedBy}</span></span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
        </div>
        </div>
        
      {/* Bulk Operations Modal */}
      {showBulkModal && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/30" onClick={() => setShowBulkModal(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Bulk Actions</h3>
              <p className="text-sm text-gray-600 mt-1">{selectedItems.length} member{selectedItems.length>1?'s':''} selected</p>
            </div>
            <div className="px-6 py-4 space-y-3">
              <label className="block text-sm font-medium text-gray-700">Action</label>
              <select
                value={bulkAction}
                onChange={(e)=>setBulkAction(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select action</option>
                <option value="activate">Activate</option>
                <option value="deactivate">Deactivate</option>
                <option value="delete">Delete</option>
              </select>
              {bulkAction === 'delete' && (
                <p className="text-xs text-red-600">Deleting is permanent. This cannot be undone.</p>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={()=>{ setShowBulkModal(false); setBulkAction(''); }}
                className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!bulkAction || isBulkProcessing}
                onClick={handleBulkOperation}
                className={`px-4 py-2 rounded-lg text-white ${bulkAction==='delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'} disabled:opacity-50`}
              >
                {isBulkProcessing ? 'Processing...' : 'Execute'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

        {/* Right Column - Forms */}
        <div className="xl:col-span-1">
        {/* Add Role Form */}
        {activeTab === 'roles' && (
          <CollapsibleForm
            title="Add Role"
            description="Create a new council role"
            icon={<Award className="w-5 h-5" />}
            defaultCollapsed={roleFormCollapsed}
            onToggle={setRoleFormCollapsed}
            iconBgColor="bg-blue-100"
            iconTextColor="text-blue-600"
          >
            <form onSubmit={handleRoleSubmit} className="space-y-4">
        <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role Name *</label>
                <input
                  type="text"
                  name="role_name"
                  value={roleForm.role_name}
                  onChange={handleRoleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Chairperson"
                />
        </div>
        <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  name="role_description"
                  value={roleForm.role_description}
                  onChange={handleRoleChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="Brief description of the role"
                />
        </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleRoleReset}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  Clear
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingRoleId ? 'Update' : 'Create'}
                </button>
        </div>
            </form>
          </CollapsibleForm>
        )}
        
        {/* Add Member Form */}
        {(activeTab === 'members' || activeTab === 'active' || activeTab === 'inactive') && (
          <CollapsibleForm
            title="Add Member"
            description="Add a new council member"
            icon={<UserPlus className="w-5 h-5" />}
            defaultCollapsed={memberFormCollapsed}
            onToggle={setMemberFormCollapsed}
            iconBgColor="bg-blue-100"
            iconTextColor="text-blue-600"
          >
            <form onSubmit={handleMemberSubmit} className="space-y-4">
              {/* Form fields (no box) */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role <span className="text-red-500">*</span></label>
                    <select
                      name="role_id"
                      value={memberForm.role_id}
                      onChange={handleMemberChange}
                      required
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select role</option>
                      {roles.map(role => (
                        <option key={role.id} value={role.id}>{role.role_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      name="member_name"
                      value={memberForm.member_name}
                      onChange={handleMemberChange}
                      required
                      placeholder="e.g., Juan Dela Cruz"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Spacing */}
                <div className="my-2" />

                {/* Status row */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Active status</p>
                    <p className="text-xs text-gray-500">Only active members appear on the public page</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMemberForm(prev => ({ ...prev, is_active: !prev.is_active }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${memberForm.is_active ? 'bg-emerald-600' : 'bg-gray-300'}`}
                    aria-pressed={memberForm.is_active}
                    aria-label="Toggle active"
                  >
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${memberForm.is_active ? 'translate-x-5' : 'translate-x-1'}`} />
                  </button>
                  <input type="checkbox" name="is_active" checked={memberForm.is_active} onChange={handleMemberChange} className="hidden" />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={handleMemberReset}
                  className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  Clear
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingMemberId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </CollapsibleForm>
        )}
        
        {/* Hero Images Form */}
        {activeTab === 'settings' && (
          <CollapsibleForm
            title="Page Hero Images"
            description="Upload and manage carousel images displayed on the public council page"
            icon={<ImageIcon className="w-5 h-5" />}
            defaultCollapsed={heroFormCollapsed}
            onToggle={setHeroFormCollapsed}
            iconBgColor="bg-emerald-100"
            iconTextColor="text-emerald-600"
          >
            <form onSubmit={handleHeroSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[1,2,3].map((idx) => {
                  const key = idx === 1 ? 'hero_url_1' : idx === 2 ? 'hero_url_2' : 'hero_url_3';
                  const val = pageHero[key];
                  const inputId = `hero-input-${idx}`;
                  return (
                    <div key={idx} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                      <div className="aspect-[16/9] bg-gray-50 flex items-center justify-center">
                        {val ? (
                          <img src={getFileUrl(val)} alt={`Hero ${idx}`} className="w-full h-full object-cover" />
                        ) : (
                          <div className="text-xs text-gray-500">No image</div>
                        )}
                      </div>
                      <div className="p-3 border-t border-gray-100 space-y-2">
                        <input
                          type="text"
                          value={val || ''}
                          onChange={(e) => setHeroField(key, e.target.value)}
                          placeholder={`Hero ${idx} URL`}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 text-sm ${heroErrors[key] ? 'border-red-300' : 'border-gray-200'}`}
                        />
                        {heroErrors[key] && (
                          <div className="text-[11px] text-red-600">{heroErrors[key]}</div>
                        )}
                        <div className="grid grid-cols-2 gap-1.5">
                          <div className="col-span-2">
                            <button 
                              type="button" 
                              onClick={() => setTimeout(()=>document.getElementById(inputId)?.click(),0)} 
                              className="w-full h-10 px-3 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
                            >
                              {val ? 'Replace' : 'Upload'}
                            </button>
                            <input id={inputId} type="file" accept="image/*" className="hidden" onChange={(e)=>handleHeroFileChange(idx, e)} />
                          </div>
                          {val && (
                            <button 
                              type="button" 
                              onClick={() => handleHeroRemove(idx)} 
                              className="col-span-2 w-full h-10 px-3 rounded-lg border text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-500">Recommended: 1600×900, JPG/PNG/WEBP ≤ 3MB</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between">
                <div className="text-xs">
                  {isSavingHero && <span className="text-gray-600">Saving…</span>}
                  {!isSavingHero && heroJustSaved && !heroDirty && <span className="text-emerald-700">Saved</span>}
                </div>
                <button
                  type="submit"
                  disabled={isSavingHero || Object.values(heroErrors).some(Boolean) || !heroDirty}
                  className={`px-3 py-1.5 rounded-lg text-sm ${isSavingHero || Object.values(heroErrors).some(Boolean) || !heroDirty ? 'bg-emerald-300 text-white cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
                >
                  Save All
                </button>
              </div>
            </form>
          </CollapsibleForm>
        )}
      </div>
        </div>
      
      {/* Modals */}
      <SortModal
        isOpen={sortModal.isOpen}
        onClose={sortModal.closeModal}
        triggerRef={sortModal.triggerRef}
        title={activeTab === 'roles' ? "Sort Roles" : "Sort Members"}
        sortFields={activeTab === 'roles' ? [
          { value: 'role_name', label: 'Role Name' },
          { value: 'created_at', label: 'Date Created' }
        ] : [
          { value: 'name', label: 'Name' },
          { value: 'role', label: 'Role' },
          { value: 'is_active', label: 'Active Status' }
        ]}
        sortBy={sortModal.sortBy}
        sortOrder={sortModal.sortOrder}
        onSortChange={sortModal.updateSort}
        onReset={sortModal.resetSort}
        defaultSortBy={activeTab === 'roles' ? 'role_name' : 'name'}
        defaultSortOrder="asc"
      />
      <FilterModal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        triggerRef={filterTriggerRef}
        title="Filters"
        filters={[
          {
            id: 'roleId',
            label: 'Role',
            type: 'select',
            options: [{ value: '', label: 'All roles' }, ...roles.map(r => ({ value: String(r.id), label: r.role_name }))]
          },
          {
            id: 'activeOnly',
            label: 'Active Status',
            type: 'select',
            options: [
              { value: '', label: 'Any' },
              { value: 'true', label: 'Active only' },
              { value: 'false', label: 'Inactive only' }
            ]
          }
        ]}
        values={filterValues}
        onChange={setFilterValues}
        onApply={setFilterValues}
        onClear={() => setFilterValues({ roleId: '', activeOnly: '' })}
        applyButtonText="Apply Filters"
        clearButtonText="Clear All"
      />
      
      <ToastContainer position="top-right" maxToasts={5} />
      {cropOpen && (
        <div className="fixed inset-0 z-[99998] bg-black/60 grid place-items-center p-3 sm:p-4" onClick={() => setCropOpen(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-[calc(100vw-24px)] sm:max-w-xl h-[90vh] sm:h-auto max-h-[90vh] overflow-y-auto flex flex-col p-3 sm:p-4" onClick={(e) => e.stopPropagation()}>
            <div className="relative w-full flex-1 min-h-[50vh] sm:h-80 bg-gray-200 rounded-md overflow-hidden">
              <Cropper
                image={heroPreview}
                crop={crop}
                zoom={zoom}
                aspect={16/9}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-3">
              <div className="flex items-center gap-3 w-full sm:w-2/3">
                <input type="range" min={1} max={3} step={0.1} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="flex-1" />
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-md overflow-hidden border border-gray-200">
                  {heroPreview && <img src={heroPreview} alt="preview" className="w-full h-full object-cover" />}
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 sm:justify-end">
                <button type="button" onClick={() => setCropOpen(false)} className="px-3 py-1.5 border rounded-lg">Cancel</button>
                <button type="button" onClick={handleHeroCropSave} className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white">{isUploading ? `Saving ${uploadProgress}%` : 'Use Image'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
      <ConfirmationModal {...confirmation.modalProps} />
    </div>
  );
};

export default LYDOCouncil;
