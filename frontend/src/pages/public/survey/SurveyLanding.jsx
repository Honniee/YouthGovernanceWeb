import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Users, BarChart3, Clock, MapPin, CheckCircle, User, GraduationCap, Vote, FileText, ChevronLeft, ChevronDown } from 'lucide-react';
import PublicLayout from '../../../components/layouts/PublicLayout';

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
  
  // Survey data
  const surveyData = {
    name: 'KK Demographic Survey 2025',
    description: 'Official demographic survey for youth residents aged 15–30 in San Jose, Batangas.',
    start: '2025-09-01',
    end: '2025-12-31',
    current: 342,
    target: 1000,
    status: 'live', // 'live' | 'paused' | 'upcoming'
  };
  
  const progressPercentage = Math.min(100, Math.round((surveyData.current / surveyData.target) * 100));
  const daysLeft = Math.max(0, Math.ceil((new Date(surveyData.end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  const daysToOpen = Math.max(0, Math.ceil((new Date(surveyData.start).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  const isLive = surveyData.status === 'live';
  const isPaused = surveyData.status === 'paused';
  const isUpcoming = surveyData.status === 'upcoming';
  const isClosed = !isLive && new Date(surveyData.end).getTime() < Date.now();

  // Scroll reveal refs
  const [heroRef, heroVisible] = useScrollReveal();
  const [overviewRef, overviewVisible] = useScrollReveal();
  const [contentRef, contentVisible] = useScrollReveal();
  const [participationRef, participationVisible] = useScrollReveal();
  const [privacyRef, privacyVisible] = useScrollReveal();
  const [processRef, processVisible] = useScrollReveal();
  const [impactRef, impactVisible] = useScrollReveal();
  const [ctaRef, ctaVisible] = useScrollReveal();

  // Tabs fixation after hero
  const [tabsFixed, setTabsFixed] = useState(false);
  const [headerOffsetPx, setHeaderOffsetPx] = useState(80);
  const tabsRef = useRef(null);
  const [tabsHeight, setTabsHeight] = useState(64);
  // Mobile underline indicator (content-sized tabs)
  const mobileTabRefs = useRef({});
  const [mobileIndicatorLeft, setMobileIndicatorLeft] = useState(0);
  const [mobileIndicatorWidth, setMobileIndicatorWidth] = useState(0);
  useEffect(() => {
    const computeHeaderOffset = () => {
      const heroEl = heroRef?.current;
      if (!heroEl) return;
      // Distance from document top to hero top ~= header height
      const headerH = heroEl.getBoundingClientRect().top + window.scrollY;
      if (headerH && headerH > 0) setHeaderOffsetPx(headerH);
      if (tabsRef.current) setTabsHeight(tabsRef.current.offsetHeight || 64);
    };
    const handle = () => {
      const heroEl = heroRef?.current;
      if (!heroEl) return;
      const heroBottom = heroEl.getBoundingClientRect().bottom + window.scrollY;
      const shouldFix = window.scrollY + headerOffsetPx >= heroBottom;
      setTabsFixed(shouldFix);
    };
    computeHeaderOffset();
    handle();
    window.addEventListener('scroll', handle, { passive: true });
    window.addEventListener('resize', computeHeaderOffset);
    return () => { window.removeEventListener('scroll', handle); window.removeEventListener('resize', computeHeaderOffset); };
  }, [heroRef, headerOffsetPx]);

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
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveTab(id);
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
    const el = mobileTabRefs.current[activeTab];
    if (el) {
      const rect = el.getBoundingClientRect();
      const parent = el.offsetParent?.getBoundingClientRect();
      const left = rect.left - (parent?.left || 0);
      setMobileIndicatorLeft(left);
      setMobileIndicatorWidth(rect.width);
      // Ensure visible
      el.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' });
    }
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

  return (
    <PublicLayout>
      {/* Hero Section (match Programs/Barangays gradient style) */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#24345A] via-[#1a2a47] to-[#0f1a2e] text-white -mt-12 sm:mt-0">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-white to-transparent rounded-full blur-xl" />
          <div className="absolute bottom-20 right-10 w-40 h-40 bg-gradient-to-tl from-white to-transparent rounded-full blur-xl" />
          <div className="absolute top-1/2 left-1/2 w-24 h-24 bg-gradient-to-br from-white to-transparent rounded-full blur-lg" />
        </div>
        <div 
          ref={heroRef}
          className={`relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 transition-all duration-1000 ease-out ${
            heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          
          <div className="text-center">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-xs font-semibold uppercase tracking-wider mb-4">
              KK Survey
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">Katipunan ng Kabataan Survey</h1>
            <p className="text-xl md:text-2xl text-white/90 mb-2">Demographic Assessment of Youth in San Jose, Batangas</p>
            <p className="text-white/80">Help shape youth policy through your participation.</p>
          </div>
            </div>
      </section>

      {/* Sticky Section Tabs */}
      <div ref={tabsRef} className={`${tabsFixed ? 'fixed left-0 right-0 z-[40]' : 'relative'} bg-gradient-to-r from-[#F6F8FF] via-[#EEF3FF] to-[#F6F8FF] border-b border-gray-100 shadow-sm`} style={tabsFixed ? { top: `${headerOffsetPx + -16}px` } : {}}>
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
            {/* Underline indicator (mobile: content width; desktop: full column) */}
            <div
              className="absolute bottom-0 h-0.5 bg-[#24345A] transition-all duration-300 ease-out"
              style={{ width: mobileIndicatorWidth || `${100 / tabs.length}%`, left: mobileIndicatorLeft || `${activeIndex * (100 / tabs.length)}%` }}
            />
          </div>
        </div>
      </div>
      {tabsFixed && <div style={{ height: tabsHeight }} />}
      

      {/* Survey Overview */}
      <section id="about" className="py-16 bg-white relative overflow-hidden">
        {/* Background decorative elements (subtle) */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-[#24345A] to-transparent rounded-full blur-xl" />
          <div className="absolute bottom-20 right-10 w-40 h-40 bg-gradient-to-tl from-[#24345A] to-transparent rounded-full blur-xl" />
        </div>
        <div 
          ref={overviewRef}
          className={`relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-1000 ease-out ${overviewVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          {/* Redesigned overview - card style */}
          <div className="mb-10 rounded-3xl bg-gradient-to-br from-white via-gray-50 to-white ring-1 ring-gray-200 p-6 md:p-8 shadow-sm">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-[#E7EBFF] text-[#24345A] text-xs font-semibold uppercase tracking-wider mb-3">About This Survey</div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">{surveyData.name}</h2>
            {/* Info ribbon */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <span className={`inline-flex items-center gap-2 text-xs font-bold px-2.5 py-1 rounded-full ${isLive ? 'bg-emerald-100 text-emerald-700' : isPaused ? 'bg-yellow-100 text-yellow-800' : isClosed ? 'bg-gray-200 text-gray-700' : 'bg-blue-100 text-blue-700'}`}>{isLive ? 'Live' : isPaused ? 'Paused' : isClosed ? 'Closed' : 'Upcoming'}</span>
              <span className="text-xs text-gray-600">{new Date(surveyData.start).toLocaleDateString()} – {new Date(surveyData.end).toLocaleDateString()}</span>
            </div>
            {/* Visual overview layout (image stack + progress) */}
            <div className="grid md:grid-cols-12 gap-6 items-stretch">
              {/* Left: progress + CTA + chips (moved) */}
              <div className="md:col-span-6 flex order-2 md:order-1">
                <div className="rounded-2xl ring-1 ring-gray-200 bg-white p-6 sm:p-7 shadow-sm w-full grid gap-5 content-start">
                  <p className="text-gray-700">We are conducting a town‑wide demographic assessment of the Katipunan ng Kabataan. Your honest responses directly inform SK and LYDO programs, budgeting, and local policies.</p>
                  <div className="text-sm text-gray-700 bg-[#E7EBFF]/50 ring-1 ring-[#E7EBFF] px-3 py-2 rounded-xl">
                    Your voice helps direct funding and programs for youth—thank you for participating.
                  </div>
                  {/* Feature chips */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="flex items-center gap-2 rounded-xl bg-gray-50 ring-1 ring-gray-200 px-3 py-2 text-sm text-gray-700"><Clock className="w-4 h-4 text-[#24345A]" />5–10 minutes</div>
                    <div className="flex items-center gap-2 rounded-xl bg-gray-50 ring-1 ring-gray-200 px-3 py-2 text-sm text-gray-700"><Users className="w-4 h-4 text-[#24345A]" />Ages 15–30</div>
                    <div className="flex items-center gap-2 rounded-xl bg-gray-50 ring-1 ring-gray-200 px-3 py-2 text-sm text-gray-700"><MapPin className="w-4 h-4 text-[#24345A]" />San Jose</div>
                  </div>
                  {/* Progress rows */}
                  <div>
                    <div className="flex items-center justify-between text-sm text-gray-700 mb-1">
                      <span>Participation Progress</span>
                      <span className="font-semibold">{progressPercentage}%</span>
                    </div>
                    <div
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={progressPercentage}
                      className="h-2.5 bg-gray-200 rounded-full overflow-hidden"
                    >
                      <div className="h-full bg-[#24345A] rounded-full" style={{ width: `${progressPercentage}%` }} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div>
                      <div className="text-2xl font-bold text-gray-900">{surveyData.current.toLocaleString()}+</div>
                      <div className="text-xs text-gray-600">Participants</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900">{daysLeft}</div>
                      <div className="text-xs text-gray-600">Days Left</div>
                    </div>
                  </div>
                  <div>
                    <Link
                      to={isLive ? '/kk-survey/terms' : '#'}
                      onClick={(e) => { if (!isLive) e.preventDefault(); }}
                      className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#24345A] text-white text-sm font-semibold hover:bg-[#1a2a4a] shadow ${!isLive ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      {isLive ? 'Start Survey' : isPaused ? 'Survey Paused' : isClosed ? 'Closed' : `Opens in ${daysToOpen} day${daysToOpen === 1 ? '' : 's'}`}
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
            </div>
            </div>
              {/* Right: Quick FAQ (replaces images) */}
              <div className="md:col-span-6 order-1 md:order-2">
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
                      Need help? Message our official FB page or email
                      <a href="mailto:lydo@example.com" className="text-[#24345A] font-semibold underline"> lydo@example.com</a>.
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


          {/* Timeline & Help */}
          <div className="mt-6 grid md:grid-cols-2 gap-6">
            {/* Timeline strip */}
            <div className="rounded-2xl ring-1 ring-gray-200 bg-white p-6">
              <h4 className="text-base font-semibold text-gray-900 mb-3">Timeline</h4>
              <div className="flex items-center justify-between text-sm text-gray-700">
                <div className="flex-1">
                  <div className="font-medium">Opens</div>
                  <div>{new Date(surveyData.start).toLocaleDateString()}</div>
                </div>
                <div className="mx-3 h-0.5 flex-1 bg-gradient-to-r from-[#E7EBFF] to-[#24345A] rounded-full" />
                <div className="flex-1 text-right">
                  <div className="font-medium">Closes</div>
                  <div>{new Date(surveyData.end).toLocaleDateString()}</div>
              </div>
              </div>
              <div className="mt-3 text-xs text-gray-500">Aggregate findings will be published after the survey window closes.</div>
            </div>
            {/* FAQ micro */}
            <div className="rounded-2xl ring-1 ring-gray-200 bg-white p-6">
              <h4 className="text-base font-semibold text-gray-900 mb-3">Quick FAQ</h4>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>
                  <span className="font-medium text-gray-900">Do I need an account?</span> No—just your email for duplicate prevention.
                </li>
                <li>
                  <span className="font-medium text-gray-900">Can I use my phone?</span> Yes, the survey works great on mobile.
                </li>
                <li>
                  <span className="font-medium text-gray-900">How long will it take?</span> About 5–10 minutes for most participants.
                </li>
              </ul>
            </div>
          </div>

          {/* Help */}
          <div className="mt-6 text-sm text-gray-600">
            Need help? Message our official FB page or email <a href="mailto:lydo@example.com" className="text-[#24345A] font-semibold underline">lydo@example.com</a>.
          </div>
        </div>
      </section>

      {/* What We Ask */}
      <section id="content" className="pb-16 bg-gray-50 relative overflow-hidden" style={{ paddingTop: tabsFixed ? tabsHeight + 16 : 16 }}>
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-20 right-10 w-28 h-28 bg-gradient-to-br from-[#24345A] to-transparent rounded-full blur-xl" />
        </div>
        <div 
          ref={contentRef}
          className={`relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-1000 ease-out ${contentVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          <div className="text-center mb-12">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-[#E7EBFF] text-[#24345A] text-xs font-semibold uppercase tracking-wider mb-4">
              Survey Content
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              What We Ask
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              The survey covers essential demographic information needed for youth governance research and policy development.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Profile Information */}
            <div className="relative bg-white rounded-2xl p-6 shadow-sm ring-1 ring-gray-200 group">
              <div className="absolute -inset-2 rounded-2xl bg-gradient-to-br from-emerald-300/30 via-teal-200/25 to-sky-300/30 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" />
              <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-[#E7EBFF] flex items-center justify-center">
                  <User className="w-5 h-5 text-[#24345A]" />
              </div>
                <h3 className="text-lg font-semibold text-gray-900">Profile Information</h3>
              </div>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Name and location details</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Contact information</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Age and birthday</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Sex assigned at birth</span>
                </li>
              </ul>
              </div>
            </div>

            {/* Demographic Characteristics */}
            <div className="relative bg-white rounded-2xl p-6 shadow-sm ring-1 ring-gray-200 group">
              <div className="absolute -inset-2 rounded-2xl bg-gradient-to-br from-emerald-300/30 via-teal-200/25 to-sky-300/30 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" />
              <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-[#E7EBFF] flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-[#24345A]" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Demographics</h3>
              </div>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Civil status</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Youth classification</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Work status</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Educational background</span>
                </li>
              </ul>
              </div>
            </div>

            {/* Civic Engagement */}
            <div className="relative bg-white rounded-2xl p-6 shadow-sm ring-1 ring-gray-200 group">
              <div className="absolute -inset-2 rounded-2xl bg-gradient-to-br from-emerald-300/30 via-teal-200/25 to-sky-300/30 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" />
              <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-[#E7EBFF] flex items-center justify-center">
                  <Vote className="w-5 h-5 text-[#24345A]" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Civic Engagement</h3>
                </div>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>SK voter registration</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>National voter status</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>KK Assembly participation</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Voting history</span>
                </li>
              </ul>
              </div>
            </div>
          </div>

          {/* Sample Questions note */}
          <div className="mt-8 text-sm text-gray-600 text-center">
            These are the themes we ask about. No uploads required and you can complete the survey in one sitting.
          </div>
        </div>
      </section>

      {/* Eligibility & Requirements */}
      <section id="participation" className="py-16 bg-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-20 left-10 w-28 h-28 bg-gradient-to-br from-[#24345A] to-transparent rounded-full blur-xl" />
        </div>
        <div 
          ref={participationRef}
          className={`relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-1000 ease-out ${participationVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          <div className="text-center mb-12">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-[#E7EBFF] text-[#24345A] text-xs font-semibold uppercase tracking-wider mb-4">
              Participation
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Who Can Participate
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              All youth residents of San Jose, Batangas are encouraged to participate in this important demographic assessment.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Eligibility */}
            <div className="relative bg-gray-50 rounded-2xl p-6 ring-1 ring-gray-200 group">
              <div className="absolute -inset-2 rounded-2xl bg-gradient-to-br from-emerald-300/20 via-teal-200/15 to-sky-300/20 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" />
              <div className="relative z-10">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                Eligibility Requirements
              </h3>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#24345A] mt-2 flex-shrink-0" />
                  <span><strong>Ages 15-30</strong> - All youth age groups</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#24345A] mt-2 flex-shrink-0" />
                  <span><strong>San Jose residents</strong> - Must be a resident of San Jose, Batangas</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#24345A] mt-2 flex-shrink-0" />
                  <span><strong>All youth types:</strong></span>
                </li>
                <li className="flex items-start gap-3 ml-6">
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-2 flex-shrink-0" />
                  <span>In School Youth</span>
                </li>
                <li className="flex items-start gap-3 ml-6">
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-2 flex-shrink-0" />
                  <span>Out of School Youth</span>
                </li>
                <li className="flex items-start gap-3 ml-6">
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-2 flex-shrink-0" />
                  <span>Working Youth</span>
                </li>
                <li className="flex items-start gap-3 ml-6">
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-2 flex-shrink-0" />
                  <span>Youth with Specific Needs (PWD, CICL, Indigenous People)</span>
                </li>
              </ul>
          </div>
            </div>

            {/* Requirements */}
            <div className="relative bg-gray-50 rounded-2xl p-6 ring-1 ring-gray-200 group">
              <div className="absolute -inset-2 rounded-2xl bg-gradient-to-br from-emerald-300/20 via-teal-200/15 to-sky-300/20 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" />
              <div className="relative z-10">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#24345A]" />
                Survey Requirements
              </h3>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#24345A] mt-2 flex-shrink-0" />
                  <span><strong>Valid address</strong> - Must provide valid San Jose, Batangas address</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#24345A] mt-2 flex-shrink-0" />
                  <span><strong>One response per person</strong> - Only one survey per individual</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#24345A] mt-2 flex-shrink-0" />
                  <span><strong>Email for verification</strong> - Used only for duplicate prevention</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#24345A] mt-2 flex-shrink-0" />
                  <span><strong>Honest responses</strong> - Please answer all questions accurately</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#24345A] mt-2 flex-shrink-0" />
                  <span><strong>Mobile-friendly</strong> - Can be completed on any device</span>
                </li>
            </ul>
          </div>
            </div>
          </div>
        </div>
      </section>

      {/* Privacy & Data Protection */}
      <section id="privacy" className="py-16 bg-gray-50">
        <div 
          ref={privacyRef}
          className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-1000 ease-out ${privacyVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          <div className="text-center mb-12">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-[#E7EBFF] text-[#24345A] text-xs font-semibold uppercase tracking-wider mb-4">
              Privacy & Security
                        </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Your Privacy is Protected
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              All information gathered will be treated with utmost confidentiality and used solely for youth governance research purposes.
                        </p>
                      </div>

          <div className="relative bg-white rounded-2xl p-8 shadow-sm ring-1 ring-gray-200 group">
            <div className="absolute -inset-2 rounded-2xl bg-gradient-to-br from-emerald-300/30 via-teal-200/25 to-sky-300/30 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" />
            <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">100% Confidential</h3>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Data Protection</h4>
                <ul className="space-y-3 text-gray-600">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>All information kept confidential</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Used solely for youth governance research</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Aggregated findings only - no individual data shared</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>DPA-compliant data handling</span>
                  </li>
                </ul>
                </div>
              
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Survey Process</h4>
                <ul className="space-y-3 text-gray-600">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>No account creation required</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Email used only for duplicate prevention</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>All responses are encrypted and secure</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>You may participate in multiple survey batches</span>
                  </li>
                </ul>
              </div>
              </div>
            </div>
            {/* Micro-FAQ */}
            <div className="mt-6 grid md:grid-cols-2 gap-6">
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
                <p className="text-sm text-gray-600">Contact LYDO at <a href="mailto:lydo@example.com" className="text-[#24345A] font-semibold underline">lydo@example.com</a>. We’re happy to help.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How to Participate */}
      <section id="process" className="py-16 bg-white">
        <div 
          ref={processRef}
          className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-1000 ease-out ${processVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          <div className="text-center mb-12">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-[#E7EBFF] text-[#24345A] text-xs font-semibold uppercase tracking-wider mb-4">
              Process
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How to Participate
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Follow these simple steps to complete your KK Survey participation.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-[#24345A] flex items-center justify-center text-white font-bold text-2xl mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Start Survey</h3>
              <p className="text-gray-600">
                Click "Begin KK Survey" and confirm your eligibility as a youth resident of San Jose, Batangas.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-[#24345A] flex items-center justify-center text-white font-bold text-2xl mb-4">
                2
                 </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Answer Questions</h3>
              <p className="text-gray-600">
                Complete all sections honestly: profile information, demographics, and civic engagement.
              </p>
              </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-[#24345A] flex items-center justify-center text-white font-bold text-2xl mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Submit Response</h3>
              <p className="text-gray-600">
                Review your responses and submit. Your data contributes to youth policy development.
              </p>
             </div>
           </div>
         </div>
       </section>
      
      {/* Impact & Results */}
      <section id="impact" className="py-16 bg-gray-50">
        <div 
          ref={impactRef}
          className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-1000 ease-out ${impactVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          <div className="text-center mb-12">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-[#E7EBFF] text-[#24345A] text-xs font-semibold uppercase tracking-wider mb-4">
              Impact
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How Your Data Makes a Difference
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Your participation directly influences youth policy and program development in San Jose, Batangas.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-start">
            <div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-6">Data Utilization</h3>
              <ul className="space-y-4 text-gray-600">
                <li className="flex items-start gap-3">
                  <BarChart3 className="w-5 h-5 text-[#24345A] mt-1 flex-shrink-0" />
                  <span>Policy recommendations for local government</span>
                </li>
                <li className="flex items-start gap-3">
                  <BarChart3 className="w-5 h-5 text-[#24345A] mt-1 flex-shrink-0" />
                  <span>Program design and resource allocation</span>
                </li>
                <li className="flex items-start gap-3">
                  <BarChart3 className="w-5 h-5 text-[#24345A] mt-1 flex-shrink-0" />
                  <span>SK council capacity building initiatives</span>
                </li>
                <li className="flex items-start gap-3">
                  <BarChart3 className="w-5 h-5 text-[#24345A] mt-1 flex-shrink-0" />
                  <span>Community development planning</span>
                </li>
              </ul>
            </div>
            
            <div className="relative bg-white rounded-2xl p-6 shadow-sm ring-1 ring-gray-200 group">
              <div className="absolute -inset-2 rounded-2xl bg-gradient-to-br from-emerald-300/30 via-teal-200/25 to-sky-300/30 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" />
              <div className="relative z-10">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Current Progress</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm text-gray-700 mb-2">
                    <span>Survey Progress</span>
                    <span className="font-semibold">{progressPercentage}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#E7EBFF] to-[#24345A] rounded-full" style={{ width: `${progressPercentage}%` }} />
                  </div>
                  <div className="mt-2 text-sm text-center text-gray-600">
                    {surveyData.current.toLocaleString()} of {surveyData.target.toLocaleString()} participants
                  </div>
                </div>
                
                <div className="pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-600">
                    <strong>Survey Window:</strong><br />
                    {new Date(surveyData.start).toLocaleDateString()} – {new Date(surveyData.end).toLocaleDateString()}
                  </div>
                </div>
              </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final Call to Action */}
      <section id="cta" className="py-16 bg-white">
        <div 
          ref={ctaRef}
          className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-1000 ease-out ${ctaVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Ready to Make Your Voice Heard?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
              Join {surveyData.current.toLocaleString()}+ youth who have already participated in shaping the future of San Jose, Batangas.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
              <Link 
                to={isLive ? '/kk-survey/terms' : '#'}
                onClick={(e) => { if (!isLive) e.preventDefault(); }}
                className={`inline-flex items-center gap-2 px-8 py-4 rounded-full font-semibold transition-colors shadow-lg text-lg ${isLive ? 'bg-[#24345A] text-white hover:bg-[#1a2a4a] hover:shadow-xl' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
                aria-disabled={!isLive}
              >
                {isLive ? 'Begin KK Survey' : isPaused ? 'Survey Paused' : `Opens on ${new Date(surveyData.start).toLocaleDateString()}`}
                <ArrowRight className="w-5 h-5" />
              </Link>
              <div className="text-sm text-gray-600">
                <span className="font-semibold text-[#24345A]">{surveyData.current.toLocaleString()}</span> participants so far
          </div>
            </div>

            <div className="text-sm text-gray-500 italic">
              "Your responses help shape youth programs in our community"
            </div>
          </div>
        </div>
      </section>
      {/* Sticky Bottom CTA (mobile) */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-gray-200 p-3">
        <div className="max-w-7xl mx-auto px-2">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-gray-600">
              {isLive ? 'KK Survey is open' : isPaused ? 'Survey is paused' : `Opens ${new Date(surveyData.start).toLocaleDateString()}`}
            </div>
            <Link 
              to={isLive ? '/kk-survey/terms' : '#'}
              onClick={(e) => { if (!isLive) e.preventDefault(); }}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm ${isLive ? 'bg-[#24345A] text-white' : 'bg-gray-200 text-gray-500'}`}
              aria-disabled={!isLive}
            >
              {isLive ? 'Start Survey' : isPaused ? 'Paused' : 'Coming Soon'}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default SurveyLanding;