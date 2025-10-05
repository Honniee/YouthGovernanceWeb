import React, { useEffect, useMemo, useRef, useState } from 'react';
import PublicLayout from '../../components/layouts/PublicLayout';
import { LoadingSpinner, FilterModal, SortModal, useSortModal, SearchBar, Pagination } from '../../components/portal_main_content';
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

const useScrollReveal = () => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setIsVisible(true); observer.disconnect(); }
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return [ref, isVisible];
};

const FeaturedPrograms = () => {
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState([]);
  const [programsTotal, setProgramsTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(9);
  const [filters, setFilters] = useState({ dateFrom: '', dateTo: '' });
  const [showFilterModal, setShowFilterModal] = useState(false);
  const filterTriggerRef = useRef(null);
  const sortModal = useSortModal('published_at', 'desc');

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

  // Helper function to convert relative URLs to full URLs
  const getFileUrl = (path) => {
    if (!path) return '';
    if (/^https?:\/\//i.test(path)) return path;
    let base = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/?api\/?$/, '');
    if (!base) {
      // sensible dev fallback if env not set
      if (window.location && /localhost|127\.0\.0\.1/.test(window.location.hostname)) {
        base = 'http://localhost:3001';
      }
    }
    return `${base}${path}`;
  };

  const getFallbackImage = (category, title) => {
    const label = (title || '').trim() || 'Featured';
    return buildSvgPlaceholder(label, '#3b82f6', '#1e40af');
  };

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  // Fetch Programs with params
  useEffect(() => {
    let isMounted = true;
    const fetch = async () => {
      try {
        setLoading(true); setError('');
        const sortBy = ['published_at', 'title', 'category'].includes(sortModal.sortBy) ? sortModal.sortBy : 'published_at';
        const res = await getAnnouncements({
          page: currentPage,
          limit: itemsPerPage,
          status: 'published',
          category: 'programs',
          search: searchTerm || undefined,
          sortBy,
          sortOrder: (sortModal.sortOrder || 'desc').toUpperCase()
        });
        if (!isMounted) return;
        const items = (res?.data || []);
        setAnnouncements(items);
        setProgramsTotal(res?.pagination?.total ?? items.length);
      } catch (e) {
        if (!isMounted) return; setError(e?.message || 'Failed to load featured programs');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetch();
    return () => { isMounted = false; };
  }, [currentPage, itemsPerPage, searchTerm, sortModal.sortBy, sortModal.sortOrder]);

  // Client-side filter for date range and client-side sort for event/end dates
  const filteredAnnouncements = useMemo(() => {
    const list = announcements.filter(a => {
      const pub = a.published_at ? new Date(a.published_at) : null;
      const fromOk = !filters.dateFrom || (pub && pub >= new Date(filters.dateFrom));
      const toOk = !filters.dateTo || (pub && pub <= new Date(filters.dateTo));
      return fromOk && toOk;
    });

    const order = (sortModal.sortOrder || 'desc').toLowerCase();
    const compareDates = (aVal, bVal) => {
      const da = aVal ? new Date(aVal) : null;
      const db = bVal ? new Date(bVal) : null;
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return order === 'asc' ? (da - db) : (db - da);
    };

    const by = sortModal.sortBy || 'published_at';
    return [...list].sort((a, b) => {
      // keep pinned/featured precedence similar to Announcements
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
      if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1;
      switch (by) {
        case 'event_date':
          return compareDates(a.event_date, b.event_date);
        case 'end_date':
          return compareDates(a.end_date, b.end_date);
        case 'title':
          return order === 'asc' ? (a.title || '').localeCompare(b.title || '') : (b.title || '').localeCompare(a.title || '');
        case 'category':
          return order === 'asc' ? (a.category || '').localeCompare(b.category || '') : (b.category || '').localeCompare(a.category || '');
        case 'published_at':
        default:
          return compareDates(a.published_at, b.published_at);
      }
    });
  }, [announcements, filters.dateFrom, filters.dateTo, sortModal.sortBy, sortModal.sortOrder]);

  const totalItems = programsTotal || filteredAnnouncements.length;

  return (
    <PublicLayout>
      <section className="relative overflow-hidden bg-gradient-to-br from-[#24345A] via-[#1a2a47] to-[#0f1a2e] text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-white to-transparent rounded-full blur-xl" />
          <div className="absolute bottom-20 right-10 w-40 h-40 bg-gradient-to-tl from-white to-transparent rounded-full blur-xl" />
          <div className="absolute top-1/2 left-1/2 w-24 h-24 bg-gradient-to-br from-white to-transparent rounded-full blur-lg" />
        </div>
        <div ref={heroRef} className={`relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 md:py-12 transition-all duration-1000 ease-out ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="mb-3 sm:mb-4 flex justify-start">
            <button
              onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/programs'))}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-white/10 text-white/90 ring-1 ring-white/20 hover:bg-white/15 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm">Back</span>
            </button>
          </div>
          <div className="text-center">
            <div className="inline-flex items-center px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-2 sm:mb-3 md:mb-4">
              <BookOpen className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1.5 sm:mr-2" />
              Programs
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4 md:mb-6">Featured Programs</h1>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-white/90 mb-1 sm:mb-2">All published announcements categorized as programs.</p>
            <p className="text-xs sm:text-sm md:text-base text-white/80">Total programs: {programsTotal.toLocaleString()}</p>
          </div>
        </div>
      </section>

      <section className="py-8 sm:py-12 lg:py-16 bg-white relative overflow-hidden">
        <div ref={listRef} className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-1000 ease-out ${listVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {/* Controls */}
          <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="flex items-center justify-center sm:justify-start gap-2 sm:gap-3 overflow-x-auto pb-2 sm:pb-0">
              <div className="flex-shrink-0">
                <SearchBar
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder="Search programs..."
                  expandOnMobile={true}
                  showIndicator={true}
                  indicatorText="Search"
                  indicatorColor="blue"
                  size="xs"
                  debounceMs={300}
                />
              </div>
              <button
                ref={filterTriggerRef}
                onClick={() => setShowFilterModal(true)}
                className={`inline-flex items-center border rounded-lg font-medium transition-all duration-200 ${
                  (filters.dateFrom || filters.dateTo) ? 'border-[#24345A] text-[#24345A] bg-[#24345A]/5' : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                } px-3 py-2.5 whitespace-nowrap flex-shrink-0 text-xs sm:text-sm`}
              >
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4h18M7 12h10M11 20h2"/></svg>
                <span className="hidden sm:inline">Filter</span>
              </button>
              <button
                ref={sortModal.triggerRef}
                onClick={sortModal.toggleModal}
                className={`inline-flex items-center border rounded-lg font-medium transition-all duration-200 ${
                  sortModal.isOpen || !sortModal.isDefaultSort ? 'border-[#24345A] text-[#24345A] bg-[#24345A]/5' : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                } px-3 py-2.5 whitespace-nowrap flex-shrink-0 text-xs sm:text-sm`}
              >
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 6h18M7 12h10M11 18h6"/></svg>
                <span className="hidden sm:inline">Sort</span>
              </button>
            </div>
          </div>
          {loading && (
            <div className="flex items-center justify-center py-12 sm:py-16">
              <LoadingSpinner variant="spinner" message="Loading featured programs..." size="sm" color="blue" height="h-24 sm:h-32" />
            </div>
          )}
          {error && !loading && (
            <div className="text-center py-12 sm:py-16">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <svg className="w-6 h-6 sm:w-8 sm:h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1 sm:mb-2">Failed to Load Featured Programs</h3>
              <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">{error}</p>
              <button onClick={() => window.location.reload()} className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs sm:text-sm">Try Again</button>
            </div>
          )}
          {!loading && !error && announcements.length === 0 && (
            <div className="text-center py-12 sm:py-16">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <Search className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
              </div>
              <p className="text-sm sm:text-base text-gray-600 mb-1 sm:mb-2">No programs available</p>
              <p className="text-xs sm:text-sm text-gray-500">Check back later for updates</p>
            </div>
          )}
          {!loading && !error && filteredAnnouncements.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
              {filteredAnnouncements.map((announcement) => (
                <div key={announcement.announcement_id} className="group relative h-full">
                  <div className="absolute -inset-1 sm:-inset-2 rounded-xl sm:rounded-2xl bg-gradient-to-br from-yellow-300/30 via-orange-200/25 to-red-300/30 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" aria-hidden="true" />
                  <div 
                    className="relative rounded-xl sm:rounded-2xl overflow-hidden shadow-sm bg-white ring-1 ring-gray-200 transition-all duration-200 group-hover:shadow-lg group-hover:-translate-y-1 h-full flex flex-col cursor-pointer"
                    onClick={() => navigate(`/programs/${announcement.announcement_id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/programs/${announcement.announcement_id}`); }}
                  >
                    <div className="relative overflow-hidden aspect-[16/9]">
                      <img
                        src={announcement.image_url ? getFileUrl(announcement.image_url) : getFallbackImage(announcement.category, announcement.title)}
                        alt={announcement.title || 'Program image'}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                        decoding="async"
                        onError={(e) => { e.currentTarget.src = getFallbackImage(announcement.category, announcement.title); }}
                      />
                      <div className="absolute top-1.5 sm:top-2 left-1.5 sm:left-2 inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-green-100 text-green-700">
                        <BookOpen className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                        Programs
                      </div>
                      {announcement.is_featured && (
                        <div className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2">
                          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center bg-yellow-400">
                            <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-yellow-800" />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="p-4 sm:p-6 flex flex-col flex-1">
                      <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 text-base sm:text-lg">{announcement.title}</h3>
                      <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500 mb-2 sm:mb-3">
                        <div className="flex items-center"><Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-1" /><span>Published: {formatDate(announcement.published_at)}</span></div>
                      </div>
                      {announcement.summary && (<p className="text-gray-600 text-xs sm:text-sm mb-3 sm:mb-4 leading-relaxed line-clamp-3 flex-1">{announcement.summary}</p>)}
                      {(announcement.event_date || announcement.location || announcement.end_date) && (
                        <div className="space-y-1 sm:space-y-2 mb-3 sm:mb-4 p-2 sm:p-3 bg-gray-50 rounded-lg">
                          {(() => {
                            const hasEvent = Boolean(announcement.event_date);
                            const hasEnd = Boolean(announcement.end_date);
                            if (hasEvent && hasEnd) return (<div className="flex items-center text-xs sm:text-sm text-gray-600"><Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 text-blue-500" /><span>Event period: {formatDate(announcement.event_date)} – {formatDate(announcement.end_date)}</span></div>);
                            if (hasEvent) return (<div className="flex items-center text-xs sm:text-sm text-gray-600"><Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 text-blue-500" /><span>Event date: {formatDate(announcement.event_date)}</span></div>);
                            if (hasEnd) return (<div className="flex items-center text-xs sm:text-sm text-red-600"><Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" /><span>Deadline: {formatDate(announcement.end_date)}</span></div>);
                            return null;
                          })()}
                          {announcement.location && (<div className="flex items-center text-xs sm:text-sm text-gray-600"><MapPin className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 text-gray-600" /><span className="truncate">{announcement.location}</span></div>)}
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-gray-100 mt-auto">
                        <div className="relative inline-flex items-center text-gray-400 group-hover:text-[#24345A] transition-colors w-24 sm:w-32">
                          <span className="absolute left-0 text-xs sm:text-sm font-medium opacity-0 transition-opacity duration-200 pointer-events-none group-hover:opacity-100">Read more</span>
                          <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 transform transition-transform duration-200 group-hover:translate-x-16 sm:group-hover:translate-x-20" />
                        </div>
                        <span className="text-[10px] sm:text-xs text-gray-500">{formatDate(announcement.published_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {/* Pagination */}
          {!loading && !error && totalItems > itemsPerPage && (
            <div className="mt-6 sm:mt-8 flex justify-center">
              <div className="w-full max-w-md sm:max-w-none">
                <Pagination
                  currentPage={currentPage}
                  totalItems={totalItems}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={setItemsPerPage}
                  itemName="program"
                  itemNamePlural="programs"
                  showItemsPerPage={true}
                  showInfo={true}
                  size="xs sm:sm"
                  variant="default"
                  itemsPerPageOptions={[6, 9, 12, 18]}
                />
              </div>
            </div>
          )}
        </div>
      </section>
      {/* Filter Modal */}
      <FilterModal
        isOpen={!!showFilterModal}
        onClose={() => setShowFilterModal(false)}
        title="Filter Programs"
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
        title="Sort Programs"
        sortFields={[
          { value: 'published_at', label: 'Published date' },
          { value: 'event_date', label: 'Event date' },
          { value: 'end_date', label: 'Deadline' },
          { value: 'title', label: 'Title' },
          { value: 'category', label: 'Category' },
        ]}
        sortBy={sortModal.sortBy}
        sortOrder={sortModal.sortOrder}
        onSortChange={sortModal.updateSort}
        onReset={sortModal.resetSort}
        defaultSortBy="published_at"
        defaultSortOrder="desc"
      />
    </PublicLayout>
  );
};

export default FeaturedPrograms;


