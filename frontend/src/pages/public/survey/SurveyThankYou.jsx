import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import surveySubmissionService from '../../../services/surveySubmissionService';
import { 
  CheckCircle, 
  ArrowLeft, 
  Home, 
  Mail, 
  Phone, 
  MapPin,
  Calendar,
  Users,
  Shield,
  Heart,
  Star,
  Award,
  Clock,
  User,
  FileText,
  Hash,
  Target,
  Share2,
  Plus,
  BarChart3,
  ArrowRight,
  Eye,
  X
} from 'lucide-react';
import SurveyLayout from '../../../components/layouts/SurveyLayout';
import { useActiveSurvey } from '../../../hooks/useActiveSurvey';
import logger from '../../../utils/logger.js';

// Animated counter component
const AnimatedCounter = ({ end, duration = 2000 }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime;
    let animationFrame;

    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      
      const currentCount = Math.floor(progress * end);
      setCount(currentCount);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [end, duration]);

  return count;
};

const SurveyThankYou = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get real survey data
  const { activeSurvey, isLoading: surveyLoading } = useActiveSurvey();
  
  // Check if user has valid access to thank you page
  const checkAccessPermission = () => {
    // For thank you page, we should allow access if:
    // 1. User has navigation state (just submitted)
    // 2. User has valid backup submission data
    // 3. User has recent reCAPTCHA verification
    
    // First check if we have navigation state (most reliable for recent submissions)
    if (location.state) {
      logger.debug('Access granted via navigation state');
      return true;
    }
    
    // Check for backup submission data
    const backupData = localStorage.getItem('kk_survey_submitted');
    if (backupData) {
      try {
        const parsed = JSON.parse(backupData);
        const backupTime = new Date(parsed.submitted_at).getTime();
        const currentTime = Date.now();
        const twentyFourHours = 24 * 60 * 60 * 1000;
        
        if (currentTime - backupTime <= twentyFourHours) {
          logger.debug('Access granted via valid backup data');
          return true;
        }
      } catch (error) {
        logger.error('Error parsing backup data', error);
      }
    }
    
    // Finally check reCAPTCHA verification as fallback
    const recaptchaVerified = sessionStorage.getItem('recaptcha_verified');
    if (recaptchaVerified) {
      const verificationTime = parseInt(recaptchaVerified);
      const currentTime = Date.now();
      const thirtyMinutes = 30 * 60 * 1000;
      
      if (currentTime - verificationTime <= thirtyMinutes) {
        logger.debug('Access granted via reCAPTCHA verification');
        return true;
      }
    }
    
    // If no valid access method found, redirect
    logger.debug('No valid access found, redirecting to survey landing');
    navigate('/kk-survey', { replace: true });
    return false;
  };

  // Get submission data from navigation state, localStorage backup, or redirect if missing
  const getSubmissionData = () => {
    // First, try navigation state (most recent and most reliable)
    if (location.state) {
      return location.state;
    }
    
    // Second, try localStorage backup (but only if user has valid access)
    const backupData = localStorage.getItem('kk_survey_submitted');
    if (backupData) {
      try {
        const parsed = JSON.parse(backupData);
        
        // Check if backup data is recent (within last 24 hours)
        const backupTime = new Date(parsed.submitted_at).getTime();
        const currentTime = Date.now();
        const twentyFourHours = 24 * 60 * 60 * 1000;
        
        if (currentTime - backupTime > twentyFourHours) {
          logger.debug('Backup submission data is too old, redirecting to survey landing');
          localStorage.removeItem('kk_survey_submitted');
          navigate('/kk-survey', { replace: true });
          return null;
        }
        
        return {
          batchName: activeSurvey?.batch_name || activeSurvey?.batchName,
          submissionId: parsed.submission_id,
          youthId: parsed.youth_id,
          status: parsed.status,
          submittedAt: parsed.submitted_at,
          isNewYouth: parsed.isNewYouth || false,
          validationStatus: parsed.validation_status || 'pending',
          validationTier: parsed.validation_tier || 'manual',
          personal: parsed.personal || null, // Include personal data from localStorage backup
          accessToken: parsed.accessToken || null
        };
      } catch (error) {
        logger.error('Error parsing backup submission data', error);
      }
    }
    
    // If no data found, redirect to survey landing
    logger.warn('No submission data found, redirecting to survey landing');
    navigate('/kk-survey', { replace: true });
    return null;
  };

  // Check access permission first
  if (!checkAccessPermission()) {
    return null;
  }

  const submissionData = getSubmissionData();
  
  // Debug: Log the submission data to see what's available
  logger.debug('SurveyThankYou - submissionData', { hasData: !!submissionData, hasLocationState: !!location.state });
  
  // If no submission data, component will redirect
  if (!submissionData) {
    return null;
  }

  const { 
    batchName, 
    submissionId, 
    youthId, 
    status, 
    submittedAt, 
    isNewYouth, 
    validationStatus, 
    validationTier 
  } = submissionData;

  // Get personal data from either location.state or submissionData
  // Also check if we have accessToken to fetch from API as fallback
  const [apiPersonalData, setApiPersonalData] = useState(null);
  
  // Try to fetch personal data from API if we have accessToken but no personal data
  useEffect(() => {
    const fetchPersonalDataFromAPI = async () => {
      const accessToken = location.state?.accessToken || submissionData?.accessToken;
      const hasPersonalData = location.state?.personal || submissionData?.personal;
      
      // Only fetch if we have token but no personal data
      if (accessToken && !hasPersonalData) {
        try {
          const response = await surveySubmissionService.getSubmissionByToken(accessToken);
          if (response.success && response.data) {
            // Map API response (snake_case) to personal data format (camelCase)
            setApiPersonalData({
              firstName: response.data.first_name,
              middleName: response.data.middle_name,
              lastName: response.data.last_name,
              suffix: response.data.suffix,
              email: response.data.email
            });
          }
        } catch (error) {
          logger.error('Failed to fetch personal data from API', error);
        }
      }
    };
    
    fetchPersonalDataFromAPI();
  }, [location.state?.accessToken, submissionData?.accessToken]);
  
  // Get personal data from multiple sources with priority
  const personalData = location.state?.personal || submissionData?.personal || apiPersonalData || {};
  
  // Debug: Log personal data to see what's available
  logger.debug('SurveyThankYou - personal data sources', { 
    hasLocationStatePersonal: !!location.state?.personal,
    hasSubmissionDataPersonal: !!submissionData?.personal,
    hasApiPersonalData: !!apiPersonalData
  });

  // Handle page refresh and browser navigation
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Clear session data when user leaves the page
      sessionStorage.removeItem('recaptcha_verified');
      localStorage.removeItem('kk_survey_terms_temp'); // Clear terms data for new survey
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const handleReturnHome = () => {
    // Clear survey session data when leaving thank you page
    sessionStorage.removeItem('recaptcha_verified');
    localStorage.removeItem('kk_survey_submitted');
    localStorage.removeItem('kk_survey_terms_temp'); // Clear terms data for new survey
    navigate('/');
  };

  const handleNewSurvey = () => {
    navigate('/survey/start');
  };

  const handleShareResults = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'KK Survey Completed',
          text: `I just completed the KK Survey for ${batchName}! Response ID: ${submissionId}`,
          url: window.location.origin
        });
      } catch (error) {
        logger.error('Share failed', error);
        handleFallbackShare();
      }
    } else {
      handleFallbackShare();
    }
  };

  const handleFallbackShare = () => {
    const shareText = `I just completed the KK Survey for ${batchName}! Response ID: ${submissionId}`;
    navigator.clipboard.writeText(shareText).then(() => {
      alert('Achievement copied to clipboard!');
    }).catch(() => {
      alert('Share: ' + shareText);
    });
  };

  return (
    <SurveyLayout
      // Header props
      currentStep={5}
      totalSteps={5}
      stepTitle="Survey Complete"
      isSaving={false}
      backToPath="/"
      showProgress={false}
      showSaveStatus={false}
      isThankYouPage={true}
      // Footer props  
      canContinue={false}
      onBackClick={() => navigate('/')}
      onContinueClick={() => {}}
      continueButtonText="Survey Complete"
      statusMessage=""
      statusType="success"
      showStatus={false}
      showFooter={false}
      disabled={true}
      isLoading={false}
    >
      <div className="min-h-screen bg-white">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
          
          {/* Success Message */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
              <CheckCircle className="w-10 h-10 text-green-600 animate-pulse" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Thank You!
            </h1>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto mb-8">
              Your survey has been successfully submitted. Your responses will help us better understand the
              needs and aspirations of our youth community.
            </p>
          </div>

           {/* Submission Details Card - Enhanced Receipt Style */}
           <div className="max-w-sm mx-auto mb-8">
             <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
               {/* Header with subtle gradient */}
               <div className="bg-gradient-to-r from-green-50 to-blue-50 px-4 py-3 border-b border-gray-100 text-center">
                 <div className="flex items-center justify-center gap-2">
                   <div className="p-2 rounded-full bg-green-100 text-green-700 shadow-sm">
                     <FileText className="w-4 h-4" />
                   </div>
                   <h3 className="text-sm font-bold text-gray-900">Submission Confirmed</h3>
                 </div>
                 <div className="text-xs text-gray-500 mt-1">Katipunan ng Kabataan Survey</div>
               </div>
               
               {/* Receipt content */}
               <div className="px-4 py-4">
                 <div className="space-y-3 text-sm">
                   <div className="flex justify-between items-center py-1">
                     <span className="text-gray-600 font-medium">Name:</span>
                     <span className="text-gray-900 font-semibold text-right max-w-48 truncate">
                       {(() => {
                         const firstName = personalData?.firstName || personalData?.first_name || '';
                         const middleName = personalData?.middleName || personalData?.middle_name || '';
                         const lastName = personalData?.lastName || personalData?.last_name || '';
                         const suffix = personalData?.suffix || '';
                         
                         if (firstName && lastName) {
                           return `${firstName}${middleName ? ' ' + middleName : ''}${lastName ? ' ' + lastName : ''}${suffix ? ' ' + suffix : ''}`.trim();
                         }
                         return '-';
                       })()}
                     </span>
                   </div>
                   
                   <div className="flex justify-between items-center py-1">
                     <span className="text-gray-600 font-medium">Email:</span>
                     <span className="text-gray-900 font-semibold text-right max-w-48 truncate">
                       {personalData?.email || personalData?.personal_email || '-'}
                     </span>
                   </div>
                   
                   {youthId && (
                     <div className="flex justify-between items-center py-1">
                       <span className="text-gray-600 font-medium">Youth ID:</span>
                       <span className="text-gray-900 font-semibold font-mono text-xs">{youthId}</span>
                     </div>
                   )}
                   
                   <div className="flex justify-between items-center py-1">
                     <span className="text-gray-600 font-medium">Survey Batch name:</span>
                     <span className="text-gray-900 font-semibold text-right max-w-48 truncate">{batchName}</span>
                   </div>
                   
                   <div className="flex justify-between items-center py-1">
                     <span className="text-gray-600 font-medium">Response ID:</span>
                     <span className="text-gray-900 font-semibold font-mono text-xs">{submissionId}</span>
                   </div>
                   
                   <div className="flex justify-between items-center py-1">
                     <span className="text-gray-600 font-medium">Submitted:</span>
                     <span className="text-gray-900 font-semibold text-xs">
                       {submittedAt 
                         ? (() => {
                             const date = new Date(submittedAt);
                             const month = String(date.getMonth() + 1).padStart(2, '0');
                             const day = String(date.getDate()).padStart(2, '0');
                             const year = date.getFullYear();
                             const hours = date.getHours();
                             const minutes = String(date.getMinutes()).padStart(2, '0');
                             const ampm = hours >= 12 ? 'PM' : 'AM';
                             const displayHours = hours % 12 || 12;
                             return `${month}/${day}/${year} at ${displayHours}:${minutes} ${ampm}`;
                           })()
                         : (() => {
                             const date = new Date();
                             const month = String(date.getMonth() + 1).padStart(2, '0');
                             const day = String(date.getDate()).padStart(2, '0');
                             const year = date.getFullYear();
                             const hours = date.getHours();
                             const minutes = String(date.getMinutes()).padStart(2, '0');
                             const ampm = hours >= 12 ? 'PM' : 'AM';
                             const displayHours = hours % 12 || 12;
                             return `${month}/${day}/${year} at ${displayHours}:${minutes} ${ampm}`;
                           })()
                       }
                     </span>
                   </div>
                 </div>
                 
                 {/* Receipt footer */}
                 <div className="mt-4 pt-3 border-t border-gray-100">
                   <div className="flex items-center justify-center gap-2">
                     {(() => {
                       const status = validationStatus || 'pending';
                       const statusConfig = {
                         pending: {
                           icon: Clock,
                           color: 'text-amber-600',
                           bgColor: 'bg-amber-50',
                           borderColor: 'border-amber-200',
                           label: 'Pending Validation'
                         },
                         validated: {
                           icon: CheckCircle,
                           color: 'text-green-600',
                           bgColor: 'bg-green-50',
                           borderColor: 'border-green-200',
                           label: 'Validated'
                         },
                         approved: {
                           icon: CheckCircle,
                           color: 'text-green-600',
                           bgColor: 'bg-green-50',
                           borderColor: 'border-green-200',
                           label: 'Approved'
                         },
                         rejected: {
                           icon: X,
                           color: 'text-red-600',
                           bgColor: 'bg-red-50',
                           borderColor: 'border-red-200',
                           label: 'Rejected'
                         },
                         in_progress: {
                           icon: Clock,
                           color: 'text-blue-600',
                           bgColor: 'bg-blue-50',
                           borderColor: 'border-blue-200',
                           label: 'In Progress'
                         }
                       };
                       
                       const config = statusConfig[status.toLowerCase()] || statusConfig.pending;
                       const StatusIcon = config.icon;
                       
                       return (
                         <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full ${config.bgColor} ${config.borderColor} border`}>
                           <StatusIcon className={`w-3.5 h-3.5 ${config.color}`} />
                           <span className={`text-xs font-medium ${config.color}`}>
                             {config.label}
                           </span>
                         </div>
                       );
                     })()}
                   </div>
                 </div>
               </div>
             </div>
           </div>

          {/* Action Buttons - One Line Two Columns */}
          <div className="mt-8 mb-8">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">What would you like to do next?</h3>
                <p className="text-gray-600 text-sm">Choose your next action</p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {/* Share Achievement Button */}
                <button
                  onClick={handleShareResults}
                  className="group inline-flex items-center gap-3 px-6 py-3 bg-white border border-gray-200 rounded-full hover:bg-gray-50 hover:border-gray-300 hover:shadow-md transition-all duration-200"
                >
                  <div className="w-8 h-8 rounded-full grid place-items-center bg-[#E7EBFF] text-[#24345A] ring-1 ring-gray-200">
                    <Share2 className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-semibold text-gray-900">Share Achievement</div>
                    <div className="text-xs text-gray-600">Share your completion</div>
                  </div>
                </button>

                {/* Return to Home Button */}
                {/* View Submission Status Button (if token available) */}
                {(location.state?.accessToken || submissionData?.accessToken) && (
                  <button
                    onClick={() => {
                      const token = location.state?.accessToken || submissionData?.accessToken;
                      navigate(`/survey-submission/status?token=${token}`);
                    }}
                    className="group inline-flex items-center gap-3 px-6 py-3 bg-[#24345A] text-white rounded-full hover:bg-[#1e2a47] hover:shadow-md transition-all duration-200"
                  >
                    <div className="w-8 h-8 rounded-full grid place-items-center bg-white/20 ring-1 ring-white/30">
                      <Eye className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-semibold">View Submission Status</div>
                      <div className="text-xs text-white/80">Track your submission</div>
                    </div>
                  </button>
                )}
                
                <button
                  onClick={handleReturnHome}
                  className="group inline-flex items-center gap-3 px-6 py-3 bg-white border border-gray-200 rounded-full hover:bg-gray-50 hover:border-gray-300 hover:shadow-md transition-all duration-200"
                >
                  <div className="w-8 h-8 rounded-full grid place-items-center bg-[#E7EBFF] text-[#24345A] ring-1 ring-gray-200">
                    <Home className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-semibold text-gray-900">Return to Home</div>
                    <div className="text-xs text-gray-600">Go back to website</div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto mb-8">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-left">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Shield className="w-4 h-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-green-900 text-xs sm:text-sm mb-1">Data Protected</h3>
                  <p className="text-green-700 text-xs leading-relaxed mb-2">Your information is secure and will be used only for official purposes.</p>
                  <Link 
                    to="/data-subject-rights" 
                    className="text-green-700 hover:text-green-900 underline font-medium text-xs"
                  >
                    Manage your data (Access, Edit, Delete) →
                  </Link>
                </div>
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Users className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-blue-900 text-xs sm:text-sm mb-1">Community Impact</h3>
                  <p className="text-blue-700 text-xs leading-relaxed">Your responses help shape youth programs and policies in our municipality.</p>
                </div>
              </div>
            </div>
            
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-left">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Heart className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-purple-900 text-xs sm:text-sm mb-1">Youth Voice</h3>
                  <p className="text-purple-700 text-xs leading-relaxed">Your voice matters in building a better future for our youth community.</p>
                </div>
              </div>
            </div>
          </div>

          {/* What Happens Next - Simple Design */}
          <div className="mt-16 mb-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-[#E7EBFF] text-[#24345A] text-xs font-semibold uppercase tracking-wider mb-2">Process</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">What Happens Next?</h3>
              <p className="text-gray-600">Follow the process of your survey submission</p>
              {/* Separator line */}
              <div className="mt-5 mb-8 h-[2px] w-full max-w-4xl mx-auto bg-gradient-to-r from-[#E7EBFF] via-[#F1E9FF] to-[#FDE7F1] opacity-90 rounded-full" aria-hidden="true" />
            </div>
            
            <div className="max-w-6xl mx-auto">
              <div className="relative">
                {/* Straight Dashed Connection Lines */}
                <div className="hidden lg:block absolute top-10 left-0 right-0 h-0 pointer-events-none">
                  {/* Line 1 to 2 */}
                  <div className="absolute" style={{ left: '20%', width: '30%', top: '0' }}>
                    <svg className="w-full h-4" viewBox="0 0 100 10" preserveAspectRatio="none">
                      <path
                        d="M 0 5 L 100 5"
                        fill="none"
                        stroke="#9CA3AF"
                        strokeWidth="1.5"
                        strokeDasharray="4,4"
                      />
                    </svg>
                  </div>
                  
                  {/* Line 2 to 3 */}
                  <div className="absolute" style={{ left: '50%', width: '30%', top: '0' }}>
                    <svg className="w-full h-4" viewBox="0 0 100 10" preserveAspectRatio="none">
                      <path
                        d="M 0 5 L 100 5"
                        fill="none"
                        stroke="#9CA3AF"
                        strokeWidth="1.5"
                        strokeDasharray="4,4"
                      />
                    </svg>
                  </div>
                </div>
                
                {/* Steps Grid - Horizontal Layout */}
                <div className="flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-4">
                  {[
                    {
                      step: '1',
                      title: 'Data Analysis',
                      desc: 'Our team will analyze your responses along with other participants to identify trends and needs.',
                      delay: '0s'
                    },
                    {
                      step: '2',
                      title: 'Program Development',
                      desc: 'Based on the findings, we\'ll develop targeted programs and initiatives for our youth.',
                      delay: '0.2s'
                    },
                    {
                      step: '3',
                      title: 'Community Updates',
                      desc: 'We\'ll share results and upcoming programs through our official channels.',
                      delay: '0.4s'
                    }
                  ].map(({ step, title, desc, delay }, index) => (
                    <div
                      key={step}
                      className="group flex flex-col items-center text-center transform transition-all duration-300 relative"
                      style={{ animationDelay: delay }}
                    >
                      {/* Step Circle */}
                      <div className="relative mb-6">
                        <div className="w-20 h-20 rounded-full bg-[#2F6666] flex items-center justify-center text-white font-bold text-2xl shadow-lg transition-all duration-300 group-hover:shadow-xl group-hover:bg-[#1a4d4d] relative z-10">
                          {step}
                        </div>
                        {/* Glow effect */}
                        <div className="absolute inset-0 w-20 h-20 rounded-full bg-[#2F6666] opacity-20 blur-xl transition-all duration-300 group-hover:opacity-40"></div>
                      </div>
                      
                      {/* Content */}
                      <div className="px-2 max-w-xs">
                        <h3 className="text-lg font-bold text-gray-900 mb-3 transition-colors duration-300 group-hover:text-[#2F6666]">
                          {title}
                        </h3>
                        <p className="text-gray-600 text-sm leading-relaxed transition-all duration-300 group-hover:text-gray-700">
                          {desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Questions or Concerns - LYDOCouncil Style */}
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
                <div className="relative rounded-3xl p-6 bg-gray-50 ring-1 ring-gray-200 shadow-sm transition-transform duration-200 group-hover:shadow-md group-hover:-translate-y-0.5">
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
                <div className="relative rounded-3xl p-6 bg-gray-50 ring-1 ring-gray-200 shadow-sm transition-transform duration-200 group-hover:shadow-md group-hover:-translate-y-0.5">
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
                <div className="relative rounded-3xl p-6 bg-gray-50 ring-1 ring-gray-200 shadow-sm transition-transform duration-200 group-hover:shadow-md group-hover:-translate-y-0.5">
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

export default SurveyThankYou;
