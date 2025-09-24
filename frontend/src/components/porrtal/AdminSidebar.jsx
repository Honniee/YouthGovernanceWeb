import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Users, 
  Shield, 
  Settings, 
  FileText, 
  BarChart3, 
  Database,
  X,
  LogOut,
  Home,
  UserCheck,
  Building2,
  Vote,
  TrendingUp,
  Megaphone,
  ClipboardList,
  Calendar,
  Upload,
  History,
  Filter,
  Download,
  Activity,
  Eye,
  ChevronDown,
  ChevronRight,
  Search,
  FolderOpen,
  Folder,
  User,
  FileText as FileTextIcon,
  BarChart,
  Database as DatabaseIcon,
  Calendar as CalendarIcon,
  Upload as UploadIcon,
  History as HistoryIcon,
  Filter as FilterIcon,
  Download as DownloadIcon,
  Activity as ActivityIcon,
  Eye as EyeIcon,
  Megaphone as MegaphoneIcon,
  TrendingUp as TrendingUpIcon
} from 'lucide-react';

const AdminSidebar = ({ sidebarOpen, setSidebarOpen, onLogout }) => {
  const location = useLocation();
  const [expandedCategories, setExpandedCategories] = useState(['main']);
  const [searchQuery, setSearchQuery] = useState('');

  const navigation = [
    // 📊 Dashboard
    { 
      name: 'Dashboard', 
      href: '/admin/dashboard', 
      icon: Home,
      description: 'Overview of system stats and recent activity',
      category: 'main'
    },
    
    // 👥 User Management
    { 
      name: 'LYDO Staff', 
      href: '/admin/users/lydo-staff', 
      icon: UserCheck,
      description: 'Manage LYDO Staff accounts',
      category: 'users'
    },
    { 
      name: 'SK Officials', 
      href: '/admin/users/sk-officials', 
      icon: Shield,
      description: 'Manage SK Officials by term and barangay',
      category: 'users'
    },
    { 
      name: 'Youth', 
      href: '/admin/users/youth', 
      icon: Users,
      description: 'Manage registered youth',
      category: 'users'
    },
    
    // 🏛️ SK Governance
    { 
      name: 'SK Terms', 
      href: '/admin/sk-governance/terms', 
      icon: Calendar,
      description: 'Create, activate, and archive SK terms',
      category: 'governance'
    },

    { 
      name: 'Term History', 
      href: '/admin/sk-governance/term-history', 
      icon: History,
      description: 'View past terms and associated officials',
      category: 'governance'
    },
    
    // 🗳️ KK Survey Management
    { 
      name: 'Voter List Upload', 
      href: '/admin/survey/voter-lists', 
      icon: Upload,
      description: 'Upload and manage barangay voter lists',
      category: 'survey'
    },
    { 
      name: 'Survey Batches', 
      href: '/admin/survey/batches', 
      icon: Calendar,
      description: 'Open/close batches, set deadlines',
      category: 'survey'
    },
    { 
      name: 'Survey Responses', 
      href: '/admin/survey/responses', 
      icon: FileText,
      description: 'View validated responses, filter by barangay/batch',
      category: 'survey'
    },
    { 
      name: 'Validation Queue', 
      href: '/admin/survey/validation', 
      icon: Filter,
      description: 'Monitor pending manual validations',
      category: 'survey'
    },
    
    // 📈 Recommendations
    { 
      name: 'Batch Reports', 
      href: '/admin/recommendations/batch-reports', 
      icon: BarChart3,
      description: 'View generated recommendations per barangay',
      category: 'reports'
    },
    { 
      name: 'Trend Analysis', 
      href: '/admin/recommendations/trends', 
      icon: TrendingUp,
      description: 'Compare participation and needs across batches',
      category: 'reports'
    },
    { 
      name: 'Export Reports', 
      href: '/admin/recommendations/export', 
      icon: Download,
      description: 'Download data for planning or documentation',
      category: 'reports'
    },
    
    // 📢 Announcements
    { 
      name: 'Announcements', 
      href: '/admin/announcements', 
      icon: Megaphone,
      description: 'Post and manage youth program announcements',
      category: 'communication'
    },
    
    // 🧾 Audit & Logs
    { 
      name: 'Activity Logs', 
      href: '/admin/system/audit-logs', 
      icon: Activity,
      description: 'Track admin and user actions',
      category: 'audit'
    },
    { 
      name: 'Validation Logs', 
      href: '/admin/audit/validation', 
      icon: Eye,
      description: 'Record of manual approvals/rejections',
      category: 'audit'
    },
    { 
      name: 'System Health', 
      href: '/admin/system/health', 
      icon: Database,
      description: 'Monitor uptime and system errors',
      category: 'audit'
    }
  ];

  const isActive = (href) => {
    // Special case for dashboard - check if we're on admin root or dashboard
    if (href === '/admin/dashboard') {
      return location.pathname === '/admin' || location.pathname === '/admin/' || location.pathname === '/admin/dashboard';
    }
    return location.pathname === href;
  };

  const getCategoryLabel = (category) => {
    switch (category) {
      case 'main': return 'Overview';
      case 'users': return 'User Management';
      case 'governance': return 'SK Governance';
      case 'survey': return 'Survey Management';
      case 'reports': return 'Reports & Analytics';
      case 'communication': return 'Communication';
      case 'audit': return 'Audit & Monitoring';
      default: return category;
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'main': return Folder;
      case 'users': return Folder;
      case 'governance': return Folder;
      case 'survey': return Folder;
      case 'reports': return Folder;
      case 'communication': return Folder;
      case 'audit': return Folder;
      default: return Folder;
    }
  };

  const toggleCategory = (category) => {
    setExpandedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  // Filter navigation based on search query
  const filteredNavigation = navigation.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    getCategoryLabel(item.category).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedNavigation = filteredNavigation.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <>
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="fixed inset-0 bg-gray-600/75 backdrop-blur-sm"></div>
        </div>
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 w-80 h-screen pt-20 transition-all duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } bg-white/95 backdrop-blur-sm border-r border-gray-200/60 shadow-xl md:translate-x-0 dark:bg-gray-800/95 dark:border-gray-700/60`}
        aria-label="Sidenav"
      >
        <div className="overflow-y-auto py-4 px-3 h-full bg-gradient-to-b from-white to-gray-50/30 dark:from-gray-800 dark:to-gray-900/30 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800">
          
          {/* Search Functionality */}
          <div className="px-0 mb-4 mt-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search menu items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 backdrop-blur-sm dark:bg-gray-700/50 dark:border-gray-600 dark:text-white transition-all duration-200"
              />
            </div>
          </div>
          
          {/* Navigation */}
          <ul className="space-y-2">
            {Object.entries(groupedNavigation).map(([category, items]) => {
              const CategoryIcon = getCategoryIcon(category);
              const isExpanded = expandedCategories.includes(category);
              const hasActiveItem = items.some(item => isActive(item.href));
              
              return (
                <li key={category} className="space-y-1">
                  {/* Enhanced Category Header with Folder Icon */}
                  <button
                    type="button"
                    onClick={() => toggleCategory(category)}
                    className={`flex items-center p-2.5 w-full text-sm font-semibold text-gray-700 rounded-lg transition-all duration-200 group hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700/50 ${
                      hasActiveItem ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300' : ''
                    }`}
                  >
                    <div className={`p-2 rounded-lg transition-all duration-200 ${
                      hasActiveItem 
                        ? 'bg-blue-100 dark:bg-blue-800' 
                        : 'bg-gray-100 dark:bg-gray-700 group-hover:bg-gray-200 dark:group-hover:bg-gray-600'
                    }`}>
                      <CategoryIcon className={`w-5 h-5 transition-all duration-200 ${
                        hasActiveItem 
                          ? 'text-blue-600 dark:text-blue-300' 
                          : 'text-gray-600 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-200'
                      }`} />
                    </div>
                    <span className="flex-1 ml-3 text-left whitespace-nowrap">
                      {getCategoryLabel(category)}
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${
                      isExpanded ? 'rotate-180' : ''
                    }`} />
                  </button>
                  
                  {/* Enhanced Category Items with Action Icons */}
                  <ul className={`py-1 space-y-1 overflow-hidden transition-all duration-300 ease-in-out ${
                    isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  }`}>
                    {items.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.href);
                      
                      return (
                        <li key={item.name} className="transform transition-all duration-200">
                          <Link
                            to={item.href}
                            className={`flex items-center p-2.5 pl-10 w-full text-sm font-medium rounded-lg transition-all duration-200 group relative ${
                              active 
                                ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-500 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-400' 
                                : 'text-gray-700 hover:bg-gray-50 hover:text-blue-600 dark:text-gray-300 dark:hover:bg-gray-700/50'
                            }`}
                            title={item.description}
                          >
                            <Icon className={`w-4 h-4 transition-all duration-200 ${
                              active 
                                ? 'text-blue-600 dark:text-blue-400' 
                                : 'text-gray-500 group-hover:text-blue-600 dark:text-gray-400'
                            }`} />
                            
                            <span className="ml-3">{item.name}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            })}
          </ul>

          
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;