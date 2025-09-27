import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  User,
  Eye,
  Tag,
  MapPin,
  Clock,
  Star,
  Pin,
  Edit,
  Archive,
  Trash2,
  Share2,
  Download,
  Printer,
  MoreHorizontal,
  ArrowRight,
  ChevronRight,
  ExternalLink,
  Phone,
  Mail,
  Globe,
  FileText,
  Award,
  Users
} from 'lucide-react';
import { HeaderMainContent, ActionMenu, LoadingSpinner } from '../../components/portal_main_content';
import { getAnnouncementById, updateAnnouncementStatus, deleteAnnouncement } from '../../services/announcementsService';

// Mock data - in real app this would come from API
const mockAnnouncement = {
  id: 1,
  title: 'Youth Leadership Summit 2025',
  content: `
    <h2>Join the 2-Day Leadership Summit</h2>
    <p>We are excited to announce the Youth Leadership Summit 2025, a comprehensive 2-day program designed to empower young leaders in San Jose, Batangas.</p>
    
    <h3>What to Expect:</h3>
    <ul>
      <li>Interactive workshops on leadership principles</li>
      <li>Mentorship sessions with successful leaders</li>
      <li>Networking opportunities with peers</li>
      <li>Certificate of participation</li>
      <li>Free meals and materials</li>
    </ul>
    
    <h3>Eligibility Requirements:</h3>
    <ul>
      <li>Must be 15-30 years old</li>
      <li>Resident of San Jose, Batangas</li>
      <li>Commitment to attend both days</li>
      <li>Basic English communication skills</li>
    </ul>
    
    <h3>Registration Process:</h3>
    <ol>
      <li>Fill out the online registration form</li>
      <li>Submit required documents</li>
      <li>Attend the orientation session</li>
      <li>Receive confirmation email</li>
    </ol>
    
    <p><strong>Note:</strong> Limited slots available. Early registration is encouraged.</p>
  `,
  summary: 'Calling youth leaders to join the 2-day leadership summit with workshops and mentorship.',
  status: 'published',
  publishAt: '2025-09-10T09:00:00Z',
  author: 'LYDO Staff',
  audience: 'All Barangays',
  tags: ['Leadership', 'Training', 'Youth Development'],
  views: 342,
  isFeatured: true,
  category: 'programs',
  image: null,
  eventDate: '2025-10-15T09:00:00Z',
  deadline: '2025-10-01T23:59:59Z',
  location: 'San Jose Municipal Hall',
  attachments: [
    { name: 'Registration Form.pdf', size: '2.3 MB', type: 'pdf' },
    { name: 'Program Schedule.xlsx', size: '1.1 MB', type: 'excel' },
    { name: 'Venue Map.jpg', size: '856 KB', type: 'image' }
  ]
};

const AnnouncementDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [announcement, setAnnouncement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAnnouncement = async () => {
      setLoading(true);
      setError(null);
      try {
        console.log('🔍 Fetching announcement with ID:', id);
        const response = await getAnnouncementById(id);
        console.log('📊 Announcement response:', response);
        
        if (response?.success && response?.data) {
          setAnnouncement(response.data);
        } else {
          setError('Announcement not found');
        }
      } catch (error) {
        console.error('Error fetching announcement:', error);
        setError('Failed to load announcement');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchAnnouncement();
    }
  }, [id]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const capitalizeStatus = (status) => {
    if (!status) return '';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getCategoryColor = (category) => {
    const key = (category || '').toString().toLowerCase();
    switch (key) {
      case 'programs':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'projects':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'activities':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'meetings':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'announcements':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'achievement':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'draft':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'archived':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getActionMenuItems = () => [
    {
      id: 'edit',
      label: 'Edit Announcement',
      icon: <Edit className="w-4 h-4" />,
      action: 'edit'
    },
    {
      id: 'share',
      label: 'Share',
      icon: <Share2 className="w-4 h-4" />,
      action: 'share'
    },
    {
      id: 'download',
      label: 'Download PDF',
      icon: <Download className="w-4 h-4" />,
      action: 'download'
    },
    {
      id: 'print',
      label: 'Print',
      icon: <Printer className="w-4 h-4" />,
      action: 'print'
    },
    {
      id: 'archive',
      label: 'Archive',
      icon: <Archive className="w-4 h-4" />,
      action: 'archive'
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: <Trash2 className="w-4 h-4" />,
      action: 'delete'
    }
  ];

  const handleActionClick = async (action) => {
    switch (action) {
      case 'edit':
        navigate(`/staff/announcements/${id}/edit`);
        break;
      case 'share':
        // Handle share functionality
        console.log('Share announcement');
        break;
      case 'download':
        // Handle download PDF
        console.log('Download PDF');
        break;
      case 'print':
        window.print();
        break;
      case 'archive':
        try {
          console.log('Archiving announcement:', id);
          const response = await updateAnnouncementStatus(id, 'archived');
          if (response?.success) {
            console.log('Announcement archived successfully');
            navigate('/staff/announcements');
          } else {
            console.error('Failed to archive announcement');
          }
        } catch (error) {
          console.error('Error archiving announcement:', error);
        }
        break;
      case 'delete':
        if (window.confirm('Are you sure you want to delete this announcement? This action cannot be undone.')) {
          try {
            console.log('Deleting announcement:', id);
            const response = await deleteAnnouncement(id);
            if (response?.success) {
              console.log('Announcement deleted successfully');
              navigate('/staff/announcements');
            } else {
              console.error('Failed to delete announcement');
            }
          } catch (error) {
            console.error('Error deleting announcement:', error);
          }
        }
        break;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <HeaderMainContent
          title="Loading..."
          description="Fetching announcement details..."
        />
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
          <LoadingSpinner 
            variant="spinner"
            message="Loading announcement details..." 
            size="md"
            color="blue"
            height="h-64"
          />
        </div>
      </div>
    );
  }

  if (error || !announcement) {
    return (
      <div className="space-y-6">
        <HeaderMainContent
          title="Announcement Not Found"
          description="The requested announcement could not be found."
        />
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Announcement Not Found</h3>
          <p className="text-gray-600 mb-6">
            {error || "The announcement you're looking for doesn't exist or has been removed."}
          </p>
          <button
            onClick={() => navigate('/staff/announcements')}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Announcements
          </button>
        </div>
      </div>
    );
  }

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

  // Category-based fallback images (SVG like public page)
  const buildSvgPlaceholder = (label, colorFrom, colorTo, title = '') => {
    // Truncate title if too long for display
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
        <text x='600' y='350' text-anchor='middle' fill='white' font-family='Arial, sans-serif' font-size='36' font-weight='bold' opacity='0.9'>
          <tspan x='600' dy='0'>${displayTitle}</tspan>
        </text>
        ` : ''}
      </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  };

  const getFallbackImage = (category, title) => {
    const key = (category || '').toString().toLowerCase();
    const label = (title || '').trim() || (category ? String(category) : 'LYDO');
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

  const categoryInfo = getCategoryInfo(announcement.category);

  return (
    <div className="space-y-6">
      {/* Header Section - Responsive Design */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200">
          {/* Mobile/Tablet Layout - Vertical Stacking */}
          <div className="flex flex-col lg:hidden space-y-4">
            
            {/* Top Row - Back Button and Actions */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigate('/staff/announcements')}
                className="inline-flex items-center px-2 py-1.5 border border-gray-300 text-gray-700 text-xs font-medium rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                <ArrowLeft className="w-3 h-3 mr-1.5" />
                Back
              </button>
              
              {/* Three-dot menu on the right */}
              <ActionMenu
                items={getActionMenuItems()}
                onActionClick={handleActionClick}
                trigger={
                  <button className="inline-flex items-center px-3 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors">
                    <MoreHorizontal className="w-4 h-4 mr-2" />
                    Actions
                  </button>
                }
              />
            </div>
            
            {/* Title Section */}
            <div className="space-y-3">
              {/* Title */}
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight">
                {announcement ? announcement.title : 'Announcement Details'}
              </h1>
              
              {/* Badges Row */}
              {announcement && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(announcement.status)}`}>
                    {capitalizeStatus(announcement.status)}
                  </span>
                  <div className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-md border border-gray-200">
                    ID: {announcement.announcement_id}
                  </div>
                </div>
              )}
              
            </div>
          </div>

          {/* Desktop Layout - Horizontal */}
          <div className="hidden lg:flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/staff/announcements')}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </button>
              <div className="h-8 w-px bg-gray-300"></div>
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <h1 className="text-xl font-bold text-gray-900">
                    {announcement ? announcement.title : 'Announcement Details'}
                  </h1>
                  {announcement && (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(announcement.status)}`}>
                      {capitalizeStatus(announcement.status)}
                    </span>
                  )}
                  {announcement && (
                    <div className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-md border border-gray-200">
                      ID: {announcement.announcement_id}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Three-dot menu on the right */}
            <div className="flex items-center space-x-3">
              <ActionMenu
                items={getActionMenuItems()}
                onActionClick={handleActionClick}
                trigger={
                  <button className="inline-flex items-center px-3 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors">
                    <MoreHorizontal className="w-4 h-4 mr-2" />
                    Actions
                  </button>
                }
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Responsive layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <article className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Featured/Pinned Banner */}
            {(announcement.is_featured || announcement.is_pinned) && (
              <div className="px-2 py-1 bg-gradient-to-r from-yellow-50 to-orange-50 border-b border-yellow-200">
                <div className="flex items-center">
                  {announcement.is_featured ? (
                    <Star className="w-3 h-3 text-yellow-600 mr-1" />
                  ) : (
                    <Pin className="w-3 h-3 text-red-600 mr-1" />
                  )}
                  <span className="text-xs font-medium text-yellow-800">
                    {announcement.is_featured ? 'Featured' : 'Pinned'}
                  </span>
                </div>
              </div>
            )}

            {/* Image */}
            <div className="relative aspect-[16/9] overflow-hidden">
              <img
                src={announcement.image_url || getFallbackImage(announcement.category, announcement.title)}
                alt={announcement.title}
                className="w-full h-full object-cover"
                loading="lazy"
                decoding="async"
                onError={(e) => { e.currentTarget.src = getFallbackImage(announcement.category, announcement.title); }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
              
              {/* Category Badge */}
              <div className="absolute top-2 left-2 sm:top-4 sm:left-4">
                <div className={`inline-flex items-center px-2 py-1 sm:px-3 sm:py-1.5 rounded-full text-xs sm:text-sm font-semibold ${categoryInfo.color}`}>
                  <categoryInfo.icon className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">{categoryInfo.label}</span>
                </div>
              </div>
              
              {/* Featured/Pinned Badge */}
              {(announcement.is_featured || announcement.is_pinned) && (
                <div className="absolute top-2 right-2 sm:top-4 sm:right-4">
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

            {/* Content */}
            <div className="p-4 sm:p-6 lg:p-8">
              {/* Header */}
              <div className="mb-4 sm:mb-6">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">{announcement.title}</h1>
                
                {/* Meta Information */}
                <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600 mb-4">
                  <div className="flex items-center">
                    <User className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    <span>By {announcement.author_name || 'LYDO Staff'}</span>
                  </div>
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
                        <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-2 sm:mr-3 text-blue-500 flex-shrink-0" />
                        <div className="min-w-0">
                          <span className="font-medium">Event Date:</span> {formatDate(announcement.event_date)}
                        </div>
                      </div>
                    )}
                    {announcement.location && (
                      <div className="flex items-center text-xs sm:text-sm text-gray-700 mb-2">
                        <MapPin className="w-3 h-3 sm:w-4 sm:h-4 mr-2 sm:mr-3 text-green-500 flex-shrink-0" />
                        <div className="min-w-0">
                          <span className="font-medium">Location:</span> <span className="truncate">{announcement.location}</span>
                        </div>
                      </div>
                    )}
                    {announcement.end_date && (
                      <div className="flex items-center text-xs sm:text-sm text-red-600">
                        <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-2 sm:mr-3 flex-shrink-0" />
                        <div className="min-w-0">
                          <span className="font-medium">End Date:</span> {formatDate(announcement.end_date)}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="prose prose-sm sm:prose-base lg:prose-lg max-w-none">
                <div dangerouslySetInnerHTML={{ __html: announcement.content }} />
              </div>

              {/* Footer */}
              <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-200">
                <div className="flex items-center justify-start">
                  <div className="text-xs sm:text-sm text-gray-500">
                    Last updated: {formatDate(announcement.updated_at)}
                  </div>
                </div>
              </div>
            </div>
          </article>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-4 sm:top-6 lg:top-8 space-y-4 sm:space-y-6">
            {/* Quick Info Card */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="mb-3 sm:mb-4 inline-flex items-center px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold">
                Quick Info
              </div>
              <div className="space-y-2 sm:space-y-3">
                {announcement.event_date && (
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-blue-50 ring-1 ring-blue-200 flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs uppercase tracking-wide text-gray-500">Event Date</div>
                      <div className="text-xs sm:text-sm text-gray-800">{formatDate(announcement.event_date)}</div>
                    </div>
                  </div>
                )}
                {announcement.location && (
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-green-50 ring-1 ring-green-200 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs uppercase tracking-wide text-gray-500">Location</div>
                      <div className="text-xs sm:text-sm text-gray-800 truncate">{announcement.location}</div>
                    </div>
                  </div>
                )}
                {announcement.end_date && (
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-red-50 ring-1 ring-red-200 flex items-center justify-center flex-shrink-0">
                      <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-red-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs uppercase tracking-wide text-gray-500">End Date</div>
                      <div className="text-xs sm:text-sm text-red-600">{formatDate(announcement.end_date)}</div>
                    </div>
                  </div>
                )}
                {!announcement.event_date && !announcement.location && !announcement.end_date && (
                  <div className="text-sm text-gray-500">No additional info</div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementDetail;
