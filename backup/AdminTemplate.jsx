import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight,
  Grid,
  List,
  MoreHorizontal,
  Download,
  Trash2,
  Archive,
  Eye,
  X,
  Plus,
  User,
  Mail,
  Briefcase,
  Building,
  Phone,
  MapPin,
  Calendar,
  Save,
  UserPlus,
  ChevronDown,
  Upload,
  ChevronUp,
  ArrowUpDown
} from 'lucide-react';
import HeaderMainContent from '../frontend/src/components/portal_main_content/HeaderMainContent';

const StaffManagement = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [selectedItems, setSelectedItems] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('name');
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const filterRef = useRef(null);
  const sortRef = useRef(null);
  
  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: '',
    department: '',
    address: '',
    startDate: '',
    employeeId: '',
    status: 'Active'
  });
  
  // Collapse state for Add Staff form
  const [formCollapsed, setFormCollapsed] = useState(false);
  
  // Bulk upload state
  const [uploadFile, setUploadFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const handleUploadFileChange = (e) => {
    const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
    setUploadFile(file);
  };
  const handleUpload = (e) => {
    e.preventDefault();
    if (!uploadFile) return;
    setIsUploading(true);
    // TODO: integrate API upload here
    setTimeout(() => {
      setIsUploading(false);
      alert('File uploaded successfully!');
      setUploadFile(null);
    }, 800);
  };
  // Collapse state for Bulk Import
  const [uploadCollapsed, setUploadCollapsed] = useState(false);

  // Close filter modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setShowFilters(false);
      }
      if (sortRef.current && !sortRef.current.contains(event.target)) {
        setShowSort(false);
      }
    };

    const handleResize = () => {
      setShowFilters(false);
      setShowSort(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', handleResize);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const tabs = [
    { id: 'all', label: 'All Staff', count: 156, color: 'blue' },
    { id: 'active', label: 'Active', count: 89, color: 'green' },
    { id: 'pending', label: 'Pending', count: 23, color: 'yellow' },
    { id: 'archived', label: 'Archived', count: 44, color: 'gray' }
  ];

  const mockData = Array.from({ length: 12 }, (_, i) => ({
    id: i + 1,
    name: `Staff Member ${i + 1}`,
    email: `staff${i + 1}@lydo.gov.ph`,
    status: ['Active', 'Pending', 'Archived'][Math.floor(Math.random() * 3)],
    date: `2024-0${Math.floor(Math.random() * 9) + 1}-${Math.floor(Math.random() * 28) + 1}`,
    role: ['LYDO Staff', 'Coordinator', 'Assistant', 'Manager'][Math.floor(Math.random() * 4)],
    department: ['Youth Development', 'Programs', 'Administration', 'Outreach'][Math.floor(Math.random() * 4)]
  }));

  const handleSelectItem = (id) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedItems(selectedItems.length === mockData.length ? [] : mockData.map(item => item.id));
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    // Here you would typically send the data to your API
    alert('New staff member added successfully!');
    // Reset form
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      role: '',
      department: '',
      address: '',
      startDate: '',
      employeeId: '',
      status: 'Active'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Pending': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Archived': return 'bg-slate-50 text-slate-700 border-slate-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getTabColor = (color) => {
    switch (color) {
      case 'blue': return 'border-blue-500 text-blue-600 bg-blue-50';
      case 'green': return 'border-emerald-500 text-emerald-600 bg-emerald-50';
      case 'yellow': return 'border-amber-500 text-amber-600 bg-amber-50';
      case 'gray': return 'border-slate-500 text-slate-600 bg-slate-50';
      default: return 'border-blue-500 text-blue-600 bg-blue-50';
    }
  };

  const [showSort, setShowSort] = useState(false);

  // Reusable Sort Modal Content Component
  const SortModalContent = ({ sortBy, setSortBy, onClose, onReset, isMobile = false }) => (
    <>
      <div className="p-4 border-b border-gray-100 dark:border-gray-600">
        <div className="flex items-center justify-between">
          <h3 className={`font-semibold text-gray-900 dark:text-white ${isMobile ? 'text-lg' : 'text-base'}`}>
            Sort Options
          </h3>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2"
          >
            <X className={isMobile ? "w-5 h-5" : "w-4 h-4"} />
          </button>
        </div>
      </div>

      <div className={`p-4 space-y-4 ${isMobile ? 'max-h-[calc(100vh-200px)] overflow-y-auto' : ''}`}>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sort By</label>
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
          >
            <option value="name">Name</option>
            <option value="date">Date</option>
            <option value="role">Role</option>
            <option value="department">Department</option>
            <option value="status">Status</option>
            <option value="email">Email</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sort Order</label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input 
                type="radio" 
                name="sortOrder" 
                value="asc" 
                defaultChecked
                className="mr-2 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Ascending (A-Z, 1-9)</span>
            </label>
            <label className="flex items-center">
              <input 
                type="radio" 
                name="sortOrder" 
                value="desc" 
                className="mr-2 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Descending (Z-A, 9-1)</span>
            </label>
          </div>
        </div>
      </div>
      
      <div className="p-4 bg-gray-50 dark:bg-gray-600 border-t border-gray-100 dark:border-gray-500 flex items-center justify-between">
        <button 
          onClick={onReset}
          className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 font-medium"
        >
          Reset to Default
        </button>
        <button 
          onClick={onClose}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
        >
          Apply Sort
            </button>
              </div>
    </>
  );

  return (
    <div className="space-y-5">
      {/* Header Section */}
      <HeaderMainContent
        title="Staff Management"
        description="Manage LYDO Staff"
      />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column - Staff List */}
        <div className="xl:col-span-2">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Tabs */}
            <div className="px-5 py-3 bg-gray-50/50">
              <nav className="flex space-x-1 overflow-x-auto">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`rounded-lg font-medium text-sm transition-all duration-200 border-2 flex-shrink-0 ${
                      activeTab === tab.id
                        ? getTabColor(tab.color)
                        : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-white hover:border-gray-200'
                    } ${
                      // Smaller on mobile/tablet, normal on desktop
                      'px-2 py-1.5 sm:px-3 sm:py-2'
                    }`}
                  >
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                    <span className={`ml-1.5 sm:ml-2 px-1.5 py-0.5 sm:px-2 rounded-full text-xs font-semibold ${
                      activeTab === tab.id
                        ? 'bg-white/80 text-gray-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Controls */}
            <div className="px-5 py-4 border-t border-gray-100">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-3 lg:space-y-0">
                <div className="flex flex-row items-center space-x-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <input 
                    type="text" 
                      placeholder="Search staff members..." 
                      className="pl-10 pr-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 w-48 sm:w-60 py-1.5 sm:py-2"
                  />
                </div>

                  <div className="relative" ref={filterRef}>
                <button 
                  onClick={() => setShowFilters(!showFilters)}
                      className={`inline-flex items-center border rounded-lg font-medium transition-all duration-200 ${
                        showFilters 
                          ? 'border-blue-500 text-blue-600 bg-blue-50' 
                          : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                      } ${
                        // Smaller on mobile/tablet, normal on desktop
                        'px-2 py-1.5 sm:px-3 sm:py-2'
                      }`}
                    >
                      <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Filters</span>
                      {showFilters && (
                        <span className="ml-2 w-2 h-2 bg-blue-500 rounded-full"></span>
                      )}
                </button>

                    {/* Filter Modal */}
                    {showFilters && (
                      <div className="fixed inset-0 z-[9999] lg:hidden">
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowFilters(false)}></div>
                        <div className="fixed inset-4 bg-white dark:bg-gray-700 rounded-xl shadow-2xl overflow-hidden">
                          <div className="p-4 border-b border-gray-100 dark:border-gray-600">
                            <div className="flex items-center justify-between">
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Advanced Filters</h3>
                              <button
                                onClick={() => setShowFilters(false)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                          
                          <div className="p-4 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Department</label>
                              <select className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white">
                                <option>All Departments</option>
                                <option>Youth Development</option>
                                <option>Programs</option>
                                <option>Administration</option>
                                <option>Outreach</option>
                              </select>
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Role</label>
                              <select className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white">
                                <option>All Roles</option>
                                <option>LYDO Staff</option>
                                <option>Coordinator</option>
                                <option>Assistant</option>
                                <option>Manager</option>
                </select>
              </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
                              <select className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white">
                                <option>All Status</option>
                                <option>Active</option>
                                <option>Pending</option>
                                <option>Archived</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date Range</label>
                              <input type="date" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white" />
                            </div>
                          </div>
                          
                          <div className="p-4 bg-gray-50 dark:bg-gray-600 border-t border-gray-100 dark:border-gray-500 flex items-center justify-between">
                            <button className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 font-medium">
                              Clear All Filters
                  </button>
                  <button
                              onClick={() => setShowFilters(false)}
                              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                  >
                              Apply Filters
                  </button>
                </div>
              </div>
            </div>
                    )}

                    {/* Desktop Filter Modal - Positioned at document level */}
            {showFilters && (
                      <div className="hidden lg:block fixed z-[9999]" style={{
                        top: filterRef.current ? filterRef.current.getBoundingClientRect().bottom + 8 : 0,
                        left: filterRef.current ? filterRef.current.getBoundingClientRect().left : 0,
                        width: '384px'
                      }}>
                        <div className="bg-white dark:bg-gray-700 rounded-xl shadow-lg border border-gray-200 dark:border-gray-600 max-h-[80vh] overflow-hidden">
                          <div className="p-4 border-b border-gray-100 dark:border-gray-600">
                            <div className="flex items-center justify-between">
                              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Advanced Filters</h3>
                              <button
                                onClick={() => setShowFilters(false)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          
                          <div className="p-4 space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Department</label>
                              <select className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white">
                                <option>All Departments</option>
                                <option>Youth Development</option>
                                <option>Programs</option>
                                <option>Administration</option>
                                <option>Outreach</option>
                              </select>
                            </div>
                            
                            <div>
                              <label className="block text-gray-700 dark:text-gray-300 mb-2">Role</label>
                              <select className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white">
                                <option>All Roles</option>
                                <option>LYDO Staff</option>
                                <option>Coordinator</option>
                                <option>Assistant</option>
                                <option>Manager</option>
                  </select>
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
                              <select className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white">
                    <option>All Status</option>
                    <option>Active</option>
                    <option>Pending</option>
                    <option>Archived</option>
                  </select>
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date Range</label>
                              <input type="date" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white" />
                            </div>
                          </div>
                          
                          <div className="p-4 bg-gray-50 dark:bg-gray-600 border-t border-gray-100 dark:border-gray-500 flex items-center justify-between">
                            <button className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 font-medium">
                              Clear All Filters
                            </button>
                            <button 
                              onClick={() => setShowFilters(false)}
                              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                            >
                              Apply Filters
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Sort Button */}
                  <div className="relative" ref={sortRef}>
                    <button 
                      onClick={() => setShowSort(!showSort)}
                      className={`inline-flex items-center border rounded-lg font-medium transition-all duration-200 ${
                        showSort 
                          ? 'border-blue-500 text-blue-600 bg-blue-50' 
                          : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                      } ${
                        // Smaller on mobile/tablet, normal on desktop
                        'px-2 py-1.5 sm:px-3 sm:py-2'
                      }`}
                    >
                      <ArrowUpDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />
                      <span className="hidden sm:inline sm:ml-2">Sort</span>
                      {showSort && (
                        <span className="ml-2 w-2 h-2 bg-blue-500 rounded-full"></span>
                      )}
                    </button>
                    
                    {/* Sort Modal */}
                    {showSort && (
                      <div className="fixed inset-0 z-[9999] lg:hidden">
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowSort(false)}></div>
                        <div className="fixed inset-4 bg-white dark:bg-gray-700 rounded-xl shadow-2xl overflow-hidden">
                          <SortModalContent 
                            sortBy={sortBy} 
                            setSortBy={setSortBy} 
                            onClose={() => setShowSort(false)} 
                            onReset={() => {
                              setSortBy('name');
                              setShowSort(false);
                            }} 
                            isMobile={true}
                          />
                        </div>
                      </div>
                    )}

                    {/* Desktop Sort Modal - Positioned at document level */}
                    {showSort && (
                      <div className="hidden lg:block fixed z-[9999]" style={{
                        top: sortRef.current ? sortRef.current.getBoundingClientRect().bottom + 8 : 0,
                        left: sortRef.current ? sortRef.current.getBoundingClientRect().left : 0,
                        width: '320px'
                      }}>
                        <div className="bg-white dark:bg-gray-700 rounded-xl shadow-lg border border-gray-200 dark:border-gray-600 max-h-[80vh] overflow-hidden">
                          <SortModalContent 
                            sortBy={sortBy} 
                            setSortBy={setSortBy} 
                            onClose={() => setShowSort(false)} 
                            onReset={() => {
                              setSortBy('name');
                              setShowSort(false);
                            }} 
                            isMobile={false}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                </div>

                <div className="flex items-center space-x-2">
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-1.5 rounded-md transition-all duration-200 ${
                        viewMode === 'grid' 
                          ? 'bg-white text-blue-600 shadow-sm' 
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      <Grid className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-1.5 rounded-md transition-all duration-200 ${
                        viewMode === 'list' 
                          ? 'bg-white text-blue-600 shadow-sm' 
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
          </div>

          {/* Bulk Actions */}
          {selectedItems.length > 0 && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-t border-blue-200 px-5 py-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold text-sm">{selectedItems.length}</span>
                    </div>
                <span className="text-sm font-medium text-blue-700">
                      {selectedItems.length} staff member{selectedItems.length > 1 ? 's' : ''} selected
                </span>
                  </div>
                <div className="flex items-center space-x-2">
                    <button className="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-all duration-200">
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </button>
                    <button className="inline-flex items-center px-3 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-all duration-200">
                      <Download className="w-4 h-4 mr-2" />
                    Export
                  </button>
                    <button className="inline-flex items-center px-3 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-all duration-200">
                      <Archive className="w-4 h-4 mr-2" />
                    Archive
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Content Area */}
            {viewMode === 'grid' ? (
              <div>
                {/* Grid View Header with Select All */}
                <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedItems.length === mockData.length}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
                    />
                    <span className="ml-3 font-medium text-gray-900">Select All Staff Members</span>
                  </label>
                </div>
                
                {/* Grid Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-5">
                {mockData.map((item) => (
                    <div key={item.id} className="group bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-lg transition-all duration-200">
                    <div className="flex items-start justify-between mb-3">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item.id)}
                        onChange={() => handleSelectItem(item.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
                      />
                        <button className="text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                      
                      <div className="mb-3">
                        <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors duration-200">
                          {item.name}
                        </h3>
                        <p className="text-sm text-gray-600 mb-1">{item.email}</p>
                        <p className="text-xs text-gray-500 mb-1">Role: {item.role}</p>
                        <p className="text-xs text-gray-500">Dept: {item.department}</p>
                      </div>
                      
                    <div className="flex items-center justify-between">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}>
                        {item.status}
                      </span>
                      <span className="text-xs text-gray-500">{item.date}</span>
                    </div>
                  </div>
                ))}
                </div>
              </div>
            ) : (
              <div className="overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedItems.length === mockData.length}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
                    />
                    <span className="ml-3 font-medium text-gray-900">Select All Staff Members</span>
                  </label>
                </div>
                <div className="divide-y divide-gray-100">
                  {mockData.map((item) => (
                    <div key={item.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors duration-200">
                      <div className="flex items-center space-x-4">
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(item.id)}
                          onChange={() => handleSelectItem(item.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
                        />
                        <div>
                          <h3 className="font-medium text-gray-900">{item.name}</h3>
                          <p className="text-sm text-gray-600">{item.email}</p>
                          <p className="text-xs text-gray-500">{item.role} • {item.department}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}>
                          {item.status}
                        </span>
                        <span className="text-sm text-gray-500">{item.date}</span>
                        <button className="text-gray-400 hover:text-gray-600">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pagination */}
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                <div className="text-sm text-gray-600">
                  Showing <span className="font-medium text-gray-900">1</span> to <span className="font-medium text-gray-900">12</span> of{' '}
                  <span className="font-medium text-gray-900">156</span> staff members
              </div>
              <div className="flex items-center space-x-2">
                <button 
                    className="p-2 border border-gray-200 rounded-lg hover:bg-white hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  disabled={currentPage === 1}
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
                {[1, 2, 3, 4, 5].map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      currentPage === page
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-gray-700 hover:bg-white hover:text-gray-900'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button 
                    className="p-2 border border-gray-200 rounded-lg hover:bg-white hover:border-gray-300 transition-all duration-200"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Add New Staff Form */}
        <div className="xl:col-span-1">
          {/* Bulk Import - Upload File (now first) */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden sticky top-4">
            <button
              type="button"
              onClick={() => setUploadCollapsed(prev => !prev)}
              className={`w-full px-5 py-4 flex items-center justify-between transition-colors duration-200 ${uploadCollapsed ? 'bg-gray-50 border-b border-gray-100' : 'bg-emerald-50 border-b border-emerald-200'}`}
            >
              <div className="flex items-center">
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                  <Upload className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="text-left">
                  <h2 className="text-lg font-bold text-gray-900">Bulk Import</h2>
                  <p className="text-sm text-gray-600">Upload a CSV or Excel file to import staff</p>
                </div>
              </div>
              <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${uploadCollapsed ? 'rotate-180' : 'rotate-0'}`} />
            </button>
            <div className={`p-5 space-y-4 ${uploadCollapsed ? 'hidden' : ''}`}>
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-2">Select file</span>
                <input
                  type="file"
                  accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                  onChange={handleUploadFileChange}
                  className="block w-full text-sm text-gray-700 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                />
              </label>
              {uploadFile && (
                <div className="text-sm text-gray-600">
                  Selected: <span className="font-medium text-gray-900">{uploadFile.name}</span>
                </div>
              )}
              <div className="flex items-center space-x-3 pt-1">
                <button
                  type="button"
                  onClick={() => setUploadFile(null)}
                  disabled={!uploadFile || isUploading}
                  className="px-4 py-2 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={!uploadFile || isUploading}
                  className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {isUploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
              <p className="text-xs text-gray-500">Supported formats: CSV, XLSX. Max 10MB.</p>
            </div>
          </div>

          {/* Add New Staff (now second) */}
          <div className="mt-6 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden sticky top-[calc(1rem+56px)]">
            <button
              type="button"
              onClick={() => setFormCollapsed(prev => !prev)}
              className={`w-full px-5 py-4 flex items-center justify-between transition-colors duration-200 ${formCollapsed ? 'bg-gray-50 border-b border-gray-100' : 'bg-emerald-50 border-b border-emerald-200'}`}
            >
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                  <UserPlus className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-left">
                  <h2 className="text-lg font-bold text-gray-900">Add New Staff</h2>
                  <p className="text-sm text-gray-600">Create a new staff member profile</p>
                </div>
              </div>
              <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${formCollapsed ? 'rotate-180' : 'rotate-0'}`} />
            </button>
            <form onSubmit={handleSubmit} className={`p-5 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto ${formCollapsed ? 'hidden' : ''}`}>
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                  <User className="w-4 h-4 mr-2 text-blue-600" />
                  Basic Information
                </h3>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleFormChange}
                      required
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleFormChange}
                      required
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      placeholder="Doe"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID *</label>
                  <input
                    type="text"
                    name="employeeId"
                    value={formData.employeeId}
                    onChange={handleFormChange}
                    required
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    placeholder="EMP001"
                  />
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                  <Mail className="w-4 h-4 mr-2 text-blue-600" />
                  Contact Information
                </h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleFormChange}
                    required
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    placeholder="john.doe@lydo.gov.ph"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    placeholder="+63 9XX XXX XXXX"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleFormChange}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-none"
                    placeholder="Complete address"
                  />
                </div>
              </div>

              {/* Work Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                  <Briefcase className="w-4 h-4 mr-2 text-blue-600" />
                  Work Information
                </h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleFormChange}
                    required
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  >
                    <option value="">Select Role</option>
                    <option value="LYDO Staff">LYDO Staff</option>
                    <option value="Coordinator">Coordinator</option>
                    <option value="Assistant">Assistant</option>
                    <option value="Manager">Manager</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department *</label>
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleFormChange}
                    required
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  >
                    <option value="">Select Department</option>
                    <option value="Youth Development">Youth Development</option>
                    <option value="Programs">Programs</option>
                    <option value="Administration">Administration</option>
                    <option value="Outreach">Outreach</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleFormChange}
                    required
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  >
                    <option value="Active">Active</option>
                    <option value="Pending">Pending</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>
      </div>

              {/* Form Actions */}
              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setFormData({
                    firstName: '',
                    lastName: '',
                    email: '',
                    phone: '',
                    role: '',
                    department: '',
                    address: '',
                    startDate: '',
                    employeeId: '',
                    status: 'Active'
                  })}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-200 transition-all duration-200"
                >
                  Clear Form
                </button>
                <button
                  type="submit"
                  className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Add Staff
                </button>
          </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffManagement;