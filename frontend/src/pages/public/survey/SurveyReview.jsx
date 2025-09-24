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
import { 
  SurveyLayout
} from '../../../components/survey';

const SurveyReview = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMobileDetails, setShowMobileDetails] = useState(false);
  const [formData, setFormData] = useState({
    personal: {},
    demographics: {},
    civic: {}
  });

  // Load saved data from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('kk_survey_draft_v1');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setFormData({
          personal: data.personal || {},
          demographics: data.step2 || {},
          civic: data.step3 || {}
        });
      } catch (e) {
        console.error('Error loading saved data:', e);
      }
    }
  }, []);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
      // Clear saved data after successful submission
      localStorage.removeItem('kk_survey_draft_v1');
    navigate('/kk-survey/thank-you');
    } catch (error) {
      console.error('Submission error:', error);
      setIsSubmitting(false);
    }
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
                        <div className="text-sm font-semibold text-gray-900">Step 5 of 5</div>
                        <div className="text-xs text-gray-600">Review & Submit</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-600 transition-all duration-300 rounded-full" style={{ width: `${(5 / 5) * 100}%` }} />
                        </div>
                        <span className="text-sm font-semibold text-blue-600">{Math.round((5 / 5) * 100)}%</span>
                      </div>
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
                  <div className="text-sm font-semibold text-gray-900">Step 5 of 5</div>
                  <div className="text-sm text-gray-600">Review & Submit</div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 transition-all duration-300 rounded-full" style={{ width: `${(5 / 5) * 100}%` }} />
                    </div>
                    <span className="text-sm font-semibold text-blue-600">{Math.round((5 / 5) * 100)}%</span>
                  </div>
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
                          ? `${formData.personal.purok ? formData.personal.purok + ', ' : ''}${formData.personal.barangay}, ${formData.personal.city}, ${formData.personal.province}, ${formData.personal.region}`
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
                  onClick={() => navigate('/kk-survey/step-4')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full font-semibold transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Edit
                </button>
              </div>
              <div className="flex justify-center">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                  All Sections Complete
                </span>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold transition-all ${
                    isSubmitting 
                      ? 'bg-gray-400 text-white cursor-not-allowed' 
                      : 'bg-green-600 text-white hover:bg-green-700 shadow-md hover:shadow-lg'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Submit Survey
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Mobile Tab Bar Style */}
            <div className="sm:hidden">
              <div className="bg-white/90 backdrop-blur-sm">
                <div className="flex items-center justify-between px-4 py-2">
                  {/* Back Button */}
                  <button 
                    onClick={() => navigate('/kk-survey/step-4')}
                    className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg hover:bg-gray-100 transition-colors" 
                    title="Back to Edit"
                  >
                    <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                      <ArrowLeft className="w-3.5 h-3.5 text-gray-600" />
                    </div>
                    <span className="text-xs text-gray-600 font-medium">Back</span>
                  </button>

                  {/* Status Indicator */}
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center bg-green-100">
                      <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                    </div>
                    <span className="text-xs font-medium text-green-600">Complete</span>
                  </div>

                  {/* Submit Button */}
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg transition-colors ${
                      isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-50'
                    }`}
                    title="Submit Survey"
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      isSubmitting ? 'bg-gray-300' : 'bg-green-600 shadow-md'
                    }`}>
                      {isSubmitting ? (
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <CheckCircle className="w-3.5 h-3.5 text-white" />
                      )}
                    </div>
                    <span className={`text-xs font-medium ${
                      isSubmitting ? 'text-gray-500' : 'text-green-600'
                    }`}>
                      {isSubmitting ? 'Submitting...' : 'Submit'}
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

export default SurveyReview;
