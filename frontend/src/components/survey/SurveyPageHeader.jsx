import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, ChevronDown, Check, Loader2, AlertTriangle, X } from 'lucide-react';
import { useActiveSurvey } from '../../hooks/useActiveSurvey';

/**
 * SurveyPageHeader Component
 * 
 * A reusable header component for all survey pages that includes:
 * - Dynamic survey batch name from database
 * - Progress tracking
 * - Auto-save status indicator
 * - Exit confirmation modal
 * - Responsive design (desktop/mobile)
 * 
 * @param {Object} props - Component props
 * @param {number} props.currentStep - Current step number (1-5)
 * @param {number} props.totalSteps - Total steps in survey (default: 5)
 * @param {string} props.stepTitle - Current step title
 * @param {boolean} props.isSaving - Auto-save status
 * @param {Function} props.onBackClick - Custom back button handler
 * @param {string} props.backToPath - Default back navigation path
 * @param {boolean} props.showProgress - Show/hide progress bar
 * @param {boolean} props.showSaveStatus - Show/hide save status indicator
 */
const SurveyPageHeader = ({ 
  currentStep = 1,
  totalSteps = 5,
  stepTitle = "Survey Step",
  isSaving = false,
  onBackClick,
  backToPath = '/kk-survey',
  showProgress = true,
  showSaveStatus = true,
  isThankYouPage = false
}) => {
  const navigate = useNavigate();
  const [showMobileDetails, setShowMobileDetails] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showBackToWebsiteModal, setShowBackToWebsiteModal] = useState(false);
  
  // Fetch active survey batch from database
  const { activeSurvey, loading: surveyLoading } = useActiveSurvey();

  /**
   * Handle back button click - shows exit confirmation modal
   */
  const handleBackClick = () => {
    setShowExitModal(true);
  };

  /**
   * Handle back to website button click - shows confirmation modal
   */
  const handleBackToWebsiteClick = () => {
    setShowBackToWebsiteModal(true);
  };

  /**
   * Handle confirm back to website - navigates to website
   */
  const handleConfirmBackToWebsite = () => {
    setShowBackToWebsiteModal(false);
    window.location.href = '/kk-survey';
  };

  /**
   * Handle cancel back to website - closes modal
   */
  const handleCancelBackToWebsite = () => {
    setShowBackToWebsiteModal(false);
  };

  /**
   * Handle exit confirmation - navigates back or calls custom handler
   */
  const handleConfirmExit = () => {
    setShowExitModal(false);
    if (onBackClick) {
      onBackClick();
    } else {
      navigate(backToPath);
    }
  };

  /**
   * Handle exit cancellation - closes modal
   */
  const handleCancelExit = () => {
    setShowExitModal(false);
  };

  const progressPercentage = Math.round((currentStep / totalSteps) * 100);
  
  // Get batch name from active survey or fallback
  // Show empty string while loading to prevent flash of fallback text
  const batchName = surveyLoading ? '' : (activeSurvey?.batchName || activeSurvey?.batch_name || '');

  return (
    <>
      {/* Top utility bar */}
      <div className="bg-[#24345A] fixed top-0 left-0 right-0 z-50">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 h-10 flex items-center justify-between">
          <button 
            onClick={handleBackToWebsiteClick}
            title="Return to survey landing"
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
      <div className="bg-white border-b border-gray-200 fixed top-[40px] left-0 right-0 z-40">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Main Header Row */}
          <div className="py-3 sm:py-4">
            {/* Desktop: Horizontal Layout */}
            <div className="hidden sm:grid grid-cols-3 items-center">
              {/* Left: Municipality Info */}
              <div className="flex items-center gap-3">
                <img 
                  src={new URL('../../assets/logos/san_jose_logo.webp', import.meta.url).toString()} 
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
                {surveyLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                    <h1 className="text-xl font-bold text-gray-500">Loading Survey...</h1>
                  </div>
                ) : (
                  <h1 className="text-xl font-bold text-gray-900">{batchName}</h1>
                )}
              </div>

              {/* Right: Progress & Status */}
              <div className="flex items-center gap-6 justify-end">
                {showProgress && (
                  /* Progress Info */
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-900">Step {currentStep} of {totalSteps}</div>
                    <div className="text-sm text-gray-600">{stepTitle}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-600 transition-all duration-300 rounded-full" 
                          style={{ width: `${progressPercentage}%` }} 
                        />
                      </div>
                      <span className="text-sm font-semibold text-blue-600">{progressPercentage}%</span>
                    </div>
                  </div>
                )}

                {showSaveStatus && (
                  /* Save Status */
                  <div className="flex items-center">
                    {isSaving ? (
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-orange-50 border border-orange-200 rounded-full">
                        <Loader2 className="w-3 h-3 animate-spin text-orange-500" />
                        <span className="text-orange-700 text-xs font-medium">Saving...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 border border-green-200 rounded-full">
                        <Check className="w-3 h-3 text-green-600" />
                        <span className="text-green-700 text-xs font-medium">Auto-save enabled</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Mobile: Stacked Layout */}
            <div className="block sm:hidden">
              {/* Municipality Info - Mobile (Always Visible) */}
              <div className="flex items-center gap-2">
                <img 
                  src={new URL('../../assets/logos/san_jose_logo.webp', import.meta.url).toString()} 
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
                    {surveyLoading ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-3 h-3 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                        <h1 className="text-lg font-bold text-gray-500">Loading Survey...</h1>
                      </div>
                    ) : (
                      <h1 className="text-lg font-bold text-gray-900">{batchName}</h1>
                    )}
                  </div>

                  {/* Progress & Status - Mobile */}
                  {showProgress && (
                    <div className="space-y-3">
                      {/* Progress Info */}
                      <div className="flex items-center justify-between">
                        <div className="text-left">
                          <div className="text-sm font-semibold text-gray-900">Step {currentStep} of {totalSteps}</div>
                          <div className="text-xs text-gray-600">{stepTitle}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-600 transition-all duration-300 rounded-full" 
                              style={{ width: `${progressPercentage}%` }} 
                            />
                          </div>
                          <span className="text-sm font-semibold text-blue-600">{progressPercentage}%</span>
                        </div>
                      </div>

                      {/* Save Status */}
                      {showSaveStatus && (
                        <div className="flex items-center justify-center">
                          {isSaving ? (
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-orange-50 border border-orange-200 rounded-full">
                              <Loader2 className="w-3 h-3 animate-spin text-orange-500" />
                              <span className="text-orange-700 text-xs font-medium">Saving...</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 border border-green-200 rounded-full">
                              <Check className="w-3 h-3 text-green-600" />
                              <span className="text-green-700 text-xs font-medium">Auto-save enabled</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Exit Confirmation Modal */}
      {showExitModal && (
        <div 
          className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            // Prevent any clicks from bubbling up
            e.stopPropagation();
          }}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4"
            onClick={(e) => {
              // Prevent modal content clicks from bubbling up
              e.stopPropagation();
            }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Leave Survey?</h3>
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleCancelExit();
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <p className="text-gray-600 mb-4">
                You haven't finished the survey yet. Your progress has been saved automatically, but you'll need to complete all steps to submit your response.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-900 mb-1">Your progress is safe</p>
                    <p className="text-sm text-blue-700">
                      You're currently on Step {currentStep} of {totalSteps}. You can return anytime to continue where you left off.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 p-6 border-t border-gray-200">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleCancelExit();
                }}
                className="flex-1 px-4 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
              >
                Continue Survey
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleConfirmExit();
                }}
                className="flex-1 px-4 py-2.5 text-white bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              >
                Leave Survey
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Back to Website Confirmation Modal */}
      {showBackToWebsiteModal && (
        <div 
          className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            // Prevent any clicks from bubbling up
            e.stopPropagation();
          }}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl max-w-sm sm:max-w-md w-full mx-2 sm:mx-4"
            onClick={(e) => {
              // Prevent modal content clicks from bubbling up
              e.stopPropagation();
            }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Leave Survey?</h3>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleCancelBackToWebsite();
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6">
              {isThankYouPage ? (
                <>
                  <p className="text-sm sm:text-base text-gray-600 mb-4">
                    Are you sure you want to return to the website? You have successfully completed the survey.
                  </p>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
                    <div className="flex items-start gap-2 sm:gap-3">
                      <div className="w-5 h-5 sm:w-6 sm:h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-green-600" />
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-green-900 mb-1">Survey completed successfully</p>
                        <p className="text-xs sm:text-sm text-green-700">
                          Thank you for your participation! Your response has been recorded and will help improve our youth programs.
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm sm:text-base text-gray-600 mb-4">
                    Are you sure you want to leave the survey and return to the website? Your progress has been saved automatically.
                  </p>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
                    <div className="flex items-start gap-2 sm:gap-3">
                      <div className="w-5 h-5 sm:w-6 sm:h-6 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-amber-900 mb-1">Survey not completed</p>
                        <p className="text-xs sm:text-sm text-amber-700">
                          You're currently on Step {currentStep} of {totalSteps}. You'll need to complete all steps to submit your response.
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 p-4 sm:p-6 border-t border-gray-200">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleCancelBackToWebsite();
                }}
                className="flex-1 px-4 py-2.5 text-sm sm:text-base text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
              >
                {isThankYouPage ? 'Stay Here' : 'Continue Survey'}
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleConfirmBackToWebsite();
                }}
                className="flex-1 px-4 py-2.5 text-sm sm:text-base text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                Back to Website
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SurveyPageHeader;

