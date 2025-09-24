import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  FileText, 
  ArrowRight, 
  ChevronDown, 
  ChevronUp,
  ArrowLeft, 
  Mail, 
  User, 
  Shield, 
  Info, 
  Check, 
  Loader2, 
  Cloud,
  BarChart3,
  Fingerprint,
  Lock,
  CheckCircle,
  AlertCircle,
  Phone,
  MapPin
} from 'lucide-react';
import { 
  SurveyLayout, 
  SurveyHeader, 
  Card, 
  Button, 
  Input, 
  Select, 
  RadioGroup,
  SurveySummary 
} from '../../../components/survey';

// Theme configuration
const theme = {
  colors: {
    primary: '#2563EB',
    secondary: '#059669',
    warning: '#D97706',
    purple: '#7C3AED',
    error: '#DC2626',
    white: '#FFFFFF',
    gray50: '#F8FAFC',
    gray100: '#F3F4F6',
    gray200: '#E2E8F0',
    gray300: '#D1D5DB',
    gray400: '#9CA3AF',
    gray500: '#64748B',
    gray600: '#4B5563',
    gray700: '#374151',
    gray800: '#1F2937',
    gray900: '#111827',
  }
};

const SURVEY_CONSTANTS = {
  GOVERNMENT_INFO: {
    OFFICE: "Local Youth Development Office",
    MUNICIPALITY: "San Jose",
    PROVINCE: "Batangas",
    SURVEY_AUTHORITY: "Republic Act 8044 - Youth in Nation-Building Act",
    PRIVACY_LAW: "Data Privacy Act of 2012 (RA 10173)",
  },
};

const legalContent = {
  terms_and_conditions: {
    content: [
      {
        section: 'Government Authority',
        content: 'This survey is conducted under the authority of Republic Act 8044 (Youth in Nation-Building Act) by the Local Youth Development Office of San Jose, Batangas. Participation is voluntary and responses will be used for youth program planning and policy development.'
      },
      {
        section: 'Survey Purpose',
        content: 'The KK Survey aims to assess the needs, interests, and demographics of youth aged 15-30 in San Jose, Batangas to improve local youth programs and services.'
      },
      {
        section: 'Voluntary Participation',
        content: 'Your participation is entirely voluntary. You may choose not to participate or withdraw at any time without penalty or consequence.'
      }
    ]
  },
  privacy_notice: {
    content: [
      {
        section: 'Data Collection',
        content: 'We collect personal information necessary for demographic analysis and program planning. This includes age, gender, education, employment status, and program interests.'
      },
      {
        section: 'Data Protection',
        content: 'All personal data is protected under the Data Privacy Act of 2012 (RA 10173). Your information is kept confidential and secure.'
      },
      {
        section: 'Data Usage',
        content: 'Information collected will be used solely for youth development planning, program improvement, and statistical reporting. Data will not be shared with unauthorized parties.'
      }
    ]
  }
};

