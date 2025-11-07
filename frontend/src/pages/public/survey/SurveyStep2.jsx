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
  CheckCircle,
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
  GraduationCap,
  Briefcase,
  Users,
  Vote,
  UserCheck
} from 'lucide-react';
import SurveyLayout from '../../../components/layouts/SurveyLayout';
import { 
  Input, 
  Select, 
  RadioGroup
} from '../../../components/survey';
import { useActiveSurvey } from '../../../hooks/useActiveSurvey';

const SurveyStep2 = () => {
  const navigate = useNavigate();
  // Survey status
  const { activeSurvey, hasActiveSurvey, isLoading: surveyLoading, error: surveyError } = useActiveSurvey();

  // Form data state
  const [formData, setFormData] = useState({
    civilStatus: '',
    youthAgeGroup: '',
    educationalBackground: '',
    youthClassification: '',
    youthClassificationSpecific: '',
    workStatus: ''
  });
  const [touchedFields, setTouchedFields] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [expandedSections, setExpandedSections] = useState({ 
    civilStatus: true, 
    youthAgeGroup: true, 
    education: true,
    youthClassification: true,
    workStatus: true
  });
  const [showMobileDetails, setShowMobileDetails] = useState(false);

  // Demo data
  const emptyData = {
    civilStatus: '',
    youthAgeGroup: '',
    educationalBackground: '',
    youthClassification: '',
    youthClassificationSpecific: '',
    workStatus: ''
  };
  const demoData = {
    civilStatus: 'Single',
    youthAgeGroup: 'Core Youth (18-24 yrs old)',
    educationalBackground: 'College Level',
    youthClassification: 'In School Youth',
    youthClassificationSpecific: '',
    workStatus: 'Currently looking for a Job'
  };
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Validation
  const validateField = (field, value) => {
    switch (field) {
      case 'civilStatus':
      case 'youthAgeGroup':
      case 'educationalBackground':
      case 'youthClassification':
      case 'workStatus':
        if (!value) return 'This field is required';
        return '';
      case 'youthClassificationSpecific':
        if (formData.youthClassification === 'Youth w/Specific Needs' && !value) {
          return 'Please specify your specific needs';
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
      case 'civilStatus':
        return { complete: !!formData.civilStatus, total: 1, filled: formData.civilStatus ? 1 : 0 };
      case 'youthAgeGroup':
        return { complete: !!formData.youthAgeGroup, total: 1, filled: formData.youthAgeGroup ? 1 : 0 };
      case 'education':
        return { complete: !!formData.educationalBackground, total: 1, filled: formData.educationalBackground ? 1 : 0 };
      case 'youthClassification':
        const classificationComplete = !!formData.youthClassification && 
          (formData.youthClassification !== 'Youth w/Specific Needs' || !!formData.youthClassificationSpecific);
        return { complete: classificationComplete, total: 1, filled: classificationComplete ? 1 : 0 };
      case 'workStatus':
        return { complete: !!formData.workStatus, total: 1, filled: formData.workStatus ? 1 : 0 };
      default:
        return { complete: false, total: 0, filled: 0 };
    }
  };

  const isFormValid = () => {
    const requiredFields = ['civilStatus', 'youthAgeGroup', 'educationalBackground', 'youthClassification', 'workStatus'];
    const allRequired = requiredFields.every(field => formData[field] && !validateField(field, formData[field]));
    
    // Check conditional fields
    const conditionalValid = 
      (formData.youthClassification !== 'Youth w/Specific Needs' || formData.youthClassificationSpecific);
    
    return allRequired && conditionalValid;
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleDemoMode = () => {
    setIsDemoMode(!isDemoMode);
    setFormData(isDemoMode ? emptyData : demoData);
    if (!isDemoMode) {
      setExpandedSections({ 
        civilStatus: true, 
        youthAgeGroup: true, 
        education: true,
        youthClassification: true,
        workStatus: true
      });
    }
  };

  // Auto-save functionality
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsSaving(true);
      try {
        const draft = { demographics: formData };
        localStorage.setItem('kk_survey_draft_demographics', JSON.stringify(draft));
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
      console.log('🚫 No reCAPTCHA verification found, redirecting to survey landing');
      navigate('/kk-survey', { replace: true });
      return;
    }

    // Check if verification is still valid (expires after 30 minutes)
    const verificationTime = parseInt(recaptchaVerified);
    const currentTime = Date.now();
    const thirtyMinutes = 30 * 60 * 1000;
    
    if (currentTime - verificationTime > thirtyMinutes) {
      console.log('⏰ reCAPTCHA verification expired, redirecting to survey landing');
      sessionStorage.removeItem('recaptcha_verified');
      navigate('/kk-survey', { replace: true });
      return;
    }

    console.log('✅ reCAPTCHA verification valid, allowing access to demographics page');
  }, [navigate]);

  // Load saved data on mount and auto-set youth age group
  useEffect(() => {
    const saved = localStorage.getItem('kk_survey_draft_demographics');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.demographics) {
          setFormData(data.demographics);
        }
      } catch (e) {
        console.error('Error loading saved data:', e);
      }
    }

    // Auto-set youth age group based on age from personal info
    const personalData = localStorage.getItem('kk_survey_draft_personal');
    if (personalData) {
      try {
        const personal = JSON.parse(personalData);
        if (personal.birthday) {
          const birthDate = new Date(personal.birthday);
          const today = new Date();
          let age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }

          let youthAgeGroup;
          if (age >= 15 && age <= 17) {
            youthAgeGroup = 'Child Youth (15-17 yrs old)';
          } else if (age >= 18 && age <= 24) {
            youthAgeGroup = 'Core Youth (18-24 yrs old)';
          } else if (age >= 25 && age <= 30) {
            youthAgeGroup = 'Young Adult (15-30 yrs old)';
          }

          if (youthAgeGroup) {
            setFormData(prev => ({ ...prev, youthAgeGroup }));
            console.log(`🔍 Auto-set youth age group: ${youthAgeGroup} (age: ${age})`);
          }
        }
      } catch (e) {
        console.error('Error calculating youth age group:', e);
      }
    }
  }, []);

  const handleNext = () => {
    if (!isFormValid()) return;
    // Save to localStorage before navigating
    const draft = { demographics: formData };
    localStorage.setItem('kk_survey_draft_demographics', JSON.stringify(draft));
    console.log('💾 Demographics saved, navigating to civic engagement');
    navigate('/kk-survey/step-4'); // Go to Civic Engagement (SurveyStep3)
  };

  const handleBack = () => {
    // Save to localStorage before going back
    const draft = { demographics: formData };
    localStorage.setItem('kk_survey_draft_demographics', JSON.stringify(draft));
    console.log('💾 Demographics saved, navigating back to personal info');
    navigate('/kk-survey/step-2'); // Go back to Personal Info (SurveyStep1)
  };

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

  // Handle error state with early return (prevents flash)
  if (!surveyLoading && !hasActiveSurvey) {
  return (
      <SurveyLayout
        currentStep={2}
        totalSteps={5}
        stepTitle="Survey Not Available"
        isSaving={false}
        backToPath="/kk-survey"
        showProgress={true}
        showSaveStatus={false}
        canContinue={false}
        onBackClick={handleBack}
        onContinueClick={handleNext}
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
    <SurveyLayout
      // Header props
      currentStep={3}
      totalSteps={5}
      stepTitle="Demographics"
      isSaving={isSaving}
      backToPath="/kk-survey"
      showProgress={true}
      showSaveStatus={true}
      // Footer props
      canContinue={isFormValid()}
      onBackClick={handleBack}
      onContinueClick={handleNext}
      continueButtonText="Continue to Civic Engagement"
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
          <div className="bg-gray-50 text-center py-8 mb-8 rounded-xl">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold mb-4">
              KK Demographic Survey
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">Demographics</h1>
            <p className="text-sm sm:text-base text-gray-700 max-w-2xl mx-auto mb-6">
              Please provide your demographic information. All fields marked with * are required.
            </p>
            
            {/* Enhanced Info Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-4xl mx-auto mb-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Users className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-blue-900 text-xs sm:text-sm mb-1">Demographic Profile</h3>
                    <p className="text-blue-700 text-xs leading-relaxed">Help us understand your background and current status for better program planning.</p>
                  </div>
                </div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-left">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <GraduationCap className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-green-900 text-xs sm:text-sm mb-1">Educational & Work Status</h3>
                    <p className="text-green-700 text-xs leading-relaxed">Your education and employment status helps us tailor programs to your needs.</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
          <div className="space-y-6">
            {/* Civil Status Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <SectionHeader 
                icon={User} 
                title="Civil Status" 
                subtitle="Your current marital status" 
                section="civilStatus" 
                completion={getSectionCompletion('civilStatus')} 
              />
              {expandedSections.civilStatus && (
                <div className="px-6 pb-6">
                  <RadioGroup
                    label="Civil Status"
                    field="civilStatus"
                    options={['Single', 'Married', 'Widowed', 'Divorced', 'Separated', 'Annulled', 'Unknown', 'Live-in']}
                    required
                    value={formData.civilStatus}
                    onChange={onChange('civilStatus')}
                    onBlur={onBlur('civilStatus')}
                    error={fieldErrors.civilStatus}
                    touched={touchedFields.civilStatus}
                  />
                </div>
              )}
            </div>
            {/* Youth Age Group Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <SectionHeader 
                icon={Calendar} 
                title="Youth Age Group" 
                subtitle="Select your age group category" 
                section="youthAgeGroup" 
                completion={getSectionCompletion('youthAgeGroup')} 
              />
              {expandedSections.youthAgeGroup && (
                <div className="px-6 pb-6">
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      Youth Age Group <span className="text-red-500">*</span>
                    </label>
                    <div className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-green-50 text-green-700 border-green-200">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        {formData.youthAgeGroup || 'Calculating based on your age...'}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      This is automatically calculated based on your birthday from the personal information section.
                    </p>
                  </div>
                  
                  {/* Show the options but disabled */}
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-3">Available Age Groups:</p>
                    <div className="space-y-2">
                      {['Child Youth (15-17 yrs old)', 'Core Youth (18-24 yrs old)', 'Young Adult (15-30 yrs old)'].map((option) => (
                        <div 
                          key={option}
                          className={`flex items-center p-3 rounded-lg border ${
                            formData.youthAgeGroup === option 
                              ? 'bg-green-50 border-green-200 text-green-700' 
                              : 'bg-gray-50 border-gray-200 text-gray-500'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                            formData.youthAgeGroup === option 
                              ? 'border-green-500 bg-green-500' 
                              : 'border-gray-300'
                          }`}>
                            {formData.youthAgeGroup === option && (
                              <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                            )}
                          </div>
                          <span className="text-sm">{option}</span>
                          {formData.youthAgeGroup === option && (
                            <CheckCircle className="w-4 h-4 ml-auto text-green-500" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            {/* Educational Background Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <SectionHeader 
                icon={GraduationCap} 
                title="Educational Background" 
                subtitle="Your highest educational attainment" 
                section="education" 
                completion={getSectionCompletion('education')} 
              />
              {expandedSections.education && (
                <div className="px-6 pb-6">
                  <RadioGroup
                    label="Educational Background"
                    field="educationalBackground"
                    options={[
                      'Elementary Level', 'Elementary Grad', 'High School Level', 'High School Grad', 
                      'Vocational Grad', 'College Level', 'College Grad', 'Masters Level', 
                      'Masters Grad', 'Doctorate Level', 'Doctorate Graduate'
                    ]}
                    required
                    value={formData.educationalBackground}
                    onChange={onChange('educationalBackground')}
                    onBlur={onBlur('educationalBackground')}
                    error={fieldErrors.educationalBackground}
                    touched={touchedFields.educationalBackground}
                  />
                </div>
              )}
            </div>
            {/* Youth Classification Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <SectionHeader 
                icon={Users} 
                title="Youth Classification" 
                subtitle="Your current youth status" 
                section="youthClassification" 
                completion={getSectionCompletion('youthClassification')} 
              />
              {expandedSections.youthClassification && (
                <div className="px-6 pb-6">
                  <RadioGroup
                    label="Youth Classification"
                    field="youthClassification"
                    options={['In School Youth', 'Out of School Youth', 'Working Youth', 'Youth w/Specific Needs']}
                    required
                    value={formData.youthClassification}
                    onChange={onChange('youthClassification')}
                    onBlur={onBlur('youthClassification')}
                    error={fieldErrors.youthClassification}
                    touched={touchedFields.youthClassification}
                  />
                  
                  {formData.youthClassification === 'Youth w/Specific Needs' && (
                    <div className="mt-4">
                      <RadioGroup
                        label="Specific Needs"
                        field="youthClassificationSpecific"
                        options={['Person w/Disability', 'Children in Conflict w/ Law', 'Indigenous People']}
                        required
                        value={formData.youthClassificationSpecific}
                        onChange={onChange('youthClassificationSpecific')}
                        onBlur={onBlur('youthClassificationSpecific')}
                        error={fieldErrors.youthClassificationSpecific}
                        touched={touchedFields.youthClassificationSpecific}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* Work Status Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <SectionHeader 
                icon={Briefcase} 
                title="Work Status" 
                subtitle="Your current employment status" 
                section="workStatus" 
                completion={getSectionCompletion('workStatus')} 
              />
              {expandedSections.workStatus && (
                <div className="px-6 pb-6">
                  <RadioGroup
                    label="Work Status"
                    field="workStatus"
                    options={['Employed', 'Unemployed', 'Self-Employed', 'Currently looking for a Job', 'Not interested looking for a job']}
                    required
                    value={formData.workStatus}
                    onChange={onChange('workStatus')}
                    onBlur={onBlur('workStatus')}
                    error={fieldErrors.workStatus}
                    touched={touchedFields.workStatus}
                  />
                </div>
              )}
            </div>
          </div>
          {/* Summary Section */}
          <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Demographics Summary</h3>
              <p className="text-sm text-gray-600 mt-1">Review your demographic information before proceeding</p>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div className={`border-l-4 pl-4 ${formData.civilStatus ? 'border-green-500' : 'border-amber-400'}`}>
                  <div className="text-sm">
                    <span className="text-gray-600">Civil Status:</span>
                    <span className={`ml-2 font-medium ${formData.civilStatus ? 'text-gray-900' : 'text-gray-500'}`}>
                      {formData.civilStatus || '-'}
                    </span>
                  </div>
                </div>
                
                <div className={`border-l-4 pl-4 ${formData.youthAgeGroup ? 'border-green-500' : 'border-amber-400'}`}>
                  <div className="text-sm">
                    <span className="text-gray-600">Youth Age Group:</span>
                    <span className={`ml-2 font-medium ${formData.youthAgeGroup ? 'text-gray-900' : 'text-gray-500'}`}>
                      {formData.youthAgeGroup || '-'}
                    </span>
                  </div>
                </div>
                
                <div className={`border-l-4 pl-4 ${formData.educationalBackground ? 'border-green-500' : 'border-amber-400'}`}>
                  <div className="text-sm">
                    <span className="text-gray-600">Educational Background:</span>
                    <span className={`ml-2 font-medium ${formData.educationalBackground ? 'text-gray-900' : 'text-gray-500'}`}>
                      {formData.educationalBackground || '-'}
                    </span>
                  </div>
                </div>
                
                <div className={`border-l-4 pl-4 ${formData.youthClassification ? 'border-green-500' : 'border-amber-400'}`}>
                  <div className="text-sm">
                    <span className="text-gray-600">Youth Classification:</span>
                    <span className={`ml-2 font-medium ${formData.youthClassification ? 'text-gray-900' : 'text-gray-500'}`}>
                      {formData.youthClassification || '-'}
                      {formData.youthClassification === 'Youth w/Specific Needs' && formData.youthClassificationSpecific && (
                        <span className="text-xs text-gray-500 ml-1">({formData.youthClassificationSpecific})</span>
                      )}
                    </span>
                  </div>
                </div>
                
                <div className={`border-l-4 pl-4 ${formData.workStatus ? 'border-green-500' : 'border-amber-400'}`}>
                  <div className="text-sm">
                    <span className="text-gray-600">Work Status:</span>
                    <span className={`ml-2 font-medium ${formData.workStatus ? 'text-gray-900' : 'text-gray-500'}`}>
                      {formData.workStatus || '-'}
                    </span>
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

export default SurveyStep2;
