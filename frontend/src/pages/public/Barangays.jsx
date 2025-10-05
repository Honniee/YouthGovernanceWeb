import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  MapPin, 
  Users, 
  Search, 
  Filter,
  ArrowRight,
  Building2,
  Calendar,
  Phone,
  Mail,
  Globe,
  Heart,
  TrendingUp,
  Eye,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PublicLayout from '../../components/layouts/PublicLayout';
import { LoadingSpinner } from '../../components/portal_main_content';
import { useBarangays, useBarangayStatistics } from '../../hooks/useBarangays';

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

// Animated number component
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

const Barangays = () => {
  const navigate = useNavigate();
  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('barangay_name'); // barangay_name, youth_count, created_at
  const [sortOrder, setSortOrder] = useState('asc'); // asc, desc
  const [selectedBarangay, setSelectedBarangay] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  // API hooks
  const queryParams = useMemo(() => ({
    sortBy: sortBy === 'name' ? 'barangay_name' : sortBy,
    sortOrder,
    search: searchTerm
  }), [sortBy, sortOrder, searchTerm]);

  const { 
    barangays, 
    isLoading: loading, 
    error, 
    meta, 
    refreshBarangays 
  } = useBarangays(queryParams);

  const { 
    statistics: statsData, 
    isLoading: statsLoading, 
    error: statsError 
  } = useBarangayStatistics();

  // Scroll reveal refs
  const [heroRef, heroVisible] = useScrollReveal();
  const [statsRef, statsVisible] = useScrollReveal();
  const [directoryRef, directoryVisible] = useScrollReveal();

  // Handle search and sort changes
  useEffect(() => {
    // The useBarangays hook will automatically reload when params change
    // No need for manual refresh here
  }, [searchTerm, sortBy, sortOrder]);

  // Use barangays directly from API (already filtered and sorted)
  const filteredBarangays = barangays;

  // Calculate statistics from API data
  const totalYouth = statsData?.overall?.total_active_youth || 0;
  const totalBarangays = statsData?.overall?.total_barangays || barangays.length;
  const averageYouthPerBarangay = statsData?.overall?.avg_youth_per_barangay || 0;

  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#24345A] via-[#1a2a47] to-[#0f1a2e] text-white">
        {/* Background decorative elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-white to-transparent rounded-full blur-xl" />
          <div className="absolute bottom-20 right-10 w-40 h-40 bg-gradient-to-tl from-white to-transparent rounded-full blur-xl" />
          <div className="absolute top-1/2 left-1/2 w-24 h-24 bg-gradient-to-br from-white to-transparent rounded-full blur-lg" />
        </div>
        
        <div 
          ref={heroRef}
          className={`relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 md:py-12 transition-all duration-1000 ease-out ${
            heroVisible 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="mb-3 sm:mb-4 flex justify-start">
            <button
              onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-white/10 text-white/90 ring-1 ring-white/20 hover:bg-white/15 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm">Back</span>
            </button>
          </div>
          <div className="text-center">
            <div className="inline-flex items-center px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-2 sm:mb-3 md:mb-4">
              <MapPin className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1.5 sm:mr-2" />
              Youth Registration
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4 md:mb-6">
              Registered Youth by Barangay
            </h1>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-white/90 mb-4 sm:mb-6 md:mb-8 max-w-3xl mx-auto">
              View youth registration counts and details per barangay in San Jose, Batangas
            </p>
            <div className="flex flex-wrap justify-center gap-3 sm:gap-4 text-xs sm:text-sm text-white/80">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>{totalBarangays} Barangays</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>San Jose, Batangas</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="py-8 sm:py-12 lg:py-16 bg-white relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-[#24345A] to-transparent rounded-full blur-xl" />
          <div className="absolute bottom-20 right-10 w-40 h-40 bg-gradient-to-tl from-[#24345A] to-transparent rounded-full blur-xl" />
        </div>
        
        <div 
          ref={statsRef}
          className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-1000 ease-out ${
            statsVisible 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="grid grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
            <div className="text-center group">
              <div className="relative rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6 bg-gradient-to-br from-white via-gray-50/50 to-white ring-1 ring-gray-200 shadow-lg transition-all duration-300 group-hover:shadow-xl group-hover:scale-105">
                <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-lg sm:rounded-xl grid place-items-center bg-[#E7EBFF] text-[#24345A] ring-1 ring-gray-200 mx-auto mb-2 sm:mb-3 lg:mb-4">
                  <Building2 className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
                </div>
                <div className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold text-[#24345A] mb-1 sm:mb-2">
                  <AnimatedNumber value={totalBarangays} />
                </div>
                <div className="text-xs sm:text-sm lg:text-base text-gray-600 font-medium">Total Barangays</div>
              </div>
            </div>
            
            <div className="text-center group">
              <div className="relative rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6 bg-gradient-to-br from-white via-gray-50/50 to-white ring-1 ring-gray-200 shadow-lg transition-all duration-300 group-hover:shadow-xl group-hover:scale-105">
                <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-lg sm:rounded-xl grid place-items-center bg-[#E7EBFF] text-[#24345A] ring-1 ring-gray-200 mx-auto mb-2 sm:mb-3 lg:mb-4">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
                </div>
                <div className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold text-[#24345A] mb-1 sm:mb-2">
                  <AnimatedNumber value={totalYouth} />
                </div>
                <div className="text-xs sm:text-sm lg:text-base text-gray-600 font-medium">Total Youth Population</div>
              </div>
            </div>
            
            <div className="text-center group">
              <div className="relative rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6 bg-gradient-to-br from-white via-gray-50/50 to-white ring-1 ring-gray-200 shadow-lg transition-all duration-300 group-hover:shadow-xl group-hover:scale-105">
                <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-lg sm:rounded-xl grid place-items-center bg-[#E7EBFF] text-[#24345A] ring-1 ring-gray-200 mx-auto mb-2 sm:mb-3 lg:mb-4">
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
                </div>
                <div className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold text-[#24345A] mb-1 sm:mb-2">
                  <AnimatedNumber value={averageYouthPerBarangay} />
                </div>
                <div className="text-xs sm:text-sm lg:text-base text-gray-600 font-medium">Average Youth per Barangay</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Search and Filter Section */}
      <section className="py-6 sm:py-8 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-center justify-between">
            {/* Search */}
            <div className="relative flex-1 max-w-md w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
              <input
                type="text"
                placeholder="Search barangays..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#24345A] focus:border-transparent transition-all duration-200 text-sm sm:text-base"
              />
            </div>

            {/* Sort Controls */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs sm:text-sm font-medium text-gray-700 whitespace-nowrap">Sort by:</label>
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="appearance-none px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#24345A] focus:border-transparent text-xs sm:text-sm bg-white hover:border-gray-400 transition-colors cursor-pointer"
                  >
                    <option value="barangay_name">Name</option>
                    <option value="youth_count">Youth Count</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 text-gray-400 pointer-events-none" />
                </div>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="inline-flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 bg-white text-gray-600"
                  title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
                >
                  {sortOrder === 'asc' ? (
                    <ArrowUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  ) : (
                    <ArrowDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Barangay Directory */}
      <section className="py-8 sm:py-12 lg:py-16 bg-white relative overflow-hidden">
        <div 
          ref={directoryRef}
          className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-1000 ease-out ${
            directoryVisible 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-100 translate-y-0'
          }`}
        >
          {/* Section header */}
          <div className="mb-8 sm:mb-10 lg:mb-12">
            <div className="inline-flex items-center px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-[#E7EBFF] text-[#24345A] text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-2 sm:mb-3 md:mb-4">
              <MapPin className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1.5 sm:mr-2" />
              Directory
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2 sm:mb-3 md:mb-4">Barangay Directory</h2>
            <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-3xl">
              Discover detailed information about each barangay in San Jose, Batangas.
            </p>
            <div className="mt-3 sm:mt-4 md:mt-5 mb-6 sm:mb-8 lg:mb-10 h-[1px] sm:h-[2px] w-full max-w-4xl bg-gradient-to-r from-[#E7EBFF] via-[#F1E9FF] to-[#FDE7F1] opacity-90 rounded-full" />
          </div>


          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12 sm:py-16">
              <LoadingSpinner 
                variant="spinner"
                message="Loading barangay directory..." 
                size="sm"
                color="blue"
                height="h-24 sm:h-32"
              />
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="text-center py-12 sm:py-16">
              <div className="text-red-600 mb-3 sm:mb-4">
                <MapPin className="w-10 h-10 sm:w-12 sm:h-12 mx-auto" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1 sm:mb-2">Failed to Load Barangay Directory</h3>
              <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs sm:text-sm"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Barangay Grid */}
          {!loading && !error && filteredBarangays.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
              {filteredBarangays.map((barangay) => (
                <div key={barangay.barangay_id} className="group relative">
                  {/* Glow background */}
                  <div className="absolute -inset-1 sm:-inset-2 rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-300/30 via-teal-200/25 to-sky-300/30 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" />
                  
                  {/* Card */}
                  <div className="relative rounded-xl sm:rounded-2xl p-4 sm:p-6 bg-gradient-to-br from-white via-gray-50/50 to-white ring-1 ring-gray-200 shadow-lg transition-all duration-300 group-hover:shadow-xl group-hover:scale-105 overflow-hidden">
                    {/* Card background pattern */}
                    <div className="absolute inset-0 opacity-5">
                      <div className="absolute top-0 right-0 w-16 sm:w-20 h-16 sm:h-20 bg-gradient-to-br from-[#24345A] to-transparent rounded-full -translate-y-8 sm:-translate-y-10 translate-x-8 sm:translate-x-10" />
                      <div className="absolute bottom-0 left-0 w-12 sm:w-16 h-12 sm:h-16 bg-gradient-to-tr from-[#24345A] to-transparent rounded-full translate-y-6 sm:translate-y-8 -translate-x-6 sm:-translate-x-8" />
                    </div>
                    
                    <div className="relative z-10">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-3 sm:mb-4">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl grid place-items-center bg-[#E7EBFF] text-[#24345A] ring-1 ring-gray-200">
                            <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
                          </div>
                          <div>
                            <h3 className="text-base sm:text-lg font-bold text-gray-900">{barangay.barangay_name}</h3>
                            <p className="text-xs sm:text-sm text-gray-500">{barangay.barangay_id}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setSelectedBarangay(selectedBarangay === barangay.barangay_id ? null : barangay.barangay_id)}
                          className="p-1.5 sm:p-2 text-gray-400 hover:text-gray-600 transition-colors"
                          title="View details"
                        >
                          <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                      </div>

                      {/* Statistics */}
                      <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
                        <div className="text-center py-2 sm:py-3 bg-gray-50 rounded-lg">
                          <div className="text-xl sm:text-2xl font-bold text-[#24345A]">{barangay.youth_count}</div>
                          <div className="text-[10px] sm:text-xs text-gray-600">Youth</div>
                        </div>
                        <div className="text-center py-2 sm:py-3 bg-gray-50 rounded-lg">
                          <div className="text-xl sm:text-2xl font-bold text-[#24345A]">{barangay.total_youth_count}</div>
                          <div className="text-[10px] sm:text-xs text-gray-600">Total Youth</div>
                        </div>
                      </div>

                      {/* Basic Info */}
                      <div className="space-y-1.5 sm:space-y-2 mb-3 sm:mb-4">
                        <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-600">
                          <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span>Created {new Date(barangay.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-600">
                          <MapPin className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span>{barangay.barangay_id}</span>
                        </div>
                        <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-600">
                          <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span>{barangay.purok_count} Puroks</span>
                        </div>
                      </div>

                      {/* Expandable Details */}
                      {selectedBarangay === barangay.barangay_id && (
                        <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200 space-y-3 sm:space-y-4">
                          {/* Puroks */}
                          <div>
                            <h4 className="text-xs sm:text-sm font-semibold text-gray-900 mb-1.5 sm:mb-2">Puroks</h4>
                            <div className="flex flex-wrap gap-1">
                              {barangay.puroks && barangay.puroks.length > 0 ? (
                                barangay.puroks.map((purok, index) => (
                                  <span key={index} className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-gray-100 text-gray-700 text-[10px] sm:text-xs rounded-full">
                                    {purok}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs sm:text-sm text-gray-500">No puroks data available</span>
                              )}
                            </div>
                          </div>

                          {/* Additional Info */}
                          <div>
                            <h4 className="text-xs sm:text-sm font-semibold text-gray-900 mb-1.5 sm:mb-2">Additional Information</h4>
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-600">
                                <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                                <span>Last updated: {new Date(barangay.updated_at).toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-600">
                                <Building2 className="w-3 h-3 sm:w-4 sm:h-4" />
                                <span>Barangay ID: {barangay.barangay_id}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Footer */}
                      <div className="mt-3 sm:mt-4 flex items-center justify-between">
                        <span className="text-[10px] sm:text-xs text-gray-500">
                          Updated {new Date(barangay.updated_at).toLocaleDateString()}
                        </span>
                        <div className="flex items-center text-gray-400 group-hover:text-[#24345A] transition-colors">
                          <span className="text-xs sm:text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            {selectedBarangay === barangay.barangay_id ? 'Hide details' : 'View details'}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1 transform transition-transform duration-200 group-hover:translate-x-1" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* No Results */}
          {!loading && !error && filteredBarangays.length === 0 && (
            <div className="text-center py-12 sm:py-16">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <Search className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
              </div>
              <p className="text-sm sm:text-base text-gray-600 mb-1 sm:mb-2">No barangays found</p>
              <p className="text-xs sm:text-sm text-gray-500">Try adjusting your search terms</p>
            </div>
          )}
        </div>
      </section>
    </PublicLayout>
  );
};

export default Barangays;
