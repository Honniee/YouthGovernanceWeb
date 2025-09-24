import React, { useEffect, useMemo, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { HeaderMainContent, TabContainer, Tab, useTabState, SearchBar, SortModal, FilterModal, BulkModal, Pagination, useSortModal, useBulkModal, Status, ExportButton, LoadingSpinner, BulkActionsBar, CollapsibleForm, DataTable } from '../../components/portal_main_content';
import { ToastContainer, showSuccessToast, showErrorToast, showInfoToast, showWarningToast, ConfirmationModal, useConfirmation } from '../../components/universal';
import { Search, Calendar, Users, FileText, ChevronDown, ArrowUpDown, Upload, CheckCircle, AlertCircle, X, User, Filter, Grid, List, UserPlus, Mail, Save, Edit } from 'lucide-react';
import voterService from '../../services/voterService.js';

const VoterListUpload = () => {
  const confirmation = useConfirmation();
  const fileInputRef = useRef(null);

  // Tabs
  const { activeTab, setActiveTab } = useTabState('active', async () => {
    setTabLoading(true);
    setCurrentPage(1);
    try {
      await loadVotersData();
    } finally {
      setTabLoading(false);
    }
  });

  const [viewMode, setViewMode] = useState('grid');
  const [selectedItems, setSelectedItems] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortBy, setSortBy] = useState('last_name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [isLoading, setIsLoading] = useState(false);
  const [tabLoading, setTabLoading] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterValues, setFilterValues] = useState({ 
    gender: '', 
    dateCreated: '', 
    ageRange: ''
  });
  const filterTriggerRef = useRef(null);
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Data
  const [voters, setVoters] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, archived: 0 });

  // Total items should reflect the active tab
  const totalItemsForTab = activeTab === 'all'
    ? (stats.total || 0)
    : activeTab === 'archived'
      ? (stats.archived || 0)
      : (stats.active || 0);

  // Bulk import state
  const [uploadedFile, setUploadedFile] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [uploadCollapsed, setUploadCollapsed] = useState(true);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewRows, setPreviewRows] = useState([]);

  // Form state - Updated to match StaffManagement style
  const [formCollapsed, setFormCollapsed] = useState(true);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    suffix: '',
    birthDate: '',
    gender: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isEditSaving, setIsEditSaving] = useState(false);

  // Edit modal state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editData, setEditData] = useState({ firstName: '', lastName: '', middleName: '', suffix: '', birthDate: '', gender: '' });

  // Bulk action state
  const [bulkAction, setBulkAction] = useState('');
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // Modals
  const sortModal = useSortModal('last_name', 'asc');
  
  // Handle sort changes from modal
  const handleSortChange = (newSortBy, newSortOrder) => {
    console.log('🔍 Sort change:', { newSortBy, newSortOrder });
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
  };

  // Pagination
  // Custom pagination state that updates when totals or tab change
  const [paginationState, setPaginationState] = useState({
    currentPage: currentPage,
    itemsPerPage: itemsPerPage,
    totalItems: totalItemsForTab
  });

  // Update pagination state when tab totals change
  useEffect(() => {
    setPaginationState(prev => ({
      ...prev,
      totalItems: totalItemsForTab
    }));
  }, [totalItemsForTab]);

  // Update pagination state when currentPage or itemsPerPage change
  useEffect(() => {
    setPaginationState(prev => ({
      ...prev,
      currentPage: currentPage,
      itemsPerPage: itemsPerPage
    }));
  }, [currentPage, itemsPerPage]);

  // Pagination handlers
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  // Filter configuration for FilterModal
  const filterConfig = [
    {
      id: 'gender',
      label: 'Gender',
      type: 'select',
      placeholder: 'All Genders',
      options: [
        { value: 'Male', label: 'Male' },
        { value: 'Female', label: 'Female' }
      ],
      description: 'Filter by gender'
    },
    {
      id: 'ageRange',
      label: 'Age Category',
      type: 'select',
      placeholder: 'All Age Categories',
      options: [
        { value: '15-17', label: 'Child Youth (15-17 years)' },
        { value: '18-24', label: 'Core Youth (18-24 years)' },
        { value: '25-30', label: 'Young Adult (25-30 years)' }
      ],
      description: 'Filter by youth age categories'
    },
    {
      id: 'dateCreated',
      label: 'Created After',
      type: 'date',
      description: 'Show voters created after this date'
    }
  ];

  // Load voters data from API
  const loadVotersData = async () => {
    try {
    setIsLoading(true);
      const params = {
        page: currentPage,
        limit: itemsPerPage,
        search: searchQuery,
        sortBy,
        sortOrder,
        gender: filterValues.gender,
        ageRange: filterValues.ageRange,
        dateCreated: filterValues.dateCreated,
        status: activeTab
      };

      const response = await voterService.getVoters(params);
      
      if (response.success) {
        const transformedVoters = response.data.map(voter => voterService.transformVoterData(voter));
        setVoters(transformedVoters);
        setStats(response.stats);
        console.log('🔍 VoterListUpload - API response:', {
          success: response.success,
          dataLength: response.data?.length || 0,
          stats: response.stats,
          params
        });
      }
    } catch (error) {
      console.error('Error loading voters:', error);
      showErrorToast(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Load data on component mount and when dependencies change
  useEffect(() => {
    loadVotersData();
  }, [currentPage, itemsPerPage, searchQuery, sortBy, sortOrder, filterValues, activeTab]);

  // Debug pagination state changes
  useEffect(() => {
    console.log('🔍 VoterListUpload - pagination state changed:', {
      currentPage,
      itemsPerPage,
      tab: activeTab,
      totals: stats,
      totalItemsForTab,
      votersLength: voters.length,
      paginationTotal: paginationState.totalItems
    });
  }, [currentPage, itemsPerPage, stats.total, stats.active, stats.archived, totalItemsForTab, voters.length, paginationState.totalItems, activeTab]);

  // Sync pagination hook when stats.total changes
  useEffect(() => {
    if (paginationState.totalItems !== totalItemsForTab) {
      console.log('🔄 VoterListUpload - Syncing pagination with stats.total:', { 
        totalItemsForTab, 
        paginationTotal: paginationState.totalItems 
      });
    }
  }, [totalItemsForTab, paginationState.totalItems]);

  // Use voters directly since API handles filtering and pagination
  const pageSlice = voters;

  const handleSelectItem = (id) => setSelectedItems(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const handleSelectAll = () => setSelectedItems(selectedItems.length === pageSlice.length ? [] : pageSlice.map(v => v.voterId));
  
  // Export selected voters
  const exportSelectedVoters = async (selectedVoters) => {
    try {
      // For now, we'll use the PDF export with custom data
      // In a real implementation, you might want to create a separate API endpoint
      voterService.generatePDF(selectedVoters, 'selected');
    } catch (error) {
      console.error('Export error:', error);
      throw error;
    }
  };

  // Handle bulk operations
  const handleBulkOperation = async () => {
    if (!bulkAction || selectedItems.length === 0) {
      showErrorToast('Selection Required', 'Please select an action and at least one voter');
      return;
    }

    // Close the modal first
    setShowBulkModal(false);

    try {
      setIsBulkProcessing(true);
      
      if (bulkAction === 'archive') {
        // Use the specific confirmArchive method
        await confirmation.confirmArchive(
          `Are you sure you want to archive ${selectedItems.length} voter${selectedItems.length > 1 ? 's' : ''}?`,
          async () => {
            try {
                             // Execute bulk archive operations
               const promises = selectedItems.map(async (voterId) => {
                 const voter = voters.find(v => v.voterId === voterId);
                 if (voter && voter.isActive) {
                   return voterService.deleteVoter(voterId);
                 }
               });
              
              await Promise.all(promises);
              showSuccessToast('Bulk archive completed', `${selectedItems.length} voters archived successfully`);
              await loadVotersData(); // Reload data
              setSelectedItems([]); // Clear selection
            } catch (error) {
              console.error('Bulk archive error:', error);
              showErrorToast('Bulk archive failed', 'An error occurred during bulk archive operation');
            }
          }
        );
      } else if (bulkAction === 'restore') {
        // Use the specific confirmRestore method
        await confirmation.confirmRestore(
          `Are you sure you want to restore ${selectedItems.length} voter${selectedItems.length > 1 ? 's' : ''}?`,
          async () => {
            try {
                             // Execute bulk restore operations
               const promises = selectedItems.map(async (voterId) => {
                 const voter = voters.find(v => v.voterId === voterId);
                 if (voter && !voter.isActive) {
                   return voterService.restoreVoter(voterId);
                 }
               });
              
              await Promise.all(promises);
              showSuccessToast('Bulk restore completed', `${selectedItems.length} voters restored successfully`);
              await loadVotersData(); // Reload data
              setSelectedItems([]); // Clear selection
            } catch (error) {
              console.error('Bulk restore error:', error);
              showErrorToast('Bulk restore failed', 'An error occurred during bulk restore operation');
            }
          }
        );
      }
    } catch (error) {
      console.error('Bulk operation error:', error);
      showErrorToast('Bulk operation failed', 'An error occurred during bulk operation');
    } finally {
      setIsBulkProcessing(false);
      setBulkAction('');
    }
  };
  
  // Check if any filters are active
  const hasActiveFilters = Object.values(filterValues).some(value => {
    if (Array.isArray(value)) return value.length > 0;
    return value && value !== '';
  });

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
  };

  const handleFilterClear = (clearedValues) => {
    setFilterValues(clearedValues);
    setCurrentPage(1);
    console.log('Cleared filters');
  };

  // Form handlers - Updated to match StaffManagement style
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form data
    const validation = voterService.validateVoterData(formData);
    if (!validation.isValid) {
      showErrorToast(`Validation failed: ${validation.errors.join(', ')}`);
      return;
    }

    setIsSaving(true);
    try {
      const apiData = voterService.transformForAPI(formData);
      
      const response = await voterService.createVoter(apiData);
      if (response.success) {
        showSuccessToast('Voter created successfully');
        setFormCollapsed(true);
        // Reset form
        setFormData({
          firstName: '',
          lastName: '',
          middleName: '',
          suffix: '',
          birthDate: '',
          gender: '',
          voterId: ''
        });
        loadVotersData(); // Reload data
      }
    } catch (error) {
      showErrorToast(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const getDisplayFields = () => ({
    avatar: { firstName: 'firstName', lastName: 'lastName', email: null, picture: null },
    title: (v) => `${v.lastName}, ${v.firstName}`,
    subtitle: (v) => (
      <div className="space-y-1">
        {/* Personal Info - Each on separate line */}
        <div className="flex items-center text-sm text-gray-600">
          <Calendar className="w-3 h-3 mr-1 text-gray-400" />
          <span>Birth: {new Date(v.birthDate).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</span>
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <User className="w-3 h-3 mr-1 text-gray-400" />
          <span>Gender: {v.gender}</span>
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <span>Age: {v.age}</span>
        </div>
      </div>
    ),
    status: (v) => v.isActive ? 'active' : 'archived',
    date: 'createdAt'
  });

  // Action handlers
  const handleActionClick = async (action, item) => {
    try {
      switch (action) {
        case 'edit':
          setEditTarget(item);
          setEditData({
            firstName: item.firstName || '',
            lastName: item.lastName || '',
            middleName: item.middleName || '',
            suffix: item.suffix || '',
            birthDate: item.birthDate ? item.birthDate.split('T')[0] : '',
            gender: item.gender || ''
          });
          setIsEditOpen(true);
          break;
        case 'archive':
          await confirmation.confirmArchive(
            `Are you sure you want to archive ${item.firstName} ${item.lastName}?`,
            async () => {
              try {
                const response = await voterService.deleteVoter(item.voterId);
                if (response.success) {
                  showSuccessToast('Voter archived successfully');
                  loadVotersData();
                } else {
                  showErrorToast('Archive Failed', response.message || 'Failed to archive voter');
                }
              } catch (error) {
                showErrorToast('Archive Failed', error.message);
              }
            }
          );
          break;
        case 'restore':
          await confirmation.confirmRestore(
            `Are you sure you want to restore ${item.firstName} ${item.lastName}?`,
            async () => {
              try {
                const response = await voterService.restoreVoter(item.voterId);
                if (response.success) {
                  showSuccessToast('Voter restored successfully');
                  loadVotersData();
                } else {
                  showErrorToast('Restore Failed', response.message || 'Failed to restore voter');
                }
              } catch (error) {
                showErrorToast('Restore Failed', error.message);
              }
            }
          );
          break;
        default:
          break;
      }
    } catch (error) {
      showErrorToast(error.message);
    }
  };

  // Get action menu items based on voter status
  const getActionMenuItems = (voter) => {
    const items = [
      { id: 'edit', label: 'Edit', icon: <User className="w-4 h-4" />, action: 'edit' }
    ];

    if (voter.isActive) {
      items.push({ id: 'archive', label: 'Archive', icon: <Users className="w-4 h-4" />, action: 'archive' });
    } else {
      items.push({ id: 'restore', label: 'Restore', icon: <Users className="w-4 h-4" />, action: 'restore' });
    }

    return items;
  };

  // File handling functions
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setUploadedFile(file);
      setValidationResult(null);
    }
  };

  const clearFile = () => {
    setUploadedFile(null);
    setValidationResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateFile = async () => {
    if (!uploadedFile) return;

    setIsValidating(true);
    try {
      const response = await voterService.validateBulkImport(uploadedFile);
      if (response.success) {
        setValidationResult(response.data);
        const { totalRecords, validRecords, invalidRecords, errors = [] } = response.data;
        if (invalidRecords > 0) {
          showInfoToast(
            'Validation Complete', 
            `${validRecords}/${totalRecords} valid, ${invalidRecords} invalid records found. Check details below.`
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
    // Allow import if there is a file and either overall validation is true or invalid count is zero
    const invalidCount = validationResult?.suggestions?.invalidRecords ?? validationResult?.invalidRecords ?? 0;
    if (!uploadedFile || (!validationResult?.isValid && invalidCount !== 0)) return;

    setIsImporting(true);
    try {
      const response = await voterService.bulkImportVoters(uploadedFile);
      if (response.success) {
        const { total, successful, failed, errors = [] } = response.data;
        if (failed > 0) {
          showWarningToast(
            'Import Completed with Issues', 
            `${successful}/${total} imported, ${failed} failed. Check details below.`
          );
        } else {
          showSuccessToast(
            'Import Completed', 
            `${successful}/${total} records imported successfully.`
          );
        }
        clearFile();
        loadVotersData(); // Reload data
      }
    } catch (error) {
      showErrorToast('Import Failed', error.message);
    } finally {
      setIsImporting(false);
    }
  };

  // Derived UI state for bulk import stepper
  const hasFileSelected = !!uploadedFile;
  const hasValidation = !!validationResult;
  const isValidFile = !!validationResult?.isValid;
  const validationCounts = hasValidation ? (validationResult.suggestions || validationResult) : null;
  const invalidCount = hasValidation ? (validationCounts?.invalidRecords ?? 0) : 0;
  const canImport = hasValidation && (isValidFile || invalidCount === 0);
  const currentStep = !hasFileSelected ? 1 : !hasValidation ? 2 : canImport ? 3 : 2;

  return (
    <div className="space-y-5">
      <HeaderMainContent title="Voter Registry" description="Create, import, manage, and export voter records" />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <TabContainer activeTab={activeTab} onTabChange={setActiveTab} variant="underline" size="md">
              <Tab id="active" label="Active" count={stats.active} color="green" />
              <Tab id="archived" label="Archived" count={stats.archived} color="yellow" />
              <Tab id="all" label="All Voters" count={stats.total} color="blue" />
            </TabContainer>

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
                        placeholder="Search voters..." 
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
                      className={`inline-flex items-center border rounded-lg font-medium transition-all duration-200 ${
                        showFilterModal || hasActiveFilters
                          ? 'border-blue-500 text-blue-600 bg-blue-50' 
                          : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                      } px-2 py-1.5 sm:px-3 sm:py-2 whitespace-nowrap flex-shrink-0`}
                    >
                      <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Filter</span>
                      <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1" />
                      
                      {/* Filter Indicator */}
                      {hasActiveFilters && (
                        <div className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full border border-blue-200">
                          {Object.values(filterValues).filter(v => v && v !== '' && (!Array.isArray(v) || v.length > 0)).length}
                        </div>
                      )}
                    </button>

                    {/* Sort Button */}
                    <button 
                      ref={sortModal.triggerRef}
                      onClick={sortModal.toggleModal}
                      className={`inline-flex items-center border rounded-lg font-medium transition-all duration-200 ${
                        sortModal.isOpen || !sortModal.isDefaultSort
                          ? 'border-blue-500 text-blue-600 bg-blue-50' 
                          : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                      } px-2 py-1.5 sm:px-3 sm:py-2 whitespace-nowrap flex-shrink-0`}
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
                    formats={['csv','xlsx','pdf']} 
                    onExport={(format) => voterService.exportVoters(format, activeTab)} 
                    label="Export" 
                    size="md" 
                    position="auto" 
                    responsive={true} 
                    customFormats={{ 
                      pdf: { 
                        label: 'Export as PDF', 
                        icon: <FileText className="w-4 h-4" />, 
                        description: 'Portable document format', 
                        styles: [] 
                      } 
                    }}
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
                  { value: 'gender', label: 'Gender' },
                  { value: 'birth_date', label: 'Birth Date' },
                  { value: 'created_at', label: 'Date Created' },
                  { value: 'voter_id', label: 'Voter ID' }
                ]}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSortChange={handleSortChange}
                onReset={() => {
                  setSortBy('last_name');
                  setSortOrder('asc');
                }}
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

            <BulkActionsBar 
              selectedCount={selectedItems.length} 
              itemName="voter" 
              itemNamePlural="voters" 
              onBulkAction={() => {
                console.log('🔍 Bulk action clicked, selectedItems:', selectedItems);
                if (selectedItems.length === 0) {
                  showErrorToast('No voters selected', 'Please select voters to perform bulk operations');
                  return;
                }
                console.log('🔍 Showing bulk modal');
                setShowBulkModal(true);
              }} 
              exportConfig={{ 
                formats: ['csv','xlsx','pdf'], 
                onExport: async (format) => {
                  if (selectedItems.length === 0) {
                    showErrorToast('No voters selected', 'Please select voters to export');
                    return;
                  }
                  
                  try {
                    const selectedVoters = voters.filter(v => selectedItems.includes(v.voterId));
                    
                    await voterService.exportSelectedVoters(format, selectedVoters);
                    showSuccessToast('Export completed', `${selectedItems.length} voters exported as ${format.toUpperCase()}`);
                  } catch (error) {
                    console.error('Export error:', error);
                    showErrorToast('Export failed', error.message || 'Failed to export selected voters');
                  }
                }, 
                isExporting: false,
                customFormats: { 
                  csv: { 
                    label: 'Export as CSV', 
                    icon: <FileText className="w-4 h-4" />, 
                    description: 'Comma-separated values', 
                    styles: [] 
                  },
                  xlsx: { 
                    label: 'Export as Excel', 
                    icon: <FileText className="w-4 h-4" />, 
                    description: 'Microsoft Excel format', 
                    styles: [] 
                  },
                  pdf: { 
                    label: 'Export as PDF', 
                    icon: <FileText className="w-4 h-4" />, 
                    description: 'Portable document format', 
                    styles: [] 
                  } 
                }
              }} 
              primaryColor="blue" 
            />

            {/* Content Area */}
            {tabLoading ? (
              <LoadingSpinner 
                variant="spinner"
                message="Loading voter data..." 
                size="md"
                color="blue"
                height="h-64"
              />
            ) : (
              <DataTable
                data={pageSlice}
                selectedItems={selectedItems}
                onSelectItem={handleSelectItem}
                onSelectAll={handleSelectAll}
                getActionMenuItems={getActionMenuItems}
                onActionClick={handleActionClick}
                viewMode={viewMode}
                keyField="voterId"
                displayFields={getDisplayFields()}
                selectAllLabel="Select All Voters"
                emptyMessage="No voters found"
                styling={{
                  gridCols: 'grid-cols-1 lg:grid-cols-2',
                  cardHover: 'hover:border-blue-300 hover:shadow-xl hover:shadow-blue-100/50 hover:scale-[1.02]',
                  listHover: 'hover:bg-blue-50/30 hover:border-l-4 hover:border-l-blue-400',
                  theme: 'blue'
                }}
              />
            )}

            {/* Pagination */}
            {!tabLoading && (
              <Pagination
                key={`pagination-${activeTab}-${totalItemsForTab}-${itemsPerPage}`}
                currentPage={currentPage}
                totalItems={totalItemsForTab}
                itemsPerPage={itemsPerPage}
                onPageChange={handlePageChange}
                onItemsPerPageChange={handleItemsPerPageChange}
                itemName="voter"
                itemNamePlural="voters"
                showItemsPerPage={true}
                showInfo={true}
                size="md"
                variant="default"
                itemsPerPageOptions={[5, 10, 20, 50]}
              />
            )}
          </div>
        </div>

        {/* Right Column - Forms */}
        <div className="xl:col-span-1">
          {/* Bulk Import - Upload File */}
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
                  <p className="text-sm text-gray-600">Upload a CSV or Excel file to import voters</p>
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

              {/* Compact template links */}
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>Need a sample? Includes required columns.</span>
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => voterService.getBulkImportTemplate('csv')}
                    disabled={isValidating || isImporting}
                    className="inline-flex items-center text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
                  >
                    <FileText className="w-3.5 h-3.5 mr-1" /> CSV Template
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={() => voterService.getBulkImportTemplate('xlsx')}
                    disabled={isValidating || isImporting}
                    className="inline-flex items-center text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
                  >
                    <FileText className="w-3.5 h-3.5 mr-1" /> Excel Template
                  </button>
                </div>
              </div>

              {/* Choose File - Dropzone style */}
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
                <div className={`rounded-lg border p-3 ${isValidFile ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-gray-900">
                      {isValidFile ? 'Validation passed' : 'Validation completed with issues'}
            </div>
                    {isValidFile && <CheckCircle className="w-4 h-4 text-green-600" />}
              </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-gray-700">
                    <div className="bg-white border border-gray-100 rounded px-2 py-1">
                      <span className="font-medium">Total:</span> {validationCounts?.totalRecords ?? 0}
              </div>
                    <div className="bg-white border border-gray-100 rounded px-2 py-1">
                      <span className="font-medium">Valid:</span> {validationCounts?.validRecords ?? 0}
              </div>
                    <div className="bg-white border border-gray-100 rounded px-2 py-1">
                      <span className="font-medium">Invalid:</span> {validationCounts?.invalidRecords ?? 0}
          </div>
        </div>
                  {!isValidFile && (
                    <div className="mt-2 text-xs text-gray-600">
                      Fix the highlighted issues in your file and re-validate.
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
                  {isImporting ? 'Importing...' : 'Import Voters'}
                </button>
              )}
              
              <p className="text-xs text-gray-500">Supported formats: CSV, XLSX. Max 10MB.</p>
            </div>
          </div>

          {/* Add New Voter Form - Updated to match StaffManagement style */}
          <CollapsibleForm
            title="Add New Voter"
            description="Create a new voter profile"
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

              {/* Personal Details */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-blue-600" />
                  Personal Details
                </h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Birth Date *</label>
                  <input
                    type="date"
                    name="birthDate"
                    value={formData.birthDate}
                    onChange={handleFormChange}
                    required
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  />
                </div>

                                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Gender *</label>
                   <select
                     name="gender"
                     value={formData.gender}
                     onChange={handleFormChange}
                     required
                     className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                   >
                     <option value="">Select gender</option>
                     <option value="Male">Male</option>
                     <option value="Female">Female</option>
                   </select>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center space-x-3 pt-2">
                                 <button
                   type="button"
                   onClick={() => setFormData({
                     firstName: '',
                     lastName: '',
                     middleName: '',
                     suffix: '',
                     birthDate: '',
                     gender: ''
                   })}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-200 transition-all duration-200"
                >
                  Clear Form
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving ? 'Adding...' : 'Add Voter'}
                </button>
              </div>
            </form>
            </CollapsibleForm>
          </div>
        </div>

      <ToastContainer position="top-right" maxToasts={5} />
      {/* Edit Voter Modal */}
      {isEditOpen && editTarget && createPortal(
        <div className="fixed inset-0 flex items-center justify-center z-[99999] p-4 backdrop-blur-[1px]" onClick={() => setIsEditOpen(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Edit className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Edit Voter</h3>
                    <p className="text-sm text-gray-600">Update details for {editTarget.firstName} {editTarget.lastName}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsEditOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {/* Current Information */}
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-4">Current Voter Information</h4>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-blue-700">Full Name</label>
                      <p className="mt-1 text-sm text-blue-900 font-medium">{editTarget.firstName} {editTarget.lastName}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-blue-700">Status</label>
                      <div className="mt-1">
                        <Status status={editTarget.isActive ? 'active' : 'archived'} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-blue-700">Age</label>
                      <p className="mt-1 text-sm text-blue-900">
                        {editTarget.age} years old
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Edit Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">Edit Voter Details</h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name *
                    </label>
                    <input
                      type="text"
                      value={editData.firstName || ''}
                      onChange={(e) => setEditData(prev => ({ ...prev, firstName: e.target.value }))}
                      placeholder="Enter first name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      value={editData.lastName || ''}
                      onChange={(e) => setEditData(prev => ({ ...prev, lastName: e.target.value }))}
                      placeholder="Enter last name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Middle Name
                    </label>
                    <input
                      type="text"
                      value={editData.middleName || ''}
                      onChange={(e) => setEditData(prev => ({ ...prev, middleName: e.target.value }))}
                      placeholder="Enter middle name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Suffix
                    </label>
                    <input
                      type="text"
                      value={editData.suffix || ''}
                      onChange={(e) => setEditData(prev => ({ ...prev, suffix: e.target.value }))}
                      placeholder="Jr., Sr., III"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Birth Date *
                    </label>
                    <input
                      type="date"
                      value={editData.birthDate || ''}
                      onChange={(e) => setEditData(prev => ({ ...prev, birthDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Gender *
                    </label>
                    <select
                      value={editData.gender || ''}
                      onChange={(e) => setEditData(prev => ({ ...prev, gender: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    >
                      <option value="">Select gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                </div>

                {/* Preview Changes */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">Preview Changes</h4>
                  
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">New Full Name</label>
                        <p className="mt-1 text-sm text-gray-900 font-medium">
                          {(editData.firstName || editTarget.firstName)} {(editData.lastName || editTarget.lastName)}
                        </p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">New Birth Date</label>
                        <p className="mt-1 text-sm text-gray-900">
                          {editData.birthDate ? new Date(editData.birthDate).toLocaleDateString() : editTarget.birthDate}
                        </p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">New Age</label>
                        <p className="mt-1 text-sm text-gray-900">
                          {editData.birthDate ? 
                            `${Math.floor((new Date() - new Date(editData.birthDate)) / (1000 * 60 * 60 * 24 * 365.25))} years old` : 
                            `${editTarget.age} years old`
                          }
                        </p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Gender</label>
                        <p className="mt-1 text-sm text-gray-900">
                          {editData.gender || editTarget.gender}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Validation Status */}
                  <div className={`border rounded-lg p-4 ${!editData.firstName || !editData.lastName || !editData.birthDate || !editData.gender ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                    <div className="flex items-center space-x-2">
                      {!editData.firstName || !editData.lastName || !editData.birthDate || !editData.gender ? (
                        <>
                          <AlertCircle className="w-4 h-4 text-red-500" />
                          <span className="text-sm font-medium text-red-700">Please fill in all required fields</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-sm font-medium text-green-700">All fields are valid</span>
                        </>
                      )}
                    </div>
                  </div>
          </div>
        </div>
      </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setIsEditOpen(false);
                  setEditData({});
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!editData.firstName || !editData.lastName || !editData.birthDate || !editData.gender) {
                    showErrorToast('Validation failed', 'All fields are required');
                    return;
                  }
                  
                  try {
                    setIsEditSaving(true);
                    
                    const transformed = voterService.transformForAPI(editData);
                    const response = await voterService.updateVoter(editTarget.voterId, transformed);
                    
                    if (response.success) {
                      showSuccessToast('Voter updated', `${editData.firstName} ${editData.lastName} has been updated successfully`);
                      setIsEditOpen(false);
                      setEditData({});
                      
                      // Reload data
                      await loadVotersData();
                    } else {
                      showErrorToast('Update failed', response.message || 'Failed to update voter');
                    }
                  } catch (error) {
                    console.error('Update error:', error);
                    showErrorToast('Update failed', 'An error occurred while updating the voter');
                  } finally {
                    setIsEditSaving(false);
                  }
                }}
                disabled={!editData.firstName || !editData.lastName || !editData.birthDate || !editData.gender || isEditSaving}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isEditSaving ? 'Updating...' : 'Update Voter'}
              </button>
            </div>
            </div>
        </div>,
        document.body
      )}

      {/* Bulk Operations Modal */}
      {showBulkModal && createPortal(
        <div className="fixed inset-0 flex items-center justify-center z-[99999] p-4 backdrop-blur-[1px]" onClick={() => setShowBulkModal(false)}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Bulk Operations</h3>
              <p className="text-sm text-gray-600 mt-1">
                {selectedItems.length} voter{selectedItems.length > 1 ? 's' : ''} selected
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
                  <option value="archive">Archive Voters</option>
                  <option value="restore">Restore Voters</option>
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

      <ConfirmationModal {...confirmation.modalProps} />
    </div>
  );
};

export default VoterListUpload;


