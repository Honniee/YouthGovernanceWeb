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
  GraduationCap,
  Briefcase,
  Users,
  Vote,
  UserCheck
} from 'lucide-react';
import { 
  SurveyLayout, 
  Input, 
  Select, 
  RadioGroup
} from '../../../components/survey';

const SurveyStep2 = () => {
  const navigate = useNavigate();

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
        const draft = { step2: formData };
        localStorage.setItem('kk_survey_draft_v1', JSON.stringify(draft));
        setLastSavedAt(new Date());
      } finally {
        setIsSaving(false);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [formData]);

  // Load saved data on mount
  useEffect(() => {
    const saved = localStorage.getItem('kk_survey_draft_v1');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.step2) {
          setFormData(data.step2);
        }
      } catch (e) {
        console.error('Error loading saved data:', e);
      }
    }
  }, []);

  const handleNext = () => {
    if (!isFormValid()) return;
    navigate('/kk-survey/step-4');
  };

  const handleBack = () => {
    navigate('/kk-survey/step-2');
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
                <img 
                  src={new URL('../../../assets/logos/san_jose_logo.webp', import.meta.url).toString()} 
                  alt="Municipality Seal" 
                  className="w-7 h-7 rounded-full border flex-shrink-0" 
                />
                <div className="text-left flex-1 min-h-[28px] flex flex-col justify-center">
                  <div className="text-xs text-gray-600 leading-tight">Municipality of San Jose, Batangas</div>
                  <div className="text-xs text-gray-500 leading-tight">Local Youth Development Office</div>
                </div>
                <button 
                  onClick={() => setShowMobileDetails(!showMobileDetails)} 
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0" 
                  aria-label={showMobileDetails ? "Hide survey details" : "Show survey details"}
                >
                  <div className={`transition-transform duration-300 ease-in-out ${showMobileDetails ? 'rotate-180' : 'rotate-0'}`}>
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  </div>
                </button>
              </div>

              {/* Collapsible Survey Details - Mobile */}
              <div className={`transition-all duration-300 ease-in-out ${showMobileDetails ? 'max-h-96 opacity-100 transform translate-y-0' : 'max-h-0 opacity-0 transform -translate-y-2'} overflow-hidden`}>
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
                  <div className="text-sm font-semibold text-gray-900">Step 3 of 5</div>
                  <div className="text-xs text-gray-600">Demographics</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-600 transition-all duration-300 rounded-full" style={{ width: `${(3 / 5) * 100}%` }} />
                        </div>
                        <span className="text-sm font-semibold text-blue-600">{Math.round((3 / 5) * 100)}%</span>
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
                <img 
                  src={new URL('../../../assets/logos/san_jose_logo.webp', import.meta.url).toString()} 
                  alt="Municipality Seal" 
                  className="w-9 h-9 rounded-full border" 
                />
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
                  <div className="text-sm font-semibold text-gray-900">Step 3 of 5</div>
                  <div className="text-sm text-gray-600">Demographics</div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 transition-all duration-300 rounded-full" style={{ width: `${(3 / 5) * 100}%` }} />
                    </div>
                    <span className="text-sm font-semibold text-blue-600">{Math.round((3 / 5) * 100)}%</span>
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
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold mb-4">
              KK Demographic Survey 2025
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
                  <RadioGroup
                    label="Youth Age Group"
                    field="youthAgeGroup"
                    options={['Child Youth (15-17 yrs old)', 'Core Youth (18-24 yrs old)', 'Young Adult (15-30 yrs old)']}
                    required
                    value={formData.youthAgeGroup}
                    onChange={onChange('youthAgeGroup')}
                    onBlur={onBlur('youthAgeGroup')}
                    error={fieldErrors.youthAgeGroup}
                    touched={touchedFields.youthAgeGroup}
                  />
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

        {/* Sticky Footer Navigation */}
        <div className="sticky bottom-0 border-t border-gray-200 backdrop-blur supports-[backdrop-filter]:bg-white/85 bg-white/95 shadow-lg">
          <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            {/* Desktop layout */}
            <div className="hidden sm:grid grid-cols-3 items-center gap-3">
              <div className="flex">
                <button 
                  onClick={handleBack} 
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full font-semibold transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
              </div>
              <div className="flex justify-center">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${isFormValid() ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                  {isFormValid() ? 'All Sections Complete' : 'Sections Incomplete'}
                </span>
              </div>
              <div className="flex justify-end">
                <button 
                  onClick={handleNext} 
                  disabled={!isFormValid()} 
                  className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold transition-all ${isFormValid() ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                >
                  Continue to Step 4
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
                    onClick={handleBack} 
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
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isFormValid() ? 'bg-green-100' : 'bg-amber-100'}`}>
                      {isFormValid() ? (
                        <Check className="w-3.5 h-3.5 text-green-600" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                      )}
                    </div>
                    <span className={`text-xs font-medium ${isFormValid() ? 'text-green-600' : 'text-amber-600'}`}>
                      {isFormValid() ? 'Complete' : 'Incomplete'}
                    </span>
                  </div>

                  {/* Continue Button */}
                  <button 
                    onClick={handleNext} 
                    disabled={!isFormValid()} 
                    className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg transition-colors ${isFormValid() ? 'hover:bg-blue-50' : 'opacity-50 cursor-not-allowed'}`} 
                    title="Continue to Step 4"
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isFormValid() ? 'bg-blue-600 shadow-md' : 'bg-gray-300'}`}>
                      <ArrowRight className={`w-3.5 h-3.5 ${isFormValid() ? 'text-white' : 'text-gray-500'}`} />
                    </div>
                    <span className={`text-xs font-medium ${isFormValid() ? 'text-blue-600' : 'text-gray-500'}`}>
                      Step 4
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

export default SurveyStep2;
