import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft, ShieldCheck, Users, BarChart3, Clock, MapPin, CheckCircle, User, GraduationCap, Vote, FileText, ChevronLeft, ChevronDown, AlertCircle, Calendar, Target } from 'lucide-react';
import PublicLayout from '../../../components/layouts/PublicLayout';
import PageHero from '../../../components/website/PageHero';
import ReCaptchaComponent from '../../../components/ui/ReCaptchaComponent';
import ResumeSurveyModal from '../../../components/ui/ResumeSurveyModal';
import { useReCaptcha } from '../../../hooks/useReCaptcha';
import { useActiveSurvey } from '../../../hooks/useActiveSurvey';
import logger from '../../../utils/logger.js';

// Simple scroll reveal (aligned with Programs/Barangays)
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

const SurveyLanding = () => {
  const navigate = useNavigate();
  const recaptcha = useReCaptcha({ required: true });
  const { activeSurvey, hasActiveSurvey, isLoading: surveyLoading, error: surveyError } = useActiveSurvey();
  
  // Resume survey modal state
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [existingSurveyData, setExistingSurveyData] = useState(null);

  // Prepare survey data for display (even when no active survey)
  const surveyData = hasActiveSurvey && activeSurvey ? {
    name: activeSurvey.batch_name || activeSurvey.batchName || 'KK Survey',
    description: activeSurvey.description || 'Official demographic survey for youth residents aged 15–30 in San Jose, Batangas.',
    start: activeSurvey.start_date || activeSurvey.startDate,
    end: activeSurvey.end_date || activeSurvey.endDate,
    current: activeSurvey.statisticsTotalResponses || activeSurvey.total_responses || activeSurvey.totalResponses || 0,
    target: activeSurvey.target_responses || activeSurvey.targetResponses || 1000,
    status: activeSurvey.pausedAt || activeSurvey.paused_at ? 'paused' : activeSurvey.status === 'active' ? 'live' : 'upcoming',
    batchId: activeSurvey.batch_id || activeSurvey.batchId,
    pausedAt: activeSurvey.paused_at || activeSurvey.pausedAt,
  } : {
    name: 'KK Demographic Survey',
    description: 'Official demographic survey for youth residents aged 15–30 in San Jose, Batangas.',
    start: null,
    end: null,
    current: 0,
    target: 1000,
    status: 'closed', // No active survey
    batchId: null,
    pausedAt: null,
  };
  
  // Check for existing survey data
  const checkExistingSurveyData = () => {
    try {
      const personalData = localStorage.getItem('kk_survey_draft_personal');
      const demographicsData = localStorage.getItem('kk_survey_draft_demographics');
      const civicData = localStorage.getItem('kk_survey_draft_v1');
      const termsData = localStorage.getItem('kk_survey_terms_temp');

      const existingData = {
        personal: personalData ? JSON.parse(personalData) : null,
        demographics: demographicsData ? JSON.parse(demographicsData) : null,
        civic: civicData ? JSON.parse(civicData) : null,
        terms: termsData ? JSON.parse(termsData) : null
      };

      // Check if any meaningful data exists
      let hasData = false;
      
      // Check for personal data
      if (existingData.personal && Object.keys(existingData.personal).length > 0) {
        hasData = true;
      }
      
      // Check for demographics data
      if (existingData.demographics && Object.keys(existingData.demographics).length > 0) {
        hasData = true;
      }
      
      // Check for civic data
      if (existingData.civic && Object.keys(existingData.civic).length > 0) {
        hasData = true;
      }
      
      // Check for terms data - only count as meaningful if terms were actually accepted
      if (existingData.terms && existingData.terms.acceptedSections) {
        const allTermsAccepted = Object.values(existingData.terms.acceptedSections).every(accepted => accepted === true);
        if (allTermsAccepted) {
          hasData = true;
        }
      }
      
      logger.debug('Survey data check', { 
        hasData, 
        personal: !!existingData.personal, 
        demographics: !!existingData.demographics, 
        civic: !!existingData.civic, 
        termsAccepted: existingData.terms ? Object.values(existingData.terms.acceptedSections || {}).every(accepted => accepted === true) : false 
      });
      
      if (hasData) {
        setExistingSurveyData(existingData);
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Error checking existing survey data', error);
      return false;
    }
  };

  // Handle resume survey
  const handleResumeSurvey = () => {
    setShowResumeModal(false);
    sessionStorage.setItem('recaptcha_verified', Date.now().toString());
    navigate('/kk-survey/step-1');
  };

  // Handle start fresh
  const handleStartFresh = () => {
    // Clear all existing survey data
    localStorage.removeItem('kk_survey_draft_personal');
    localStorage.removeItem('kk_survey_draft_demographics');
    localStorage.removeItem('kk_survey_draft_v1');
    localStorage.removeItem('kk_survey_terms_temp');
    
    setShowResumeModal(false);
    setExistingSurveyData(null);
    sessionStorage.setItem('recaptcha_verified', Date.now().toString());
    navigate('/kk-survey/step-1');
  };

  // Handle start survey click
  const handleStartSurvey = (e) => {
    e.preventDefault();
    
    if (!isLive || !recaptcha.isVerified) {
      const el = document.getElementById('survey-recaptcha');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // Check for existing survey data
    if (checkExistingSurveyData()) {
      setShowResumeModal(true);
    } else {
      // No existing data, start fresh
      handleStartFresh();
    }
  };
  
  
  const progressPercentage = Math.min(100, (surveyData.current / surveyData.target) * 100);
  const daysLeft = surveyData.end ? Math.max(0, Math.ceil((new Date(surveyData.end).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0;
  const daysToOpen = surveyData.start ? Math.max(0, Math.ceil((new Date(surveyData.start).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0;
  const isLive = surveyData.status === 'live';
  const isPaused = surveyData.status === 'paused';
  const isUpcoming = surveyData.status === 'upcoming';
  const isClosed = !isLive && surveyData.end && new Date(surveyData.end).getTime() < Date.now();
  // Progress ring metrics (for ticket layout)
  const ringRadius = 28;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - progressPercentage / 100);
  // Calendar meta (mini calendar for current month)
  const startDate = surveyData.start ? new Date(surveyData.start) : null;
  const endDate = surveyData.end ? new Date(surveyData.end) : null;
  const today = new Date();
  const displayMonth = today.toLocaleString('en-US', { month: 'long' });
  const displayYear = today.getFullYear();
  const calendarMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const daysInMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate();
  const firstDayIdx = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1).getDay(); // 0 Sun - 6 Sat
  const weekday = ['S','M','T','W','T','F','S'];
  const isSameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const isBetween = (d, a, b) => d >= new Date(a.getFullYear(), a.getMonth(), a.getDate()) && d <= new Date(b.getFullYear(), b.getMonth(), b.getDate());

  // Scroll reveal refs
  const [overviewRef, overviewVisible] = useScrollReveal();
  const [contentRef, contentVisible] = useScrollReveal();
  const [participationRef, participationVisible] = useScrollReveal();
  const [privacyRef, privacyVisible] = useScrollReveal();
  const [processRef, processVisible] = useScrollReveal();
  const [impactRef, impactVisible] = useScrollReveal();
  const [ctaRef, ctaVisible] = useScrollReveal();

  // Tabs fixation after hero (switching to CSS sticky with dynamic header offset)
  const [tabsFixed, setTabsFixed] = useState(false);
  const tabsRef = useRef(null);
  const [tabsHeight, setTabsHeight] = useState(64);
  // Mobile underline indicator (content-sized tabs)
  const mobileTabRefs = useRef({});
  const [mobileIndicatorLeft, setMobileIndicatorLeft] = useState(0);
  const [mobileIndicatorWidth, setMobileIndicatorWidth] = useState(0);
  const [currentCarouselIndex, setCurrentCarouselIndex] = useState(0);
  useEffect(() => {
    const measureTabs = () => {
      if (tabsRef.current) setTabsHeight(tabsRef.current.offsetHeight || 64);
    };
    measureTabs();
    window.addEventListener('resize', measureTabs);
    return () => { window.removeEventListener('resize', measureTabs); };
  }, []);

  // placeholder: mobile underline indicator effect moved below activeTab initialization

  // Tabs / section nav
  const tabs = [
    { id: 'about', label: 'About the Survey' },
    { id: 'content', label: 'Survey Questions' },
    { id: 'participation', label: 'Who Can Participate' },
    { id: 'privacy', label: 'Privacy' },
    { id: 'process', label: 'How to Participate' },
    { id: 'impact', label: 'Results & Impact' },
  ];
  const [activeTab, setActiveTab] = useState('about');
  const activeIndex = Math.max(0, tabs.findIndex(t => t.id === activeTab));
  const goTo = (id) => {
    const el = document.getElementById(id);
    if (el) {
      setActiveTab(id);
      // Small delay to let the tab change settle before scrolling
      setTimeout(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    }
  };
  useEffect(() => {
    const onScroll = () => {
      const offsetTop = 120; // account for sticky header
      let current = activeTab;
      for (let i = 0; i < tabs.length; i += 1) {
        const el = document.getElementById(tabs[i].id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.top <= offsetTop && rect.bottom > offsetTop) {
          current = tabs[i].id;
          break;
        }
      }
      if (current !== activeTab) setActiveTab(current);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [activeTab, tabs]);

  // Sync mobile underline indicator to active tab size/position (must run after activeTab is defined)
  useEffect(() => {
    const updateIndicator = () => {
    const el = mobileTabRefs.current[activeTab];
    if (el) {
        // Get the tab container (the flex container with tabs)
        const tabContainer = el.closest('.flex.min-w-max.gap-2');
        if (tabContainer) {
          const tabRect = el.getBoundingClientRect();
          const containerRect = tabContainer.getBoundingClientRect();
          
          // Calculate position relative to the tab container
          const left = tabRect.left - containerRect.left;
          const width = tabRect.width;
          
      setMobileIndicatorLeft(left);
          setMobileIndicatorWidth(width);
          logger.debug('Tab indicator updated', { 
            activeTab, 
            left, 
            width, 
            tabRect: { left: tabRect.left, width: tabRect.width },
            containerRect: { left: containerRect.left, width: containerRect.width }
          });
        }
      }
    };

    // Use requestAnimationFrame for smooth updates
    const rafId = requestAnimationFrame(() => {
      updateIndicator();
    });

    // Also update on window resize (important for mobile orientation changes)
    const handleResize = () => {
      const resizeRafId = requestAnimationFrame(updateIndicator);
      return () => cancelAnimationFrame(resizeRafId);
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
    };
  }, [activeTab]);

  // Form state
  const [email, setEmail] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  // Eligibility checker
  const [ageEligible, setAgeEligible] = useState(null); // true | false | null
  const [residentEligible, setResidentEligible] = useState(null);
  const isEligible = ageEligible === true && residentEligible === true;
  
  const validateEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  // Note: Removed early return for surveyLoading to show full content with loading card

  // Show error state if API fails
  if (surveyError && !surveyLoading) {
    return (
      <PublicLayout>
        <PageHero
          badge="KK Survey"
          title="Katipunan ng Kabataan Survey"
          subtitle="Demographic Assessment of Youth in San Jose, Batangas"
          description="Unable to load survey information"
        />
        
        {/* Error State - Similar to Home.jsx */}
        <section className="py-16 bg-white relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid place-items-center">
              <div className="ring-1 ring-gray-200 overflow-hidden bg-white shadow-lg w-full max-w-[900px]">
                <div className="bg-gradient-to-r from-[#24345A] via-[#24345A]/95 to-[#24345A] py-3 px-4 text-center relative overflow-hidden">
                  {/* Subtle background pattern */}
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-white to-transparent rounded-full -translate-y-8 translate-x-8" />
                    <div className="absolute bottom-0 left-0 w-12 h-12 bg-gradient-to-tr from-white to-transparent rounded-full translate-y-6 -translate-x-6" />
                  </div>
                  <div className="relative z-10">
                    <div className="mx-auto inline-flex items-center gap-1 text-[10px] font-bold px-3 py-1 rounded-full bg-red-100/20 text-red-200 ring-red-200/30">
                      Error
                    </div>
                    <div className="mt-2 text-white text-xl sm:text-2xl font-bold truncate">Survey Information</div>
                  </div>
                </div>
                <div className="p-8 text-center">
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
        </section>
      </PublicLayout>
    );
  }

    return (
      <PublicLayout>
      {/* Hero Section */}
        <PageHero
          badge="KK Survey"
          title="Katipunan ng Kabataan Survey"
          subtitle="Demographic Assessment of Youth in San Jose, Batangas"
        description="Help shape youth policy through your participation."
      />

      {/* Sticky Section Tabs */}
      <div ref={tabsRef} className={`sticky left-0 right-0 z-[40] bg-gradient-to-r from-[#F6F8FF] via-[#EEF3FF] to-[#F6F8FF] border-b border-gray-100 shadow-sm`} style={{ top: 'var(--header-offset, 0px)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1">
          <div className="relative w-full border-b border-gray-200 overflow-x-auto no-scrollbar">
            <div className="flex min-w-max gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  ref={(el) => { mobileTabRefs.current[tab.id] = el; }}
                  onClick={() => goTo(tab.id)}
                  className={`px-4 py-3 text-sm font-semibold transition-colors duration-200 whitespace-nowrap ${
                    activeTab === tab.id ? 'text-[#24345A]' : 'text-gray-600 hover:text-[#24345A]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {/* Underline indicator (content width only) */}
            <div
              className="absolute bottom-0 h-0.5 bg-[#24345A] transition-[width,left] duration-300 ease-out will-change-[width,left]"
              style={{ 
                width: mobileIndicatorWidth > 0 ? `${mobileIndicatorWidth}px` : '0px', 
                left: mobileIndicatorLeft > 0 ? `${mobileIndicatorLeft}px` : '0px',
                opacity: mobileIndicatorWidth > 0 ? 1 : 0
              }}
            />
          </div>
        </div>
      </div>
      {/* No spacer needed with CSS sticky */}
      
      {/* Current Batch (Active KK Batch) */}
      <section className="pt-8 pb-8 md:py-16 bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          {/* Subtle geometric pattern */}
          <div className="absolute top-10 left-10 w-32 h-32 border border-gray-300 rounded-full"></div>
          <div className="absolute top-32 right-20 w-24 h-24 bg-gray-200 rounded-lg rotate-12"></div>
          <div className="absolute bottom-20 left-1/4 w-20 h-20 border border-gray-300 rounded-full"></div>
          <div className="absolute bottom-32 right-1/3 w-16 h-16 bg-gray-200 rounded-lg rotate-45"></div>
          
          {/* Dotted pattern */}
          <div className="absolute top-1/4 left-1/3 w-3 h-3 bg-gray-300 rounded-full"></div>
          <div className="absolute top-1/2 right-1/4 w-2 h-2 bg-gray-400 rounded-full"></div>
          <div className="absolute bottom-1/3 left-1/2 w-2.5 h-2.5 bg-gray-300 rounded-full"></div>
          <div className="absolute bottom-1/4 right-1/2 w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

          {/* Survey Card */}
            <div className="grid place-items-center">
            {surveyLoading ? (
              /* Loading State - Two Column Layout */
              <div className="bg-white overflow-hidden transform transition-all duration-700 ease-out animate-fade-in-up w-full max-w-[900px] rounded-2xl">
                <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[400px] sm:min-h-[500px] lg:min-h-[600px]">
                  
                  {/* Left Section - Loading Information Panel */}
                  <div className="bg-gradient-to-br from-[#24345A] to-[#1e2a47] p-4 sm:p-6 lg:p-8 xl:p-12 flex flex-col justify-center text-white relative overflow-hidden">
                    {/* Background Pattern */}
                  <div className="absolute inset-0 opacity-10">
                      {/* Geometric shapes */}
                      <div className="absolute top-10 right-10 w-20 h-20 border border-white/20 rounded-full"></div>
                      <div className="absolute top-32 right-20 w-12 h-12 bg-white/10 rounded-lg rotate-45"></div>
                      <div className="absolute bottom-20 left-10 w-16 h-16 border border-white/15 rounded-full"></div>
                      <div className="absolute bottom-32 left-20 w-8 h-8 bg-white/10 rounded-full"></div>
                      
                      {/* Dotted pattern */}
                      <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-white/20 rounded-full"></div>
                      <div className="absolute top-1/3 right-1/3 w-1.5 h-1.5 bg-white/15 rounded-full"></div>
                      <div className="absolute bottom-1/4 right-1/4 w-2.5 h-2.5 bg-white/25 rounded-full"></div>
                      <div className="absolute bottom-1/3 left-1/3 w-1 h-1 bg-white/20 rounded-full"></div>
                      
                      {/* Subtle lines */}
                      <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                      <div className="absolute top-0 left-1/2 w-px h-full bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
                  </div>
                    {/* Status Badge */}
                    <div className="mb-3 sm:mb-4 animate-fade-in-left text-center relative z-10">
                      <div className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold px-3 sm:px-4 py-2 rounded-full ring-1 transition-all duration-200 bg-white/20 text-white ring-white/30">
                        Loading...
                      </div>
                    </div>

                    {/* Title */}
                    <div className="mb-4 sm:mb-6 animate-fade-in-left delay-200 text-center relative z-10">
                      <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2">Survey Information</h1>
                      <p className="text-blue-200 text-sm sm:text-base">Katipunan ng Kabataan Survey</p>
                    </div>

                    {/* Loading Description */}
                    <div className="mb-3 sm:mb-4 animate-fade-in-left delay-300 relative z-10">
                      <div className="relative text-center">
                        <blockquote className="text-sm sm:text-base lg:text-lg font-medium leading-relaxed px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
                          Loading survey data and preparing your experience...
                        </blockquote>
                      </div>
                    </div>

                    {/* Loading Timeline Section */}
                    <div className="mt-4 sm:mt-6 animate-fade-in-left delay-400 relative z-10">
                      <div className="bg-white/10 backdrop-blur-sm border border-white/20 p-3 sm:p-4">
                        <div className="flex items-center justify-between text-xs sm:text-sm text-white">
                          <div className="text-left">
                            <div className="font-medium">Status</div>
                            <div className="text-[10px] sm:text-xs text-white/80">Loading...</div>
                          </div>
                          <div className="mx-2 sm:mx-3 h-0.5 flex-1 bg-gradient-to-r from-white/30 to-white/60 rounded-full" />
                          <div className="text-right">
                            <div className="font-medium">Progress</div>
                            <div className="text-[10px] sm:text-xs text-white/80">Fetching data</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Section - Loading Spinner */}
                  <div className="p-4 sm:p-6 lg:p-8 xl:p-12 flex flex-col justify-center animate-fade-in-right">
                    {/* Loading Header */}
                    <div className="text-center mb-4 sm:mb-6 lg:mb-8">
                      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">
                        Loading Survey
                      </h2>
                      <div className="bg-gray-50 border border-gray-200 p-3 sm:p-4">
                        <p className="text-xs sm:text-sm text-gray-700 font-medium text-center">
                          Please wait while we prepare the survey
                        </p>
                      </div>
                    </div>

                    {/* Loading Spinner */}
                    <div className="flex justify-center mb-4 sm:mb-6">
                      <div className="relative">
                        <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <BarChart3 className="w-6 h-6 text-blue-600 animate-pulse" />
                        </div>
                      </div>
                    </div>

                    {/* Loading Messages */}
                    <div className="text-center space-y-2">
                      <p className="text-sm text-gray-600 font-medium">Loading survey data...</p>
                      <p className="text-xs text-gray-500">Fetching latest updates</p>
                    </div>

                    {/* Footer Info */}
                    <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-gray-100">
                      <div className="bg-white/50 backdrop-blur-sm border border-gray-200 rounded-xl p-2 sm:p-3">
                        <div className="flex flex-wrap justify-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-[#24345A]" />
                            <span>San Jose, Batangas</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#24345A]" />
                            <span>Loading...</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : !hasActiveSurvey ? (
              /* No Active Survey State - Two Column Layout */
              <div className="bg-white overflow-hidden transform transition-all duration-700 ease-out animate-fade-in-up w-full max-w-[900px] rounded-2xl">
                <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[400px] sm:min-h-[500px] lg:min-h-[600px]">
                  
                  {/* Left Section - No Survey Information Panel */}
                  <div className="bg-gradient-to-br from-[#24345A] to-[#1e2a47] p-4 sm:p-6 lg:p-8 xl:p-12 flex flex-col justify-center text-white relative overflow-hidden">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-10">
                      {/* Geometric shapes */}
                      <div className="absolute top-10 right-10 w-20 h-20 border border-white/20 rounded-full"></div>
                      <div className="absolute top-32 right-20 w-12 h-12 bg-white/10 rounded-lg rotate-45"></div>
                      <div className="absolute bottom-20 left-10 w-16 h-16 border border-white/15 rounded-full"></div>
                      <div className="absolute bottom-32 left-20 w-8 h-8 bg-white/10 rounded-full"></div>
                      
                      {/* Dotted pattern */}
                      <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-white/20 rounded-full"></div>
                      <div className="absolute top-1/3 right-1/3 w-1.5 h-1.5 bg-white/15 rounded-full"></div>
                      <div className="absolute bottom-1/4 right-1/4 w-2.5 h-2.5 bg-white/25 rounded-full"></div>
                      <div className="absolute bottom-1/3 left-1/3 w-1 h-1 bg-white/20 rounded-full"></div>
                      
                      {/* Subtle lines */}
                      <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                      <div className="absolute top-0 left-1/2 w-px h-full bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
                    </div>
                    {/* Status Badge */}
                    <div className="mb-3 sm:mb-4 animate-fade-in-left text-center relative z-10">
                      <div className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold px-3 sm:px-4 py-2 rounded-full ring-1 transition-all duration-200 bg-white/20 text-white ring-white/30">
                      Coming Soon
                    </div>
                  </div>

                    {/* Title */}
                    <div className="mb-4 sm:mb-6 animate-fade-in-left delay-200 text-center relative z-10">
                      <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2">Survey Coming Soon</h1>
                      <p className="text-blue-200 text-sm sm:text-base">Katipunan ng Kabataan Survey</p>
                </div>
                
                    {/* No Survey Description */}
                    <div className="mb-3 sm:mb-4 animate-fade-in-left delay-300 relative z-10">
                      <div className="relative text-center">
                        <blockquote className="text-sm sm:text-base lg:text-lg font-medium leading-relaxed px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
                          We're currently preparing our next youth demographic survey. Stay tuned for upcoming opportunities to participate and help shape our community programs.
                        </blockquote>
                      </div>
                    </div>

                    {/* Timeline Section */}
                    <div className="mt-4 sm:mt-6 animate-fade-in-left delay-400 relative z-10">
                      <div className="bg-white/10 backdrop-blur-sm border border-white/20 p-3 sm:p-4">
                        <div className="flex items-center justify-between text-xs sm:text-sm text-white">
                          <div className="text-left">
                            <div className="font-medium">Status</div>
                            <div className="text-[10px] sm:text-xs text-white/80">Coming Soon</div>
                          </div>
                          <div className="mx-2 sm:mx-3 h-0.5 flex-1 bg-gradient-to-r from-white/30 to-white/60 rounded-full" />
                          <div className="text-right">
                            <div className="font-medium">Updates</div>
                            <div className="text-[10px] sm:text-xs text-white/80">Check back soon</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Section - No Survey Content */}
                  <div className="p-4 sm:p-6 lg:p-8 xl:p-12 flex flex-col justify-center animate-fade-in-right">
                    {/* Header */}
                    <div className="text-center mb-4 sm:mb-6 lg:mb-8">
                      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">
                        No Active Survey
                      </h2>
                      <div className="bg-gray-50 border border-gray-200 p-3 sm:p-4">
                        <p className="text-xs sm:text-sm text-gray-700 font-medium text-center">
                          We're preparing our next survey
                        </p>
                      </div>
                    </div>

                    {/* Icon and Info */}
                    <div className="text-center mb-4 sm:mb-6">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4 text-gray-600" />
                        <span>Next survey will be announced soon</span>
                      </div>
                      <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4 text-gray-600" />
                        <span>Check back regularly for updates</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Footer Info */}
                    <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-gray-100">
                      <div className="bg-white/50 backdrop-blur-sm border border-gray-200 rounded-xl p-2 sm:p-3">
                        <div className="flex flex-wrap justify-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-[#24345A]" />
                            <span>San Jose, Batangas</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#24345A]" />
                        <span>Updates will appear here automatically</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
            ) : (
              /* Enhanced Survey Card - Login Design Pattern for Active Survey */
              <div className="bg-white overflow-hidden transform transition-all duration-700 ease-out animate-fade-in-up w-full max-w-[900px] rounded-2xl">
              <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[400px] sm:min-h-[500px] lg:min-h-[600px]">
                
                {/* Left Section - Survey Information Panel */}
                <div className="bg-gradient-to-br from-[#24345A] to-[#1e2a47] p-4 sm:p-6 lg:p-8 xl:p-12 flex flex-col justify-center text-white relative overflow-hidden">
                  {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                    {/* Geometric shapes */}
                    <div className="absolute top-10 right-10 w-20 h-20 border border-white/20 rounded-full"></div>
                    <div className="absolute top-32 right-20 w-12 h-12 bg-white/10 rounded-lg rotate-45"></div>
                    <div className="absolute bottom-20 left-10 w-16 h-16 border border-white/15 rounded-full"></div>
                    <div className="absolute bottom-32 left-20 w-8 h-8 bg-white/10 rounded-full"></div>
                    
                    {/* Dotted pattern */}
                    <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-white/20 rounded-full"></div>
                    <div className="absolute top-1/3 right-1/3 w-1.5 h-1.5 bg-white/15 rounded-full"></div>
                    <div className="absolute bottom-1/4 right-1/4 w-2.5 h-2.5 bg-white/25 rounded-full"></div>
                    <div className="absolute bottom-1/3 left-1/3 w-1 h-1 bg-white/20 rounded-full"></div>
                    
                    {/* Subtle lines */}
                    <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                    <div className="absolute top-0 left-1/2 w-px h-full bg-gradient-to-b from-transparent via-white/5 to-transparent"></div>
                </div>
                  {/* Status Badge */}
                  <div className="mb-3 sm:mb-4 animate-fade-in-left text-center relative z-10">
                    <div className={`inline-flex items-center gap-1 text-xs sm:text-sm font-bold px-3 sm:px-4 py-2 rounded-full ring-1 transition-all duration-200 ${
                    isLive ? 'bg-white/20 text-white ring-white/30' : 
                    isPaused ? 'bg-yellow-100 text-yellow-800 ring-yellow-200' : 
                    isClosed ? 'bg-gray-200 text-gray-700 ring-gray-300' : 
                    'bg-blue-100 text-blue-700 ring-blue-200'
                  }`}>
                    {isLive ? 'Open' : isPaused ? 'Paused' : isClosed ? 'Closed' : 'Upcoming'}
                  </div>
                </div>

                  {/* Title */}
                  <div className="mb-4 sm:mb-6 animate-fade-in-left delay-200 text-center relative z-10">
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2">{surveyData.name}</h1>
                    <p className="text-blue-200 text-sm sm:text-base">Katipunan ng Kabataan Survey</p>
              </div>
              
                  {/* Survey Description */}
                  <div className="mb-3 sm:mb-4 animate-fade-in-left delay-300 relative z-10">
                    <div className="relative text-center">
                      <blockquote className="text-sm sm:text-base lg:text-lg font-medium leading-relaxed px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
                  {surveyData.description}
                      </blockquote>
                    </div>
              </div>
              
                  {/* Timeline Section */}
                  <div className="mt-4 sm:mt-6 animate-fade-in-left delay-400 relative z-10">
                    <div className="bg-white/10 backdrop-blur-sm border border-white/20 p-3 sm:p-4">
                      <div className="flex items-center justify-between text-xs sm:text-sm text-white">
                  <div className="text-left">
                    <div className="font-medium">Opens</div>
                          <div className="text-[10px] sm:text-xs text-white/80">{surveyData.start ? new Date(surveyData.start).toLocaleDateString() : 'TBD'}</div>
                  </div>
                        <div className="mx-2 sm:mx-3 h-0.5 flex-1 bg-gradient-to-r from-white/30 to-white/60 rounded-full" />
                  <div className="text-right">
                    <div className="font-medium">Closes</div>
                          <div className="text-[10px] sm:text-xs text-white/80">{surveyData.end ? new Date(surveyData.end).toLocaleDateString() : 'TBD'}</div>
                        </div>
                      </div>
                  </div>
                </div>
              </div>
              
                {/* Right Section - Progress and Stats */}
                <div className="p-4 sm:p-6 lg:p-8 xl:p-12 flex flex-col justify-center animate-fade-in-right">
                  {/* Progress Header */}
                  <div className="text-center mb-4 sm:mb-6 lg:mb-8">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">
                      Take a Survey Now
                    </h2>
                    <div className="bg-gray-50 border border-gray-200 p-3 sm:p-4">
                      <p className="text-xs sm:text-sm text-gray-700 font-medium text-center">
                        Join our youth governance research
                      </p>
                    </div>
                    </div>

                  {/* Progress Bar Section */}
                  <div className="mb-4 sm:mb-6">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs sm:text-sm font-medium text-gray-600">Progress</span>
                      <span className="text-xs sm:text-sm font-bold text-[#24345A]">
                        {progressPercentage.toFixed(2)}%
                      </span>
                  </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3 overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-[#24345A] to-[#1e2a47] rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${Math.min(100, progressPercentage)}%` }}
                      ></div>
                    </div>
                    </div>

                  {/* Stats Cards Grid */}
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    {/* Participants Card */}
                    <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-white to-gray-50 ring-1 ring-gray-200 p-3 sm:p-4 transition-all duration-300 hover:shadow-lg hover:scale-105">
                      <div className="flex items-center gap-3">
                        {/* Icon Container with Enhanced Styling */}
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center flex-shrink-0 shadow-sm">
                          <Users className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
                        </div>
                        
                        {/* Text Content */}
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wide">
                            PARTICIPANTS
                          </div>
                          <div className="text-lg sm:text-xl font-bold text-gray-900 mt-0.5">
                            {surveyData.current.toLocaleString()}
                          </div>
                        </div>
                  </div>
                </div>
                
                    {/* Days Left Card */}
                    <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-white to-gray-50 ring-1 ring-gray-200 p-3 sm:p-4 transition-all duration-300 hover:shadow-lg hover:scale-105">
                      <div className="flex items-center gap-3">
                        {/* Icon Container with Enhanced Styling */}
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center flex-shrink-0 shadow-sm">
                          <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
                  </div>
                        
                        {/* Text Content */}
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wide">
                            DAYS LEFT
                  </div>
                          <div className="text-lg sm:text-xl font-bold text-gray-900 mt-0.5">
                            {daysLeft}
                          </div>
                        </div>
                      </div>
                  </div>
                </div>
                
                {/* reCAPTCHA section */}
                  <div className="mt-4 sm:mt-6 flex justify-center" id="survey-recaptcha">
                    <div className="w-full max-w-sm">
                    <ReCaptchaComponent
                      ref={recaptcha.ref}
                      onVerify={recaptcha.onVerify}
                      onError={recaptcha.onError}
                      onExpire={recaptcha.onExpire}
                        size="normal"
                        theme="light"
                    />
                  </div>
                </div>
                
                {/* Survey Button below reCAPTCHA */}
                  <div className="mt-4 text-center relative z-10">
                  {!hasActiveSurvey ? (
                    <div className="inline-flex items-center px-4 sm:px-8 py-3 sm:py-4 bg-gray-300 text-gray-500 text-xs sm:text-sm font-medium rounded-full cursor-not-allowed shadow-sm">
                      <AlertCircle className="mr-2 w-3 sm:w-4 h-3 sm:h-4" />
                      <span className="hidden sm:inline">No Active Survey Available</span>
                      <span className="sm:hidden">Survey Unavailable</span>
                    </div>
                  ) : isPaused ? (
                    <div className="inline-flex items-center px-4 sm:px-8 py-3 sm:py-4 bg-gray-300 text-gray-500 text-xs sm:text-sm font-medium rounded-full cursor-not-allowed shadow-sm">
                      <AlertCircle className="mr-2 w-3 sm:w-4 h-3 sm:h-4" />
                      <span className="hidden sm:inline">Survey Temporarily Unavailable</span>
                      <span className="sm:hidden">Survey Unavailable</span>
                    </div>
                  ) : (
                    <Link 
                      to={isLive ? '/kk-survey/step-1' : '#'}
                        onClick={handleStartSurvey}
                        className={`group inline-flex items-center justify-center gap-2 px-4 sm:px-8 py-3 sm:py-4 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 shadow-lg relative z-10 ${
                        (isLive && recaptcha.isVerified) 
                          ? 'bg-[#24345A] text-white hover:bg-[#1a2a4a] hover:shadow-xl hover:scale-105' 
                          : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      }`}
                      aria-disabled={!isLive || !recaptcha.isVerified}
                        style={{ pointerEvents: 'auto' }}
                    >
                      <span className="hidden sm:inline">
                          {isLive ? 'Start Survey' : isClosed ? 'Survey Closed' : surveyData.start ? `Opens on ${new Date(surveyData.start).toLocaleDateString()}` : 'Survey Coming Soon'}
                      </span>
                      <span className="sm:hidden">
                        {isLive ? 'Start Survey' : isClosed ? 'Closed' : 'Upcoming'}
                      </span>
                      <ArrowRight className="w-3 sm:w-4 h-3 sm:h-4 transition-transform duration-200 group-hover:translate-x-1" />
                    </Link>
                  )}
                </div>
                
                  {/* Footer Info */}
                  <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-gray-100">
                    <div className="bg-white/50 backdrop-blur-sm border border-gray-200 rounded-xl p-2 sm:p-3">
                      <div className="flex flex-wrap justify-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-[#24345A]" />
                    <span>San Jose, Batangas</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#24345A]" />
                    <span>Takes 5-10 minutes</span>
                  </div>
                </div>
              </div>
            </div>
                </div>
              </div>
            </div>
            )}
          </div>
        </div>
      </section>

      {/* Survey Overview */}
      <section id="about" className="pt-8 pb-8 md:py-16 bg-white">
        <div 
          ref={overviewRef}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
        >
          {/* Overline badge */}
          <div className="inline-flex items-center px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-[#E7EBFF] text-[#24345A] text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-2">About This Survey</div>
          {/* Section heading */}
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2 sm:mb-3">Survey Overview</h2>
          <p className="text-sm sm:text-base text-gray-700 max-w-3xl">We are conducting a comprehensive demographic assessment of the Katipunan ng Kabataan to inform youth programs and policies.</p>
          {/* Refined divider */}
          <div className="mt-4 sm:mt-5 mb-6 sm:mb-8 lg:mb-10 h-[1px] sm:h-[2px] w-full max-w-4xl bg-gradient-to-r from-[#E7EBFF] via-[#F1E9FF] to-[#FDE7F1] opacity-90 rounded-full" aria-hidden="true" />

          {/* Two-column content */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 items-start">
            {/* Left column - Main content */}
            <div>
              <h3 className="text-xl sm:text-2xl md:text-3xl font-semibold text-gray-900 mb-2 sm:mb-3">Our Purpose</h3>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed mb-4">
                We are conducting a town‑wide demographic assessment of the Katipunan ng Kabataan. Your honest responses directly inform SK and LYDO programs, budgeting, and local policies.
              </p>
              <div className="text-sm text-gray-700 bg-[#E7EBFF]/50 ring-1 ring-[#E7EBFF] px-3 py-2 rounded-xl mb-4">
                    Your voice helps direct funding and programs for youth—thank you for participating.
                  </div>
                  {/* Feature chips */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex items-center gap-2 rounded-xl bg-gray-50 ring-1 ring-gray-200 px-3 py-2 text-sm text-gray-700">
                  <Clock className="w-4 h-4 text-[#24345A]" />
                  5–10 minutes
                  </div>
                <div className="flex items-center gap-2 rounded-xl bg-gray-50 ring-1 ring-gray-200 px-3 py-2 text-sm text-gray-700">
                  <Users className="w-4 h-4 text-[#24345A]" />
                  Ages 15–30
            </div>
                <div className="flex items-center gap-2 rounded-xl bg-gray-50 ring-1 ring-gray-200 px-3 py-2 text-sm text-gray-700">
                  <MapPin className="w-4 h-4 text-[#24345A]" />
                  San Jose
            </div>
            </div>
          </div>

            {/* Right column - Quick FAQ */}
            <div>
                <div className="rounded-2xl ring-1 ring-gray-200 bg-white p-0 shadow-sm h-full overflow-hidden">
                  <div className="px-4 sm:px-5 py-4">
                    <h4 className="text-base font-semibold text-gray-900">Quick FAQ</h4>
                  </div>
                  {/* Accordion-style FAQ */}
                  <div className="divide-y divide-gray-200">
                    {[
                      { q: 'Do I need an account?', a: 'No—just your email for duplicate prevention. We never create public profiles.' },
                      { q: 'Can I use my phone?', a: 'Yes. The survey is optimized for mobile and low bandwidth connections.' },
                      { q: 'How long will it take?', a: 'Most participants finish in about 5–10 minutes.' },
                      { q: 'Who can join?', a: 'Youth residents of San Jose, Batangas aged 15–30.' },
                    ].map((item, idx) => (
                      <details key={idx} className="group">
                        <summary className="list-none cursor-pointer select-none">
                          <div className="flex items-center justify-between px-4 sm:px-5 py-4 hover:bg-gray-50">
                            <span className="text-sm font-semibold text-gray-900">{item.q}</span>
                            <span className="text-gray-600 transform transition-transform duration-200 group-open:rotate-180">
                              <ChevronDown className="w-4 h-4" />
                            </span>
                          </div>
                        </summary>
                        <div className="px-4 sm:px-5 pb-4 text-sm text-gray-600">
                          {item.a}
                        </div>
                      </details>
                    ))}
                  </div>
                  <div className="px-4 sm:px-5 py-4 border-t border-gray-200 text-sm text-gray-600 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                    Need help? Message our official <a href="https://www.facebook.com/profile.php?id=100083233819443" target="_blank" rel="noopener noreferrer" className="text-blue-600 font-semibold underline">FB page</a> or email
                    <a href="mailto:lydo@sanjosebatangas.gov.ph" className="text-blue-600 font-semibold underline"> lydo@sanjosebatangas.gov.ph</a>.
                    </div>
                    <a
                      href="#content"
                      onClick={(e) => { e.preventDefault(); const el = document.getElementById('content'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }}
                      className="inline-flex items-center gap-1 text-[#24345A] font-semibold hover:underline"
                    >
                      View Survey Questions <ArrowRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
          </div>
        </div>
      </section>

      {/* What We Ask */}
      <section id="content" className="pt-8 pb-8 md:py-16 bg-white">
        <div 
          ref={contentRef}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
        >
          <div className="inline-flex items-center px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-[#E7EBFF] text-[#24345A] text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-2">Survey Content</div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2 sm:mb-3">What We Ask</h2>
          <p className="text-sm sm:text-base text-gray-600 max-w-3xl">The survey covers essential demographic information needed for youth governance research and policy development.</p>
          <div className="mt-4 sm:mt-5 mb-6 sm:mb-8 lg:mb-10 h-[1px] sm:h-[2px] w-full max-w-4xl bg-gradient-to-r from-[#E7EBFF] via-[#F1E9FF] to-[#FDE7F1] opacity-90 rounded-full" aria-hidden="true" />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6 lg:gap-8 items-stretch">
            {[
              { 
                icon: User, 
                title: 'Profile Information', 
                desc: 'Name, location, contact details, age, and basic demographics for identification and classification.',
                items: ['Name and location details', 'Contact information', 'Age and birthday', 'Sex assigned at birth']
              },
              { 
                icon: BarChart3, 
                title: 'Demographics', 
                desc: 'Civil status, youth classification, work status, and educational background for comprehensive profiling.',
                items: ['Civil status', 'Youth classification', 'Work status', 'Educational background']
              },
              { 
                icon: Vote, 
                title: 'Civic Engagement', 
                desc: 'SK voter registration, national voter status, KK Assembly participation, and voting history.',
                items: ['SK voter registration', 'National voter status', 'KK Assembly participation', 'Voting history']
              },
            ].map(({ icon: Icon, title, desc, items }) => (
              <div key={title} className="relative">
                {/* Card */}
                <div className="relative rounded-2xl sm:rounded-3xl p-3 sm:p-4 md:p-6 bg-gray-50 ring-1 ring-gray-200 shadow-sm h-full flex flex-col min-h-[200px] sm:min-h-[220px] md:min-h-[240px]">
                  <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3 md:mb-4">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-lg sm:rounded-xl grid place-items-center bg-[#E7EBFF] text-[#24345A] ring-1 ring-gray-200">
                      <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
                    </div>
                    <h3 className="text-sm sm:text-base md:text-lg lg:text-xl font-semibold text-gray-900 leading-tight">{title}</h3>
                    <span className="inline-flex items-center px-1.5 py-0.5 sm:px-2 sm:py-0.5 md:px-2.5 md:py-0.5 text-[9px] sm:text-[10px] md:text-[11px] font-medium rounded-full bg-gray-100 text-gray-600 ring-1 ring-gray-200 ml-auto">Section</span>
              </div>
                  <p className="mt-1 sm:mt-2 text-gray-600 text-xs sm:text-sm leading-relaxed">{desc}</p>
                  
                  {/* Items list */}
                  <div className="mt-3 sm:mt-4 space-y-1 sm:space-y-2">
                    {items.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                        <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 flex-shrink-0" />
                        <span>{item}</span>
                </div>
                    ))}
            </div>
                </div>
              </div>
            ))}
          </div>

          {/* Sample Questions note */}
          <div className="mt-8 text-sm text-gray-600 text-center">
            These are the themes we ask about. No uploads required and you can complete the survey in one sitting.
          </div>
        </div>
      </section>

      {/* Eligibility & Requirements */}
      <section id="participation" className="pt-8 pb-8 md:py-16 bg-white">
        <div 
          ref={participationRef}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
        >
          <div className="inline-flex items-center px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-[#E7EBFF] text-[#24345A] text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-2">Participation</div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2 sm:mb-3">Who Can Participate</h2>
          <p className="text-sm sm:text-base text-gray-600 max-w-3xl">All youth residents of San Jose, Batangas are encouraged to participate in this important demographic assessment.</p>
          <div className="mt-4 sm:mt-5 mb-6 sm:mb-8 lg:mb-10 h-[1px] sm:h-[2px] w-full max-w-4xl bg-gradient-to-r from-[#E7EBFF] via-[#F1E9FF] to-[#FDE7F1] opacity-90 rounded-full" aria-hidden="true" />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6 lg:gap-8 items-stretch">
            {[
              { 
                icon: CheckCircle, 
                title: 'Eligibility Requirements', 
                desc: 'Who can participate in the KK Survey based on age, location, and youth classification.',
                items: [
                  'Ages 15-30 - All youth age groups',
                  'San Jose residents - Must be a resident of San Jose, Batangas',
                  'All youth types: In School, Out of School, Working Youth',
                  'Youth with Specific Needs (PWD, CICL, Indigenous People)'
                ]
              },
              { 
                icon: FileText, 
                title: 'Survey Requirements', 
                desc: 'What you need to complete the survey and ensure your response is valid.',
                items: [
                  'Valid address - Must provide valid San Jose, Batangas address',
                  'One response per person - Only one survey per individual',
                  'Email for verification - Used only for duplicate prevention',
                  'Honest responses - Please answer all questions accurately',
                  'Mobile-friendly - Can be completed on any device'
                ]
              },
            ].map(({ icon: Icon, title, desc, items }) => (
              <div key={title} className="relative">
                {/* Card */}
                <div className="relative rounded-2xl sm:rounded-3xl p-3 sm:p-4 md:p-6 bg-gray-50 ring-1 ring-gray-200 shadow-sm h-full flex flex-col min-h-[200px] sm:min-h-[220px] md:min-h-[240px]">
                  <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3 md:mb-4">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-lg sm:rounded-xl grid place-items-center bg-[#E7EBFF] text-[#24345A] ring-1 ring-gray-200">
                      <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
                    </div>
                    <h3 className="text-sm sm:text-base md:text-lg lg:text-xl font-semibold text-gray-900 leading-tight">{title}</h3>
                    <span className="inline-flex items-center px-1.5 py-0.5 sm:px-2 sm:py-0.5 md:px-2.5 md:py-0.5 text-[9px] sm:text-[10px] md:text-[11px] font-medium rounded-full bg-gray-100 text-gray-600 ring-1 ring-gray-200 ml-auto">Requirement</span>
          </div>
                  <p className="mt-1 sm:mt-2 text-gray-600 text-xs sm:text-sm leading-relaxed">{desc}</p>
                  
                  {/* Items list */}
                  <div className="mt-3 sm:mt-4 space-y-1 sm:space-y-2">
                    {items.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-gray-600">
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#24345A] mt-1.5 sm:mt-2 flex-shrink-0" />
                        <span>{item}</span>
          </div>
                    ))}
            </div>
            </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Privacy & Data Protection */}
      <section id="privacy" className="pt-8 pb-8 md:py-16 bg-white">
        <div 
          ref={privacyRef}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
        >
          <div className="inline-flex items-center px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-[#E7EBFF] text-[#24345A] text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-2">Privacy & Security</div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2 sm:mb-3">Your Privacy is Protected</h2>
          <p className="text-sm sm:text-base text-gray-600 max-w-3xl">All information gathered will be treated with utmost confidentiality and used solely for youth governance research purposes.</p>
          <div className="mt-4 sm:mt-5 mb-6 sm:mb-8 lg:mb-10 h-[1px] sm:h-[2px] w-full max-w-4xl bg-gradient-to-r from-[#E7EBFF] via-[#F1E9FF] to-[#FDE7F1] opacity-90 rounded-full" aria-hidden="true" />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6 lg:gap-8 items-stretch">
            {[
              { 
                icon: ShieldCheck, 
                title: 'Data Protection', 
                desc: 'How we protect your personal information and ensure confidentiality throughout the survey process.',
                items: [
                  'All information kept confidential',
                  'Used solely for youth governance research',
                  'Aggregated findings only - no individual data shared',
                  'DPA-compliant data handling'
                ]
              },
              { 
                icon: FileText, 
                title: 'Survey Process', 
                desc: 'What information we collect and how we use it to ensure a secure and anonymous survey experience.',
                items: [
                  'No account creation required',
                  'Email used only for duplicate prevention',
                  'All responses are encrypted and secure',
                  'You may participate in multiple survey batches'
                ]
              },
            ].map(({ icon: Icon, title, desc, items }) => (
              <div key={title} className="relative">
                {/* Card */}
                <div className="relative rounded-2xl sm:rounded-3xl p-3 sm:p-4 md:p-6 bg-gray-50 ring-1 ring-gray-200 shadow-sm h-full flex flex-col min-h-[200px] sm:min-h-[220px] md:min-h-[240px]">
                  <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3 md:mb-4">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-lg sm:rounded-xl grid place-items-center bg-[#E7EBFF] text-[#24345A] ring-1 ring-gray-200">
                      <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
                    </div>
                    <h3 className="text-sm sm:text-base md:text-lg lg:text-xl font-semibold text-gray-900 leading-tight">{title}</h3>
                    <span className="inline-flex items-center px-1.5 py-0.5 sm:px-2 sm:py-0.5 md:px-2.5 md:py-0.5 text-[9px] sm:text-[10px] md:text-[11px] font-medium rounded-full bg-gray-100 text-gray-600 ring-1 ring-gray-200 ml-auto">Privacy</span>
                      </div>
                  <p className="mt-1 sm:mt-2 text-gray-600 text-xs sm:text-sm leading-relaxed">{desc}</p>
                  
                  {/* Items list */}
                  <div className="mt-3 sm:mt-4 space-y-1 sm:space-y-2">
                    {items.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-gray-600">
                        <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{item}</span>
              </div>
                    ))}
            </div>
              </div>
              </div>
            ))}
            </div>
          
            {/* Micro-FAQ */}
          <div className="mt-8 grid md:grid-cols-2 gap-6">
              <div className="rounded-2xl ring-1 ring-gray-200 bg-white p-6">
                <h4 className="text-base font-semibold text-gray-900 mb-3">What we never collect</h4>
                <ul className="text-sm text-gray-600 space-y-2 list-disc ml-5">
                  <li>Passwords or bank information</li>
                  <li>Exact home addresses published publicly</li>
                  <li>Any data used to identify you in reports</li>
                </ul>
            </div>
              <div className="rounded-2xl ring-1 ring-gray-200 bg-white p-6">
                <h4 className="text-base font-semibold text-gray-900 mb-3">Questions?</h4>
              <p className="text-sm text-gray-600">Contact LYDO at <a href="mailto:lydo@example.com" className="text-[#24345A] font-semibold underline">lydo@example.com</a>. We're happy to help.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How to Participate */}
      <section id="process" className="py-16 bg-gray-50">
        <div 
          ref={processRef}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">How to Participate</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Follow these simple steps to complete your KK Survey participation and help shape youth programs in San Jose, Batangas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="text-center">
              <div className="relative mb-6">
                <div className="w-16 h-16 bg-[#24345A] rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto">
                1
              </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Start the Survey</h3>
              <p className="text-gray-600">
                Click "Begin KK Survey" and confirm your eligibility as a youth resident of San Jose, Batangas.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="relative mb-6">
                <div className="w-16 h-16 bg-[#24345A] rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto">
                2
                </div>
                 </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Answer Questions</h3>
              <p className="text-gray-600">
                Complete all sections honestly: profile information, demographics, and civic engagement.
              </p>
              </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="relative mb-6">
                <div className="w-16 h-16 bg-[#24345A] rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto">
                3
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Submit Response</h3>
              <p className="text-gray-600">
                Review your responses and submit. Your data contributes to youth policy development.
              </p>
             </div>
           </div>

          {/* Additional Info */}
          <div className="mt-12 text-center">
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 max-w-2xl mx-auto">
              <h4 className="text-lg font-semibold text-gray-900 mb-3">What Happens Next?</h4>
              <p className="text-gray-600 mb-4">
                After submission, your responses will be processed and included in the demographic analysis. 
                Aggregate findings will be published after the survey window closes.
              </p>
              <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>Takes 5-10 minutes</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Data is secure</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>Help your community</span>
                </div>
              </div>
             </div>
           </div>
         </div>
       </section>
      
      {/* Impact & Results */}
      <section id="impact" className="pt-8 pb-8 md:py-16 bg-white">
        <div 
          ref={impactRef}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
        >
          <div className="inline-flex items-center px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-[#E7EBFF] text-[#24345A] text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-2">Impact</div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2 sm:mb-3">How Your Data Makes a Difference</h2>
          <p className="text-sm sm:text-base text-gray-600 max-w-3xl">Your participation directly influences youth policy and program development in San Jose, Batangas.</p>
          <div className="mt-4 sm:mt-5 mb-6 sm:mb-8 lg:mb-10 h-[1px] sm:h-[2px] w-full max-w-4xl bg-gradient-to-r from-[#E7EBFF] via-[#F1E9FF] to-[#FDE7F1] opacity-90 rounded-full" aria-hidden="true" />

          {/* Data Utilization Carousel */}
          <div className="relative">
            {/* Cards Container */}
            <div className="flex items-center justify-center gap-2 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
              {[
                {
                  icon: BarChart3,
                  title: 'Policy Development',
                  subtitle: 'Government Impact',
                  desc: 'Your responses inform policy recommendations for local government decisions.',
                  items: [
                    'Youth program funding allocation',
                    'Community development priorities',
                    'Local government policy updates',
                    'SK council capacity building'
                  ]
                },
                {
                  icon: Users,
                  title: 'Program Design',
                  subtitle: 'Community Programs',
                  desc: 'Survey data helps design targeted programs for youth in San Jose, Batangas.',
                  items: [
                    'Skills training programs',
                    'Leadership development initiatives',
                    'Community engagement activities',
                    'Educational support services'
                  ]
                },
                {
                  icon: Target,
                  title: 'Resource Allocation',
                  subtitle: 'Strategic Planning',
                  desc: 'Data-driven decisions ensure resources reach those who need them most.',
                  items: [
                    'Budget planning and allocation',
                    'Infrastructure development',
                    'Service delivery improvements',
                    'Community facility upgrades'
                  ]
                }
              ].map((slide, slideIndex) => {
                const isActive = currentCarouselIndex === slideIndex;
                const isLeft = slideIndex === (currentCarouselIndex === 0 ? 2 : currentCarouselIndex - 1);
                const isRight = slideIndex === (currentCarouselIndex === 2 ? 0 : currentCarouselIndex + 1);
                
                return (
                  <div
                    key={slideIndex}
                    className={`relative transition-all duration-500 ease-out ${
                      isActive 
                        ? 'w-full sm:max-w-md md:max-w-lg lg:max-w-2xl z-20' 
                        : isLeft || isRight 
                        ? 'hidden sm:block w-32 sm:w-48 md:w-56 lg:w-64 xl:w-72 opacity-50 sm:opacity-60 scale-75 sm:scale-90 z-10' 
                        : 'w-0 opacity-0 scale-50 z-0'
                    }`}
                  >
                    <div className={`bg-gray-50 ring-1 ring-gray-200 shadow-lg rounded-xl sm:rounded-2xl md:rounded-3xl overflow-hidden ${
                      isActive ? 'p-4 sm:p-6 md:p-8 lg:p-10' : 'p-3 sm:p-4 md:p-6'
                    }`}>
                      {/* Header Badge */}
                      <div className="flex items-center justify-between mb-3 sm:mb-4 md:mb-6">
                        <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 md:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium rounded-full bg-[#E7EBFF] text-[#24345A] ring-1 ring-gray-200">
                          <slide.icon className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span className="hidden xs:inline">Impact</span>
                        </span>
                        {isActive && (
                          <button
                            onClick={() => setCurrentCarouselIndex(prev => prev === 2 ? 0 : prev + 1)}
                            className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 bg-white/90 hover:bg-white rounded-full shadow-lg ring-1 ring-gray-200 flex items-center justify-center text-gray-600 hover:text-gray-900 transition-all duration-200"
                            aria-label="Next slide"
                          >
                            <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5" />
                          </button>
                        )}
                      </div>

                      {/* Content */}
                      <div className={isActive ? 'space-y-4 sm:space-y-6' : 'space-y-2 sm:space-y-4'}>
                        {/* Title and Subtitle */}
                        <div>
                          <h3 className={`font-bold text-gray-900 mb-1 ${
                            isActive 
                              ? 'text-lg sm:text-xl md:text-2xl lg:text-3xl' 
                              : 'text-sm sm:text-base md:text-lg lg:text-xl'
                          }`}>
                            {slide.title}
                          </h3>
                          <p className={`text-gray-600 ${
                            isActive 
                              ? 'text-xs sm:text-sm md:text-base' 
                              : 'text-xs sm:text-sm'
                          }`}>
                            {slide.subtitle}
                          </p>
                        </div>

                        {/* Description */}
                        <p className={`text-gray-600 leading-relaxed ${
                          isActive 
                            ? 'text-xs sm:text-sm md:text-base' 
                            : 'text-xs sm:text-sm line-clamp-2'
                        }`}>
                          {slide.desc}
                        </p>

                        {/* Items */}
                        {isActive && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 md:gap-4">
                            {slide.items.map((item, itemIndex) => (
                              <div key={itemIndex} className="p-2 sm:p-3 md:p-4 bg-white rounded-lg sm:rounded-xl ring-1 ring-gray-200 shadow-sm">
                                <span className="text-xs sm:text-sm md:text-base text-gray-700 font-medium leading-tight">{item}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Bottom Navigation Control */}
            <div className="flex items-center justify-center">
              <div className="inline-flex items-center gap-2 sm:gap-3 md:gap-4 bg-gray-800 rounded-full px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 shadow-lg">
                <button
                  onClick={() => setCurrentCarouselIndex(prev => prev === 0 ? 2 : prev - 1)}
                  className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 flex items-center justify-center text-white hover:text-gray-300 transition-colors duration-200"
                  aria-label="Previous slide"
                >
                  <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5" />
                </button>
                
                <span className="text-white text-xs sm:text-sm md:text-base font-medium">
                  {currentCarouselIndex + 1}/3
                </span>
                
                <button
                  onClick={() => setCurrentCarouselIndex(prev => prev === 2 ? 0 : prev + 1)}
                  className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 flex items-center justify-center text-white hover:text-gray-300 transition-colors duration-200"
                  aria-label="Next slide"
                >
                  <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sticky Bottom CTA (mobile) */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur border-t border-gray-200 p-3 shadow-lg">
        <div className="max-w-7xl mx-auto px-2">
          <div className="flex flex-col items-center gap-2">
            <div className="text-xs text-gray-600 text-center">
              {!hasActiveSurvey ? 'No active survey' : isLive ? 'KK Survey is open' : isPaused ? 'Survey is paused' : surveyData.start ? `Opens ${new Date(surveyData.start).toLocaleDateString()}` : 'Survey coming soon'}
            </div>
            {!hasActiveSurvey ? (
              <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm bg-gray-200 text-gray-500 cursor-not-allowed">
                Unavailable
              </div>
            ) : (
              <Link 
                to={isLive ? '/kk-survey/step-1' : '#'}
                onClick={handleStartSurvey}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm ${(isLive && recaptcha.isVerified) ? 'bg-[#24345A] text-white' : 'bg-gray-200 text-gray-500'}`}
                aria-disabled={!isLive || !recaptcha.isVerified}
              >
                {(isLive && recaptcha.isVerified) ? 'Start Survey' : isPaused ? 'Paused' : 'Verify to Start'}
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Resume Survey Modal */}
      <ResumeSurveyModal
        isOpen={showResumeModal}
        onClose={() => setShowResumeModal(false)}
        onResume={handleResumeSurvey}
        onStartFresh={handleStartFresh}
        surveyData={existingSurveyData}
      />
    </PublicLayout>
  );
};

export default SurveyLanding;