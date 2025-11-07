import React, { useEffect, useRef, useState } from 'react';
import { 
  Users, 
  Phone, 
  MapPin,
  Search,
  ChevronDown,
  Mail,
  Clock,
  Building,
  User
} from 'lucide-react';
import PublicLayout from '../../components/layouts/PublicLayout';
import PageHero from '../../components/website/PageHero';
import heroVideo from '../../assets/media/hero.mp4';

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

// Avatar component with profile picture support and default profile icon fallback
const Avatar = ({ name, src, version, size = 40, iconSize = 'default' }) => {
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
  const [imageDimensions, setImageDimensions] = useState(null);
  
  useEffect(() => { 
    setErrored(false);
    setImageDimensions(null);
  }, [src, version]);
  
  // Check if src is valid - must be a string, not empty, and look like a URL/path
  const isValidPhotoSrc = src && 
    typeof src === 'string' && 
    src.trim() !== '' && 
    (src.startsWith('/') || /^https?:\/\//i.test(src));
  
  const url = isValidPhotoSrc ? getFileUrl(src) : '';
  const shouldShowImage = isValidPhotoSrc && url && url.trim() !== '' && !errored;
  
  // Handle image load to check if it's a valid portrait/square image
  const handleImageLoad = (e) => {
    const img = e.target;
    const width = img.naturalWidth;
    const height = img.naturalHeight;
    setImageDimensions({ width, height });
    
    // If image is extremely wide (landscape) or extremely tall, treat as invalid
    // Profile pictures should be roughly square or portrait oriented
    // Reject if width is more than 2.5x height (very wide landscape) or height is more than 3.5x width (very tall)
    // Made less strict to avoid rejecting valid profile pictures
    if (width > 0 && height > 0) {
      const aspectRatio = width / height;
      if (aspectRatio > 2.5 || aspectRatio < 0.29) {
        // This looks like a landscape or very tall image, not a profile picture
        setErrored(true);
        return;
      }
    }
  };
  
  // Determine icon size based on iconSize prop or default
  // 'small' for councilors (32-36px circles), 'default' for chairperson (40-48px circles)
  // 'compact' for smaller chairperson cards (44-56px circles)
  let iconSizeClass;
  if (iconSize === 'small') {
    iconSizeClass = 'w-[32%] h-[32%] sm:w-4 sm:h-4'; // Smaller icon for small avatars (32-36px circles)
  } else if (iconSize === 'compact') {
    iconSizeClass = 'w-[30%] h-[30%] sm:w-5 sm:h-5'; // Compact icon for medium avatars (smaller)
  } else {
    iconSizeClass = 'w-1/2 h-1/2 sm:w-8 sm:h-8'; // Default size for larger avatars
  }
  
  // Always show default icon if no valid photo or error
  if (!shouldShowImage) {
    return (
      <div 
        className="w-full h-full rounded-full bg-gray-100 flex items-center justify-center shadow-sm border-2 border-gray-200"
        style={{ 
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
          className={`text-gray-400 ${iconSizeClass}`}
          strokeWidth={iconSize === 'small' ? 1.5 : iconSize === 'compact' ? 2 : 2.5}
          style={{ 
            display: 'block',
            flexShrink: 0,
            pointerEvents: 'none'
          }}
        />
      </div>
    );
  }
  
  // Show image if valid photo exists and loaded successfully
  return (
    <div className="w-full h-full rounded-full overflow-hidden">
      <img
        src={url}
        alt={name || 'Avatar'}
        className="w-full h-full rounded-full object-cover object-center"
        style={{
          objectPosition: 'center',
          objectFit: 'cover'
        }}
        onError={() => setErrored(true)}
        onLoad={handleImageLoad}
      />
    </div>
  );
};

// Scroll reveal hook
const useScrollReveal = () => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    // On mobile, show immediately to avoid display issues
    const isMobile = window.innerWidth < 640;
    if (isMobile) {
      setIsVisible(true);
      return;
    }

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
        className="relative w-full flex items-center justify-between text-left py-5 border-b border-gray-200 text-gray-900 hover:text-[#24345A] transition-colors duration-200"
      >
        <span className="text-lg font-semibold">{title}</span>
        <ChevronDown className={`w-5 h-5 text-gray-600 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      <div className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-out ${open ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="py-4 border-b border-gray-200 text-gray-600">
          {children}
        </div>
      </div>
    </div>
  );
};

const SKOfficials = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBarangay, setSelectedBarangay] = useState('');
  const [expandedCards, setExpandedCards] = useState({});
  const [officialsSearchTerm, setOfficialsSearchTerm] = useState('');

  // Scroll reveal refs
  const [federationRef, federationVisible] = useScrollReveal();
  const [directoryRef, directoryVisible] = useScrollReveal();
  const [completeListRef, completeListVisible] = useScrollReveal();
  const [contactRef, contactVisible] = useScrollReveal();

  // Active term state
  const [activeTerm, setActiveTerm] = useState(null);
  const [loadingTerm, setLoadingTerm] = useState(true);
  const [termError, setTermError] = useState(null);

  // SK Federation Officers data
  const [federationOfficers, setFederationOfficers] = useState([]);
  const [loadingFederation, setLoadingFederation] = useState(true);
  const [federationError, setFederationError] = useState(null);

  // Load active term first
  useEffect(() => {
    const loadActiveTerm = async () => {
      try {
        setLoadingTerm(true);
        setTermError(null);
        const res = await fetch('/api/sk-terms/active');
        if (!res.ok) {
          throw new Error('Failed to fetch active term');
        }
        const data = await res.json();
        if (data.success && data.data) {
          setActiveTerm(data.data);
        } else {
          setActiveTerm(null);
        }
      } catch (error) {
        console.error('Error loading active term:', error);
        setTermError(error.message);
        setActiveTerm(null);
      } finally {
        setLoadingTerm(false);
      }
    };
    loadActiveTerm();
  }, []);

  // Load SK Federation Officers after active term is loaded
  useEffect(() => {
    if (loadingTerm) return; // Wait for term to load first
    
    const loadFederation = async () => {
      try {
        setLoadingFederation(true);
        setFederationError(null);
        
        if (!activeTerm?.termId) {
          setFederationOfficers([]);
          return;
        }

        const res = await fetch(`/api/sk-federation/public/current?termId=${activeTerm.termId}`);
        if (!res.ok) {
          throw new Error('Failed to fetch federation officers');
        }
        const data = await res.json();
        const rows = Array.isArray(data?.data) ? data.data : [];
        if (!rows.length) {
          setFederationOfficers([]);
          return;
        }
        const order = ['President','Vice President','Secretary','Treasurer','Auditor','PRO','Sergeant-at-Arms','Sergeant at Arms'];
        const toName = (r) => (
          (r.name ||
            [r.first_name, r.middle_name, r.last_name].filter(Boolean).join(' ') ||
            [r.firstName, r.middleName, r.lastName].filter(Boolean).join(' '))
            .replace(/\s+/g, ' ') || ''
        ).trim();
        const mapBarangay = (r) => r.barangay_name || r.barangay || r.barangayId || r.barangay_id || '';
        const normalized = order
          .slice(0,7)
          .map((pos) => {
            const found = rows.find(r => (r.position || '').toLowerCase() === pos.toLowerCase());
            const photo = found ? getOfficerPhoto(found) : '';
            return found 
              ? ({ position: pos.replace('Sergeant-at-Arms','Sergeant at Arms'), name: toName(found) || '—', barangay: mapBarangay(found) || '—', photo }) 
              : ({ position: pos.replace('Sergeant-at-Arms','Sergeant at Arms'), name: '—', barangay: '—', photo: '' });
          });
        setFederationOfficers(normalized);
      } catch (error) {
        console.error('Error loading federation officers:', error);
        setFederationError(error.message);
        setFederationOfficers([]);
      } finally {
        setLoadingFederation(false);
      }
    };
    loadFederation();
  }, [activeTerm, loadingTerm]);

  // SK Chairpersons data from API
  const [chairpersonsByBarangay, setChairpersonsByBarangay] = useState([]);
  const [loadingChairpersons, setLoadingChairpersons] = useState(true);
  const [chairpersonsError, setChairpersonsError] = useState(null);

  // Load chairpersons from API after active term is loaded
  useEffect(() => {
    if (loadingTerm) return; // Wait for term to load first
    
    const loadChairpersons = async () => {
      try {
        setLoadingChairpersons(true);
        setChairpersonsError(null);
        
        const url = activeTerm?.termId 
          ? `/api/sk-terms/public/chairpersons-by-barangay?termId=${activeTerm.termId}`
          : '/api/sk-terms/public/chairpersons-by-barangay';
        
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error('Failed to fetch chairpersons');
        }
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setChairpersonsByBarangay(data.data);
        } else {
          setChairpersonsByBarangay([]);
        }
      } catch (error) {
        console.error('Error loading chairpersons:', error);
        setChairpersonsError(error.message);
        setChairpersonsByBarangay([]);
      } finally {
        setLoadingChairpersons(false);
      }
    };
    loadChairpersons();
  }, [activeTerm, loadingTerm]);

  // Filter SK Chairpersons based on search
  const filteredChairpersons = chairpersonsByBarangay.filter(item => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    const barangayMatch = item.barangayName?.toLowerCase().includes(search);
    const nameMatch = item.chairperson?.name?.toLowerCase().includes(search);
    return barangayMatch || nameMatch;
  });

  // SK Officials Complete List data from API
  const [barangayOfficialsData, setBarangayOfficialsData] = useState([]);
  const [loadingOfficials, setLoadingOfficials] = useState(true);
  const [officialsError, setOfficialsError] = useState(null);

  // Load barangay officials from API after active term is loaded
  useEffect(() => {
    if (loadingTerm) return; // Wait for term to load first
    
    const loadBarangayOfficials = async () => {
      try {
        setLoadingOfficials(true);
        setOfficialsError(null);
        
        const url = activeTerm?.termId 
          ? `/api/sk-terms/public/officials-by-barangay?termId=${activeTerm.termId}`
          : '/api/sk-terms/public/officials-by-barangay';
        
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error('Failed to fetch barangay officials');
        }
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setBarangayOfficialsData(data.data);
        } else {
          setBarangayOfficialsData([]);
        }
      } catch (error) {
        console.error('Error loading barangay officials:', error);
        setOfficialsError(error.message);
        setBarangayOfficialsData([]);
      } finally {
        setLoadingOfficials(false);
      }
    };
    loadBarangayOfficials();
  }, [activeTerm, loadingTerm]);

  // Toggle card expansion
  const toggleCard = (index) => {
    setExpandedCards(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // Filter barangay officials based on search
  const filteredBarangayOfficials = barangayOfficialsData.filter(barangay => {
    if (!officialsSearchTerm) return true;
    const search = officialsSearchTerm.toLowerCase();
    const barangayMatch = barangay.barangayName?.toLowerCase().includes(search);
    const chairpersonMatch = barangay.chairperson?.name?.toLowerCase().includes(search);
    const councilorsMatch = barangay.councilors?.some(councilor => 
      councilor.name?.toLowerCase().includes(search) ||
      councilor.position?.toLowerCase().includes(search)
    );
    return barangayMatch || chairpersonMatch || councilorsMatch;
  });

  return (
    <PublicLayout>
      <PageHero
        badge="SK Officials"
        title="SK Officials & Contact Directory"
        subtitle="Meet the Sangguniang Kabataan Federation officers and connect with SK Chairpersons across San Jose, Batangas"
        description="Connect with youth leaders and explore the complete directory of SK officials across all barangays."
      />

      {/* SK Federation Officers */}
      <section className="pt-16 pb-8 md:py-16 bg-white">
        <div 
          ref={federationRef}
          className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-1000 ease-out ${
            federationVisible 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="inline-flex items-center px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-[#E7EBFF] text-[#24345A] text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-2 sm:mb-3 lg:mb-4">Leadership</div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2 sm:mb-3 lg:mb-4">SK Federation Officers</h2>
          <p className="text-sm sm:text-base lg:text-lg text-gray-700 max-w-3xl">Meet the current officers of the Sangguniang Kabataan Federation in San Jose, Batangas.</p>
          <div className="mt-4 sm:mt-5 mb-6 sm:mb-8 lg:mb-10 h-[1px] sm:h-[2px] w-full max-w-4xl bg-gradient-to-r from-[#E7EBFF] via-[#F1E9FF] to-[#FDE7F1] opacity-90 rounded-full" aria-hidden="true" />

          {/* Loading State */}
          {loadingFederation && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#24345A]"></div>
              <p className="mt-4 text-gray-600">Loading federation officers...</p>
            </div>
          )}

          {/* Error State */}
          {federationError && !loadingFederation && (
            <div className="text-center py-12">
              <p className="text-red-600">Error loading federation officers: {federationError}</p>
            </div>
          )}

          {/* Empty State */}
          {!loadingFederation && !federationError && federationOfficers.length === 0 && (
            <div className="flex items-center justify-center py-16 sm:py-20">
              <div className="text-center max-w-md mx-auto">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gray-100 flex items-center justify-center">
                  <User className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  No Federation Officers Available
                </h3>
                <p className="text-gray-600 mb-6">
                  {activeTerm 
                    ? "There are currently no federation officers assigned for the active term."
                    : "There is no active SK term at this time. Federation officers will be displayed once a term is activated."}
                </p>
              </div>
            </div>
          )}

          {/* Federation Officers Display */}
          {!loadingFederation && !federationError && federationOfficers.length > 0 && (
            <div className="space-y-8">
              {/* President - Top Tier */}
              {federationOfficers[0] && (
                <div className="flex justify-center">
                  <div className="group relative max-w-sm w-full">
                    <div className="absolute -inset-1 sm:-inset-2 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-yellow-300/30 via-amber-200/25 to-yellow-300/30 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" aria-hidden="true" />
                    <div className="relative bg-white rounded-2xl sm:rounded-3xl shadow-xl ring-2 ring-yellow-200 overflow-hidden transition-all duration-300 group-hover:shadow-2xl">
                      {/* Header with special gradient */}
                      <div className="h-20 sm:h-24 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-400 relative">
                        <div className="absolute inset-0 bg-black/10"></div>
                      </div>
                      
                      {/* Profile Photo */}
                      <div className="relative -mt-12 sm:-mt-16 mb-4 sm:mb-6">
                        {federationOfficers[0]?.name && federationOfficers[0].name !== '—' ? (
                          <div className="w-24 h-24 sm:w-32 sm:h-32 mx-auto rounded-full overflow-hidden ring-4 sm:ring-6 ring-white shadow-2xl">
                            <Avatar
                              name={federationOfficers[0].name}
                              src={federationOfficers[0].photo || ''}
                            />
                          </div>
                        ) : (
                          <div className="w-24 h-24 sm:w-32 sm:h-32 mx-auto rounded-full ring-4 sm:ring-6 ring-white shadow-2xl bg-gradient-to-br from-yellow-50 to-white grid place-items-center">
                            <span className="text-xs font-semibold text-amber-700">Unassigned</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Officer Info */}
                      <div className="px-4 sm:px-8 pb-6 sm:pb-8 text-center">
                        <div className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-bold rounded-full bg-gradient-to-r from-yellow-100 to-amber-100 text-amber-800 ring-2 ring-yellow-200 mb-3 sm:mb-4">
                          {federationOfficers[0]?.position || 'President'}
                        </div>
                        {federationOfficers[0]?.name && federationOfficers[0].name !== '—' ? (
                          <>
                            <h3 className="text-lg sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">{federationOfficers[0].name}</h3>
                            <p className="text-gray-600 text-xs sm:text-sm font-medium">{federationOfficers[0].barangay}</p>
                          </>
                        ) : (
                          <div className="text-gray-500 text-xs sm:text-sm">
                            Position currently unassigned
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Vice President - Second Tier */}
              {federationOfficers[1] && (
                <div className="flex justify-center">
                  <div className="group relative max-w-xs w-full">
                    <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-green-300/30 via-emerald-200/25 to-green-300/30 opacity-0 blur-lg transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" aria-hidden="true" />
                    <div className="relative bg-white rounded-2xl shadow-lg ring-2 ring-green-200 overflow-hidden transition-all duration-300 group-hover:shadow-xl">
                      {/* Header with VP gradient */}
                      <div className="h-16 sm:h-20 bg-gradient-to-r from-green-500 to-emerald-600 relative">
                        <div className="absolute inset-0 bg-black/10"></div>
                      </div>
                      
                      {/* Profile Photo */}
                      <div className="relative -mt-10 sm:-mt-12 mb-3 sm:mb-4">
                        {federationOfficers[1]?.name && federationOfficers[1].name !== '—' ? (
                          <div className="w-20 h-20 sm:w-28 sm:h-28 mx-auto rounded-full overflow-hidden ring-3 sm:ring-4 ring-white shadow-lg">
                            <Avatar
                              name={federationOfficers[1].name}
                              src={federationOfficers[1].photo || ''}
                            />
                          </div>
                        ) : (
                          <div className="w-20 h-20 sm:w-28 sm:h-28 mx-auto rounded-full ring-3 sm:ring-4 ring-white shadow-lg bg-gradient-to-br from-emerald-50 to-white grid place-items-center">
                            <span className="text-[10px] font-semibold text-emerald-700">Unassigned</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Officer Info */}
                      <div className="px-4 sm:px-6 pb-4 sm:pb-6 text-center">
                        <div className="inline-flex items-center px-2.5 py-1 sm:px-3 sm:py-1 text-[10px] sm:text-xs font-bold rounded-full bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 ring-2 ring-green-200 mb-2 sm:mb-3">
                          {federationOfficers[1]?.position || 'Vice President'}
                        </div>
                        {federationOfficers[1]?.name && federationOfficers[1].name !== '—' ? (
                          <>
                            <h3 className="text-base sm:text-xl font-bold text-gray-900 mb-1">{federationOfficers[1].name}</h3>
                            <p className="text-gray-600 text-xs sm:text-sm font-medium">{federationOfficers[1].barangay}</p>
                          </>
                        ) : (
                          <div className="text-gray-500 text-xs sm:text-sm">Position currently unassigned</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Other Officers - Third Tier */}
              {federationOfficers.length > 2 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {federationOfficers.slice(2).map((officer, index) => (
                    <div key={index + 2} className="group relative">
                      <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-[#24345A]/20 via-[#E7EBFF]/30 to-[#24345A]/20 opacity-0 blur-lg transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" aria-hidden="true" />
                      <div className="relative bg-white rounded-2xl shadow-md ring-1 ring-gray-200 overflow-hidden transition-all duration-300 group-hover:shadow-lg">
                        {/* Header with standard gradient */}
                        <div className="h-12 sm:h-16 bg-gradient-to-r from-[#24345A] to-[#E7EBFF] relative">
                          <div className="absolute inset-0 bg-black/10"></div>
                        </div>
                        
                        {/* Profile Photo */}
                        <div className="relative -mt-8 sm:-mt-10 mb-2 sm:mb-3">
                          {officer?.name && officer.name !== '—' ? (
                            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full overflow-hidden ring-2 sm:ring-3 ring-white shadow-md">
                              <Avatar
                                name={officer.name}
                                src={officer.photo || ''}
                              />
                            </div>
                          ) : (
                            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full ring-2 sm:ring-3 ring-white shadow-md bg-gray-50 grid place-items-center">
                              <span className="text-[10px] font-semibold text-gray-500">Unassigned</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Officer Info */}
                        <div className="px-3 sm:px-4 pb-3 sm:pb-4 text-center">
                          <div className="inline-flex items-center px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-xs font-semibold rounded-full bg-gradient-to-r from-[#E7EBFF] to-[#F1E9FF] text-[#24345A] ring-1 ring-gray-200 mb-1 sm:mb-2">
                            {officer?.position || 'Officer'}
                          </div>
                          {officer?.name && officer.name !== '—' ? (
                            <>
                              <h3 className="text-sm sm:text-lg font-bold text-gray-900 mb-1">{officer.name}</h3>
                              <p className="text-gray-600 text-[10px] sm:text-xs font-medium">{officer.barangay}</p>
                            </>
                          ) : (
                            <div className="text-gray-500 text-[10px] sm:text-xs">Position currently unassigned</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Contact Directory */}
      <section className="pt-8 pb-8 md:py-16 bg-white">
        <div 
          ref={directoryRef}
          className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-1000 ease-out delay-200 ${
            directoryVisible 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-100 translate-y-0 sm:opacity-0 sm:translate-y-8'
          }`}
        >
          <div className="inline-flex items-center px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-[#E7EBFF] text-[#24345A] text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-2 sm:mb-3 lg:mb-4">Directory</div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2 sm:mb-3 lg:mb-4">SK Chairpersons & Contact Directory</h2>
          <p className="text-sm sm:text-base lg:text-lg text-gray-600 max-w-3xl">Find and contact SK Chairpersons across all barangays in San Jose, Batangas.</p>
          <div className="mt-4 sm:mt-5 mb-6 sm:mb-8 lg:mb-10 h-[1px] sm:h-[2px] w-full max-w-4xl bg-gradient-to-r from-[#E7EBFF] via-[#F1E9FF] to-[#FDE7F1] opacity-90 rounded-full" aria-hidden="true" />

          {/* Search Bar */}
          <div className="mb-6 sm:mb-8">
            <div className="relative max-w-md mx-auto sm:mx-0">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
              <input
                type="text"
                placeholder="Search by name or barangay..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#24345A]/20 focus:border-[#24345A] transition-colors text-sm sm:text-base"
              />
            </div>
          </div>

           {/* Loading State */}
          {loadingChairpersons && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#24345A]"></div>
              <p className="mt-4 text-gray-600">Loading chairpersons...</p>
            </div>
          )}

          {/* Error State */}
          {chairpersonsError && !loadingChairpersons && (
            <div className="text-center py-12">
              <p className="text-red-600">Error loading chairpersons: {chairpersonsError}</p>
            </div>
          )}

          {/* Empty State */}
          {!loadingChairpersons && !chairpersonsError && filteredChairpersons.length === 0 && (
            <div className="flex items-center justify-center py-16 sm:py-20">
              <div className="text-center max-w-md mx-auto">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gray-100 flex items-center justify-center">
                  <Search className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {searchTerm ? "No Chairpersons Found" : "No Chairpersons Available"}
                </h3>
                <p className="text-gray-600 mb-6">
                  {searchTerm 
                    ? `No chairpersons match your search "${searchTerm}". Try adjusting your search terms.`
                    : activeTerm 
                      ? "There are currently no chairpersons assigned for the active term."
                      : "There is no active SK term at this time. Chairpersons will be displayed once a term is activated."}
                </p>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-[#24345A] bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Clear Search
                  </button>
                )}
              </div>
            </div>
          )}

           {/* Contact Cards Grid */}
          {!loadingChairpersons && !chairpersonsError && filteredChairpersons.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {filteredChairpersons.map((item, index) => {
                const hasChairperson = item.chairperson !== null;
                const chairperson = item.chairperson || {};
                const name = hasChairperson ? (chairperson.name || 'Unknown') : 'No Chairperson Assigned';
                const contactNumber = hasChairperson ? (chairperson.contactNumber || 'N/A') : 'N/A';
                // Try multiple field names for profile picture
                const profilePicture = hasChairperson ? (
                  chairperson.profilePicture || 
                  chairperson.profile_picture || 
                  chairperson.photo || 
                  chairperson.photo_url || 
                  ''
                ) : '';
                
                // Debug logging (can be removed later)
                if (hasChairperson && profilePicture) {
                  console.log('Profile picture for', name, ':', profilePicture);
                }
                
                return (
                  <div key={item.barangayId || index} className="group">
                    <div className="bg-gradient-to-br from-white via-gray-50 to-white rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-lg ring-1 ring-gray-200 hover:shadow-xl transition-all duration-300 hover:ring-[#24345A]/30">
                   {/* Top Section with Photo and Basic Info */}
                      <div className="flex items-start gap-3 sm:gap-3.5 mb-3 sm:mb-3.5">
                     {/* Profile Photo */}
                     <div className="flex-shrink-0">
                          <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-full overflow-hidden ring-2 ring-[#24345A]/20 shadow-md bg-gray-100">
                            <Avatar
                              name={name}
                              src={hasChairperson ? profilePicture : ''}
                              version={chairperson.updatedAt}
                              iconSize="compact"
                         />
                       </div>
                     </div>
                     
                     {/* Name and Position */}
                     <div className="flex-1 min-w-0">
                          <div className="inline-flex items-center px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-xs font-bold rounded-lg bg-[#24345A] text-white mb-1.5 sm:mb-2">
                         SK Chairperson
                       </div>
                          <h3 className="text-sm sm:text-base font-bold text-gray-900 mb-1 truncate leading-snug">
                            {hasChairperson ? name : 'No Chairperson'}
                          </h3>
                          <div className="flex items-center gap-1.5">
                         <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#24345A] flex-shrink-0" />
                            <span className="text-xs sm:text-sm text-gray-600 font-medium truncate">{item.barangayName || 'Unknown Barangay'}</span>
                       </div>
                     </div>
                   </div>
                   
                   {/* Contact Section */}
                      <div className="bg-gradient-to-r from-[#E7EBFF] to-[#F1E9FF] rounded-lg sm:rounded-xl p-2.5 sm:p-3 ring-1 ring-[#24345A]/10">
                     <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5 sm:gap-3">
                            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#24345A] flex items-center justify-center">
                              <Phone className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-white" />
                         </div>
                         <div>
                           <p className="text-[10px] sm:text-xs text-gray-600 font-medium">Contact Number</p>
                              <p className="text-xs sm:text-sm font-bold text-[#24345A] leading-snug">{contactNumber}</p>
                         </div>
                       </div>
                          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/80 flex items-center justify-center shadow-sm">
                            <Phone className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#24345A]" />
                       </div>
                     </div>
                   </div>
                 </div>
               </div>
                );
              })}
           </div>
          )}
        </div>
      </section>

      {/* Complete SK Officials List */}
      <section className="pt-8 pb-8 md:py-16 bg-white">
        <div 
          ref={completeListRef}
          className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-1000 ease-out delay-300 ${
            completeListVisible 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="text-center mb-8 sm:mb-10 lg:mb-12">
            <div className="inline-flex items-center px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-[#E7EBFF] text-[#24345A] text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-2 sm:mb-3 lg:mb-4">Complete List</div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2 sm:mb-3 lg:mb-4">SK Officials Complete List</h2>
            <p className="text-sm sm:text-base lg:text-lg text-gray-600 max-w-3xl mx-auto">Browse the complete list of SK officials from all barangays. Click on any barangay card to view the detailed list of Chairperson and Councilors.</p>
            <div className="mt-4 sm:mt-5 h-[1px] sm:h-[2px] w-16 sm:w-20 lg:w-24 bg-gradient-to-r from-[#E7EBFF] via-[#F1E9FF] to-[#FDE7F1] opacity-90 rounded-full mx-auto" aria-hidden="true" />
          </div>

          {/* Search Bar */}
          <div className="mb-6 sm:mb-8">
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
              <input
                type="text"
                placeholder="Search by barangay, district, or official name..."
                value={officialsSearchTerm}
                onChange={(e) => setOfficialsSearchTerm(e.target.value)}
                className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#24345A]/20 focus:border-[#24345A] transition-colors text-sm sm:text-base"
              />
            </div>
            {officialsSearchTerm && (
              <div className="mt-2 text-center">
                <span className="text-xs sm:text-sm text-gray-600">
                  {filteredBarangayOfficials.length} result{filteredBarangayOfficials.length !== 1 ? 's' : ''} found
                </span>
              </div>
            )}
          </div>

          {/* Loading State */}
          {loadingOfficials && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#24345A]"></div>
              <p className="mt-4 text-gray-600">Loading officials...</p>
            </div>
          )}

          {/* Error State */}
          {officialsError && !loadingOfficials && (
            <div className="text-center py-12">
              <p className="text-red-600">Error loading officials: {officialsError}</p>
            </div>
          )}

          {/* Empty State */}
          {!loadingOfficials && !officialsError && filteredBarangayOfficials.length === 0 && (
            <div className="flex items-center justify-center py-16 sm:py-20">
              <div className="text-center max-w-md mx-auto">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gray-100 flex items-center justify-center">
                  <Users className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {officialsSearchTerm ? "No Officials Found" : "No Officials Available"}
                </h3>
                <p className="text-gray-600 mb-6">
                  {officialsSearchTerm 
                    ? `No officials match your search "${officialsSearchTerm}". Try adjusting your search terms.`
                    : activeTerm 
                      ? "There are currently no SK officials assigned for the active term."
                      : "There is no active SK term at this time. Officials will be displayed once a term is activated."}
                </p>
                {officialsSearchTerm && (
                  <button
                    onClick={() => setOfficialsSearchTerm('')}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-[#24345A] bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Clear Search
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Expandable Cards Grid */}
          {!loadingOfficials && !officialsError && filteredBarangayOfficials.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 items-start">
              {filteredBarangayOfficials.map((barangay, index) => {
                const hasChairperson = barangay.chairperson !== null;
                const chairperson = barangay.chairperson || {};
                const councilors = barangay.councilors || [];
                
                return (
                  <div 
                    key={barangay.barangayId || index} 
                className={`group bg-white rounded-2xl sm:rounded-3xl shadow-lg ring-1 ring-gray-200 overflow-hidden transition-all duration-300 hover:shadow-xl hover:ring-[#24345A]/20 cursor-pointer ${
                  expandedCards[index] ? 'ring-[#24345A]/30 shadow-xl' : ''
                }`}
                onClick={() => toggleCard(index)}
              >
                {/* Card Header */}
                <div className="p-4 sm:p-6">
                  {/* Barangay Info */}
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-[#24345A] flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                          <h3 className="text-base sm:text-xl font-bold text-gray-900">{barangay.barangayName || 'Unknown Barangay'}</h3>
                    </div>
                    <ChevronDown className={`w-5 h-5 sm:w-6 sm:h-6 text-gray-400 transition-transform duration-300 ${
                      expandedCards[index] ? 'rotate-180' : ''
                    }`} />
                  </div>
                </div>

                {/* Expanded Content */}
                <div className={`overflow-hidden transition-all duration-300 ease-out ${
                  expandedCards[index] ? 'max-h-[600px] sm:max-h-[800px] opacity-100' : 'max-h-0 opacity-0'
                }`}>
                  <div className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-3 sm:space-y-4">
                    {/* Divider */}
                    <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
                    
                    {/* Chairperson Details */}
                        {hasChairperson ? (
                    <div className="bg-purple-100 rounded-xl sm:rounded-2xl p-3 sm:p-4 ring-1 ring-purple-200">
                            <div className="flex items-center gap-3 sm:gap-3.5">
                              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden ring-2 ring-[#24345A]/20 shadow-sm bg-gray-100 flex-shrink-0">
                                <Avatar
                                  name={chairperson.name}
                                  src={chairperson.profilePicture || ''}
                                  version={chairperson.updatedAt}
                                  iconSize="compact"
                                />
                        </div>
                              <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm font-medium text-gray-700">SK Chairperson</p>
                                <p className="text-sm sm:text-lg font-bold text-[#24345A] truncate">{chairperson.name || 'Unknown'}</p>
                                {chairperson.contactNumber && (
                                  <p className="text-[10px] sm:text-xs text-gray-600 mt-0.5">{chairperson.contactNumber}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-gray-100 rounded-xl sm:rounded-2xl p-3 sm:p-4 ring-1 ring-gray-200">
                            <div className="flex items-center gap-3 sm:gap-3.5">
                              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden ring-2 ring-gray-300/20 shadow-sm bg-gray-200 flex-shrink-0">
                                <Avatar
                                  name=""
                                  src=""
                                  iconSize="compact"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs sm:text-sm font-medium text-gray-600">SK Chairperson</p>
                                <p className="text-sm sm:text-lg font-bold text-gray-500">No Chairperson Assigned</p>
                        </div>
                      </div>
                    </div>
                        )}

                    {/* Councilors */}
                    <div className="bg-gray-50 rounded-xl sm:rounded-2xl p-3 sm:p-4 ring-1 ring-gray-200">
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-[#E7EBFF] flex items-center justify-center">
                          <Users className="w-4 h-4 sm:w-5 sm:h-5 text-[#24345A]" />
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm font-medium text-gray-600">SK Councilors</p>
                              <p className="text-[10px] sm:text-xs text-gray-500">{councilors.length} member{councilors.length !== 1 ? 's' : ''}</p>
                            </div>
                          </div>
                          {councilors.length > 0 ? (
                            <div className="space-y-2 sm:space-y-2.5 max-h-48 sm:max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 pr-1">
                              {councilors.map((councilor, councilorIndex) => (
                                <div key={councilor.skId || councilorIndex} className="flex items-center gap-2.5 sm:gap-3 p-2 sm:p-2.5 bg-white rounded-lg ring-1 ring-gray-100">
                                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden ring-1 ring-gray-200 bg-gray-100 flex-shrink-0">
                                    <Avatar
                                      name={councilor.name}
                                      src={councilor.profilePicture || ''}
                                      version={councilor.updatedAt}
                                      iconSize="small"
                                    />
                      </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs sm:text-sm font-semibold text-gray-900 truncate">{councilor.name || 'Unknown'}</p>
                                    <p className="text-[10px] sm:text-xs text-gray-600 truncate">{councilor.position || 'Official'}</p>
                </div>
              </div>
              ))}
            </div>
          ) : (
                            <div className="text-center py-4">
                              <p className="text-xs sm:text-sm text-gray-500">No other officials assigned</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
              </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Contact Information */}
      <section className="pt-8 pb-16 md:py-16 bg-white">
        <div 
          ref={contactRef}
          className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-1000 ease-out delay-400 ${
            contactVisible 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-[#E7EBFF] text-[#24345A] text-xs font-semibold uppercase tracking-wider mb-2">Contact</div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">Get in Touch</h2>
          <p className="text-gray-600 max-w-3xl">Need assistance or have questions? Contact the Local Youth Development Office.</p>
          <div className="mt-5 mb-10 h-[2px] w-full max-w-4xl bg-gradient-to-r from-[#E7EBFF] via-[#F1E9FF] to-[#FDE7F1] opacity-90 rounded-full" aria-hidden="true" />

          <div className="grid md:grid-cols-3 gap-8">
            <div className="group relative">
              <div className="absolute -inset-2 rounded-3xl bg-gradient-to-br from-emerald-300/30 via-teal-200/25 to-sky-300/30 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" aria-hidden="true" />
              <div className="relative rounded-3xl p-6 bg-gray-50 ring-1 ring-gray-200 shadow-sm transition-transform duration-200 group-hover:shadow-md group-hover:-translate-y-0.5">
                <div className="w-10 h-10 rounded-xl grid place-items-center bg-[#E7EBFF] text-[#24345A] ring-1 ring-gray-200 mb-4">
                  <Building className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Office Location</h3>
                <p className="text-gray-600 text-sm">San Jose Municipal Hall, Batangas</p>
              </div>
            </div>

            <div className="group relative">
              <div className="absolute -inset-2 rounded-3xl bg-gradient-to-br from-emerald-300/30 via-teal-200/25 to-sky-300/30 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" aria-hidden="true" />
              <div className="relative rounded-3xl p-6 bg-gray-50 ring-1 ring-gray-200 shadow-sm transition-transform duration-200 group-hover:shadow-md group-hover:-translate-y-0.5">
                <div className="w-10 h-10 rounded-xl grid place-items-center bg-[#E7EBFF] text-[#24345A] ring-1 ring-gray-200 mb-4">
                  <Phone className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Phone</h3>
                <p className="text-gray-600 text-sm">+63 (43) 123-4567</p>
              </div>
            </div>

            <div className="group relative">
              <div className="absolute -inset-2 rounded-3xl bg-gradient-to-br from-emerald-300/30 via-teal-200/25 to-sky-300/30 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" aria-hidden="true" />
              <div className="relative rounded-3xl p-6 bg-gray-50 ring-1 ring-gray-200 shadow-sm transition-transform duration-200 group-hover:shadow-md group-hover:-translate-y-0.5">
                <div className="w-10 h-10 rounded-xl grid place-items-center bg-[#E7EBFF] text-[#24345A] ring-1 ring-gray-200 mb-4">
                  <Clock className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Office Hours</h3>
                <p className="text-gray-600 text-sm">Monday - Friday: 8:00 AM - 5:00 PM</p>
              </div>
            </div>
        </div>
      </div>
      </section>
    </PublicLayout>
  );
};

export default SKOfficials;
