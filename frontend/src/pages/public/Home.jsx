import React, { useEffect, useRef, useState } from 'react';
import heroVideo from '../../assets/media/hero.mp4';
import sanJoseLogo from '../../assets/logos/san_jose_logo.webp';
// pattern image will be loaded from public path; if missing, gradient remains
import whitePattern from '../../assets/media/white_patternn.webp';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Users, 
  Calendar, 
  Award, 
  BookOpen, 
  Heart, 
  MapPin,
  ArrowRight,
  Phone,
  Mail,
  Clock,
  TrendingUp,
  ClipboardList,
  Pause,
  Play,
  AlertCircle,
  Megaphone,
  FolderOpen,
  Activity
} from 'lucide-react';
import PublicLayout from '../../components/layouts/PublicLayout';
import { getFeaturedAnnouncements, getAnnouncements } from '../../services/announcementsService';
import { useActiveSurvey } from '../../hooks/useActiveSurvey';
import { useStatistics } from '../../hooks/useStatistics';
import { LoadingSpinner } from '../../components/portal_main_content';
import { useAuth } from '../../context/AuthContext';
import surveyBatchesService from '../../services/surveyBatchesService';
import useConfirmation from '../../hooks/useConfirmation';

// Scroll reveal hook (from About page)
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

  const AnimatedNumber = ({ value, suffix = '', duration = 1200 }) => {
    const [displayValue, setDisplayValue] = useState(0);
    const observerRef = useRef(null);
    const startedRef = useRef(false);

    useEffect(() => {
      const element = observerRef.current;
      if (!element) return;

      const observer = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting && !startedRef.current) {
          startedRef.current = true;
          const startTime = performance.now();

          const animate = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(value * eased);
            setDisplayValue(current);
            if (progress < 1) requestAnimationFrame(animate);
          };

          requestAnimationFrame(animate);
          observer.disconnect();
        }
      }, { threshold: 0.1, rootMargin: '0px 0px -20% 0px' });

      observer.observe(element);
      return () => observer.disconnect();
    }, [value, duration]);

    return (
      <span ref={observerRef}>{displayValue.toLocaleString()}{suffix}</span>
    );
  };

