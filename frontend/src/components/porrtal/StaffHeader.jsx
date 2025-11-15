import React, { useState, useRef, useEffect } from 'react';
import { Menu, Bell, Grid3X3, User, Settings, LogOut, ChevronDown, X, Check, Clock, AlertTriangle, Info, CheckCircle, Zap, Eye, EyeOff, RefreshCw, ArrowRight } from 'lucide-react';
import sanJoseLogo from '../../assets/logos/san_jose_logo.webp';
import notificationService from '../../services/notificationService';
import { useNavigate } from 'react-router-dom';
import logger from '../../utils/logger.js';

const StaffHeader = ({ sidebarOpen, setSidebarOpen, user, onLogout }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showApps, setShowApps] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [markingAllAsRead, setMarkingAllAsRead] = useState(false);
  const [markAllSuccess, setMarkAllSuccess] = useState(false);
  const notificationRef = useRef(null);
  const profileRef = useRef(null);
  const navigate = useNavigate();

  // Load notifications data
  const loadNotifications = async () => {
    try {
      logger.debug('Loading notifications');
      setLoadingNotifications(true);
      
      const [notificationsResponse, unreadCountResponse] = await Promise.all([
        notificationService.getNotifications({ limit: 5, page: 1 }),
        notificationService.getUnreadCount()
      ]);
      
      logger.debug('Notifications loaded', { 
        count: notificationsResponse.data?.notifications?.length || 0,
        unreadCount: unreadCountResponse 
      });
      
      setNotifications(notificationsResponse.data.notifications);
      setUnreadCount(unreadCountResponse);
    } catch (error) {
      logger.error('Failed to load notifications', error);
      // Fallback to empty state
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoadingNotifications(false);
    }
  };

  // Mark notification as read
  const handleMarkAsRead = async (notificationId) => {
    try {
      await notificationService.markAsRead(notificationId);
      // Update local state
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, isRead: true }
            : notification
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      logger.error('Failed to mark notification as read', error, { notificationId });
    }
  };

  // Mark all notifications as read
  const handleMarkAllAsRead = async () => {
    try {
      setMarkingAllAsRead(true);
      logger.debug('Marking all notifications as read');
      
      // Try the API call first
      let apiSuccess = false;
      try {
        const response = await notificationService.markAllAsRead();
        logger.debug('Mark all as read response', { response });
        apiSuccess = true;
      } catch (apiError) {
        logger.error('API call failed to mark all as read', apiError, {
          message: apiError.message,
          response: apiError.response?.data,
          status: apiError.response?.status,
          statusText: apiError.response?.statusText
        });
        
        // Don't update local state if API fails - show error instead
        throw new Error(`API call failed: ${apiError.message}`);
      }
      
      // Update local state (this will work regardless of API status)
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, isRead: true }))
      );
      setUnreadCount(0);
      
      logger.info('All notifications marked as read successfully');
      
      // Show success feedback
      setMarkAllSuccess(true);
      setTimeout(() => setMarkAllSuccess(false), 2000); // Hide after 2 seconds
      
    } catch (error) {
      logger.error('Failed to mark all notifications as read', error);
    } finally {
      setMarkingAllAsRead(false);
    }
  };

  // Load notifications on component mount
  useEffect(() => {
    loadNotifications();
    
    // Auto-refresh notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    // Close dropdowns on window resize to prevent layout issues
    const handleResize = () => {
      setShowNotifications(false);
      setShowUserMenu(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', handleResize);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const getNotificationIcon = (type) => {
    const iconClass = "w-3 h-3 rounded-full";
    const style = notificationService.getNotificationStyle(type);
    return <div className={`${iconClass} ${style.iconClass}`}></div>;
  };

  const getUserInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    }
    return user?.email ? user.email.charAt(0).toUpperCase() : 'A';
  };

  // Reusable Avatar (same behavior as AdminProfile)
  const Avatar = ({ name, src, version, size = 40 }) => {
    const getFileUrl = (p) => {
      if (!p) return '';
      if (/^https?:\/\//i.test(p)) return p;
      let base = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/?api\/?$/, '');
      if (!base && window?.location && /localhost|127\.0\.0\.1/.test(window.location.hostname)) {
        base = 'http://localhost:3001';
      }
      let url = `${base}${p}`;
      if (version && !/\?/.test(url)) url += `?v=${encodeURIComponent(version)}`;
      return url;
    };
    const [errored, setErrored] = useState(false);
    useEffect(() => { setErrored(false); }, [src, version]);
    const initials = (name || 'A').split(' ').slice(0,2).map(s=>s.charAt(0)).join('').toUpperCase();
    const url = src ? getFileUrl(src) : '';
    if (url && !errored) {
      return (
        <img
          src={url}
          alt="Avatar"
          className="rounded-full object-cover shadow-sm"
          style={{ width: size, height: size }}
          onError={() => setErrored(true)}
        />
      );
    }
    return (
      <div className="rounded-full bg-gradient-to-br from-emerald-600 to-green-500 text-white flex items-center justify-center font-semibold shadow-sm" style={{ width: size, height: size }}>
        {initials}
      </div>
    );
  };

  const getUserName = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user?.email || 'Staff Member';
  };

  const getUserRole = () => {
    if (user?.userType === 'staff' || user?.role === 'staff') {
      return 'Staff';
    }
    return 'Staff';
  };

  const handleGoProfile = () => {
    navigate('/staff/profile');
    setShowUserMenu(false);
  };

  const handleGoChangePassword = () => {
    navigate('/staff/change-password');
    setShowUserMenu(false);
  };

  return (
    <nav className="bg-white border-b border-gray-200 px-3 md:px-5 py-2 md:py-3 fixed left-0 right-0 top-0 z-50">
      <div className="flex flex-wrap justify-between items-center">
        <div className="flex justify-start items-center">
          {/* Mobile sidebar toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 md:p-2.5 mr-1.5 md:mr-2.5 text-gray-600 rounded-lg cursor-pointer md:hidden hover:text-gray-900 hover:bg-gray-100 focus:bg-gray-100 focus:ring-2 focus:ring-gray-100"
          >
            {sidebarOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
          
          {/* Logo and Brand */}
          <div className="flex items-center space-x-1.5 md:space-x-3.5">
            <img 
              src={sanJoseLogo} 
              alt="San Jose Logo" 
              className="h-8 w-8 md:h-10 md:w-10 object-contain"
            />
            <div className="hidden md:block">
              <h1 className="text-base md:text-lg font-bold text-blue-900">
                Local Youth Development Office
              </h1>
              <p className="text-xs text-gray-700">
                Municipality of San Jose, Batangas
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center lg:order-2">
          {/* Notifications */}
          <div className="relative" ref={notificationRef}>
            <button
              type="button"
              onClick={() => setShowNotifications(!showNotifications)}
              className={`relative w-8 h-8 md:w-10 md:h-10 mr-1.5 md:mr-2 transition-all duration-300 group flex items-center justify-center rounded-full ${
                showNotifications 
                  ? 'text-blue-600 bg-blue-50 ring-2 ring-blue-200' 
                  : 'text-gray-500 bg-gray-100 hover:text-blue-600 hover:bg-blue-50 hover:shadow-md'
              }`}
            >
              <span className="sr-only">View notifications</span>
              <Bell className={`w-4 h-4 md:w-5 md:h-5 transition-all duration-300 ${
                showNotifications 
                  ? '' 
                  : 'group-hover:scale-110 group-hover:rotate-12'
              }`} />
              
              {/* Enhanced notification badge */}
              {unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 w-4 h-4 md:w-5 md:h-5 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg animate-bounce">
                  <span className="text-xs font-bold">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                  {/* Pulse ring */}
                  <div className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-75"></div>
                </div>
              )}
              
              {/* Hover effect */}
              {!showNotifications && (
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              )}
            </button>
            
            {/* Enhanced Notifications Dropdown */}
            {showNotifications && (
              <div className="fixed inset-x-4 mt-2.5 md:absolute md:inset-x-auto md:right-0 md:w-[420px] bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 max-h-[85vh] overflow-hidden backdrop-blur-sm">                {/* Header with Gradient */}
                <div className="relative p-3 md:p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 md:space-x-3">
                      <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg md:rounded-xl flex items-center justify-center shadow-lg">
                        <Bell className="w-4 h-4 md:w-5 md:h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-sm md:text-lg font-bold text-gray-900">Notifications</h3>
                        <p className="text-xs text-gray-600">
                          {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
                        </p>
                      </div>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllAsRead}
                        disabled={markingAllAsRead}
                        className={`flex items-center space-x-1 px-2 md:px-3 py-1 md:py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                          markingAllAsRead
                            ? 'text-gray-500 bg-gray-100 cursor-not-allowed'
                            : markAllSuccess
                            ? 'text-green-600 bg-green-100'
                            : 'text-blue-600 hover:text-blue-700 bg-blue-100 hover:bg-blue-200'
                        }`}
                      >
                        {markingAllAsRead ? (
                          <>
                            <div className="w-3 h-3 border-2 border-gray-300 border-t-transparent rounded-full animate-spin"></div>
                            <span className="hidden sm:inline">Marking...</span>
                          </>
                        ) : markAllSuccess ? (
                          <>
                            <Check className="w-3 h-3 text-green-600" />
                            <span className="hidden sm:inline text-green-600">Done!</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3 h-3" />
                            <span className="hidden sm:inline">Mark all read</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  
                  {/* Quick Stats */}
                  <div className="mt-3 md:mt-4 flex flex-col sm:flex-row sm:space-x-4 space-y-1 sm:space-y-0">
                    <div className="flex items-center space-x-2 text-xs">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <span className="text-gray-600">Updated just now</span>
                    </div>
                  </div>
                </div>

                {/* Notifications List */}
                <div className="max-h-80 overflow-y-auto">
                  {loadingNotifications ? (
                    <div className="p-4 md:p-8 text-center">
                      <div className="relative">
                        <div className="w-8 h-8 md:w-12 md:h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Bell className="w-4 h-4 md:w-5 md:h-5 text-blue-600 animate-pulse" />
                        </div>
                      </div>
                      <p className="text-xs md:text-sm text-gray-600 mt-2 md:mt-3 font-medium">Loading notifications...</p>
                      <p className="text-xs text-gray-500 mt-1">Fetching latest updates</p>
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="p-4 md:p-8 text-center">
                      <div className="w-12 h-12 md:w-16 md:h-16 bg-gray-100 rounded-xl md:rounded-2xl flex items-center justify-center mx-auto mb-3 md:mb-4">
                        <Bell className="w-6 h-6 md:w-8 md:h-8 text-gray-400" />
                      </div>
                      <h4 className="text-sm md:text-base font-semibold text-gray-900 mb-2">No notifications</h4>
                      <p className="text-xs md:text-sm text-gray-600 mb-3 md:mb-4">You're all caught up! Check back later for updates.</p>
                      <button
                        onClick={loadNotifications}
                        className="inline-flex items-center space-x-2 px-3 md:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs md:text-sm font-medium"
                      >
                        <RefreshCw className="w-3 h-3 md:w-4 md:h-4" />
                        <span>Refresh</span>
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {notifications.map((notification, index) => {
                        const style = notificationService.getNotificationStyle(notification.type);
                        const getNotificationIcon = (type) => {
                          const iconProps = "w-5 h-5";
                          switch (type) {
                            case 'success': return <CheckCircle className={`${iconProps} text-green-500`} />;
                            case 'error': return <AlertTriangle className={`${iconProps} text-red-500`} />;
                            case 'warning': return <AlertTriangle className={`${iconProps} text-yellow-500`} />;
                            case 'info': return <Info className={`${iconProps} text-blue-500`} />;
                            default: return <Bell className={`${iconProps} text-gray-500`} />;
                          }
                        };
                        
                        return (
                          <div
                            key={notification.id}
                            className={`group relative p-3 md:p-4 hover:bg-gray-50 transition-all duration-200 cursor-pointer ${
                              !notification.isRead ? 'bg-blue-50/50 border-l-4 border-l-blue-500' : ''
                            }`}
                            onClick={() => !notification.isRead && handleMarkAsRead(notification.id)}
                            style={{ animationDelay: `${index * 50}ms` }}
                          >
                            <div className="flex items-start space-x-2 md:space-x-3">
                              {/* Enhanced Icon */}
                              <div className={`flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center shadow-sm ${
                                !notification.isRead 
                                  ? 'bg-blue-100' 
                                  : 'bg-gray-100'
                              }`}>
                                {getNotificationIcon(notification.type)}
                              </div>
                              
                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between mb-1 md:mb-2">
                                  <div className="flex-1">
                                    <h4 className={`text-xs md:text-sm font-semibold text-gray-900 leading-tight ${
                                      !notification.isRead ? 'font-bold' : ''
                                    }`}>
                                      {notification.title}
                                    </h4>
                                    <p className="text-xs md:text-sm text-gray-600 mt-1 leading-relaxed line-clamp-2">
                                      {notification.message}
                                    </p>
                                  </div>
                                  
                                  {/* Unread indicator */}
                                  {!notification.isRead && (
                                    <div className="flex-shrink-0 ml-2">
                                      <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse"></div>
                                    </div>
                                  )}
                                </div>
                                
                                {/* Footer */}
                                <div className="flex items-center justify-between mt-2 md:mt-3">
                                  <div className="flex items-center space-x-1 md:space-x-2">
                                    <Clock className="w-3 h-3 text-gray-400" />
                                    <span className="text-xs text-gray-500">
                                      {notification.timeAgo || 'Just now'}
                                    </span>
                                  </div>
                                  
                                  {notification.priority !== 'normal' && (
                                    <span className={`inline-flex items-center space-x-1 px-1.5 md:px-2 py-0.5 md:py-1 rounded-full text-xs font-medium ${
                                      notification.priority === 'high' 
                                        ? 'bg-red-100 text-red-700'
                                        : 'bg-yellow-100 text-yellow-700'
                                    }`}>
                                      <Zap className="w-2.5 h-2.5 md:w-3 md:h-3" />
                                      <span className="hidden sm:inline">{notification.priority}</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {/* Hover effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg"></div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Enhanced Footer */}
                <div className="p-3 md:p-4 bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <button 
                      onClick={() => {
                        navigate('/staff/notifications');
                        setShowNotifications(false);
                      }}
                      className="flex items-center space-x-1.5 md:space-x-2 px-3 md:px-4 py-2 md:py-2.5 bg-blue-600 text-white rounded-lg md:rounded-xl hover:bg-blue-700 transition-all duration-200 font-medium text-xs md:text-sm shadow-lg hover:shadow-xl group"
                    >
                      <Eye className="w-3 h-3 md:w-4 md:h-4" />
                      <span>View All</span>
                      <ArrowRight className="w-2.5 h-2.5 md:w-3 md:h-3 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                    
                    <div className="flex items-center space-x-1 md:space-x-2">
                      <button 
                        onClick={loadNotifications}
                        className="p-1.5 md:p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-all duration-200"
                        title="Refresh notifications"
                      >
                        <RefreshCw className="w-3 h-3 md:w-4 md:h-4" />
                      </button>
                      
                      <button 
                        onClick={() => setShowNotifications(false)}
                        className="p-1.5 md:p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-all duration-200"
                        title="Close notifications"
                      >
                        <X className="w-3 h-3 md:w-4 md:h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* User Profile */}
          <div className="relative ml-1 md:ml-2" ref={profileRef}>
            <button
              type="button"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className={`flex items-center space-x-0 md:space-x-3.5 p-2 md:p-2.5 rounded-full transition-all duration-200 ${
                showUserMenu 
                  ? 'text-blue-600' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center space-x-2 md:space-x-3.5">
                {/* Avatar */}
                <div className={`relative rounded-full ${showUserMenu ? 'ring-2 ring-blue-200' : ''}`}>
                  <Avatar name={getUserName()} src={user?.profilePicture} version={user?.updatedAt} size={32} />
                </div>
                
                {/* User Info - Hidden on small screens */}
                <div className="hidden md:block text-left">
                  <div className="text-sm font-semibold text-gray-900 leading-tight">
                    {getUserName()}
                  </div>
                  <div className="text-xs text-gray-500 leading-tight">
                    {getUserRole()}
                  </div>
                </div>
              </div>
              
              <ChevronDown className={`hidden md:block w-4.5 h-4.5 text-gray-400 transition-transform duration-200 ${
                showUserMenu ? 'rotate-180' : ''
              }`} />
            </button>
            
            {/* User Dropdown - Fixed Mobile Responsiveness */}
            {showUserMenu && (
              <div className="fixed inset-x-4 mt-2.5 md:absolute md:inset-x-auto md:right-0 md:w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50">
                <div className="p-4 border-b border-gray-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-11 h-11 rounded-full overflow-hidden">
                      <Avatar name={getUserName()} src={user?.profilePicture} version={user?.updatedAt} size={44} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 text-sm truncate">
                        {getUserName()}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {getUserRole()}
                      </div>
                      {user?.email && (
                        <div className="text-xs text-gray-400 mt-1 truncate">
                          {user.email}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="p-2">
                  <button onClick={handleGoProfile} className="w-full flex items-center space-x-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-150">
                    <User className="w-4.5 h-4.5 flex-shrink-0" />
                    <span className="truncate">Profile</span>
                  </button>
                  <button onClick={handleGoChangePassword} className="w-full flex items-center space-x-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-150">
                    <Settings className="w-4.5 h-4.5 flex-shrink-0" />
                    <span className="truncate">Change Password</span>
                  </button>
                </div>
                
                <div className="p-2 border-t border-gray-100">
                  <button
                    onClick={() => onLogout('header')}
                    className="w-full flex items-center space-x-3 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-150"
                  >
                    <LogOut className="w-4.5 h-4.5 flex-shrink-0" />
                    <span className="truncate">Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default StaffHeader;