import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { 
  Grid,
  List,
  Eye,
  X,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Save,
  UserPlus,
  ChevronDown,
  ArrowUpDown,
  Filter,
  Edit,
  FileText,
  UserCheck,
  UserX,
  Shield,
  ShieldCheck,
  BarChart3,
  Activity,
  AlertCircle,
} from 'lucide-react';
import { HeaderMainContent, TabContainer, Tab, useTabState, ActionMenu, SearchBar, SortModal, FilterModal, BulkModal, Pagination, useSortModal, useBulkModal, usePagination, Avatar, Status, ExportButton, useExport, LoadingSpinner, BulkActionsBar, CollapsibleForm, DataTable } from '../../components/portal_main_content';
import { ToastContainer, showSuccessToast, showErrorToast, showInfoToast, ConfirmationModal, useConfirmation } from '../../components/universal';
import youthService from '../../services/youthService.js';

const YouthManagement = () => {
  const navigate = useNavigate();

  // Tab state hook for status filtering
  const { activeTab, setActiveTab } = useTabState('all', async (tabId) => {
    setTabLoading(true);
    try {
      // Filter youth by status
      const statusFilter = tabId === 'all' ? '' : tabId;
      // TODO: Implement API filtering
      console.log('Filtering youth by status:', statusFilter);
    } finally {
      setTabLoading(false);
    }
  });

  // UI state
  const [viewMode, setViewMode] = useState('grid');
  const [selectedItems, setSelectedItems] = useState([]);
  const [tabLoading, setTabLoading] = useState(false);

  // Mock data for survey-driven youth management
  const [youthData, setYouthData] = useState([]);

  // Tab counts state - following SurveyBatches pattern
  const [tabCounts, setTabCounts] = useState({ total: 0, active: 0, manual_validation: 0, response_rejected: 0, archived: 0 });

  // Calculate tab counts from youth data
  useEffect(() => {
    const counts = {
      total: youthData.length,
      active: youthData.filter(y => y.status === 'Active').length,
      manual_validation: youthData.filter(y => y.status === 'Manual Validation').length,
      response_rejected: youthData.filter(y => y.validationStatus === 'Response Rejected').length,
      archived: youthData.filter(y => y.status === 'Archived').length
    };
    setTabCounts(counts);
  }, [youthData]);

  // Load youth data from backend
  const loadYouth = async () => {
    try {
      setTabLoading(true);
      const resp = await youthService.getYouth();
      if (resp?.success) {
        const mapped = (resp.data || resp.items || []).map(youthService.transformYouth);
        setYouthData(mapped);
      } else if (Array.isArray(resp)) {
        setYouthData(resp.map(youthService.transformYouth));
      }
    } catch (e) {
      showErrorToast('Failed to load youth', e?.message || '');
    } finally {
      setTabLoading(false);
    }
  };

  useEffect(() => { loadYouth(); }, []);

  // Filter modal state
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterValues, setFilterValues] = useState({
    ageRange: '',
    barangay: '',
    registrationDate: ''
  });
  const filterTriggerRef = React.useRef(null);
  
  // Form state for adding new youth
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    age: '',
    barangay: '',
    address: ''
  });
  
  // Collapse state for Add Youth form
  const [formCollapsed, setFormCollapsed] = useState(true);
  
  // Bulk operations state
  const [bulkAction, setBulkAction] = useState('');
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // Youth details modal state
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [selectedYouth, setSelectedYouth] = useState(null);
  const [isEditingSaving, setIsEditingSaving] = useState(false);

  // Confirmation modal hook
  const confirmation = useConfirmation();

  // Modal state management using custom hooks
  const sortModal = useSortModal('createdAt', 'desc', (newSortBy, newSortOrder) => {
    // TODO: Implement sorting
    console.log('Sorting by:', newSortBy, newSortOrder);
  });
  const bulkModal = useBulkModal();
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const totalYouth = youthData.length;

  // Pagination state management using custom hook
  const paginationHook = usePagination({
    initialPage: currentPage,
    initialItemsPerPage: itemsPerPage,
    totalItems: totalYouth,
    onPageChange: setCurrentPage,
    onItemsPerPageChange: setItemsPerPage
  });

  // Check if any filters are active
  const hasActiveFilters = Object.values(filterValues).some(value => {
    if (Array.isArray(value)) return value.length > 0;
    return value && value !== '';
  });

  // Handle filter changes
  const handleFilterChange = (newValues) => {
    setFilterValues(newValues);
  };

  const handleFilterApply = (appliedValues) => {
    setFilterValues(appliedValues);
    // TODO: Implement filtering
    console.log('Applying filters:', appliedValues);
  };

  const handleFilterClear = (clearedValues) => {
    setFilterValues(clearedValues);
    // TODO: Implement filter clearing
    console.log('Clearing filters:', clearedValues);
  };

  // Get action menu items for a youth member
  const getActionMenuItems = (item) => {
    const items = [
      {
        id: 'view',
        label: 'View Details',
        icon: <Eye className="w-4 h-4" />,
        action: 'view'
      }
    ];

    // Status-specific actions
    switch (item.status) {
      case 'Active':
        items.push({
          id: 'view_surveys',
          label: 'View Survey History',
          icon: <FileText className="w-4 h-4" />,
          action: 'view_surveys'
        });
        break;
        
      case 'Manual Validation':
        items.push({
          id: 'validate',
          label: 'Validate Youth',
          icon: <ShieldCheck className="w-4 h-4" />,
          action: 'validate'
        });
        items.push({
          id: 'reject',
          label: 'Reject Youth',
          icon: <UserX className="w-4 h-4" />,
          action: 'reject'
        });
        break;
        
      case 'Archived':
        items.push({
          id: 'view_surveys',
          label: 'View Survey History',
          icon: <FileText className="w-4 h-4" />,
          action: 'view_surveys'
        });
        break;
    }

    return items;
  };

  const handleActionClick = async (action, item) => {
    setSelectedYouth(item);
    
    switch (action) {
      case 'view':
        setShowViewModal(true);
        break;
      case 'validate':
        setShowValidationModal(true);
        break;
      case 'reject':
        {
          const confirmed = await confirmation.showConfirmation({
            title: 'Reject Youth',
            message: `Are you sure you want to reject ${item.name}? This will mark them as invalid and remove their survey responses.`,
            confirmText: 'Reject',
            cancelText: 'Cancel',
            variant: 'warning'
          });
          if (confirmed) {
            confirmation.setLoading(true);
            try {
              // Simulate API call
              await new Promise(resolve => setTimeout(resolve, 1000));
              showSuccessToast('Youth rejected', `${item.name} has been rejected successfully`);
              // Update local data - remove from list
              setYouthData(prev => prev.filter(y => y.id !== item.id));
            } catch (error) {
              showErrorToast('Rejection failed', 'Failed to reject youth member');
            } finally {
              confirmation.hideConfirmation();
            }
          }
        }
        break;
      case 'view_surveys':
        // TODO: Implement survey history modal
        showInfoToast('Survey History', 'Survey history feature coming soon');
        break;
    }
  };

  const handleSelectItem = (id) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedItems(selectedItems.length === youthData.length ? [] : youthData.map(item => item.id));
  };

  const handleSearchChange = (newQuery) => {
    // TODO: Implement search
    console.log('Searching for:', newQuery);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.firstName || !formData.lastName || !formData.email) {
      showErrorToast('Validation failed', 'Please fill in all required fields');
      return;
    }
    
    try {
      setIsEditingSaving(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Create new youth object
      const newYouth = {
        id: `Y${String(youthData.length + 1).padStart(3, '0')}`,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        age: parseInt(formData.age),
        status: 'pending',
        barangay: formData.barangay,
        registrationDate: new Date().toISOString().split('T')[0],
        lastActivity: new Date().toISOString().split('T')[0],
        profilePicture: null,
        isActive: false,
        deactivated: false,
        createdAt: new Date().toISOString()
      };
      
      showSuccessToast('Youth registered', `${formData.firstName} ${formData.lastName} has been registered successfully`, [
        {
          label: "View Profile",
          onClick: () => {
            setSelectedYouth(newYouth);
            setShowViewModal(true);
            setFormCollapsed(true);
          },
          variant: 'primary'
        },
        {
          label: "Add Another",
          onClick: () => {
            setFormCollapsed(false);
          }
        }
      ]);
      
      // Add to local data
      setYouthData(prev => [...prev, newYouth]);
      
      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        age: '',
        barangay: '',
        address: ''
      });
      setFormCollapsed(true);
      
    } catch (error) {
      console.error('Error registering youth:', error);
      showErrorToast('Registration Failed', 'Failed to register youth member');
    } finally {
      setIsEditingSaving(false);
    }
  };

  // Get youth display fields for DataTable - following SurveyBatches pattern
  const getYouthDisplayFields = () => ({
    title: (item) => {
  return (
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex-shrink-0">
            <User className="w-4 h-4" />
          </span>
          <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 min-w-0">
                <span className="font-medium text-gray-900 text-sm sm:text-base truncate">{item.name}</span>
                <span className="inline-flex items-center px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 flex-shrink-0">
                  {item.id}
                </span>
            </div>
          </div>
        </div>
        </div>
      );
    },
    subtitle: (item) => {
      return (
        <div className="space-y-1.5 sm:space-y-2">
          {/* Contact Information */}
          <div className="flex items-center text-xs sm:text-sm text-gray-600">
            <Mail className="w-3 h-3 mr-1 flex-shrink-0" />
            <span className="truncate">{item.email}</span>
          </div>
          <div className="flex items-center text-xs sm:text-sm text-gray-600">
            <Phone className="w-3 h-3 mr-1 flex-shrink-0" />
            <span className="truncate">{item.phone}</span>
          </div>
          
          {/* Location and Age */}
          <div className="flex items-center text-xs sm:text-sm text-gray-600">
            <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
            <span className="truncate">{item.location} • Age: {item.age}</span>
          </div>
          
          {/* Survey Statistics */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-1 sm:gap-2">
            {/* Surveys Answered */}
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 w-fit">
              <FileText className="w-3 h-3 mr-1 flex-shrink-0" />
              <span className="truncate">{item.surveysAnswered} Surveys</span>
            </span>
            
            {/* Validation Status */}
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border w-fit ${
              item.validationStatus === 'Auto-Validated' 
                ? 'bg-green-50 text-green-700 border-green-200'
                : item.validationStatus === 'Pending Manual'
                ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                : 'bg-blue-50 text-blue-700 border-blue-200'
            }`}>
              <ShieldCheck className="w-3 h-3 mr-1 flex-shrink-0" />
              <span className="truncate">{item.validationStatus}</span>
                </span>
            
            {/* Not in Voters List Indicator */}
            {!item.isInVotersList && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200 w-fit">
                <AlertCircle className="w-3 h-3 mr-1 flex-shrink-0" />
                <span className="truncate">Not in Voters List</span>
              </span>
            )}
            
            {/* Last Survey Date */}
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200 w-fit">
              <Calendar className="w-3 h-3 mr-1 flex-shrink-0" />
              <span className="truncate">Last: {new Date(item.lastSurveyDate).toLocaleDateString()}</span>
            </span>
        </div>
        </div>
      );
    },
    status: (item) => item.status,
    date: 'createdAt',
    badge: (item) => {
      return {
        text: `${item.age} years old`,
        className: 'bg-blue-100 text-blue-700 border border-blue-200'
      };
    }
  });

  return (
    <div className="space-y-5">
      {/* Header Section - Following SurveyBatches pattern */}
      <HeaderMainContent
        title="Youth Management"
        description="Manage youth survey participants, validation status, and survey history"
      />

      {/* Main Content Grid - Same layout as SurveyBatches */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column - Youth List */}
        <div className="xl:col-span-2">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Tabs - Following SurveyBatches pattern */}
            <TabContainer
              activeTab={activeTab}
              onTabChange={setActiveTab}
              variant="underline"
              size="md"
            >
              <Tab 
                id="all" 
                label="All Youth" 
                shortLabel="All"
                count={tabCounts.total} 
                color="blue"
              />
              <Tab 
                id="active" 
                label="Active Youth" 
                count={tabCounts.active} 
                color="green"
              />
              <Tab 
                id="manual_validation" 
                label="Manual Validation" 
                count={tabCounts.manual_validation} 
                color="yellow"
              />
              <Tab 
                id="response_rejected" 
                label="Response Rejected" 
                count={tabCounts.response_rejected} 
                color="orange"
              />
              <Tab 
                id="archived" 
                label="Archived Youth" 
                count={tabCounts.archived} 
                color="gray"
              />
            </TabContainer>

            {/* Controls - Exact same structure as SurveyBatches */}
        <div className="px-5 py-4 border-t border-gray-100">
              <div className="flex items-center justify-between gap-4">
            {/* Left Controls */}
                <div className="flex items-center gap-3 overflow-x-auto pb-2 md:pb-0 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                  <div className="flex items-center space-x-3 min-w-max">
                    {/* Search Bar */}
                    <div className="flex-shrink-0">
                      <SearchBar
                        value=""
                        onChange={handleSearchChange}
                        placeholder="Search youth members..." 
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
                    onExport={(format) => console.log('Exporting as:', format)}
                    isExporting={false}
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
                        
              {/* Sort Modal */}
              <SortModal
                isOpen={sortModal.isOpen}
                onClose={sortModal.closeModal}
                triggerRef={sortModal.triggerRef}
                title="Sort Options"
                sortFields={[
                  { value: 'firstName', label: 'First Name' },
                  { value: 'lastName', label: 'Last Name' },
                  { value: 'age', label: 'Age' },
                  { value: 'registrationDate', label: 'Registration Date' },
                  { value: 'barangay', label: 'Barangay' },
                  { value: 'createdAt', label: 'Date Created' }
                ]}
                sortBy={sortModal.sortBy}
                sortOrder={sortModal.sortOrder}
                onSortChange={sortModal.updateSort}
                onReset={sortModal.resetSort}
                defaultSortBy="createdAt"
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
                    id: 'ageRange',
                    label: 'Age Range',
                    type: 'select',
                    options: [
                      { value: '15-20', label: '15-20 years' },
                      { value: '21-25', label: '21-25 years' },
                      { value: '26-30', label: '26-30 years' }
                    ],
                    description: 'Filter by age range'
                  },
                  {
                    id: 'barangay',
                    label: 'Barangay',
                    type: 'select',
                    options: [
                      { value: 'barangay1', label: 'Barangay 1' },
                      { value: 'barangay2', label: 'Barangay 2' },
                      { value: 'barangay3', label: 'Barangay 3' }
                    ],
                    description: 'Filter by barangay'
                  },
                  {
                    id: 'registrationDate',
                    label: 'Registered After',
                    type: 'date',
                    description: 'Show youth registered after this date'
                  }
                ]}
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
              itemName="youth member"
              itemNamePlural="youth members"
              onBulkAction={() => bulkModal.showModal()}
              exportConfig={{
                formats: ['csv', 'xlsx', 'pdf'],
                onExport: (format) => console.log('Bulk export as:', format),
                isExporting: false,
                customFormats: { 
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
                message="Loading youth members..." 
                size="md"
                color="blue"
                height="h-64"
              />
            ) : (
              <DataTable
                data={youthData}
                selectedItems={selectedItems}
                onSelectItem={handleSelectItem}
                onSelectAll={handleSelectAll}
                getActionMenuItems={getActionMenuItems}
                onActionClick={handleActionClick}
                viewMode={viewMode}
                keyField="id"
                displayFields={getYouthDisplayFields()}
                selectAllLabel="Select All Youth Members"
                emptyMessage="No youth members found"
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
                currentPage={currentPage}
                totalItems={totalYouth}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setItemsPerPage}
                itemName="youth member"
                itemNamePlural="youth members"
                showItemsPerPage={true}
                showInfo={true}
                size="md"
                variant="default"
                itemsPerPageOptions={[5, 10, 20, 50]}
              />
            )}
          </div>
                        </div>
                        
        {/* Right Column - Validation Queue & Analytics - Following SurveyBatches pattern */}
        <div className="xl:col-span-1 space-y-6">
          {/* Validation Queue Summary */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-yellow-50 to-amber-50">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-yellow-600" />
                </div>
                        <div>
                  <h3 className="text-sm font-semibold text-gray-900">Manual Validation Queue</h3>
                  <p className="text-xs text-gray-600">Youth requiring SK validation</p>
                </div>
                        </div>
                      </div>
                      
            <div className="p-5 space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-600">{tabCounts.manual_validation}</div>
                <div className="text-sm text-gray-600">Pending Validation</div>
              </div>
              
              {tabCounts.manual_validation > 0 && (
                <div className="space-y-2">
                  <div className="text-xs text-gray-500">Recent submissions:</div>
                  {youthData
                    .filter(y => y.status === 'Manual Validation')
                    .slice(0, 3)
                    .map(youth => (
                      <div key={youth.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">{youth.name}</div>
                          <div className="text-xs text-gray-500">{youth.location}</div>
                        </div>
                        <button 
                          onClick={() => {
                            setSelectedYouth(youth);
                            setShowValidationModal(true);
                          }}
                          className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded hover:bg-yellow-200 transition-colors"
                        >
                          Validate
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                          <button
                onClick={() => setActiveTab('manual_validation')}
                className="w-full px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-lg hover:bg-yellow-700 transition-colors"
                          >
                View All Pending
                          </button>
                        </div>
                      </div>
                      
          {/* Youth Statistics */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                </div>
                        <div>
                  <h3 className="text-sm font-semibold text-gray-900">Youth Statistics</h3>
                  <p className="text-xs text-gray-600">Survey participation overview</p>
                </div>
              </div>
                        </div>
                        
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{tabCounts.active}</div>
                  <div className="text-xs text-gray-600">Active Youth</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{tabCounts.total}</div>
                  <div className="text-xs text-gray-600">Total Youth</div>
                </div>
                        </div>
                        
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Auto-Validated</span>
                  <span className="font-medium">{youthData.filter(y => y.validationStatus === 'Auto-Validated').length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Manually Validated</span>
                  <span className="font-medium">{youthData.filter(y => y.validationStatus === 'Manually Validated').length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Pending Manual</span>
                  <span className="font-medium">{youthData.filter(y => y.validationStatus === 'Pending Manual').length}</span>
                </div>
              </div>
            </div>
                        </div>
                        
          {/* Recent Activity */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-green-600" />
                </div>
                        <div>
                  <h3 className="text-sm font-semibold text-gray-900">Recent Activity</h3>
                  <p className="text-xs text-gray-600">Latest survey responses</p>
                </div>
                        </div>
                      </div>
                      
            <div className="p-5 space-y-3">
              {youthData
                .sort((a, b) => new Date(b.lastSurveyDate) - new Date(a.lastSurveyDate))
                .slice(0, 4)
                .map(youth => (
                  <div key={youth.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg transition-colors">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{youth.name}</div>
                      <div className="text-xs text-gray-500">
                        {youth.surveysAnswered} surveys • {new Date(youth.lastSurveyDate).toLocaleDateString()}
                      </div>
                    </div>
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      youth.validationStatus === 'Auto-Validated' ? 'bg-green-400' :
                      youth.validationStatus === 'Manually Validated' ? 'bg-blue-400' :
                      'bg-yellow-400'
                    }`}></div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Youth Details View Modal - Following SurveyBatches modal pattern */}
      {showViewModal && selectedYouth && createPortal(
        <div className="fixed inset-0 flex items-center justify-center z-[99999] p-4 backdrop-blur-[1px]" onClick={() => setShowViewModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-100">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{selectedYouth.firstName} {selectedYouth.lastName}</h3>
                    <p className="text-sm text-gray-600">Youth Member Profile</p>
                  </div>
                </div>
                        <button 
                  onClick={() => setShowViewModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                  <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">Personal Information</h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Full Name</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedYouth.firstName} {selectedYouth.lastName}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedYouth.email}</p>
              </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedYouth.phone}</p>
            </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Age</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedYouth.age} years old</p>
              </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <div className="mt-1">
                      <Status status={selectedYouth.status} />
            </div>
          </div>
        </div>
                
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">Location & Registration</h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Barangay</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedYouth.barangay}</p>
      </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Registration Date</label>
                    <p className="mt-1 text-sm text-gray-900">{new Date(selectedYouth.registrationDate).toLocaleDateString()}</p>
              </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Last Activity</label>
                    <p className="mt-1 text-sm text-gray-900">{new Date(selectedYouth.lastActivity).toLocaleDateString()}</p>
            </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end space-x-3">
              <button
                onClick={() => setShowViewModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setFormData({
                    firstName: selectedYouth.firstName,
                    lastName: selectedYouth.lastName,
                    email: selectedYouth.email,
                    phone: selectedYouth.phone,
                    age: selectedYouth.age,
                    barangay: selectedYouth.barangay,
                    address: ''
                  });
                  setShowEditModal(true);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Edit Profile
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Bulk Operations Modal */}
      <BulkModal
        isOpen={bulkModal.isOpen}
        onClose={bulkModal.hideModal}
        title="Bulk Operations"
        description={`${selectedItems.length} youth member${selectedItems.length > 1 ? 's' : ''} selected`}
        actions={[
          { value: 'approve', label: 'Approve Registrations' },
          { value: 'deactivate', label: 'Deactivate Members' },
          { value: 'export', label: 'Export Selected' }
        ]}
        selectedAction={bulkAction}
        onActionChange={setBulkAction}
        onExecute={async () => {
          try {
            setIsBulkProcessing(true);
            
            // Simulate bulk operations
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            showSuccessToast('Bulk operation completed', `${bulkAction} operation completed successfully`);
            setSelectedItems([]);
            
          } catch (error) {
            showErrorToast('Bulk operation failed', 'An error occurred during bulk operation');
          } finally {
            setIsBulkProcessing(false);
            bulkModal.hideModal();
            setBulkAction('');
          }
        }}
        isProcessing={isBulkProcessing}
      />

      {/* Manual Validation Modal */}
      {showValidationModal && selectedYouth && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowValidationModal(false)}></div>
          <div className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Manual Validation</h3>
                <button
                  onClick={() => setShowValidationModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-2"
                >
                  <X className="w-5 h-5" />
                  </button>
              </div>
                </div>
                
            <div className="p-6 space-y-6 max-h-[calc(90vh-200px)] overflow-y-auto">
              {/* Youth Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Youth Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Name:</span>
                    <span className="ml-2 font-medium">{selectedYouth.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Age:</span>
                    <span className="ml-2 font-medium">{selectedYouth.age}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Email:</span>
                    <span className="ml-2 font-medium">{selectedYouth.email}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Location:</span>
                    <span className="ml-2 font-medium">{selectedYouth.location}</span>
                  </div>
                </div>
                </div>
                
              {/* Survey History */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Survey History</h4>
                <div className="space-y-2">
                  {selectedYouth.surveys.map((survey, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{survey.name}</p>
                        <p className="text-xs text-gray-600">Date: {survey.date}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        survey.status === 'Validated' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {survey.status}
                  </span>
              </div>
            ))}
          </div>
            </div>

              {/* Validation Options */}
                    <div>
                <h4 className="font-medium text-gray-900 mb-3">Validation Decision</h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <input type="radio" id="validate" name="validation" value="validate" className="text-green-600" />
                    <label htmlFor="validate" className="text-sm">
                      <span className="font-medium text-green-700">Validate Youth</span>
                      <span className="block text-gray-600">Confirm this youth is legitimate and add to voters list</span>
                    </label>
                    </div>
                  <div className="flex items-center space-x-3">
                    <input type="radio" id="reject_response" name="validation" value="reject_response" className="text-orange-600" />
                    <label htmlFor="reject_response" className="text-sm">
                      <span className="font-medium text-orange-700">Reject Survey Response</span>
                      <span className="block text-gray-600">Reject this specific response but allow youth to submit new surveys</span>
                    </label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <input type="radio" id="reject_youth" name="validation" value="reject_youth" className="text-red-600" />
                    <label htmlFor="reject_youth" className="text-sm">
                      <span className="font-medium text-red-700">Reject Youth Completely</span>
                      <span className="block text-gray-600">Mark youth as invalid and remove from system permanently</span>
                    </label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <input type="radio" id="pending" name="validation" value="pending" className="text-yellow-600" />
                    <label htmlFor="pending" className="text-sm">
                      <span className="font-medium text-yellow-700">Keep Pending</span>
                      <span className="block text-gray-600">Require more information before validation</span>
                    </label>
                </div>
            </div>
          </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Validation Notes</label>
                <textarea 
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows="3"
                  placeholder="Add any notes about this validation decision..."
                ></textarea>
            </div>
            </div>
            
            <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-end space-x-3">
              <button 
                onClick={() => setShowValidationModal(false)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
                <button
                onClick={() => {
                  const selectedValidation = document.querySelector('input[name="validation"]:checked');
                  if (!selectedValidation) {
                    showErrorToast('Selection Required', 'Please select a validation decision');
                    return;
                  }

                  const validationType = selectedValidation.value;
                  
                  switch (validationType) {
                    case 'validate':
                      showSuccessToast('Youth Validated', `${selectedYouth.name} has been validated successfully`);
                      setYouthData(prev => prev.map(y => 
                        y.id === selectedYouth.id 
                          ? { ...y, status: 'Active', validationStatus: 'Manually Validated' }
                          : y
                      ));
                      break;
                      
                    case 'reject_response':
                      showSuccessToast('Response Rejected', `${selectedYouth.name}'s survey response has been rejected. They can submit new surveys.`);
                      setYouthData(prev => prev.map(y => 
                        y.id === selectedYouth.id 
                          ? { ...y, validationStatus: 'Response Rejected' }
                          : y
                      ));
                      break;
                      
                    case 'reject_youth':
                      showSuccessToast('Youth Rejected', `${selectedYouth.name} has been permanently rejected and removed from the system.`);
                      setYouthData(prev => prev.filter(y => y.id !== selectedYouth.id));
                      break;
                      
                    case 'pending':
                      showInfoToast('Status Updated', `${selectedYouth.name} remains in pending status.`);
                      break;
                  }
                  
                  setShowValidationModal(false);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Submit Validation
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Universal Toast Container */}
      <ToastContainer position="top-right" maxToasts={5} />
      
      {/* Universal Confirmation Modal */}
      <ConfirmationModal {...confirmation.modalProps} />
    </div>
  );
};

export default YouthManagement;
