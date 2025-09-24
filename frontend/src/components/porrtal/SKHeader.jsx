import React, { useState, useRef, useEffect } from 'react';
import { Menu, Bell, Grid3X3, User, Settings, LogOut, ChevronDown, X } from 'lucide-react';
import sanJoseLogo from '../../assets/logos/san_jose_logo.webp';
import notificationService from '../../services/notificationService';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const SKHeader = ({ sidebarOpen, setSidebarOpen, user, onLogout }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showApps, setShowApps] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const notificationRef = useRef(null);
  const profileRef = useRef(null);
  const { logout } = useAuth();
  const navigate = useNavigate();

  // Load notifications data
  const loadNotifications = async () => {
    try {
      console.log('🔔 Loading notifications...');
      setLoadingNotifications(true);
      
      const [notificationsResponse, unreadCountResponse] = await Promise.all([
        notificationService.getNotifications({ limit: 5, page: 1 }),
        notificationService.getUnreadCount()
      ]);
      
      console.log('📊 Notifications response:', notificationsResponse);
      console.log('🔢 Unread count response:', unreadCountResponse);
      
      setNotifications(notificationsResponse.data.notifications);
      setUnreadCount(unreadCountResponse);
      
      console.log('✅ Notifications loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load notifications:', error);
      console.error('📝 Error details:', error.message);
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
      console.error('Failed to mark notification as read:', error);
    }
  };

  // Mark all notifications as read
  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, isRead: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
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

  const getUserName = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user?.email || 'SK Official';
  };

  const getUserRole = () => {
    if (user?.userType === 'sk_official' || user?.role === 'sk_official' || user?.role === 'SK') {
      return 'SK Official';
    }
    return user?.role || 'SK Official';
  };

  const handleGoProfile = () => {
    navigate('/sk/profile');
    setShowUserMenu(false);
  };

  const handleGoChangePassword = () => {
    navigate('/sk/change-password');
    setShowUserMenu(false);
  };

  const handleSignOut = async () => {
    try {
      if (onLogout) {
        await onLogout('header');
      } else {
        await logout('header');
      }
    } finally {
      navigate('/');
    }
  };

  return (
    <nav className="bg-white border-b border-gray-200 px-3 md:px-5 py-3 dark:bg-gray-800 dark:border-gray-700 fixed left-0 right-0 top-0 z-50">
      <div className="flex flex-wrap justify-between items-center">
        <div className="flex justify-start items-center">
          {/* Mobile sidebar toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 md:p-2.5 mr-2 md:mr-2.5 text-gray-600 rounded-lg cursor-pointer md:hidden hover:text-gray-900 hover:bg-gray-100 focus:bg-gray-100 dark:focus:bg-gray-700 focus:ring-2 focus:ring-gray-100 dark:focus:ring-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
          >
            {sidebarOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
          
          {/* Logo and Brand */}
          <div className="flex items-center space-x-2 md:space-x-3.5">
            <img 
              src={sanJoseLogo} 
              alt="San Jose Logo" 
              className="h-10 w-10 md:h-11 md:w-11 object-contain"
            />
            <div className="hidden md:block">
              <h1 className="text-base md:text-lg font-bold text-blue-900 dark:text-white">
                Local Youth Development Office
              </h1>
              <p className="text-xs text-gray-600 dark:text-gray-300">
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
              className={`relative p-2 md:p-2.5 mr-2 md:mr-3.5 rounded-lg transition-all duration-200 ${
                showNotifications 
                  ? 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20 ring-2 ring-blue-200 dark:ring-blue-700' 
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700'
              }`}
            >
              <span className="sr-only">View notifications</span>
              <Bell className="w-5 h-5 md:w-5.5 md:h-5.5" />
              {unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 w-4 h-4 md:w-5.5 md:h-5.5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                  {unreadCount}
                </div>
              )}
            </button>
            
            {/* Notifications Dropdown - Fixed Mobile Responsiveness */}
            {showNotifications && (
              <div className="fixed inset-x-4 mt-2.5 md:absolute md:inset-x-auto md:right-0 md:w-96 bg-white rounded-xl shadow-lg border border-gray-200 dark:bg-gray-700 dark:border-gray-600 z-50 max-h-[80vh] overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-gray-600">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">Notifications</h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllAsRead}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {loadingNotifications ? (
                    <div className="p-4 text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Loading notifications...</p>
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="p-4 text-center">
                      <p className="text-sm text-gray-500 dark:text-gray-400">No notifications yet</p>
                    </div>
                  ) : (
                    notifications.map((notification) => {
                      const style = notificationService.getNotificationStyle(notification.type);
                      return (
                        <div
                          key={notification.id}
                          className={`p-4 border-b border-gray-50 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors duration-150 cursor-pointer ${
                            !notification.isRead ? style.bgClass : ''
                          }`}
                          onClick={() => !notification.isRead && handleMarkAsRead(notification.id)}
                        >
                          <div className="flex items-start space-x-3">
                            {getNotificationIcon(notification.type)}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <p className={`text-sm font-medium text-gray-900 dark:text-white truncate ${
                                  !notification.isRead ? 'font-semibold' : ''
                                }`}>
                                  {notification.title}
                                </p>
                                {!notification.isRead && (
                                  <div className="w-2.5 h-2.5 bg-blue-500 rounded-full flex-shrink-0 ml-2"></div>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2 leading-relaxed">
                                {notification.message}
                              </p>
                              <div className="flex items-center justify-between">
                                <p className="text-xs text-gray-400 dark:text-gray-400">
                                  {notification.timeAgo}
                                </p>
                                {notification.priority !== 'normal' && (
                                  <span className={`text-xs px-2 py-1 rounded-full ${notificationService.getPriorityStyle(notification.priority).badgeClass}`}>
                                    {notificationService.getPriorityStyle(notification.priority).label}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-600 text-center">
                  <button 
                    onClick={loadNotifications}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                  >
                    Refresh notifications
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* User Profile */}
          <div className="relative ml-2 md:ml-5" ref={profileRef}>
            <button
              type="button"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className={`flex items-center space-x-0 md:space-x-3.5 p-2.5 rounded-lg transition-all duration-200 ${
                showUserMenu 
                  ? 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20 ring-2 ring-blue-200 dark:ring-blue-700' 
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center space-x-2 md:space-x-3.5">
                {/* Avatar */}
                <div className="relative">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm transition-all duration-200 ${
                    showUserMenu 
                      ? 'bg-gradient-to-br from-blue-600 to-indigo-700 ring-2 ring-blue-200 dark:ring-blue-700' 
                      : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                  }`}>
                    <span className="text-white font-semibold text-sm">
                      {getUserInitials()}
                    </span>
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-white"></div>
                </div>
                
                {/* User Info - Hidden on small screens */}
                <div className="hidden md:block text-left">
                  <div className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
                    {getUserName()}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 leading-tight">
                    {getUserRole()}
                  </div>
                </div>
              </div>
              
              <ChevronDown className="hidden md:block w-4.5 h-4.5 text-gray-400" />
            </button>
            
            {/* User Dropdown - Fixed Mobile Responsiveness */}
            {showUserMenu && (
              <div className="fixed inset-x-4 mt-2.5 md:absolute md:inset-x-auto md:right-0 md:w-80 bg-white rounded-xl shadow-lg border border-gray-200 dark:bg-gray-700 dark:border-gray-600 z-50">
                <div className="p-4 border-b border-gray-100 dark:border-gray-600">
                  <div className="flex items-center space-x-3">
                    <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">
                        {getUserInitials()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                        {getUserName()}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {getUserRole()}
                      </div>
                      {user?.email && (
                        <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate">
                          {user.email}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="p-2">
                  <button onClick={handleGoProfile} className="w-full flex items-center space-x-3 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors duration-150">
                    <User className="w-4.5 h-4.5 flex-shrink-0" />
                    <span className="truncate">Profile</span>
                  </button>
                  <button onClick={handleGoChangePassword} className="w-full flex items-center space-x-3 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors duration-150">
                    <Settings className="w-4.5 h-4.5 flex-shrink-0" />
                    <span className="truncate">Change Password</span>
                  </button>
                </div>
                
                <div className="p-2 border-t border-gray-100 dark:border-gray-600">
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center space-x-3 px-3 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors duration-150"
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

export default SKHeader;