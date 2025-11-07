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
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  getAnnouncements, 
  deleteAnnouncement, 
  bulkUpdateAnnouncementStatus,
  updateAnnouncement,
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
import { useRealtime } from '../../realtime/useRealtime';
import { ToastContainer, showSuccessToast, showErrorToast, showInfoToast, ConfirmationModal, useConfirmation } from '../../components/universal';

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

// Helper function to convert relative URLs to full URLs
const getFileUrl = (path) => {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  let base = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/?api\/?$/, '');
  if (!base) {
    // sensible dev fallback if env not set
    if (window.location && /localhost|127\.0\.0\.1/.test(window.location.hostname)) {
      base = 'http://localhost:3001';
    }
  }
  return `${base}${path}`;
};

const Announcements = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const confirmation = (useConfirmation && useConfirmation()) || { showConfirmation: async () => true, hideConfirmation: () => {}, setLoading: () => {}, modalProps: {} };
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
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [featuredFilter, setFeaturedFilter] = useState('all');
  const [pinnedFilter, setPinnedFilter] = useState('all');
  const [dateRangeFilter, setDateRangeFilter] = useState({ start: '', end: '' });
  const [sortBy, setSortBy] = useState('publishAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const sortModal = useSortModal('publishAt', 'desc', (by, order) => {
    setSortBy(by);
    setSortOrder(order);
    setCurrentPage(1);
  });
  const filterTriggerRef = useRef(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showBulkActionsModal, setShowBulkActionsModal] = useState(false);
  // Auto-publish tracking to avoid reprocessing the same IDs
  const autoPublishProcessedRef = useRef(new Set());
  // Guard to ensure flash toast is processed only once
  const flashHandledRef = useRef(false);

  // Fetch announcements (full and silent)
  const fetchAnnouncementsData = async (opts = { silent: false, pageOverride: null }) => {
    const { silent, pageOverride } = opts || { silent: false };
    try {
      if (!silent) { setLoading(true); setError(null); }
      const params = {
        page: pageOverride ?? currentPage,
        limit: itemsPerPage,
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: searchQuery || undefined,
        category: categoryFilter === 'all' ? undefined : categoryFilter,
        is_featured: featuredFilter === 'all' ? undefined : featuredFilter === 'featured',
        is_pinned: pinnedFilter === 'all' ? undefined : pinnedFilter === 'pinned',
        date_from: dateRangeFilter.start || undefined,
        date_to: dateRangeFilter.end || undefined,
        sortBy: sortBy === 'publishAt' ? 'published_at' : sortBy,
        sortOrder: (sortOrder || 'desc').toUpperCase()
      };
      const response = await getAnnouncements(params);
      setAnnouncements(response.data || []);
      setTotalItems(response.pagination?.total || 0);
    } catch (err) {
      if (!silent) setError(err.message || 'Failed to fetch announcements');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Fetch announcements data
  useEffect(() => {
    // Handle flash toast from navigation state (once)
    if (!flashHandledRef.current && location?.state?.flash) {
      flashHandledRef.current = true;
      const { type, title, message } = location.state.flash;
      if (type === 'success') showSuccessToast && showSuccessToast(title || 'Success', message || '');
      else if (type === 'error') showErrorToast && showErrorToast(title || 'Error', message || '');
      else showInfoToast && showInfoToast(title || 'Info', message || '');
      // Clear flash state so it doesn't reappear on back/forward
      navigate('.', { replace: true, state: {} });
    }

    fetchAnnouncementsData({ silent: false });
  }, [location?.state?.flash, currentPage, itemsPerPage, statusFilter, searchQuery, categoryFilter, featuredFilter, pinnedFilter, dateRangeFilter, sortBy, sortOrder]);

  useRealtime('announcement:changed', () => {
    fetchAnnouncementsData({ silent: true });
    // silently refresh tab statistics
    (async () => {
      try {
        const response = await getAnnouncementStatistics();
        if (response.success && response.data) {
          setStatistics({
            total: response.data.total || 0,
            published: response.data.by_status?.published || 0,
            draft: response.data.by_status?.draft || 0,
            archived: response.data.by_status?.archived || 0
          });
        }
      } catch (_) {}
    })();
  });

  // Auto-publish sweep: publish drafts whose published_at is due
  useEffect(() => {
    const runAutoPublishIfNeeded = async () => {
      if (!announcements || announcements.length === 0) return;

      // Find drafts that should be published now (published_at <= now)
      const now = new Date();
      const dueDrafts = announcements.filter(a => {
        if (!a) return false;
        const isDraft = (a.status || '').toString().toLowerCase() === 'draft';
        if (!isDraft) return false;
        if (!a.published_at) return false; // Only auto-publish if user set a date
        const due = new Date(a.published_at) <= now;
        const id = a.announcement_id || a.id;
        const alreadyProcessed = id && autoPublishProcessedRef.current.has(id);
        return due && !alreadyProcessed;
      });

      if (dueDrafts.length === 0) return;
      try {
        for (const item of dueDrafts) {
          const id = item.announcement_id || item.id;
          if (!id) continue;
          try {
            await updateAnnouncement(id, { status: 'published' });
            autoPublishProcessedRef.current.add(id);
          } catch (e) {
            // Continue with others even if one fails
            console.error('Auto-publish failed for', id, e);
          }
        }
        // Refresh after auto-publishing
        await refreshData();
      } catch (e) {
        console.error('Auto-publish sweep error:', e);
      }
    };

    runAutoPublishIfNeeded();
  }, [announcements]);

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

  // Derived options - All possible categories
  const categories = useMemo(() => {
    // Define all possible categories in the system (matching the UI)
    const allCategories = [
      'projects',
      'programs', 
      'activities',
      'meetings',
      'achievement',
      'announcements'
    ];
    return ['all', ...allCategories];
  }, []);

  // Status counts - using real database statistics
  const statusCounts = useMemo(() => {
    return {
      total: statistics.total,
      published: statistics.published,
      draft: statistics.draft,
      archived: statistics.archived
    };
  }, [statistics]);

  const hasActiveFilters = (categoryFilter !== 'all') || (featuredFilter !== 'all') || (pinnedFilter !== 'all') || (dateRangeFilter.start || dateRangeFilter.end);
  const activeFilterCount = (categoryFilter !== 'all' ? 1 : 0) + (featuredFilter !== 'all' ? 1 : 0) + (pinnedFilter !== 'all' ? 1 : 0) + (dateRangeFilter.start || dateRangeFilter.end ? 1 : 0);

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
    const allAnnouncementIds = paged.map(item => item.announcement_id || item.id).filter(Boolean);
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
    let modalUsed = false;
    try {
      console.log('🎯 Action clicked:', action, 'for item:', item);
      
      switch (action) {
        case 'view':
          navigate(`/staff/announcements/${item.announcement_id || item.id}`);
          break;
        case 'edit':
          navigate(`/staff/announcements/${item.announcement_id || item.id}/edit`);
          break;
        case 'publish':
          // Confirm publish
          {
            const ok = await (confirmation.showConfirmation
              ? confirmation.showConfirmation({
                  title: 'Publish announcement?',
                  message: 'This will make the announcement publicly visible.',
                  confirmText: 'Publish',
                  cancelText: 'Cancel',
                  variant: 'success'
                })
              : Promise.resolve(true));
            if (!ok) return;
            modalUsed = true;
            confirmation.setLoading && confirmation.setLoading(true);
          }
          
          // Update status to published
          console.log('🔄 Publishing announcement:', item.announcement_id || item.id);
          const publishResult = await updateAnnouncement(item.announcement_id || item.id, { status: 'published' });
          console.log('📊 Publish result:', publishResult);
          // Refresh data and statistics
          await refreshData();
          showSuccessToast && showSuccessToast('Published', 'Announcement published successfully');
          break;
        case 'archive':
          // Confirm archive
          {
            const ok = await (confirmation.showConfirmation
              ? confirmation.showConfirmation({
                  title: 'Archive announcement?',
                  message: 'This will move the announcement to Archived. You can restore it later.',
                  confirmText: 'Archive',
                  cancelText: 'Cancel',
                  variant: 'warning'
                })
              : Promise.resolve(true));
            if (!ok) return;
            modalUsed = true;
            confirmation.setLoading && confirmation.setLoading(true);
          }
          
          // Update status to archived
          console.log('🔄 Archiving announcement:', item.announcement_id || item.id);
          try {
            const archiveResult = await updateAnnouncement(item.announcement_id || item.id, { status: 'archived' });
            console.log('📊 Archive result:', archiveResult);
            console.log('✅ Archive operation completed successfully');
          // Refresh data and statistics
          await refreshData();
            showSuccessToast && showSuccessToast('Archived', 'Announcement archived successfully');
          } catch (archiveError) {
            console.error('❌ Archive operation failed:', archiveError);
            throw archiveError; // Re-throw to be caught by outer catch
          }
          break;
        case 'restore':
          // Confirm restore
          {
            const ok = await (confirmation.showConfirmation
              ? confirmation.showConfirmation({
                  title: 'Restore announcement?',
                  message: 'This will restore the announcement from Archived to Published.',
                  confirmText: 'Restore',
                  cancelText: 'Cancel',
                  variant: 'success'
                })
              : Promise.resolve(true));
            if (!ok) return;
            modalUsed = true;
            confirmation.setLoading && confirmation.setLoading(true);
          }
          
          // Update status to published
          console.log('🔄 Restoring announcement:', item.announcement_id || item.id);
          const restoreResult = await updateAnnouncement(item.announcement_id || item.id, { status: 'published' });
          console.log('📊 Restore result:', restoreResult);
          // Refresh data and statistics
          await refreshData();
          showSuccessToast && showSuccessToast('Restored', 'Announcement restored successfully');
          break;
        case 'delete':
          // Confirm delete
          {
            const ok = await (confirmation.showConfirmation
              ? confirmation.showConfirmation({
                  title: 'Delete announcement?',
                  message: 'This will permanently delete the announcement. This action cannot be undone.',
                  confirmText: 'Delete',
                  cancelText: 'Cancel',
                  variant: 'danger'
                })
              : Promise.resolve(true));
            if (!ok) return;
            modalUsed = true;
            confirmation.setLoading && confirmation.setLoading(true);
          }
          
          // Delete announcement
          console.log('🔄 Deleting announcement:', item.announcement_id || item.id);
          try {
            const deleteResult = await deleteAnnouncement(item.announcement_id || item.id);
            console.log('📊 Delete result:', deleteResult);
            console.log('✅ Delete operation completed successfully');
          // Refresh data and statistics
          await refreshData();
            showSuccessToast && showSuccessToast('Deleted', 'Announcement deleted successfully');
          } catch (deleteError) {
            console.error('❌ Delete operation failed:', deleteError);
            throw deleteError; // Re-throw to be caught by outer catch
          }
          break;
      }
    } catch (error) {
      console.error(`❌ Error performing ${action} action:`, error);
      console.error('❌ Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      // Check if it's actually a success response that's being treated as an error
      if (error.response?.data?.success === true) {
        console.log('✅ Operation actually succeeded, refreshing data...');
        await refreshData();
        showSuccessToast && showSuccessToast('Completed', `Announcement ${action}d successfully`);
        return;
      }
      
      showErrorToast && showErrorToast('Operation failed', `Failed to ${action} announcement. Please try again.`);
    } finally {
      // Ensure modal loading is cleared and modal closed if used
      if (modalUsed) {
        confirmation.setLoading && confirmation.setLoading(false);
        confirmation.hideConfirmation && confirmation.hideConfirmation();
      }
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
        category: categoryFilter === 'all' ? undefined : categoryFilter,
        is_featured: featuredFilter === 'all' ? undefined : featuredFilter === 'featured',
        is_pinned: pinnedFilter === 'all' ? undefined : pinnedFilter === 'pinned',
        date_from: dateRangeFilter.start || undefined,
        date_to: dateRangeFilter.end || undefined,
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

  // Bulk update handler
  const handleBulkUpdate = async (action) => {
    if (selectedItems.length === 0) {
      showInfoToast && showInfoToast('No items selected', 'Please select at least one announcement');
      return;
    }

    try {
      setLoading(true);
      
      let newStatus;
      let actionText;
      
      switch (action) {
        case 'archive':
          newStatus = 'archived';
          actionText = 'archived';
          break;
        case 'publish':
          newStatus = 'published';
          actionText = 'published';
          break;
        case 'restore':
          newStatus = 'published';
          actionText = 'restored';
          break;
        case 'delete':
          // Handle bulk delete with confirmation
          {
            const ok = await (confirmation.showConfirmation
              ? confirmation.showConfirmation({
                  title: 'Delete announcements?',
                  message: `This will permanently delete ${selectedItems.length} announcement(s). This action cannot be undone.`,
                  confirmText: 'Delete',
                  cancelText: 'Cancel',
                  variant: 'danger'
                })
              : Promise.resolve(true));
            if (!ok) return;
            confirmation.setLoading && confirmation.setLoading(true);
          }
          showInfoToast && showInfoToast('Deleting…', 'Please wait while we delete the selected announcements');
          
          for (const id of selectedItems) {
            await deleteAnnouncement(id);
          }
          actionText = 'deleted';
          break;
        default:
          return;
      }

      if (action !== 'delete') {
        // Use individual updates instead of bulk update to avoid backend issues
        console.log(`🔄 Performing individual ${action} for ${selectedItems.length} announcements`);
        
        for (const id of selectedItems) {
          try {
            await updateAnnouncement(id, { status: newStatus });
            console.log(`✅ ${action} successful for announcement: ${id}`);
          } catch (individualError) {
            console.error(`❌ Failed to ${action} announcement ${id}:`, individualError);
            // Continue with other announcements even if one fails
          }
        }
      }

      // Clear selection and refresh data
      setSelectedItems([]);
      await refreshData();
      
      showSuccessToast && showSuccessToast('Completed', `Successfully ${actionText} ${selectedItems.length} announcement(s)`);
      
    } catch (error) {
      console.error(`Error performing bulk ${action}:`, error);
      showErrorToast && showErrorToast('Bulk operation failed', `Failed to ${action} announcements. Please try again.`);
    } finally {
      setLoading(false);
      confirmation.setLoading && confirmation.setLoading(false);
      confirmation.hideConfirmation && confirmation.hideConfirmation();
    }
  };
 
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <HeaderMainContent
        title="Announcements"
        description="Public communications and updates for the youth community."
      >
        <button
          type="button"
          className="inline-flex items-center px-3 sm:px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors"
          onClick={() => navigate('/staff/announcements/create')}
        >
          <Plus className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">New Announcement</span>
          <span className="sm:hidden">New</span>
        </button>
      </HeaderMainContent>

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
              { value: 'publishAt', label: 'Published Date' },
                  { value: 'title', label: 'Title' }
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
                    id: 'category',
                    label: 'Category',
                    type: 'select',
                    placeholder: 'All Categories',
                    options: categories.slice(1).map(c => ({ 
                      value: c, 
                      label: c.charAt(0).toUpperCase() + c.slice(1).replace('_', ' ')
                    }))
                  },
                  {
                    id: 'featured',
                    label: 'Featured',
                    type: 'select',
                    placeholder: 'All Announcements',
                    options: [
                      { value: 'featured', label: 'Featured Only' },
                      { value: 'not_featured', label: 'Not Featured' }
                    ]
                  },
                  {
                    id: 'pinned',
                    label: 'Pinned',
                    type: 'select',
                    placeholder: 'All Announcements',
                    options: [
                      { value: 'pinned', label: 'Pinned Only' },
                      { value: 'not_pinned', label: 'Not Pinned' }
                    ]
                  },
                  {
                    id: 'dateRange',
                    label: 'Published Date Range',
                    type: 'daterange',
                    placeholder: 'Select published date range'
                  }
                ]}
                values={{ 
                  category: categoryFilter === 'all' ? '' : categoryFilter, 
                  featured: featuredFilter === 'all' ? '' : featuredFilter,
                  pinned: pinnedFilter === 'all' ? '' : pinnedFilter,
                  dateRange: dateRangeFilter
                }}
                onChange={(vals) => {
                  // Update the values immediately when changed
                  setCategoryFilter(vals.category || 'all');
                  setFeaturedFilter(vals.featured || 'all');
                  setPinnedFilter(vals.pinned || 'all');
                  setDateRangeFilter(vals.dateRange || { start: '', end: '' });
                }}
            onApply={(vals) => {
                  setCategoryFilter(vals.category || 'all');
                  setFeaturedFilter(vals.featured || 'all');
                  setPinnedFilter(vals.pinned || 'all');
                  setDateRangeFilter(vals.dateRange || { start: '', end: '' });
                  setCurrentPage(1);
                }}
            onClear={() => {
                  setCategoryFilter('all');
                  setFeaturedFilter('all');
                  setPinnedFilter('all');
                  setDateRangeFilter({ start: '', end: '' });
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
                  checked={paged.length > 0 && selectedItems.length === paged.length && paged.every(item => selectedItems.includes(item.announcement_id || item.id))}
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
              onBulkAction={() => setShowBulkActionsModal(true)}
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
                
                const key = a.announcement_id || a.id || `${a.title}-${a.updated_at}`;
                return (
                  <div key={key} className="group relative h-full">
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
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                            className="w-4 h-4 text-blue-600 bg-white/90 backdrop-blur-sm border-gray-300 rounded-md focus:ring-blue-500 focus:ring-2 shadow-sm"
                            />
                        </label>
                          </div>

                      {/* Action Menu */}
                      <div className="absolute top-3 right-3 z-20">
                        <ActionMenu
                          items={getActionMenuItems(a)}
                          onAction={(action) => handleActionClick(action, a)}
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
                          src={a.image_url ? getFileUrl(a.image_url) : getFallbackImage(a.category || 'announcements', a.title)}
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
                        
                        {/* Featured/Pinned Badges - Bottom Right */}
                        {(isFeatured || isPinned) && (
                          <div className="absolute bottom-2 right-2 flex items-center space-x-1">
                            {isFeatured && (
                              <div className="w-6 h-6 rounded-full flex items-center justify-center shadow-sm border border-white/20 bg-yellow-400/90 backdrop-blur-sm">
                                <Star className="w-3 h-3 text-yellow-800" />
                              </div>
                            )}
                            {isPinned && (
                              <div className="w-6 h-6 rounded-full flex items-center justify-center shadow-sm border border-white/20 bg-red-500/90 backdrop-blur-sm">
                                <Pin className="w-3 h-3 text-white" />
                              </div>
                )}
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

      {/* Bulk Actions Modal */}
      {showBulkActionsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4" onClick={() => setShowBulkActionsModal(false)}>
          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-xl max-w-md w-full mx-4 border border-gray-200/70" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Bulk Actions</h3>
              <p className="text-sm text-gray-600 mt-1">
                {selectedItems.length} announcement{selectedItems.length !== 1 ? 's' : ''} selected
              </p>
            </div>
            
            <div className="px-6 py-4 space-y-3">
              <button
                onClick={() => {
                  handleBulkUpdate('archive');
                  setShowBulkActionsModal(false);
                }}
                className="w-full flex items-center px-4 py-3 text-left text-gray-700 hover:bg-orange-50 rounded-lg transition-all duration-200 hover:shadow-sm border border-transparent hover:border-orange-200"
              >
                <Archive className="w-5 h-5 mr-3 text-orange-500" />
                <div>
                  <div className="font-medium">Archive</div>
                  <div className="text-sm text-gray-500">Move to archived status</div>
                </div>
              </button>
              
              <button
                onClick={() => {
                  handleBulkUpdate('publish');
                  setShowBulkActionsModal(false);
                }}
                className="w-full flex items-center px-4 py-3 text-left text-gray-700 hover:bg-green-50 rounded-lg transition-all duration-200 hover:shadow-sm border border-transparent hover:border-green-200"
              >
                <Check className="w-5 h-5 mr-3 text-green-500" />
                <div>
                  <div className="font-medium">Publish</div>
                  <div className="text-sm text-gray-500">Make announcements public</div>
                </div>
              </button>
              
              <button
                onClick={() => {
                  handleBulkUpdate('restore');
                  setShowBulkActionsModal(false);
                }}
                className="w-full flex items-center px-4 py-3 text-left text-gray-700 hover:bg-blue-50 rounded-lg transition-all duration-200 hover:shadow-sm border border-transparent hover:border-blue-200"
              >
                <ArrowRight className="w-5 h-5 mr-3 text-blue-500" />
                <div>
                  <div className="font-medium">Restore</div>
                  <div className="text-sm text-gray-500">Restore from archived</div>
                </div>
              </button>
              
              <button
                onClick={() => {
                  handleBulkUpdate('delete');
                  setShowBulkActionsModal(false);
                }}
                className="w-full flex items-center px-4 py-3 text-left text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200 hover:shadow-sm border border-transparent hover:border-red-200"
              >
                <Trash2 className="w-5 h-5 mr-3 text-red-500" />
                <div>
                  <div className="font-medium">Delete</div>
                  <div className="text-sm text-gray-500">Permanently remove announcements</div>
                </div>
              </button>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end space-x-3">
              <button
                onClick={() => setShowBulkActionsModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Toast container */}
      <ToastContainer position="top-right" maxToasts={5} />
      <div className="relative z-[99999]">
        <ConfirmationModal {...(confirmation?.modalProps || {})} />
      </div>
    </div>
  );
};

export default Announcements;


