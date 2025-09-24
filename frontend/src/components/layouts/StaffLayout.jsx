import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  UserPlus, 
  Users, 
  ClipboardList, 
  MessageSquare, 
  Calendar,
  Megaphone,
  Briefcase,
  Vote,
  FileCheck,
  Menu,
  X,
  LogOut,
  Home
} from 'lucide-react';

const StaffLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const navigation = [
    { name: 'Dashboard', href: '/staff/dashboard', icon: Home },
    // Other navigation items will be added when components are created
    // { name: 'Youth Profiling', href: '/staff/youth-profiling', icon: UserPlus },
    // { name: 'Youth Registry', href: '/staff/youth-registry', icon: Users },
    // { name: 'Survey Management', href: '/staff/surveys', icon: ClipboardList },
    // { name: 'Survey Responses', href: '/staff/survey-responses', icon: MessageSquare },
    // { name: 'Event Management', href: '/staff/events', icon: Calendar },
    // { name: 'Announcements', href: '/staff/announcements', icon: Megaphone },
    // { name: 'Program Management', href: '/staff/programs', icon: Briefcase },
    // { name: 'Voters Management', href: '/staff/voters', icon: Vote },
    // { name: 'Validation Logs', href: '/staff/validation-logs', icon: FileCheck },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      // Still navigate to home even if logout fails
      navigate('/');
    }
  };

  const isActive = (href) => location.pathname === href;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="fixed inset-0 bg-gray-600 opacity-75"></div>
        </div>
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <span className="font-semibold text-gray-900">Staff Panel</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`
                    flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                    ${isActive(item.href)
                      ? 'bg-green-100 text-green-700'
                      : 'text-gray-700 hover:bg-gray-100'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="flex items-center space-x-3 w-full px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 lg:ml-0">
        {/* Top bar */}
        <div className="bg-white shadow-sm border-b border-gray-200 px-4 py-4 flex items-center justify-between lg:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 text-gray-400 hover:text-gray-600"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">
              {user?.firstName && user?.lastName 
                ? `${user.firstName} ${user.lastName}` 
                : user?.email || 'LYDO Staff'
              }
            </span>
            <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
              <span className="text-white font-medium text-sm">
                {user?.firstName ? user.firstName.charAt(0).toUpperCase() : 'S'}
              </span>
            </div>
          </div>
        </div>

        {/* Page content */}
        <div className="p-4 lg:p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default StaffLayout; 