import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  Users, 
  Clock, 
  Award, 
  Pin,
  Star,
  ArrowLeft,
  ArrowRight,
  MapPin,
  FileText,
  User,
  ChevronRight,
  Share2,
  Printer,
  Download,
  ExternalLink,
  Phone,
  Mail,
  Globe
} from 'lucide-react';
import PublicLayout from '../../components/layouts/PublicLayout';
import { getAnnouncementById, getAnnouncements } from '../../services/announcementsService';

const AnnouncementDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [announcement, setAnnouncement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [related, setRelated] = useState([]);
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);

  // Category-based fallback images (SVG like list page)
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
    const key = (category || '').toString().toLowerCase();
    const label = (title || '').trim() || (category ? String(category) : 'LYDO');
    switch (key) {
      case 'programs':
        return buildSvgPlaceholder(label, '#3b82f6', '#1e40af');
      case 'projects':
        return buildSvgPlaceholder(label, '#10b981', '#065f46');
      case 'activities':
        return buildSvgPlaceholder(label, '#8b5cf6', '#4c1d95');
      case 'meetings':
      case 'meeting':
        return buildSvgPlaceholder(label, '#f97316', '#7c2d12');
      case 'announcements':
        return buildSvgPlaceholder(label, '#f59e0b', '#92400e');
      case 'achievement':
        return buildSvgPlaceholder(label, '#facc15', '#854d0e');
      default:
        return buildSvgPlaceholder(label || 'LYDO', '#64748b', '#111827');
    }
  };

  // Fetch by id + related
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const resp = await getAnnouncementById(id);
        
        if (!mounted) return;
        if (resp?.success) {
          setAnnouncement(resp.data);
          
          // Try to fetch related announcements
          try {
            const rel = await getAnnouncements({ 
              status: 'published', 
              limit: 10, 
              sortBy: 'published_at', 
              sortOrder: 'DESC' 
            });
            
            if (rel?.data && Array.isArray(rel.data)) {
              const currentId = resp.data.announcement_id || resp.data.id;
              const filtered = (rel.data || []).filter(a => {
                const itemId = a.announcement_id || a.id;
                return itemId !== currentId;
              });
              setRelated(filtered.slice(0, 3));
            } else {
              setRelated([]);
            }
          } catch (relatedError) {
            setRelated([]);
          }
        } else {
          setAnnouncement(null);
        }
      } catch (e) {
        setAnnouncement(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [id]);

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Format date and time
  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get category info
  const getCategoryInfo = (categoryKey) => {
    const categories = {
      'projects': { label: 'Projects', icon: FileText, color: 'bg-blue-100 text-blue-700' },
      'programs': { label: 'Programs', icon: Award, color: 'bg-green-100 text-green-700' },
      'activities': { label: 'Activities', icon: Users, color: 'bg-purple-100 text-purple-700' },
      'meetings': { label: 'Meetings', icon: Calendar, color: 'bg-orange-100 text-orange-700' },
      'achievement': { label: 'Achievement', icon: Star, color: 'bg-yellow-100 text-yellow-700' },
      'announcements': { label: 'Announcements', icon: FileText, color: 'bg-red-100 text-red-700' }
    };
    return categories[categoryKey] || categories['announcements'];
  };

  if (loading) {
    return (
      <PublicLayout>
        <section className="py-6 sm:py-8 md:py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
              {/* Main skeleton */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="aspect-[16/9] bg-gray-200 animate-pulse" />
                  <div className="p-4 sm:p-6 lg:p-8">
                    <div className="h-5 sm:h-6 lg:h-7 w-2/3 bg-gray-200 rounded mb-3 sm:mb-4 animate-pulse" />
                    <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                      <div className="h-3 sm:h-4 w-24 sm:w-32 bg-gray-200 rounded animate-pulse" />
                      <div className="h-3 sm:h-4 w-20 sm:w-24 bg-gray-200 rounded animate-pulse" />
                    </div>
                    <div className="space-y-2 sm:space-y-3">
                      <div className="h-3 sm:h-4 w-full bg-gray-200 rounded animate-pulse" />
                      <div className="h-3 sm:h-4 w-11/12 bg-gray-200 rounded animate-pulse" />
                      <div className="h-3 sm:h-4 w-10/12 bg-gray-200 rounded animate-pulse" />
                    </div>
                    <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-200">
                      <div className="h-3 sm:h-4 w-32 sm:w-40 bg-gray-200 rounded animate-pulse" />
                    </div>
                  </div>
                </div>
              </div>
              {/* Right sidebar skeletons */}
              <div className="space-y-4 sm:space-y-6">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6">
                  <div className="h-3 sm:h-4 w-20 sm:w-24 bg-gray-200 rounded mb-3 sm:mb-4 animate-pulse" />
                  <div className="space-y-2 sm:space-y-3">
                    <div className="h-6 sm:h-8 w-full bg-gray-200 rounded animate-pulse" />
                    <div className="h-6 sm:h-8 w-5/6 bg-gray-200 rounded animate-pulse" />
                    <div className="h-6 sm:h-8 w-2/3 bg-gray-200 rounded animate-pulse" />
                  </div>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6">
                  <div className="h-3 sm:h-4 w-24 sm:w-28 bg-gray-200 rounded mb-3 sm:mb-4 animate-pulse" />
                  <div className="space-y-2 sm:space-y-3">
                    <div className="h-6 sm:h-8 w-full bg-gray-200 rounded animate-pulse" />
                    <div className="h-6 sm:h-8 w-5/6 bg-gray-200 rounded animate-pulse" />
                    <div className="h-6 sm:h-8 w-4/6 bg-gray-200 rounded animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
        </div>
        </section>
      </PublicLayout>
    );
  }

  if (!announcement) {
    return (
      <PublicLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Announcement Not Found</h1>
            <p className="text-gray-600 mb-8">The announcement you're looking for doesn't exist or has been removed.</p>
            <button
              onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/programs'))}
              className="inline-flex items-center px-6 py-3 bg-[#24345A] text-white rounded-lg hover:bg-[#1e2a47] transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </button>
          </div>
        </div>
      </PublicLayout>
    );
  }

  const categoryInfo = getCategoryInfo(announcement.category);

  return (
      <PublicLayout>
        {/* Main Content */}
        <section className="py-6 sm:py-8 md:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back Button */}
          <div className="mb-6 sm:mb-8">
            <button
              onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/programs'))}
              className="inline-flex items-center text-gray-600 hover:text-gray-900 font-medium transition-colors text-sm sm:text-base"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </button>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              <article className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Image */}
            {(
              <div className="relative aspect-[16/9] overflow-hidden">
                <img
                  src={announcement.image_url ? getFileUrl(announcement.image_url) : getFallbackImage(announcement.category, announcement.title)}
                  alt={announcement.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                  onError={(e) => { e.currentTarget.src = getFallbackImage(announcement.category, announcement.title); }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                
                {/* Category Badge */}
                <div className="absolute top-2 sm:top-4 left-2 sm:left-4">
                  <div className={`inline-flex items-center px-2 py-1 sm:px-3 sm:py-1.5 rounded-full text-xs sm:text-sm font-semibold ${categoryInfo.color}`}>
                    <categoryInfo.icon className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    {categoryInfo.label}
                  </div>
                </div>
                
                {/* Featured/Pinned Badge */}
                {(announcement.is_featured || announcement.is_pinned) && (
                  <div className="absolute top-2 sm:top-4 right-2 sm:right-4">
                    <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center ${
                      announcement.is_featured ? 'bg-yellow-400' : 'bg-red-500'
                    }`}>
                      {announcement.is_featured ? (
                        <Star className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-800" />
                      ) : (
                        <Pin className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Content */}
            <div className="p-4 sm:p-6 lg:p-8">
              {/* Header */}
              <div className="mb-4 sm:mb-6">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">{announcement.title}</h1>
                
                {/* Meta Information */}
                <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
                  <div className="flex items-center">
                    <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    <span>Published {formatDate(announcement.published_at)}</span>
                  </div>
                </div>

                {/* Event Details */}
                {(announcement.event_date || announcement.location || announcement.end_date) && (
                  <div className="bg-gray-50 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
                    {announcement.event_date && (
                      <div className="flex items-center text-xs sm:text-sm text-gray-700 mb-2">
                        <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-2 sm:mr-3 text-blue-500" />
                        <div>
                          <span className="font-medium">Event Date:</span> {formatDateTime(announcement.event_date)}
                        </div>
                      </div>
                    )}
                    {announcement.location && (
                      <div className="flex items-center text-xs sm:text-sm text-gray-700 mb-2">
                        <MapPin className="w-3 h-3 sm:w-4 sm:h-4 mr-2 sm:mr-3 text-green-500" />
                        <div>
                          <span className="font-medium">Location:</span> {announcement.location}
                        </div>
                      </div>
                    )}
                    {announcement.end_date && (
                      <div className="flex items-center text-xs sm:text-sm text-red-600">
                        <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-2 sm:mr-3" />
                        <div>
                          <span className="font-medium">Deadline:</span> {formatDateTime(announcement.end_date)}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="prose prose-sm sm:prose-base lg:prose-lg max-w-none">
                {announcement.content.split('\n\n').map((paragraph, index) => (
                  <p key={index} className="text-gray-700 leading-relaxed mb-3 sm:mb-4 text-sm sm:text-base">
                    {paragraph.split('\n').map((line, lineIndex) => (
                      <span key={lineIndex}>
                        {line.startsWith('**') && line.endsWith('**') ? (
                          <strong className="font-semibold text-gray-900">
                            {line.slice(2, -2)}
                          </strong>
                        ) : (
                          line
                        )}
                        {lineIndex < paragraph.split('\n').length - 1 && <br />}
                      </span>
                    ))}
                  </p>
                ))}
              </div>

              {/* Footer */}
              <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-200">
                <div className="flex items-center justify-start">
                  <div className="text-xs sm:text-sm text-gray-500">
                    Last updated: {formatDate(announcement.updated_at || announcement.created_at)}
                  </div>
                </div>
              </div>
            </div>
          </article>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-6 sm:top-8 space-y-4 sm:space-y-6">
                {/* Quick Info Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6">
                  <div className="mb-3 sm:mb-4 inline-flex items-center px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-[10px] sm:text-xs font-semibold">
                    Quick Info
                  </div>
                  <div className="space-y-2 sm:space-y-3">
                  {announcement.event_date && (
                      <div className="flex items-start gap-2 sm:gap-3">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-blue-50 ring-1 ring-blue-200 flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                      </div>
                      <div>
                          <div className="text-[10px] sm:text-xs uppercase tracking-wide text-gray-500">Event Date</div>
                          <div className="text-xs sm:text-sm text-gray-800">{formatDateTime(announcement.event_date)}</div>
                      </div>
                    </div>
                  )}
                  {announcement.location && (
                      <div className="flex items-start gap-2 sm:gap-3">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-green-50 ring-1 ring-green-200 flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                      </div>
                      <div>
                          <div className="text-[10px] sm:text-xs uppercase tracking-wide text-gray-500">Location</div>
                          <div className="text-xs sm:text-sm text-gray-800">{announcement.location}</div>
                      </div>
                    </div>
                  )}
                    {announcement.end_date && (
                      <div className="flex items-start gap-2 sm:gap-3">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-red-50 ring-1 ring-red-200 flex items-center justify-center flex-shrink-0">
                        <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-red-600" />
                      </div>
                      <div>
                          <div className="text-[10px] sm:text-xs uppercase tracking-wide text-gray-500">Deadline</div>
                          <div className="text-xs sm:text-sm text-red-600">{formatDateTime(announcement.end_date)}</div>
                        </div>
                      </div>
                    )}
                    {!announcement.event_date && !announcement.location && !announcement.end_date && (
                      <div className="text-xs sm:text-sm text-gray-500">No additional info</div>
                    )}
                    </div>
                  {/* Registration button intentionally removed per design */}
                </div>

                {/* Contact Info Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6">
                  <div className="mb-3 sm:mb-4 inline-flex items-center px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-[10px] sm:text-xs font-semibold">
                    Contact Info
                  </div>
                  <div className="space-y-2 sm:space-y-3">
                    <div className="flex items-start gap-2 sm:gap-3">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-gray-50 ring-1 ring-gray-200 flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600" />
                      </div>
                      <span className="text-xs sm:text-sm text-gray-700">2nd Floor, Archive Building, New Municipal Government Center, Brgy. Don Luis, San Jose, Batangas</span>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-gray-50 ring-1 ring-gray-200 flex items-center justify-center">
                        <Mail className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600" />
                      </div>
                      <span className="text-xs sm:text-sm text-gray-700">lydo@sanjosebatangas.gov.ph</span>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-gray-50 ring-1 ring-gray-200 flex items-center justify-center">
                        <Phone className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600" />
                      </div>
                      <span className="text-xs sm:text-sm text-gray-700">(043) 779-8550 loc. 4006</span>
                    </div>
                  </div>
                </div>

                {/* Share Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6">
                  <div className="mb-3 sm:mb-4 inline-flex items-center px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-[10px] sm:text-xs font-semibold">
                    Share
                  </div>
                  <div className="space-y-3 sm:space-y-4">
                    {/* Native Share tile */}
                    <button
                      onClick={() => { const url = window.location.href; if (navigator.share) { navigator.share({ title: announcement.title, text: announcement.summary, url }).catch(() => {}); } else { try { navigator.clipboard?.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {} } }}
                      className="w-full rounded-2xl p-3 sm:p-4 bg-gradient-to-br from-indigo-500/10 to-blue-500/10 ring-1 ring-indigo-100 hover:shadow-md transition-shadow flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="h-8 w-8 sm:h-11 sm:w-11 rounded-xl bg-indigo-500 text-white grid place-items-center shadow-sm"><Share2 className="w-4 h-4 sm:w-5 sm:h-5" /></div>
                        <div className="text-left">
                          <div className="text-xs sm:text-sm font-semibold text-indigo-900">Native Share</div>
                          <div className="text-[10px] sm:text-xs text-indigo-700/80">Use device share menu</div>
                        </div>
                      </div>
                      <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-700/70" />
                    </button>

                    {/* Copy Link tile */}
                    <button
                      onClick={() => { const url = window.location.href; try { navigator.clipboard?.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {} }}
                      className="w-full rounded-2xl p-3 sm:p-4 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 ring-1 ring-emerald-100 hover:shadow-md transition-shadow flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="h-8 w-8 sm:h-11 sm:w-11 rounded-xl bg-emerald-500 text-white grid place-items-center shadow-sm"><ExternalLink className="w-4 h-4 sm:w-5 sm:h-5" /></div>
                        <div className="text-left">
                          <div className="text-xs sm:text-sm font-semibold text-emerald-900">Copy Link</div>
                          <div className="text-[10px] sm:text-xs text-emerald-700/80">{copied ? 'Link copied!' : 'Share via clipboard'}</div>
                        </div>
                      </div>
                      <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-700/70" />
                    </button>

                    {/* Social icons */}
                    <div className="grid grid-cols-5 gap-2 sm:gap-3 place-items-center">
                      {/* Facebook */}
                      <button
                        onClick={() => { const u = encodeURIComponent(window.location.href); window.open(`https://www.facebook.com/sharer/sharer.php?u=${u}`, '_blank'); }}
                        title="Share on Facebook"
                        aria-label="Share on Facebook"
                        className="h-10 w-10 sm:h-14 sm:w-14 rounded-2xl bg-white ring-1 ring-gray-200 shadow-sm flex items-center justify-center hover:shadow-md transition-shadow"
                      >
                        <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-[#1877F2] grid place-items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-3 w-3 sm:h-4 sm:w-4 fill-white"><path d="M22 12a10 10 0 1 0-11.563 9.875v-6.988H7.898V12h2.539V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.772-1.63 1.562V12h2.773l-.443 2.887h-2.33v6.988A10.002 10.002 0 0 0 22 12Z"/></svg>
                        </div>
                        <span className="sr-only">Facebook</span>
                      </button>
                      {/* Messenger */}
                      <button
                        onClick={() => { const u = encodeURIComponent(window.location.href); window.open(`https://www.facebook.com/dialog/send?link=${u}`, '_blank'); }}
                        title="Send via Messenger"
                        aria-label="Send via Messenger"
                        className="h-10 w-10 sm:h-14 sm:w-14 rounded-2xl bg-white ring-1 ring-gray-200 shadow-sm flex items-center justify-center hover:shadow-md transition-shadow"
                      >
                        <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-[#0099FF] grid place-items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-3 w-3 sm:h-4 sm:w-4 fill-white"><path d="M12 2C6.477 2 2 6.002 2 10.944c0 2.743 1.323 5.208 3.45 6.9v3.036l3.159-1.736c1.033.287 2.133.443 3.391.443 5.523 0 10-4.002 10-8.944S17.523 2 12 2Zm.522 7.088 2.87-1.809a.6.6 0 0 1 .815.19l1.844 2.886a.6.6 0 0 1-.19.817l-2.87 1.81a.6.6 0 0 1-.816-.19l-1.843-2.887a.6.6 0 0 1 .19-.817Zm-4.63 0 2.869-1.809a.6.6 0 0 1 .816.19l1.843 2.886a.6.6 0 0 1-.19.817l-2.869 1.81a.6.6 0 0 1-.816-.19L7.9 7.905a.6.6 0 0 1 .19-.817Z"/></svg>
                        </div>
                        <span className="sr-only">Messenger</span>
                      </button>
                      {/* X/Twitter */}
                      <button
                        onClick={() => { const u = encodeURIComponent(window.location.href); const t = encodeURIComponent(announcement.title || ''); window.open(`https://twitter.com/intent/tweet?url=${u}&text=${t}`, '_blank'); }}
                        title="Share on X"
                        aria-label="Share on X"
                        className="h-10 w-10 sm:h-14 sm:w-14 rounded-2xl bg-white ring-1 ring-gray-200 shadow-sm flex items-center justify-center hover:shadow-md transition-shadow"
                      >
                        <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-black grid place-items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-3 w-3 sm:h-4 sm:w-4 fill-white"><path d="M18.243 2H21l-6.485 7.41L22 22h-6.59l-5.16-6.73L4.41 22H2l6.93-7.92L2 2h6.59l4.63 6.04L18.243 2Zm-.968 18h1.87L8.86 4H6.99l10.285 16Z"/></svg>
                        </div>
                        <span className="sr-only">X</span>
                      </button>
                      {/* WhatsApp */}
                      <button
                        onClick={() => { const u = encodeURIComponent(window.location.href); const t = encodeURIComponent(announcement.title || ''); window.open(`https://api.whatsapp.com/send?text=${t}%20${u}`, '_blank'); }}
                        title="Share on WhatsApp"
                        aria-label="Share on WhatsApp"
                        className="h-10 w-10 sm:h-14 sm:w-14 rounded-2xl bg-white ring-1 ring-gray-200 shadow-sm flex items-center justify-center hover:shadow-md transition-shadow"
                      >
                        <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-[#25D366] grid place-items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-3 w-3 sm:h-4 sm:w-4 fill-white"><path d="M20.52 3.48A11.94 11.94 0 0 0 12.06 0C5.5 0 .2 5.3.2 11.86c0 2.09.57 4.08 1.66 5.85L0 24l6.45-1.84a11.76 11.76 0 0 0 5.61 1.44h.01c6.55 0 11.86-5.3 11.86-11.86 0-3.17-1.24-6.16-3.41-8.26ZM12.07 21.2h-.01a9.9 9.9 0 0 1-5.04-1.38l-.36-.21-3.83 1.09 1.03-3.72-.24-.38a9.9 9.9 0 0 1-1.51-5.2c0-5.47 4.45-9.92 9.93-9.92 2.65 0 5.15 1.03 7.03 2.9a9.89 9.89 0 0 1 2.9 7.02c0 5.47-4.45 9.92-9.9 9.92Zm5.66-7.57c-.31-.16-1.83-.9-2.11-1.01-.28-.1-.48-.16-.69.16-.2.31-.78 1-.95 1.2-.17.2-.35.23-.66.08-.31-.16-1.3-.48-2.48-1.53-.92-.82-1.54-1.82-1.72-2.12-.18-.31-.02-.48.13-.64.14-.14.31-.35.47-.52.16-.17.21-.29.32-.49.1-.2.05-.37-.03-.53-.08-.16-.69-1.67-.95-2.29-.25-.6-.51-.51-.69-.52h-.59c-.2 0-.52.07-.79.37-.27.31-1.03 1-1.03 2.45 0 1.44 1.06 2.83 1.21 3.03.16.2 2.09 3.18 5.06 4.46.71.31 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.09 1.83-.75 2.09-1.47.26-.72.26-1.33.18-1.46-.09-.13-.31-.2-.62-.36Z"/></svg>
                        </div>
                        <span className="sr-only">WhatsApp</span>
                      </button>
                      {/* Instagram */}
                      <button
                        onClick={() => { const u = encodeURIComponent(window.location.href); window.open(`https://www.instagram.com/?url=${u}`, '_blank'); }}
                        title="Share on Instagram"
                        aria-label="Share on Instagram"
                        className="h-10 w-10 sm:h-14 sm:w-14 rounded-2xl bg-white ring-1 ring-gray-200 shadow-sm flex items-center justify-center hover:shadow-md transition-shadow"
                      >
                        <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-[10px] bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF] grid place-items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-3 w-3 sm:h-4 sm:w-4 fill-white"><path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7Zm5 3a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2.2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6Zm4.6-.8a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z"/></svg>
                        </div>
                        <span className="sr-only">Instagram</span>
                      </button>
                    </div>

                    {/* QR code tile */}
                    <button
                      onClick={() => setShowQR(true)}
                      className="w-full rounded-2xl p-3 sm:p-4 bg-gradient-to-br from-slate-100 to-slate-50 ring-1 ring-slate-200 hover:shadow-md transition-shadow flex items-center justify-between text-slate-900"
                    >
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="h-8 w-8 sm:h-11 sm:w-11 rounded-xl bg-white grid place-items-center shadow-sm ring-1 ring-slate-300">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5 fill-slate-900"><path d="M3 3h6v6H3V3Zm2 2v2h2V5H5Zm8-2h6v6h-6V3Zm2 2v2h2V5h-2ZM3 13h6v6H3v-6Zm2 2v2h2v-2H5Zm12-2h2v2h2v2h-2v2h-2v-2h-2v-2h2v-2Zm-4 0h2v2h-2v-2Zm0 4h2v2h-2v-2Z"/></svg>
                        </div>
                        <div className="text-left">
                          <div className="text-xs sm:text-sm font-semibold">QR Code</div>
                          <div className="text-[10px] sm:text-xs text-slate-600">Generate scannable code</div>
                        </div>
                      </div>
                      <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 text-slate-500" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* QR Modal */}
      {showQR && (
        <div className="fixed inset-0 z-[9999] bg-black/40 flex items-center justify-center p-4" onClick={() => setShowQR(false)}>
          <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Scan to open</h3>
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(window.location.href)}`}
              alt="QR Code"
              className="w-48 h-48 sm:w-56 sm:h-56 mx-auto"
            />
            <button onClick={() => setShowQR(false)} className="mt-3 sm:mt-4 w-full rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 py-2 text-sm sm:text-base font-medium">Close</button>
          </div>
        </div>
      )}

      {/* Related Announcements */}
      <section className="py-8 sm:py-12 lg:py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-10 lg:mb-12">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">Related Announcements</h2>
            <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto">Discover more programs and opportunities that might interest you.</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {related.length > 0 ? related.map((item) => {
              const categoryInfo = getCategoryInfo(item.category);
              const isPinned = item.is_pinned;
              const isFeatured = item.is_featured;
              const go = () => navigate(`/programs/${(item.announcement_id || item.id)}`);
                return (
                <div 
                  key={(item.announcement_id || item.id)} 
                  className="group relative h-full"
                  onClick={go}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } }}
                >
                  {/* Glow effect for featured items */}
                  {isFeatured && (
                    <div className="absolute -inset-2 rounded-2xl bg-gradient-to-br from-yellow-300/30 via-orange-200/25 to-red-300/30 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" aria-hidden="true" />
                  )}

                  {/* Card */}
                  <div 
                    className={`relative rounded-2xl overflow-hidden shadow-sm transition-all duration-200 group-hover:shadow-lg group-hover:-translate-y-1 h-full flex flex-col cursor-pointer ${
                      isPinned ? 'bg-white ring-2 ring-red-200' : 'bg-white ring-1 ring-gray-200'
                    }`}
                  >
                    {/* Image */}
                    <div className="relative overflow-hidden flex-shrink-0 aspect-[16/9]">
                      <img
                        src={item.image_url ? getFileUrl(item.image_url) : getFallbackImage(item.category, item.title)}
                        alt={item.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                        decoding="async"
                        onError={(e) => { e.currentTarget.src = getFallbackImage(item.category, item.title); }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                      {/* Category Badge */}
                      <div className="absolute top-1.5 sm:top-2 left-1.5 sm:left-2">
                        <div className={`inline-flex items-center px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold ${categoryInfo.color}`}>
                          <categoryInfo.icon className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
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

                    {/* Content */}
                    <div className="flex flex-col flex-1 p-4 sm:p-6">
                      <div className="flex items-start justify-between mb-2 sm:mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 text-base sm:text-lg">{item.title}</h3>
                          <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-500">
                            <div className="flex items-center">
                              <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                              <span>Published: {formatDate(item.published_at)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <p className="text-gray-600 text-xs sm:text-sm mb-3 sm:mb-4 leading-relaxed line-clamp-2">
                        {item.summary}
                      </p>

                      {/* Additional Info */}
                      {(item.event_date || item.location || item.end_date) && (
                        <div className="space-y-1.5 sm:space-y-2 mb-3 sm:mb-4 p-2 sm:p-3 bg-gray-50 rounded-lg">
                          {(() => {
                            const hasEvent = Boolean(item.event_date);
                            const hasEnd = Boolean(item.end_date);
                            if (hasEvent && hasEnd) {
                              return (
                                <div className="flex items-center text-xs sm:text-sm text-gray-600">
                                  <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 text-blue-500" />
                                  <span>Event period: {formatDate(item.event_date)} – {formatDate(item.end_date)}</span>
                                </div>
                              );
                            }
                            if (hasEvent) {
                              return (
                                <div className="flex items-center text-xs sm:text-sm text-gray-600">
                                  <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 text-blue-500" />
                                  <span>Event date: {formatDate(item.event_date)}</span>
                                </div>
                              );
                            }
                            if (hasEnd) {
                              return (
                                <div className="flex items-center text-xs sm:text-sm text-red-600">
                                  <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                                  <span>Deadline: {formatDate(item.end_date)}</span>
                                </div>
                              );
                            }
                            return null;
                          })()}

                          {item.location && (
                            <div className="flex items-center text-xs sm:text-sm text-gray-600">
                              <MapPin className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 text-green-500" />
                              <span className="truncate">{item.location}</span>
                            </div>
                          )}
                      </div>
                    )}
                    
                      <div className="mt-auto pt-3 sm:pt-4 border-t border-gray-100 flex items-center justify-between">
                        <div 
                          className="relative inline-flex items-center text-gray-400 group-hover:text-[#24345A] transition-colors w-24 sm:w-32"
                        >
                          <span className="absolute left-0 text-xs sm:text-sm font-medium opacity-0 transition-opacity duration-200 pointer-events-none group-hover:opacity-100">Read more</span>
                          <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 transform transition-transform duration-200 group-hover:translate-x-16 sm:group-hover:translate-x-20" />
                        </div>
                        <span className="text-[10px] sm:text-xs text-gray-500">{formatDate(item.published_at)}</span>
                      </div>
                      </div>
                    </div>
                  </div>
                );
              }) : (
                <div className="col-span-full flex flex-col items-center justify-center py-12 sm:py-16">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 mb-4 sm:mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                    <FileText className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">No Related Content</h3>
                  <p className="text-sm sm:text-base text-gray-600 text-center max-w-md">
                    There are no other announcements in this category at the moment.
                  </p>
                  <button
                    onClick={() => navigate('/programs')}
                    className="mt-4 sm:mt-6 inline-flex items-center px-4 py-2 sm:px-6 sm:py-3 bg-[#24345A] text-white text-sm sm:text-base font-medium rounded-lg hover:bg-[#1e2a47] transition-colors"
                  >
                    <ArrowRight className="w-4 h-4 mr-2" />
                    Browse All Announcements
                  </button>
                </div>
              )}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};

export default AnnouncementDetail;
