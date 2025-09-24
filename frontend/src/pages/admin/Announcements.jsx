import React from 'react';
import {
  HeaderMainContent,
  TabContainer,
  Tab,
  SearchBar,
  SortModal,
  FilterModal,
  DataTable,
  BulkActionsBar,
  Status,
  ExportButton,
  useExport
} from '../../components/portal_main_content';
import { ToastContainer, showSuccessToast, showErrorToast } from '../../components/universal';
import {
  Plus,
  FileText,
  Tag,
  Pin,
  Star,
  Filter as FilterIcon,
  ArrowUpDown,
  ChevronDown
} from 'lucide-react';

// UI-only mock data (no API calls)
const MOCK_ANNOUNCEMENTS = [
  {
    announcement_id: 'ANN101',
    title: 'Youth Leadership Summit 2025',
    summary: 'Join us for a day of workshops, talks, and networking for young leaders.',
    category: 'event',
    status: 'published',
    is_pinned: true,
    is_featured: true,
    published_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    announcement_id: 'ANN102',
    title: 'Community Clean-up Drive',
    summary: 'Let’s make our barangay cleaner. Volunteers needed this Saturday morning.',
    category: 'meeting',
    status: 'published',
    is_pinned: false,
    is_featured: true,
    published_at: new Date(Date.now() - 86400000).toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    announcement_id: 'ANN103',
    title: 'Scholarship Application Deadline Extended',
    summary: 'Deadline moved to next Friday. Submit your requirements at the LYDO office.',
    category: 'deadline',
    status: 'draft',
    is_pinned: false,
    is_featured: false,
    published_at: null,
    created_at: new Date().toISOString(),
  },
  {
    announcement_id: 'ANN104',
    title: 'KK Survey 2025 Now Open',
    summary: 'Participate in the KK survey to help shape youth programs in our municipality.',
    category: 'survey',
    status: 'published',
    is_pinned: false,
    is_featured: false,
    published_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    announcement_id: 'ANN105',
    title: 'Congratulations to Outstanding Youth Volunteers',
    summary: 'Recognizing exemplary contributions to community service this quarter.',
    category: 'achievement',
    status: 'archived',
    is_pinned: false,
    is_featured: false,
    published_at: new Date(Date.now() - 7*86400000).toISOString(),
    created_at: new Date().toISOString(),
  },
];

