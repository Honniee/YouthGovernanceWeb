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
  Users
} from 'lucide-react';
import SurveyLayout from '../../../components/layouts/SurveyLayout';
import { 
  Input, 
  Select, 
  RadioGroup
} from '../../../components/survey';
import { useActiveSurvey } from '../../../hooks/useActiveSurvey';
import logger from '../../../utils/logger.js';

const SurveyStep3 = () => {
  const navigate = useNavigate();

  // Survey status
  const { activeSurvey, hasActiveSurvey, isLoading: surveyLoading, error: surveyError } = useActiveSurvey();

  // Form data state
  const [formData, setFormData] = useState({
    registeredSKVoter: '',
    votedLastSKElection: '',
    registeredNationalVoter: '',
    attendedKKAssembly: '',
    kkAssemblyTimes: '',
    notAttendedReason: ''
  });

  const [touchedFields, setTouchedFields] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [expandedSections, setExpandedSections] = useState({ 
    civicEngagement: true
  });
  const [showMobileDetails, setShowMobileDetails] = useState(false);

  // Demo data
  const emptyData = {
    registeredSKVoter: '',
    votedLastSKElection: '',
    registeredNationalVoter: '',
    attendedKKAssembly: '',
    kkAssemblyTimes: '',
    notAttendedReason: ''
  };

  const demoData = {
    registeredSKVoter: 'Yes',
    votedLastSKElection: 'Yes',
    registeredNationalVoter: 'Yes',
    attendedKKAssembly: 'Yes',
    kkAssemblyTimes: '1-2 Times',
    notAttendedReason: ''
  };

  const [isDemoMode, setIsDemoMode] = useState(false);

  // Validation
  const validateField = (field, value) => {
    switch (field) {
      case 'registeredSKVoter':
      case 'registeredNationalVoter':
      case 'attendedKKAssembly':
        if (!value) return 'This field is required';
        return '';
      case 'votedLastSKElection':
        if (formData.registeredSKVoter === 'Yes' && !value) {
          return 'This field is required';
        }
        return '';
      case 'kkAssemblyTimes':
        if (formData.attendedKKAssembly === 'Yes' && !value) {
          return 'This field is required';
        }
        return '';
      case 'notAttendedReason':
        if (formData.attendedKKAssembly === 'No' && !value) {
          return 'Please specify why you did not attend';
        }
        return '';
      default:
        return '';
    }
  };

  const onChange = (field) => (e) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const onBlur = (field) => () => {
    setTouchedFields(prev => ({ ...prev, [field]: true }));
    const error = validateField(field, formData[field]);
    setFieldErrors(prev => ({ ...prev, [field]: error }));
  };

  const getSectionCompletion = (section) => {
    switch (section) {
      case 'civicEngagement':
        const civicComplete = !!formData.registeredSKVoter && !!formData.registeredNationalVoter && !!formData.attendedKKAssembly;
        return { complete: civicComplete, total: 3, filled: [formData.registeredSKVoter, formData.registeredNationalVoter, formData.attendedKKAssembly].filter(Boolean).length };
      default:
        return { complete: false, total: 0, filled: 0 };
    }
  };

  const isFormValid = () => {
    const requiredFields = ['registeredSKVoter', 'registeredNationalVoter', 'attendedKKAssembly'];
    const allRequired = requiredFields.every(field => formData[field] && !validateField(field, formData[field]));
    
    // Check conditional fields
    const conditionalValid = 
      (formData.registeredSKVoter !== 'Yes' || formData.votedLastSKElection) &&
      (formData.attendedKKAssembly !== 'Yes' || formData.kkAssemblyTimes) &&
      (formData.attendedKKAssembly !== 'No' || formData.notAttendedReason);
    
    return allRequired && conditionalValid;
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleDemoMode = () => {
    if (!isDemoMode) {
      // Load demo data
      setIsDemoMode(true);
      setFormData(demoData);
      setExpandedSections({ 
        civicEngagement: true
      });
      // Save to localStorage
      const draft = { step3: demoData };
      localStorage.setItem('kk_survey_draft_v1', JSON.stringify(draft));
      logger.debug('Demo data loaded and saved');
    } else {
      // Clear demo data
      setIsDemoMode(false);
      setFormData(emptyData);
      localStorage.removeItem('kk_survey_draft_v1');
      logger.debug('Demo data cleared');
    }
  };

  // Auto-save functionality
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsSaving(true);
      try {
        const draft = { step3: formData };
        localStorage.setItem('kk_survey_draft_v1', JSON.stringify(draft));
        setLastSavedAt(new Date());
      } finally {
        setIsSaving(false);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [formData]);

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

    logger.debug('reCAPTCHA verification valid, allowing access to civic engagement page');
  }, [navigate]);

  // Load saved data on mount
  useEffect(() => {
    const saved = localStorage.getItem('kk_survey_draft_v1');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.step3) {
          setFormData(data.step3);
        }
      } catch (e) {
        logger.error('Error loading saved data', e);
      }
    }
  }, []);

  const handleNext = () => {
    if (!isFormValid()) return;
    // Save to localStorage before navigating
    const draft = { step3: formData };
    localStorage.setItem('kk_survey_draft_v1', JSON.stringify(draft));
    logger.debug('Civic engagement saved, navigating to review');
    navigate('/kk-survey/step-5'); // Go to Review (SurveyReview)
  };

  const handleBack = () => {
    // Save to localStorage before going back
    const draft = { step3: formData };
    localStorage.setItem('kk_survey_draft_v1', JSON.stringify(draft));
    logger.debug('Civic engagement saved, navigating back to demographics');
    navigate('/kk-survey/step-3'); // Go back to Demographics (SurveyStep2)
  };

  // Handle error state with early return (prevents flash)
  if (!surveyLoading && !hasActiveSurvey) {
    return (
      <SurveyLayout
        currentStep={3}
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

  // Section Header Component
  const SectionHeader = ({ icon: Icon, title, subtitle, section, completion }) => (
    <button 
      onClick={() => toggleSection(section)} 
      className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors mb-4"
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-full ${completion.complete ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="text-left">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600">{subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className={`px-3 py-1 rounded-full text-xs font-semibold ${completion.complete ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
          {completion.filled}/{completion.total}
        </div>
        <ArrowRight className={`w-5 h-5 text-gray-400 transition-transform ${expandedSections[section] ? 'rotate-90' : ''}`} />
      </div>
    </button>
  );

  return (
    <SurveyLayout
      // Header props
      currentStep={3}
      totalSteps={5}
      stepTitle="Civic Engagement"
      isSaving={isSaving}
      backToPath="/kk-survey"
      showProgress={true}
      showSaveStatus={true}
      // Footer props
      canContinue={isFormValid()}
      onBackClick={handleBack}
      onContinueClick={handleNext}
      continueButtonText="Continue to Review"
      statusMessage={isFormValid() ? 'Section Complete' : 'Section Incomplete'}
      statusType={isFormValid() ? 'success' : 'warning'}
      showStatus={true}
      disabled={!isFormValid()}
      isLoading={false}
      // Centralized loading state only (error handled with early return above)
      showLoadingState={surveyLoading}
      loadingMessage="Loading survey..."
    >
      <div className="bg-gray-50">
        <div className="max-w-4xl mx-auto px-6 py-8">
          {/* Header Section */}
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

            <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold mb-4">
              KK Demographic Survey 2025
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">Civic Engagement</h1>
            <p className="text-sm sm:text-base text-gray-700 max-w-2xl mx-auto mb-6">
              Please provide information about your civic participation and engagement. All fields marked with * are required.
            </p>

            {/* Enhanced Info Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-4xl mx-auto mb-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Vote className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-blue-900 text-xs sm:text-sm mb-1">Civic Participation</h3>
                    <p className="text-blue-700 text-xs leading-relaxed">Help us understand your participation in local governance and civic activities.</p>
                  </div>
                </div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-left">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Shield className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-green-900 text-xs sm:text-sm mb-1">Democratic Engagement</h3>
                    <p className="text-green-700 text-xs leading-relaxed">Your voting and assembly participation helps us improve youth programs.</p>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <div className="space-y-6">
            {/* Civic Engagement Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <SectionHeader 
                icon={Vote} 
                title="Civic Engagement" 
                subtitle="Your participation in civic activities and local governance" 
                section="civicEngagement" 
                completion={getSectionCompletion('civicEngagement')} 
              />
              {expandedSections.civicEngagement && (
                <div className="px-6 pb-6 space-y-6">
                  {/* SK Voter Registration */}
                  <div>
                    <RadioGroup
                      label="Registered SK Voter"
                      field="registeredSKVoter"
                      options={['Yes', 'No']}
                      required
                      value={formData.registeredSKVoter}
                      onChange={onChange('registeredSKVoter')}
                      onBlur={onBlur('registeredSKVoter')}
                      error={fieldErrors.registeredSKVoter}
                      touched={touchedFields.registeredSKVoter}
                    />
                  </div>

                  {/* SK Election Voting */}
                  {formData.registeredSKVoter === 'Yes' && (
                    <div className="space-y-4">
                      <RadioGroup
                        label="Did you vote last SK election?"
                        field="votedLastSKElection"
                        options={['Yes', 'No']}
                        required
                        value={formData.votedLastSKElection}
                        onChange={onChange('votedLastSKElection')}
                        onBlur={onBlur('votedLastSKElection')}
                        error={fieldErrors.votedLastSKElection}
                        touched={touchedFields.votedLastSKElection}
                      />
                      
                    </div>
                  )}

                  {/* National Voter Registration */}
                  <div>
                    <RadioGroup
                      label="Registered National Voter?"
                      field="registeredNationalVoter"
                      options={['Yes', 'No']}
                      required
                      value={formData.registeredNationalVoter}
                      onChange={onChange('registeredNationalVoter')}
                      onBlur={onBlur('registeredNationalVoter')}
                      error={fieldErrors.registeredNationalVoter}
                      touched={touchedFields.registeredNationalVoter}
                    />
                  </div>


                  {/* KK Assembly Attendance */}
                  <div>
                    <RadioGroup
                      label="Have you already attended a KK Assembly?"
                      field="attendedKKAssembly"
                      options={['Yes', 'No']}
                      required
                      value={formData.attendedKKAssembly}
                      onChange={onChange('attendedKKAssembly')}
                      onBlur={onBlur('attendedKKAssembly')}
                      error={fieldErrors.attendedKKAssembly}
                      touched={touchedFields.attendedKKAssembly}
                    />
                  </div>

                  {/* KK Assembly Times - If Yes */}
                  {formData.attendedKKAssembly === 'Yes' && (
                    <RadioGroup
                      label="If Yes, How many times?"
                      field="kkAssemblyTimes"
                      options={['1-2 Times', '3-4 Times', '5 and above']}
                      required
                      value={formData.kkAssemblyTimes}
                      onChange={onChange('kkAssemblyTimes')}
                      onBlur={onBlur('kkAssemblyTimes')}
                      error={fieldErrors.kkAssemblyTimes}
                      touched={touchedFields.kkAssemblyTimes}
                    />
                  )}

                  {/* Not Attended Reason - If No */}
                  {formData.attendedKKAssembly === 'No' && (
                    <RadioGroup
                      label="If No, Why?"
                      field="notAttendedReason"
                      options={['There was no KK Assembly Meeting', 'Not interested to Attend']}
                      required
                      value={formData.notAttendedReason}
                      onChange={onChange('notAttendedReason')}
                      onBlur={onBlur('notAttendedReason')}
                      error={fieldErrors.notAttendedReason}
                      touched={touchedFields.notAttendedReason}
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Summary Section */}
          <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Civic Engagement Summary</h3>
              <p className="text-sm text-gray-600 mt-1">Review your civic participation information before proceeding</p>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div className={`border-l-4 pl-4 ${formData.registeredSKVoter ? 'border-green-500' : 'border-amber-400'}`}>
                  <div className="text-sm">
                    <span className="text-gray-600">Registered SK Voter:</span>
                    <span className={`ml-2 font-medium ${formData.registeredSKVoter ? 'text-gray-900' : 'text-gray-500'}`}>
                      {formData.registeredSKVoter || '-'}
                    </span>
                  </div>
                </div>
                
                {formData.registeredSKVoter === 'Yes' && (
                  <div className={`border-l-4 pl-4 ${formData.votedLastSKElection ? 'border-green-500' : 'border-amber-400'}`}>
                    <div className="text-sm">
                      <span className="text-gray-600">Voted Last SK Election:</span>
                      <span className={`ml-2 font-medium ${formData.votedLastSKElection ? 'text-gray-900' : 'text-gray-500'}`}>
                        {formData.votedLastSKElection || '-'}
                      </span>
                    </div>
                  </div>
                )}
                
                <div className={`border-l-4 pl-4 ${formData.registeredNationalVoter ? 'border-green-500' : 'border-amber-400'}`}>
                  <div className="text-sm">
                    <span className="text-gray-600">Registered National Voter:</span>
                    <span className={`ml-2 font-medium ${formData.registeredNationalVoter ? 'text-gray-900' : 'text-gray-500'}`}>
                      {formData.registeredNationalVoter || '-'}
                    </span>
                  </div>
                </div>
                
                <div className={`border-l-4 pl-4 ${formData.attendedKKAssembly ? 'border-green-500' : 'border-amber-400'}`}>
                  <div className="text-sm">
                    <span className="text-gray-600">Attended KK Assembly:</span>
                    <span className={`ml-2 font-medium ${formData.attendedKKAssembly ? 'text-gray-900' : 'text-gray-500'}`}>
                      {formData.attendedKKAssembly || '-'}
                    </span>
                    {formData.attendedKKAssembly === 'Yes' && formData.kkAssemblyTimes && (
                      <span className="text-xs text-gray-500 ml-1">({formData.kkAssemblyTimes})</span>
                    )}
                    {formData.attendedKKAssembly === 'No' && formData.notAttendedReason && (
                      <span className="text-xs text-gray-500 ml-1">({formData.notAttendedReason})</span>
                    )}
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

export default SurveyStep3;
