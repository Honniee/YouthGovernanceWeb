import React, { useMemo, useState, useRef } from 'react';
import {
  Filter,
  Search,
  ArrowUpDown,
  ChevronDown,
  FileText
} from 'lucide-react';
import {
  SearchBar,
  SortModal,
  useSortModal,
  FilterModal,
  Pagination,
  usePagination,
  ExportButton
} from '../../components/portal_main_content';

const SurveyBatchResponses = ({
  responses = [],
  isLoading = false,
  defaultFilters = { status: 'all', location: 'all' },
  onFiltersChange,
  onExport
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(defaultFilters.status || 'all');
  const [locationFilter, setLocationFilter] = useState(defaultFilters.location || 'all');
  const [filterValues, setFilterValues] = useState({ status: '', location: '' });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(9);
  const [showFilterModal, setShowFilterModal] = useState(false);

  const filterTriggerRef = useRef(null);
  const sortModal = useSortModal('submittedDate', 'desc', () => {});

  const pagination = usePagination({
    initialPage: currentPage,
    initialItemsPerPage: itemsPerPage,
    totalItems: responses.length,
    onPageChange: setCurrentPage,
    onItemsPerPageChange: (n) => { setItemsPerPage(n); setCurrentPage(1); }
  });

  const getStatusOptions = () => {
    const statuses = [...new Set(
      responses.map(r => (r.status || r.validationStatus)).filter(Boolean)
    )];
    return statuses.map(status => ({ value: status, label: status }));
  };

  const getLocationOptions = () => {
    const locations = [...new Set(responses.map(r => (r.location || r.barangay)).filter(Boolean))];
    return locations.map(location => ({ value: location, label: location }));
  };

  const getFilteredResponses = useMemo(() => {
    let filtered = [...responses];
    if (searchQuery) {
      filtered = filtered.filter(response =>
        (response.youthName || response.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (response.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (response.location || response.barangay || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter(response => {
        const s = (response.status || response.validationStatus || '').toString();
        return s === statusFilter;
      });
    }
    if (locationFilter !== 'all') {
      filtered = filtered.filter(response => {
        const loc = (response.location || response.barangay || '').toString();
        return loc === locationFilter;
      });
    }
    // Sorting based on modal selection
    const direction = sortModal.sortOrder === 'asc' ? 1 : -1;
    const getValue = (r) => {
      switch (sortModal.sortBy) {
        case 'name':
          return (r.youthName || r.name || '').toLowerCase();
        case 'status':
          return (r.status || r.validationStatus || '').toLowerCase();
        case 'location':
          return (r.location || r.barangay || '').toLowerCase();
        case 'submittedDate':
        default:
          return new Date(r.submittedDate || r.created_at || r.createdAt || r.created || 0).getTime();
      }
    };
    filtered.sort((a, b) => {
      const va = getValue(a);
      const vb = getValue(b);
      if (va < vb) return -1 * direction;
      if (va > vb) return 1 * direction;
      return 0;
    });
    return filtered;
  }, [responses, searchQuery, statusFilter, locationFilter, sortModal.sortBy, sortModal.sortOrder]);

  const paginatedResponses = getFilteredResponses.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const hasActiveFilters = (statusFilter !== 'all') || (locationFilter !== 'all');
  const activeFilterCount = (statusFilter !== 'all' ? 1 : 0) + (locationFilter !== 'all' ? 1 : 0);

  return (
    <div>
      {/* Controls */}
      <div className="px-3 py-2 md:px-4 md:py-3 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 overflow-x-auto pb-2 md:pb-0">
            <div className="flex items-center space-x-3 min-w-max">
              {/* Search Bar */}
              <div className="flex-shrink-0">
                <SearchBar
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search responses..."
                  expandOnMobile={true}
                  showIndicator={true}
                  indicatorText="Search"
                  indicatorColor="blue"
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
                  hasActiveFilters ? 'border-blue-500 text-blue-600 bg-blue-50' : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" />
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
                  !(sortModal.sortBy === 'submittedDate' && sortModal.sortOrder === 'desc') ? 'border-blue-500 text-blue-600 bg-blue-50' : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <ArrowUpDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" />
                <span className="hidden sm:inline">Sort</span>
                <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1" />
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-3 flex-shrink-0">
            <div className="text-sm text-gray-600">
              {getFilteredResponses.length} response{getFilteredResponses.length !== 1 ? 's' : ''}
            </div>
            <ExportButton
              formats={['csv', 'xlsx', 'pdf']}
              onExport={onExport}
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
          title="Sort Options"
          sortFields={[
            { value: 'name', label: 'Youth Name' },
            { value: 'submittedDate', label: 'Submitted Date' },
            { value: 'status', label: 'Status' },
            { value: 'location', label: 'Location' }
          ]}
          sortBy={sortModal.sortBy}
          sortOrder={sortModal.sortOrder}
          onSortChange={(newSortBy, newSortOrder) => {
            // Update sort state used by list via modal controller
            if (typeof sortModal.updateSort === 'function') sortModal.updateSort(newSortBy, newSortOrder);
            sortModal.closeModal && sortModal.closeModal();
            setCurrentPage(1);
          }}
          onReset={() => {
            if (typeof sortModal.resetSort === 'function') sortModal.resetSort();
          }}
          defaultSortBy="submittedDate"
          defaultSortOrder="desc"
        />

        {/* Filter Modal */}
        <FilterModal
          isOpen={showFilterModal}
          onClose={() => setShowFilterModal(false)}
          triggerRef={filterTriggerRef}
          title="Advanced Filters"
          filters={[
            { id: 'status', label: 'Status', type: 'select', placeholder: 'All Statuses', options: getStatusOptions() },
            { id: 'location', label: 'Barangay', type: 'select', placeholder: 'All Barangays', options: getLocationOptions() }
          ]}
          values={filterValues}
          onChange={setFilterValues}
          onApply={(vals) => {
            const nf = {
              status: vals.status || 'all',
              location: vals.location || 'all'
            };
            setStatusFilter(nf.status); setLocationFilter(nf.location); setCurrentPage(1);
            onFiltersChange && onFiltersChange(nf);
            setShowFilterModal(false);
          }}
          onClear={() => { setStatusFilter('all'); setLocationFilter('all'); setFilterValues({ status: '', location: '' }); setCurrentPage(1); onFiltersChange && onFiltersChange({ status: 'all', location: 'all' }); setShowFilterModal(false); }}
          applyButtonText="Apply Filters"
          clearButtonText="Clear All"
        />
      </div>

      {/* Content Area */}
      {isLoading ? (
        <div className="py-16 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <Search className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-600">Loading responses...</p>
        </div>
      ) : (
        <div className="p-4 md:p-5">
          {paginatedResponses.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Responses Found</h3>
              <p className="text-gray-600">No responses match your current filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 md:gap-3">
              {paginatedResponses.map((r, idx) => {
                const status = (r.status || r.validationStatus || '').toLowerCase();
                const statusLabel = status ? status.charAt(0).toUpperCase() + status.slice(1) : 'N/A';
                const barangay = r.location || r.barangay || '';
                const name = r.youthName || r.name || [r.lastName, r.firstName].filter(Boolean).join(', ') || 'N/A';
                const age = r.age ?? '';
                const bdayStr = (r.birthDate || r.birthday)
                  ? new Date(r.birthDate || r.birthday).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
                  : '';
                const classification = r.youthClassification || r.classification || '';
                const education = r.education || r.highestEducationalAttainment || '';
                const workStatus = r.workStatus || r.employmentStatus || '';

                return (
                  <div key={r.responseId || r.id || idx} className="bg-white rounded-lg md:rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition">
                    <div className="px-3 py-2 md:px-4 md:py-2.5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                      <div className="font-semibold text-gray-900 truncate mr-2 max-w-[70%] text-sm md:text-base">{name}</div>
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] md:text-xs font-medium border ${
                        status === 'validated' ? 'bg-green-50 text-green-700 border-green-200' :
                        status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                        status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                        'bg-gray-50 text-gray-700 border-gray-200'
                      }`}>{statusLabel}</span>
                    </div>
                    <div className="p-3 md:p-4 space-y-2">
                      <div className="flex items-center justify-between text-xs md:text-sm">
                        <div className="text-gray-600">Barangay</div>
                        <div className="font-medium text-gray-900 truncate ml-3">{barangay || 'N/A'}</div>
                      </div>
                      <div className="space-y-1 text-xs md:text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Age</span>
                          <span className="font-medium text-gray-900">{age || '—'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Birthday</span>
                          <span className="font-medium text-gray-900">{bdayStr || '—'}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-1.5 text-xs md:text-sm">
                        {classification && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Classification</span>
                            <span className="font-medium text-gray-900 ml-3 truncate max-w-[60%] text-right">{classification}</span>
                          </div>
                        )}
                        {education && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Education</span>
                            <span className="font-medium text-gray-900 ml-3 truncate max-w-[60%] text-right">{education}</span>
                          </div>
                        )}
                        {workStatus && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Work</span>
                            <span className="font-medium text-gray-900 ml-3 truncate max-w-[60%] text-right">{workStatus}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && getFilteredResponses.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalItems={getFilteredResponses.length}
          itemsPerPage={itemsPerPage}
          onPageChange={pagination.handlePageChange}
          onItemsPerPageChange={pagination.handleItemsPerPageChange}
          itemName="response"
          itemNamePlural="responses"
          showItemsPerPage={true}
          showInfo={true}
          size="md"
          variant="default"
          itemsPerPageOptions={[9, 18, 36]}
        />
      )}
    </div>
  );
};

export default SurveyBatchResponses;