const SurveyTerms = () => {
  const navigate = useNavigate();
  const [acceptedSections, setAcceptedSections] = useState({
    terms: false,
    privacy: false,
    voluntary: false,
    dataUse: false,
    rights: false
  });

  const [viewedSections, setViewedSections] = useState({
    terms: false,
    privacy: false,
    voluntary: false,
    dataUse: false,
    rights: false
  });

  const [expandedSections, setExpandedSections] = useState({});
  const [allAccepted, setAllAccepted] = useState(false);
  const [showMobileDetails, setShowMobileDetails] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);

  // Check if all sections are accepted and viewed
  useEffect(() => {
    const allSectionsAccepted = Object.values(acceptedSections).every(accepted => accepted);
    const allSectionsViewed = Object.values(viewedSections).every(viewed => viewed);
    setAllAccepted(allSectionsAccepted && allSectionsViewed);
  }, [acceptedSections, viewedSections]);

  // Auto-save functionality
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsSaving(true);
      try {
        const draft = { 
          terms: { 
            acceptedSections, 
            viewedSections, 
            allAccepted 
          } 
        };
        localStorage.setItem('kk_survey_terms_draft_v1', JSON.stringify(draft));
        setLastSavedAt(new Date());
      } finally {
        setIsSaving(false);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [acceptedSections, viewedSections, allAccepted]);

  const legalSections = [
    {
      id: 'terms',
      title: 'Terms and Conditions',
      icon: FileText,
      color: theme.colors.primary,
      content: legalContent.terms_and_conditions.content,
      summary: 'This survey is conducted under government authority with your voluntary participation.'
    },
    {
      id: 'privacy',
      title: 'Data Privacy Notice',
      icon: Shield,
      color: theme.colors.secondary,
      content: legalContent.privacy_notice.content,
      summary: 'Your personal data is protected under the Data Privacy Act of 2012.'
    },
    {
      id: 'voluntary',
      title: 'Voluntary Participation',
      icon: User,
      color: theme.colors.warning,
      content: [
        {
          section: 'Voluntary Nature',
          content: 'Your participation in this KK Survey is entirely voluntary. You may choose not to participate or withdraw at any time without consequences. There is no penalty for non-participation or withdrawal.'
        },
        {
          section: 'No Compensation',
          content: 'Participation in this survey is voluntary and no compensation, incentive, or reward will be provided. Your participation is a civic contribution to youth development planning.'
        }
      ],
      summary: 'Participation is completely voluntary with no obligations or penalties.'
    },
    {
      id: 'dataUse',
      title: 'Data Usage and Purpose',
      icon: BarChart3,
      color: theme.colors.purple,
      content: [
        {
          section: 'Primary Purpose',
          content: 'Data collected will be used exclusively for youth development program planning, policy formulation, and service improvement within San Jose, Batangas.'
        },
        {
          section: 'Anonymization',
          content: 'All responses are anonymized immediately upon submission. No personally identifiable information is stored or linked to your responses.'
        },
        {
          section: 'Data Sharing',
          content: 'Aggregated, anonymous data may be shared with relevant government agencies for policy development. Individual responses will never be shared or published.'
        },
        {
          section: 'Retention Period',
          content: 'Anonymous survey data will be retained for 5 years for statistical and research purposes, after which it will be securely destroyed.'
        }
      ],
      summary: 'Data is used solely for youth program planning and kept completely anonymous.'
    },
    {
      id: 'rights',
      title: 'Your Rights as Data Subject',
      icon: Fingerprint,
      color: theme.colors.error,
      content: [
        {
          section: 'Right to Information',
          content: 'You have the right to be informed about the collection and processing of your personal data, including the purpose, legal basis, and retention period.'
        },
        {
          section: 'Right to Access',
          content: 'You have the right to reasonable access to your personal data, including the right to know whether personal data pertaining to you is being processed.'
        },
        {
          section: 'Right to Rectification',
          content: 'You have the right to dispute the inaccuracy or error in the personal data and have it corrected immediately, unless the request is vexatious or otherwise unreasonable.'
        },
        {
          section: 'Right to Erasure',
          content: 'You have the right to suspend, withdraw or order the blocking, removal or destruction of your personal data from the processing system.'
        },
        {
          section: 'Right to Damages',
          content: 'You have the right to be indemnified for any damages sustained due to inaccurate, incomplete, outdated, false, unlawfully obtained or unauthorized use of personal data.'
        }
      ],
      summary: 'You have complete rights over your data under Philippine law.'
    }
  ];

  // Legal Section Card Component
  const LegalSectionCard = ({ 
    section, 
    isExpanded, 
    isViewed, 
    isAccepted, 
    onToggleExpand, 
    onToggleAccept 
  }) => {
    const handleAcceptClick = () => {
      if (!isViewed) {
        alert("Please read this section before accepting it.");
        return;
      }
      onToggleAccept();
  };

  return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
        {/* Section Header */}
        <button
          onClick={onToggleExpand}
          className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-t-xl"
        >
          <div className="flex items-center flex-1">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center mr-4 relative"
              style={{ backgroundColor: `${section.color}15` }}
            >
              <section.icon size={20} color={section.color} />
              {isViewed && (
                <div className="absolute -top-1 -right-1 bg-white rounded-full">
                  <CheckCircle size={12} className="text-green-600" />
        </div>
              )}
          </div>
            <div className="text-left flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">{section.title}</h3>
              <p className="text-sm text-gray-500">
                {section.summary}
                {!isViewed && (
                  <span className="text-yellow-600 font-medium"> • Must read to accept</span>
                )}
          </p>
        </div>
          </div>
          <div className="flex items-center gap-2">
            {!isViewed && (
              <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded-full font-medium">
                Tap to read
              </span>
            )}
            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        </button>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="px-6 pb-4 border-t border-gray-100">
            <div className="py-4">
              {section.content.map((item, index) => (
                <div key={index} className="mb-6 last:mb-0">
                  <h4 className="text-base font-semibold text-gray-800 mb-2">{item.section}</h4>
                  <p className="text-gray-600 leading-relaxed">{item.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Acceptance Checkbox */}
        <div className="px-6 pb-6 border-t border-gray-100">
          <button
            onClick={handleAcceptClick}
            disabled={!isViewed}
            className={`flex items-center w-full pt-4 transition-colors ${
              !isViewed ? 'opacity-60 cursor-not-allowed' : 'hover:bg-gray-50'
            }`}
          >
            <div className={`w-5 h-5 rounded border-2 mr-3 flex items-center justify-center transition-colors ${
              isAccepted 
                ? 'bg-blue-600 border-blue-600' 
                : !isViewed
                ? 'bg-gray-100 border-gray-300'
                : 'border-gray-300 hover:border-gray-400'
            }`}>
              {isAccepted ? (
                <Check size={14} className="text-white" />
              ) : !isViewed ? (
                <Lock size={12} className="text-gray-400" />
              ) : null}
            </div>
            <span className={`text-sm ${
              !isViewed ? 'text-gray-400 italic' : 'text-gray-700'
            }`}>
              {isViewed 
                ? `I have read and accept the ${section.title.toLowerCase()}` 
                : `Please read the ${section.title.toLowerCase()} first`
              }
            </span>
          </button>
        </div>
      </div>
    );
  };

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
    
    // Mark section as viewed when expanded for the first time
    if (!expandedSections[sectionId] && !viewedSections[sectionId]) {
      setViewedSections(prev => ({
        ...prev,
        [sectionId]: true
      }));
    }
  };

  const toggleAcceptance = (sectionId) => {
    setAcceptedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const demoAcceptAll = () => {
    setViewedSections({ terms: true, privacy: true, voluntary: true, dataUse: true, rights: true });
    setAcceptedSections({ terms: true, privacy: true, voluntary: true, dataUse: true, rights: true });
  };

  const onContinue = () => {
    if (!allAccepted) {
      const unviewedSections = Object.keys(viewedSections).filter(key => !viewedSections[key]);
      const unacceptedSections = Object.keys(acceptedSections).filter(key => !acceptedSections[key]);
      
      let message = "";
      if (unviewedSections.length > 0) {
        message += `Please read the following sections first:\n• ${unviewedSections.map(id => 
          legalSections.find(s => s.id === id)?.title || id
        ).join('\n• ')}\n\n`;
      }
      if (unacceptedSections.length > 0) {
        message += `Please accept the following sections:\n• ${unacceptedSections.map(id => 
          legalSections.find(s => s.id === id)?.title || id
        ).join('\n• ')}`;
      }
      
      alert(message || "Please read and accept all terms and conditions to proceed with the survey.");
      return;
    }

    console.log('Legal consent data:', {
      acceptedAt: new Date().toISOString(),
      acceptedSections,
      ipAddress: 'N/A',
      userAgent: navigator.userAgent
    });
    navigate('/kk-survey/step-2');
  };


  return (
    <SurveyLayout>
      {/* Top utility bar */}
      <div className="bg-[#24345A] fixed top-0 left-0 right-0 z-40">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 h-10 flex items-center justify-between">
          <button 
            onClick={() => navigate('/')} 
            title="Return to main website"
            className="inline-flex items-center gap-2 text-xs text-white/85 hover:text-white hover:bg-white/10 px-2.5 py-1 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            <ArrowLeft className="w-3.5 h-3.5 opacity-90" />
            <span className="tracking-wide">Back to Website</span>
          </button>
          <a
            href="mailto:lydo@sanjosebatangas.gov.ph"
            title="Contact LYDO via email"
            className="inline-flex items-center gap-2 text-xs text-white/85 hover:text-white bg-white/5 hover:bg-white/10 border border-white/15 px-2.5 py-1 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            <Mail className="w-3.5 h-3.5 opacity-90" />
            <span className="tracking-wide">lydo@sanjosebatangas.gov.ph</span>
          </a>
        </div>
        </div>

      {/* Enhanced Survey Header */}
      <div className="bg-white border-b border-gray-200 fixed top-[40px] left-0 right-0 z-30">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Main Header Row */}
          <div className="py-3 sm:py-4">
            {/* Desktop: Horizontal Layout */}
            <div className="hidden sm:grid grid-cols-3 items-center">
              {/* Left: Municipality Info */}
              <div className="flex items-center gap-3">
                <img src={new URL('../../../assets/logos/san_jose_logo.webp', import.meta.url).toString()} alt="Municipality Seal" className="w-9 h-9 rounded-full border" />
                <div>
                  <div className="text-sm text-gray-600">Municipality of San Jose, Batangas</div>
                  <div className="text-xs text-gray-500">Local Youth Development Office</div>
          </div>
        </div>

              {/* Center: Survey Title */}
              <div className="flex justify-center">
                <h1 className="text-xl font-bold text-gray-900">KK Survey 2025</h1>
              </div>

              {/* Right: Progress & Status */}
              <div className="flex items-center gap-6 justify-end">
                {/* Progress Info */}
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-900">Step 1 of 5</div>
                  <div className="text-sm text-gray-600">Terms & Consent</div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 transition-all duration-300 rounded-full" style={{ width: `${(1 / 5) * 100}%` }} />
                    </div>
                    <span className="text-sm font-semibold text-blue-600">{Math.round((1 / 5) * 100)}%</span>
                  </div>
                </div>

                {/* Save Status */}
                <div className="flex items-center">
                  {isSaving ? (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-orange-50 border border-orange-200 rounded-full">
                      <Loader2 className="w-3 h-3 animate-spin text-orange-500" />
                      <span className="text-orange-700 text-xs font-medium">Saving...</span>
                    </div>
                  ) : lastSavedAt ? (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 border border-green-200 rounded-full">
                      <Check className="w-3 h-3 text-green-600" />
                      <span className="text-green-700 text-xs font-medium">Last saved: {lastSavedAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 border border-gray-200 rounded-full">
                      <Cloud className="w-3 h-3 text-gray-500" />
                      <span className="text-gray-600 text-xs font-medium">Auto-save</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Mobile: Stacked Layout */}
            <div className="block sm:hidden">
              {/* Municipality Info - Mobile (Always Visible) */}
              <div className="flex items-center gap-2">
                <img src={new URL('../../../assets/logos/san_jose_logo.webp', import.meta.url).toString()} alt="Municipality Seal" className="w-7 h-7 rounded-full border flex-shrink-0" />
                <div className="text-left flex-1 min-h-[28px] flex flex-col justify-center">
                  <div className="text-xs text-gray-600 leading-tight">Municipality of San Jose, Batangas</div>
                  <div className="text-xs text-gray-500 leading-tight">Local Youth Development Office</div>
                </div>
                <button
                  onClick={() => setShowMobileDetails(!showMobileDetails)}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
                  aria-label={showMobileDetails ? "Hide survey details" : "Show survey details"}
                >
                  <div className={`transition-transform duration-300 ease-in-out ${
                    showMobileDetails ? 'rotate-180' : 'rotate-0'
                  }`}>
                    <ChevronDown className="w-4 h-4 text-gray-500" />
        </div>
                </button>
          </div>

              {/* Collapsible Survey Details - Mobile */}
              <div className={`transition-all duration-300 ease-in-out ${
                showMobileDetails 
                  ? 'max-h-96 opacity-100 transform translate-y-0' 
                  : 'max-h-0 opacity-0 transform -translate-y-2'
              } overflow-hidden`}>
                <div className="space-y-3 border-t border-gray-100 pt-4 mt-3">
                  {/* Survey Title - Mobile */}
                  <div className="text-center">
                    <h1 className="text-lg font-bold text-gray-900">KK Survey 2025</h1>
        </div>

                  {/* Progress & Status - Mobile */}
                  <div className="space-y-3">
                    {/* Progress Info */}
                    <div className="flex items-center justify-between">
                      <div className="text-left">
                        <div className="text-sm font-semibold text-gray-900">Step 1 of 5</div>
                        <div className="text-xs text-gray-600">Terms & Consent</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-600 transition-all duration-300 rounded-full" style={{ width: `${(1 / 5) * 100}%` }} />
                        </div>
                        <span className="text-sm font-semibold text-blue-600">{Math.round((1 / 5) * 100)}%</span>
          </div>
        </div>

                    {/* Save Status */}
                    <div className="flex items-center justify-center">
                      {isSaving ? (
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-orange-50 border border-orange-200 rounded-full">
                          <Loader2 className="w-3 h-3 animate-spin text-orange-500" />
                          <span className="text-orange-700 text-xs font-medium">Saving...</span>
                        </div>
                      ) : lastSavedAt ? (
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 border border-green-200 rounded-full">
                          <Check className="w-3 h-3 text-green-600" />
                          <span className="text-green-700 text-xs font-medium">Last saved: {lastSavedAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 border border-gray-200 rounded-full">
                          <Cloud className="w-3 h-3 text-gray-500" />
                          <span className="text-gray-600 text-xs font-medium">Auto-save</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
              </div>
                
      <div className="min-h-screen bg-gray-50">
        {/* Progress Indicator */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Terms Acceptance Progress</h2>
                <p className="text-sm text-gray-600">
                  {Object.values(acceptedSections).filter(Boolean).length} of {Object.keys(acceptedSections).length} sections completed
                </p>
              </div>
              <div className="bg-blue-50 px-3 py-1 rounded-full">
                <span className="text-sm font-semibold text-blue-600">
                  {Math.round((Object.values(acceptedSections).filter(Boolean).length / Object.keys(acceptedSections).length) * 100)}%
                </span>
              </div>
            </div>

            <div className="relative">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${(Object.values(acceptedSections).filter(Boolean).length / Object.keys(acceptedSections).length) * 100}%` }}
                />
              </div>
              <div className="absolute top-0 left-0 right-0 bottom-0 flex justify-between items-center px-1">
                {Object.keys(acceptedSections).map((sectionId, index) => {
                  const isAccepted = acceptedSections[sectionId];
                  const isViewed = viewedSections[sectionId];
                  
                  return (
                    <div
                      key={sectionId}
                      className={`w-3 h-3 rounded-full transition-all duration-200 ${
                        isAccepted 
                          ? 'bg-blue-600' 
                          : isViewed 
                          ? 'bg-yellow-500' 
                          : 'bg-gray-300'
                      }`}
                    />
                  );
                })}
              </div>
            </div>
                </div>
            </div>

        <div className="max-w-4xl mx-auto px-6 py-8">

          {/* Header */}
          <div className="bg-gray-50 text-center py-8 mb-8 rounded-xl">
            <div className="inline-flex items-center bg-white px-4 py-2 rounded-full border border-gray-200 mb-4">
              <Shield size={20} className="text-blue-600 mr-2" />
              <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
                Legal Compliance Required
              </span>
                </div>
                
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms & Conditions</h1>
            <p className="text-lg text-gray-600 mb-4 max-w-2xl mx-auto">
              Please read and accept all terms before proceeding with the KK Survey
            </p>
            <div className="flex justify-center mb-2">
              <button
                onClick={demoAcceptAll}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Demo: Accept All Terms
              </button>
            </div>
            
                </div>
                
          {/* Legal Sections */}
          {legalSections.map((section) => (
            <LegalSectionCard
              key={section.id}
              section={section}
              isExpanded={expandedSections[section.id]}
              isViewed={viewedSections[section.id]}
              isAccepted={acceptedSections[section.id]}
              onToggleExpand={() => toggleSection(section.id)}
              onToggleAccept={() => toggleAcceptance(section.id)}
            />
          ))}

          {/* Government Authority */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="text-center mb-6">
              <Shield size={32} className="text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900">Official Government Survey</h3>
                </div>
                
            <div className="space-y-4">
              <div className="border-b border-gray-200 pb-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Legal Authority:
                </p>
                <p className="text-gray-700">{SURVEY_CONSTANTS.GOVERNMENT_INFO.SURVEY_AUTHORITY}</p>
                </div>
                
              <div className="border-b border-gray-200 pb-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Privacy Compliance:
                </p>
                <p className="text-gray-700">{SURVEY_CONSTANTS.GOVERNMENT_INFO.PRIVACY_LAW}</p>
                </div>
                
                <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Conducting Office:
                </p>
                <p className="text-gray-700">
                  {SURVEY_CONSTANTS.GOVERNMENT_INFO.OFFICE}, {SURVEY_CONSTANTS.GOVERNMENT_INFO.MUNICIPALITY}
                </p>
              </div>
            </div>
                </div>
                
          {/* Questions or Concerns - Match Thank You layout */}
          <div className="mt-16 mb-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-[#E7EBFF] text-[#24345A] text-xs font-semibold uppercase tracking-wider mb-2">Contact</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Questions or Concerns?</h3>
              <p className="text-gray-600 max-w-3xl mx-auto">Need help with the survey? Contact us for inquiries, technical support, or any questions about your participation.</p>
            </div>
            <div className="mt-5 mb-10 h-[2px] w-full max-w-4xl mx-auto bg-gradient-to-r from-[#E7EBFF] via-[#F1E9FF] to-[#FDE7F1] opacity-90 rounded-full" aria-hidden="true" />

            <div className="max-w-6xl mx-auto">
              <div className="grid md:grid-cols-3 gap-8">
                <div className="group relative">
                  <div className="absolute -inset-2 rounded-3xl bg-gradient-to-br from-emerald-300/30 via-teal-200/25 to-sky-300/30 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" aria-hidden="true" />
                  <div className="relative rounded-3xl p-6 bg-white ring-1 ring-gray-200 shadow-sm transition-transform duration-200 group-hover:shadow-md group-hover:-translate-y-0.5">
                    <div className="w-10 h-10 rounded-xl grid place-items-center bg-[#E7EBFF] text-[#24345A] ring-1 ring-gray-200 mb-4">
                      <Mail className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Email Support</h3>
                    <p className="text-gray-600 text-sm mb-3">Quick response for technical issues</p>
                    <a 
                      href="mailto:lydo@sanjosebatangas.gov.ph"
                      className="text-[#24345A] hover:text-[#1a2a4a] font-medium text-sm"
                    >
                      lydo@sanjosebatangas.gov.ph
                    </a>
                  </div>
                </div>

                <div className="group relative">
                  <div className="absolute -inset-2 rounded-3xl bg-gradient-to-br from-emerald-300/30 via-teal-200/25 to-sky-300/30 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" aria-hidden="true" />
                  <div className="relative rounded-3xl p-6 bg-white ring-1 ring-gray-200 shadow-sm transition-transform duration-200 group-hover:shadow-md group-hover:-translate-y-0.5">
                    <div className="w-10 h-10 rounded-xl grid place-items-center bg-[#E7EBFF] text-[#24345A] ring-1 ring-gray-200 mb-4">
                      <Phone className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Phone Support</h3>
                    <p className="text-gray-600 text-sm mb-3">Direct assistance for urgent matters</p>
                    <a 
                      href="tel:+63431234567"
                      className="text-[#24345A] hover:text-[#1a2a4a] font-medium text-sm"
                    >
                      (043) 123-4567
                    </a>
                  </div>
                </div>

                <div className="group relative">
                  <div className="absolute -inset-2 rounded-3xl bg-gradient-to-br from-emerald-300/30 via-teal-200/25 to-sky-300/30 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" aria-hidden="true" />
                  <div className="relative rounded-3xl p-6 bg-white ring-1 ring-gray-200 shadow-sm transition-transform duration-200 group-hover:shadow-md group-hover:-translate-y-0.5">
                    <div className="w-10 h-10 rounded-xl grid place-items-center bg-[#E7EBFF] text-[#24345A] ring-1 ring-gray-200 mb-4">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Office Location</h3>
                    <p className="text-gray-600 text-sm mb-3">Visit us for in-person assistance</p>
                    <p className="text-[#24345A] font-medium text-sm">
                      San Jose Municipal Hall, Batangas
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
                </div>

        {/* Sticky Footer Navigation */}
        <div className="sticky bottom-0 border-t border-gray-200 backdrop-blur supports-[backdrop-filter]:bg-white/85 bg-white/95 shadow-lg">
          <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            {/* Desktop layout */}
            <div className="hidden sm:grid grid-cols-3 items-center gap-3">
              <div className="flex">
                <button
                  onClick={() => navigate(-1)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full font-semibold transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
            </div>

              <div className="flex justify-center">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${allAccepted ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                  {allAccepted ? 'All Terms Accepted' : 'Terms Incomplete'}
                </span>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={onContinue}
                  disabled={!allAccepted}
                  className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold transition-all ${allAccepted ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                >
                  Continue to Step 2
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
                </div>

            {/* Mobile Tab Bar Style */}
            <div className="sm:hidden">
              <div className="bg-white/90 backdrop-blur-sm">
                <div className="flex items-center justify-between px-4 py-2">
                  {/* Back Button */}
                  <button
                    onClick={() => navigate(-1)}
                    className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                    title="Back"
                  >
                    <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                      <ArrowLeft className="w-3.5 h-3.5 text-gray-600" />
                    </div>
                    <span className="text-xs text-gray-600 font-medium">Back</span>
                  </button>

                  {/* Status Indicator */}
                  <div className="flex flex-col items-center gap-0.5">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${allAccepted ? 'bg-green-100' : 'bg-amber-100'}`}>
                      {allAccepted ? (
                        <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                      )}
                    </div>
                    <span className={`text-xs font-medium ${allAccepted ? 'text-green-600' : 'text-amber-600'}`}>
                      {allAccepted ? 'All Accepted' : 'Incomplete'}
                    </span>
                  </div>

                  {/* Continue Button */}
                  <button
                    onClick={onContinue}
                    disabled={!allAccepted}
                    className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg transition-colors ${
                      allAccepted
                        ? 'hover:bg-blue-50'
                        : 'opacity-50 cursor-not-allowed'
                    }`}
                    title="Continue to Step 2"
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      allAccepted
                        ? 'bg-blue-600 shadow-md'
                        : 'bg-gray-300'
                    }`}>
                      <ArrowRight className={`w-3.5 h-3.5 ${allAccepted ? 'text-white' : 'text-gray-500'}`} />
                    </div>
                    <span className={`text-xs font-medium ${allAccepted ? 'text-blue-600' : 'text-gray-500'}`}>
                      Step 2
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>
    </SurveyLayout>
  );
};

export default SurveyTerms;