const Announcements = () => {
  // Tabs
  const [activeTab, setActiveTab] = React.useState('all');

  // Search/Filter/Sort
  const [searchQuery, setSearchQuery] = React.useState('');
  const [showFilterModal, setShowFilterModal] = React.useState(false);
  const filterTriggerRef = React.useRef(null);
  const [filterValues, setFilterValues] = React.useState({ dateCreated: '' });

  const [isSortOpen, setIsSortOpen] = React.useState(false);
  const [sortBy, setSortBy] = React.useState('published_at');
  const [sortOrder, setSortOrder] = React.useState('desc');

  // Selection
  const [selectedItems, setSelectedItems] = React.useState([]);

  // UI-only page: no create form on this layout

  // Export helpers (UI-only, based on filtered list)
  const buildCsvRows = (items = []) => {
    const rows = [];
    rows.push(['ID','Title','Summary','Category','Status','Featured','Pinned','Published At']);
    (items || []).forEach(a => {
      rows.push([
        a.announcement_id,
        a.title || '',
        a.summary || '',
        a.category || '',
        a.status || '',
        a.is_featured ? 'Yes' : 'No',
        a.is_pinned ? 'Yes' : 'No',
        a.published_at ? new Date(a.published_at).toLocaleString() : ''
      ]);
    });
    return rows;
  };

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

  const buildExcelXml = (items = []) => {
    const headerRow = `
      <Row>
        <Cell><Data ss:Type="String">ID</Data></Cell>
        <Cell><Data ss:Type="String">Title</Data></Cell>
        <Cell><Data ss:Type="String">Summary</Data></Cell>
        <Cell><Data ss:Type="String">Category</Data></Cell>
        <Cell><Data ss:Type="String">Status</Data></Cell>
        <Cell><Data ss:Type="String">Featured</Data></Cell>
        <Cell><Data ss:Type="String">Pinned</Data></Cell>
        <Cell><Data ss:Type="String">Published At</Data></Cell>
      </Row>`;
    const bodyRows = (items || []).map(a => `
      <Row>
        <Cell><Data ss:Type="String">${a.announcement_id || ''}</Data></Cell>
        <Cell><Data ss:Type="String">${(a.title || '').toString()}</Data></Cell>
        <Cell><Data ss:Type="String">${(a.summary || '').toString()}</Data></Cell>
        <Cell><Data ss:Type="String">${(a.category || '').toString()}</Data></Cell>
        <Cell><Data ss:Type="String">${(a.status || '').toString()}</Data></Cell>
        <Cell><Data ss:Type="String">${a.is_featured ? 'Yes' : 'No'}</Data></Cell>
        <Cell><Data ss:Type="String">${a.is_pinned ? 'Yes' : 'No'}</Data></Cell>
        <Cell><Data ss:Type="String">${a.published_at ? new Date(a.published_at).toLocaleString() : ''}</Data></Cell>
      </Row>`).join('');
    return `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Worksheet ss:Name="Announcements"><Table>${headerRow}${bodyRows}</Table></Worksheet></Workbook>`;
  };

  const openPrintPdf = (title, items = []) => {
    const win = window.open('', '_blank');
    if (!win) return;
    const header = `
      <thead>
        <tr>
          <th>ID</th><th>Title</th><th>Category</th><th>Status</th><th>Featured</th><th>Pinned</th><th>Published</th>
        </tr>
      </thead>`;
    const rows = (items || []).map(a => `
      <tr>
        <td>${a.announcement_id || ''}</td>
        <td>${a.title || ''}</td>
        <td>${a.category || ''}</td>
        <td>${a.status || ''}</td>
        <td>${a.is_featured ? 'Yes' : 'No'}</td>
        <td>${a.is_pinned ? 'Yes' : 'No'}</td>
        <td>${a.published_at ? new Date(a.published_at).toLocaleDateString() : ''}</td>
      </tr>`).join('');
    win.document.write(`
      <html><head><title>${title}</title>
      <style>body{font-family:Arial} table{width:100%;border-collapse:collapse} th,td{border:1px solid #777;padding:6px;font-size:12px}</style>
      </head><body>
      <h1>${title}</h1>
      <table>${header}<tbody>${rows}</tbody></table>
      </body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  };

  const mainExport = useExport({
    exportFunction: async (format) => {
      const items = filtered;
      if (format === 'csv') {
        const rows = buildCsvRows(items);
        downloadCsv('announcements.csv', rows);
      } else if (format === 'excel') {
        const xml = buildExcelXml(items);
        const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'announcements.xls'; a.click();
        window.URL.revokeObjectURL(url);
      } else if (format === 'pdf') {
        openPrintPdf('Announcements', items);
      }
      return { success: true };
    },
    onSuccess: () => showSuccessToast('Export completed', 'Announcements exported successfully'),
    onError: (error) => showErrorToast('Export failed', error.message || 'Could not export')
  });

  // Derived mock data based on UI state
  const filtered = React.useMemo(() => {
    let list = [...MOCK_ANNOUNCEMENTS];

    // Tab filters
    if (activeTab === 'published') list = list.filter(a => a.status === 'published');
    if (activeTab === 'draft') list = list.filter(a => a.status === 'draft');
    if (activeTab === 'archived') list = list.filter(a => a.status === 'archived');
    if (activeTab === 'featured') list = list.filter(a => a.is_featured);
    if (activeTab === 'pinned') list = list.filter(a => a.is_pinned);

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(a =>
        a.title.toLowerCase().includes(q) ||
        (a.summary || '').toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q)
      );
    }

    // Simple sort
    list.sort((a, b) => {
      const dir = sortOrder === 'asc' ? 1 : -1;
      if (sortBy === 'title') return a.title.localeCompare(b.title) * dir;
      if (sortBy === 'category') return a.category.localeCompare(b.category) * dir;
      const da = new Date(a[sortBy] || a.created_at).getTime();
      const db = new Date(b[sortBy] || b.created_at).getTime();
      return (da - db) * dir;
    });

    return list;
  }, [activeTab, searchQuery, sortBy, sortOrder]);

  const handleActionClick = (action, item) => {
    if (action === 'view') {
      showSuccessToast('Preview', `Would open details for ${item.title}`);
    } else if (action === 'edit') {
      showSuccessToast('Preview', `Would open edit form for ${item.title}`);
    } else if (action === 'delete') {
      showErrorToast('Preview only', 'Deletion is disabled in mock view');
    } else if (action === 'pin') {
      showSuccessToast('Preview', `${item.is_pinned ? 'Unpin' : 'Pin'} ${item.title}`);
    } else if (action === 'feature') {
      showSuccessToast('Preview', `${item.is_featured ? 'Unfeature' : 'Feature'} ${item.title}`);
    }
  };

  const getActionMenuItems = (item) => ([
    { id: 'view', label: 'View', icon: <FileText className="w-4 h-4" />, action: 'view' },
    { id: 'edit', label: 'Edit', icon: <FileText className="w-4 h-4" />, action: 'edit' },
    { id: 'pin', label: item.is_pinned ? 'Unpin' : 'Pin', icon: <Pin className="w-4 h-4" />, action: 'pin' },
    { id: 'feature', label: item.is_featured ? 'Unfeature' : 'Feature', icon: <Star className="w-4 h-4" />, action: 'feature' },
    { id: 'delete', label: 'Delete', icon: <FileText className="w-4 h-4" />, action: 'delete' }
  ]);

  const getAnnouncementStatus = (a) => {
    if (a.is_pinned) return 'pinned';
    if (a.is_featured) return 'featured';
    return a.status;
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <HeaderMainContent
        title="Announcement Management"
        description="Create, organize, and publish announcements"
      >
        <button
          onClick={() => { window.location.href = '/admin/announcements/create'; }}
          aria-label="Create Announcement"
          className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-300 active:scale-[0.98] transition-all"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Create Announcement</span>
          <span className="sm:hidden">Create</span>
        </button>
      </HeaderMainContent>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <TabContainer
          activeTab={activeTab}
          onTabChange={setActiveTab}
          variant="underline"
          size="md"
        >
          <Tab id="all" label="All" shortLabel="All" count={MOCK_ANNOUNCEMENTS.length} color="blue" />
          <Tab id="published" label="Published" count={MOCK_ANNOUNCEMENTS.filter(a => a.status==='published').length} color="green" />
          <Tab id="draft" label="Draft" count={MOCK_ANNOUNCEMENTS.filter(a => a.status==='draft').length} color="yellow" />
          <Tab id="archived" label="Archived" count={MOCK_ANNOUNCEMENTS.filter(a => a.status==='archived').length} color="gray" />
          <Tab id="featured" label="Featured" count={MOCK_ANNOUNCEMENTS.filter(a => a.is_featured).length} color="purple" />
          <Tab id="pinned" label="Pinned" count={MOCK_ANNOUNCEMENTS.filter(a => a.is_pinned).length} color="blue" />
        </TabContainer>

        {/* Controls */}
        <div className="px-5 py-4 border-t border-gray-100">
          <div className="flex items-center justify-between gap-4">
            {/* Left Controls */}
            <div className="flex items-center gap-3 overflow-x-auto pb-2 md:pb-0 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              <div className="flex items-center space-x-3 min-w-max">
                {/* Search */}
                <div className="flex-shrink-0">
                  <SearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search announcements..."
                    expandOnMobile
                    showIndicator
                    indicatorText="Search"
                    indicatorColor="blue"
                    size="md"
                    debounceMs={200}
                  />
                </div>

                {/* Filter Button */}
                <button
                  ref={filterTriggerRef}
                  onClick={() => setShowFilterModal(true)}
                  className={`inline-flex items-center border rounded-lg font-medium transition-all duration-200 ${
                    showFilterModal || filterValues.dateCreated
                      ? 'border-blue-500 text-blue-600 bg-blue-50'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  } px-2 py-1.5 sm:px-3 sm:py-2 whitespace-nowrap flex-shrink-0`}
                >
                  <FilterIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Filter</span>
                  <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1" />
                </button>

                {/* Sort Button */}
                <button
                  onClick={() => setIsSortOpen(true)}
                  className={`inline-flex items-center border rounded-lg font-medium transition-all duration-200 ${
                    sortBy !== 'published_at' || sortOrder !== 'desc'
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
              {/* Export Button */}
              <ExportButton
                formats={['csv','xlsx','pdf']}
                onExport={(format) => mainExport.handleExport(format === 'xlsx' ? 'excel' : format)}
                isExporting={mainExport.isExporting}
                label="Export"
                size="md"
                position="auto"
                responsive={true}
              />
              {selectedItems.length > 0 && (
                <BulkActionsBar
                  selectedCount={selectedItems.length}
                  itemName="announcement"
                  itemNamePlural="announcements"
                  onBulkAction={() => showSuccessToast('Preview', 'Open bulk actions')}
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
            onChange={setFilterValues}
            onApply={setFilterValues}
            onClear={() => setFilterValues({ dateCreated: '' })}
            applyButtonText="Apply Filters"
            clearButtonText="Clear All"
          />
        </div>

        {/* Content */}
        <div className="px-5 pb-6">
          <DataTable
            data={filtered}
            selectedItems={selectedItems}
            onSelectItem={(id) => setSelectedItems(prev => prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id])}
            onSelectAll={() => {
              const all = filtered.map(a => a.announcement_id);
              setSelectedItems(selectedItems.length === all.length ? [] : all);
            }}
            getActionMenuItems={getActionMenuItems}
            onActionClick={(action, item) => handleActionClick(action, item)}
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
        </div>
      </div>

      {/* Create form removed per request; keeping UI focused on list management */}

      {/* Toasts */}
      <ToastContainer position="top-right" maxToasts={5} />
    </div>
  );
};

export default Announcements;


