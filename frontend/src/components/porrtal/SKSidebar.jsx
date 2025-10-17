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

  const SKSidebar = ({ sidebarOpen, setSidebarOpen, onLogout }) => {
  const location = useLocation();
  const [expandedCategories, setExpandedCategories] = useState(['main']);
  const [searchQuery, setSearchQuery] = useState('');

  const navigation = [
    // 📊 Dashboard
    { 
      name: 'Dashboard', 
      href: '/sk/dashboard', 
      icon: Home,
      description: 'Overview of SK stats and recent activity',
      category: 'main'
    },
    
    // 🏛️ SK Governance (view-only for SK)
    { 
      name: 'My Term', 
      href: '/sk/term', 
      icon: Calendar,
      description: 'View current SK term details',
      category: 'governance'
    },
    { 
      name: 'Officials', 
      href: '/sk/officials', 
      icon: Shield,
      description: 'View SK officials for your barangay',
      category: 'governance'
    },
    
    // 🗳️ KK Survey Management (actions limited for SK)
    { 
      name: 'Active Batches', 
      href: '/sk/survey/batches', 
      icon: Calendar,
      description: 'See active survey batches',
      category: 'survey'
    },
    
    // ✅ Validation
    { 
      name: 'Validation Queue', 
      href: '/sk/survey/validation', 
      icon: Filter,
      description: 'Validate submissions for the active batch',
      category: 'validation'
    },
    
    // 📈 Reports
    { 
      name: 'Reports', 
      href: '/sk/reports', 
      icon: BarChart3,
      description: 'Participation and needs reports',
      category: 'reports'
    },
    
    // 📢 Announcements
    { 
      name: 'Announcements', 
      href: '/sk/announcements', 
      icon: Megaphone,
      description: 'View LYDO announcements',
      category: 'communication'
    }
  ];

  const isActive = (href) => {
    if (href === '/sk/dashboard') {
      return location.pathname === '/sk' || location.pathname === '/sk/' || location.pathname === '/sk/dashboard';
    }
    return location.pathname === href;
  };

  const getCategoryLabel = (category) => {
    switch (category) {
      case 'main': return 'Overview';
      case 'validation': return 'Validation';
      case 'survey': return 'Survey';
      case 'communication': return 'Communication';
      case 'governance': return 'SK Governance';
      case 'reports': return 'Reports';
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

  // Category display order
  const categoryOrder = ['main', 'validation', 'survey', 'communication', 'governance', 'reports'];
  const orderedCategories = Object.entries(groupedNavigation).sort(([a], [b]) => {
    const ai = categoryOrder.indexOf(a);
    const bi = categoryOrder.indexOf(b);
    return (ai === -1 ? Number.MAX_SAFE_INTEGER : ai) - (bi === -1 ? Number.MAX_SAFE_INTEGER : bi);
  });

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
        } bg-white/95 backdrop-blur-sm border-r border-gray-200/60 shadow-xl md:translate-x-0`}
        aria-label="Sidenav"
      >
        <div className="overflow-y-auto py-4 px-3 h-full bg-gradient-to-b from-white to-gray-50/30 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          
          {/* Search Functionality */}
          <div className="px-0 mb-4 mt-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search menu items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 backdrop-blur-sm transition-all duration-200"
              />
            </div>
          </div>
          
          {/* Navigation */}
          <ul className="space-y-2">
            {orderedCategories.map(([category, items]) => {
              const CategoryIcon = getCategoryIcon(category);
              const isExpanded = expandedCategories.includes(category);
              const hasActiveItem = items.some(item => isActive(item.href));
              
              return (
                <li key={category} className="space-y-1">
                  {/* Enhanced Category Header with Folder Icon */}
                  <button
                    type="button"
                    onClick={() => toggleCategory(category)}
                    className={`flex items-center p-2.5 w-full text-sm font-semibold text-gray-700 rounded-lg transition-all duration-200 group hover:bg-gray-50 ${
                      hasActiveItem ? 'bg-blue-50 text-blue-700' : ''
                    }`}
                  >
                    <div className={`p-2 rounded-lg transition-all duration-200 ${
                      hasActiveItem 
                        ? 'bg-blue-100' 
                        : 'bg-gray-100 group-hover:bg-gray-200'
                    }`}>
                      <CategoryIcon className={`w-5 h-5 transition-all duration-200 ${
                        hasActiveItem 
                          ? 'text-blue-600' 
                          : 'text-gray-600 group-hover:text-gray-800'
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
                                ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-500' 
                                : 'text-gray-700 hover:bg-gray-50 hover:text-blue-600'
                            }`}
                            title={item.description}
                          >
                            <Icon className={`w-4 h-4 transition-all duration-200 ${
                              active 
                                ? 'text-blue-600' 
                                : 'text-gray-500 group-hover:text-blue-600'
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

export default SKSidebar;