import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  FileText, 
  ChevronDown, 
  ChevronUp,
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
  MapPin,
  ArrowLeft,
  FlaskConical
} from 'lucide-react';
import PublicLayout from '../../../components/layouts/PublicLayout';
import SurveyLayout from '../../../components/layouts/SurveyLayout';
import PageHero from '../../../components/website/PageHero';

// Import hooks
import { useReCaptcha } from '../../../hooks/useReCaptcha';
import { useSurveySession } from '../../../hooks/useSurveySession';
import { useActiveSurvey } from '../../../hooks/useActiveSurvey';
import logger from '../../../utils/logger.js';

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
  const location = useLocation();
  
  // Survey session management
  const { 
    activeSurvey, 
    hasActiveSurvey, 
    isLoading: surveyLoading,
    formData,
    updateFormData,
    isSaving,
    error: sessionError,
    clearErrors,
    initializeSession
  } = useSurveySession();

  // reCAPTCHA verification guard
  useEffect(() => {
    // Check if user has completed reCAPTCHA verification
    const recaptchaVerified = sessionStorage.getItem('recaptcha_verified');
    
    if (!recaptchaVerified) {
      logger.debug('No reCAPTCHA verification found, redirecting to survey landing');
      navigate('/kk-survey', { replace: true });
      return;
    }
    
    // Check if verification is still valid (expires after 30 minutes)
    const verificationTime = parseInt(recaptchaVerified);
    const currentTime = Date.now();
    const thirtyMinutes = 30 * 60 * 1000; // 30 minutes in milliseconds
    
    if (currentTime - verificationTime > thirtyMinutes) {
      logger.debug('reCAPTCHA verification expired, redirecting to survey landing');
      sessionStorage.removeItem('recaptcha_verified');
      navigate('/kk-survey', { replace: true });
      return;
    }
    
    logger.debug('reCAPTCHA verification valid, allowing access to terms page');
  }, [navigate]);

  // Local UI state
  const [expandedSections, setExpandedSections] = useState({});
  const [sessionInitialized, setSessionInitialized] = useState(false);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  
  // Scroll position preservation
  const scrollPositionRef = useRef(null);

  // Get terms data from survey session or localStorage
  const getTermsData = () => {
    // First, try to get from survey session (if youth profile exists)
    if (formData?.acceptedSections && formData?.viewedSections) {
      logger.debug('Found terms data in survey session');
      return {
        acceptedSections: formData.acceptedSections,
        viewedSections: formData.viewedSections
      };
    }
    
    // Fallback to localStorage
    try {
      const savedTerms = localStorage.getItem('kk_survey_terms_temp');
      if (savedTerms) {
        logger.debug('Found terms data in localStorage');
        return JSON.parse(savedTerms);
      }
    } catch (error) {
      logger.error('Error parsing saved terms', error);
    }
    
    logger.debug('No terms data found, using defaults');
    return null;
  };

  const termsData = getTermsData();
  
  // ✅ FIXED: Use useState instead of constants for proper re-rendering
  const [acceptedSections, setAcceptedSections] = useState(
    termsData?.acceptedSections || {
    terms: false,
    privacy: false,
    voluntary: false,
    dataUse: false,
    rights: false
    }
  );

  const [viewedSections, setViewedSections] = useState(
    termsData?.viewedSections || {
    terms: false,
    privacy: false,
    voluntary: false,
    dataUse: false,
    rights: false
    }
  );

  // Calculate if all sections are accepted and viewed
    const allSectionsAccepted = Object.values(acceptedSections).every(accepted => accepted);
    const allSectionsViewed = Object.values(viewedSections).every(viewed => viewed);
  const allAccepted = allSectionsAccepted && allSectionsViewed;

  // ✅ FIXED: Sync state with formData when it changes (from session restore)
  useEffect(() => {
    if (formData?.acceptedSections && formData?.viewedSections) {
      logger.debug('Syncing state with formData from session');
      setAcceptedSections(formData.acceptedSections);
      setViewedSections(formData.viewedSections);
    }
  }, [formData]);

  // Restore scroll position after state updates that might cause re-render
  useEffect(() => {
    if (scrollPositionRef.current !== null) {
      // Use double requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.scrollTo({
            top: scrollPositionRef.current,
            behavior: 'auto'
          });
          scrollPositionRef.current = null; // Reset after restoring
        });
      });
    }
  }, [expandedSections, acceptedSections, viewedSections]);

  // Debug logging
  useEffect(() => {
    logger.debug('Terms data loaded', { acceptedSections, viewedSections, hasTermsData: !!termsData });
    logger.debug('Terms acceptance status', { allSectionsAccepted, allSectionsViewed, allAccepted });
  }, [acceptedSections, viewedSections, allSectionsAccepted, allSectionsViewed, allAccepted, termsData]);

  // Auto-save is now handled by the survey session
  // No need for local auto-save since updateFormData handles it

  // Initialize session on component mount - but don't create youth profile yet
  useEffect(() => {
    const initializeSurveySession = async () => {
      if (!hasActiveSurvey || sessionInitialized) return;

      try {
        // For terms page, we don't need to create a youth profile yet
        // We just need to check if there's an active survey
        logger.debug('Survey terms page initialized with active survey');
        setSessionInitialized(true);
        
        // Check if user has previously accepted terms
        const termsData = getTermsData();
        if (termsData) {
          logger.debug('Found previously saved terms', { hasData: !!termsData });
        } else {
          logger.debug('No previously saved terms found');
        }
        
      } catch (error) {
        logger.error('Failed to initialize survey session', error);
        setSessionInitialized(true); // Still allow user to proceed
      }
    };

    initializeSurveySession();
  }, [hasActiveSurvey, sessionInitialized, updateFormData]);

  // Note: Loading states are now handled inside SurveyLayout

  if (!hasActiveSurvey && !surveyLoading) {
    return (
      <SurveyLayout
        currentStep={1}
        totalSteps={5}
        stepTitle="Survey Not Available"
        isSaving={false}
        backToPath="/kk-survey"
        showProgress={true}
        showSaveStatus={false}
        canContinue={false}
        onBackClick={() => navigate('/kk-survey')}
        onContinueClick={() => {}}
        continueButtonText="Continue"
        statusMessage="No active survey available"
        statusType="error"
        showStatus={true}
        disabled={true}
        isLoading={false}
      >
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-4xl mx-auto px-6 py-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Survey Not Available</h2>
          <p className="text-gray-600 mb-8">
            There is currently no active survey for you to participate in.
          </p>
          <Link
            to="/"
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Return to Home
          </Link>
        </div>
          </div>
        </div>
      </SurveyLayout>
    );
  }

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
  const handleAcceptClick = (e) => {
    e.preventDefault();
    e.currentTarget.blur(); // Remove focus to prevent scroll issues
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
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.currentTarget.blur(); // Remove focus to prevent scroll issues
            onToggleExpand();
          }}
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
            type="button"
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
    // Save current scroll position before state update
    scrollPositionRef.current = window.pageYOffset || document.documentElement.scrollTop;
    
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
    
    // Mark section as viewed when expanded for the first time
    if (!expandedSections[sectionId] && !viewedSections[sectionId]) {
      const newViewedSections = {
        ...viewedSections,
        [sectionId]: true
      };
      
      // ✅ FIXED: Update state to trigger re-render
      setViewedSections(newViewedSections);
      
      // Also save to localStorage
      const termsData = { 
        acceptedSections,
        viewedSections: newViewedSections
      };
      localStorage.setItem('kk_survey_terms_temp', JSON.stringify(termsData));
      logger.debug('Section marked as viewed', { sectionId });
    }
    
  };

  const toggleAcceptance = async (sectionId) => {
    // Save current scroll position before state update
    scrollPositionRef.current = window.pageYOffset || document.documentElement.scrollTop;
    
    const newAcceptedSections = {
      ...acceptedSections,
      [sectionId]: !acceptedSections[sectionId]
    };
    logger.debug('Toggling acceptance for section', { sectionId, newAcceptedSections });
    
    // ✅ FIXED: Update state to trigger re-render
    setAcceptedSections(newAcceptedSections);
    
    // Also save to localStorage
    const termsData = { 
      acceptedSections: newAcceptedSections,
      viewedSections: viewedSections
    };
    localStorage.setItem('kk_survey_terms_temp', JSON.stringify(termsData));
    logger.debug('Terms data saved locally and state updated');
  };

  const demoAcceptAll = async () => {
    const allViewed = { terms: true, privacy: true, voluntary: true, dataUse: true, rights: true };
    const allAccepted = { terms: true, privacy: true, voluntary: true, dataUse: true, rights: true };
    
    // ✅ FIXED: Update state to trigger re-render
    setViewedSections(allViewed);
    setAcceptedSections(allAccepted);
    
    // Also save to localStorage
    const termsData = { 
      acceptedSections: allAccepted,
      viewedSections: allViewed
    };
    localStorage.setItem('kk_survey_terms_temp', JSON.stringify(termsData));
    logger.debug('All terms accepted - state and localStorage updated');
  };

  const toggleDemoMode = () => {
    if (!isDemoMode) {
      // Load demo data - accept all terms
      demoAcceptAll();
      // Expand all sections
      const allExpanded = {};
      legalSections.forEach(section => {
        allExpanded[section.id] = true;
      });
      setExpandedSections(allExpanded);
      setIsDemoMode(true);
      logger.debug('Demo data loaded - all terms accepted');
    } else {
      // Clear demo data - reset all
      const resetViewed = { terms: false, privacy: false, voluntary: false, dataUse: false, rights: false };
      const resetAccepted = { terms: false, privacy: false, voluntary: false, dataUse: false, rights: false };
      setViewedSections(resetViewed);
      setAcceptedSections(resetAccepted);
      setExpandedSections({});
      setIsDemoMode(false);
      localStorage.removeItem('kk_survey_terms_temp');
      logger.debug('Demo data cleared');
    }
  };

  const onContinue = () => {
    logger.debug('Continue button clicked', { allAccepted, acceptedSections, viewedSections });
    
    if (!allAccepted) {
      const unviewedSections = Object.keys(viewedSections).filter(key => !viewedSections[key]);
      const unacceptedSections = Object.keys(acceptedSections).filter(key => !acceptedSections[key]);
      
      logger.debug('Cannot continue', { unviewedSections, unacceptedSections });
      
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

    // Save final terms data before proceeding
    const finalTermsData = { 
      acceptedSections,
      viewedSections
    };
    localStorage.setItem('kk_survey_terms_temp', JSON.stringify(finalTermsData));
    logger.debug('Final terms data saved before proceeding to step 1');

    logger.debug('Legal consent data', {
      acceptedAt: new Date().toISOString(),
      acceptedSections,
      ipAddress: 'N/A',
      userAgent: navigator.userAgent
    });
    
    logger.debug('Attempting navigation to /kk-survey/step-2');
    // Navigate to SurveyStep1 where youth profile will be created
    navigate('/kk-survey/step-2');
    logger.debug('Navigation command executed');
  };


  return (
    <SurveyLayout
      // Header props
      currentStep={1}
      totalSteps={5}
      stepTitle="Terms & Consent"
      isSaving={isSaving}
      backToPath="/kk-survey"
      showProgress={true}
      showSaveStatus={true}
      // Footer props
      canContinue={allAccepted}
      onBackClick={() => navigate('/kk-survey')}
      onContinueClick={onContinue}
      continueButtonText="Continue to Step 2"
      statusMessage={allAccepted ? 'All Terms Accepted' : 'Terms Incomplete'}
      statusType={allAccepted ? 'success' : 'warning'}
      showStatus={true}
      disabled={false}
      isLoading={false}
      // Centralized loading/error state
      showLoadingState={surveyLoading || !sessionInitialized}
      loadingMessage={surveyLoading ? 'Loading survey...' : 'Initializing survey session...'}
    >
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-6 py-8">

          {/* Header */}
          <div className="bg-gray-50 text-center py-8 mb-8 rounded-xl relative">
            {/* Demo Button */}
            <div className="absolute top-4 right-4">
              <button
                onClick={toggleDemoMode}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isDemoMode
                    ? 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-300'
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300'
                }`}
                title={isDemoMode ? 'Clear demo data' : 'Load demo data'}
              >
                <FlaskConical size={16} />
                {isDemoMode ? 'Clear Demo' : 'Load Demo'}
              </button>
            </div>

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
      </div>
    </SurveyLayout>
  );
};

export default SurveyTerms;
