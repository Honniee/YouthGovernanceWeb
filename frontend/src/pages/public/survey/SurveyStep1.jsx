import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBarangays } from '../../../hooks/useBarangays';
import { useActiveSurvey } from '../../../hooks/useActiveSurvey';
import { User, MapPin, Phone, Check, AlertCircle, CheckCircle, FlaskConical, Loader2, Shield, ArrowRight } from 'lucide-react';
import SurveyLayout from '../../../components/layouts/SurveyLayout';
import logger from '../../../utils/logger.js';
import { 
  Card, 
  Button, 
  Input, 
  Select, 
  RadioGroup,
  SurveySummary 
} from '../../../components/survey';

const SurveyStep1 = () => {
  const navigate = useNavigate();
  const { barangays, isLoading: loadingBarangays, error: barangaysError } = useBarangays({ per_page: 100 });
  
  // Survey status
  const { activeSurvey, hasActiveSurvey, isLoading: surveyLoading, error: surveyError } = useActiveSurvey();

  // Templates
  const emptyData = {
    firstName: '',
    middleName: '',
    lastName: '',
    suffix: '',
    contactNumber: '',
    age: '',
    birthday: '',
    sexAtBirth: '',
    region: 'Region IV‑A (CALABARZON)',
    province: 'Batangas',
    city: 'San Jose',
    barangay: '',
    purok: '',
    email: '',
  };

  const demoData = {
    firstName: 'Maria',
    middleName: 'Santos',
    lastName: 'Dela Cruz',
    suffix: '',
    contactNumber: '+639123456789',
    age: '20',
    birthday: '2004-03-15',
    sexAtBirth: 'Female',
    region: 'Region IV‑A (CALABARZON)',
    province: 'Batangas',
    city: 'San Jose',
    barangay: 'BAR-001', // Use barangay ID instead of name
    purok: 'Zone 2',
    email: 'maria.delacruz@gmail.com',
  };

  const [isDemoMode, setIsDemoMode] = useState(false);
  const [formData, setFormData] = useState(emptyData);
  const [touchedFields, setTouchedFields] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Helper to get barangay name from ID
  const getBarangayName = (barangayId) => {
    if (!barangayId) return '';
    const barangay = (barangays || []).find(b => (b.barangay_id || b.id) === barangayId);
    return barangay ? (barangay.name || barangay.barangay_name) : barangayId;
  };
  const [expandedSections, setExpandedSections] = useState({
    personal: true,
    location: true,
    demographics: true,
  });

  // Age compute
  const age = useMemo(() => {

    if (!formData.birthday) return '';
    const b = new Date(formData.birthday);
    if (Number.isNaN(b.getTime())) return '';
    const now = new Date();
    let a = now.getFullYear() - b.getFullYear();
    const m = now.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < b.getDate())) a -= 1;
    return a;

  }, [formData.birthday]);

  useEffect(() => {
    if (formData.birthday && age !== '') {
      setFormData((prev) => ({ ...prev, age: age.toString() }));
    }
  }, [age, formData.birthday]);

  // ✅ FIXED: Add reCAPTCHA verification guard
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

    logger.debug('reCAPTCHA verification valid, allowing access to personal info page');
  }, [navigate]);

  // ============================================
  // SIMPLIFIED INITIALIZATION
  // ============================================
  // Load saved data from localStorage on mount
  useEffect(() => {
    // Check if terms were accepted
    const savedTerms = localStorage.getItem('kk_survey_terms_temp');
    if (!savedTerms) {
      logger.warn('No terms data found, redirecting to terms page');
      navigate('/kk-survey/step-1', { replace: true });
      return;
    }

    // Load any previously saved personal info
    const savedDraft = localStorage.getItem('kk_survey_draft_personal');
    if (savedDraft) {
      try {
        const parsedData = JSON.parse(savedDraft);
        setFormData(parsedData);
        logger.debug('Loaded saved personal info from localStorage');
      } catch (error) {
        logger.error('Error loading saved data', error);
      }
    }
  }, [navigate]);

  // Validation
  const validateField = (field, value) => {
    switch (field) {
      case 'email':
        if (!value) return 'Email is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Please enter a valid email address';
        return '';
      case 'firstName':
      case 'lastName':
        if (!value?.trim()) return 'This field is required';
        if (value.trim().length < 2) return 'Must be at least 2 characters';
        return '';
      case 'birthday':
        if (!value) return 'Birthday is required';
        // precise age already computed, but keep a quick guard
        if (age < 15 || age > 30) return 'Age must be between 15-30 years';
        return '';
      case 'contactNumber':
        if (!value) return 'Contact number is required';
        // Remove +63 prefix for validation check (should be 10 digits starting with 9)
        const cleanedNumber = value.replace(/^\+63/, '').replace(/\s|-/g, '');
        if (!/^9\d{9}$/.test(cleanedNumber)) return 'Please enter a valid 10-digit Philippine mobile number (starting with 9)';
        return '';
      case 'barangay':
        if (!value) return 'Please select your barangay';
        return '';
      case 'sexAtBirth':
        if (!value) return 'Please select sex assigned at birth';
        return '';
      default:
        return '';
    }
  };

  const onChange = (field) => (e) => {
    const value = e.target.value;
    let processedValue = value;
    
    if (['firstName', 'middleName', 'lastName', 'suffix'].includes(field)) {
      processedValue = value ? value.charAt(0).toUpperCase() + value.slice(1) : '';
    } else if (field === 'contactNumber') {
      // Remove any non-digit characters (user only sees digits in input, +63 is shown as prefix)
      let cleaned = value.replace(/\D/g, '');
      
      // Remove leading 0 if present (some users type 0912...)
      if (cleaned.startsWith('0')) {
        cleaned = cleaned.substring(1);
      }
      
      // Remove country code if user typed it manually
      if (cleaned.startsWith('63')) {
        cleaned = cleaned.substring(2);
      }
      
      // Limit to 10 digits (Philippine mobile number)
      cleaned = cleaned.substring(0, 10);
      
      // Auto-format with +63 prefix for storage
      if (cleaned.length > 0) {
        processedValue = `+63${cleaned}`;
      } else {
        processedValue = '';
      }
    }
    
    setFormData((prev) => ({ ...prev, [field]: processedValue }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const onBlur = (field) => () => {
    setTouchedFields((prev) => ({ ...prev, [field]: true }));
    const error = validateField(field, formData[field]);
    setFieldErrors((prev) => ({ ...prev, [field]: error }));
  };

  const getSectionCompletion = (section) => {
    switch (section) {
      case 'personal': {
        const personalFields = ['firstName', 'lastName'];
        const personalComplete = personalFields.every((f) => formData[f] && !validateField(f, formData[f]));
        return { complete: personalComplete, total: personalFields.length, filled: personalFields.filter((f) => formData[f]).length };
      }
      case 'location': {
        const locationFields = ['barangay'];
        const locationComplete = locationFields.every((f) => formData[f] && !validateField(f, formData[f]));
        return { complete: locationComplete, total: locationFields.length, filled: locationFields.filter((f) => formData[f]).length };
      }
      case 'demographics': {
        const demoFields = ['sexAtBirth', 'birthday', 'email', 'contactNumber'];
        const demoComplete = demoFields.every((f) => formData[f] && !validateField(f, formData[f]));
        return { complete: demoComplete, total: demoFields.length, filled: demoFields.filter((f) => formData[f]).length };
      }
      default:
        return { complete: false, total: 0, filled: 0 };
    }
  };

  const isFormValid = useMemo(() => {
    const required = ['firstName', 'lastName', 'sexAtBirth', 'birthday', 'email', 'contactNumber', 'barangay'];
    const allOk = required.every((f) => formData[f] && !validateField(f, formData[f]));
    return allOk && typeof age === 'number' && age >= 15 && age <= 30;
  }, [formData, age]);

  const toggleSection = (section) => setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));

  // ✅ FIXED: Immediately save demo data to prevent loss on navigation
  const toggleDemoMode = async () => {
    if (!isDemoMode) {
      // Load demo data
      const payload = { ...demoData };
      // If demo, try to pick first barangay from API
      const first = barangays?.[0];
      if (first) {
        payload.barangay = first.barangay_id || first.id || payload.barangay;
      }
      setIsDemoMode(true);
      setFormData(payload);
      setExpandedSections({ personal: true, location: true, demographics: true });
      
      // ✅ IMMEDIATE SAVE: Save demo data immediately to prevent loss
      try {
        logger.debug('Immediately saving demo data');
        
        // Save to localStorage
        localStorage.setItem('kk_survey_draft_personal', JSON.stringify(payload));
        
        setLastSavedAt(new Date());
        logger.debug('Demo data saved immediately');
      } catch (error) {
        logger.error('Failed to save demo data', error);
      }
    } else {
      // Clear demo data
      setIsDemoMode(false);
      setFormData(emptyData);
      localStorage.removeItem('kk_survey_draft_personal');
      logger.debug('Demo data cleared');
    }
  };

  // ============================================
  // SIMPLIFIED AUTO-SAVE
  // ============================================
  // Auto-save to localStorage every 1 second
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsSaving(true);
      try {
        localStorage.setItem('kk_survey_draft_personal', JSON.stringify(formData));
        setLastSavedAt(new Date());
        logger.debug('Personal info auto-saved to localStorage');
      } catch (error) {
        logger.error('Auto-save failed', error);
      } finally {
        setTimeout(() => setIsSaving(false), 300);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [formData]);

  // ============================================
  // REMOVED: Complex youth detection
  // ============================================
  // This function is no longer needed - we'll detect on final submit
  const detectYouthStatus_REMOVED = async (data) => {
    // Check if user has entered enough data for name detection
    const hasCompleteName = data.firstName?.trim() && data.lastName?.trim();
    const hasGender = data.sexAtBirth?.trim();
    const hasBirthDate = data.birthday?.trim();
    const hasEmail = data.email?.trim();
    
    // Check if user has entered enough data for email detection
    const canDetectByName = hasCompleteName && hasGender && hasBirthDate;
    const canDetectByEmail = hasEmail;
    
    if (!canDetectByName && !canDetectByEmail) {
      return; // Not enough data to detect yet
    }

    setIsDetectingYouth(true);
    try {
      logger.debug('Detecting youth status', { 
        hasFirstName: !!data.firstName,
        hasLastName: !!data.lastName,
        hasEmail: !!data.email,
        hasBirthDate: !!data.birthday
      });
      
      let profileCheck = null;
      
      // Method 1: Try name-based detection first (most reliable)
      if (canDetectByName) {
        logger.debug('Trying name-based detection');
        profileCheck = await checkProfile({
          first_name: data.firstName?.trim(),
          middle_name: data.middleName?.trim() || null,
          last_name: data.lastName?.trim(),
          suffix: data.suffix?.trim() || null,
          gender: data.sexAtBirth?.trim(),
          birth_date: data.birthday?.trim()
        });
      }
      
      // Method 2: If name detection failed and we have email, try email detection
      if ((!profileCheck || !profileCheck.exists) && canDetectByEmail) {
        logger.debug('Trying email-based detection');
        profileCheck = await checkProfile({
          email: data.email?.trim()
        });
      }

      if (profileCheck.exists) {
        logger.debug('Found existing youth profile', { youthId: profileCheck.youthId });
        
        // For now, assume returning user can continue (status check will be handled by session management)
        logger.debug('Returning user, can continue survey');
        setYouthStatus('returning');
        return { status: 'returning', youthId: profileCheck.youthId };
      } else {
        logger.debug('New user detected');
        setYouthStatus('new');
        return { status: 'new' };
      }
    } catch (error) {
      logger.error('Error detecting youth status', error);
      // Don't block user if detection fails
      return { status: 'unknown' };
    } finally {
      setIsDetectingYouth(false);
    }
  };

  // ✅ FIXED: Create youth profile and return the result
  const createYouthProfileIfNeeded = async (data) => {
    if (youthId || isCreatingProfile) {
      logger.debug('Skipping profile creation - already have youthId or creating', { youthId, isCreatingProfile });
      return { success: false, reason: 'already_exists', youthId };
    }

    // Check if user has entered meaningful data for profile creation
    const hasRequiredData = data.firstName?.trim() && 
                           data.lastName?.trim() && 
                           data.age && parseInt(data.age) > 0 && 
                           data.sexAtBirth && 
                           data.contactNumber?.trim() && 
                           data.email?.trim() && 
                           data.barangay;

    if (!hasRequiredData) {
      logger.debug('Skipping profile creation - missing required data', {
        firstName: !!data.firstName?.trim(),
        lastName: !!data.lastName?.trim(),
        age: !!data.age && parseInt(data.age) > 0,
        sexAtBirth: !!data.sexAtBirth,
        contactNumber: !!data.contactNumber?.trim(),
        email: !!data.email?.trim(),
        barangay: !!data.barangay
      });
      return { success: false, reason: 'incomplete_data' };
    }

    setIsCreatingProfile(true);
    try {
      logger.debug('Creating youth profile', { hasData: !!data });
      
      // Get terms data from localStorage
      const savedTerms = localStorage.getItem('kk_survey_terms_temp');
      const termsData = savedTerms ? JSON.parse(savedTerms) : {};

      // Prepare youth profile data (only profile fields, not terms)
      const youthProfileData = {
        first_name: data.firstName?.trim(),
        last_name: data.lastName?.trim(),
        middle_name: data.middleName?.trim(),
        suffix: data.suffix?.trim(),
        age: parseInt(data.age) || 0, // Ensure age is a number, default to 0 if invalid
        gender: data.sexAtBirth,
        contact_number: data.contactNumber?.trim(),
        email: data.email?.trim(),
        barangay_id: data.barangay || null,
        purok_zone: data.purok?.trim() || null
      };

      // Check if we have an active survey before trying to initialize session
      if (!activeSurvey) {
        logger.warn('No active survey available for profile creation');
        return { success: false, reason: 'no_survey', error: 'No active survey available' };
      }

      const result = await initializeSession(youthProfileData);
      if (result.success) {
        logger.info('Youth profile created successfully', { youthId: result.youthId });
        // Clear terms from localStorage since it's now saved in the profile
        localStorage.removeItem('kk_survey_terms_temp');
        return { success: true, youthId: result.youthId, userId: result.userId };
      } else {
        logger.error('Failed to create youth profile', null, { result });
        return { success: false, reason: 'creation_failed', error: result };
      }
    } catch (error) {
      logger.error('Error creating youth profile', error);
      return { success: false, reason: 'exception', error: error.message };
    } finally {
      setIsCreatingProfile(false);
    }
  };

  // Old complex auto-save removed - using simplified version above

  // UI Subcomponents
  const ProgressIndicator = ({ currentStep, totalSteps, stepTitle }) => (
    <div className="bg-white border-b border-gray-200 shadow-sm sticky top-[40px] z-30">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm font-semibold text-gray-900">Survey Progress - Step {currentStep} of {totalSteps}</div>
            <div className="text-sm text-gray-600">{stepTitle}</div>
          </div>
          <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">{Math.round((currentStep / totalSteps) * 100)}%</div>
        </div>
        <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-blue-600 transition-all duration-300 rounded-full" style={{ width: `${(2 / 5) * 100}%` }} />
          <div className="absolute inset-0 flex justify-between items-center px-1">
            {Array.from({ length: totalSteps }, (_, index) => (
              <div key={index} className={`w-3 h-3 rounded-full border-2 ${index + 1 <= currentStep ? 'bg-blue-600 border-blue-600' : index + 1 === currentStep ? 'bg-white border-blue-600' : 'bg-gray-300 border-gray-300'}`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const AutoSaveIndicator = ({ isSaving: saving, lastSaveTime }) => (
    <div className="bg-white">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-1.5">
        <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
          {saving ? (
            <>
              <Save className="w-4 h-4 animate-pulse text-orange-500" />
              Saving...
            </>
          ) : lastSaveTime ? (
            <>
              <Check className="w-4 h-4 text-green-600" />
              Saved at {lastSaveTime.toLocaleTimeString()}
            </>
          ) : (
            <>
              <Clock className="w-4 h-4" />
              Auto-save enabled
            </>
          )}
        </div>
      </div>
    </div>
  );

  const SurveyInput = ({ label, field, type = 'text', required = false, placeholder = '', disabled = false, className = '' }) => {
    const hasError = touchedFields[field] && fieldErrors[field];
    const valid = touchedFields[field] && formData[field] && !fieldErrors[field];
    return (
      <div className={`mb-6 ${className}`}>
        <label className="block text-sm font-semibold text-gray-800 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <input
          type={type}
          value={formData[field] || ''}
          onChange={onChange(field)}
          onBlur={onBlur(field)}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full px-4 py-3 border rounded-xl transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            hasError ? 'border-red-300 bg-red-50 focus:ring-red-500 focus:border-red-500' : valid ? 'border-green-300 bg-green-50' : disabled ? 'border-gray-200 bg-gray-50 text-gray-500' : 'border-gray-300 bg-white'
          }`}
        />
        {hasError && (
          <div className="flex items-center gap-1 mt-2 text-red-600 text-sm">
            <AlertCircle className="w-4 h-4" />
            {fieldErrors[field]}
          </div>
        )}
        {valid && (
          <div className="flex items-center gap-1 mt-2 text-green-600 text-sm">
            <Check className="w-4 h-4" />
            Looks good!
          </div>
        )}
      </div>
    );
  };

  const SurveySelect = ({ label, field, options, placeholder, required = false }) => {
    const hasError = touchedFields[field] && fieldErrors[field];
    const valid = touchedFields[field] && formData[field] && !fieldErrors[field];
  return (
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-800 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <select
          value={formData[field] || ''}
          onChange={onChange(field)}
          onBlur={onBlur(field)}
          className={`w-full px-4 py-3 border rounded-xl transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white ${hasError ? 'border-red-300 bg-red-50 focus:ring-red-500 focus:border-red-500' : valid ? 'border-green-300 bg-green-50' : 'border-gray-300'}`}
        >
          <option value="">{placeholder}</option>
          {options?.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
        {hasError && (
          <div className="flex items-center gap-1 mt-2 text-red-600 text-sm">
            <AlertCircle className="w-4 h-4" />
            {fieldErrors[field]}
        </div>
        )}
        {valid && (
          <div className="flex items-center gap-1 mt-2 text-green-600 text-sm">
            <Check className="w-4 h-4" />
            Looks good!
          </div>
        )}
        </div>
    );
  };

  const SurveyRadioGroup = ({ label, field, options, required = false }) => {
    const hasError = touchedFields[field] && fieldErrors[field];
    return (
          <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-800 mb-3">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="flex gap-6">
          {options.map((option) => (
            <label key={option} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={field}
                value={option}
                checked={formData[field] === option}
                onChange={onChange(field)}
                onBlur={onBlur(field)}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <span className="text-gray-700">{option}</span>
            </label>
          ))}
        </div>
        {hasError && (
          <div className="flex items-center gap-1 mt-2 text-red-600 text-sm">
            <AlertCircle className="w-4 h-4" />
            {fieldErrors[field]}
          </div>
        )}
      </div>
    );
  };

   const SectionHeader = ({ icon: Icon, title, subtitle, section, completion }) => (
     <button onClick={() => toggleSection(section)} className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors mb-4">
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
         <div className={`px-3 py-1 rounded-full text-xs font-semibold ${completion.complete ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{completion.filled}/{completion.total}</div>
         <ArrowRight className={`w-5 h-5 text-gray-400 transition-transform ${expandedSections[section] ? 'rotate-90' : ''}`} />
       </div>
     </button>
   );

  // ============================================
  // SIMPLIFIED NAVIGATION
  // ============================================
  const handleBack = () => {
    // Save to localStorage before going back
    localStorage.setItem('kk_survey_draft_personal', JSON.stringify(formData));
    logger.debug('Personal info saved, navigating back to terms');
    navigate('/kk-survey/step-1'); // Back to terms page
  };

  const handleNext = () => {
    if (!isFormValid) return;
    
    // Save to localStorage and navigate
    localStorage.setItem('kk_survey_draft_personal', JSON.stringify(formData));
    logger.debug('Personal info saved, navigating to demographics');
    navigate('/kk-survey/step-3'); // Demographics (Step 3)
  };

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
          <div className="max-w-7xl mx-auto px-6 py-8">
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
      currentStep={2}
      totalSteps={5}
      stepTitle="Personal Information"
      isSaving={isSaving}
           backToPath="/kk-survey"
           showProgress={true}
      showSaveStatus={true}
      // Footer props
      canContinue={isFormValid && hasActiveSurvey}
      onBackClick={handleBack}
      onContinueClick={handleNext}
      continueButtonText="Continue to Demographics"
      statusMessage={isFormValid ? 'Section Complete' : 'Section Incomplete'}
      statusType={isFormValid ? 'success' : 'warning'}
      showStatus={true}
      disabled={!isFormValid}
      isLoading={false}
      // Centralized loading state only (error handled with early return above)
      showLoadingState={surveyLoading}
      loadingMessage="Loading survey..."
    >
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 py-8">
          
          {/* Removed complex youth status displays - simplified flow */}

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

            <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold mb-4">KK Demographic Survey 2025</div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">Personal Information</h1>
            <p className="text-sm sm:text-base text-gray-700 max-w-2xl mx-auto mb-6">Please provide your personal and location information. All fields marked with * are required.</p>
            
            {/* Enhanced Info Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-6xl mx-auto mb-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                    <h3 className="font-semibold text-blue-900 text-xs sm:text-sm mb-1">Your Information</h3>
                    <p className="text-blue-700 text-xs leading-relaxed">We collect basic demographic data to create accurate youth profiles for our municipality.</p>
                </div>
              </div>
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-left">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Shield className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-green-900 text-xs sm:text-sm mb-1">Data Protection</h3>
                  <p className="text-green-700 text-xs leading-relaxed">Your information is protected under the Data Privacy Act and used only for official purposes.</p>
                </div>
                </div>
              </div>
            </div>

        </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <SectionHeader icon={User} title="Name Details" subtitle="Complete name as it appears on official documents" section="personal" completion={getSectionCompletion('personal')} />
              {expandedSections.personal && (
                <div className="px-6 pb-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Input label="First Name" field="firstName" required placeholder="Enter your first name" value={formData.firstName} onChange={onChange('firstName')} onBlur={onBlur('firstName')} error={fieldErrors.firstName} touched={touchedFields.firstName} className="sm:col-span-1" />
                    <Input label="Middle Name" field="middleName" placeholder="Enter your middle name" value={formData.middleName} onChange={onChange('middleName')} onBlur={onBlur('middleName')} error={fieldErrors.middleName} touched={touchedFields.middleName} className="sm:col-span-1" />
                    <Input label="Last Name" field="lastName" required placeholder="Enter your last name" value={formData.lastName} onChange={onChange('lastName')} onBlur={onBlur('lastName')} error={fieldErrors.lastName} touched={touchedFields.lastName} className="sm:col-span-1" />
                    <Input label="Suffix" field="suffix" placeholder="Jr., III, etc." value={formData.suffix} onChange={onChange('suffix')} onBlur={onBlur('suffix')} error={fieldErrors.suffix} touched={touchedFields.suffix} className="sm:col-span-1" />
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <SectionHeader icon={MapPin} title="Address Information" subtitle="Current place of residence within the municipality" section="location" completion={getSectionCompletion('location')} />
              {expandedSections.location && (
                <div className="px-6 pb-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <Input label="Region" field="region" disabled value={formData.region} className="sm:col-span-1" />
                    <Input label="Province" field="province" disabled value={formData.province} className="sm:col-span-1" />
                    <Input label="City/Municipality" field="city" disabled value={formData.city} className="sm:col-span-1" />
                    <Select 
                      label="Barangay" 
                      field="barangay" 
                      required 
                      options={
                        barangaysError 
                          ? [
                              { value: 'BAR-001', label: 'Barangay 1' },
                              { value: 'BAR-002', label: 'Barangay 2' },
                              { value: 'BAR-003', label: 'Barangay 3' },
                              { value: 'BAR-004', label: 'Barangay 4' },
                              { value: 'BAR-005', label: 'Barangay 5' }
                            ] // Fallback data with IDs
                          : (barangays || []).map((b) => ({
                              value: b.barangay_id || b.id,
                              label: b.name || b.barangay_name
                            })).filter(item => item.value && item.label)
                      } 
                      placeholder={
                        barangaysError 
                          ? 'Select your barangay (using fallback data)' 
                          : loadingBarangays 
                            ? 'Loading…' 
                            : 'Select your barangay'
                      }
                      value={formData.barangay}
                      onChange={onChange('barangay')}
                      onBlur={onBlur('barangay')}
                      error={fieldErrors.barangay}
                      touched={touchedFields.barangay}
                      className="sm:col-span-1" 
                    />
                    <Input label="Purok/Zone" field="purok" placeholder="e.g., Zone 1, Purok 2" value={formData.purok} onChange={onChange('purok')} onBlur={onBlur('purok')} error={fieldErrors.purok} touched={touchedFields.purok} className="sm:col-span-1" />
                  </div>
              </div>
              )}
                </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <SectionHeader icon={Phone} title="Personal Details" subtitle="Age, sex at birth, and contact information for official correspondence" section="demographics" completion={getSectionCompletion('demographics')} />
              {expandedSections.demographics && (
                <div className="px-6 pb-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                <div>
                      <RadioGroup label="Sex Assigned at Birth" field="sexAtBirth" options={['Male', 'Female']} required value={formData.sexAtBirth} onChange={onChange('sexAtBirth')} onBlur={onBlur('sexAtBirth')} error={fieldErrors.sexAtBirth} touched={touchedFields.sexAtBirth} />
                </div>
                <div>
                      <Input label="Birthday" field="birthday" type="date" required value={formData.birthday} onChange={onChange('birthday')} onBlur={onBlur('birthday')} error={fieldErrors.birthday} touched={touchedFields.birthday} />
                      {age !== '' && (
                        <div className={`mt-2 text-sm px-3 py-2 rounded-lg ${age >= 15 && age <= 30 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                          <strong>Age: {age} years old</strong>
                          {age < 15 || age > 30 ? ' (Must be 15-30 to participate)' : ' ✓ Eligible to participate'}
                        </div>
                      )}
                </div>
                <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-2">Age</label>
                      <div className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-700">
                        {age !== '' ? `${age} years old` : 'Enter your birthday to calculate age'}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input label="Email Address" field="email" type="email" required placeholder="your.email@example.com" value={formData.email} onChange={onChange('email')} onBlur={onBlur('email')} error={fieldErrors.email} touched={touchedFields.email} />
                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-gray-800 mb-2">
                        Contact Number <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-600 font-medium z-10 pointer-events-none">
                          +63
                        </div>
                        <input
                          type="tel"
                          value={formData.contactNumber ? formData.contactNumber.replace(/^\+63/, '') : ''}
                          onChange={onChange('contactNumber')}
                          onBlur={onBlur('contactNumber')}
                          placeholder="9123456789"
                          maxLength={10}
                          className={`w-full pl-14 pr-4 py-3 border rounded-xl transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            touchedFields.contactNumber && fieldErrors.contactNumber 
                              ? 'border-red-300 bg-red-50 focus:ring-red-500 focus:border-red-500' 
                              : touchedFields.contactNumber && formData.contactNumber && !fieldErrors.contactNumber
                                ? 'border-green-300 bg-green-50' 
                                : 'border-gray-300 bg-white'
                          }`}
                        />
                      </div>
                      {touchedFields.contactNumber && fieldErrors.contactNumber && (
                        <div className="flex items-center gap-1 mt-2 text-red-600 text-sm">
                          <AlertCircle className="w-4 h-4" />
                          {fieldErrors.contactNumber}
                        </div>
                      )}
                      {touchedFields.contactNumber && formData.contactNumber && !fieldErrors.contactNumber && (
                        <div className="flex items-center gap-1 mt-2 text-green-600 text-sm">
                          <Check className="w-4 h-4" />
                          Looks good! ({formData.contactNumber})
                        </div>
                      )}
                      <p className="text-xs text-gray-500 mt-1">Enter your 10-digit mobile number (we'll add +63 for you)</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Summary Section */}
            <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Personal Information Summary</h3>
                <p className="text-sm text-gray-600 mt-1">Review your provided information before proceeding</p>
              </div>
              
              <div className="p-6">
                <div className="space-y-4">
                  <div className={`border-l-4 pl-4 ${formData.firstName && formData.lastName ? 'border-green-500' : 'border-amber-400'}`}>
                    <div className="text-sm">
                      <span className="text-gray-600">Full Name:</span>
                      <span className="ml-2 font-medium text-gray-900">
                        {formData.firstName && formData.lastName 
                          ? `${formData.firstName} ${formData.middleName ? formData.middleName + ' ' : ''}${formData.lastName}${formData.suffix ? ' ' + formData.suffix : ''}`
                          : '-'
                        }
                      </span>
                    </div>
                  </div>
                  
                  <div className={`border-l-4 pl-4 ${formData.barangay ? 'border-green-500' : 'border-amber-400'}`}>
                    <div className="text-sm">
                      <span className="text-gray-600">Address:</span>
                      <span className={`ml-2 font-medium ${formData.barangay ? 'text-gray-900' : 'text-gray-500'}`}>
                        {formData.barangay 
                          ? `${formData.purok ? formData.purok + ', ' : ''}${getBarangayName(formData.barangay)}, ${formData.city}, ${formData.province}, ${formData.region}`
                          : '-'
                        }
                      </span>
                    </div>
                  </div>
                  
                  <div className={`border-l-4 pl-4 ${formData.sexAtBirth ? 'border-green-500' : 'border-amber-400'}`}>
                    <div className="text-sm">
                      <span className="text-gray-600">Sex:</span>
                      <span className={`ml-2 font-medium ${formData.sexAtBirth ? 'text-gray-900' : 'text-gray-500'}`}>
                        {formData.sexAtBirth || '-'}
                      </span>
                    </div>
                  </div>
                  
                  <div className={`border-l-4 pl-4 ${formData.birthday ? 'border-green-500' : 'border-amber-400'}`}>
                    <div className="text-sm">
                      <span className="text-gray-600">Birthday:</span>
                      <span className={`ml-2 font-medium ${formData.birthday ? 'text-gray-900' : 'text-gray-500'}`}>
                        {formData.birthday || '-'}
                      </span>
                    </div>
                  </div>
                  
                  <div className={`border-l-4 pl-4 ${age !== '' ? 'border-green-500' : 'border-amber-400'}`}>
                    <div className="text-sm">
                      <span className="text-gray-600">Age:</span>
                      <span className="ml-2 font-medium text-gray-900">
                        {age !== '' ? `${age} years old` : '-'}
                      </span>
                    </div>
                  </div>
                  
                  <div className={`border-l-4 pl-4 ${formData.email ? 'border-green-500' : 'border-amber-400'}`}>
                    <div className="text-sm">
                      <span className="text-gray-600">Email Address:</span>
                      <span className={`ml-2 font-medium ${formData.email ? 'text-gray-900' : 'text-gray-500'}`}>
                        {formData.email || '-'}
                      </span>
                    </div>
                  </div>
                  
                  <div className={`border-l-4 pl-4 ${formData.contactNumber ? 'border-green-500' : 'border-amber-400'}`}>
                    <div className="text-sm">
                      <span className="text-gray-600">Contact Number:</span>
                      <span className={`ml-2 font-medium ${formData.contactNumber ? 'text-gray-900' : 'text-gray-500'}`}>
                        {formData.contactNumber || '-'}
                      </span>
                    </div>
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

export default SurveyStep1;




