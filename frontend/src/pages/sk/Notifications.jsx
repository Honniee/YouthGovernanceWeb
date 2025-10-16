import React, { useState, useEffect, useMemo } from 'react';
import { 
  Bell, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Settings, 
  Users, 
  Target, 
  TrendingUp,
  Filter,
  Search,
  ArrowUpDown,
  ChevronDown,
  RefreshCw,
  Download,
  Trash2,
  Eye,
  EyeOff,
  MoreVertical,
  Calendar,
  MapPin,
  UserCheck,
  UserX,
  PieChart,
  Activity,
  X,
  Check,
  Plus,
  GraduationCap,
  Building
} from 'lucide-react';
import { 
  HeaderMainContent, 
  TabContainer, 
  Tab, 
  useTabState, 
  LoadingSpinner, 
  ExportButton, 
  useExport, 
  SearchBar, 
  SortModal, 
  useSortModal, 
  FilterModal, 
  Pagination, 
  usePagination, 
  Status,
  BulkActionsBar,
  DataTable
} from '../../components/portal_main_content';
import { ToastContainer, showSuccessToast, showErrorToast } from '../../components/universal';
import notificationService from '../../services/notificationService';

const Notifications = () => {
  console.log('🔔 SK Notifications component rendering...');
  
  // State management
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedNotifications, setSelectedNotifications] = useState([]);
  const [viewMode, setViewMode] = useState('list');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [markingAllAsRead, setMarkingAllAsRead] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [backendTotalCount, setBackendTotalCount] = useState(0);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [bulkOperations, setBulkOperations] = useState({
    markingAsRead: false,
    deleting: false
  });
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkAction, setBulkAction] = useState('');
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  // Map notification type to badge name for SK users
  const getBadgeFromType = (type) => {
    const badgeMap = {
      'info': 'Info',
      'success': 'Success',
      'warning': 'Warning',
      'error': 'Error',
      'announcement': 'Announcement',
      'survey_reminder': 'Survey',
      'validation_needed': 'Validation',
      'sk_term_end': 'SK Term',
      'kk_batch_end': 'KK Batch',
      'sk_meeting': 'SK Meeting',
      'youth_event': 'Youth Event',
      'training_session': 'Training',
      'election_notice': 'Election Notice',
      'term_update': 'Term Update'
    };
    return badgeMap[type] || 'Notification';
  };

  // Filter and search state
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Tab state
  const { activeTab: statusFilter, setActiveTab: setStatusFilter } = useTabState('all', async (tabId) => {
    setCurrentPage(1);
  });

  // Filter modal state
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterValues, setFilterValues] = useState({
    type: '',
    priority: '',
    dateRange: '',
    status: ''
  });
  const filterTriggerRef = React.useRef(null);

  // Sort modal state
  const sortModal = useSortModal('createdAt', 'desc', (newSortBy, newSortOrder) => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    setCurrentPage(1);
  });

  // Filter and sort notifications
  const getFilteredNotifications = () => {
    let filtered = [...notifications];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(notification => 
        notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        notification.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        notification.badge.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter (from tabs)
    if (statusFilter === 'unread') {
      filtered = filtered.filter(n => !n.isRead);
    } else if (statusFilter === 'high-priority') {
      filtered = filtered.filter(n => n.priority === 'high');
    } else if (statusFilter === 'today') {
      const today = new Date();
      filtered = filtered.filter(n => {
        const notificationDate = new Date(n.createdAt);
        return notificationDate.toDateString() === today.toDateString();
      });
    } else if (statusFilter === 'sk-related') {
      filtered = filtered.filter(n => 
        n.type.includes('sk') || 
        n.type.includes('youth') || 
        n.type.includes('election') ||
        n.type.includes('meeting') ||
        n.type.includes('training')
      );
    }

    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(n => n.type === typeFilter);
    }

    // Apply priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(n => n.priority === priorityFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'type':
          aValue = a.type.toLowerCase();
          bValue = b.type.toLowerCase();
          break;
        case 'priority':
          const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
          aValue = priorityOrder[a.priority] || 0;
          bValue = priorityOrder[b.priority] || 0;
          break;
        case 'createdAt':
        default:
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
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

  // Get filtered notifications for pagination
  const filteredNotifications = getFilteredNotifications();
  
  // Pagination state - use filtered notifications count
  const pagination = usePagination({
    initialPage: currentPage,
    initialItemsPerPage: itemsPerPage,
    totalItems: filteredNotifications.length,
    onPageChange: (page) => {
      setCurrentPage(page);
    },
    onItemsPerPageChange: (itemsPerPage) => {
      setItemsPerPage(itemsPerPage);
      setCurrentPage(1);
    }
  });

  // Get paginated notifications for display
  const getPaginatedNotifications = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredNotifications.slice(startIndex, endIndex);
  };

  const paginatedNotifications = getPaginatedNotifications();

  // Load notifications from API
  const loadNotifications = async () => {
    try {
      console.log('🔔 Loading SK notifications from API...');
      setIsLoading(true);
      setError(null);

      // Fetch all notifications - backend now allows up to 10,000
      const response = await notificationService.getNotifications({
        page: 1,
        limit: 10000 // Backend now allows higher limits for notifications
      });

      console.log('📊 API Response:', response);
      console.log('📊 Response structure:', {
        success: response.success,
        hasData: !!response.data,
        notificationsCount: response.data?.notifications?.length || 0,
        pagination: response.data?.pagination || 'No pagination data',
        totalFromPagination: response.data?.pagination?.total || 'No total count'
      });

      if (response.success && response.data) {
        // Map API data to frontend format
        const mappedNotifications = response.data.notifications.map(notification => ({
          id: notification.id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          priority: notification.priority,
          isRead: notification.isRead,
          createdAt: notification.createdAt,
          badge: getBadgeFromType(notification.type)
        }));

        setNotifications(mappedNotifications);
        
        // Store backend total count for accurate statistics
        const backendTotal = response.data.pagination?.total || 0;
        setBackendTotalCount(backendTotal);
        
        console.log('✅ SK Notifications loaded successfully:', {
          mappedCount: mappedNotifications.length,
          backendTotal: backendTotal,
          backendPage: response.data.pagination?.page || 'Unknown',
          backendLimit: response.data.pagination?.limit || 'Unknown'
        });
        
        // Log warning if counts don't match
        if (backendTotal && mappedNotifications.length !== backendTotal) {
          console.warn('⚠️ Count mismatch detected:', {
            frontendCount: mappedNotifications.length,
            backendTotal: backendTotal,
            difference: Math.abs(mappedNotifications.length - backendTotal)
          });
        }
      } else {
        console.error('❌ Invalid API response format:', response);
        setError('Failed to load notifications');
      }
    } catch (error) {
      console.error('❌ Error loading SK notifications:', error);
      console.error('❌ Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      setError(error.message || 'Failed to load notifications');
      showErrorToast('Error', 'Failed to load notifications');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Load notifications on component mount only (we fetch all notifications at once)
  useEffect(() => {
    loadNotifications();
  }, []); // Empty dependency array - only load once

  // Refresh function
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadNotifications();
  };

  // Calculate notification statistics
  const notificationStats = useMemo(() => {
    // Use backend total count if available, otherwise fall back to notifications length
    const total = backendTotalCount > 0 ? backendTotalCount : notifications.length;
    const unread = notifications.filter(n => !n.isRead).length;
    const highPriority = notifications.filter(n => n.priority === 'high').length;
    const today = notifications.filter(n => {
      const today = new Date();
      const notificationDate = new Date(n.createdAt);
      return notificationDate.toDateString() === today.toDateString();
    }).length;
    const skRelated = notifications.filter(n => 
      n.type.includes('sk') || 
      n.type.includes('youth') || 
      n.type.includes('election') ||
      n.type.includes('meeting') ||
      n.type.includes('training')
    ).length;

    console.log('📊 SK Notification Stats:', {
      total,
      unread,
      highPriority,
      today,
      skRelated,
      backendTotalCount,
      notificationsLength: notifications.length
    });

    return { total, unread, highPriority, today, skRelated };
  }, [notifications, backendTotalCount]);

  // Active filter indicator
  const activeFilterCount = (typeFilter !== 'all' ? 1 : 0) + (priorityFilter !== 'all' ? 1 : 0);
  const hasActiveFilters = activeFilterCount > 0;

  // Helper function to build CSV rows for notifications
  const buildNotificationCsvRows = (notifications = []) => {
    const rows = [];
    rows.push(['Title', 'Message', 'Type', 'Priority', 'Status', 'Date', 'Time']);
    (notifications || []).forEach((n) => {
      const title = n.title || '';
      const message = n.message || '';
      const type = n.badge || '';
      const priority = n.priority || '';
      const status = n.isRead ? 'Read' : 'Unread';
      const date = new Date(n.createdAt).toLocaleDateString();
      const time = new Date(n.createdAt).toLocaleTimeString();
      rows.push([title, message, type, priority, status, date, time]);
    });
    return rows;
  };

  // Helper function to download CSV
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

  // Helper function to build Excel XML for notifications
  const buildNotificationsExcelXml = (notifications = []) => {
    const headerRow = `
      <Row>
        <Cell><Data ss:Type="String">Title</Data></Cell>
        <Cell><Data ss:Type="String">Message</Data></Cell>
        <Cell><Data ss:Type="String">Type</Data></Cell>
        <Cell><Data ss:Type="String">Priority</Data></Cell>
        <Cell><Data ss:Type="String">Status</Data></Cell>
        <Cell><Data ss:Type="String">Date</Data></Cell>
        <Cell><Data ss:Type="String">Time</Data></Cell>
      </Row>`;

    const bodyRows = (notifications || []).map((n) => {
      const title = n.title || '';
      const message = n.message || '';
      const type = n.badge || '';
      const priority = n.priority || '';
      const status = n.isRead ? 'Read' : 'Unread';
      const date = new Date(n.createdAt).toLocaleDateString();
      const time = new Date(n.createdAt).toLocaleTimeString();
      return `
      <Row>
        <Cell><Data ss:Type="String">${title}</Data></Cell>
        <Cell><Data ss:Type="String">${message}</Data></Cell>
        <Cell><Data ss:Type="String">${type}</Data></Cell>
        <Cell><Data ss:Type="String">${priority}</Data></Cell>
        <Cell><Data ss:Type="String">${status}</Data></Cell>
        <Cell><Data ss:Type="String">${date}</Data></Cell>
        <Cell><Data ss:Type="String">${time}</Data></Cell>
      </Row>`;
    }).join('');

    return `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
<Worksheet ss:Name="SK Notifications">
<Table>
${headerRow}
${bodyRows}
</Table>
</Worksheet>
</Workbook>`;
  };

  // Helper function to download Excel
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

  // Helper function to open PDF print view
  const openNotificationPrintPdf = (title, notifications = []) => {
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
        .col-status { width: 8%; text-align: center; }
        .col-priority { width: 8%; text-align: center; }
        thead { display: table-header-group; }
        .title { width: 25%; }
        .message { width: 35%; }
        .type { width: 12%; }
        .date { width: 12%; text-align: center; }
        @page { size: legal landscape; margin: 6mm; }
      </style>`;
    const header = `
      <thead>
        <tr>
          <th class="title">Title</th>
          <th class="message">Message</th>
          <th class="type">Type</th>
          <th class="col-priority">Priority</th>
          <th class="col-status">Status</th>
          <th class="date">Date</th>
        </tr>
      </thead>`;
    const rows = (notifications || []).map((n) => {
      const title = n.title || '';
      const message = n.message || '';
      const type = n.badge || '';
      const priority = n.priority || '';
      const status = n.isRead ? 'Read' : 'Unread';
      const date = new Date(n.createdAt).toLocaleDateString();
      return `
        <tr>
          <td class="title">${title || '&nbsp;'}</td>
          <td class="message">${message || '&nbsp;'}</td>
          <td class="type">${type || '&nbsp;'}</td>
          <td class="col-priority">${priority || '&nbsp;'}</td>
          <td class="col-status">${status || '&nbsp;'}</td>
          <td class="date">${date || '&nbsp;'}</td>
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
            <div><b>SK NOTIFICATIONS REPORT</b></div>
            <div><b>Generated on:</b> ${new Date().toLocaleString()}</div>
            <div><b>Total Notifications:</b> ${notifications.length}</div>
          </div>
          <h2>SK SYSTEM NOTIFICATIONS</h2>
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

  // Export functionality
  const mainExport = useExport({
    exportFunction: async (format, style = null) => {
      try {
        const filteredNotifications = getFilteredNotifications();
        
        if (format === 'csv') {
          const rows = buildNotificationCsvRows(filteredNotifications);
          downloadCsv('sk-notifications.csv', rows);
        } else if (format === 'pdf') {
          openNotificationPrintPdf('SK System Notifications', filteredNotifications);
        } else if (format === 'xlsx' || format === 'excel') {
          const xml = buildNotificationsExcelXml(filteredNotifications);
          downloadExcel('sk-notifications.xls', xml);
        }
        
        return { success: true };
      } catch (error) {
        throw new Error(error.message || 'Failed to export notifications');
      }
    },
    onSuccess: () => showSuccessToast('Export completed', 'SK Notifications exported successfully'),
    onError: (error) => showErrorToast('Export failed', error.message)
  });

  // Event handlers
  const handleSearchChange = (query) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handleSelectItem = (id) => {
    setSelectedNotifications(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const filtered = getFilteredNotifications();
    if (selectedNotifications.length === filtered.length) {
      setSelectedNotifications([]);
    } else {
      setSelectedNotifications(filtered.map(n => n.id));
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await notificationService.markAsRead(id);
      
      // Update local state immediately
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      );
      
      // Refresh data to ensure consistency with backend
      await loadNotifications();
      
      showSuccessToast('Notification marked as read', '');
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      showErrorToast('Error', 'Failed to mark notification as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    setMarkingAllAsRead(true);
    try {
      await notificationService.markAllAsRead();
      
      // Update local state immediately
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setSelectedNotifications([]);
      
      // Refresh data to ensure consistency with backend
      await loadNotifications();
      
      showSuccessToast('All notifications marked as read', '');
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      showErrorToast('Error', 'Failed to mark all notifications as read');
    } finally {
      setMarkingAllAsRead(false);
    }
  };

  const handleDeleteNotification = async (id) => {
    const notification = notifications.find(n => n.id === id);
    if (notification) {
      setNotificationToDelete(notification);
      setShowDeleteModal(true);
    }
  };

  const confirmDeleteNotification = async () => {
    if (!notificationToDelete) return;
    
    try {
      setIsDeleting(true);
      console.log('🗑️ Deleting notification:', notificationToDelete.id);
      
      // Call the backend API to delete the notification
      await notificationService.deleteNotification(notificationToDelete.id);
      
      // Update local state after successful deletion
      setNotifications(prev => prev.filter(n => n.id !== notificationToDelete.id));
      setSelectedNotifications(prev => prev.filter(item => item !== notificationToDelete.id));
      
      // Close modal and reset state
      setShowDeleteModal(false);
      setNotificationToDelete(null);
      
      // Refresh data to ensure consistency with backend
      await loadNotifications();
      
      showSuccessToast('Notification deleted', 'The notification has been permanently deleted');
      console.log('✅ Notification deleted successfully');
    } catch (error) {
      console.error('❌ Failed to delete notification:', error);
      showErrorToast('Error', 'Failed to delete notification');
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDeleteNotification = () => {
    setShowDeleteModal(false);
    setNotificationToDelete(null);
  };

  // Bulk action handlers
  const handleBulkMarkAsRead = async () => {
    console.log('🔔 handleBulkMarkAsRead called with:', selectedNotifications);
    
    const unreadSelected = selectedNotifications.filter(id => {
      const notification = notifications.find(n => n.id === id);
      return notification && !notification.isRead;
    });

    console.log('📋 Unread selected notifications:', unreadSelected);

    if (unreadSelected.length === 0) {
      showSuccessToast('No action needed', 'All selected notifications are already read');
      setSelectedNotifications([]);
      return;
    }

    setBulkOperations(prev => ({ ...prev, markingAsRead: true }));
    
    try {
      // Call API for each unread notification
      for (const id of unreadSelected) {
        await notificationService.markAsRead(id);
      }
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          unreadSelected.includes(n.id) ? { ...n, isRead: true } : n
        )
      );
      
      setSelectedNotifications([]);
      showSuccessToast('Notifications marked as read', `${unreadSelected.length} notifications have been marked as read`);
      
      // Refresh data to ensure consistency
      await loadNotifications();
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
      showErrorToast('Error', 'Failed to mark some notifications as read');
    } finally {
      setBulkOperations(prev => ({ ...prev, markingAsRead: false }));
    }
  };

  const handleBulkDelete = async () => {
    console.log('🗑️ handleBulkDelete called with:', selectedNotifications);
    
    if (selectedNotifications.length === 0) return;

    // Show confirmation modal for bulk delete
    setShowBulkDeleteModal(true);
  };

  const confirmBulkDelete = async () => {
    console.log('✅ Confirmation result: confirmed');

    setBulkOperations(prev => ({ ...prev, deleting: true }));
    
    try {
      let successCount = 0;
      let errorCount = 0;

      // Delete each selected notification
      for (const id of selectedNotifications) {
        try {
          await notificationService.deleteNotification(id);
          successCount++;
        } catch (error) {
          console.error(`Failed to delete notification ${id}:`, error);
          errorCount++;
        }
      }
      
      // Update local state
      setNotifications(prev => 
        prev.filter(n => !selectedNotifications.includes(n.id))
      );
      
      setSelectedNotifications([]);
      
      if (successCount > 0) {
        showSuccessToast(
          'Notifications deleted', 
          `${successCount} notification${successCount > 1 ? 's' : ''} deleted successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}`
        );
      }
      
      if (errorCount > 0) {
        showErrorToast('Partial failure', `${errorCount} notification${errorCount > 1 ? 's' : ''} could not be deleted`);
      }
      
      // Refresh data to ensure consistency
      await loadNotifications();
    } catch (error) {
      console.error('Bulk delete error:', error);
      showErrorToast('Error', 'Failed to delete notifications');
    } finally {
      setBulkOperations(prev => ({ ...prev, deleting: false }));
      setShowBulkDeleteModal(false);
    }
  };

  const cancelBulkDelete = () => {
    setShowBulkDeleteModal(false);
  };

  const handleViewNotification = (notification) => {
    setSelectedNotification(notification);
    setShowNotificationModal(true);
    // Mark as read when viewing
    if (!notification.isRead) {
      handleMarkAsRead(notification.id);
    }
  };

  const handleCloseNotificationModal = () => {
    setShowNotificationModal(false);
    setSelectedNotification(null);
  };

  // Helper functions
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'normal': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityDotColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'normal': return 'bg-blue-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'info': return <Bell className="w-4 h-4" />;
      case 'success': return <CheckCircle className="w-4 h-4" />;
      case 'warning': return <AlertTriangle className="w-4 h-4" />;
      case 'error': return <AlertTriangle className="w-4 h-4" />;
      case 'announcement': return <Bell className="w-4 h-4" />;
      case 'survey_reminder': return <Target className="w-4 h-4" />;
      case 'validation_needed': return <CheckCircle className="w-4 h-4" />;
      case 'sk_term_end': return <Users className="w-4 h-4" />;
      case 'kk_batch_end': return <Target className="w-4 h-4" />;
      case 'sk_meeting': return <Users className="w-4 h-4" />;
      case 'youth_event': return <Calendar className="w-4 h-4" />;
      case 'training_session': return <GraduationCap className="w-4 h-4" />;
      case 'election_notice': return <UserCheck className="w-4 h-4" />;
      case 'term_update': return <Clock className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  const formatRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <HeaderMainContent 
        title="SK Notifications" 
        description="Stay updated with SK system alerts, youth activities, and important announcements."
      />

      {/* Notification Status Banner */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base sm:text-lg font-semibold text-green-900">
                {notificationStats.unread > 0 
                  ? `You have ${notificationStats.unread} unread notification${notificationStats.unread !== 1 ? 's' : ''}`
                  : 'All caught up! No unread notifications'
                }
              </h3>
              <p className="text-xs sm:text-sm text-green-700">
                Last updated: {new Date().toLocaleTimeString()}
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center justify-center px-3 py-2 border border-green-200 text-green-700 text-sm font-medium rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={handleMarkAllAsRead}
              disabled={markingAllAsRead || notificationStats.unread === 0}
              className="inline-flex items-center justify-center px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {markingAllAsRead ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  <span className="hidden sm:inline">Marking...</span>
                  <span className="sm:hidden">Marking...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Mark All Read</span>
                  <span className="sm:hidden">Mark All</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Tab Container */}
            <TabContainer
              activeTab={statusFilter}
              onTabChange={setStatusFilter}
              variant="underline"
              size="md"
            >
              <Tab 
                id="all" 
                label="All Notifications" 
                count={notificationStats.total}
                color="blue"
              />
              <Tab 
                id="unread" 
                label="Unread" 
                count={notificationStats.unread}
                color="yellow"
              />
              <Tab 
                id="high-priority" 
                label="High Priority" 
                count={notificationStats.highPriority}
                color="red"
              />
              <Tab 
                id="sk-related" 
                label="SK Related" 
                count={notificationStats.skRelated}
                color="green"
              />
              <Tab 
                id="today" 
                label="Today" 
                count={notificationStats.today}
                color="emerald"
              />
            </TabContainer>

            {/* Controls */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 overflow-x-auto pb-2 md:pb-0">
                  <div className="flex items-center space-x-3 min-w-max">
                    {/* Search Bar */}
                    <div className="flex-shrink-0">
                      <SearchBar
                        value={searchQuery}
                        onChange={handleSearchChange}
                        placeholder="Search notifications..." 
                        expandOnMobile={true}
                        showIndicator={true}
                        indicatorText="Search"
                        indicatorColor="green"
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
                        hasActiveFilters ? 'border-green-500 text-green-600 bg-green-50' : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Filter</span>
                      <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1" />
                      {hasActiveFilters && (
                        <div className="ml-2 px-1.5 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full border border-green-200">{activeFilterCount}</div>
                      )}
                    </button>

                    {/* Sort Button */}
                    <button 
                      ref={sortModal.triggerRef}
                      onClick={sortModal.toggleModal}
                      className={`inline-flex items-center border rounded-lg font-medium transition-all duration-200 px-2 py-1.5 sm:px-3 sm:py-2 whitespace-nowrap flex-shrink-0 ${
                        !(sortBy === 'createdAt' && sortOrder === 'desc') ? 'border-green-500 text-green-600 bg-green-50' : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <ArrowUpDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Sort</span>
                      <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1" />
                      {!(sortBy === 'createdAt' && sortOrder === 'desc') && (
                        <div className="ml-2 px-1.5 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full border border-green-200">{sortOrder === 'asc' ? '↑' : '↓'}</div>
                      )}
                    </button>

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

              {/* Sort Modal */}
              <SortModal
                isOpen={sortModal.isOpen}
                onClose={sortModal.closeModal}
                triggerRef={sortModal.triggerRef}
                title="Sort Notifications"
                sortFields={[
                  { value: 'createdAt', label: 'Date' },
                  { value: 'title', label: 'Title' },
                  { value: 'type', label: 'Type' },
                  { value: 'priority', label: 'Priority' }
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
                title="Filter SK Notifications"
                filters={[
                  {
                    id: 'type',
                    label: 'Type',
                    type: 'select',
                    placeholder: 'All Types',
                    options: [
                      { value: 'sk_meeting', label: 'SK Meeting' },
                      { value: 'youth_event', label: 'Youth Event' },
                      { value: 'training_session', label: 'Training' },
                      { value: 'election_notice', label: 'Election Notice' },
                      { value: 'term_update', label: 'Term Update' },
                      { value: 'announcement', label: 'Announcement' },
                      { value: 'survey_reminder', label: 'Survey' }
                    ],
                    description: 'Filter by notification type'
                  },
                  {
                    id: 'priority',
                    label: 'Priority',
                    type: 'select',
                    placeholder: 'All Priorities',
                    options: [
                      { value: 'high', label: 'High' },
                      { value: 'medium', label: 'Medium' },
                      { value: 'low', label: 'Low' }
                    ],
                    description: 'Filter by priority level'
                  },
                  {
                    id: 'status',
                    label: 'Status',
                    type: 'select',
                    placeholder: 'All Statuses',
                    options: [
                      { value: 'read', label: 'Read' },
                      { value: 'unread', label: 'Unread' }
                    ],
                    description: 'Filter by read status'
                  }
                ]}
                values={filterValues}
                onChange={setFilterValues}
                onApply={(appliedValues) => {
                  setTypeFilter(appliedValues.type || 'all');
                  setPriorityFilter(appliedValues.priority || 'all');
                  setCurrentPage(1);
                }}
                onClear={(clearedValues) => {
                  setTypeFilter('all');
                  setPriorityFilter('all');
                  setCurrentPage(1);
                }}
                applyButtonText="Apply Filters"
                clearButtonText="Clear All"
              />
            </div>

            {/* Bulk Actions Bar */}
            {selectedNotifications.length > 0 && (
              <BulkActionsBar
                selectedCount={selectedNotifications.length}
                itemName="notification"
                itemNamePlural="notifications"
                onBulkAction={() => setShowBulkModal(true)}
                exportConfig={{
                  formats: ['csv', 'xlsx', 'pdf'],
                  onExport: () => {}, // TODO: Implement bulk export
                  isExporting: false
                }}
                primaryColor="green"
              />
            )}

            {/* Notifications Table */}
            <div className="overflow-hidden">
              {/* Loading State */}
              {isLoading && (
                <div className="p-8 text-center">
                  <div className="relative">
                    <div className="w-12 h-12 border-4 border-green-100 border-t-green-600 rounded-full animate-spin mx-auto"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Bell className="w-5 h-5 text-green-600 animate-pulse" />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-3 font-medium">Loading SK notifications...</p>
                  <p className="text-xs text-gray-500 mt-1">Fetching latest updates</p>
                </div>
              )}

              {/* Error State */}
              {error && !isLoading && (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="w-8 h-8 text-red-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load notifications</h3>
                  <p className="text-gray-600 mb-4">{error}</p>
                  <button
                    onClick={loadNotifications}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                  </button>
                </div>
              )}

              {/* Table Content - Only show when not loading and no error */}
              {!isLoading && !error && (
                <>
                  {/* Desktop Table View */}
                  <div className="hidden lg:block">
                    <table className="w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          checked={selectedNotifications.length === paginatedNotifications.length && paginatedNotifications.length > 0}
                          onChange={handleSelectAll}
                          className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                      <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Message</th>
                      <th className="hidden lg:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedNotifications.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="px-6 py-16 text-center">
                          <div className="flex flex-col items-center">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                              <Bell className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">No notifications found</h3>
                            <p className="text-gray-600">
                              {paginatedNotifications.length === 0 
                                ? "No notifications match your current filters."
                                : "No notifications available at the moment."
                              }
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedNotifications.map((notification) => (
                        <tr 
                          key={notification.id} 
                          className={`hover:bg-gray-50 transition-colors cursor-pointer ${!notification.isRead ? 'bg-green-50/30' : ''}`}
                          onClick={(e) => {
                            // Don't open modal if clicking on checkbox, action buttons, or other interactive elements
                            if (e.target.closest('input[type="checkbox"]') || 
                                e.target.closest('button') || 
                                e.target.closest('a') ||
                                e.target.closest('[role="button"]')) {
                              return;
                            }
                            handleViewNotification(notification);
                          }}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={selectedNotifications.includes(notification.id)}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleSelectItem(notification.id);
                              }}
                              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-8 w-8">
                                <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                                  {getTypeIcon(notification.type)}
                                </div>
                              </div>
                              <div className="ml-3">
                                <div className="text-sm font-medium text-gray-900">{notification.badge}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{notification.title}</div>
                          </td>
                          <td className="hidden md:table-cell px-6 py-4">
                            <div className="text-sm text-gray-600 max-w-xs truncate">{notification.message}</div>
                          </td>
                          <td className="hidden lg:table-cell px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(notification.priority)}`}>
                              {notification.priority.charAt(0).toUpperCase() + notification.priority.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              notification.isRead 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {notification.isRead ? 'Read' : 'Unread'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(notification.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end space-x-2">
                              {!notification.isRead && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMarkAsRead(notification.id);
                                  }}
                                  className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors"
                                  title="Mark as Read"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteNotification(notification.id);
                                }}
                                className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile/Tablet Card View */}
              <div className="lg:hidden">
                {paginatedNotifications.length === 0 ? (
                  <div className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <Bell className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No notifications found</h3>
                      <p className="text-gray-600">
                        {paginatedNotifications.length === 0 
                          ? "No notifications match your current filters."
                          : "No notifications available at the moment."
                        }
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {paginatedNotifications.map((notification) => (
                      <div 
                        key={notification.id} 
                        className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${!notification.isRead ? 'bg-green-50/30' : ''}`}
                        onClick={(e) => {
                          // Don't open modal if clicking on checkbox or other interactive elements
                          if (e.target.closest('input[type="checkbox"]') || 
                              e.target.closest('button') || 
                              e.target.closest('a') ||
                              e.target.closest('[role="button"]')) {
                            return;
                          }
                          handleViewNotification(notification);
                        }}
                      >
                        <div className="flex items-start space-x-3">
                          {/* Checkbox */}
                          <div className="flex-shrink-0 pt-1">
                            <input
                              type="checkbox"
                              checked={selectedNotifications.includes(notification.id)}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleSelectItem(notification.id);
                              }}
                              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                            />
                          </div>

                          {/* Icon */}
                          <div className="flex-shrink-0">
                            <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                              {getTypeIcon(notification.type)}
                            </div>
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            {/* Header: Title (left) and Date + Priority (right) */}
                            <div className="flex items-start justify-between mb-2">
                              <h3 className="text-sm font-medium text-gray-900 truncate pr-2">
                                {notification.title}
                              </h3>
                              <div className="flex items-center space-x-2 flex-shrink-0">
                                <div className={`w-2 h-2 rounded-full ${getPriorityDotColor(notification.priority)}`} title={notification.priority}></div>
                                <span className="text-xs text-gray-500">
                                  {new Date(notification.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>

                            {/* Description */}
                            <p className="text-xs text-gray-600 line-clamp-2">
                              {notification.message}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

                  {/* Pagination */}
                  {filteredNotifications.length > 0 && (
                    <Pagination
                      currentPage={currentPage}
                      totalItems={filteredNotifications.length}
                      itemsPerPage={itemsPerPage}
                      onPageChange={pagination.handlePageChange}
                      onItemsPerPageChange={pagination.handleItemsPerPageChange}
                      itemName="notification"
                      itemNamePlural="notifications"
                      showItemsPerPage={true}
                      showInfo={true}
                      size="md"
                      variant="default"
                      itemsPerPageOptions={[5, 10, 20, 50]}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </div>

      {/* Bulk Operations Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 flex items-center justify-center z-[99999] p-4 backdrop-blur-[1px]">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Bulk Operations</h3>
              <p className="text-sm text-gray-600 mt-1">
                {selectedNotifications.length} notification{selectedNotifications.length > 1 ? 's' : ''} selected
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="">Select an action</option>
                  <option value="markAsRead">Mark as Read</option>
                  <option value="delete">Delete</option>
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
                onClick={() => {
                  if (bulkAction === 'markAsRead') {
                    handleBulkMarkAsRead();
                    setShowBulkModal(false);
                    setBulkAction('');
                  } else if (bulkAction === 'delete') {
                    setShowBulkModal(false);
                    setBulkAction('');
                    handleBulkDelete();
                  }
                }}
                disabled={!bulkAction || bulkOperations.markingAsRead || bulkOperations.deleting}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {bulkOperations.markingAsRead ? 'Marking as Read...' : 
                 bulkOperations.deleting ? 'Deleting...' : 'Execute'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md border border-gray-200/50 transform transition-all duration-300 ease-out">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                    <Trash2 className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Delete Notifications</h3>
                    <p className="text-sm text-gray-600">This action cannot be undone</p>
                  </div>
                </div>
                <button
                  onClick={cancelBulkDelete}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="mb-6">
                <p className="text-gray-700 mb-3">
                  Are you sure you want to delete <strong>{selectedNotifications.length} notification{selectedNotifications.length > 1 ? 's' : ''}</strong>?
                </p>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <p className="text-sm text-gray-600">
                    This will permanently remove the selected notifications from the system. This action cannot be undone.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
                <button
                  onClick={cancelBulkDelete}
                  disabled={bulkOperations.deleting}
                  className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmBulkDelete}
                  disabled={bulkOperations.deleting}
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors disabled:opacity-50"
                >
                  {bulkOperations.deleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete {selectedNotifications.length} Notification{selectedNotifications.length > 1 ? 's' : ''}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notification Details Modal */}
      {showNotificationModal && selectedNotification && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm sm:max-w-lg lg:max-w-xl border border-gray-200/50 transform transition-all duration-300 ease-out overflow-hidden">
            <div className="p-6 sm:p-8">
               {/* Modal Header */}
               <div className="flex items-start sm:items-center justify-between mb-6 gap-4">
                 <div className="flex items-center space-x-4 min-w-0 flex-1">
                   <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center flex-shrink-0 shadow-sm border border-green-200/50">
                     <div className="text-green-600">
                       {getTypeIcon(selectedNotification.type)}
                     </div>
                   </div>
                   <div className="min-w-0 flex-1">
                     <h3 className="text-lg sm:text-xl font-bold text-gray-900 truncate mb-2">
                       {selectedNotification.title}
                     </h3>
                     <div className="flex items-center space-x-3">
                       <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border-2 ${getPriorityColor(selectedNotification.priority)}`}>
                         {selectedNotification.priority.charAt(0).toUpperCase() + selectedNotification.priority.slice(1)} Priority
                       </span>
                       <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${
                         selectedNotification.isRead 
                           ? 'bg-green-100 text-green-700 border border-green-200' 
                           : 'bg-green-100 text-green-700 border border-green-200'
                       }`}>
                         {selectedNotification.isRead ? 'Read' : 'Unread'}
                       </span>
                     </div>
                   </div>
                 </div>
                 <button
                   onClick={handleCloseNotificationModal}
                   className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-2 transition-all duration-200"
                 >
                   <X className="w-5 h-5 sm:w-6 sm:h-6" />
                 </button>
               </div>

               {/* Modal Content */}
               <div className="space-y-6">
                 <div className="bg-gray-50 rounded-xl p-4 sm:p-6 border border-gray-200/50">
                   <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
                     {selectedNotification.message}
                   </p>
                 </div>


                 {/* Action Buttons */}
                 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-6 border-t border-gray-200/60 gap-4">
                   <div className="flex flex-col sm:flex-row gap-3">
                     {!selectedNotification.isRead && (
                       <button
                         onClick={() => {
                           handleMarkAsRead(selectedNotification.id);
                           handleCloseNotificationModal();
                         }}
                         className="inline-flex items-center justify-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-xl text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200 shadow-sm hover:shadow-md"
                       >
                         <Check className="w-4 h-4 mr-2" />
                         Mark as Read
                       </button>
                     )}
                     <button
                       onClick={() => {
                         handleDeleteNotification(selectedNotification.id);
                         handleCloseNotificationModal();
                       }}
                       className="inline-flex items-center justify-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-xl text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 shadow-sm hover:shadow-md"
                     >
                       <Trash2 className="w-4 h-4 mr-2" />
                       Delete
                     </button>
                   </div>
                   <div className="flex items-center space-x-2 text-sm text-gray-500">
                     <span className="hidden sm:inline">Created:</span>
                     <span className="font-medium text-gray-600">
                       {new Date(selectedNotification.createdAt).toLocaleDateString()}
                     </span>
                   </div>
                 </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && notificationToDelete && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md border border-gray-200/50 transform transition-all duration-300 ease-out">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                    <Trash2 className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Delete Notification</h3>
                    <p className="text-sm text-gray-600">This action cannot be undone</p>
                  </div>
                </div>
                <button
                  onClick={cancelDeleteNotification}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="mb-6">
                <p className="text-gray-700 mb-3">
                  Are you sure you want to delete this notification?
                </p>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-2">{notificationToDelete.title}</h4>
                  <p className="text-sm text-gray-600 line-clamp-2">{notificationToDelete.message}</p>
                  <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(notificationToDelete.priority)}`}>
                      {notificationToDelete.priority}
                    </span>
                    <span>{new Date(notificationToDelete.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
                <button
                  onClick={cancelDeleteNotification}
                  disabled={isDeleting}
                  className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteNotification}
                  disabled={isDeleting}
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors disabled:opacity-50"
                >
                  {isDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Notification
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Container */}
      <ToastContainer position="top-right" maxToasts={5} />
    </div>
  );
};

export default Notifications;