const Home = () => {
  const navigate = useNavigate();
  // Get active survey data from database
  const { activeSurvey, hasActiveSurvey, isLoading: surveyLoading, error: surveyError, refreshActiveSurvey } = useActiveSurvey();
  const { statistics, isLoading: statisticsLoading, error: statisticsError, refreshStatistics } = useStatistics();
  const { isAuthenticated, hasRole } = useAuth();
  const { showConfirmation } = useConfirmation();
  
  // Pause/Resume state
  const [isPauseResumeLoading, setIsPauseResumeLoading] = useState(false);
  
  // Smart refresh state
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Calculate progress percentage
  const progressPct = activeSurvey ? Math.min(100, Math.round((activeSurvey.statisticsTotalResponses / activeSurvey.statisticsTotalYouths) * 100)) : 0;

  // Featured content carousel state
  const [currentFeatured, setCurrentFeatured] = useState(0);
  const [featuredContent, setFeaturedContent] = useState([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);
  const [errorFeatured, setErrorFeatured] = useState(null);
  const [featuredReloadKey, setFeaturedReloadKey] = useState(0);
  // Programs count (all announcements categorized as programs)
  const [programsCount, setProgramsCount] = useState(0);
  
  // Gradient options for different announcement types
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

  // Get visible cards (previous, current, next)
  const getVisibleCards = () => {
    const prevIndex = currentFeatured === 0 ? featuredContent.length - 1 : currentFeatured - 1;
    const nextIndex = currentFeatured === featuredContent.length - 1 ? 0 : currentFeatured + 1;
    
    return [
      { ...featuredContent[prevIndex], position: 'prev', index: prevIndex },
      { ...featuredContent[currentFeatured], position: 'current', index: currentFeatured },
      { ...featuredContent[nextIndex], position: 'next', index: nextIndex }
    ];
  };

  const visibleCards = getVisibleCards();

  const navigateToCard = (index) => {
    setCurrentFeatured(index);
  };

  // Gradient SVG fallback similar to Announcements
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

  const getFallbackImage = (type, title) => {
    const key = (type || '').toString().toLowerCase();
    const label = (title || '').trim() || (type ? String(type) : 'LYDO');
    if (key.includes('program')) return buildSvgPlaceholder(label, '#3b82f6', '#1e40af');
    if (key.includes('project')) return buildSvgPlaceholder(label, '#10b981', '#065f46');
    if (key.includes('activity')) return buildSvgPlaceholder(label, '#8b5cf6', '#4c1d95');
    if (key.includes('announce')) return buildSvgPlaceholder(label, '#f59e0b', '#92400e');
    return buildSvgPlaceholder(label, '#64748b', '#111827');
  };

  const getCategoryInfo = (type) => {
    const key = (type || '').toString().toLowerCase();
    if (key.includes('program')) return { label: 'Programs', color: 'bg-green-100 text-green-700', Icon: BookOpen };
    if (key.includes('project')) return { label: 'Projects', color: 'bg-blue-100 text-blue-700', Icon: FolderOpen };
    if (key.includes('activity')) return { label: 'Activities', color: 'bg-purple-100 text-purple-700', Icon: Activity };
    return { label: 'Announcements', color: 'bg-red-100 text-red-700', Icon: Megaphone };
  };

  // Fetch featured announcements from database
  useEffect(() => {
    const fetchFeaturedAnnouncements = async () => {
      try {
        setLoadingFeatured(true);
        setErrorFeatured(null);
        
        const response = await getFeaturedAnnouncements(8); // Get up to 8 featured items
        
        if (response.success && response.data) {
          // Transform database data to match our carousel format
          const transformedData = response.data.map((announcement, index) => ({
            id: announcement.announcement_id,
            type: announcement.category === 'programs' ? 'Program' : 
                  announcement.category === 'projects' ? 'Project' : 
                  announcement.category === 'activities' ? 'Activity' : 'Announcement',
            title: announcement.title,
            description: announcement.summary || announcement.content?.substring(0, 200) + '...',
            image: announcement.image_url || `https://images.unsplash.com/photo-${1522202176988 + index}?q=80&w=1200&auto=format&fit=crop`,
            date: announcement.published_at ? new Date(announcement.published_at).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            }) : 'TBA',
            location: announcement.location || 'San Jose, Batangas',
            link: `/programs/${announcement.announcement_id}`,
            gradient: gradientOptions[index % gradientOptions.length]
          }));
          
          setFeaturedContent(transformedData);
        }
      } catch (error) {
        console.error('Error fetching featured announcements:', error);
        setErrorFeatured('Failed to load featured content');
        
        // Fallback to sample data if API fails
        setFeaturedContent([
          {
            id: 1,
            type: 'Featured Program',
            title: 'Youth Leadership Summit 2025',
            description: 'Join us for an empowering 3-day summit designed to develop leadership skills, civic engagement, and community impact among young leaders.',
            image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1200&auto=format&fit=crop',
            date: 'March 15-17, 2025',
            location: 'San Jose Convention Center',
            link: '/programs/leadership-summit',
            gradient: 'from-blue-600 via-purple-600 to-blue-800'
          }
        ]);
      } finally {
        setLoadingFeatured(false);
      }
    };

    fetchFeaturedAnnouncements();
  }, [featuredReloadKey]);

  // Fetch total Programs (category=programs) count
  useEffect(() => {
    const fetchProgramsCount = async () => {
      try {
        const res = await getAnnouncements({ page: 1, limit: 1, status: 'published', category: 'programs', sortBy: 'published_at', sortOrder: 'DESC' });
        const total = res?.pagination?.total ?? (Array.isArray(res?.data) ? res.data.length : 0);
        setProgramsCount(total);
      } catch (e) {
        setProgramsCount(0);
      }
    };
    fetchProgramsCount();
  }, []);

  // Pause/Resume handlers
  const handlePauseSurvey = async () => {
    if (!activeSurvey?.batchId) return;

    const confirmed = await showConfirmation({
      title: 'Pause Survey',
      message: 'Are you sure you want to pause this survey? Users will not be able to submit responses while paused.',
      confirmText: 'Pause Survey',
      cancelText: 'Cancel',
      type: 'warning'
    });

    if (!confirmed) return;

    try {
      setIsPauseResumeLoading(true);
      const result = await surveyBatchesService.pauseBatch(activeSurvey.batchId, 'Survey paused by admin');
      
      if (result.success) {
        // Update timestamp and refresh the survey data
        setLastUpdated(new Date());
        await refreshActiveSurvey();
      } else {
        console.error('Failed to pause survey:', result.message);
      }
    } catch (error) {
      console.error('Error pausing survey:', error);
    } finally {
      setIsPauseResumeLoading(false);
    }
  };

  const handleResumeSurvey = async () => {
    if (!activeSurvey?.batchId) return;

    const confirmed = await showConfirmation({
      title: 'Resume Survey',
      message: 'Are you sure you want to resume this survey? Users will be able to submit responses again.',
      confirmText: 'Resume Survey',
      cancelText: 'Cancel',
      type: 'success'
    });

    if (!confirmed) return;

    try {
      setIsPauseResumeLoading(true);
      const result = await surveyBatchesService.resumeBatch(activeSurvey.batchId);
      
      if (result.success) {
        // Update timestamp and refresh the survey data
        setLastUpdated(new Date());
        await refreshActiveSurvey();
      } else {
        console.error('Failed to resume survey:', result.message);
      }
    } catch (error) {
      console.error('Error resuming survey:', error);
    } finally {
      setIsPauseResumeLoading(false);
    }
  };

  // Check if user is admin
  const isAdmin = isAuthenticated && hasRole('Admin');

  // Smart refresh functions
  const refreshSurveyData = async () => {
    setIsRefreshing(true);
    try {
      // Refresh only the survey data without page reload
      await refreshActiveSurvey();
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error refreshing survey data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Refresh when user becomes active (focuses on page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && hasActiveSurvey) {
        // Page became visible, refresh data
        refreshSurveyData();
      }
    };

    const handleFocus = () => {
      if (hasActiveSurvey) {
        // Window focused, refresh data
        refreshSurveyData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [hasActiveSurvey]);

  // Scroll reveal refs
  const [surveyBannerRef, surveyBannerVisible] = useScrollReveal();
  const [statsRef, statsVisible] = useScrollReveal();
  const [servicesRef, servicesVisible] = useScrollReveal();
  const [featuredRef, featuredVisible] = useScrollReveal();
  
  // Real KPI data from database
  const kpis = statistics ? [
    { label: 'Registered Youth', value: statistics.activeYouth || 0, suffix: '', icon: Users, href: '/barangays' },
    { label: 'Featured Programs', value: programsCount || 0, suffix: '', icon: BookOpen, href: '/programs/featured' },
    { label: 'Barangays Served', value: statistics.totalBarangays || 0, suffix: '', icon: Heart, href: '/barangays' },
    { label: 'Events This Month', value: statistics.eventsThisMonth || 0, suffix: '', icon: Calendar, href: '/programs/this-month' },
  ] : [
    // Fallback data while loading
    { label: 'Registered Youth', value: 0, suffix: '', icon: Users, href: '/barangays' },
    { label: 'Featured Programs', value: programsCount || 0, suffix: '', icon: BookOpen, href: '/programs/featured' },
    { label: 'Barangays Served', value: 0, suffix: '', icon: Heart, href: '/barangays' },
    { label: 'Events This Month', value: 0, suffix: '', icon: Calendar, href: '/programs/this-month' },
  ];

  return (
    <PublicLayout>
      {/* Hero Section with Background Video */}
      <section className="relative overflow-hidden min-h-[100dvh] -mt-12 sm:mt-0">
        {/* Background video */}
        <video
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          muted
          loop
          playsInline
        >
          <source src={heroVideo} type="video/mp4" />
        </video>
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-black/60" aria-hidden="true" />

        {/* Foreground content - perfectly centered between fixed 64px top and bottom offsets */}
        <div className="relative z-10 min-h-[100dvh] flex flex-col">
          <div className="h-[0px] shrink-0" aria-hidden="true" />
          <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 flex items-center justify-center">
            <div className="text-center w-full">
              <img
                src={sanJoseLogo}
                alt="San Jose Logo"
                className="mx-auto mb-6 h-20 w-20 md:h-24 md:w-24 lg:h-28 lg:w-28 object-contain rounded-full bg-white/90 ring-2 ring-white/50 shadow-lg"
              />
              <h1 className="font-sans text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight mb-6">
                <span className="text-2xl md:text-3xl lg:text-4xl font-medium text-white/90">Welcome to</span>
                <br />
              Local Youth Development Office
            </h1>
              <div className="mx-auto mb-6 h-px w-32 bg-white/80" aria-hidden="true" />
              <p className="font-sans text-lg md:text-xl text-white/95 mb-4 font-medium">
              Municipality of San Jose, Batangas
            </p>
              <p className="text-base md:text-lg text-white/90 mb-8 max-w-2xl mx-auto italic font-sans">
              "Connect. Engage. Govern."
            </p>
              {/* Removed descriptive paragraph for a cleaner, more formal hero */}
            
            
          </div>
          </div>
          <div className="h-[90px] shrink-0" aria-hidden="true" />
        </div>
      </section>

      {/* Active Survey - Single Card Container */}
      <section className="relative z-20 -mt-28 md:-mt-40 lg:-mt-48 mb-10 md:mb-14">
        <div 
          ref={surveyBannerRef}
          className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-1000 ease-out ${
            surveyBannerVisible 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-8'
          }`}
        >
          <>
            {/* Loading State */}
            {surveyLoading && (
              <div className="group relative">
                <div className="relative rounded-3xl p-8 md:p-10 bg-gradient-to-br from-gray-50 via-white to-gray-50/80 ring-1 ring-gray-200 shadow-lg overflow-hidden">
                  <LoadingSpinner 
                    variant="spinner"
                    message="Loading survey information..." 
                    size="md"
                    color="blue"
                    height="h-32"
                  />
                </div>
              </div>
            )}

            {/* Error State */}
            {surveyError && !surveyLoading && (
              <div className="group relative">
                <div className="relative rounded-3xl p-8 md:p-10 bg-gradient-to-br from-gray-50 via-white to-gray-50/80 ring-1 ring-gray-200 shadow-lg overflow-hidden">
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                      <p className="text-red-600 mb-2">Failed to load survey information</p>
                      <p className="text-gray-500 text-sm">Please try refreshing the page</p>
                    </div>
                  </div>
                </div>
                    </div>
            )}

            {/* No Active Survey State */}
            {!surveyLoading && !surveyError && !hasActiveSurvey && (
              <div className="group relative">
                {/* Glow background */}
                <div className="absolute -inset-2 rounded-3xl bg-gradient-to-br from-amber-300/20 via-orange-200/15 to-yellow-300/20 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" aria-hidden="true" />
                {/* Card */}
                <div className="relative rounded-3xl p-8 md:p-10 bg-gradient-to-br from-gray-50 via-white to-gray-50/80 ring-1 ring-gray-200 shadow-lg transition-all duration-200 group-hover:shadow-xl group-hover:ring-gray-300 overflow-hidden">
                  {/* Subtle background pattern */}
                  <div className="absolute inset-0 opacity-5">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#24345A] to-transparent rounded-full -translate-y-32 translate-x-32" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-[#24345A] to-transparent rounded-full translate-y-24 -translate-x-24" />
                  </div>
                  <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-10">
                    
                    {/* Left side - No Survey Message */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 mb-5">
                        <div className="w-10 h-10 rounded-xl grid place-items-center bg-amber-50 text-amber-600 ring-1 ring-amber-200">
                          <ClipboardList className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <h3 className="text-xl font-bold text-gray-900">Survey Coming Soon</h3>
                          <span className="inline-flex items-center px-2.5 py-0.5 text-[11px] font-medium rounded-full bg-amber-100 text-amber-700 ring-1 ring-amber-200 w-fit">Upcoming</span>
                        </div>
                    </div>
                      <div className="space-y-3">
                        <p className="text-gray-600 text-sm leading-relaxed">
                          We're currently preparing our next youth demographic survey. Stay tuned for upcoming opportunities to participate and help shape our community programs.
                        </p>
                  </div>
                  
                      {/* Information */}
                  <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4 text-amber-600" />
                          <span>Next survey will be announced soon</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <MapPin className="w-4 h-4 text-amber-600" />
                          <span>San Jose, Batangas</span>
                        </div>
                    </div>
                    
                      <div className="pt-4 space-y-3">
                        <div className="inline-flex items-center px-4 py-2 bg-amber-50 text-amber-700 text-sm font-medium rounded-full ring-1 ring-amber-200">
                          <Clock className="w-4 h-4 mr-2" />
                          <span>Check back regularly</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5v-12h-5l5-5 5 5h-5v12z" />
                          </svg>
                          <span>Updates will appear here automatically</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Vertical separator */}
                    <div className="hidden md:block absolute left-1/2 top-6 bottom-6 w-px bg-gray-200 transform -translate-x-px"></div>

                    {/* Right side - Information */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 mb-5">
                        <div className="w-10 h-10 rounded-xl grid place-items-center bg-amber-50 text-amber-600 ring-1 ring-amber-200">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="flex flex-col gap-1">
                          <h3 className="text-xl font-semibold text-gray-900">About Our Surveys</h3>
                          <span className="inline-flex items-center px-2.5 py-0.5 text-[11px] font-medium rounded-full bg-gray-100 text-gray-600 ring-1 ring-gray-200 w-fit">Info</span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <p className="text-gray-600 text-sm leading-relaxed">
                          Our demographic surveys help us understand our youth population and create better programs for our community.
                        </p>
                      </div>
                      
                      {/* Benefits */}
                      <div className="space-y-4">
                        <div className="text-center py-4">
                          <div className="text-2xl md:text-3xl font-bold text-amber-600 mb-2">
                            <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div className="text-sm font-medium text-gray-600">Quick & Easy</div>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Takes only 5-10 minutes</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Helps improve youth programs</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Your voice matters</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Active Survey Content */}
            {!surveyLoading && !surveyError && hasActiveSurvey && (
              <div className="group relative">
                {/* Glow background */}
                <div className="absolute -inset-2 rounded-3xl bg-emerald-300/30 via-teal-200/25 to-sky-300/30 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" aria-hidden="true" />
                {/* Card */}
                <div className="relative rounded-3xl p-6 md:p-8 bg-gradient-to-br from-gray-50 via-white to-gray-50/80 ring-1 ring-gray-200 shadow-lg transition-all duration-200 group-hover:shadow-xl group-hover:ring-gray-300 overflow-hidden">
                  {/* Subtle background pattern */}
                  <div className="absolute inset-0 opacity-5">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#24345A] to-transparent rounded-full -translate-y-32 translate-x-32" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-[#24345A] to-transparent rounded-full translate-y-24 -translate-x-24" />
                    </div>
                  <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Left side - Survey Details */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 mb-5">
                        <div className="w-10 h-10 rounded-xl grid place-items-center bg-[#E7EBFF] text-[#24345A] ring-1 ring-gray-200">
                          <ClipboardList className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <h3 className="text-xl font-bold text-gray-900">{activeSurvey.batchName}</h3>
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 text-[11px] font-medium rounded-full ring-1 w-fit ${
                              activeSurvey.pausedAt 
                                ? 'bg-orange-100 text-orange-700 ring-orange-200' 
                                : 'bg-green-100 text-green-700 ring-green-200'
                            }`}>
                              {activeSurvey.pausedAt ? 'Paused' : 'Active Survey'}
                            </span>
                            {activeSurvey.pausedAt && (
                              <div className="flex items-center gap-1 text-xs text-orange-600">
                                <AlertCircle className="w-3 h-3" />
                                <span>Temporarily unavailable</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <p className="text-gray-600 text-sm leading-relaxed">
                          {activeSurvey.description || 'Participate in our official demographic survey to help shape youth programs and policies in our community.'}
                        </p>
                      </div>

                      {/* Survey details */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4 text-[#24345A]" />
                          <span>
                            {activeSurvey.startDate ? new Date(activeSurvey.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'TBA'} – 
                            {activeSurvey.endDate ? new Date(activeSurvey.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBA'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <MapPin className="w-4 h-4 text-[#24345A]" />
                          <span>San Jose, Batangas</span>
                </div>
            </div>
            
                      <div className="pt-4 space-y-3">
                        {/* Survey Button - Conditional based on paused state */}
                        {activeSurvey.pausedAt ? (
                          <div className="inline-flex items-center px-5 py-3 bg-gray-300 text-gray-500 text-sm font-medium rounded-full cursor-not-allowed">
                            <AlertCircle className="mr-2 w-4 h-4" />
                            Survey Temporarily Unavailable
                          </div>
                        ) : (
                <Link 
                  to="/survey" 
                            className="inline-flex items-center px-5 py-3 bg-[#24345A] text-white text-sm font-medium rounded-full hover:bg-[#1a2a47] transition-colors"
                >
                            Take Survey Now
                            <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
                        )}
                        
                        {/* Admin Controls */}
                        {isAdmin && (
                          <div className="flex items-center gap-2">
                            {activeSurvey.pausedAt ? (
                              <button
                                onClick={handleResumeSurvey}
                                disabled={isPauseResumeLoading}
                                className="inline-flex items-center px-3 py-2 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Play className="mr-1 w-3 h-3" />
                                {isPauseResumeLoading ? 'Resuming...' : 'Resume Survey'}
                              </button>
                            ) : (
                              <button
                                onClick={handlePauseSurvey}
                                disabled={isPauseResumeLoading}
                                className="inline-flex items-center px-3 py-2 bg-orange-600 text-white text-xs font-medium rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Pause className="mr-1 w-3 h-3" />
                                {isPauseResumeLoading ? 'Pausing...' : 'Pause Survey'}
                              </button>
                            )}
                          </div>
                        )}
                        
                        
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="w-4 h-4 text-[#24345A]" />
                          <span>Takes 5-10 minutes</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Vertical separator */}
                    <div className="hidden md:block absolute left-1/2 top-6 bottom-6 w-px bg-gray-200 transform -translate-x-px"></div>

                    {/* Right side - Participation Data */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-lg grid place-items-center bg-[#E7EBFF] text-[#24345A] ring-1 ring-gray-200">
                          <TrendingUp className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-gray-900">Participation Data</h3>
                            <button
                              onClick={refreshSurveyData}
                              disabled={isRefreshing}
                              className="p-1 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                              title="Refresh data"
                            >
                              <svg className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full bg-gray-100 text-gray-600 ring-1 ring-gray-200 w-fit">Real-time</span>
                            <span className="text-[9px] text-gray-500">
                              Updated: {lastUpdated.toLocaleTimeString('en-US', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-gray-600 text-xs leading-relaxed">
                          Real-time participation statistics and progress tracking.
                        </p>
                      </div>
                      
                      {/* Statistics - Compact */}
                      <div className="space-y-3">
                        <div className="text-center py-2">
                          <div className="text-2xl md:text-3xl font-bold text-[#24345A] mb-1">
                            <AnimatedNumber value={activeSurvey.statisticsTotalResponses || 0} />
                          </div>
                          <div className="text-xs font-medium text-gray-600">Participants</div>
                        </div>
                        
                        {/* Progress section - Compact */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-gray-700">Progress</span>
                            <span className="font-bold text-[#24345A]">{progressPct}%</span>
                          </div>
                          
                          {/* Progress bar */}
                          <div className="relative">
                            <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-[#E7EBFF] to-[#24345A] rounded-full transition-all duration-500 ease-out"
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                          </div>
                          
                          <div className="flex justify-between text-[10px] text-gray-500">
                            <span>0</span>
                            <span className="font-medium">Target: {(activeSurvey.statisticsTotalYouths || 0).toLocaleString()}</span>
                          </div>
                        </div>
                        
                        {/* Paused Info - Moved to Right Column */}
                        {activeSurvey.pausedAt && (
                          <div className="text-xs text-orange-600 bg-orange-50 px-3 py-2 rounded-lg border border-orange-200">
                            <div className="flex items-center gap-1 mb-1">
                              <AlertCircle className="w-3 h-3" />
                              <span className="font-medium">Survey Paused</span>
                            </div>
                            <p className="text-orange-700">
                              {activeSurvey.pausedReason || 'Survey is temporarily unavailable. Please check back later.'}
                            </p>
                            {activeSurvey.pausedAt && (
                              <p className="text-orange-600 mt-1">
                                Paused: {new Date(activeSurvey.pausedAt).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric', 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </p>
                            )}
                          </div>
                        )}
                </div>
              </div>
            </div>
          </div>
              </div>
            )}
          </>
        </div>
      </section>

      {/* Statistics Section - About Page Style */}
      <section className="pt-16 pb-8 md:py-16 bg-white relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-[#24345A] to-transparent rounded-full blur-xl" />
          <div className="absolute bottom-20 right-10 w-40 h-40 bg-gradient-to-tl from-[#24345A] to-transparent rounded-full blur-xl" />
          <div className="absolute top-1/2 left-1/2 w-24 h-24 bg-gradient-to-br from-[#E7EBFF] to-transparent rounded-full blur-lg" />
        </div>
        <div 
          ref={statsRef}
          className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-1000 ease-out ${
            statsVisible 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-8'
          }`}
        >
          {/* Section header like About page */}
          <div className="mb-10">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-[#E7EBFF] text-[#24345A] text-xs font-semibold uppercase tracking-wider mb-2">Statistics</div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">A Few Facts About Our Office</h2>
            <p className="text-gray-600 max-w-3xl">Quick figures that reflect our work with the youth of San Jose, Batangas.</p>
            <div className="mt-5 mb-10 h-[2px] w-full max-w-4xl bg-gradient-to-r from-[#E7EBFF] via-[#F1E9FF] to-[#FDE7F1] opacity-90 rounded-full" aria-hidden="true" />
          </div>

          {/* Cards grid like About page */}
          {statisticsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[1, 2, 3, 4].map((index) => (
                <div key={index} className="group relative">
                  <div className="relative rounded-3xl p-6 bg-gradient-to-br from-white via-gray-50/50 to-white ring-1 ring-gray-200 shadow-lg overflow-hidden">
                    <LoadingSpinner 
                      variant="spinner"
                      message="Loading..." 
                      size="sm"
                      color="blue"
                      height="h-32"
          />
        </div>
                </div>
              ))}
            </div>
          ) : statisticsError ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
              </div>
                <p className="text-red-600 mb-2">Failed to load statistics</p>
                <p className="text-gray-500 text-sm mb-4">Please try again</p>
              <button
                onClick={refreshStatistics}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                  Retry
              </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {kpis.map(({ label, value, suffix = '', icon: Icon, href }) => {
                const CardContent = () => (
                  <div className="group relative">
                    {/* Glow background */}
                    <div className="absolute -inset-2 rounded-3xl bg-emerald-300/30 via-teal-200/25 to-sky-300/30 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" aria-hidden="true" />
                    {/* Card */}
                    <div className={`relative rounded-3xl p-6 bg-gradient-to-br from-white via-gray-50/50 to-white ring-1 ring-gray-200 shadow-lg transition-all duration-300 group-hover:shadow-xl group-hover:ring-gray-300 overflow-hidden ${
                      href ? 'group-hover:scale-[1.02] cursor-pointer' : ''
                    }`}>
                      {/* Card background pattern */}
                      <div className="absolute inset-0 opacity-5">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-[#24345A] to-transparent rounded-full -translate-y-10 translate-x-10" />
                        <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-[#24345A] to-transparent rounded-full translate-y-8 -translate-x-8" />
                      </div>
                      <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-xl grid place-items-center bg-[#E7EBFF] text-[#24345A] ring-1 ring-gray-200">
                            <Icon className="w-5 h-5" />
                          </div>
                          <span className="inline-flex items-center px-2.5 py-0.5 text-[11px] font-medium rounded-full bg-gray-100 text-gray-600 ring-1 ring-gray-200">Stat</span>
                    </div>
                        <h3 className="mt-3 text-xl font-semibold text-gray-900">{label}</h3>
                        <div className="mt-4 text-3xl font-bold text-[#24345A]">
                        <AnimatedNumber value={value} suffix={suffix} />
                        </div>
                        <div className="mt-6 relative inline-flex items-center text-gray-400 group-hover:text-[#24345A] transition-colors w-32">
                          <span className="absolute left-0 text-sm font-medium opacity-0 transition-opacity duration-200 pointer-events-none group-hover:opacity-100">
                            {href ? 'View details' : 'Information'}
                          </span>
                          <ArrowRight className="w-5 h-5 transform transition-transform duration-200 group-hover:translate-x-20" />
                        </div>
                      </div>
                    </div>
                  </div>
                );

                return href ? (
                  <Link key={label} to={href} className="block">
                    <CardContent />
                  </Link>
                ) : (
                  <div key={label}>
                    <CardContent />
                </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

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
          <div className="mb-12">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-[#E7EBFF] text-[#24345A] text-xs font-semibold uppercase tracking-wider mb-4">Featured</div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Programs & Announcements</h2>
            <p className="text-gray-600 max-w-3xl text-lg">Stay updated with our latest programs, events, and important announcements for the youth community.</p>
          </div>

          {/* Loading State */}
          {loadingFeatured && (
            <div className="relative">
              <div className="grid grid-cols-12 gap-4 items-center">
                {/* Left placeholder */}
                <div className="col-span-2 hidden md:block">
                  <div className="relative rounded-2xl overflow-hidden bg-white ring-1 ring-gray-200 shadow-sm">
                    <div className="h-72 md:h-80 lg:h-[22rem] bg-gray-100">
                      <div className="w-full h-full bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 animate-[shimmer_1.5s_infinite] bg-[length:200%_100%]" />
              </div>
                  </div>
                </div>
                {/* Center placeholder */}
                <div className="col-span-12 md:col-span-8">
                  <div className="relative rounded-2xl overflow-hidden bg-white ring-1 ring-gray-200 shadow-sm">
                    <div className="h-96 md:h-[28rem] bg-gray-100">
                      <div className="w-full h-full bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 animate-[shimmer_1.5s_infinite] bg-[length:200%_100%]" />
                    </div>
                  </div>
                </div>
                {/* Right placeholder */}
                <div className="col-span-2 hidden md:block">
                  <div className="relative rounded-2xl overflow-hidden bg-white ring-1 ring-gray-200 shadow-sm">
                    <div className="h-72 md:h-80 lg:h-[22rem] bg-gray-100">
                      <div className="w-full h-full bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 animate-[shimmer_1.5s_infinite] bg-[length:200%_100%]" />
                    </div>
                  </div>
                </div>
              </div>
              {/* Temporary keyframes for shimmer */}
              <style dangerouslySetInnerHTML={{ __html: `@keyframes shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }` }} />
            </div>
          )}

          {/* Error State */}
          {errorFeatured && !loadingFeatured && (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-red-600 mb-2">Failed to load featured content</p>
                <p className="text-gray-500 text-sm mb-4">Please try again</p>
                <button
                  onClick={() => setFeaturedReloadKey((k) => k + 1)}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {/* Featured Content - Only show if we have data and not loading */}
          {!loadingFeatured && !errorFeatured && featuredContent.length > 0 && (
            <>
              {/* AWS-Style Multi-Card Layout */}
              <div className="relative">
                <div className="grid grid-cols-12 gap-4 items-center">
                  {visibleCards.map((card, gridIndex) => {
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
                              src={card.image || getFallbackImage(card.type, card.title)}
                              alt={card.title}
                              className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              loading="lazy"
                              decoding="async"
                              onError={(e) => { e.currentTarget.src = getFallbackImage(card.type, card.title); }}
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
                            {(() => { const { label, color, Icon } = getCategoryInfo(card.type); return (
                              <div className="absolute top-2 left-2 z-20">
                                <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${color}`}>
                                  <Icon className="w-3 h-3 mr-1" />
                                  <span className="hidden sm:inline">{label}</span>
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
                <div className="flex justify-center mt-8">
                  <div className="flex items-center bg-gray-900/90 text-white rounded-full shadow-lg px-5 py-2.5 gap-4">
                    <button
                      onClick={() => {
                        const newIndex = currentFeatured === 0 ? featuredContent.length - 1 : currentFeatured - 1;
                        navigateToCard(newIndex);
                      }}
                      className="p-2 hover:bg-white/10 rounded-full transition-colors"
                      aria-label="Previous"
                    >
                      <ArrowRight className="w-4 h-4 rotate-180" />
                    </button>
                    <div className="text-sm font-semibold tracking-wide">
                      {currentFeatured + 1} / {featuredContent.length}
                    </div>
                    <button
                      onClick={() => {
                        const newIndex = (currentFeatured + 1) % featuredContent.length;
                        navigateToCard(newIndex);
                      }}
                      className="p-2 hover:bg-white/10 rounded-full transition-colors"
                      aria-label="Next"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* No Content State */}
          {!loadingFeatured && !errorFeatured && featuredContent.length === 0 && (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-600 mb-2">No featured content available</p>
                <p className="text-gray-500 text-sm">Check back later for updates</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Services Section - About Page Style */}
      <section className="pt-8 pb-16 md:py-16 bg-white relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-[#24345A] to-transparent rounded-full blur-xl" />
          <div className="absolute bottom-20 right-10 w-40 h-40 bg-gradient-to-tl from-[#24345A] to-transparent rounded-full blur-xl" />
          <div className="absolute top-1/2 left-1/2 w-24 h-24 bg-gradient-to-br from-[#E7EBFF] to-transparent rounded-full blur-lg" />
        </div>
        <div 
          ref={servicesRef}
          className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-1000 ease-out ${
            servicesVisible 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-8'
          }`}
        >
          {/* Section header like About page */}
          <div className="mb-10">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-[#E7EBFF] text-[#24345A] text-xs font-semibold uppercase tracking-wider mb-2">Our Services</div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">Comprehensive Youth Services</h2>
            <p className="text-gray-600 max-w-3xl">Comprehensive youth development services designed to empower and engage the young people of San Jose, Batangas.</p>
            <div className="mt-5 mb-10 h-[2px] w-full max-w-4xl bg-gradient-to-r from-[#E7EBFF] via-[#F1E9FF] to-[#FDE7F1] opacity-90 rounded-full" aria-hidden="true" />
          </div>

          {/* Cards grid like About page */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: BookOpen, title: 'Youth Programs', desc: 'Educational and skill development programs to help youth reach their potential.', href: '/programs' },
              { icon: Users, title: 'SK Governance', desc: 'Sangguniang Kabataan leadership and governance training for young leaders.', href: '/sk-officials' },
              { icon: Calendar, title: 'Community Events', desc: 'Regular events and activities that bring youth together for fun and learning.', href: '/programs/this-month' },
            ].map(({ icon: Icon, title, desc, href }) => (
              <Link key={title} to={href} className="group relative block" aria-label={`${title} - Learn more`}>
                {/* Glow background */}
                <div className="absolute -inset-2 rounded-3xl bg-gradient-to-br from-emerald-300/30 via-teal-200/25 to-sky-300/30 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" aria-hidden="true" />
                {/* Card */}
                <div className="relative rounded-3xl p-6 bg-gray-50 ring-1 ring-gray-200 shadow-sm transition-shadow duration-200 group-hover:shadow-md">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl grid place-items-center bg-[#E7EBFF] text-[#24345A] ring-1 ring-gray-200">
                      <Icon className="w-5 h-5" />
              </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 text-[11px] font-medium rounded-full bg-gray-100 text-gray-600 ring-1 ring-gray-200">Service</span>
            </div>
                  <h3 className="mt-3 text-xl font-semibold text-gray-900">{title}</h3>
                  <p className="mt-2 text-gray-600 text-sm leading-relaxed">{desc}</p>
                  <div className="mt-6 relative inline-flex items-center text-gray-400 group-hover:text-[#24345A] transition-colors w-32">
                    <span className="absolute left-0 text-sm font-medium opacity-0 transition-opacity duration-200 pointer-events-none group-hover:opacity-100">Learn more</span>
                    <ArrowRight className="w-5 h-5 transform transition-transform duration-200 group-hover:translate-x-20" />
              </div>
            </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      

    </PublicLayout>
  );
};

export default Home;
