import React, { useEffect, useRef, useState } from 'react';
import { 
  Users, 
  BookOpen, 
  Heart, 
  Shield,
  Globe,
  Leaf,
  UserCheck,
  Building,
  Award,
  Briefcase,
  TreePine,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  User
} from 'lucide-react';
import PublicLayout from '../../components/layouts/PublicLayout';
import PageHero from '../../components/website/PageHero';
import heroVideo from '../../assets/media/hero.mp4';
import councilService from '../../services/councilService';

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

// Accordion component
const AccordionItem = ({ title, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="group relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative w-full flex items-center justify-between text-left py-3 sm:py-4 lg:py-5 border-b border-gray-200 text-gray-900 hover:text-[#24345A] transition-colors duration-200"
      >
        <span className="text-base sm:text-lg font-semibold">{title}</span>
        <ChevronDown className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-600 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      <div className={`transition-[max-height,opacity] duration-300 ease-out ${open ? 'max-h-64 md:max-h-80 overflow-y-scroll pr-2 opacity-100' : 'max-h-0 overflow-hidden opacity-0'}`} style={{ scrollbarWidth: 'thin', msOverflowStyle: 'auto' }}>
        <div className="py-3 sm:py-4 border-b border-gray-200 text-gray-600">
          {children}
        </div>
      </div>
    </div>
  );
};

