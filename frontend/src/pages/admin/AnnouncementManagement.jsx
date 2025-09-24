import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Eye, 
  Pin, 
  Star,
  Calendar,
  Tag,
  FileText,
  Image,
  Paperclip,
  CheckCircle,
  Clock,
  Archive,
  ChevronDown,
  ArrowUpDown
} from 'lucide-react';
import { 
  HeaderMainContent, 
  TabContainer, 
  Tab, 
  useTabState, 
  ActionMenu, 
  SearchBar, 
  SortModal, 
  FilterModal,
  BulkModal, 
  Pagination, 
  useSortModal, 
  useBulkModal, 
  usePagination,
  DataTable,
  BulkActionsBar,
  Status
} from '../../components/portal_main_content';
import { useAuth } from '../../context/AuthContext';
import { ToastContainer, showSuccessToast, showErrorToast, ConfirmationModal } from '../../components/universal';

const AnnouncementManagement = () => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    category: 'all',
    is_featured: 'all',
    is_pinned: 'all'
  });

  // Tab state
  const { activeTab, setActiveTab } = useTabState('all');

  // Pagination
  const { 
    currentPage, 
    totalPages, 
    totalItems, 
    itemsPerPage, 
    setCurrentPage, 
    setTotalPages, 
    setTotalItems 
  } = usePagination();

  // Sort modal
  const { 
    isSortModalOpen, 
    openSortModal, 
    closeSortModal, 
    sortOptions, 
    selectedSort, 
    setSelectedSort 
  } = useSortModal([
    { value: 'published_at', label: 'Published Date', default: true },
    { value: 'created_at', label: 'Created Date' },
    { value: 'updated_at', label: 'Last Updated' },
    { value: 'title', label: 'Title' },
    { value: 'category', label: 'Category' }
  ]);

  // Filter modal (keep parity with SurveyBatch)
  const [showFilterModal, setShowFilterModal] = useState(false);
  const filterTriggerRef = React.useRef(null);
  const [filterValues, setFilterValues] = useState({ dateCreated: '' });

  // Bulk modal
  const { 
    isBulkModalOpen, 
    openBulkModal, 
    closeBulkModal, 
    bulkActions 
  } = useBulkModal([
    { 
      id: 'publish', 
      label: 'Publish', 
      icon: CheckCircle, 
      color: 'green',
      action: () => handleBulkAction('publish')
    },
    { 
      id: 'draft', 
      label: 'Move to Draft', 
      icon: Clock, 
      color: 'yellow',
      action: () => handleBulkAction('draft')
    },
    { 
      id: 'archive', 
      label: 'Archive', 
      icon: Archive, 
      color: 'gray',
      action: () => handleBulkAction('archive')
    },
    { 
      id: 'delete', 
      label: 'Delete', 
      icon: Trash2, 
      color: 'red',
      action: () => handleBulkAction('delete')
    }
  ]);

  // Fetch announcements
  const fetchAnnouncements = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage,
        limit: itemsPerPage,
        sortBy: selectedSort.value,
        sortOrder: 'DESC'
      });

      // Add filters
      if (filters.status !== 'all') params.append('status', filters.status);
      if (filters.category !== 'all') params.append('category', filters.category);
      if (filters.is_featured !== 'all') params.append('is_featured', filters.is_featured);
      if (filters.is_pinned !== 'all') params.append('is_pinned', filters.is_pinned);
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`/api/announcements?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch announcements');

      const data = await response.json();
      setAnnouncements(data.data);
      setTotalPages(data.pagination.pages);
      setTotalItems(data.pagination.total);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      showErrorToast('Failed to fetch announcements');
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, selectedSort, filters, searchTerm]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  // Handle tab changes
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
    
    // Update filters based on tab
    switch (tab) {
      case 'published':
        setFilters(prev => ({ ...prev, status: 'published' }));
        break;
      case 'draft':
        setFilters(prev => ({ ...prev, status: 'draft' }));
        break;
      case 'archived':
        setFilters(prev => ({ ...prev, status: 'archived' }));
        break;
      case 'featured':
        setFilters(prev => ({ ...prev, is_featured: 'true' }));
        break;
      case 'pinned':
        setFilters(prev => ({ ...prev, is_pinned: 'true' }));
        break;
      default:
        setFilters({
          status: 'all',
          category: 'all',
          is_featured: 'all',
          is_pinned: 'all'
        });
    }
  };

  // Handle search
  const handleSearch = (term) => {
    setSearchTerm(term);
    setCurrentPage(1);
  };

  // Handle bulk actions
  const handleBulkAction = async (action) => {
    if (selectedItems.length === 0) {
      showErrorToast('Please select announcements to perform this action');
      return;
    }

    try {
      if (action === 'delete') {
        // Handle delete confirmation
        const confirmed = window.confirm(
          `Are you sure you want to delete ${selectedItems.length} announcement(s)? This action cannot be undone.`
        );
        if (!confirmed) return;

        // Delete each announcement
        for (const id of selectedItems) {
          await fetch(`/api/announcements/${id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
        }
        showStaffSuccessToast(`Successfully deleted ${selectedItems.length} announcement(s)`);
      } else {
        // Handle status updates
        const statusMap = {
          'publish': 'published',
          'draft': 'draft',
          'archive': 'archived'
        };

        const response = await fetch('/api/announcements/bulk/status', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            announcement_ids: selectedItems,
            status: statusMap[action]
          })
        });

        if (!response.ok) throw new Error('Failed to update announcements');

        showStaffSuccessToast(`Successfully updated ${selectedItems.length} announcement(s)`);
      }

      setSelectedItems([]);
      fetchAnnouncements();
    } catch (error) {
      console.error('Error performing bulk action:', error);
      showErrorToast('Failed to perform bulk action');
    }
  };

  // Handle individual actions
  const handleAction = async (action, announcement) => {
    try {
      switch (action) {
        case 'view':
          // Navigate to announcement details
          window.open(`/announcements/${announcement.announcement_id}`, '_blank');
          break;
        case 'edit':
          // Navigate to edit page
          window.location.href = `/admin/announcements/edit/${announcement.announcement_id}`;
          break;
        case 'delete':
          const confirmed = window.confirm(
            `Are you sure you want to delete "${announcement.title}"? This action cannot be undone.`
          );
          if (!confirmed) return;

          await fetch(`/api/announcements/${announcement.announcement_id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          showStaffSuccessToast('Announcement deleted successfully');
          fetchAnnouncements();
          break;
        case 'toggle_featured':
          await fetch(`/api/announcements/${announcement.announcement_id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
              is_featured: !announcement.is_featured
            })
          });
          showStaffSuccessToast(`Announcement ${announcement.is_featured ? 'unfeatured' : 'featured'} successfully`);
          fetchAnnouncements();
          break;
        case 'toggle_pinned':
          await fetch(`/api/announcements/${announcement.announcement_id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
              is_pinned: !announcement.is_pinned
            })
          });
          showStaffSuccessToast(`Announcement ${announcement.is_pinned ? 'unpinned' : 'pinned'} successfully`);
          fetchAnnouncements();
          break;
      }
    } catch (error) {
      console.error('Error performing action:', error);
      showErrorToast('Failed to perform action');
    }
  };

  // Get action menu items for each announcement
  const getActionMenuItems = (announcement) => [
    {
      id: 'view',
      label: 'View',
      icon: Eye,
      color: 'blue'
    },
    {
      id: 'edit',
      label: 'Edit',
      icon: Edit,
      color: 'blue'
    },
    {
      id: 'toggle_featured',
      label: announcement.is_featured ? 'Unfeature' : 'Feature',
      icon: Star,
      color: announcement.is_featured ? 'gray' : 'yellow'
    },
    {
      id: 'toggle_pinned',
      label: announcement.is_pinned ? 'Unpin' : 'Pin',
      icon: Pin,
      color: announcement.is_pinned ? 'gray' : 'blue'
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: Trash2,
      color: 'red'
    }
  ];

  // Get status for announcement
  const getAnnouncementStatus = (announcement) => {
    if (announcement.is_pinned) return 'pinned';
    if (announcement.is_featured) return 'featured';
    return announcement.status;
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Not published';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get category icon
  const getCategoryIcon = (category) => {
    const icons = {
      general: FileText,
      event: Calendar,
      survey: FileText,
      meeting: Calendar,
      deadline: Clock,
      achievement: Star,
      update: FileText
    };
    return icons[category] || FileText;
  };

  // Get category color
  const getCategoryColor = (category) => {
    const colors = {
      general: 'blue',
      event: 'green',
      survey: 'purple',
      meeting: 'blue',
      deadline: 'red',
      achievement: 'yellow',
      update: 'gray'
    };
    return colors[category] || 'blue';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <HeaderMainContent
        title="Announcement Management"
        subtitle="Manage and organize announcements for the youth community"
        actions={[
          {
            label: 'Create Announcement',
            icon: Plus,
            onClick: () => window.location.href = '/admin/announcements/create',
            variant: 'primary'
          }
        ]}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <TabContainer>
          <Tab
            id="all"
            label="All Announcements"
            count={totalItems}
            isActive={activeTab === 'all'}
            onClick={() => handleTabChange('all')}
            color="blue"
          />
          <Tab
            id="published"
            label="Published"
            count={announcements.filter(a => a.status === 'published').length}
            isActive={activeTab === 'published'}
            onClick={() => handleTabChange('published')}
            color="green"
          />
          <Tab
            id="draft"
            label="Drafts"
            count={announcements.filter(a => a.status === 'draft').length}
            isActive={activeTab === 'draft'}
            onClick={() => handleTabChange('draft')}
            color="yellow"
          />
          <Tab
            id="archived"
            label="Archived"
            count={announcements.filter(a => a.status === 'archived').length}
            isActive={activeTab === 'archived'}
            onClick={() => handleTabChange('archived')}
            color="gray"
          />
          <Tab
            id="featured"
            label="Featured"
            count={announcements.filter(a => a.is_featured).length}
            isActive={activeTab === 'featured'}
            onClick={() => handleTabChange('featured')}
            color="purple"
          />
          <Tab
            id="pinned"
            label="Pinned"
            count={announcements.filter(a => a.is_pinned).length}
            isActive={activeTab === 'pinned'}
            onClick={() => handleTabChange('pinned')}
            color="blue"
          />
        </TabContainer>

        {/* Controls - aligned with SurveyBatch */}
        <div className="px-5 py-4 border-t border-gray-100 -mx-5">
          <div className="flex items-center justify-between gap-4">
            {/* Left Controls */}
            <div className="flex items-center gap-3 overflow-x-auto pb-2 md:pb-0 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              <div className="flex items-center space-x-3 min-w-max">
                {/* Search Bar */}
                <div className="flex-shrink-0">
                  <SearchBar
                    value={searchTerm}
                    onChange={handleSearch}
                    placeholder="Search announcements..." 
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
                    showFilterModal || (filterValues.dateCreated)
                      ? 'border-blue-500 text-blue-600 bg-blue-50' 
                      : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  } px-2 py-1.5 sm:px-3 sm:py-2 whitespace-nowrap flex-shrink-0`}
                >
                  <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Filter</span>
                  <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1" />
                </button>

                {/* Sort Button */}
                <button 
                  onClick={openSortModal}
                  className={`inline-flex items-center border rounded-lg font-medium transition-all duration-200 ${
                    !selectedSort?.default
                      ? 'border-blue-500 text-blue-600 bg-blue-50' 
                      : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  } px-2 py-1.5 sm:px-3 sm:py-2 whitespace-nowrap flex-shrink-0`}
                >
                  <ArrowUpDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Sort</span>
                  <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1" />
                </button>
              </div>
            </div>

            {/* Right Controls */}
            <div className="flex items-center space-x-3 flex-shrink-0">
              {selectedItems.length > 0 && (
                <BulkActionsBar
                  selectedCount={selectedItems.length}
                  itemName="announcement"
                  itemNamePlural="announcements"
                  onBulkAction={openBulkModal}
                  primaryColor="blue"
                />
              )}
            </div>
          </div>

          {/* Filter Modal */}
          <FilterModal
            isOpen={showFilterModal}
            onClose={() => setShowFilterModal(false)}
            triggerRef={filterTriggerRef}
            title="Advanced Filters"
            filters={[{ id: 'dateCreated', label: 'Created After', type: 'date', description: 'Show announcements created after this date' }]}
            values={filterValues}
            onChange={(v) => setFilterValues(v)}
            onApply={(v) => setFilterValues(v)}
            onClear={() => setFilterValues({ dateCreated: '' })}
            applyButtonText="Apply Filters"
            clearButtonText="Clear All"
          />
        </div>

        {/* Content Area using DataTable for consistency */}
        <div className="mt-2">
          {loading ? (
            <div className="p-8">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-32 bg-gray-200 rounded"></div>
              </div>
            </div>
          ) : announcements.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No announcements found</h3>
              <p className="text-gray-500 mb-6">
                {searchTerm || Object.values(filters).some(f => f !== 'all')
                  ? 'Try adjusting your search or filters'
                  : 'Get started by creating your first announcement'
                }
              </p>
              <button
                onClick={() => window.location.href = '/admin/announcements/create'}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Announcement
              </button>
            </div>
          ) : (
            <DataTable
              data={announcements}
              selectedItems={selectedItems}
              onSelectItem={(id) => setSelectedItems(prev => prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id])}
              onSelectAll={() => {
                const all = announcements.map(a => a.announcement_id);
                setSelectedItems(selectedItems.length === all.length ? [] : all);
              }}
              getActionMenuItems={getActionMenuItems}
              onActionClick={(action, item) => handleAction(action, item)}
              viewMode={'grid'}
              keyField="announcement_id"
              displayFields={{
                title: (item) => (
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex-shrink-0">
                      <FileText className="w-4 h-4" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 min-w-0">
                          <span className="font-medium text-gray-900 text-sm sm:text-base truncate">{item.title}</span>
                          <span className="inline-flex items-center px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 flex-shrink-0">
                            {item.announcement_id}
                          </span>
                        </div>
                        {item.is_pinned && <Pin className="w-4 h-4 text-blue-600" />}
                      </div>
                    </div>
                  </div>
                ),
                subtitle: (item) => (
                  <div className="space-y-1.5 sm:space-y-2">
                    {item.summary && (
                      <p className="text-xs sm:text-sm text-gray-600 line-clamp-1 sm:line-clamp-2">{item.summary}</p>
                    )}
                    <div className="flex items-center text-xs sm:text-sm text-gray-600">
                      <Tag className="w-3 h-3 mr-1 flex-shrink-0" />
                      <span className="truncate capitalize">{item.category}</span>
                    </div>
                  </div>
                ),
                status: (item) => getAnnouncementStatus(item),
                date: (item) => item.published_at || item.created_at,
              }}
              selectAllLabel="Select All Announcements"
              emptyMessage="No announcements found"
              styling={{
                gridCols: 'grid-cols-1 lg:grid-cols-2',
                cardHover: 'hover:border-blue-300 hover:shadow-xl hover:shadow-blue-100/50 hover:scale-[1.02]',
                listHover: 'hover:bg-blue-50/30 hover:border-l-4 hover:border-l-blue-400',
                theme: 'blue'
              }}
            />
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
            />
          </div>
        )}
      </div>

      {/* Sort Modal */}
      <SortModal
        isOpen={isSortModalOpen}
        onClose={closeSortModal}
        sortOptions={sortOptions}
        selectedSort={selectedSort}
        onSortChange={setSelectedSort}
      />

      {/* Bulk Modal */}
      <BulkModal
        isOpen={isBulkModalOpen}
        onClose={closeBulkModal}
        selectedCount={selectedItems.length}
        actions={bulkActions}
      />

      {/* Universal Toasts + Confirmation to match SurveyBatch */}
      <ToastContainer position="top-right" maxToasts={5} />
    </div>
  );
};

export default AnnouncementManagement;
