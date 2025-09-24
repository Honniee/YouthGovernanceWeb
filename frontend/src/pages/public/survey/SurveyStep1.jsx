import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBarangays } from '../../../hooks/useBarangays';
import { User, MapPin, Phone, Calendar, ArrowRight, ArrowLeft, Check, AlertCircle, Save, Clock, FlaskConical, Info, ChevronDown, ChevronUp, Loader2, Shield, Cloud, Mail } from 'lucide-react';
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

const SurveyStep1 = () => {
  const navigate = useNavigate();
  const { barangays, isLoading: loadingBarangays, error: barangaysError } = useBarangays({ per_page: 100 });

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
    email: 'participant@example.com',
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
    barangay: '',
    purok: 'Zone 2',
    email: 'maria.delacruz@gmail.com',
  };

  const [isDemoMode, setIsDemoMode] = useState(false);
  const [formData, setFormData] = useState(emptyData);
  const [touchedFields, setTouchedFields] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    personal: true,
    location: true,
    demographics: true,
  });
  const [showMobileDetails, setShowMobileDetails] = useState(false);

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
        if (!/^(\+63|0)?9\d{9}$/.test(value.replace(/\s|-/g, ''))) return 'Please enter a valid Philippine mobile number';
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

  const toggleDemoMode = () => {
    const payload = !isDemoMode ? { ...demoData } : { ...emptyData };
    // If demo, try to pick first barangay from API
    if (!isDemoMode) {
      const first = barangays?.[0];
      payload.barangay = (first?.name || first?.barangay_name || payload.barangay || '');
    }
    setIsDemoMode((v) => !v);
    setFormData(payload);
    if (!isDemoMode) setExpandedSections({ personal: true, location: true, demographics: true });
  };

  // Auto-save with localStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsSaving(true);
      try {
        const draft = { personal: formData };
        localStorage.setItem('kk_survey_draft_v1', JSON.stringify(draft));
        setLastSavedAt(new Date());
      } finally {
        setIsSaving(false);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [formData]);

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

  const handleNext = () => {
    if (!isFormValid) return;
    navigate('/kk-survey/step-3');
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
                          <div className="text-sm font-semibold text-gray-900">Step 2 of 5</div>
                          <div className="text-xs text-gray-600">Personal Information</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-600 transition-all duration-300 rounded-full" style={{ width: `${(2 / 5) * 100}%` }} />
                          </div>
                          <span className="text-sm font-semibold text-blue-600">{Math.round((2 / 5) * 100)}%</span>
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
                    <div className="text-sm font-semibold text-gray-900">Step 2 of 5</div>
                    <div className="text-sm text-gray-600">Personal Information</div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 transition-all duration-300 rounded-full" style={{ width: `${(2 / 5) * 100}%` }} />
                </div>
                      <span className="text-sm font-semibold text-blue-600">{Math.round((2 / 5) * 100)}%</span>
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
                </div>

                </div>
              </div>

        <div className="min-h-screen bg-white">
          <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10 mt-20 sm:mt-30">
          <div className="text-center mb-8">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold mb-4">KK Demographic Survey 2025</div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">Personal Information</h1>
            <p className="text-sm sm:text-base text-gray-700 max-w-2xl mx-auto mb-6">Please provide your personal and location information. All fields marked with * are required.</p>
            
            {/* Enhanced Info Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-4xl mx-auto mb-6">
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

          {/* Demo Data Button */}
          <button 
            onClick={toggleDemoMode} 
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-semibold transition-all ${isDemoMode ? 'bg-blue-600 text-white shadow-md' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
          >
            <FlaskConical className="w-4 h-4" />
            {isDemoMode ? 'Using Demo Data' : 'Load Demo Data'}
          </button>
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
                          ? ['Barangay 1', 'Barangay 2', 'Barangay 3', 'Barangay 4', 'Barangay 5'] // Fallback data
                          : (barangays || []).map((b) => b.name || b.barangay_name).filter(Boolean)
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
                    <Input label="Contact Number" field="contactNumber" required placeholder="+639123456789" value={formData.contactNumber} onChange={onChange('contactNumber')} onBlur={onBlur('contactNumber')} error={fieldErrors.contactNumber} touched={touchedFields.contactNumber} />
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
                          ? `${formData.purok ? formData.purok + ', ' : ''}${formData.barangay}, ${formData.city}, ${formData.province}, ${formData.region}`
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

        <div className="sticky bottom-0 border-t border-gray-200 backdrop-blur supports-[backdrop-filter]:bg-white/85 bg-white/95 shadow-lg">
          <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            {/* Desktop layout */}
            <div className="hidden sm:grid grid-cols-3 items-center gap-3">
              <div className="flex">
                <button
                  onClick={() => navigate('/kk-survey/step-1')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full font-semibold transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Step 1
                </button>
                </div>

              <div className="flex justify-center">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${isFormValid ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                  {isFormValid ? 'Section Complete' : 'Section Incomplete'}
                </span>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleNext}
                  disabled={!isFormValid}
                  className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold transition-all ${isFormValid ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                >
                  Continue to Step 3
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
                    onClick={() => navigate('/kk-survey/step-1')}
                    className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                    title="Back to Step 1"
                  >
                    <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                      <ArrowLeft className="w-3.5 h-3.5 text-gray-600" />
                    </div>
                    <span className="text-xs text-gray-600 font-medium">Back</span>
                  </button>

                  {/* Status Indicator */}
                  <div className="flex flex-col items-center gap-0.5">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isFormValid ? 'bg-green-100' : 'bg-amber-100'}`}>
                      {isFormValid ? (
                        <Check className="w-3.5 h-3.5 text-green-600" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                      )}
                    </div>
                    <span className={`text-xs font-medium ${isFormValid ? 'text-green-600' : 'text-amber-600'}`}>
                      {isFormValid ? 'Complete' : 'Incomplete'}
                </span>
              </div>

                  {/* Continue Button */}
                  <button
                    onClick={handleNext}
                    disabled={!isFormValid}
                    className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg transition-colors ${
                      isFormValid 
                        ? 'hover:bg-blue-50' 
                        : 'opacity-50 cursor-not-allowed'
                    }`}
                    title="Continue to Step 3"
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      isFormValid 
                        ? 'bg-blue-600 shadow-md' 
                        : 'bg-gray-300'
                    }`}>
                      <ArrowRight className={`w-3.5 h-3.5 ${isFormValid ? 'text-white' : 'text-gray-500'}`} />
                    </div>
                    <span className={`text-xs font-medium ${isFormValid ? 'text-blue-600' : 'text-gray-500'}`}>
                      Step 3
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

export default SurveyStep1;




