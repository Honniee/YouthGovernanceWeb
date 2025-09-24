import React, { useEffect, useMemo, useRef, useState } from 'react';
import PublicLayout from '../../components/layouts/PublicLayout';
import { LoadingSpinner, SearchBar, FilterModal, SortModal, useSortModal, Pagination } from '../../components/portal_main_content';
import { getAnnouncements } from '../../services/announcementsService';
import { 
  Calendar,
  MapPin,
  BookOpen,
  Star,
  Pin,
  Search,
  ArrowRight,
  Clock,
  ChevronLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Simple scroll reveal (same pattern as Barangays)
const useScrollReveal = () => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return [ref, isVisible];
};

const ProgramsThisMonth = () => {
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(9);
  const [filters, setFilters] = useState({ dateFrom: '', dateTo: '' });
  const [showFilterModal, setShowFilterModal] = useState(false);
  const filterTriggerRef = useRef(null);
  const sortModal = useSortModal('event_date', 'asc');

  const [heroRef, heroVisible] = useScrollReveal();
  const [listRef, listVisible] = useScrollReveal();

  const buildSvgPlaceholder = (label, colorFrom, colorTo) => {
    const svg = `
      <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 675' preserveAspectRatio='xMidYMid slice'>
        <defs>
          <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
            <stop offset='0%' stop-color='${colorFrom}'/>
            <stop offset='100%' stop-color='${colorTo}'/>
          </linearGradient>
        </defs>
        <rect width='1200' height='675' fill='url(#g)'/>
        <g fill='rgba(255,255,255,0.25)'>
          <circle cx='150' cy='120' r='90'/>
          <circle cx='1050' cy='560' r='120'/>
          <circle cx='950' cy='90' r='60'/>
        </g>
        <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='Arial, sans-serif' font-size='56' font-weight='700' fill='rgba(255,255,255,0.95)' stroke='rgba(0,0,0,0.25)' stroke-width='2' paint-order='stroke'>${label}</text>
      </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  };

  const getFallbackImage = (category, title) => {
    const label = (title || '').trim() || 'Programs';
    return buildSvgPlaceholder(label, '#3b82f6', '#1e40af');
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const dateRange = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { start, end };
  }, []);

  // Categories (tabs)
  const categories = [
    { key: 'all', label: 'All', icon: BookOpen },
    { key: 'projects', label: 'Projects', icon: BookOpen },
    { key: 'programs', label: 'Programs', icon: BookOpen },
    { key: 'activities', label: 'Activities', icon: BookOpen },
    { key: 'meetings', label: 'Meetings', icon: BookOpen },
    { key: 'achievement', label: 'Achievement', icon: BookOpen },
    { key: 'announcements', label: 'Announcements', icon: BookOpen }
  ];

  useEffect(() => {
    let isMounted = true;
    const fetch = async () => {
      try {
        setLoading(true);
        setError('');
        // Fetch published announcements across all categories; sort server by published_at
        const res = await getAnnouncements({
          page: 1,
          limit: 100,
          status: 'published',
          sortBy: 'published_at',
          sortOrder: 'DESC'
        });
        if (!isMounted) return;
        const items = res?.data || [];
        const filtered = items.filter(a => {
          const ev = a.event_date ? new Date(a.event_date) : null;
          const dl = a.end_date ? new Date(a.end_date) : null;
          return (
            (ev && ev >= dateRange.start && ev <= dateRange.end) ||
            (dl && dl >= dateRange.start && dl <= dateRange.end)
          );
        });
        // Sort by event_date asc, nulls last
        const sorted = [...filtered].sort((a, b) => {
          const ad = a.event_date ? new Date(a.event_date) : null;
          const bd = b.event_date ? new Date(b.event_date) : null;
          if (!ad && !bd) return 0;
          if (!ad) return 1;
          if (!bd) return -1;
          return ad - bd;
        });
        setAnnouncements(sorted);
      } catch (e) {
        if (!isMounted) return;
        setError(e?.message || 'Failed to load programs');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetch();
    return () => { isMounted = false; };
  }, [dateRange.end, dateRange.start]);

  // Derived filtering, sorting, pagination
  const monthAnnouncements = useMemo(() => announcements, [announcements]);

  const filteredAnnouncements = useMemo(() => {
    const byCategory = monthAnnouncements.filter(a => selectedCategory === 'all' ? true : (a.category === selectedCategory));
    const bySearch = byCategory.filter(a => {
      if (!searchTerm) return true;
      const t = (searchTerm || '').toLowerCase();
      return (a.title || '').toLowerCase().includes(t) || (a.summary || '').toLowerCase().includes(t);
    });
    const byPublishedDate = bySearch.filter(a => {
      const pub = a.published_at ? new Date(a.published_at) : null;
      const fromOk = !filters.dateFrom || (pub && pub >= new Date(filters.dateFrom));
      const toOk = !filters.dateTo || (pub && pub <= new Date(filters.dateTo));
      return fromOk && toOk;
    });

    const order = (sortModal.sortOrder || 'asc').toLowerCase();
    const compareDates = (aVal, bVal) => {
      const da = aVal ? new Date(aVal) : null;
      const db = bVal ? new Date(bVal) : null;
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return order === 'asc' ? (da - db) : (db - da);
    };

    const by = sortModal.sortBy || 'event_date';
    return [...byPublishedDate].sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
      if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1;
      switch (by) {
        case 'event_date':
          return compareDates(a.event_date, b.event_date);
        case 'end_date':
          return compareDates(a.end_date, b.end_date);
        case 'published_at':
          return compareDates(a.published_at, b.published_at);
        case 'title':
          return order === 'asc' ? (a.title || '').localeCompare(b.title || '') : (b.title || '').localeCompare(a.title || '');
        case 'category':
          return order === 'asc' ? (a.category || '').localeCompare(b.category || '') : (b.category || '').localeCompare(a.category || '');
        default:
          return 0;
      }
    });
  }, [monthAnnouncements, selectedCategory, searchTerm, filters.dateFrom, filters.dateTo, sortModal.sortBy, sortModal.sortOrder]);

  const totalItems = filteredAnnouncements.length;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paged = filteredAnnouncements.slice(startIndex, endIndex);

  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#24345A] via-[#1a2a47] to-[#0f1a2e] text-white -mt-12 sm:mt-0">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-white to-transparent rounded-full blur-xl" />
          <div className="absolute bottom-20 right-10 w-40 h-40 bg-gradient-to-tl from-white to-transparent rounded-full blur-xl" />
          <div className="absolute top-1/2 left-1/2 w-24 h-24 bg-gradient-to-br from-white to-transparent rounded-full blur-lg" />
        </div>
        <div 
          ref={heroRef}
          className={`relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 transition-all duration-1000 ease-out ${
            heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="mb-4 flex justify-start">
            <button
              onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/programs'))}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-white/90 ring-1 ring-white/20 hover:bg-white/15 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="text-sm">Back</span>
            </button>
          </div>
          <div className="text-center">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-xs font-semibold uppercase tracking-wider mb-4">
              <BookOpen className="w-3 h-3 mr-2" />
              Programs
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">Events This Month</h1>
            <p className="text-xl md:text-2xl text-white/90 mb-2">Programs, activities, and deadlines happening this month</p>
            <p className="text-white/80">Schedule, locations, and key dates for all active programs.</p>
          </div>
        </div>
      </section>

      {/* List Section */
      }
      <section className="py-16 bg-white relative overflow-hidden">
        <div 
          ref={listRef}
          className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-1000 ease-out ${
            listVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          {/* Current Month Display - centered calendar style */}
          <div className="mb-6 flex justify-center">
            <div className="inline-block overflow-hidden rounded-2xl bg-white ring-1 ring-gray-200 shadow-sm">
              <div className="px-4 py-1 bg-gray-100 text-gray-700 text-[11px] font-semibold uppercase tracking-wider text-center">This Month</div>
              <div className="px-5 py-3 text-center">
                <div className="text-2xl md:text-3xl font-bold text-gray-900">{dateRange.start.toLocaleString('en-US', { month: 'long' })}</div>
                <div className="text-sm md:text-base text-gray-600">{dateRange.start.toLocaleString('en-US', { year: 'numeric' })}</div>
              </div>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="mb-6 md:mb-8">
            <div className="flex justify-start">
              <div className="relative inline-grid grid-cols-7 items-center rounded-full bg-gray-100 ring-1 ring-gray-300 p-2 shadow-sm overflow-hidden">
                <div
                  className="absolute inset-y-1 rounded-full bg-gradient-to-r from-rose-200 via-purple-200 to-indigo-200 shadow-md ring-1 ring-gray-200 transition-all duration-300 ease-out pointer-events-none"
                  style={{ width: `${100 / categories.length}%`, left: `${(categories.findIndex(cat => cat.key === selectedCategory)) * (100 / categories.length)}%` }}
                />
                {categories.map((category) => (
                  <button
                    key={category.key}
                    type="button"
                    onClick={() => { setSelectedCategory(category.key); setCurrentPage(1); }}
                    className={`relative z-10 px-4 py-3 text-sm rounded-full transition-colors duration-300 font-semibold ${selectedCategory === category.key ? 'text-[#24345A]' : 'text-gray-700 hover:text-[#24345A] hover:bg-white/40'}`}
                  >
                    <div className="flex items-center justify-center">
                      <category.icon className="w-4 h-4 mr-1" />
                      <span className="hidden sm:inline">{category.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 overflow-x-auto pb-2 md:pb-0">
              <div className="flex-shrink-0">
                <SearchBar
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder="Search events..."
                  expandOnMobile={true}
                  showIndicator={true}
                  indicatorText="Search"
                  indicatorColor="blue"
                  size="md"
                  debounceMs={300}
                />
              </div>
              <button
                ref={filterTriggerRef}
                onClick={() => setShowFilterModal(true)}
                className={`inline-flex items-center border rounded-lg font-medium transition-all duration-200 ${
                  (filters.dateFrom || filters.dateTo) ? 'border-[#24345A] text-[#24345A] bg-[#24345A]/5' : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                } px-4 py-3 whitespace-nowrap flex-shrink-0 text-sm`}
              >
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4h18M7 12h10M11 20h2"/></svg>
                <span className="hidden sm:inline">Filter</span>
              </button>
              <button
                ref={sortModal.triggerRef}
                onClick={sortModal.toggleModal}
                className={`inline-flex items-center border rounded-lg font-medium transition-all duration-200 ${
                  sortModal.isOpen || !sortModal.isDefaultSort ? 'border-[#24345A] text-[#24345A] bg-[#24345A]/5' : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                } px-4 py-3 whitespace-nowrap flex-shrink-0 text-sm`}
              >
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 6h18M7 12h10M11 18h6"/></svg>
                <span className="hidden sm:inline">Sort</span>
              </button>
            </div>
          </div>
          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-16">
              <LoadingSpinner 
                variant="spinner"
                message="Loading programs..." 
                size="md"
                color="blue"
                height="h-32"
              />
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Programs</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <button onClick={() => window.location.reload()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">Try Again</button>
            </div>
          )}

          {/* Empty */}
          {!loading && !error && announcements.length === 0 && (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-600 mb-2">No programs scheduled this month</p>
              <p className="text-gray-500 text-sm">Please check back later</p>
            </div>
          )}

          {/* Grid */}
          {!loading && !error && paged.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {paged.map((announcement) => (
                <div key={announcement.announcement_id} className="group relative h-full">
                  <div 
                    className="relative rounded-2xl overflow-hidden shadow-sm bg-white ring-1 ring-gray-200 transition-all duration-200 group-hover:shadow-lg group-hover:-translate-y-1 h-full flex flex-col cursor-pointer"
                    onClick={() => navigate(`/programs/${announcement.announcement_id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/programs/${announcement.announcement_id}`); }}
                  >
                    {/* Image */}
                    <div className="relative overflow-hidden aspect-[16/9]">
                      <img
                        src={announcement.image_url || getFallbackImage(announcement.category, announcement.title)}
                        alt={announcement.title || 'Program image'}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                        decoding="async"
                        onError={(e) => { e.currentTarget.src = getFallbackImage(announcement.category, announcement.title); }}
                      />
                      <div className="absolute top-2 left-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                        <BookOpen className="w-3 h-3 mr-1" />
                        Programs
                      </div>
                      {(announcement.is_featured || announcement.is_pinned) && (
                        <div className="absolute top-2 right-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${announcement.is_featured ? 'bg-yellow-400' : 'bg-red-500'}`}>
                            {announcement.is_featured ? (
                              <Star className="w-3 h-3 text-yellow-800" />
                            ) : (
                              <Pin className="w-3 h-3 text-white" />
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-6 flex flex-col flex-1">
                      <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 text-lg">{announcement.title}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                        <div className="flex items-center"><Calendar className="w-4 h-4 mr-1" /><span>Published: {formatDate(announcement.published_at)}</span></div>
                      </div>
                      {announcement.summary && (
                        <p className="text-gray-600 text-sm mb-4 leading-relaxed line-clamp-3 flex-1">{announcement.summary}</p>
                      )}

                      {(announcement.event_date || announcement.location || announcement.end_date) && (
                        <div className="space-y-2 mb-4 p-3 bg-gray-50 rounded-lg">
                          {(() => {
                            const hasEvent = Boolean(announcement.event_date);
                            const hasEnd = Boolean(announcement.end_date);
                            if (hasEvent && hasEnd) {
                              return (
                                <div className="flex items-center text-sm text-gray-600"><Calendar className="w-4 h-4 mr-2 text-blue-500" /><span>Event period: {formatDate(announcement.event_date)} – {formatDate(announcement.end_date)}</span></div>
                              );
                            }
                            if (hasEvent) {
                              return (
                                <div className="flex items-center text-sm text-gray-600"><Calendar className="w-4 h-4 mr-2 text-blue-500" /><span>Event date: {formatDate(announcement.event_date)}</span></div>
                              );
                            }
                            if (hasEnd) {
                              return (
                                <div className="flex items-center text-sm text-red-600"><Clock className="w-4 h-4 mr-2" /><span>Deadline: {formatDate(announcement.end_date)}</span></div>
                              );
                            }
                            return null;
                          })()}

                          {announcement.location && (
                            <div className="flex items-center text-sm text-gray-600"><MapPin className="w-4 h-4 mr-2 text-gray-600" /><span className="truncate">{announcement.location}</span></div>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-auto">
                        <div className="relative inline-flex items-center text-gray-400 group-hover:text-[#24345A] transition-colors w-32">
                          <span className="absolute left-0 text-sm font-medium opacity-0 transition-opacity duration-200 pointer-events-none group-hover:opacity-100">Read more</span>
                          <ArrowRight className="w-5 h-5 transform transition-transform duration-200 group-hover:translate-x-20" />
                        </div>
                        <span className="text-xs text-gray-500">{formatDate(announcement.published_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {/* Pagination */}
          {!loading && !error && totalItems > itemsPerPage && (
            <div className="mt-8">
              <Pagination
                currentPage={currentPage}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setItemsPerPage}
                itemName="event"
                itemNamePlural="events"
                showItemsPerPage={true}
                showInfo={true}
                size="md"
                variant="default"
                itemsPerPageOptions={[6, 9, 12, 18]}
              />
            </div>
          )}
        </div>
      </section>

      {/* Filter Modal */}
      <FilterModal
        isOpen={!!showFilterModal}
        onClose={() => setShowFilterModal(false)}
        title="Filter Events"
        triggerRef={filterTriggerRef}
        filters={[
          { id: 'dateFrom', label: 'Published Date From', type: 'date', description: 'Filter by published_at starting from this date' },
          { id: 'dateTo', label: 'Published Date To', type: 'date', description: 'Filter by published_at up to this date' },
        ]}
        values={filters}
        onChange={setFilters}
        onApply={(v) => { setFilters(v); setShowFilterModal(false); }}
        onClear={() => setFilters({ dateFrom: '', dateTo: '' })}
      />

      {/* Sort Modal */}
      <SortModal
        isOpen={sortModal.isOpen}
        onClose={sortModal.closeModal}
        triggerRef={sortModal.triggerRef}
        title="Sort Events"
        sortFields={[
          { value: 'event_date', label: 'Event date' },
          { value: 'end_date', label: 'Deadline' },
          { value: 'published_at', label: 'Published date' },
          { value: 'title', label: 'Title' },
          { value: 'category', label: 'Category' },
        ]}
        sortBy={sortModal.sortBy}
        sortOrder={sortModal.sortOrder}
        onSortChange={sortModal.updateSort}
        onReset={sortModal.resetSort}
        defaultSortBy="event_date"
        defaultSortOrder="asc"
      />
    </PublicLayout>
  );
};

export default ProgramsThisMonth;


