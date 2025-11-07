import React, { useState, useEffect, useMemo } from 'react';
import { 
  User,
  Eye,
  CheckCircle,
  XCircle,
  Filter,
  Search,
  Calendar,
  MapPin,
  BarChart3,
  Download,
  RefreshCw,
  ChevronDown,
  ArrowUpDown,
  UserCheck,
  UserX,
  Shield,
  Activity,
  Clock
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
  FilterButton,
  FilterModal, 
  useFilterModal,
  Pagination, 
  usePagination, 
  Status, 
  ExportButton, 
  LoadingSpinner, 
  DataTable,
  BulkActionsBar
} from '../../components/portal_main_content';
import { ToastContainer, showSuccessToast, showErrorToast, showInfoToast } from '../../components/universal';
import { apiHelpers } from '../../services/api';
import { useBarangays } from '../../hooks/useBarangays';

const ValidationQueue = () => {
  // Tab state
  const { activeTab: tabFilter, setActiveTab: setTabFilter } = useTabState('pending', async (tabId) => {
    setCurrentPage(1);
  });

  // UI state
  const [validationItems, setValidationItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Sort modal
  const sortModal = useSortModal({
    sortBy: 'submittedAt',
    sortOrder: 'desc',
    onSortChange: () => setCurrentPage(1)
  });

  // Filter modal
  const filterModal = useFilterModal({
    filters: [
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { value: 'pending', label: 'Pending' },
          { value: 'completed', label: 'Completed' },
          { value: 'rejected', label: 'Rejected' }
        ]
      },
      {
        key: 'voterMatch',
        label: 'Voter Match',
        type: 'select',
        options: [
          { value: 'exact', label: 'Exact Match' },
          { value: 'partial', label: 'Partial Match' },
          { value: 'no_match', label: 'No Match' }
        ]
      },
      {
        key: 'scoreRange',
        label: 'Score Range',
        type: 'range',
        min: 0,
        max: 100
      }
    ],
    onFilterChange: () => setCurrentPage(1)
  });

  // Dynamic barangay filter for SK (optional, if needed later)
  // const { barangays } = useBarangays();
  // const barangayOptions = useMemo(() => Array.isArray(barangays) ? barangays.map(b => ({ value: b.barangay_id || b.id, label: b.barangay_name || b.name })) : [], [barangays]);
  // const modalFilters = useMemo(() => filterModal.filters, [filterModal.filters]);

  // Barangays lookup for readable names
  const { barangays } = useBarangays();

  const getBarangayName = (barangayIdOrName) => {
    if (!barangayIdOrName) return '—';
    if (typeof barangayIdOrName === 'string' && barangayIdOrName.length > 0 && /[a-zA-Z]/.test(barangayIdOrName) && !/^[A-Z]{2,}\d+$/i.test(barangayIdOrName)) {
      return barangayIdOrName;
    }
    if (barangays && Array.isArray(barangays)) {
      const match = barangays.find(b => b.barangay_id === barangayIdOrName || b.id === barangayIdOrName);
      if (match) return match.barangay_name || match.name || barangayIdOrName;
    }
    return barangayIdOrName;
  };

  // Mock data for SK - barangay-specific
  const mockValidationItems = [
    {
      id: '1',
      firstName: 'Juan',
      lastName: 'Dela Cruz',
      age: 22,
      barangay: 'San Jose',
      submittedAt: '2024-01-15T10:30:00Z',
      validationTier: 'manual',
      status: 'pending',
      voterMatch: 'partial',
      validationScore: 0.75,
      needsReview: true
    },
    {
      id: '2',
      firstName: 'Maria',
      lastName: 'Santos',
      age: 19,
      barangay: 'San Jose',
      submittedAt: '2024-01-15T09:15:00Z',
      validationTier: 'manual',
      status: 'pending',
      voterMatch: 'no_match',
      validationScore: 0.30,
      needsReview: true
    },
    {
      id: '3',
      firstName: 'Pedro',
      lastName: 'Garcia',
      age: 25,
      barangay: 'San Jose',
      submittedAt: '2024-01-15T08:45:00Z',
      validationTier: 'automatic',
      status: 'completed',
      voterMatch: 'exact',
      validationScore: 0.95,
      needsReview: false
    },
    {
      id: '4',
      firstName: 'Ana',
      lastName: 'Lopez',
      age: 17,
      barangay: 'San Jose',
      submittedAt: '2024-01-15T07:20:00Z',
      validationTier: 'manual',
      status: 'pending',
      voterMatch: 'partial',
      validationScore: 0.60,
      needsReview: true
    },
    {
      id: '5',
      firstName: 'Luis',
      lastName: 'Fernandez',
      age: 28,
      barangay: 'San Jose',
      submittedAt: '2024-01-15T06:30:00Z',
      validationTier: 'manual',
      status: 'rejected',
      voterMatch: 'no_match',
      validationScore: 0.20,
      needsReview: false
    }
  ];

  // Load validation items
  const loadValidationItems = async () => {
    try {
      console.log('📋 Loading SK validation items...');
      setIsLoading(true);
      setError(null);

      // Build query parameters
      const sortByParam = typeof sortModal.sortBy === 'string' ? sortModal.sortBy : 'submittedAt';
      const sortOrderParam = sortModal.sortOrder === 'asc' ? 'asc' : 'desc';
      const params = {
        page: currentPage,
        limit: itemsPerPage,
        search: searchQuery || '',
        sortBy: sortByParam,
        sortOrder: sortOrderParam
      };

      // Add filter parameters
      if (filterModal.filterValues) {
        if (filterModal.filterValues.status) {
          params.status = filterModal.filterValues.status === 'completed' ? 'validated' : filterModal.filterValues.status;
        }
        if (filterModal.filterValues.voterMatch) {
          params.voterMatch = filterModal.filterValues.voterMatch;
        }
        if (filterModal.filterValues.scoreRange) {
          const [min, max] = filterModal.filterValues.scoreRange;
          params.scoreMin = min;
          params.scoreMax = max;
        }
      }

      const data = await apiHelpers.get('/validation-queue', { params });

      if (data.success) {
        // Normalize backend to UI: status and score (0..1)
        const normalized = (data.data || []).map((item) => {
          const rawScore = typeof item.validationScore === 'number' ? item.validationScore : 0;
          const normalizedScore = rawScore > 1 ? rawScore / 100 : rawScore;
          return {
            ...item,
            status: item.status === 'validated' ? 'completed' : item.status,
            validationScore: normalizedScore
          };
        });
        setValidationItems(normalized);
        console.log(`✅ Loaded ${data.data.length} validation items`);
      } else {
        throw new Error(data.message || 'Failed to load validation items');
      }
    } catch (error) {
      console.error('Failed to load validation items:', error);
      setError(typeof error?.message === 'string' ? error.message : 'Failed to load validation items');
      // Do not use mock data in production path to avoid confusion
      setValidationItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load data on component mount and when dependencies change
  useEffect(() => {
    loadValidationItems();
  }, [currentPage, itemsPerPage, searchQuery, sortModal.sortBy, sortModal.sortOrder, filterModal.filterValues]);

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadValidationItems();
    setIsRefreshing(false);
  };

  // Calculate statistics
  const validationStats = {
    total: validationItems.length,
    pending: validationItems.filter(item => item.status === 'pending').length,
    completed: validationItems.filter(item => item.status === 'completed').length,
    rejected: validationItems.filter(item => item.status === 'rejected').length,
    needsReview: validationItems.filter(item => item.needsReview).length
  };

  // Filter validation items
  const getFilteredItems = () => {
    let filtered = [...validationItems];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(item => 
        `${item.firstName} ${item.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.barangay.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply tab filter
    if (tabFilter === 'pending') {
      filtered = filtered.filter(item => item.status === 'pending');
    } else if (tabFilter === 'completed') {
      filtered = filtered.filter(item => item.status === 'completed');
    } else if (tabFilter === 'rejected') {
      filtered = filtered.filter(item => item.status === 'rejected');
    }

    // Apply filter modal filters
    if (filterModal.filterValues) {
      if (filterModal.filterValues.status) {
        filtered = filtered.filter(item => item.status === filterModal.filterValues.status);
      }
      if (filterModal.filterValues.voterMatch) {
        filtered = filtered.filter(item => item.voterMatch === filterModal.filterValues.voterMatch);
      }
      if (filterModal.filterValues.scoreRange) {
        const [min, max] = filterModal.filterValues.scoreRange;
        filtered = filtered.filter(item => {
          const score = Math.round(item.validationScore * 100);
          return score >= min && score <= max;
        });
      }
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortModal.sortBy) {
        case 'firstName':
          aValue = a.firstName.toLowerCase();
          bValue = b.firstName.toLowerCase();
          break;
        case 'lastName':
          aValue = a.lastName.toLowerCase();
          bValue = b.lastName.toLowerCase();
          break;
        case 'age':
          aValue = a.age;
          bValue = b.age;
          break;
        case 'validationScore':
          aValue = a.validationScore;
          bValue = b.validationScore;
          break;
        case 'submittedAt':
        default:
          aValue = new Date(a.submittedAt);
          bValue = new Date(b.submittedAt);
          break;
      }

      if (aValue < bValue) return sortModal.sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortModal.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  };

  // Pagination hook
  const pagination = usePagination({
    currentPage,
    totalItems: getFilteredItems().length,
    itemsPerPage,
    onPageChange: setCurrentPage,
    onItemsPerPageChange: setItemsPerPage
  });

  // Get paginated items
  const getPaginatedItems = () => {
    const filtered = getFilteredItems();
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filtered.slice(startIndex, startIndex + itemsPerPage);
  };

  // Handle search change
  const handleSearchChange = (newQuery) => {
    setSearchQuery(newQuery);
    setCurrentPage(1);
  };

  // Handle item selection
  const handleSelectItem = (id) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  // Handle select all
  const handleSelectAll = () => {
    const paginatedItems = getPaginatedItems();
    const allSelected = paginatedItems.every(item => selectedItems.includes(item.id));
    
    if (allSelected) {
      setSelectedItems(prev => prev.filter(id => !paginatedItems.some(item => item.id === id)));
    } else {
      const newSelections = paginatedItems.filter(item => !selectedItems.includes(item.id)).map(item => item.id);
      setSelectedItems(prev => [...prev, ...newSelections]);
    }
  };

  // Handle validation action
  const handleValidateItem = async (id, action) => {
    try {
      console.log(`Validating item ${id} with action: ${action}`);
      
      const data = await apiHelpers.patch(`/validation-queue/${id}/validate`, {
        action,
        comments: null
      });

      if (data.success) {
        // Remove item from local state
        setValidationItems(prev => prev.filter(item => item.id !== id));
        showSuccessToast('Validation completed', `Item ${action === 'approve' ? 'approved' : 'rejected'} successfully`);
      } else {
        throw new Error(data.message || 'Failed to validate item');
      }
    } catch (error) {
      console.error('Failed to validate item:', error);
      showErrorToast('Error', 'Failed to validate item');
    }
  };

  // Helper functions
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getVoterMatchColor = (match) => {
    switch (match) {
      case 'exact': return 'bg-green-100 text-green-700 border-green-200';
      case 'partial': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'no_match': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <HeaderMainContent 
        title="Validation Queue" 
        description="Review and validate survey submissions that require manual verification."
      />

      {/* Status Banner */}
      {validationStats.pending > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <Shield className="w-5 h-5 text-yellow-600" />
            <div>
              <h3 className="text-sm font-semibold text-yellow-800">Pending Validations</h3>
              <p className="text-sm text-yellow-700">
                {validationStats.pending} youth submission{validationStats.pending > 1 ? 's' : ''} awaiting your review in San Jose barangay
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column - Validation Queue */}
        <div className="xl:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Tab Container */}
            <TabContainer
              activeTab={tabFilter}
              onTabChange={setTabFilter}
              variant="underline"
              size="md"
            >
              <Tab 
                id="pending" 
                label="Pending" 
                count={validationStats.pending} 
                color="yellow"
              />
              <Tab 
                id="completed" 
                label="Completed" 
                count={validationStats.completed} 
                color="green"
              />
              <Tab 
                id="all" 
                label="All Items" 
                count={validationStats.total} 
                color="blue"
              />
            </TabContainer>

            {/* Controls */}
            <div className="px-5 py-4 border-t border-gray-100">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 overflow-x-auto pb-2 md:pb-0 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                  <SearchBar
                    value={searchQuery}
                    onChange={handleSearchChange}
                    placeholder="Search by name or details..." 
                    expandOnMobile={true}
                    showIndicator={true}
                    indicatorText="Search"
                    indicatorColor="blue"
                    size="md"
                  />

                  <FilterButton
                    onClick={filterModal.openModal}
                    isActive={filterModal.isOpen || Object.keys(filterModal.filterValues || {}).some(key => filterModal.filterValues[key])}
                    label="Filter"
                    size="md"
                  />

                  <SortButton
                    onClick={sortModal.openModal}
                    isActive={sortModal.isOpen}
                    label="Sort"
                    size="md"
                  />
                </div>

                <div className="flex items-center space-x-3 flex-shrink-0">
                  <ExportButton
                    formats={['csv', 'xlsx', 'pdf']}
                    onExport={(format) => console.log('Exporting as:', format)}
                    isExporting={false}
                    label="Export"
                    size="md"
                  />
                </div>
              </div>
            </div>

            {/* Bulk Actions Bar */}
            {selectedItems.length > 0 && (
              <BulkActionsBar
                selectedCount={selectedItems.length}
                onClearSelection={() => setSelectedItems([])}
                actions={[
                  {
                    label: 'Approve Selected',
                    onClick: () => console.log('Bulk approve'),
                    icon: CheckCircle,
                    variant: 'success'
                  },
                  {
                    label: 'Reject Selected',
                    onClick: () => console.log('Bulk reject'),
                    icon: XCircle,
                    variant: 'danger'
                  }
                ]}
                primaryColor="blue"
              />
            )}

            {/* Content Area */}
            {isLoading ? (
              <LoadingSpinner 
                variant="spinner"
                message="Loading validation items..." 
                size="md"
                color="blue"
                height="h-64"
              />
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <input
                            type="checkbox"
                            checked={getPaginatedItems().length > 0 && getPaginatedItems().every(item => selectedItems.includes(item.id))}
                            onChange={handleSelectAll}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Age</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Barangay</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Voter Match</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {getPaginatedItems().map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={selectedItems.includes(item.id)}
                              onChange={() => handleSelectItem(item.id)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                <User className="w-4 h-4 text-blue-600" />
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">{item.firstName} {item.lastName}</div>
                                <div className="text-sm text-gray-500">{item.email || '—'}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-900">{item.age} years</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <MapPin className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-900">{getBarangayName(item.barangay || item.barangayName || item.barangayId || item.barangay_id)}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getVoterMatchColor(item.voterMatch)}`}>
                              {item.voterMatch.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-900">{Math.round(item.validationScore * 100)}%</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-900">{new Date(item.submittedAt).toLocaleDateString()}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center space-x-2">
                              {item.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => handleValidateItem(item.id, 'approve')}
                                    className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors"
                                    title="Approve"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleValidateItem(item.id, 'reject')}
                                    className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Reject"
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                              <button
                                className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="lg:hidden">
                  {getPaginatedItems().map((item) => (
                    <div key={item.id} className="border-b border-gray-200 p-4 hover:bg-gray-50">
                      <div className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(item.id)}
                          onChange={() => handleSelectItem(item.id)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                        />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3 mb-2">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                              <User className="w-4 h-4 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 truncate">
                                {item.firstName} {item.lastName}
                              </div>
                              <div className="text-sm text-gray-500">{item.email || '—'}</div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Age:</span>
                              <span className="text-sm font-medium">{item.age} years</span>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Status:</span>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}>
                                {item.status}
                              </span>
                            </div>
                          </div>

                          <div className="mt-3 flex items-center justify-between">
                            {item.status === 'pending' && (
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => handleValidateItem(item.id, 'approve')}
                                  className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded hover:bg-green-200 transition-colors"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleValidateItem(item.id, 'reject')}
                                  className="px-3 py-1 bg-red-100 text-red-700 text-xs font-medium rounded hover:bg-red-200 transition-colors"
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                            <button className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded-lg transition-colors">
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                <Pagination
                  currentPage={currentPage}
                  totalItems={getFilteredItems().length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={setItemsPerPage}
                  itemName="validation item"
                  itemNamePlural="validation items"
                  showItemsPerPage={true}
                  showInfo={true}
                  size="md"
                  variant="default"
                  itemsPerPageOptions={[5, 10, 20, 50]}
                />
              </>
            )}
          </div>
        </div>

        {/* Right Column - Dashboard & Analytics */}
        <div className="xl:col-span-1 space-y-6">
          {/* Validation Statistics */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Validation Statistics</h3>
                  <p className="text-xs text-gray-600">Your barangay validation overview</p>
                </div>
              </div>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{validationStats.pending}</div>
                  <div className="text-xs text-gray-600">Pending</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{validationStats.completed}</div>
                  <div className="text-xs text-gray-600">Completed</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Needs Review</span>
                  <span className="font-medium">{validationStats.needsReview}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Items</span>
                  <span className="font-medium">{validationStats.total}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Validation Progress */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-green-50 to-emerald-50">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Validation Progress</h3>
                  <p className="text-xs text-gray-600">Your validation completion rate</p>
                </div>
              </div>
            </div>
            
            <div className="p-5">
              <div className="text-center mb-4">
                <div className="text-3xl font-bold text-green-600">
                  {validationStats.total > 0 ? Math.round((validationStats.completed / validationStats.total) * 100) : 0}%
                </div>
                <div className="text-sm text-gray-600">Completion Rate</div>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${validationStats.total > 0 ? (validationStats.completed / validationStats.total) * 100 : 0}%` }}
                ></div>
              </div>
              
              <div className="text-center text-xs text-gray-500">
                {validationStats.completed} of {validationStats.total} validations completed
              </div>
            </div>
          </div>

          {/* Recent Validations */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Recent Activity</h3>
                  <p className="text-xs text-gray-600">Your latest validations</p>
                </div>
              </div>
            </div>
            
            <div className="p-5 space-y-3">
              {validationItems
                .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
                .slice(0, 4)
                .map(item => (
                  <div key={item.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg transition-colors">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{item.firstName} {item.lastName}</div>
                      <div className="text-xs text-gray-500">
                        {item.age} years • {new Date(item.submittedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      item.status === 'completed' ? 'bg-green-400' :
                      item.status === 'rejected' ? 'bg-red-400' :
                      'bg-yellow-400'
                    }`}></div>
                  </div>
                ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Filter className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Quick Actions</h3>
                  <p className="text-xs text-gray-600">Common validation tasks</p>
                </div>
              </div>
            </div>
            
            <div className="p-5 space-y-3">
              <button 
                onClick={() => setTabFilter('pending')}
                className="w-full px-4 py-2 bg-yellow-50 text-yellow-700 text-sm font-medium rounded-lg hover:bg-yellow-100 transition-colors border border-yellow-200"
              >
                Review Pending ({validationStats.pending})
              </button>
              
              
              <button 
                onClick={() => setTabFilter('completed')}
                className="w-full px-4 py-2 bg-green-50 text-green-700 text-sm font-medium rounded-lg hover:bg-green-100 transition-colors border border-green-200"
              >
                View Completed ({validationStats.completed})
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <SortModal
        isOpen={sortModal.isOpen}
        onClose={sortModal.closeModal}
        sortBy={sortModal.sortBy}
        sortOrder={sortModal.sortOrder}
        onSortChange={sortModal.updateSort}
        sortOptions={[
          { value: 'submittedAt', label: 'Submitted Date' },
          { value: 'firstName', label: 'First Name' },
          { value: 'lastName', label: 'Last Name' },
          { value: 'age', label: 'Age' },
          { value: 'validationScore', label: 'Validation Score' }
        ]}
      />

      <FilterModal
        isOpen={filterModal.isOpen}
        onClose={filterModal.closeModal}
        filters={filterModal.filters}
        values={filterModal.filterValues}
        onChange={filterModal.updateFilterValues}
        onApply={filterModal.applyFilters}
        onClear={filterModal.clearFilters}
      />

      {/* Toast Container */}
      <ToastContainer position="top-right" maxToasts={5} />
    </div>
  );
};

export default ValidationQueue;