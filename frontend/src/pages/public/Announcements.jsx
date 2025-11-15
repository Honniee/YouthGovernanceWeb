import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { 
  Calendar, 
  Users, 
  Clock, 
  Award, 
  RefreshCw, 
  BarChart3, 
  List,
  Search,
  Pin,
  Star,
  Download,
  Eye,
  ArrowRight,
  Filter,
  X,
  Briefcase,
  Megaphone,
  ChevronLeft,
  ChevronDown,
  SortAsc,
  SortDesc,
  Activity,
  UserCheck,
  FileText,
  FolderOpen,
  BookOpen,
  ArrowUpDown,
  MapPin
} from 'lucide-react';
import { FilterModal, SortModal, useSortModal, SearchBar, Pagination } from '../../components/portal_main_content';
import PublicLayout from '../../components/layouts/PublicLayout';
import PageHero from '../../components/website/PageHero';
import heroVideo from '../../assets/media/hero.mp4';
import { getAnnouncements } from '../../services/announcementsService';
import { useRealtime } from '../../realtime/useRealtime';
import DOMPurify from 'dompurify';

// Scroll reveal hook
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

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return [ref, isVisible];
};

const Announcements = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Scroll reveal refs
  const [featuredRef, featuredVisible] = useScrollReveal();
  const [announcementsRef, announcementsVisible] = useScrollReveal();
  const [filterRef, filterVisible] = useScrollReveal();

  // State for filtering, search, and pagination
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(9);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState({ category: '', status: '', dateFrom: '', dateTo: '' });
  const filterTriggerRef = React.useRef(null);
  const sortModal = useSortModal('published_at', 'desc');
  // Category-based fallback images (SVG data URIs) to avoid external image failures
  const buildSvgPlaceholder = (_label, colorFrom, colorTo) => {
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
      </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  };

  // Fallback image for main content (with title)
  const buildSvgPlaceholderWithTitle = (label, colorFrom, colorTo) => {
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

  // Fallback image for recent section (without title)
  const getRecentFallbackImage = (category) => {
    const key = (category || '').toString().toLowerCase();
    switch (key) {
      case 'programs':
        return buildSvgPlaceholder('', '#3b82f6', '#1e40af');
      case 'projects':
        return buildSvgPlaceholder('', '#10b981', '#065f46');
      case 'activities':
        return buildSvgPlaceholder('', '#8b5cf6', '#4c1d95');
      case 'meetings':
      case 'meeting':
        return buildSvgPlaceholder('', '#f97316', '#7c2d12');
      case 'announcements':
        return buildSvgPlaceholder('', '#f59e0b', '#92400e');
      case 'achievement':
        return buildSvgPlaceholder('', '#facc15', '#854d0e');
      default:
        return buildSvgPlaceholder('', '#64748b', '#111827');
    }
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

  // Fallback image for main content (with title)
  const getFallbackImage = (category, title) => {
    const key = (category || '').toString().toLowerCase();
    const label = (title || '').trim() || (category ? String(category) : 'LYDO');
    switch (key) {
      case 'programs':
        return buildSvgPlaceholderWithTitle(label, '#3b82f6', '#1e40af');
      case 'projects':
        return buildSvgPlaceholderWithTitle(label, '#10b981', '#065f46');
      case 'activities':
        return buildSvgPlaceholderWithTitle(label, '#8b5cf6', '#4c1d95');
      case 'meetings':
      case 'meeting':
        return buildSvgPlaceholderWithTitle(label, '#f97316', '#7c2d12');
      case 'announcements':
        return buildSvgPlaceholderWithTitle(label, '#f59e0b', '#92400e');
      case 'achievement':
        return buildSvgPlaceholderWithTitle(label, '#facc15', '#854d0e');
      default:
        return buildSvgPlaceholderWithTitle(label || 'LYDO', '#64748b', '#111827');
    }
  };

  // Route-aware presets: /programs/this-month and /programs/featured
  useEffect(() => {
    const path = location.pathname;
    if (path.endsWith('/this-month')) {
      // Auto-filter: Programs only, event/end date within current month
      setSelectedCategory('programs');
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      // We use published_at in modal, but for UX here set label and sort by event_date
      setFilters(prev => ({ ...prev, dateFrom: start.toISOString().slice(0,10), dateTo: end.toISOString().slice(0,10) }));
      sortModal.updateSort('event_date', 'asc');
    } else if (path.endsWith('/featured')) {
      // Featured programs: category programs, client-side filter to featured only
      setSelectedCategory('programs');
      sortModal.updateSort('published_at', 'desc');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);


  // New category configuration
  const categories = [
    { key: 'all', label: 'All Content', icon: List, color: 'bg-gray-100 text-gray-700', count: 0 },
    { key: 'projects', label: 'Projects', icon: FolderOpen, color: 'bg-blue-100 text-blue-700', count: 0 },
    { key: 'programs', label: 'Programs', icon: BookOpen, color: 'bg-green-100 text-green-700', count: 0 },
    { key: 'activities', label: 'Activities', icon: Activity, color: 'bg-purple-100 text-purple-700', count: 0 },
    { key: 'meetings', label: 'Meetings', icon: UserCheck, color: 'bg-orange-100 text-orange-700', count: 0 },
    { key: 'achievement', label: 'Achievement', icon: Award, color: 'bg-yellow-100 text-yellow-700', count: 0 },
    { key: 'announcements', label: 'Announcements', icon: Megaphone, color: 'bg-red-100 text-red-700', count: 0 }
  ];

  // Sort options
  const sortOptions = [
    { key: 'newest', label: 'Newest First', icon: SortDesc },
    { key: 'oldest', label: 'Oldest First', icon: SortAsc },
    { key: 'title', label: 'Title A-Z', icon: SortAsc },
    { key: 'category', label: 'Category', icon: SortAsc }
  ];

  // API-driven announcements state
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 9, total: 0, pages: 0 });
  const [reloadKey, setReloadKey] = useState(0);
  // Featured state (copied from Home style, simplified to grid)
  const [featured, setFeatured] = useState([]);
  const [featuredLoading, setFeaturedLoading] = useState(false);
  const [featuredError, setFeaturedError] = useState('');
  const [currentFeatured, setCurrentFeatured] = useState(0);
  const [featuredReloadKey, setFeaturedReloadKey] = useState(0);
  const gradientOptions = [
    'from-blue-600 via-purple-600 to-blue-800',
    'from-emerald-600 via-teal-600 to-green-700',
    'from-orange-600 via-red-600 to-pink-700',
    'from-purple-600 via-indigo-600 to-blue-700',
    'from-teal-600 via-cyan-600 to-blue-700',
    'from-rose-600 via-pink-600 to-purple-700',
    'from-amber-600 via-orange-600 to-red-700',
    'from-indigo-600 via-blue-600 to-purple-700'
  ];
  const featuredCards = featured.map((a, index) => ({
    id: a.announcement_id || a.id,
    title: a.title,
    description: a.summary || (a.content ? a.content.substring(0, 200) + '…' : ''),
    image: a.image_url,
    date: a.published_at ? new Date(a.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'TBA',
    location: a.location || 'San Jose, Batangas',
    link: `/programs/${(a.announcement_id || a.id)}`,
    gradient: gradientOptions[index % gradientOptions.length],
    category: a.category
  }));
  const getVisibleCards = () => {
    if (featuredCards.length === 0) return [];
    const prevIndex = currentFeatured === 0 ? featuredCards.length - 1 : currentFeatured - 1;
    const nextIndex = currentFeatured === featuredCards.length - 1 ? 0 : currentFeatured + 1;
    return [
      { ...featuredCards[prevIndex], position: 'prev', index: prevIndex },
      { ...featuredCards[currentFeatured], position: 'current', index: currentFeatured },
      { ...featuredCards[nextIndex], position: 'next', index: nextIndex },
    ];
  };
  const visibleFeatured = getVisibleCards();
  const navigateToCard = (index) => setCurrentFeatured(index);

  // Map UI categories to backend categories if needed (keep same keys when matching)
  const apiCategory = useMemo(() => (selectedCategory === 'all' ? '' : selectedCategory), [selectedCategory]);

  // Map sort fields to backend fields
  const apiSortBy = useMemo(() => {
    switch (sortModal.sortBy) {
      case 'published_at':
        return 'published_at';
      case 'title':
        return 'title';
      case 'category':
        return 'category';
      case 'event_date':
      case 'end_date':
        // Backend does not sort by these; we will sort client-side
        return 'published_at';
      default:
        return 'published_at';
    }
  }, [sortModal.sortBy]);

  const apiSortOrder = useMemo(() => {
    return sortModal.sortOrder || 'desc';
  }, [sortModal.sortOrder]);

  // Fetch recent updates for the hero-adjacent section (full and silent)
  const loadRecent = async (opts = { silent: false }) => {
    const { silent } = opts || { silent: false };
    let mounted = true;
    try {
      if (!silent) { setFeaturedLoading(true); setFeaturedError(''); }
      const res = await getAnnouncements({ limit: 5, status: 'published', sortBy: 'published_at', sortOrder: 'DESC' });
      if (!mounted) return;
      if (res?.data) {
        setFeatured(res.data || []);
      } else {
        setFeatured([]);
        if (!silent) setFeaturedError('Failed to load recent updates');
      }
    } catch (e) {
      if (!mounted) return;
      setFeatured([]);
      if (!silent) setFeaturedError(e?.message || 'Failed to load recent updates');
    } finally {
      if (!silent) setFeaturedLoading(false);
    }
    return () => { mounted = false; };
  };

  useEffect(() => { loadRecent({ silent: false }); }, [featuredReloadKey]);

  // Realtime: silent refresh lists on announcement events (no loading flash)
  const silentRefresh = () => { fetchData({ silent: true }); loadRecent({ silent: true }); };
  useRealtime('announcement:created', silentRefresh);
  useRealtime('announcement:updated', silentRefresh);
  useRealtime('announcement:deleted', silentRefresh);
  useRealtime('announcement:statusChanged', silentRefresh);
  useRealtime('announcement:changed', silentRefresh);

  // Fetch announcements from API (full and silent)
  const fetchData = async (opts = { silent: false }) => {
    const { silent } = opts || { silent: false };
    let isMounted = true;
    try {
      if (!silent) { setLoading(true); setError(''); }
      const result = await getAnnouncements({
        page: currentPage,
        limit: itemsPerPage,
        status: 'published',
        category: apiCategory || undefined,
        search: searchTerm || undefined,
        sortBy: apiSortBy,
        sortOrder: apiSortOrder.toUpperCase(),
      });
      if (!isMounted) return;
      if (result?.data) {
        setAnnouncements(result.data || []);
        setPagination(result.pagination || { page: currentPage, limit: itemsPerPage, total: 0, pages: 0 });
      } else {
        setAnnouncements([]);
        setPagination({ page: currentPage, limit: itemsPerPage, total: 0, pages: 0 });
        if (!silent) setError('Failed to load announcements');
      }
    } catch (e) {
      if (!isMounted) return;
      setAnnouncements([]);
      setPagination({ page: currentPage, limit: itemsPerPage, total: 0, pages: 0 });
      if (!silent) setError(e?.message || 'Failed to load announcements');
    } finally {
      if (!silent) setLoading(false);
    }
    return () => { isMounted = false; };
  };

  useEffect(() => { fetchData({ silent: false }); }, [currentPage, itemsPerPage, apiCategory, searchTerm, apiSortBy, apiSortOrder, reloadKey]);

  // Sync local sort state with sort modal hook
  useEffect(() => {
    // Update category filter when selectedCategory changes
    setFilters(prev => ({ ...prev, category: selectedCategory === 'all' ? '' : selectedCategory }));
  }, [selectedCategory]);

  // Check if any filters are active (ignore tab-driven category)
  const hasActiveFilters = Boolean(filters.dateFrom || filters.dateTo);

  // Filter + client-side sort (handles event_date and end_date specifically), preserve pinned/featured precedence
  // NOTE: Date filter uses published_at so users know exactly which date is considered
  const filteredAnnouncements = useMemo(() => {
    const list = announcements.filter(announcement => {
      const pub = announcement.published_at ? new Date(announcement.published_at) : null;
      const matchesDateFrom = !filters.dateFrom || (pub && pub >= new Date(filters.dateFrom));
      const matchesDateTo = !filters.dateTo || (pub && pub <= new Date(filters.dateTo));
      const baseMatch = matchesDateFrom && matchesDateTo;
      // If on /programs/featured, only include featured
      const isFeaturedRoute = location.pathname.endsWith('/featured');
      const featuredMatch = isFeaturedRoute ? Boolean(announcement.is_featured) : true;
      // If on /programs/this-month, additionally prefer items with event_date/end_date in current month when available
      const isThisMonthRoute = location.pathname.endsWith('/this-month');
      if (!isThisMonthRoute) return baseMatch && featuredMatch;
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const eventDate = announcement.event_date ? new Date(announcement.event_date) : null;
      const deadlineDate = announcement.end_date ? new Date(announcement.end_date) : null;
      const inMonth = (eventDate && eventDate >= start && eventDate <= end) || (deadlineDate && deadlineDate >= start && deadlineDate <= end);
      // If no event/end dates, fall back to baseMatch
      return baseMatch && featuredMatch && (inMonth || (!eventDate && !deadlineDate));
    });

    const compareDates = (aVal, bVal, order) => {
      const aDate = aVal ? new Date(aVal) : null;
      const bDate = bVal ? new Date(bVal) : null;
      if (!aDate && !bDate) return 0;
      if (!aDate) return 1; // nulls last
      if (!bDate) return -1;
      return order === 'asc' ? aDate - bDate : bDate - aDate;
    };

    const order = (sortModal.sortOrder || 'desc').toLowerCase();
    const by = sortModal.sortBy || 'published_at';

    // Stable sort with pinned/featured precedence
    return [...list].sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
      if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1;

      switch (by) {
        case 'published_at':
          return compareDates(a.published_at, b.published_at, order);
        case 'event_date':
          return compareDates(a.event_date, b.event_date, order);
        case 'end_date':
          return compareDates(a.end_date, b.end_date, order);
        case 'title':
          return order === 'asc'
            ? (a.title || '').localeCompare(b.title || '')
            : (b.title || '').localeCompare(a.title || '');
        case 'category':
          return order === 'asc'
            ? (a.category || '').localeCompare(b.category || '')
            : (b.category || '').localeCompare(a.category || '');
        default:
          return 0;
      }
    });
  }, [announcements, filters.dateFrom, filters.dateTo, sortModal.sortBy, sortModal.sortOrder]);

  // Pagination logic
  const totalItems = pagination.total || filteredAnnouncements.length;
  const totalPages = pagination.pages || Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedAnnouncements = filteredAnnouncements; // already paged by API

  // Update category counts
  const updateCategoryCounts = () => {
    categories.forEach(category => {
      if (category.key === 'all') {
        category.count = announcements.length;
      } else {
        category.count = announcements.filter(a => a.category === category.key).length;
      }
    });
  };

  // Update counts when component mounts or data changes
  useEffect(() => {
    updateCategoryCounts();
  }, [announcements]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, searchTerm, sortModal.sortBy, sortModal.sortOrder]);

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Get category info mapped to { label, color, Icon }
  const getCategoryInfo = (categoryKey) => {
    const found = categories.find(cat => cat.key === categoryKey) || categories[0];
    return { label: found.label, color: found.color, Icon: found.icon };
  };

  return (
    <PublicLayout>
      {/* SECURITY: Sanitized with DOMPurify */}
      <style dangerouslySetInnerHTML={{
        __html: DOMPurify.sanitize(`
          .search-button-wrapper .md\\:hidden button {
            padding: 0.75rem !important;
            min-width: auto !important;
            width: auto !important;
            height: auto !important;
          }
        `)
      }} />
      <PageHero
        badge="Announcements"
        title="Announcements & Programs"
        subtitle=""
        description="Browse through our comprehensive collection of programs, projects, activities, and important announcements."
      />

      {/* Featured Programs & Announcements - AWS Style Grid */}
      <section className="pt-8 pb-16 md:py-16 bg-white relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-[#24345A] to-transparent rounded-full blur-xl" />
          <div className="absolute bottom-20 right-10 w-40 h-40 bg-gradient-to-tl from-[#24345A] to-transparent rounded-full blur-xl" />
          <div className="absolute top-1/2 left-1/2 w-24 h-24 bg-gradient-to-br from-[#E7EBFF] to-transparent rounded-full blur-lg" />
        </div>
        <div 
          ref={featuredRef}
          className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-1000 ease-out ${
            featuredVisible 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-8'
          }`}
        >
          {/* Section header */}
          <div className="mb-8 sm:mb-10 lg:mb-12">
            <div className="inline-flex items-center px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-[#E7EBFF] text-[#24345A] text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-2 sm:mb-3 lg:mb-4">Recent</div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2 sm:mb-3 lg:mb-4">Recent Updates</h2>
            <p className="text-sm sm:text-base lg:text-lg text-gray-600 max-w-3xl">The latest five items across programs, projects, activities, and announcements.</p>
          </div>

          {/* Loading State */}
          {featuredLoading && (
            <div className="relative">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 items-center">
                {/* Left placeholder */}
                <div className="col-span-2 hidden lg:block">
                  <div className="relative rounded-xl sm:rounded-2xl overflow-hidden bg-white ring-1 ring-gray-200 shadow-sm">
                    <div className="h-64 sm:h-72 md:h-80 lg:h-[22rem] bg-gray-100">
                      <div className="w-full h-full bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 animate-[shimmer_1.5s_infinite] bg-[length:200%_100%]" />
              </div>
                  </div>
                </div>
                {/* Center placeholder */}
                <div className="col-span-12 lg:col-span-8">
                  <div className="relative rounded-xl sm:rounded-2xl overflow-hidden bg-white ring-1 ring-gray-200 shadow-sm">
                    <div className="h-80 sm:h-96 md:h-[28rem] bg-gray-100">
                      <div className="w-full h-full bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 animate-[shimmer_1.5s_infinite] bg-[length:200%_100%]" />
                    </div>
                  </div>
                </div>
                {/* Right placeholder */}
                <div className="col-span-2 hidden lg:block">
                  <div className="relative rounded-xl sm:rounded-2xl overflow-hidden bg-white ring-1 ring-gray-200 shadow-sm">
                    <div className="h-64 sm:h-72 md:h-80 lg:h-[22rem] bg-gray-100">
                      <div className="w-full h-full bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 animate-[shimmer_1.5s_infinite] bg-[length:200%_100%]" />
                    </div>
                  </div>
                </div>
              </div>
              {/* Temporary keyframes for shimmer - SECURITY: Sanitized with DOMPurify */}
              <style dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(`@keyframes shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }`) }} />
            </div>
          )}

          {/* Error State */}
          {featuredError && !featuredLoading && (
            <div className="flex items-center justify-center py-12 sm:py-16">
              <div className="text-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 sm:w-8 sm:h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-red-600 mb-2 text-sm sm:text-base">Failed to load featured content</p>
                <p className="text-gray-500 text-xs sm:text-sm mb-4">Please try again</p>
                <button
                  onClick={() => setFeaturedReloadKey((k) => k + 1)}
                  className="inline-flex items-center px-3 py-2 sm:px-4 sm:py-2 bg-blue-600 text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {/* Featured Content - Only show if we have data and not loading */}
          {!featuredLoading && !featuredError && featuredCards.length > 0 && (
            <>
              {/* AWS-Style Multi-Card Layout */}
              <div className="relative">
                <div className="grid grid-cols-12 gap-4 items-center">
                  {visibleFeatured.map((card, gridIndex) => {
                    const isActive = card.position === 'current';
                    const isClickable = !isActive;
                    
                    return (
                      <div 
                        key={`${card.id}-${gridIndex}`}
                        className={`transition-all duration-700 ease-out col-span-12 ${
                          card.position === 'current' 
                            ? 'md:col-span-8' 
                            : 'md:col-span-2 hidden md:block'
                        }`}
                      >
                        <div 
                          className={`group relative rounded-2xl transition-all duration-700 ease-in-out ${
                            isActive 
                              ? 'bg-white ring-2 ring-gray-200 shadow-2xl transform scale-100' 
                              : 'bg-white ring-1 ring-gray-200 shadow-lg transform scale-95 opacity-90 hover:opacity-100 hover:shadow-xl hover:-translate-y-1 cursor-pointer'
                          }`}
                          onClick={() => { if (isActive) { navigate(card.link); } else { navigateToCard(card.index); } }}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (isActive) { navigate(card.link); } else { navigateToCard(card.index); } } }}
                        >
                          {isActive && (
                            <div className="absolute -inset-2 rounded-2xl bg-gradient-to-br from-indigo-400/60 via-fuchsia-400/50 to-cyan-400/60 opacity-60 blur-2xl transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" aria-hidden="true" />
                          )}
                          <div className={`relative rounded-2xl overflow-hidden transition-[height] duration-500 ease-in-out ${isActive ? 'h-[22rem] sm:h-[24rem] md:h-[28rem]' : 'h-64 sm:h-72 md:h-80 lg:h-[22rem]'}`}>
                            {/* Background Image (Announcements-style with object-cover) */}
                            <img
                              src={card.image ? getFileUrl(card.image) : getRecentFallbackImage(card.category)}
                              alt={card.title}
                              className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              loading="lazy"
                              decoding="async"
                              onError={(e) => { e.currentTarget.src = getRecentFallbackImage(card.category); }}
                            />
                            {/* Gradient overlay */}
                            <div className={`absolute inset-0 bg-gradient-to-r ${card.gradient} opacity-80`} />
                            {/* Top vignette similar to announcements */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                            
                            {/* Read more CTA - bottom-left absolute */}
                            {isActive && (
                              <div className="absolute left-3 bottom-5 md:bottom-7 flex items-center z-20">
                                <Link
                                  to={card.link}
                                  aria-label="Read more"
                                  className="group inline-flex items-center text-white/95 hover:text-white transition-colors duration-200 font-semibold tracking-wide drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]"
                                >
                                  <span className="relative inline-flex items-center w-32 transition-all duration-200 group-hover:pl-2">
                                    <span className="absolute left-0 text-sm md:text-base font-semibold opacity-0 transition-opacity duration-200 pointer-events-none group-hover:opacity-100">Read more</span>
                                    <ArrowRight className="w-5 h-5 transform transition-transform duration-200 group-hover:translate-x-20" />
                                  </span>
                                </Link>
                              </div>
                            )}
                            {/* Category pill - top-left (Announcements style) */}
                            {(() => { const { label, color, Icon } = getCategoryInfo(card.category); return (
                              <div className="absolute top-1.5 sm:top-2 left-1.5 sm:left-2 z-20">
                                <div className={`inline-flex items-center px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold ${color}`}>
                                  <Icon className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                                  <span>{label}</span>
                                </div>
                              </div>
                            ); })()}
                            
                            {/* Decorative Elements - only for active card */}
                            {isActive && (
                              <div className="absolute inset-0 opacity-20">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-16 translate-x-16 blur-2xl" />
                                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-12 -translate-x-12 blur-xl" />
                                <div className="absolute top-1/2 left-1/2 w-40 h-40 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
                              </div>
                            )}

                            {/* Content */}
                            <div className={`relative z-10 h-full flex flex-col transition-all duration-500 ease-in-out ${
                              isActive ? 'justify-center p-8 md:p-12' : 'justify-end p-6'
                            }`}>
                              {/* Type Badge moved to top-left */}
                              
                              {/* Title */}
                              <h3 className={`font-bold text-white leading-tight transition-all duration-500 break-words ${
                                isActive 
                                  ? 'text-2xl md:text-3xl lg:text-3xl mb-3 drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]' 
                                  : 'text-base md:text-lg lg:text-lg mb-2 drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]'
                              }`}>
                                {card.title}
                              </h3>
                              
                              {/* Description - only for active card */}
                              {isActive && (
                                <p className="text-white/90 text-sm md:text-base leading-relaxed mb-6 max-w-2xl drop-shadow-[0_1px_1px_rgba(0,0,0,0.30)]">
                                  {card.description}
                                </p>
                              )}
                              
                              {/* Meta Info */}
                              <div className={`${isActive ? 'flex flex-col items-start gap-2 text-white/80 mb-8' : 'flex flex-wrap gap-3 text-white/80 mb-0'}`}>
                                <div className="flex items-center gap-2">
                                  <Calendar className={`${isActive ? 'w-5 h-5' : 'w-3 h-3'}`} />
                                  <span className={`font-medium ${isActive ? 'text-sm' : 'text-xs'}`}>
                                    {card.date}
                                  </span>
                                </div>
                                {isActive && (
                                  <div className="flex items-center gap-2">
                                    <MapPin className="w-5 h-5" />
                                    <span className="text-sm font-medium">{card.location}</span>
                                  </div>
                                )}
                              </div>

                              {/* CTA moved to bottom-left absolute */}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Navigation Controls */}
                <div className="flex justify-center mt-6 sm:mt-8">
                  <div className="flex items-center bg-gray-900/90 text-white rounded-full shadow-lg px-3 py-1.5 sm:px-4 sm:py-2 gap-2 sm:gap-3">
                    <button
                      onClick={() => {
                        const newIndex = currentFeatured === 0 ? featuredCards.length - 1 : currentFeatured - 1;
                        navigateToCard(newIndex);
                      }}
                      className="p-1.5 sm:p-2 hover:bg-white/10 rounded-full transition-colors"
                      aria-label="Previous"
                    >
                      <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 rotate-180" />
                    </button>
                    <div className="text-xs sm:text-sm font-semibold tracking-wide">
                      {currentFeatured + 1} / {featuredCards.length}
                    </div>
                    <button
                      onClick={() => {
                        const newIndex = (currentFeatured + 1) % featuredCards.length;
                        navigateToCard(newIndex);
                      }}
                      className="p-1.5 sm:p-2 hover:bg-white/10 rounded-full transition-colors"
                      aria-label="Next"
                    >
                      <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* No Content State */}
          {!featuredLoading && !featuredError && featuredCards.length === 0 && (
            <div className="flex items-center justify-center py-12 sm:py-16">
              <div className="text-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
                </div>
                <p className="text-gray-600 mb-2 text-sm sm:text-base">No featured content available</p>
                <p className="text-gray-500 text-xs sm:text-sm">Check back later for updates</p>
              </div>
            </div>
          )}
        </div>
      </section>
     

      {/* Main Content */}
      <section className="py-8 md:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Category Tabs */}
          <div className="mb-6 md:mb-8">
            <div className="flex justify-center">
              {/* Segmented control with sliding active pill */}
              <div className="relative inline-grid grid-cols-7 items-center rounded-full bg-gray-100 ring-1 ring-gray-300 p-2 sm:p-3 shadow-sm overflow-hidden">
                {/* Active slider */}
                <div
                  className="absolute inset-y-1 rounded-full bg-gradient-to-r from-rose-200 via-purple-200 to-indigo-200 shadow-md ring-1 ring-gray-200 transition-all duration-300 ease-out pointer-events-none"
                  style={{
                    width: `${100 / categories.length}%`,
                    left: `${(categories.findIndex(cat => cat.key === selectedCategory)) * (100 / categories.length)}%`,
                  }}
                />
                {categories.map((category) => (
                  <button
                    key={category.key}
                    type="button"
                    onClick={() => setSelectedCategory(category.key)}
                    className={`relative z-10 px-3 py-2.5 sm:px-4 sm:py-3 text-sm sm:text-base rounded-full transition-colors duration-300 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#24345A]/30 ${
                      selectedCategory === category.key ? 'text-[#24345A]' : 'text-gray-700 hover:text-[#24345A] hover:bg-white/40'
                    }`}
                  >
                    <div className="flex items-center justify-center">
                      <category.icon className="w-4 h-4 sm:w-5 sm:h-5 sm:mr-2" />
                      <span className="hidden sm:inline">{category.label}</span>
                      {category.count > 0 && (
                        <span className={`hidden sm:block ml-2 px-2 py-0.5 rounded-full text-sm font-bold ${
                          selectedCategory === category.key
                            ? 'bg-[#24345A] text-white'
                            : 'bg-gray-200 text-gray-600'
                        }`}>
                          {category.count}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Search and Controls */}
          <div className="mb-6">
            {/* Left/Right Layout with Single Row */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              {/* Left Controls */}
              <div className="flex items-center justify-center sm:justify-start gap-2 sm:gap-3 overflow-x-auto pb-2 md:pb-0 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                <div className="flex items-center space-x-2 sm:space-x-3 min-w-max">
                  {/* Search Bar */}
                  <div className="flex-shrink-0">
                    <div className="search-button-wrapper">
                      <SearchBar
                        value={searchTerm}
                        onChange={setSearchTerm}
                        placeholder="Search announcements..."
                        expandOnMobile={true}
                        showIndicator={true}
                        indicatorText="Search"
                        indicatorColor="blue"
                        size="xs"
                        debounceMs={300}
                      />
                    </div>
                  </div>

                  {/* Filter Button */}
                  <button
                    ref={filterTriggerRef}
                    onClick={() => setShowFilterModal(true)}
                    className={`inline-flex items-center border rounded-lg font-medium transition-all duration-200 ${
                      showFilterModal || hasActiveFilters ? 'border-[#24345A] text-[#24345A] bg-[#24345A]/5' : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                    } px-4 py-3 whitespace-nowrap flex-shrink-0 text-sm`}
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Filter</span>
                    <ChevronDown className="w-4 h-4 ml-1" />
                    {hasActiveFilters && (
                      <div className="ml-2 px-1.5 py-0.5 bg-[#24345A]/10 text-[#24345A] text-xs font-medium rounded-full border border-[#24345A]/20">
                        {[filters.dateFrom, filters.dateTo].filter(Boolean).length}
                      </div>
                    )}
                  </button>

                  {/* Sort Button */}
                  <button
                    ref={sortModal.triggerRef}
                    onClick={sortModal.toggleModal}
                    className={`inline-flex items-center border rounded-lg font-medium transition-all duration-200 ${
                      sortModal.isOpen || !sortModal.isDefaultSort ? 'border-[#24345A] text-[#24345A] bg-[#24345A]/5' : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                    } px-4 py-3 whitespace-nowrap flex-shrink-0 text-sm`}
                  >
                    <ArrowUpDown className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Sort</span>
                    <ChevronDown className="w-4 h-4 ml-1" />
                    {!sortModal.isDefaultSort && (
                      <div className="ml-2 px-1.5 py-0.5 bg-[#24345A]/10 text-[#24345A] text-xs font-medium rounded-full border border-[#24345A]/20">
                        {sortModal.sortOrder === 'asc' ? '↑' : '↓'}
                      </div>
                    )}
                  </button>
                </div>
              </div>

            </div>
          </div>


          {/* Results Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-1 h-6 sm:h-8 bg-gray-300 rounded-full"></div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
                    {selectedCategory === 'all' ? 'All Content' : categories.find(c => c.key === selectedCategory)?.label}
                  </h2>
                  <div className="text-xs sm:text-sm text-gray-600 mb-1">
                    Showing {startIndex + 1}-{Math.min(endIndex, totalItems)} of {totalItems}
                    {searchTerm && ` for "${searchTerm}"`}
                  </div>
                  {searchTerm && (
                    <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-600">
                      <Search className="w-3 h-3" />
                      <span>"{searchTerm}"</span>
                    </div>
                  )}
                </div>
              </div>
              
              {totalPages > 1 && (
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className="text-right">
                    <div className="text-[10px] sm:text-xs text-gray-500">
                      Page {currentPage} of {totalPages}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Content Grid */}
          {loading ? (
            <div className="mb-6 sm:mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="group relative h-full">
                  <div className="relative rounded-2xl overflow-hidden shadow-sm bg-white ring-1 ring-gray-200 h-full flex flex-col">
                    <div className="relative overflow-hidden flex-shrink-0 aspect-[16/9] bg-gray-100">
                      <div className="w-full h-full animate-pulse bg-gray-200" />
                    </div>
                    <div className="flex-1 p-4 sm:p-6 space-y-2 sm:space-y-3">
                      <div className="h-4 sm:h-5 w-3/4 bg-gray-200 rounded animate-pulse" />
                      <div className="flex items-center gap-2 sm:gap-4">
                        <div className="h-3 sm:h-4 w-20 sm:w-28 bg-gray-200 rounded animate-pulse" />
                      </div>
                      <div className="h-3 sm:h-4 w-full bg-gray-200 rounded animate-pulse" />
                      <div className="h-3 sm:h-4 w-5/6 bg-gray-200 rounded animate-pulse" />
                      <div className="h-3 sm:h-4 w-2/3 bg-gray-200 rounded animate-pulse" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12 sm:py-16">
              <div className="text-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 sm:w-8 sm:h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-red-600 mb-2 text-sm sm:text-base">Failed to load announcements</p>
                <p className="text-gray-500 text-xs sm:text-sm mb-4">Please try again</p>
                <button
                  onClick={() => setReloadKey(k => k + 1)}
                  className="inline-flex items-center px-3 py-2 sm:px-4 sm:py-2 bg-blue-600 text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : paginatedAnnouncements.length > 0 ? (
            <>
              <div className="mb-6 sm:mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {paginatedAnnouncements.map((announcement) => {
                  const categoryInfo = getCategoryInfo(announcement.category);
                  const isPinned = announcement.is_pinned;
                  const isFeatured = announcement.is_featured;
                  
                  return (
                    <div key={(announcement.announcement_id || announcement.id)} className="group relative h-full">
                      {/* Glow effect for featured items */}
                      {isFeatured && (
                        <div className="absolute -inset-2 rounded-2xl bg-gradient-to-br from-yellow-300/30 via-orange-200/25 to-red-300/30 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" aria-hidden="true" />
                      )}
                      
                      {/* Card */}
                      <div 
                        className={`relative rounded-2xl overflow-hidden shadow-sm transition-all duration-200 group-hover:shadow-lg group-hover:-translate-y-1 h-full flex flex-col cursor-pointer ${
                          isPinned ? 'bg-white ring-2 ring-red-200' : 'bg-white ring-1 ring-gray-200'
                        }`}
                        onClick={() => navigate(`/programs/${(announcement.announcement_id || announcement.id)}`)}
                      >
                        {/* Image */}
                        {(
                          <div className="relative overflow-hidden flex-shrink-0 aspect-[16/9]">
                            <img
                              src={announcement.image_url ? getFileUrl(announcement.image_url) : getFallbackImage(announcement.category, announcement.title)}
                              alt={announcement.title || 'Announcement image'}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              loading="lazy"
                              decoding="async"
                              onError={(e) => { e.currentTarget.src = getFallbackImage(announcement.category, announcement.title); }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                            
                            {/* Category Badge */}
                            <div className="absolute top-1.5 sm:top-2 left-1.5 sm:left-2">
                              <div className={`inline-flex items-center px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold ${categoryInfo.color}`}>
                                <categoryInfo.Icon className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                                <span>{categoryInfo.label}</span>
                              </div>
                            </div>
                            
                            {/* Featured/Pinned Badge */}
                            {(isFeatured || isPinned) && (
                              <div className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2">
                                <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center ${
                                  isFeatured ? 'bg-yellow-400' : 'bg-red-500'
                                }`}>
                                  {isFeatured ? (
                                    <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-yellow-800" />
                                  ) : (
                                    <Pin className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Content */}
                        <div className="flex flex-col flex-1 p-4 sm:p-6">
                          {/* Header */}
                          <div className="flex items-start justify-between mb-2 sm:mb-3">
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900 mb-1 sm:mb-2 line-clamp-2 text-base sm:text-lg">{announcement.title}</h3>
                              <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500">
                                <div className="flex items-center">
                                  <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                  <span>Published: {formatDate(announcement.published_at)}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Description */}
                          <p className="text-gray-600 text-xs sm:text-sm mb-3 sm:mb-4 leading-relaxed line-clamp-3 flex-1">
                            {announcement.summary}
                          </p>

                          {/* Additional Info */}
                          {(announcement.event_date || announcement.location || announcement.end_date) && (
                            <div className="space-y-1 sm:space-y-2 mb-3 sm:mb-4 p-2 sm:p-3 bg-gray-50 rounded-lg">
                              {/* Event/End Date logic */}
                              {(() => {
                                const hasEvent = Boolean(announcement.event_date);
                                const hasEnd = Boolean(announcement.end_date);
                                if (hasEvent && hasEnd) {
                                  return (
                                    <div className="flex items-center text-xs sm:text-sm text-gray-600">
                                      <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 text-blue-500" />
                                      <span>Event period: {formatDate(announcement.event_date)} – {formatDate(announcement.end_date)}</span>
                                    </div>
                                  );
                                }
                                if (hasEvent) {
                                  return (
                                <div className="flex items-center text-xs sm:text-sm text-gray-600">
                                  <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 text-blue-500" />
                                      <span>Event date: {formatDate(announcement.event_date)}</span>
                                    </div>
                                  );
                                }
                                if (hasEnd) {
                                  return (
                                    <div className="flex items-center text-xs sm:text-sm text-red-600">
                                      <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                                      <span>Deadline: {formatDate(announcement.end_date)}</span>
                                </div>
                                  );
                                }
                                return null;
                              })()}

                              {/* Location */}
                              {announcement.location && (
                                <div className="flex items-center text-xs sm:text-sm text-gray-600">
                                  <MapPin className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 text-green-500" />
                                  <span className="truncate">{announcement.location}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Footer */}
                          <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-gray-100 mt-auto">
                            <div 
                              className="relative inline-flex items-center text-gray-400 group-hover:text-[#24345A] transition-colors w-24 sm:w-32"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span className="absolute left-0 text-xs sm:text-sm font-medium opacity-0 transition-opacity duration-200 pointer-events-none group-hover:opacity-100">Read more</span>
                              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 transform transition-transform duration-200 group-hover:translate-x-16 sm:group-hover:translate-x-20" />
                            </div>
                            <span className="text-[10px] sm:text-xs text-gray-500">
                              {formatDate(announcement.published_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-6 sm:mt-8 flex justify-center">
                  <div className="w-full max-w-md sm:max-w-none">
                    <Pagination
                      key={`ann-pagination-${totalItems}-${itemsPerPage}`}
                      currentPage={currentPage}
                      totalItems={totalItems}
                      itemsPerPage={itemsPerPage}
                      onPageChange={setCurrentPage}
                      onItemsPerPageChange={setItemsPerPage}
                      itemName="result"
                      itemNamePlural="results"
                      showItemsPerPage={true}
                      showInfo={true}
                      size="xs sm:sm"
                      variant="default"
                      itemsPerPageOptions={[6, 9, 12, 18]}
                    />
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 sm:py-16">
              <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 rounded-full bg-gray-100 flex items-center justify-center">
                <Search className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 sm:mb-3">
                {searchTerm ? 'No content found' : 'No content available'}
              </h3>
              <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6 max-w-md mx-auto">
                {searchTerm 
                  ? `No content matches "${searchTerm}". Try a different search term or clear the search.`
                  : 'Check back later for new programs and events.'
                }
              </p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="px-4 py-2 sm:px-6 sm:py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm sm:text-base"
                >
                  Clear Search
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Filter Modal */}
      <FilterModal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        title="Filter Announcements"
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
        title="Sort Announcements"
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

export default Announcements;
