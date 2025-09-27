import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
  Megaphone,
  Calendar,
  User,
  Tag,
  Eye,
  ChevronDown,
  Plus,
  Filter as FilterIcon,
  ArrowUpDown,
  Star,
  Pin,
  Clock,
  MapPin,
  ArrowRight,
  Users,
  MoreHorizontal,
  Edit,
  Trash2,
  Archive,
  Check,
  ArrowLeft,
  BookOpen,
  FolderOpen,
  Activity,
  Award
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
  getAnnouncements, 
  deleteAnnouncement, 
  bulkUpdateAnnouncementStatus,
  getAnnouncementStatistics 
} from '../../services/announcementsService';

import {
  HeaderMainContent,
  TabContainer,
  Tab,
  useTabState,
  SearchBar,
  Pagination,
  SortModal,
  useSortModal,
  FilterModal,
  ActionMenu,
  BulkActionsBar,
  LoadingSpinner
} from '../../components/portal_main_content';

// Note: Dummy data removed - now using real API calls

const getStatusStyles = (status) => {
  switch (status) {
    case 'published':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'archived':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'draft':
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

// Helper functions for card design
const getFallbackImage = (category, title) => {
  const key = (category || '').toString().toLowerCase();
  const label = (title || '').trim() || (category ? String(category) : 'LYDO');
  
  const buildSvgPlaceholder = (label, colorFrom, colorTo, title = '') => {
    // Truncate title if too long for display
    const displayTitle = title && title.length > 50 ? title.substring(0, 47) + '...' : title;
    
    const svg = `
      <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 675' preserveAspectRatio='xMidYMid slice'>
        <defs>
          <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
            <stop offset='0%' stop-color='${colorFrom}'/>
            <stop offset='100%' stop-color='${colorTo}'/>
          </linearGradient>
        </defs>
        <rect width='1200' height='675' fill='url(#g)'/>
        <g fill='rgba(255,255,255,0.25)'>
          <circle cx='150' cy='120' r='90'/>
          <circle cx='1050' cy='560' r='120'/>
          <circle cx='950' cy='90' r='60'/>
        </g>
        ${displayTitle ? `
        <text x='600' y='350' text-anchor='middle' fill='white' font-family='Arial, sans-serif' font-size='32' font-weight='bold' opacity='0.9'>
          <tspan x='600' dy='0'>${displayTitle}</tspan>
        </text>
        ` : ''}
      </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  };

  switch (key) {
    case 'programs':
      return buildSvgPlaceholder(label, '#3b82f6', '#1e40af', title);
    case 'projects':
      return buildSvgPlaceholder(label, '#10b981', '#065f46', title);
    case 'activities':
      return buildSvgPlaceholder(label, '#8b5cf6', '#4c1d95', title);
    case 'meetings':
    case 'meeting':
      return buildSvgPlaceholder(label, '#f97316', '#7c2d12', title);
    case 'announcements':
      return buildSvgPlaceholder(label, '#f59e0b', '#92400e', title);
    case 'achievement':
      return buildSvgPlaceholder(label, '#facc15', '#854d0e', title);
    default:
      return buildSvgPlaceholder(label || 'LYDO', '#64748b', '#111827', title);
  }
};

const getCategoryColor = (category) => {
  const key = (category || '').toString().toLowerCase();
  switch (key) {
    case 'programs':
      return 'bg-green-100 text-green-700';
    case 'projects':
      return 'bg-blue-100 text-blue-700';
    case 'activities':
      return 'bg-purple-100 text-purple-700';
    case 'meetings':
      return 'bg-orange-100 text-orange-700';
    case 'announcements':
      return 'bg-red-100 text-red-700';
    case 'achievement':
      return 'bg-yellow-100 text-yellow-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

const getCategoryIcon = (category) => {
  const key = (category || '').toString().toLowerCase();
  switch (key) {
    case 'programs':
      return BookOpen;
    case 'projects':
      return FolderOpen;
    case 'activities':
      return Activity;
    case 'meetings':
      return Users;
    case 'announcements':
      return Megaphone;
    case 'achievement':
      return Award;
    default:
      return Tag;
  }
};

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const capitalizeCategory = (category) => {
  if (!category) return 'Announcement';
  return category.charAt(0).toUpperCase() + category.slice(1);
};

const Announcements = () => {
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { activeTab: statusFilter, setActiveTab } = useTabState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [selectedItems, setSelectedItems] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [statistics, setStatistics] = useState({
    total: 0,
    published: 0,
    draft: 0,
    archived: 0
  });
  const [statisticsLoading, setStatisticsLoading] = useState(true);

  // Sort / Filter (advanced)
  const [authorFilter, setAuthorFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [sortBy, setSortBy] = useState('publishAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const sortModal = useSortModal('publishAt', 'desc', (by, order) => {
    setSortBy(by);
    setSortOrder(order);
    setCurrentPage(1);
  });
  const filterTriggerRef = useRef(null);
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Fetch announcements data
  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const params = {
          page: currentPage,
          limit: itemsPerPage,
          status: statusFilter === 'all' ? undefined : statusFilter,
          search: searchQuery || undefined,
          sortBy: sortBy === 'publishAt' ? 'published_at' : sortBy,
          sortOrder: sortOrder.toUpperCase()
        };

        console.log('🔍 Fetching announcements with params:', params);
        const response = await getAnnouncements(params);
        console.log('📊 Response data:', response.data?.length, 'items');
        console.log('📈 Pagination:', response.pagination);
        
        // Debug: Log the status of each announcement
        if (response.data && response.data.length > 0) {
          console.log('📋 Announcement statuses:', response.data.map(a => ({ id: a.announcement_id, title: a.title, status: a.status })));
        }
        setAnnouncements(response.data);
        setTotalItems(response.pagination.total);
      } catch (err) {
        console.error('Error fetching announcements:', err);
        setError(err.message || 'Failed to fetch announcements');
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncements();
  }, [currentPage, itemsPerPage, statusFilter, searchQuery, sortBy, sortOrder]);

  // Fetch statistics for tab counts
  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        setStatisticsLoading(true);
        const response = await getAnnouncementStatistics();
        if (response.success && response.data) {
          setStatistics({
            total: response.data.total || 0,
            published: response.data.by_status?.published || 0,
            draft: response.data.by_status?.draft || 0,
            archived: response.data.by_status?.archived || 0
          });
        }
      } catch (err) {
        console.error('Error fetching statistics:', err);
      } finally {
        setStatisticsLoading(false);
      }
    };

    fetchStatistics();
  }, []);

  // Derived options
  const authors = useMemo(() => ['all', ...Array.from(new Set(announcements.map(a => a.creator_name || a.author)))], [announcements]);
  const tags = useMemo(() => {
    const all = new Set();
    announcements.forEach(a => (a.tags || []).forEach(t => all.add(t)));
    return ['all', ...Array.from(all)];
  }, [announcements]);

  // Status counts - using real database statistics
  const statusCounts = useMemo(() => {
    return {
      total: statistics.total,
      published: statistics.published,
      draft: statistics.draft,
      archived: statistics.archived
    };
  }, [statistics]);

  const hasActiveFilters = (authorFilter !== 'all') || (tagFilter !== 'all');
  const activeFilterCount = (authorFilter !== 'all' ? 1 : 0) + (tagFilter !== 'all' ? 1 : 0);

  // Since API handles filtering and pagination, we use announcements directly
  const paged = announcements;

  // Selection handlers
  const handleSelectItem = (id) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const allAnnouncementIds = paged.map(item => item.id).filter(Boolean);
    setSelectedItems(selectedItems.length === allAnnouncementIds.length ? [] : allAnnouncementIds);
  };

  // Action menu items for announcements
  const getActionMenuItems = (item) => {
    const items = [
      {
        id: 'view',
        label: 'View Details',
        icon: <Eye className="w-4 h-4" />,
        action: 'view'
      },
      {
        id: 'edit',
        label: 'Edit Announcement',
        icon: <Edit className="w-4 h-4" />,
        action: 'edit'
      }
    ];

    // Status-specific actions
    switch (item.status) {
      case 'published':
        items.push({
          id: 'archive',
          label: 'Archive',
          icon: <Archive className="w-4 h-4" />,
          action: 'archive'
        });
        break;
      case 'draft':
        items.push({
          id: 'publish',
          label: 'Publish',
          icon: <Check className="w-4 h-4" />,
          action: 'publish'
        });
        break;
      case 'archived':
        items.push({
          id: 'restore',
          label: 'Restore',
          icon: <ArrowRight className="w-4 h-4" />,
          action: 'restore'
        });
        break;
    }

    items.push({
      id: 'delete',
      label: 'Delete',
      icon: <Trash2 className="w-4 h-4" />,
      action: 'delete'
    });

    return items;
  };

  const handleActionClick = async (action, item) => {
    try {
      switch (action) {
        case 'view':
          navigate(`/staff/announcements/${item.announcement_id || item.id}`);
          break;
        case 'edit':
          navigate(`/staff/announcements/${item.announcement_id || item.id}/edit`);
          break;
        case 'publish':
          // Update status to published
          await bulkUpdateAnnouncementStatus([item.announcement_id || item.id], 'published');
          // Refresh data and statistics
          await refreshData();
          break;
        case 'archive':
          // Update status to archived
          await bulkUpdateAnnouncementStatus([item.announcement_id || item.id], 'archived');
          // Refresh data and statistics
          await refreshData();
          break;
        case 'restore':
          // Update status to published
          await bulkUpdateAnnouncementStatus([item.announcement_id || item.id], 'published');
          // Refresh data and statistics
          await refreshData();
          break;
        case 'delete':
          // Delete announcement
          await deleteAnnouncement(item.announcement_id || item.id);
          // Refresh data and statistics
          await refreshData();
          break;
      }
    } catch (error) {
      console.error(`Error performing ${action} action:`, error);
      setError(`Failed to ${action} announcement`);
    }
  };

  // Helper function to refresh both data and statistics
  const refreshData = async () => {
    try {
      // Refresh announcements
      const params = {
        page: currentPage,
        limit: itemsPerPage,
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: searchQuery || undefined,
        sortBy: sortBy === 'publishAt' ? 'published_at' : sortBy,
        sortOrder: sortOrder.toUpperCase()
      };
      const response = await getAnnouncements(params);
      setAnnouncements(response.data);
      setTotalItems(response.pagination.total);

      // Refresh statistics
      setStatisticsLoading(true);
      const statsResponse = await getAnnouncementStatistics();
      if (statsResponse.success && statsResponse.data) {
        setStatistics({
          total: statsResponse.data.total || 0,
          published: statsResponse.data.by_status?.published || 0,
          draft: statsResponse.data.by_status?.draft || 0,
          archived: statsResponse.data.by_status?.archived || 0
        });
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setStatisticsLoading(false);
    }
  };
 
  return (
    <div className="space-y-6">
      {/* Header Section - Responsive Design */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
          {/* Mobile/Tablet Layout - Inline */}
          <div className="flex items-center justify-between lg:hidden">
            <div className="flex items-center space-x-3">
              <h1 className="text-base sm:text-lg font-bold text-gray-900">
                Announcements
              </h1>
            </div>
            
            {/* New Announcement Button */}
            <button
              type="button"
              className="inline-flex items-center px-2 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors"
              onClick={() => navigate('/staff/announcements/create')}
            >
              <Plus className="w-3 h-3 mr-1.5" />
              <span className="hidden sm:inline">New</span>
            </button>
          </div>

          {/* Desktop Layout - Horizontal */}
          <div className="hidden lg:flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Announcements
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Public communications and updates for the youth community.
                </p>
              </div>
            </div>
            
            {/* New Announcement Button */}
            <button
              type="button"
              className="inline-flex items-center px-3 sm:px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors"
              onClick={() => navigate('/staff/announcements/create')}
            >
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">New Announcement</span>
              <span className="sm:hidden">New</span>
            </button>
          </div>
        </div>
      </div>

      {/* Featured Announcements Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Megaphone className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base sm:text-lg font-semibold text-blue-900">Featured Events</h3>
              <p className="text-xs sm:text-sm text-blue-700">Browse highlighted events curated by LYDO.</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <button
              type="button"
              className="inline-flex items-center justify-center px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              onClick={() => navigate('/staff/announcements/featured')}
            >
              View Featured
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <TabContainer
              activeTab={statusFilter}
          onTabChange={(tab) => {
            console.log('🔄 Tab changed from', statusFilter, 'to', tab);
            setActiveTab(tab);
            setCurrentPage(1);
          }}
              variant="underline"
              size="md"
            >
          <Tab id="all" label="All" count={statisticsLoading ? "..." : statusCounts.total} color="blue" />
          <Tab id="published" label="Published" count={statisticsLoading ? "..." : statusCounts.published} color="green" />
          <Tab id="draft" label="Draft" count={statisticsLoading ? "..." : statusCounts.draft} color="gray" />
          <Tab id="archived" label="Archived" count={statisticsLoading ? "..." : statusCounts.archived} color="red" />
            </TabContainer>

            {/* Controls */}
        <div className="px-4 sm:px-6 py-4 border-t border-gray-100">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 overflow-x-auto pb-2 md:pb-0">
                    <div className="flex-shrink-0">
                      <SearchBar
                        value={searchQuery}
                  onChange={(v) => { setSearchQuery(v); setCurrentPage(1); }}
                  placeholder="Search announcements..."
                        expandOnMobile={true}
                        size="md"
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
                <FilterIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" />
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
                  !(sortBy === 'publishAt' && sortOrder === 'desc') ? 'border-blue-500 text-blue-600 bg-blue-50' : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <ArrowUpDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Sort</span>
                      <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1" />
                    </button>
                  </div>
                </div>

              {/* Sort Modal */}
              <SortModal
                isOpen={sortModal.isOpen}
                onClose={sortModal.closeModal}
                triggerRef={sortModal.triggerRef}
            title="Sort Announcements"
                sortFields={[
              { value: 'publishAt', label: 'Date' },
                  { value: 'title', label: 'Title' },
              { value: 'views', label: 'Views' }
            ]}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSortChange={(by, order) => { setSortBy(by); setSortOrder(order); setCurrentPage(1); }}
            onReset={() => { setSortBy('publishAt'); setSortOrder('desc'); setCurrentPage(1); }}
            defaultSortBy="publishAt"
                defaultSortOrder="desc"
              />

              {/* Filter Modal */}
              <FilterModal
                isOpen={showFilterModal}
                onClose={() => setShowFilterModal(false)}
                triggerRef={filterTriggerRef}
            title="Filter Announcements"
                filters={[
                  {
                id: 'author',
                label: 'Author',
                    type: 'select',
                placeholder: 'All Authors',
                options: authors.slice(1).map(a => ({ value: a, label: a }))
              },
              {
                id: 'tag',
                label: 'Tag',
                    type: 'select',
                placeholder: 'All Tags',
                options: tags.slice(1).map(t => ({ value: t, label: t }))
              }
            ]}
            values={{ author: authorFilter === 'all' ? '' : authorFilter, tag: tagFilter === 'all' ? '' : tagFilter }}
            onChange={() => {}}
            onApply={(vals) => {
              setAuthorFilter(vals.author || 'all');
              setTagFilter(vals.tag || 'all');
                  setCurrentPage(1);
                }}
            onClear={() => {
              setAuthorFilter('all');
              setTagFilter('all');
                  setCurrentPage(1);
                }}
                applyButtonText="Apply Filters"
                clearButtonText="Clear All"
              />
            </div>

            {/* Select All Section - Match controls section background */}
            <div className="px-4 sm:px-6 py-3 border-b border-gray-100">
              <label className="flex items-center">
                        <input
                          type="checkbox"
                  checked={paged.length > 0 && selectedItems.length === paged.length}
                          onChange={handleSelectAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
                <span className="ml-3 font-medium text-gray-900">Select All Announcements</span>
              </label>
                            </div>

            {/* Bulk Actions */}
            <BulkActionsBar
              selectedCount={selectedItems.length}
              itemName="announcement"
              itemNamePlural="announcements"
              onBulkAction={() => console.log('Bulk action clicked')}
              exportConfig={{
                formats: ['csv'],
                onExport: (format) => console.log('Export selected:', format),
                isExporting: false
              }}
              primaryColor="blue"
            />

        {/* Cards Grid */}
        <div className="p-4 sm:p-6">
          {loading ? (
            <LoadingSpinner 
              variant="spinner"
              message="Loading announcements..." 
              size="md"
              color="blue"
              height="h-64"
            />
          ) : error ? (
            <div className="py-16 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <Megaphone className="w-8 h-8 text-red-400" />
                                </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Error loading announcements</h3>
              <p className="text-gray-600">{error}</p>
                                <button
                onClick={() => window.location.reload()} 
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Try Again
                              </button>
                            </div>
          ) : paged.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <Megaphone className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">No announcements</h3>
              <p className="text-gray-600">Try adjusting filters or search terms.</p>
                  </div>
                ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
              {paged.map(a => {
                const isPinned = a.is_pinned;
                const isFeatured = a.is_featured;
                const categoryInfo = {
                  color: getCategoryColor(a.category || 'announcements'),
                  Icon: getCategoryIcon(a.category || 'announcements')
                };
                
                return (
                  <div key={a.id} className="group relative h-full">
                    {/* Glow effect for featured items */}
                    {isFeatured && (
                      <div className="absolute -inset-2 rounded-2xl bg-gradient-to-br from-yellow-300/30 via-orange-200/25 to-red-300/30 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" aria-hidden="true" />
                    )}
                    
                    {/* Card */}
                    <div 
                      className={`relative rounded-2xl overflow-hidden shadow-sm transition-all duration-200 group-hover:shadow-lg h-full flex flex-col cursor-pointer ${
                        isPinned ? 'bg-white ring-2 ring-red-200' : 'bg-white ring-1 ring-gray-200'
                      }`}
                      onClick={() => navigate(`/staff/announcements/${a.announcement_id || a.id}`)}
                    >
                      {/* Selection Checkbox */}
                      <div className="absolute top-3 left-3 z-20">
                        <label className="flex items-center">
                            <input
                              type="checkbox"
                            checked={selectedItems.includes(a.announcement_id || a.id)}
                              onChange={(e) => {
                                e.stopPropagation();
                              handleSelectItem(a.announcement_id || a.id);
                              }}
                            className="w-4 h-4 text-blue-600 bg-white/90 backdrop-blur-sm border-gray-300 rounded-md focus:ring-blue-500 focus:ring-2 shadow-sm"
                            />
                        </label>
                          </div>

                      {/* Action Menu */}
                      <div className="absolute top-3 right-3 z-20">
                        <ActionMenu
                          items={getActionMenuItems(a)}
                          onActionClick={(action) => handleActionClick(action, a)}
                          trigger={
                                <button
                              onClick={(e) => e.stopPropagation()}
                              className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-white/90 backdrop-blur-sm rounded-lg transition-colors shadow-sm border border-white/20"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                                </button>
                          }
                        />
                            </div>
                      {/* Image Section */}
                      <div className="relative overflow-hidden flex-shrink-0 aspect-[16/9]">
                        <img
                          src={a.image_url || getFallbackImage(a.category || 'announcements', a.title)}
                          alt={a.title || 'Announcement image'}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                          decoding="async"
                          onError={(e) => { e.currentTarget.src = getFallbackImage(a.category || 'announcements', a.title); }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                        
                        {/* Hover overlay for better control visibility */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-200" />
                        
                        {/* Category Badge - Bottom Left */}
                        <div className="absolute bottom-2 left-2">
                          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${categoryInfo.color} bg-white/90 backdrop-blur-sm shadow-sm border border-white/20`}>
                            <categoryInfo.Icon className="w-3 h-3 mr-1" />
                            <span className="hidden sm:inline">{capitalizeCategory(a.category)}</span>
                          </div>
                              </div>
                        
                        {/* Featured/Pinned Badge - Bottom Right */}
                        {(isFeatured || isPinned) && (
                          <div className="absolute bottom-2 right-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center shadow-sm border border-white/20 ${
                              isFeatured ? 'bg-yellow-400/90 backdrop-blur-sm' : 'bg-red-500/90 backdrop-blur-sm'
                            }`}>
                              {isFeatured ? (
                                <Star className="w-3 h-3 text-yellow-800" />
                              ) : (
                                <Pin className="w-3 h-3 text-white" />
                )}
              </div>
            </div>
            )}
          </div>

                      {/* Content Section */}
                      <div className="flex flex-col flex-1 p-6">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-gray-900 line-clamp-2 text-lg flex-1">{a.title}</h3>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusStyles(a.status)}`}>
                                {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
                              </span>
        </div>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <div className="flex items-center">
                                <Calendar className="w-4 h-4 mr-1" />
                                <span>Published: {formatDate(a.published_at || a.publishAt)}</span>
                  </div>
                  </div>
                </div>
              </div>

                            {/* Description */}
                        <p className="text-gray-600 text-sm mb-4 leading-relaxed line-clamp-3 flex-1">
                          {a.summary}
                        </p>

                        {/* Additional Info Box */}
                        {(a.event_date || a.location || a.end_date) && (
                          <div className="space-y-2 mb-4 p-3 bg-gray-50 rounded-lg">
                            {/* Start/End Date Range logic */}
                            {(() => {
                              const hasStart = Boolean(a.event_date);
                              const hasEnd = Boolean(a.end_date);
                              if (hasStart && hasEnd) {
                                return (
                                  <div className="flex items-center text-sm text-gray-600">
                                    <Calendar className="w-4 h-4 mr-2 text-blue-500" />
                                    <span>Event period: {formatDate(a.event_date)} – {formatDate(a.end_date)}</span>
                </div>
                                );
                              }
                              if (hasStart) {
                                return (
                                  <div className="flex items-center text-sm text-gray-600">
                                    <Calendar className="w-4 h-4 mr-2 text-blue-500" />
                                    <span>Event date: {formatDate(a.event_date)}</span>
                  </div>
                                );
                              }
                              if (hasEnd) {
                                return (
                                  <div className="flex items-center text-sm text-red-600">
                                    <Clock className="w-4 h-4 mr-2" />
                                    <span>Deadline: {formatDate(a.end_date)}</span>
                  </div>
                                );
                              }
                              return null;
                            })()}

                            {/* Location */}
                            {a.location && (
                              <div className="flex items-center text-sm text-gray-600">
                                <MapPin className="w-4 h-4 mr-2 text-green-500" />
                                <span className="truncate">{a.location}</span>
                  </div>
                )}
                </div>
                        )}


                        {/* Footer */}
                        <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-auto">
                          <div 
                            className="relative inline-flex items-center text-gray-400 group-hover:text-blue-600 transition-colors w-32"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="absolute left-0 text-sm font-medium opacity-0 transition-opacity duration-200 pointer-events-none group-hover:opacity-100">Read more</span>
                            <ArrowRight className="w-5 h-5 transform transition-transform duration-200 group-hover:translate-x-20" />
                  </div>
                          <div className="flex-1" />
                          <div className="text-xs text-gray-500">
                            Updated: {formatDate(a.updated_at)}
                </div>
              </div>
            </div>
          </div>
          </div>
                );
              })}
        </div>
      )}
                  </div>

        {/* Pagination */}
        {!loading && totalItems > 0 && (
          <div className="px-4 sm:px-6 pb-6">
            <Pagination
              currentPage={currentPage}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onPageChange={(p) => setCurrentPage(p)}
              onItemsPerPageChange={(n) => { setItemsPerPage(n); setCurrentPage(1); }}
              itemName="announcement"
              itemNamePlural="announcements"
              itemsPerPageOptions={[6, 9, 12]}
            />
        </div>
      )}
      </div>
    </div>
  );
};

export default Announcements;


