import React, { useMemo, useState, useRef } from 'react';
import { HeaderMainContent, SearchBar, SortModal, useSortModal, FilterModal, Pagination } from '../../components/portal_main_content';
import { Calendar, User, Tag, Eye, Filter as FilterIcon, ArrowUpDown, ChevronDown } from 'lucide-react';

const dummy = [
  { id: 1, title: 'Youth Leadership Summit 2025', summary: 'Calling youth leaders...', author: 'LYDO Staff', publishAt: '2025-09-10T09:00:00Z', views: 342, tags: ['Leadership', 'Training'] },
  { id: 2, title: 'Scholarship Application Opens', summary: 'Application for scholarship...', author: 'LYDO Staff', publishAt: '2025-09-01T08:00:00Z', views: 512, tags: ['Scholarship'] },
  { id: 3, title: 'Barangay Sports Clinic', summary: 'Free sports clinics across barangays...', author: 'Sports Committee', publishAt: '2025-08-18T10:00:00Z', views: 210, tags: ['Sports', 'Health'] }
];

const AnnouncementsFeatured = () => {
  const [featured] = useState(dummy);

  // Search / Filter / Sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [authorFilter, setAuthorFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const sortModal = useSortModal('publishAt', 'desc', (newSortBy, newSortOrder) => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    setCurrentPage(1);
  });
  const [sortBy, setSortBy] = useState('publishAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const filterTriggerRef = useRef(null);
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(9);

  // Derive filter options
  const authors = useMemo(() => ['all', ...Array.from(new Set((featured || []).map(i => i.author)))], [featured]);
  const tags = useMemo(() => {
    const all = new Set();
    (featured || []).forEach(i => (i.tags || []).forEach(t => all.add(t)));
    return ['all', ...Array.from(all)];
  }, [featured]);

  // Filter + sort
  const filteredItems = useMemo(() => {
    let data = [...(featured || [])];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter(a => (
        a.title?.toLowerCase().includes(q) ||
        a.summary?.toLowerCase().includes(q) ||
        a.author?.toLowerCase().includes(q) ||
        (a.tags || []).join(' ').toLowerCase().includes(q)
      ));
    }
    if (authorFilter !== 'all') {
      data = data.filter(a => a.author === authorFilter);
    }
    if (tagFilter !== 'all') {
      data = data.filter(a => (a.tags || []).includes(tagFilter));
    }
    data.sort((a, b) => {
      let av, bv;
      switch (sortBy) {
        case 'title':
          av = a.title?.toLowerCase() || '';
          bv = b.title?.toLowerCase() || '';
          break;
        case 'views':
          av = a.views || 0;
          bv = b.views || 0;
          break;
        case 'publishAt':
        default:
          av = new Date(a.publishAt).getTime();
          bv = new Date(b.publishAt).getTime();
          break;
      }
      if (sortOrder === 'asc') return av > bv ? 1 : -1;
      return av < bv ? 1 : -1;
    });
    return data;
  }, [featured, searchQuery, authorFilter, tagFilter, sortBy, sortOrder]);

  // Page slice
  const totalItems = filteredItems.length;
  const startIdx = (currentPage - 1) * itemsPerPage;
  const pageItems = filteredItems.slice(startIdx, startIdx + itemsPerPage);

  const hasActiveFilters = (authorFilter !== 'all') || (tagFilter !== 'all');
  const activeFilterCount = (authorFilter !== 'all' ? 1 : 0) + (tagFilter !== 'all' ? 1 : 0);

  return (
    <div className="space-y-6">
      <HeaderMainContent
        title="Featured Events"
        description="Highlighted events curated by LYDO."
      >
        {/* Optional actions could go here later */}
      </HeaderMainContent>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Controls */}
        <div className="px-4 sm:px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 overflow-x-auto pb-2 md:pb-0">
              <div className="flex-shrink-0">
                <SearchBar
                  value={searchQuery}
                  onChange={(v) => { setSearchQuery(v); setCurrentPage(1); }}
                  placeholder="Search featured events..."
                  expandOnMobile={true}
                  size="md"
                />
              </div>
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
            title="Sort Featured"
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
            title="Filter Featured"
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

        {/* Content */}
        <div className="p-4 sm:p-6">
          {pageItems.length === 0 ? (
            <div className="text-center py-16 text-gray-600">No featured events found</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
              {pageItems.map(a => (
                <div key={a.id} className="rounded-xl border border-gray-200 shadow-sm bg-white p-5 hover:shadow-md transition-shadow">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 line-clamp-2">{a.title}</h3>
                  <p className="mt-2 text-sm text-gray-600 line-clamp-3">{a.summary}</p>
                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex items-center text-gray-700">
                      <Calendar className="w-4 h-4 mr-2" />
                      <span>{new Date(a.publishAt).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center text-gray-700">
                      <User className="w-4 h-4 mr-2" />
                      <span>{a.author}</span>
                    </div>
                    <div className="flex items-center text-gray-700">
                      <Tag className="w-4 h-4 mr-2" />
                      <div className="flex flex-wrap gap-1.5">
                        {(a.tags || []).map(t => (
                          <span key={t} className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs border border-gray-200">{t}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center text-gray-500 text-xs">
                      <Eye className="w-4 h-4 mr-1.5" /> {a.views} views
                    </div>
                    <button type="button" className="text-blue-600 hover:text-blue-800 text-sm font-medium">View details</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalItems > 0 && (
          <div className="px-4 sm:px-6 pb-6">
            <Pagination
              currentPage={currentPage}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onPageChange={(p) => setCurrentPage(p)}
              onItemsPerPageChange={(n) => { setItemsPerPage(n); setCurrentPage(1); }}
              itemName="event"
              itemNamePlural="events"
              itemsPerPageOptions={[6, 9, 12, 18]}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default AnnouncementsFeatured;