// Avatar component with profile picture support and default profile icon fallback
const Avatar = ({ name, src, version, size = 40 }) => {
  const getFileUrl = (p) => {
    if (!p || p === '' || p === null || p === undefined) return '';
    // Don't treat names or non-URL strings as valid image sources
    if (typeof p !== 'string') return '';
    // Must be a URL or a path starting with /
    if (!/^https?:\/\//i.test(p) && !p.startsWith('/')) return '';
    if (/^https?:\/\//i.test(p)) return p;
    let base = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/?api\/?$/, '');
    if (!base && window?.location && /localhost|127\.0\.0\.1/.test(window.location.hostname)) {
      base = 'http://localhost:3001';
    }
    let url = `${base}${p}`;
    if (version && !/\?/.test(url)) url += `?v=${encodeURIComponent(version)}`;
    return url;
  };
  const [errored, setErrored] = useState(false);
  
  useEffect(() => { 
    setErrored(false);
  }, [src, version]);
  
  // Check if src is valid - must be a string, not empty, and look like a URL/path
  const isValidPhotoSrc = src && 
    typeof src === 'string' && 
    src.trim() !== '' && 
    (src.startsWith('/') || /^https?:\/\//i.test(src));
  
  const url = isValidPhotoSrc ? getFileUrl(src) : '';
  const shouldShowImage = isValidPhotoSrc && url && url.trim() !== '' && !errored;
  
  // Always show default icon if no valid photo
  if (!shouldShowImage) {
    const iconSize = Math.max(size * 0.5, 20);
    return (
      <div 
        className="rounded-full bg-gray-100 flex items-center justify-center shadow-sm border-2 border-gray-200"
        style={{ 
          width: size, 
          height: size, 
          minWidth: size, 
          minHeight: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          fontSize: 0,
          lineHeight: 0,
          color: 'transparent'
        }}
      >
        <User 
          className="text-gray-400"
          size={iconSize}
          strokeWidth={2.5}
          style={{ 
            display: 'block',
            flexShrink: 0,
            pointerEvents: 'none'
          }}
        />
      </div>
    );
  }
  
  // Show image if valid photo exists
  return (
    <img
      src={url}
      alt={name || 'Avatar'}
      className="rounded-full object-cover shadow-sm"
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
      onError={() => setErrored(true)}
    />
  );
};

const LYDOCouncil = () => {
  // Helper to resolve absolute URLs for images
  const getFileUrl = (p) => {
    if (!p) return '';
    if (/^https?:\/\//i.test(p)) return p;
    let base = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/?api\/?$/, '');
    if (!base) {
      if (typeof window !== 'undefined' && /localhost|127\.0\.0\.1/.test(window.location.hostname)) {
        base = 'http://localhost:3001';
      }
    }
    return `${base}${p}`;
  };

  // Try to extract a profile photo URL from various field shapes
  const getOfficerPhoto = (r) => {
    if (!r || typeof r !== 'object') return '';
    return (
      r.profile_picture ||
      r.profilePicture ||
      r.photo_url ||
      r.photo ||
      r.avatar ||
      r.image ||
      (r.user && (r.user.profile_picture || r.user.profilePicture)) ||
      (r.account && (r.account.profile_picture || r.account.profilePicture)) ||
      (r.profile && (r.profile.profile_picture || r.profile.profilePicture)) ||
      ''
    );
  };

  // Scroll reveal refs
  const [overviewRef, overviewVisible] = useScrollReveal();
  const [membersRef, membersVisible] = useScrollReveal();
  const [structureRef, structureVisible] = useScrollReveal();
  const [federationRef, federationVisible] = useScrollReveal();
  const [contactRef, contactVisible] = useScrollReveal();

  // Carousel state
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const carouselRef = useRef(null);
  const intervalRef = useRef(null);

  // Council images for carousel (fetched from page settings)
  const [councilImages, setCouncilImages] = useState([]);
  const [imagesLoading, setImagesLoading] = useState(true);
  const [imagesError, setImagesError] = useState(null);
  const [imagesReloadKey, setImagesReloadKey] = useState(0);

  // Auto-play functionality
  useEffect(() => {
    // Load hero images
    (async () => {
      try {
        setImagesLoading(true);
        setImagesError(null);
        const page = await councilService.getCouncilPage();
        const imgs = [page.hero_url_1, page.hero_url_2, page.hero_url_3]
          .filter(Boolean)
          .map((u, i) => ({ src: getFileUrl(u), alt: `Council hero ${i+1}`, title: '', description: '' }));
        setCouncilImages(imgs);
      } catch (e) {
        setImagesError(e?.message || 'Failed to load hero images');
        setCouncilImages([]);
      } finally {
        setImagesLoading(false);
      }
    })();

    if (isAutoPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentSlide((prev) => (councilImages.length ? (prev + 1) % councilImages.length : 0));
      }, 4000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isAutoPlaying, councilImages.length, imagesReloadKey]);

  // Touch/swipe support
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const handleTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      nextSlide();
    } else if (isRightSwipe) {
      prevSlide();
    }
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % councilImages.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + councilImages.length) % councilImages.length);
  };

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  // Council members data (fetched)
  const [councilMembers, setCouncilMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [membersError, setMembersError] = useState(null);
  const [membersReloadKey, setMembersReloadKey] = useState(0);

  useEffect(() => {
    const loadMembers = async () => {
      try {
        setLoadingMembers(true);
        setMembersError(null);
        const data = await councilService.getCouncilMembers();
        // Accept common response shapes: array, {data: []}, {members: []}, {rows: []}
        const raw = Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
            ? data.data
            : Array.isArray(data?.members)
              ? data.members
              : Array.isArray(data?.rows)
                ? data.rows
                : [];

        const normalizeMember = (m) => {
          // Handle role as string or object
          const roleObj = typeof m?.role === 'object' && m.role !== null ? m.role : null;
          const roleName = roleObj?.name || roleObj?.title || m?.role || m?.position || '';
          const roleDescFromObj = roleObj?.description || roleObj?.desc || roleObj?.details || '';

          const roleDesc =
            m?.role_description ||
            m?.roleDescription ||
            m?.role_desc ||
            m?.role_details ||
            m?.roleDetails ||
            m?.role_info ||
            m?.roleInfo ||
            m?.role_text ||
            m?.roleText ||
            roleDescFromObj ||
            m?.description ||
            '';

          return {
            ...m,
            // Build a name if missing
            name:
              m?.name ||
              [
                m?.firstName || m?.first_name || '',
                m?.middleName || m?.middle_name || '',
                m?.lastName || m?.last_name || ''
              ]
                .filter(Boolean)
                .join(' ')
                .replace(/\s+/g, ' ')
                .trim(),
            // Role/position fallback
            role: String(roleName || '').trim(),
            // Focus can be stored under various keys
            focus: m?.focus || m?.focus_area || m?.focusArea || m?.sector || '',
            // Normalized role description
            role_description: String(roleDesc || '').trim()
          };
        };
        const normalized = raw.map(normalizeMember);
        setCouncilMembers(normalized);
      } catch (e) {
        setMembersError(e?.message || 'Failed to load council members');
      } finally {
        setLoadingMembers(false);
      }
    };
    loadMembers();
  }, [membersReloadKey]);

  // Map focus/role text to an icon to show in the member card
  const getFocusIcon = (focus, role) => {
    const key = String(focus || role || '').toLowerCase();
    if (key.includes('education')) return BookOpen;
    if (key.includes('health')) return Heart;
    if (key.includes('governance')) return Shield;
    if (key.includes('global') || key.includes('mobility')) return Globe;
    if (key.includes('environment')) return Leaf;
    if (key.includes('inclusion') || key.includes('equity')) return UserCheck;
    if (key.includes('citizenship')) return Building;
    if (key.includes('security') || key.includes('peace')) return Award;
    if (key.includes('economic') || key.includes('entrepreneur')) return Briefcase;
    if (key.includes('agri')) return TreePine;
    return Users;
  };

  // SK Federation Officers data
  const [federationOfficers, setFederationOfficers] = useState([]);
  const [loadingFederation, setLoadingFederation] = useState(true);
  const [federationError, setFederationError] = useState(null);
  const [federationReloadKey, setFederationReloadKey] = useState(0);

  useEffect(() => {
    const loadFederation = async () => {
      try {
        setLoadingFederation(true);
        setFederationError(null);
        const res = await fetch('/api/sk-federation/public/current');
        if (!res.ok) {
          setFederationOfficers([]);
          return;
        }
        const data = await res.json();
        const rows = Array.isArray(data?.data) ? data.data : [];
        if (!rows.length) {
          setFederationOfficers([]);
          return;
        }
        const order = ['President', 'Vice President', 'Secretary', 'Treasurer', 'Auditor', 'PRO', 'Sergeant-at-Arms', 'Sergeant at Arms'];
        const toName = (r) => (
          (r.name ||
            [r.first_name, r.middle_name, r.last_name].filter(Boolean).join(' ') ||
            [r.firstName, r.middleName, r.lastName].filter(Boolean).join(' '))
            .replace(/\s+/g, ' ') || ''
        ).trim();
        const mapBarangay = (r) => {
          // Prioritize barangay_name from the JOIN, fallback to other fields
          return r.barangay_name || r.barangay || '';
        };
        const normalized = order
          .slice(0, 7)
          .map((pos) => {
            const found = rows.find(r => (r.position || '').toLowerCase() === pos.toLowerCase());
            if (!found) {
              return { 
                position: pos.replace('Sergeant-at-Arms', 'Sergeant at Arms'), 
                name: '—', 
                barangay: '—', 
                photo: '',
                updatedAt: null
              };
            }
            const photo = getOfficerPhoto(found);
            const name = toName(found);
            const barangay = mapBarangay(found);
            // Ensure photo is a valid URL/path, not a name or other text
            const validPhoto = photo && typeof photo === 'string' && photo.trim() !== '' && 
              (photo.startsWith('/') || /^https?:\/\//i.test(photo)) ? photo : '';
            return { 
              position: pos.replace('Sergeant-at-Arms', 'Sergeant at Arms'), 
              name: name || '—', 
              barangay: barangay || '—', 
              photo: validPhoto,
              updatedAt: found.updated_at || found.updatedAt || null
            };
          });
        setFederationOfficers(normalized);
      } catch (e) {
        setFederationError(e?.message || 'Failed to load SK Federation officers');
        setFederationOfficers([]);
      } finally {
        setLoadingFederation(false);
      }
    };
    loadFederation();
  }, [federationReloadKey]);

  return (
    <PublicLayout>
      <PageHero
        badge="LYDO Council"
        title="LYDO Council"
        subtitle="Meet the Local Youth Development Council members representing diverse sectors and advocacy areas in San Jose, Batangas"
        description="Discover the dedicated individuals who guide youth development initiatives and represent various sectors across our community."
      />

      {/* Council Overview */}
      <section className="pt-16 pb-8 md:py-16 bg-white">
        <div 
          ref={overviewRef}
          className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-1000 ease-out ${
            overviewVisible 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-8'
          }`}
        >
          {/* Overline badge */}
          <div className="inline-flex items-center px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-[#E7EBFF] text-[#24345A] text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-2 sm:mb-3 lg:mb-4">About LYDC</div>
          {/* Section heading */}
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2 sm:mb-3 lg:mb-4">Council Overview</h2>
          <p className="text-sm sm:text-base lg:text-lg text-gray-700 max-w-3xl">The Local Youth Development Council serves as a collaborative body that guides youth development initiatives and ensures comprehensive representation across all sectors.</p>
          {/* Refined divider */}
          <div className="mt-4 sm:mt-5 mb-6 sm:mb-8 lg:mb-10 h-[1px] sm:h-[2px] w-full max-w-4xl bg-gradient-to-r from-[#E7EBFF] via-[#F1E9FF] to-[#FDE7F1] opacity-90 rounded-full" aria-hidden="true" />

          {/* Two-column content */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 items-start">
            <div className="order-2 md:order-1">
              <div>
                <h3 className="text-xl sm:text-2xl md:text-3xl font-semibold text-gray-900 mb-2 sm:mb-3">Our Purpose</h3>
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed mb-4 sm:mb-6">
                  The LYDC serves as a collaborative body that supports youth development initiatives in San Jose, Batangas. It brings together SK leaders and sectoral representatives to guide programs aligned with national and local youth priorities.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="bg-gray-50 rounded-lg sm:rounded-xl p-3 sm:p-4 ring-1 ring-gray-200">
                    <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-1">{councilMembers.length} Members</h4>
                    <p className="text-xs sm:text-sm text-gray-600">Diverse sectoral representation</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg sm:rounded-xl p-3 sm:p-4 ring-1 ring-gray-200">
                    <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-1">{[...new Set(councilMembers.map(m => (m.role || '')).filter(Boolean))].length} Focus Areas</h4>
                    <p className="text-xs sm:text-sm text-gray-600">Comprehensive advocacy coverage</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="order-1 md:order-2">
              <div 
                ref={carouselRef}
                className="relative rounded-xl sm:rounded-2xl ring-1 ring-gray-200 overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseEnter={() => setIsAutoPlaying(false)}
                onMouseLeave={() => setIsAutoPlaying(true)}
              >
                {/* Carousel Container */}
                <div className="relative aspect-[16/9] bg-gradient-to-br from-[#E7EBFF] via-[#F1E9FF] to-[#FDE7F1] overflow-hidden">
                  {/* Loading State */}
                  {imagesLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#E7EBFF] via-[#F1E9FF] to-[#FDE7F1]">
                      <div className="text-center">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 border-4 border-[#24345A]/20 border-t-[#24345A] rounded-full animate-spin" />
                        <p className="text-[#24345A] text-sm font-medium">Loading images...</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Error State */}
                  {!imagesLoading && imagesError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#E7EBFF] via-[#F1E9FF] to-[#FDE7F1]">
                      <div className="text-center p-4">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <p className="text-red-600 mb-2 text-sm">Failed to load images</p>
                        <p className="text-gray-500 text-xs mb-4">Images will not be displayed</p>
                        <button
                          onClick={() => setImagesReloadKey(k => k + 1)}
                          className="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <RefreshCw className="w-3 h-3 mr-2" />
                          Retry
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Empty State */}
                  {!imagesLoading && !imagesError && councilImages.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#E7EBFF] via-[#F1E9FF] to-[#FDE7F1]">
                      <div className="text-center p-4">
                        <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 text-sm font-medium">No images configured</p>
                        <p className="text-gray-500 text-xs">Please configure hero images in admin settings</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Slides */}
                  {!imagesLoading && !imagesError && councilImages.length > 0 && (
                    <div 
                      className="flex transition-transform duration-500 ease-in-out h-full"
                      style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                    >
                      {councilImages.map((image, index) => (
                        <div key={index} className="w-full h-full flex-shrink-0 relative">
                          <img
                            src={image.src}
                            alt={image.alt}
                            className="absolute inset-0 w-full h-full object-cover"
                            loading="lazy"
                          />
                          {/* Image Overlay with Title and Description */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 text-white">
                            <h4 className="text-base sm:text-xl font-semibold mb-1 sm:mb-2">{image.title}</h4>
                            <p className="text-xs sm:text-sm opacity-90">{image.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Navigation Arrows - Only show if images available */}
                  {councilImages.length > 1 && (
                    <>
                      <button
                        onClick={prevSlide}
                        className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/90 hover:bg-white shadow-lg flex items-center justify-center text-gray-700 hover:text-[#24345A] transition-all duration-200 hover:scale-110 z-30"
                        aria-label="Previous image"
                      >
                        <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                      <button
                        onClick={nextSlide}
                        className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/90 hover:bg-white shadow-lg flex items-center justify-center text-gray-700 hover:text-[#24345A] transition-all duration-200 hover:scale-110 z-30"
                        aria-label="Next image"
                      >
                        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>

                      {/* Slide Indicators */}
                      <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 flex space-x-1.5 sm:space-x-2 z-30">
                        {councilImages.map((_, index) => (
                          <button
                            key={index}
                            onClick={() => goToSlide(index)}
                            className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full transition-all duration-200 ${
                              index === currentSlide 
                                ? 'bg-white scale-125' 
                                : 'bg-white/50 hover:bg-white/75'
                            }`}
                            aria-label={`Go to slide ${index + 1}`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Council Members */}
      <section className="pt-8 pb-8 md:py-16 bg-white">
        <div 
          ref={membersRef}
          className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-1000 ease-out delay-200 ${
            membersVisible 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="inline-flex items-center px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-[#E7EBFF] text-[#24345A] text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-2 sm:mb-3 lg:mb-4">Leadership</div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2 sm:mb-3 lg:mb-4">Council Members</h2>
          <p className="text-sm sm:text-base lg:text-lg text-gray-600 max-w-3xl">Meet the dedicated individuals who represent various sectors and advocate for youth development across San Jose, Batangas.</p>
          <div className="mt-4 sm:mt-5 mb-6 sm:mb-8 lg:mb-10 h-[1px] sm:h-[2px] w-full max-w-4xl bg-gradient-to-r from-[#E7EBFF] via-[#F1E9FF] to-[#FDE7F1] opacity-90 rounded-full" aria-hidden="true" />
          
          {/* Loading State */}
          {loadingMembers && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="group relative">
                  <div className="relative rounded-2xl sm:rounded-3xl p-4 sm:p-6 bg-gray-50 ring-1 ring-gray-200 shadow-sm">
                    <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gray-200 animate-pulse" />
                      <div className="h-5 w-20 bg-gray-200 rounded-full animate-pulse" />
                    </div>
                    <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-2" />
                    <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-2" />
                    <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Error State */}
          {!loadingMembers && membersError && (
            <div className="flex items-center justify-center py-12 sm:py-16">
              <div className="text-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 sm:w-8 sm:h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-red-600 mb-2 text-sm sm:text-base">Failed to load council members</p>
                <p className="text-gray-500 text-xs sm:text-sm mb-4">{membersError}</p>
                <button
                  onClick={() => setMembersReloadKey(k => k + 1)}
                  className="inline-flex items-center px-3 py-2 sm:px-4 sm:py-2 bg-blue-600 text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry
                </button>
              </div>
            </div>
          )}
          
          {/* Empty State */}
          {!loadingMembers && !membersError && councilMembers.length === 0 && (
            <div className="flex items-center justify-center py-12 sm:py-16">
              <div className="text-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
                </div>
                <p className="text-gray-600 mb-2 text-sm sm:text-base">No council members available</p>
                <p className="text-gray-500 text-xs sm:text-sm">Members will be displayed when added</p>
              </div>
            </div>
          )}
          
          {/* Members Grid */}
          {!loadingMembers && !membersError && councilMembers.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {councilMembers.map((member, index) => (
                <div key={index} className="group relative">
                  {/* Accent glow */}
                  <div className="absolute -inset-1 sm:-inset-2 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-emerald-300/25 via-emerald-200/20 to-emerald-300/25 opacity-0 blur-lg transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" aria-hidden="true" />
                  {/* Card */}
                  <div className="relative rounded-2xl p-5 sm:p-6 bg-white ring-1 ring-gray-200 shadow-[0_6px_18px_rgba(2,6,23,0.06)] transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
                    {/* Header */}
                    <div className="flex items-start gap-3 sm:gap-3.5">
                      {(() => { const Icon = getFocusIcon(member.focus, member.role); return (
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl grid place-items-center bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100 flex-shrink-0">
                          <Icon className="w-5 h-5" />
                        </div>
                      ); })()}
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 leading-snug truncate">{member.name}</h3>
                        <div className="mt-1 flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-medium bg-gray-100 text-gray-700 ring-1 ring-gray-200">
                            {member.role || 'Member'}
                          </span>
                          {member.focus && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-medium bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                              {member.focus}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Divider */}
                    {(member.role_description || member.description) && (
                      <div className="my-4 h-px bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100" />
                    )}

                    {/* Description */}
                    {(member.role_description || member.description) && (
                      <p className="text-gray-600 text-[12px] sm:text-sm leading-relaxed line-clamp-3">
                        {member.role_description || member.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Council Structure */}
      <section className="pt-8 pb-8 md:py-16 bg-white">
        <div 
          ref={structureRef}
          className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-1000 ease-out delay-300 ${
            structureVisible 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="rounded-2xl sm:rounded-3xl bg-white ring-1 ring-gray-200 p-4 sm:p-6 md:p-8 lg:p-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 lg:gap-10">
              {/* Left intro */}
              <div>
                <div className="inline-flex items-center px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-[#E7EBFF] text-[#24345A] text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-2 sm:mb-3">Structure</div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2 sm:mb-3 lg:mb-4">Council Structure</h2>
                <p className="text-sm sm:text-base text-gray-600 max-w-xl">The LYDC is organized into leadership roles and sectoral representatives, each focusing on specific advocacy areas for comprehensive youth development.</p>
                <div className="mt-4 sm:mt-5 mb-4 sm:mb-6 h-[1px] sm:h-[2px] w-full max-w-xl bg-gradient-to-r from-[#E7EBFF] via-[#F1E9FF] to-[#FDE7F1] opacity-90 rounded-full" aria-hidden="true" />
              </div>
              {/* Right: accordions */}
              <div className="space-y-2 sm:space-y-3">
                {/* Loading State */}
                {loadingMembers && (
                  <div className="space-y-4">
                    <div className="animate-pulse">
                      <div className="h-6 w-32 bg-gray-200 rounded mb-3" />
                      <div className="space-y-2">
                        <div className="h-12 w-full bg-gray-100 rounded" />
                        <div className="h-12 w-full bg-gray-100 rounded" />
                      </div>
                    </div>
                    <div className="animate-pulse">
                      <div className="h-6 w-40 bg-gray-200 rounded mb-3" />
                      <div className="space-y-2">
                        <div className="h-10 w-full bg-gray-100 rounded" />
                        <div className="h-10 w-full bg-gray-100 rounded" />
                        <div className="h-10 w-full bg-gray-100 rounded" />
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Error State */}
                {!loadingMembers && membersError && (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-red-600 text-sm font-medium mb-1">Failed to load structure</p>
                    <p className="text-gray-500 text-xs mb-3">{membersError}</p>
                    <button
                      onClick={() => setMembersReloadKey(k => k + 1)}
                      className="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <RefreshCw className="w-3 h-3 mr-2" />
                      Retry
                    </button>
                  </div>
                )}
                
                {/* Empty State */}
                {!loadingMembers && !membersError && councilMembers.length === 0 && (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">No council structure available</p>
                  </div>
                )}
                
                {/* Success State */}
                {!loadingMembers && !membersError && councilMembers.length > 0 && (
                  <>
                    <AccordionItem title="Leadership" defaultOpen variant="faq">
                      <div className="space-y-2 sm:space-y-3">
                        {councilMembers
                          .filter(member => member.role === 'Chairperson' || member.role === 'Vice Chairperson')
                          .map((member, index) => (
                            <div key={index} className="flex items-center gap-2 sm:gap-3">
                              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-[#24345A]" />
                              <div>
                                <p className="text-sm sm:text-base font-semibold text-gray-900">{member.name}</p>
                                <p className="text-xs sm:text-sm text-gray-600">{member.role} - {member.role_description || member.focus || member.description}</p>
                              </div>
                            </div>
                          ))}
                        {councilMembers.filter(member => member.role === 'Chairperson' || member.role === 'Vice Chairperson').length === 0 && (
                          <p className="text-gray-500 text-sm italic">No leadership positions assigned</p>
                        )}
                      </div>
                    </AccordionItem>
                    <AccordionItem title="Sectoral Representatives" variant="faq">
                      <div className="space-y-1.5 sm:space-y-2">
                        {councilMembers
                          .filter(member => member.role !== 'Chairperson' && member.role !== 'Vice Chairperson')
                          .map((member, index) => (
                            <div key={index} className="flex items-center gap-2 sm:gap-3 py-1.5 sm:py-2">
                              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#24345A] flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{member.name}</p>
                                <p className="text-[10px] sm:text-xs text-gray-600 truncate">{member.role_description || member.focus}</p>
                              </div>
                            </div>
                          ))}
                        {councilMembers.filter(member => member.role !== 'Chairperson' && member.role !== 'Vice Chairperson').length === 0 && (
                          <p className="text-gray-500 text-sm italic">No sectoral representatives assigned</p>
                        )}
                      </div>
                    </AccordionItem>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SK Federation Officers */}
      <section className="pt-8 pb-8 md:py-16 bg-white">
        <div 
          ref={federationRef}
          className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-1000 ease-out delay-400 ${
            federationVisible 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="inline-flex items-center px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-[#E7EBFF] text-[#24345A] text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-2 sm:mb-3 lg:mb-4">SK Federation</div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2 sm:mb-3 lg:mb-4">SK Federation Officers</h2>
          <p className="text-sm sm:text-base lg:text-lg text-gray-600 max-w-3xl">Meet the current officers of the Sangguniang Kabataan Federation in San Jose, Batangas.</p>
          <div className="mt-4 sm:mt-5 mb-6 sm:mb-8 lg:mb-10 h-[1px] sm:h-[2px] w-full max-w-4xl bg-gradient-to-r from-[#E7EBFF] via-[#F1E9FF] to-[#FDE7F1] opacity-90 rounded-full" aria-hidden="true" />
          
          {/* Loading State */}
          {loadingFederation && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="group relative">
                  <div className="relative rounded-2xl sm:rounded-3xl p-4 sm:p-6 bg-gray-50 ring-1 ring-gray-200 shadow-sm">
                    <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gray-200 animate-pulse" />
                      <div className="h-5 w-20 bg-gray-200 rounded-full animate-pulse" />
                    </div>
                    <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-2" />
                    <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Error State */}
          {!loadingFederation && federationError && (
            <div className="flex items-center justify-center py-12 sm:py-16">
              <div className="text-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 sm:w-8 sm:h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-red-600 mb-2 text-sm sm:text-base">Failed to load SK Federation officers</p>
                <p className="text-gray-500 text-xs sm:text-sm mb-4">{federationError}</p>
                <button
                  onClick={() => setFederationReloadKey(k => k + 1)}
                  className="inline-flex items-center px-3 py-2 sm:px-4 sm:py-2 bg-blue-600 text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry
                </button>
              </div>
            </div>
          )}
          
          {/* Empty State */}
          {!loadingFederation && !federationError && federationOfficers.length === 0 && (
            <div className="flex items-center justify-center py-12 sm:py-16">
              <div className="text-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
                </div>
                <p className="text-gray-600 mb-2 text-sm sm:text-base">No SK Federation officers available</p>
                <p className="text-gray-500 text-xs sm:text-sm">Officers will be displayed when added</p>
              </div>
            </div>
          )}
          
          {/* Officers Grid */}
          {!loadingFederation && !federationError && federationOfficers.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {federationOfficers.map((officer, index) => (
                officer.name !== '—' ? (
                  <div key={index} className="group relative">
                    {/* Accent glow */}
                    <div className="absolute -inset-1 sm:-inset-2 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-green-300/25 via-emerald-200/20 to-green-300/25 opacity-0 blur-lg transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" aria-hidden="true" />
                    {/* Card */}
                    <div className="relative rounded-2xl p-5 sm:p-6 bg-white ring-1 ring-gray-200 shadow-[0_6px_18px_rgba(2,6,23,0.06)] transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
                      {/* Header with Avatar */}
                      <div className="flex items-start gap-3 sm:gap-3.5 mb-4">
                        <div className="flex-shrink-0">
                          <Avatar 
                            name={officer.name} 
                            src={officer.photo || ''} 
                            version={officer.updatedAt} 
                            size={56} 
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-base sm:text-lg font-semibold text-gray-900 leading-snug truncate">{officer.name}</h3>
                          <div className="mt-1 flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-medium bg-green-100 text-green-700 ring-1 ring-green-200">
                              {officer.position}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Divider */}
                      {officer.barangay && officer.barangay !== '—' && (
                        <div className="my-4 h-px bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100" />
                      )}

                      {/* Barangay */}
                      {officer.barangay && officer.barangay !== '—' && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Building className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <p className="text-[12px] sm:text-sm leading-relaxed truncate">{officer.barangay}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null
              ))}
            </div>
          )}
        </div>
      </section>

      
    </PublicLayout>
  );
};

export default LYDOCouncil;
