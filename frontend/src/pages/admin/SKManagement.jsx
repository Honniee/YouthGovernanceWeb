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
  Info
} from 'lucide-react';
import { HeaderMainContent, TabContainer, Tab, useTabState, ActionMenu, SearchBar, SortModal, FilterModal, BulkModal, Pagination, useSortModal, useBulkModal, usePagination, Avatar, Status, ExportButton, useExport, LoadingSpinner, BulkActionsBar, CollapsibleForm, DataTable, ViewStaffModal, EditStaffModal, ActiveTermBanner } from '../../components/portal_main_content';
import { ToastContainer, showSKSuccessToast, showSuccessToast, showErrorToast, showInfoToast, ConfirmationModal, useConfirmation } from '../../components/universal';
import skService from '../../services/skService.js';
import skTermsService from '../../services/skTermsService.js';
import { useActiveTerm } from '../../hooks/useActiveTerm.js';
import { useSKValidation } from '../../hooks/useSKValidation.js';

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
  const [isLoading, setIsLoading] = useState(false);
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
  
  // Bulk upload state
  const [uploadFile, setUploadFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  
  const handleUploadFileChange = (e) => {
    const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
    setUploadFile(file);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0] ? e.dataTransfer.files[0] : null;
    if (file) setUploadFile(file);
  };
  const handleDragOver = (e) => {
    e.preventDefault();
  };
  const removeSelectedFile = () => setUploadFile(null);
  
  // Validate bulk import file
  const handleValidateFile = async () => {
    if (!uploadFile) return;

    setIsValidating(true);
    
    try {
      const response = await skService.validateBulkImport(uploadFile);
      
      if (response.success) {
        setValidationResult(response.data);
        setShowValidationModal(true);
      } else {
        showErrorToast('Validation failed', response.message);
      }
    } catch (error) {
      console.error('Validation error:', error);
      showErrorToast('Validation error', 'An error occurred during validation. Please try again.');
    } finally {
      setIsValidating(false);
    }
  };

  // Handle actual import after validation
  const handleImportAfterValidation = async () => {
    if (!uploadFile) return;

    setIsUploading(true);
    
    try {
      const response = await skService.bulkImportSKOfficials(uploadFile, (progress) => {
        console.log(`Upload progress: ${progress}%`);
      });

      if (response.success) {
        const { summary, imported, errors } = response.data;
        
        showSuccessToast(
          'Bulk import completed!',
          `Successfully imported ${summary.importedRecords} SK officials out of ${summary.totalRows} records.`,
          [
            {
              label: "View Imported",
              onClick: () => {
                setActiveTab('active');
                loadSKData();
              }
            }
          ]
        );
        
        // Reload SK data if any were imported
        if (summary.importedRecords > 0) {
          console.log('🔄 Reloading SK data after successful import...');
          await loadSKData();
          await loadSKStats();
          console.log('✅ SK data reloaded');
        }

        // Close validation modal and reset
        setShowValidationModal(false);
        setValidationResult(null);
        setUploadFile(null);
      } else {
        showErrorToast('Import failed', response.message);
      }
    } catch (error) {
      console.error('Bulk import error:', error);
      showErrorToast('Import error', 'An error occurred during import. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  // Legacy upload function (for backward compatibility)
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;

    // Validate file
    const validation = skService.validateBulkImportFile(uploadFile);
    if (!validation.isValid) {
      showErrorToast('Invalid file', validation.errors.join(', '));
      return;
    }

    setIsUploading(true);
    
    try {
      const response = await skService.bulkImportSKOfficials(uploadFile, (progress) => {
        console.log(`Upload progress: ${progress}%`);
      });

      if (response.success) {
        const { summary, imported, errors } = response.data;
        
        showSuccessToast(
          'Bulk import completed!',
          `Successfully imported ${summary.importedRecords} SK officials out of ${summary.totalRows} records.`,
          [
            {
              label: "View Imported",
              onClick: () => {
                setActiveTab('active');
                loadSKData();
              }
            }
          ]
        );
        
        // Reload SK data if any were imported
        if (summary.importedRecords > 0) {
          console.log('🔄 Reloading SK data after successful import...');
          await loadSKData();
          await loadSKStats();
          console.log('✅ SK data reloaded');
        }
      } else {
        showErrorToast('Import failed', response.message);
      }
    } catch (error) {
      console.error('Bulk import error:', error);
      showErrorToast('Import error', 'An error occurred during import. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadFile(null);
    }
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

  // Export state management using generic export hook wired to SK service
  const mainExport = useExport({
    exportFunction: (format, style = null) =>
      skService.exportSKOfficials(format, statusFilter, [], style, activeTerm?.termId),
    onSuccess: () =>
      showSKSuccessToast('exported', null, [
        {
          label: 'Export Another',
          onClick: () => window.location.reload()
        }
      ]),
    onError: (error) => showErrorToast('Export failed', error.message)
  });

  const bulkExportHook = useExport({
    exportFunction: (format, style = null) => {
      if (selectedItems.length > 0) {
        return skService.exportSKOfficials(format, statusFilter, selectedItems, style, activeTerm?.termId);
      }
      return skService.exportSKOfficials(format, statusFilter, [], style, activeTerm?.termId);
    },
    onSuccess: () => {
      const count = selectedItems.length > 0 ? selectedItems.length : 'all';
      console.log('Bulk export completed for items:', selectedItems);
      showSKSuccessToast('exported', null, [
        {
          label: `Exported ${count} SK officials`,
          onClick: () => {}
        },
        {
          label: 'Clear Selection',
          onClick: () => setSelectedItems([])
        }
      ]);
    },
    onError: (error) => {
      console.log('Bulk export failed for items:', selectedItems, 'Error:', error);
      showErrorToast('Bulk export failed', error.message);
    }
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
        console.log('🎯 SK Data loaded successfully:', {
          itemsCount: response.data.data?.items?.length || 0,
          totalSK: response.data.data?.pagination?.totalItems || 0,
          firstItem: response.data.data?.items?.[0] || null
        });
        setSkData(response.data.data?.items || []);
        setTotalSK(response.data.data?.pagination?.totalItems || 0);
      } else {
        console.error('Failed to load SK officials:', response.message);
        showErrorToast('Failed to load data', 'Failed to load SK officials data: ' + response.message);
      }
    } catch (error) {
      console.error('Error loading SK officials:', error);
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
        console.log('SK stats loaded:', response.data);
      } else {
        console.error('Failed to load SK stats:', response.message);
      }
    } catch (error) {
      console.error('Error loading SK stats:', error);
    }
  };

  // Load active term data


  // Load term history
  const loadTermHistory = async () => {
    try {
      const response = await skTermsService.getTermHistory();
      if (response.success) {
        setTermHistory(response.data);
        console.log('Term history loaded:', response.data);
      } else {
        console.error('Failed to load term history:', response.message);
      }
    } catch (error) {
      console.error('Error loading term history:', error);
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
        console.error('Error initializing SK Management data:', error);
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
    console.log('Applied filters:', appliedValues);
    // TODO: Apply filters to data loading
  };

  const handleFilterClear = (clearedValues) => {
    setFilterValues(clearedValues);
    setCurrentPage(1);
    console.log('Cleared filters');
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
    
    console.log('🔧 Action Menu Items Debug:', {
      lydoId: item.lydoId,
      name: `${item.firstName} ${item.lastName}`,
      isActive: item.isActive,
      deactivated: item.deactivated,
      statusAction,
      statusLabel
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
    console.log('🔍 Action Menu Debug:', { 
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
      console.error('Error updating status:', error);
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
      console.error('Error deleting SK official:', error);
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
        console.error('Update failed:', response);
        const errorMessage = response.details 
          ? `${response.message}\n\nDetails:\n• ${response.details.join('\n• ')}`
          : response.message;
        showErrorToast('Failed to update SK official', errorMessage);
      }
    } catch (error) {
      console.error('Error updating SK official:', error);
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
      console.error('Error in bulk operation:', error);
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

      const submitData = {
        ...formData,
        barangayId: barangayOption.id,
        barangayName: undefined // Remove barangayName as backend expects barangayId
      };

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
        showErrorToast('Failed to create SK official', response.message);
      }
    } catch (error) {
      console.error('Error creating SK official:', error);
      showErrorToast('Error creating SK official', 'An error occurred while creating the SK official');
    }
  };



  // Tab styling is now handled by the reusable Tab component



  // Sort modal content is now handled by the reusable SortModal component

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
                    formats={['csv', 'pdf']}
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
              formats: ['csv', 'pdf'],
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
          {tabLoading ? (
            <LoadingSpinner 
              variant="spinner"
              message="Loading SK officials data..." 
              size="md"
              color="blue"
              height="h-64"
            />
          ) : (
            <div>
              {console.log('🔍 Rendering DataTable with:', { 
                skDataLength: skData?.length || 0, 
                tabLoading, 
                isLoading,
                skDataSample: skData?.[0] || null 
              })}
              <DataTable
                data={skData}
                selectedItems={selectedItems}
                onSelectItem={hasActiveTerm ? handleSelectItem : undefined}
                onSelectAll={hasActiveTerm ? handleSelectAll : undefined}
                getActionMenuItems={hasActiveTerm ? getActionMenuItems : undefined}
                onActionClick={hasActiveTerm ? handleActionClick : undefined}
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
                subtitle: (item) => (
                  <div className="space-y-2">
                    {/* Position */}
                    <div className="flex items-center">
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                        {item.position}
                      </span>
                    </div>
                    
                    {/* Personal Email */}
                    <div className="text-sm text-gray-600 truncate">
                      {item.personalEmail}
                    </div>
                  </div>
                ),
                status: (item) => item.isActive ? 'active' : 'deactivated',
                date: 'createdAt',
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
            {!tabLoading && hasActiveTerm && (
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
                  <p className="text-sm text-gray-600">Upload a CSV or Excel file to import SK officials</p>
                </div>
              </div>
              <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${uploadCollapsed ? 'rotate-180' : 'rotate-0'}`} />
            </button>
            <div className={`p-0 ${uploadCollapsed ? 'hidden' : ''}`}>
              {/* Modern dropzone header */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className="mx-5 mt-5 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 hover:border-indigo-300 transition-colors"
              >
                <div className="px-6 py-8 text-center">
                  <div className="mx-auto w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center mb-3">
                    <Upload className="w-6 h-6 text-indigo-600" />
                  </div>
                  <p className="text-sm text-gray-700">
                    Drag and drop your CSV or Excel file here, or
                    <label className="ml-1 font-medium text-indigo-700 hover:underline cursor-pointer">
                      browse
                      <input
                        type="file"
                        accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                        onChange={handleUploadFileChange}
                        className="sr-only"
                      />
                    </label>
                  </p>
                  <p className="mt-1 text-xs text-gray-500">Supported: CSV, XLSX. Max 10MB.</p>
                </div>
              </div>

              {/* Selected file pill */}
              {uploadFile && (
                <div className="mx-5 mt-4 flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-2">
                  <div className="flex items-center text-sm text-gray-700">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 mr-2">Selected</span>
                    <span className="font-medium text-gray-900">{uploadFile.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={removeSelectedFile}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Remove
                  </button>
                </div>
              )}

              {/* Actions */}
              <div className="mx-5 my-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await skService.downloadTemplate('csv');
                      showInfoToast('Template downloaded', 'CSV template has been downloaded to your computer.');
                    } catch (error) {
                      console.error('CSV template download failed:', error);
                      showErrorToast('Download failed', 'Failed to download CSV template. Please try again.');
                    }
                  }}
                  disabled={isUploading}
                  className="w-full px-4 py-2 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  📄 CSV Template
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await skService.downloadTemplate('xlsx');
                      showInfoToast('Template downloaded', 'Excel template has been downloaded to your computer.');
                    } catch (error) {
                      console.error('Excel template download failed:', error);
                      showErrorToast('Download failed', 'Failed to download Excel template. Please try again.');
                    }
                  }}
                  disabled={isUploading}
                  className="w-full px-4 py-2 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  📊 Excel Template
                </button>
                <button
                  type="button"
                  onClick={removeSelectedFile}
                  disabled={!uploadFile || isUploading || isValidating}
                  className="w-full px-4 py-2 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={handleValidateFile}
                  disabled={!uploadFile || isUploading || isValidating}
                  className="w-full inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isValidating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Validating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Validate
                    </>
                  )}
                </button>
              </div>
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
      <ViewStaffModal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setSelectedStaffMember(null);
        }}
        staffMember={selectedStaffMember}
      />

      <EditStaffModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedStaffMember(null);
        }}
        staffMember={selectedStaffMember}
        onSave={handleEditSave}
        isSaving={isEditingSaving}
      />
      
      {/* Universal Toast Container */}
      <ToastContainer position="top-right" maxToasts={5} />
      
      {/* Bulk Import Validation Modal */}
      {showValidationModal && validationResult && createPortal(
        <div className="fixed inset-0 flex items-center justify-center z-[99999] p-4 backdrop-blur-[1px]" onClick={() => setShowValidationModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Bulk Import Validation</h3>
                    <p className="text-sm text-gray-600">Review validation results before importing</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowValidationModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <CheckCircle className="w-8 h-8 text-green-600 mr-3" />
                    <div>
                      <div className="text-2xl font-bold text-green-800">{validationResult.summary.valid}</div>
                      <div className="text-sm text-green-600">Valid Records</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <AlertCircle className="w-8 h-8 text-red-600 mr-3" />
                    <div>
                      <div className="text-2xl font-bold text-red-800">{validationResult.summary.invalid}</div>
                      <div className="text-sm text-red-600">Invalid Records</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <Info className="w-8 h-8 text-blue-600 mr-3" />
                    <div>
                      <div className="text-2xl font-bold text-blue-800">{validationResult.summary.total}</div>
                      <div className="text-sm text-blue-600">Total Records</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <AlertTriangle className="w-8 h-8 text-yellow-600 mr-3" />
                    <div>
                      <div className="text-2xl font-bold text-yellow-800">{Object.keys(validationResult.preview?.conflictsByType || {}).length}</div>
                      <div className="text-sm text-yellow-600">Conflict Types</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recommended Action */}
              {validationResult.preview?.recommendedAction && (
                <div className={`mb-6 p-4 rounded-lg border ${
                  validationResult.preview.recommendedAction.severity === 'error' ? 'bg-red-50 border-red-200' :
                  validationResult.preview.recommendedAction.severity === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                  validationResult.preview.recommendedAction.severity === 'success' ? 'bg-green-50 border-green-200' :
                  'bg-blue-50 border-blue-200'
                }`}>
                  <div className="flex items-start">
                    {validationResult.preview.recommendedAction.severity === 'error' ? (
                      <AlertCircle className="w-5 h-5 text-red-600 mr-3 mt-0.5" />
                    ) : validationResult.preview.recommendedAction.severity === 'warning' ? (
                      <AlertTriangle className="w-5 h-5 text-yellow-600 mr-3 mt-0.5" />
                    ) : validationResult.preview.recommendedAction.severity === 'success' ? (
                      <CheckCircle className="w-5 h-5 text-green-600 mr-3 mt-0.5" />
                    ) : (
                      <Info className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
                    )}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">Recommended Action</h4>
                      <p className="text-sm text-gray-700">{validationResult.preview.recommendedAction.message}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Conflicts Summary */}
              {Object.keys(validationResult.preview?.conflictsByType || {}).length > 0 && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Conflicts Found</h4>
                  <div className="space-y-3">
                    {Object.entries(validationResult.preview.conflictsByType).map(([type, conflicts]) => (
                      <div key={type} className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-medium text-red-800 capitalize">{type.replace(/_/g, ' ')}</h5>
                          <span className="text-sm text-red-600 bg-red-100 px-2 py-1 rounded-full">{conflicts.length} conflicts</span>
                        </div>
                        <div className="space-y-2">
                          {conflicts.slice(0, 3).map((conflict, index) => (
                            <div key={index} className="text-sm text-red-700 bg-red-100 p-2 rounded">
                              Row {conflict.record.rowIndex}: {conflict.record.errors[0]}
                            </div>
                          ))}
                          {conflicts.length > 3 && (
                            <div className="text-sm text-red-600 italic">
                              ... and {conflicts.length - 3} more conflicts
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Valid Records Preview */}
              {validationResult.preview?.validRecords && validationResult.preview.validRecords.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Valid Records ({validationResult.preview.validRecords.length})</h4>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="space-y-2">
                      {validationResult.preview.validRecords.slice(0, 5).map((record, index) => (
                        <div key={index} className="text-sm text-green-700 bg-green-100 p-2 rounded">
                          Row {record.rowIndex}: {record.record.firstName} {record.record.lastName} - {record.record.position}
                        </div>
                      ))}
                      {validationResult.preview.validRecords.length > 5 && (
                        <div className="text-sm text-green-600 italic">
                          ... and {validationResult.preview.validRecords.length - 5} more valid records
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Invalid Records Preview */}
              {validationResult.preview?.invalidRecords && validationResult.preview.invalidRecords.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Invalid Records ({validationResult.preview.invalidRecords.length})</h4>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="space-y-2">
                      {validationResult.preview.invalidRecords.slice(0, 5).map((record, index) => (
                        <div key={index} className="text-sm text-red-700 bg-red-100 p-2 rounded">
                          Row {record.rowIndex}: {record.errors.join(', ')}
                        </div>
                      ))}
                      {validationResult.preview.invalidRecords.length > 5 && (
                        <div className="text-sm text-red-600 italic">
                          ... and {validationResult.preview.invalidRecords.length - 5} more invalid records
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                {validationResult.preview?.canProceed ? (
                  <span className="text-green-600">✅ Ready to import {validationResult.summary.valid} valid records</span>
                ) : (
                  <span className="text-red-600">❌ No valid records to import</span>
                )}
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowValidationModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                {validationResult.preview?.canProceed && (
                  <button
                    onClick={handleImportAfterValidation}
                    disabled={isUploading}
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {isUploading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Importing...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Import Valid Records
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Universal Confirmation Modal - Beautiful replacement for browser confirm() */}
      <ConfirmationModal {...confirmation.modalProps} />
    </div>
  );
};

export default SKManagement;