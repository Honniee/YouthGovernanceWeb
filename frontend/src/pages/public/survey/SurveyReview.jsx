import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  MapPin, 
  Phone, 
  Calendar, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  AlertCircle, 
  Save, 
  Clock, 
  FlaskConical, 
  Info, 
  ChevronDown, 
  ChevronUp, 
  Loader2, 
  Shield, 
  Cloud, 
  Mail,
  Vote,
  UserCheck,
  Users,
  GraduationCap,
  Briefcase,
  CheckCircle,
  Edit3
} from 'lucide-react';
import SurveyLayout from '../../../components/layouts/SurveyLayout';
import ReCaptchaComponent from '../../../components/ui/ReCaptchaComponent';
import { useReCaptcha } from '../../../hooks/useReCaptcha';
import { useSurveySession } from '../../../hooks/useSurveySession';
import { useActiveSurvey } from '../../../hooks/useActiveSurvey';
import { useBarangays } from '../../../hooks/useBarangays';
import { createProfileAndSubmitSurvey } from '../../../services/directSurveySubmission';
import ErrorModal from '../../../components/ui/ErrorModal';
import logger from '../../../utils/logger.js';

const SurveyReview = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    personal: {},
    demographics: {},
    civic: {}
  });
  const [errorModal, setErrorModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'error'
  });
  
  // Survey status
  const { activeSurvey, hasActiveSurvey, isLoading: surveyLoading, error: surveyError } = useActiveSurvey();
  
  // Barangays data
  const { barangays, isLoading: barangaysLoading, error: barangaysError } = useBarangays();
  
  // Debug barangays loading (remove in production)
  
  // reCAPTCHA hook
  const recaptcha = useReCaptcha({ 
    required: true,
    onError: () => {
      logger.error('reCAPTCHA verification failed', null);
    }
  });
  
  // Survey session hook
  const { submitSurvey } = useSurveySession();

  // Helper function to get barangay name
  const getBarangayName = (barangayId) => {
    if (!barangayId) return '';
    
    // If barangays are still loading, show loading state
    if (barangaysLoading) {
      return 'Loading...';
    }
    
    // If there's an error loading barangays, show the ID
    if (barangaysError) {
      logger.warn('Error loading barangays', null, { error: barangaysError });
      return barangayId;
    }
    
    // Debug logging (remove in production)
    
    const barangay = (barangays || []).find(b => {
      const match = (b.barangay_id || b.id) === barangayId;
      return match;
    });
    
    const result = barangay ? (barangay.barangay_name || barangay.name) : barangayId;
    
    return result;
  };

  // ✅ reCAPTCHA verification guard
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
    const thirtyMinutes = 30 * 60 * 1000;
    
    if (currentTime - verificationTime > thirtyMinutes) {
      logger.debug('reCAPTCHA verification expired, redirecting to survey landing');
      sessionStorage.removeItem('recaptcha_verified');
      navigate('/kk-survey', { replace: true });
      return;
    }

    logger.debug('reCAPTCHA verification valid, allowing access to review page');
  }, [navigate]);

  // Load saved data from localStorage
  useEffect(() => {
    try {
      // Load personal information
      const personalData = localStorage.getItem('kk_survey_draft_personal');
      const personal = personalData ? JSON.parse(personalData) : {};

      // Load demographics data
      const demographicsData = localStorage.getItem('kk_survey_draft_demographics');
      const demographics = demographicsData ? JSON.parse(demographicsData) : {};
      const demographicsFormData = demographics.demographics || {};

      // Load civic engagement data
      const civicData = localStorage.getItem('kk_survey_draft_v1');
      const civic = civicData ? JSON.parse(civicData) : {};
      const civicFormData = civic.step3 || {};

        setFormData({
        personal: personal,
        demographics: demographicsFormData,
        civic: civicFormData
      });

      logger.debug('Loaded survey data', {
        personal: Object.keys(personal).length,
        demographics: Object.keys(demographicsFormData).length,
        civic: Object.keys(civicFormData).length
        });
      } catch (e) {
        logger.error('Error loading saved data', e);
    }
  }, []);

  const handleSubmit = async () => {
    // Check reCAPTCHA verification
    if (!recaptcha.isVerified) {
      alert('Please complete the reCAPTCHA verification before submitting.');
      // Scroll to reCAPTCHA
      const recaptchaElement = document.getElementById('survey-submit-recaptcha');
      if (recaptchaElement) {
        recaptchaElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // Check if we have all required data
    if (!formData.personal || !formData.demographics || !formData.civic) {
      alert('Please complete all survey sections before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Get consent/terms data from localStorage
      const savedTerms = localStorage.getItem('kk_survey_terms_temp');
      const termsData = savedTerms ? JSON.parse(savedTerms) : null;
      
      // Prepare complete survey data for submission
      const completeSurveyData = {
        personal: formData.personal,
        demographics: formData.demographics,
        civic: formData.civic,
        submitted_at: new Date().toISOString(),
        survey_version: '2025'
      };

      logger.debug('Submitting complete survey data', { hasData: !!completeSurveyData, hasConsent: !!termsData?.acceptedSections });

      // Submit directly to database with consent data
      const result = await createProfileAndSubmitSurvey(
        formData.personal,
        completeSurveyData,
        recaptcha.token,
        termsData?.acceptedSections // Pass consent data
      );

      if (result.success) {
        logger.info('Survey submitted successfully to database', { responseId: result.data?.response_id, youthId: result.data?.youth_id });
        
        // Save submission record to localStorage as backup
        localStorage.setItem('kk_survey_submitted', JSON.stringify({
          ...completeSurveyData,
          submission_id: result.data.response_id,
          youth_id: result.data.youth_id,
          status: 'submitted',
          accessToken: result.data.accessToken, // Save token for potential redirect
          submitted_at: result.data.submitted_at
        }));
        
        // Show success modal
        setErrorModal({
          isOpen: true,
          title: 'Survey Submitted Successfully!',
          message: 'Thank you for your participation. Your response has been recorded.',
          type: 'success'
        });
        
        // Clear reCAPTCHA verification and form data after successful submission
        sessionStorage.removeItem('recaptcha_verified');
        localStorage.removeItem('kk_survey_draft_personal');
        localStorage.removeItem('kk_survey_draft_demographics');
      localStorage.removeItem('kk_survey_draft_v1');
        localStorage.removeItem('kk_survey_terms_temp'); // Clear terms data for new survey
        
        // Navigate to thank you page after modal closes
        setTimeout(() => {
          navigate('/kk-survey/thank-you', {
            state: {
              batchName: activeSurvey?.batch_name || activeSurvey?.batchName || 'KK Survey 2025',
              submissionId: result.data?.response_id,
              youthId: result.data?.youth_id,
              status: 'submitted',
              submittedAt: result.data?.submitted_at,
              isNewYouth: result.data?.isNewYouth,
              validationStatus: result.data?.validation_status,
              validationTier: result.data?.validation_tier,
              accessToken: result.data?.accessToken, // Include token for status page access
              // Include the survey data for display
              personal: formData.personal,
              demographics: formData.demographics,
              civic: formData.civic
            }
          });
        }, 2000);
      } else {
        throw new Error(result.message || 'Failed to submit survey');
      }
    } catch (error) {
      logger.error('Submission error', error);
      
      // Show error modal with specific message
      setErrorModal({
        isOpen: true,
        title: 'Submission Failed',
        message: error.message || 'Failed to submit survey. Please try again.',
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    navigate('/kk-survey/step-4'); // Go back to Civic Engagement
  };

  const closeErrorModal = () => {
    setErrorModal(prev => ({ ...prev, isOpen: false }));
  };

  const handleRetry = () => {
    closeErrorModal();
    handleSubmit();
  };

  // Handle error state with early return (prevents flash)
  if (!surveyLoading && !hasActiveSurvey) {
  return (
      <SurveyLayout
        currentStep={5}
        totalSteps={5}
        stepTitle="Survey Not Available"
        isSaving={false}
        backToPath="/kk-survey"
        showProgress={true}
        showSaveStatus={false}
        canContinue={false}
        onBackClick={handleBack}
        onContinueClick={() => {}}
        continueButtonText="Continue"
        statusMessage="No active survey"
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
                There is currently no active survey available.
              </p>
                <button 
                onClick={() => navigate('/kk-survey')}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                Back to Survey
                </button>
          </div>
          </div>
        </div>
      </SurveyLayout>
    );
  }

  return (
    <>
    <SurveyLayout
      // Header props
      currentStep={5}
      totalSteps={5}
      stepTitle="Review & Submit"
      isSaving={false}
      backToPath="/kk-survey"
      showProgress={true}
      showSaveStatus={false}
      // Footer props
      canContinue={recaptcha.isVerified && !isSubmitting}
      onBackClick={handleBack}
      onContinueClick={handleSubmit}
      continueButtonText={isSubmitting ? "Submitting..." : "Submit"}
      statusMessage={recaptcha.isVerified ? "Ready to submit" : "Complete reCAPTCHA to submit"}
      statusType={recaptcha.isVerified ? "success" : "warning"}
      showStatus={true}
      disabled={!recaptcha.isVerified || isSubmitting}
      isLoading={isSubmitting}
      // Centralized loading state
      showLoadingState={surveyLoading}
      loadingMessage="Loading survey..."
    >
      <div className="bg-gray-50">
        <div className="max-w-4xl mx-auto px-6 py-8">
          {/* Header Section */}
          <div className="bg-gray-50 text-center py-8 mb-8 rounded-xl">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold mb-4">
              KK Demographic Survey 2025
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">Review Your Responses</h1>
            <p className="text-sm sm:text-base text-gray-700 max-w-2xl mx-auto mb-6">
              Please review all your information before submitting. Click "Edit" to make changes to any section.
            </p>
            
            {/* Enhanced Info Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-4xl mx-auto mb-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-blue-900 text-xs sm:text-sm mb-1">Final Review</h3>
                    <p className="text-blue-700 text-xs leading-relaxed">Verify all information is accurate before submitting your survey.</p>
                  </div>
                </div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-left">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Shield className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-green-900 text-xs sm:text-sm mb-1">Data Security</h3>
                    <p className="text-green-700 text-xs leading-relaxed">Your information is protected and will be used only for official purposes.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
          {/* Step 1 - Personal Information */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <div className="p-2 rounded-full bg-green-100 text-green-700">
                      <User className="w-5 h-5" />
                    </div>
                Personal Information
              </h3>
                  <button 
                    onClick={() => navigate('/kk-survey/step-2')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                <Edit3 className="w-4 h-4" />
                Edit
                  </button>
                </div>
            </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="border-l-4 pl-4 border-green-500">
                    <div className="text-sm">
                  <span className="text-gray-600">Full Name:</span>
                      <span className="ml-2 font-medium text-gray-900">
                        {formData.personal.firstName && formData.personal.lastName 
                          ? `${formData.personal.firstName} ${formData.personal.middleName ? formData.personal.middleName + ' ' : ''}${formData.personal.lastName}${formData.personal.suffix ? ' ' + formData.personal.suffix : ''}`
                          : '-'
                        }
                      </span>
                    </div>
                  </div>
                  
                  <div className="border-l-4 pl-4 border-green-500">
                    <div className="text-sm">
                      <span className="text-gray-600">Address:</span>
                      <span className="ml-2 font-medium text-gray-900">
                        {formData.personal.barangay 
                          ? `${formData.personal.purok ? formData.personal.purok + ', ' : ''}${getBarangayName(formData.personal.barangay)}, ${formData.personal.city}, ${formData.personal.province}, ${formData.personal.region}`
                          : '-'
                        }
                      </span>
                    </div>
                </div>
                  
                  <div className="border-l-4 pl-4 border-green-500">
                    <div className="text-sm">
                  <span className="text-gray-600">Sex:</span>
                      <span className="ml-2 font-medium text-gray-900">
                        {formData.personal.sexAtBirth || '-'}
                      </span>
                </div>
                </div>
                  
                  <div className="border-l-4 pl-4 border-green-500">
                    <div className="text-sm">
                  <span className="text-gray-600">Birthday:</span>
                      <span className="ml-2 font-medium text-gray-900">
                        {formData.personal.birthday || '-'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="border-l-4 pl-4 border-green-500">
                    <div className="text-sm">
                      <span className="text-gray-600">Age:</span>
                      <span className="ml-2 font-medium text-gray-900">
                        {formData.personal.age ? `${formData.personal.age} years old` : '-'}
                      </span>
                </div>
              </div>
                  
                  <div className="border-l-4 pl-4 border-green-500">
                    <div className="text-sm">
                      <span className="text-gray-600">Email Address:</span>
                      <span className="ml-2 font-medium text-gray-900">
                        {formData.personal.email || '-'}
                      </span>
                    </div>
                </div>
                  
                  <div className="border-l-4 pl-4 border-green-500">
                    <div className="text-sm">
                      <span className="text-gray-600">Contact Number:</span>
                      <span className="ml-2 font-medium text-gray-900">
                        {formData.personal.contactNumber || '-'}
                      </span>
                </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2 - Demographics */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <div className="p-2 rounded-full bg-green-100 text-green-700">
                      <Users className="w-5 h-5" />
                    </div>
                Demographics
              </h3>
                  <button 
                    onClick={() => navigate('/kk-survey/step-3')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                <Edit3 className="w-4 h-4" />
                Edit
                  </button>
                </div>
            </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="border-l-4 pl-4 border-green-500">
                    <div className="text-sm">
                  <span className="text-gray-600">Civil Status:</span>
                      <span className="ml-2 font-medium text-gray-900">
                        {formData.demographics.civilStatus || '-'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="border-l-4 pl-4 border-green-500">
                    <div className="text-sm">
                      <span className="text-gray-600">Youth Age Group:</span>
                      <span className="ml-2 font-medium text-gray-900">
                        {formData.demographics.youthAgeGroup || '-'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="border-l-4 pl-4 border-green-500">
                    <div className="text-sm">
                      <span className="text-gray-600">Educational Background:</span>
                      <span className="ml-2 font-medium text-gray-900">
                        {formData.demographics.educationalBackground || '-'}
                      </span>
                    </div>
                </div>
                  
                  <div className="border-l-4 pl-4 border-green-500">
                    <div className="text-sm">
                  <span className="text-gray-600">Youth Classification:</span>
                      <span className="ml-2 font-medium text-gray-900">
                        {formData.demographics.youthClassification || '-'}
                        {formData.demographics.youthClassification === 'Youth w/Specific Needs' && formData.demographics.youthClassificationSpecific && (
                          <span className="text-xs text-gray-500 ml-1">({formData.demographics.youthClassificationSpecific})</span>
                        )}
                      </span>
                </div>
              </div>
                  
                  <div className="border-l-4 pl-4 border-green-500">
                    <div className="text-sm">
                  <span className="text-gray-600">Work Status:</span>
                      <span className="ml-2 font-medium text-gray-900">
                        {formData.demographics.workStatus || '-'}
                      </span>
                </div>
                  </div>
              </div>
            </div>
          </div>

          {/* Step 3 - Civic Engagement */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <div className="p-2 rounded-full bg-green-100 text-green-700">
                      <Vote className="w-5 h-5" />
                    </div>
                Civic Engagement
              </h3>
                  <button 
                    onClick={() => navigate('/kk-survey/step-4')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                <Edit3 className="w-4 h-4" />
                Edit
                  </button>
            </div>
                </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="border-l-4 pl-4 border-green-500">
                    <div className="text-sm">
                      <span className="text-gray-600">Registered SK Voter:</span>
                      <span className="ml-2 font-medium text-gray-900">
                        {formData.civic.registeredSKVoter || '-'}
                      </span>
                </div>
              </div>
                  
                  {formData.civic.registeredSKVoter === 'Yes' && (
                    <div className="border-l-4 pl-4 border-green-500">
                      <div className="text-sm">
                  <span className="text-gray-600">Voted Last SK Election:</span>
                        <span className="ml-2 font-medium text-gray-900">
                          {formData.civic.votedLastSKElection || '-'}
                        </span>
                </div>
                  </div>
                )}
                  
                  <div className="border-l-4 pl-4 border-green-500">
                    <div className="text-sm">
                      <span className="text-gray-600">Registered National Voter:</span>
                      <span className="ml-2 font-medium text-gray-900">
                        {formData.civic.registeredNationalVoter || '-'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="border-l-4 pl-4 border-green-500">
                    <div className="text-sm">
                      <span className="text-gray-600">Attended KK Assembly:</span>
                      <span className="ml-2 font-medium text-gray-900">
                        {formData.civic.attendedKKAssembly || '-'}
                        {formData.civic.attendedKKAssembly === 'Yes' && formData.civic.kkAssemblyTimes && (
                          <span className="text-xs text-gray-500 ml-1">({formData.civic.kkAssemblyTimes})</span>
                        )}
                        {formData.civic.attendedKKAssembly === 'No' && formData.civic.notAttendedReason && (
                          <span className="text-xs text-gray-500 ml-1">({formData.civic.notAttendedReason})</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Section */}
          <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Submit Survey</h3>
              <p className="text-sm text-gray-600 mt-1">Review complete. Submit your survey to complete the process.</p>
            </div>
            <div className="p-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-gray-700">All sections completed</span>
              </div>
              <p className="text-sm text-gray-600 mb-6">
                By submitting this survey, you confirm that all information provided is accurate and complete.
              </p>
              
              {/* reCAPTCHA verification */}
              <div id="survey-submit-recaptcha" className="flex justify-center mb-6">
                <div className="inline-block">
                  <ReCaptchaComponent
                    ref={recaptcha.ref}
                    onVerify={recaptcha.onVerify}
                    onError={recaptcha.onError}
                    onExpire={recaptcha.onExpire}
                    showError={true}
                  />
              </div>
            </div>

              {!recaptcha.isVerified && (
                <div className="flex items-center justify-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4">
                  <Shield className="w-4 h-4" />
                  <span>Please complete the reCAPTCHA verification to submit</span>
                </div>
              )}
              </div>
            </div>
          </div>

          </div>
        </div>
    </SurveyLayout>
    
    {/* Error Modal */}
    <ErrorModal
      isOpen={errorModal.isOpen}
      onClose={closeErrorModal}
      title={errorModal.title}
      message={errorModal.message}
      type={errorModal.type}
      onRetry={errorModal.type === 'error' ? handleRetry : null}
      disableClose={errorModal.type === 'success'} // Disable closing for success modals
      showCloseButton={errorModal.type !== 'success'} // Hide close button for success modals
    />
  </>
  );
};

export default SurveyReview;
