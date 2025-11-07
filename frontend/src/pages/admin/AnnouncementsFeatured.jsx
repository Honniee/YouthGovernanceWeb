import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HeaderMainContent, SearchBar, SortModal, useSortModal, Pagination } from '../../components/portal_main_content';
import { Calendar, User, Tag, Eye, ArrowUpDown, ChevronDown, ArrowLeft, Star, Pin } from 'lucide-react';
import { getAnnouncements } from '../../services/announcementsService';
import { useRealtime } from '../../realtime/useRealtime';

// Helpers (mirroring Announcements.jsx)
const getStatusStyles = (status) => {
  switch (status) {
    case 'published':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'archived':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'draft':
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getFallbackImage = (category, title) => {
  const key = (category || '').toString().toLowerCase();
  const label = (title || '').trim() || (category ? String(category) : 'LYDO');
  const buildSvgPlaceholder = (label, colorFrom, colorTo, title = '') => {
    const displayTitle = title && title.length > 50 ? title.substring(0, 47) + '...' : title;
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
        ${displayTitle ? `
        <text x='600' y='350' text-anchor='middle' fill='white' font-family='Arial, sans-serif' font-size='32' font-weight='bold' opacity='0.9'>
          <tspan x='600' dy='0'>${displayTitle}</tspan>
        </text>
        ` : ''}
      </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  };
  switch (key) {
    case 'programs':
      return buildSvgPlaceholder(label, '#3b82f6', '#1e40af', title);
    case 'projects':
      return buildSvgPlaceholder(label, '#10b981', '#065f46', title);
    case 'activities':
      return buildSvgPlaceholder(label, '#8b5cf6', '#4c1d95', title);
    case 'meetings':
    case 'meeting':
      return buildSvgPlaceholder(label, '#f97316', '#7c2d12', title);
    case 'announcements':
      return buildSvgPlaceholder(label, '#f59e0b', '#92400e', title);
    case 'achievement':
      return buildSvgPlaceholder(label, '#facc15', '#854d0e', title);
    default:
      return buildSvgPlaceholder(label || 'LYDO', '#64748b', '#111827', title);
  }
};

const getCategoryColor = (category) => {
  const key = (category || '').toString().toLowerCase();
  switch (key) {
    case 'programs':
      return 'bg-green-100 text-green-700';
    case 'projects':
      return 'bg-blue-100 text-blue-700';
    case 'activities':
      return 'bg-purple-100 text-purple-700';
    case 'meetings':
      return 'bg-orange-100 text-orange-700';
    case 'announcements':
      return 'bg-red-100 text-red-700';
    case 'achievement':
      return 'bg-yellow-100 text-yellow-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

const getCategoryIcon = (category) => {
  const key = (category || '').toString().toLowerCase();
  switch (key) {
    case 'programs':
      return Tag;
    case 'projects':
      return Tag;
    case 'activities':
      return Tag;
    case 'meetings':
      return User;
    case 'announcements':
      return Tag;
    case 'achievement':
      return Tag;
    default:
      return Tag;
  }
};

const getFileUrl = (path) => {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  let base = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/?api\/?$/, '');
  if (!base) {
    if (window.location && /localhost|127\.0\.0\.1/.test(window.location.hostname)) {
      base = 'http://localhost:3001';
    }
  }
  return `${base}${path}`;
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const AnnouncementsFeatured = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  // Pagination (server-backed)
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(9);
  const [totalItems, setTotalItems] = useState(0);

  const loadFeatured = async (opts = { silent: false }) => {
    const { silent } = opts || { silent: false };
    try {
      if (!silent) { setLoading(true); setError(null); }
      const params = {
        page: currentPage,
        limit: itemsPerPage,
        is_featured: true,
        search: searchQuery || undefined,
        sortBy: sortBy === 'publishAt' ? 'published_at' : sortBy,
        sortOrder: (sortOrder || 'desc').toUpperCase()
      };
      const res = await getAnnouncements(params);
      setItems(res.data || []);
      setTotalItems(res.pagination?.total || (res.data?.length || 0));
    } catch (e) {
      if (!silent) setError(e.message || 'Failed to load featured events');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Fetch featured announcements from API
  useEffect(() => { loadFeatured({ silent: false }); }, [currentPage, itemsPerPage, searchQuery, sortBy, sortOrder]);

  // Realtime: silently refresh
  useRealtime('announcement:changed', () => { loadFeatured({ silent: true }); });

  const hasActiveFilters = false; // author/tag filters removed (not supported by API currently)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <HeaderMainContent
        title="Featured Events"
        description="Highlighted events curated by LYDO."
        leading={(
          <button
            onClick={() => navigate('/admin/announcements')}
            aria-label="Back"
            className="inline-flex items-center p-1 text-gray-700 text-base sm:text-sm sm:px-3 sm:py-2 sm:border sm:border-gray-300 sm:rounded-lg hover:bg-transparent sm:hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5 sm:mr-2" />
            <span className="hidden sm:inline">Back</span>
          </button>
        )}
      />

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
              // views not supported from API currently
            ]}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSortChange={(by, order) => { setSortBy(by); setSortOrder(order); setCurrentPage(1); }}
            onReset={() => { setSortBy('publishAt'); setSortOrder('desc'); setCurrentPage(1); }}
            defaultSortBy="publishAt"
            defaultSortOrder="desc"
          />
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6">
          {loading ? (
            <div className="text-center py-16 text-gray-600">Loading featured events...</div>
          ) : error ? (
            <div className="text-center py-16 text-red-600">{error}</div>
          ) : items.length === 0 ? (
            <div className="text-center py-16 text-gray-600">No featured events found</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
              {items.map(a => {
                const isPinned = a.is_pinned;
                const isFeatured = a.is_featured;
                const categoryInfo = {
                  color: getCategoryColor(a.category || 'announcements'),
                  Icon: getCategoryIcon(a.category || 'announcements')
                };
                const id = a.announcement_id || a.id;
                return (
                  <div key={id} className="group relative h-full">
                    {isFeatured && (
                      <div className="absolute -inset-2 rounded-2xl bg-gradient-to-br from-yellow-300/30 via-orange-200/25 to-red-300/30 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" aria-hidden="true" />
                    )}
                    <div
                      className={`relative rounded-2xl overflow-hidden shadow-sm transition-all duration-200 group-hover:shadow-lg h-full flex flex-col cursor-pointer ${
                        isPinned ? 'bg-white ring-2 ring-red-200' : 'bg-white ring-1 ring-gray-200'
                      }`}
                      onClick={() => navigate(`/admin/announcements/${id}`)}
                    >
                      <div className="relative overflow-hidden flex-shrink-0 aspect-[16/9]">
                        <img
                          src={a.image_url ? getFileUrl(a.image_url) : getFallbackImage(a.category || 'announcements', a.title)}
                          alt={a.title || 'Announcement image'}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                          decoding="async"
                          onError={(e) => { e.currentTarget.src = getFallbackImage(a.category || 'announcements', a.title); }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />

                        {/* Category Badge - Bottom Left */}
                        <div className="absolute bottom-2 left-2">
                          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${categoryInfo.color} bg-white/90 backdrop-blur-sm shadow-sm border border-white/20`}>
                            <categoryInfo.Icon className="w-3 h-3 mr-1" />
                            <span className="hidden sm:inline">{(a.category || 'Announcement').charAt(0).toUpperCase() + (a.category || 'Announcement').slice(1)}</span>
                          </div>
                        </div>

                        {/* Featured/Pinned Badges - Bottom Right */}
                        {(isFeatured || isPinned) && (
                          <div className="absolute bottom-2 right-2 flex items-center space-x-1">
                            {isFeatured && (
                              <div className="w-6 h-6 rounded-full flex items-center justify-center shadow-sm border border-white/20 bg-yellow-400/90 backdrop-blur-sm">
                                <Star className="w-3 h-3 text-yellow-800" />
                              </div>
                            )}
                            {isPinned && (
                              <div className="w-6 h-6 rounded-full flex items-center justify-center shadow-sm border border-white/20 bg-red-500/90 backdrop-blur-sm">
                                <Pin className="w-3 h-3 text-white" />
                              </div>
                            )}
                    </div>
                        )}
                    </div>

                      {/* Content */}
                      <div className="flex flex-col flex-1 p-6">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-gray-900 line-clamp-2 text-lg flex-1">{a.title}</h3>
                          {a.status && (
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusStyles(a.status)}`}>
                              {String(a.status).charAt(0).toUpperCase() + String(a.status).slice(1)}
                            </span>
                          )}
                    </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            <span>Published: {formatDate(a.published_at || a.publishAt)}</span>
                      </div>
                    </div>

                        {/* Description */}
                        <p className="text-gray-600 text-sm mb-4 leading-relaxed line-clamp-3 flex-1">{a.summary}</p>

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-auto">
                          <div className="relative inline-flex items-center text-gray-400 group-hover:text-blue-600 transition-colors w-32">
                            <span className="absolute left-0 text-sm font-medium opacity-0 transition-opacity duration-200 pointer-events-none group-hover:opacity-100">Read more</span>
                            <Eye className="w-4 h-4" />
                  </div>
                          <div className="text-xs text-gray-500">Updated: {formatDate(a.updated_at)}</div>
                    </div>
                  </div>
                </div>
                  </div>
                );
              })}
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
