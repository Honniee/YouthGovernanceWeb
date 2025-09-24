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
  ChevronUp
} from 'lucide-react';
import { HeaderMainContent, TabContainer, Tab, useTabState, ActionMenu, SearchBar, FilterButton, SortButton, SortModal, Pagination, useSortModal, usePagination, Avatar, Status, ExportButton, useStaffExport, useBulkExport, LoadingSpinner, BulkActionsBar, CollapsibleForm, DataTable, ViewStaffModal, EditStaffModal } from '../../components/portal_main_content';
import { ToastContainer, showStaffSuccessToast, showErrorToast, ConfirmationModal } from '../../components/universal';
import useConfirmation from '../../hooks/useConfirmation';
import staffService from '../../services/staffService.js';

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
  
  // Bulk upload state
  const [uploadFile, setUploadFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const handleUploadFileChange = (e) => {
    const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
    setUploadFile(file);
  };
  
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;

    // Validate file
    const validation = staffService.validateBulkImportFile(uploadFile);
    if (!validation.isValid) {
      showErrorToast('Invalid File', validation.errors.join(', '));
      return;
    }

    setIsUploading(true);
    
    try {
      const response = await staffService.bulkImportStaff(uploadFile, (progress) => {
        // You can add progress tracking here if needed
        console.log(`Upload progress: ${progress}%`);
      });

      if (response.success) {
        const { summary, imported, errors } = response.data;
        
        let message = `✅ Bulk import completed!\n\n`;
        message += `📊 Summary:\n`;
        message += `• Total rows: ${summary.totalRows}\n`;
        message += `• Valid records: ${summary.validRecords}\n`;
        message += `• Successfully imported: ${summary.importedRecords}\n`;
        message += `• Errors: ${summary.errors}\n\n`;

        if (imported.length > 0) {
          message += `✅ Successfully imported staff:\n`;
          imported.slice(0, 5).forEach(staff => {
            message += `• ${staff.name} (${staff.lydoId})\n`;
          });
          if (imported.length > 5) {
            message += `... and ${imported.length - 5} more\n`;
          }
          message += `\n📧 Email Notifications:\n`;
          message += `• Welcome emails with login credentials sent to all ${summary.importedRecords} staff members\n`;
          imported.slice(0, 3).forEach(staff => {
            message += `  → ${staff.name}: ${staff.personalEmail}\n`;
          });
          if (imported.length > 3) {
            message += `  → ... and ${imported.length - 3} more staff emails\n`;
          }
          message += `• Admin notification sent confirming bulk import completion\n`;
          message += `• All staff members can now log in with their credentials\n\n`;
          message += `✨ Check your email for admin confirmation!`;
        }

        if (errors.length > 0) {
          message += `\n❌ Errors encountered:\n`;
          errors.slice(0, 3).forEach(error => {
            message += `• ${error}\n`;
          });
          if (errors.length > 3) {
            message += `... and ${errors.length - 3} more errors\n`;
          }
        }

        // Show beautiful success toast instead of alert
        showStaffSuccessToast('imported', null, [
          {
            label: `View ${imported.length} Imported Staff`,
            onClick: () => {
              // Set filter to show all staff after import
              setActiveTab('all');
              setCurrentPage(1);
            }
          },
          {
            label: "Import More",
            onClick: () => {
              setUploadCollapsed(false);
              setUploadFile(null);
            }
          }
        ]);
        
        // Reload staff data if any were imported
        if (summary.importedRecords > 0) {
          console.log('🔄 Reloading staff data after successful import...');
          await loadStaffData();
          await loadStaffStats();
          console.log('✅ Staff data reloaded');
        }
      } else {
        showErrorToast('Import Failed', response.message);
      }
    } catch (error) {
      console.error('Bulk import error:', error);
      showErrorToast('Import Error', 'An error occurred during import. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadFile(null);
    }
  };
  
  // Collapse state for Bulk Import
  const [uploadCollapsed, setUploadCollapsed] = useState(true);

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
  const mainExport = useStaffExport({
    staffService,
    statusFilter,
    onSuccess: () => showStaffSuccessToast('exported', null, [
      {
        label: "Export Another",
        onClick: () => window.location.reload() // Simple refresh for now
      }
    ]),
    onError: (error) => showErrorToast('Export Failed', error.message)
  });

  const bulkExportHook = useBulkExport({
    staffService,
    selectedItems,
    statusFilter,
    onSuccess: () => {
      console.log('Bulk export completed for selected items:', selectedItems);
      showStaffSuccessToast('exported', null, [
        {
          label: `Exported ${selectedItems.length} staff members`,
          onClick: () => {} // Just for display
        }
      ]);
    },
    onError: (error) => {
      console.log('Bulk export failed for selected items:', selectedItems, 'Error:', error);
      showErrorToast('Bulk Export Failed', error.message);
    }
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
        console.error('Failed to load staff:', response.message);
        showErrorToast('Load Error', 'Failed to load staff data: ' + response.message);
      }
    } catch (error) {
      console.error('Error loading staff:', error);
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
        console.log('Staff stats loaded:', response.data);
      } else {
        console.error('Failed to load staff stats:', response.message);
      }
    } catch (error) {
      console.error('Error loading staff stats:', error);
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
      console.error('Error updating status:', error);
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
      console.error('Error deleting staff:', error);
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
      console.error('Error updating staff:', error);
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
      console.error('Error creating staff:', error);
      showErrorToast('Creation Error', 'Error creating staff member');
    }
  };



  // Tab styling is now handled by the reusable Tab component



  // Sort modal content is now handled by the reusable SortModal component

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
                    formats={['csv', 'pdf']}
                    onExport={mainExport.handleExport}
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
              formats: ['csv', 'pdf'],
              onExport: bulkExportHook.handleExport,
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
                gridCols: 'grid-cols-1 lg:grid-cols-2',
                cardHover: 'hover:border-blue-300 hover:shadow-xl hover:shadow-blue-100/50 hover:scale-[1.02]',
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
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-2">Select file</span>
                <input
                  type="file"
                  accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                  onChange={handleUploadFileChange}
                  className="block w-full text-sm text-gray-700 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                />
              </label>
              {uploadFile && (
                <div className="text-sm text-gray-600">
                  Selected: <span className="font-medium text-gray-900">{uploadFile.name}</span>
                </div>
              )}
              <div className="flex items-center space-x-3 pt-1">
                <button
                  type="button"
                  onClick={() => staffService.downloadTemplate('csv')}
                  disabled={isUploading}
                  className="px-4 py-2 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  📄 CSV Template
                </button>
                <button
                  type="button"
                  onClick={() => staffService.downloadTemplate('xlsx')}
                  disabled={isUploading}
                  className="px-4 py-2 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  📊 Excel Template
                </button>
              </div>
              
              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setUploadFile(null)}
                  disabled={!uploadFile || isUploading}
                  className="px-4 py-2 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={!uploadFile || isUploading}
                  className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {isUploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
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

      {/* Universal Toast Notifications - Safe Addition */}
      <ToastContainer position="top-right" maxToasts={5} />
      
      {/* Universal Confirmation Modal - Beautiful replacement for browser confirm() */}
      <ConfirmationModal {...confirmation.modalProps} />
    </div>
  );
};

export default StaffManagement;