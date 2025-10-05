// =================================================================
// 🏗️ Survey Layout - Dedicated layout for survey pages
// =================================================================
// This layout provides a consistent structure for all survey pages:
// - Terms & Conditions
// - Youth Profile (Step 1)
// - Demographics (Step 2)
// - Civic Engagement (Step 3)
// - Review & Submit
// - Thank You Page
// =================================================================

import React from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import SurveyPageHeader from '../survey/SurveyPageHeader';
import SurveyPageFooter from '../survey/SurveyPageFooter';

/**
 * SurveyLayout Component
 * 
 * A clean, independent layout for all survey pages that includes:
 * - SurveyPageHeader (with progress, back button, save status)
 * - Main content area (children)
 * - SurveyPageFooter (with back/continue buttons, status)
 * 
 * This layout is independent from PublicLayout to provide
 * a focused, distraction-free survey experience.
 */
const SurveyLayout = ({ 
  children,
  // Header props
  currentStep = 1,
  totalSteps = 5,
  stepTitle = "Survey Step",
  isSaving = false,
  onBackClick,
  backToPath = '/kk-survey',
  showProgress = true,
  showSaveStatus = true,
  isThankYouPage = false,
  // Footer props
  canContinue = false,
  onContinueClick,
  continueButtonText = 'Continue',
  statusMessage = '',
  statusType = 'warning',
  showStatus = true,
  showFooter = true,
  disabled = false,
  isLoading = false,
  loadingText = 'Processing...',
  // Loading/Error state props
  showLoadingState = false,
  loadingMessage = 'Loading survey...',
  showErrorState = false,
  errorMessage = 'No active survey available',
  errorAction
}) => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Survey Page Header */}
      <SurveyPageHeader
        currentStep={currentStep}
        totalSteps={totalSteps}
        stepTitle={stepTitle}
        isSaving={isSaving}
        onBackClick={onBackClick}
        backToPath={backToPath}
        showProgress={showProgress}
        showSaveStatus={showSaveStatus}
        isThankYouPage={isThankYouPage}
      />

      {/* Main Content Area - with top padding for fixed header and bottom padding for fixed footer */}
      <main className="flex-1 pt-[104px] pb-[80px] relative z-0">
        {showLoadingState ? (
          /* Centralized Loading State - Takes full available height between header and footer */
          <div className="min-h-[calc(100vh-104px-80px)] flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-gray-600">{loadingMessage}</p>
            </div>
          </div>
        ) : showErrorState ? (
          /* Centralized Error State - Takes full available height between header and footer */
          <div className="min-h-[calc(100vh-104px-80px)] flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-600" />
              <p className="text-gray-600 mb-4">{errorMessage}</p>
              {errorAction && errorAction}
            </div>
          </div>
        ) : (
          /* Normal Content */
          children
        )}
      </main>

      {/* Survey Page Footer */}
      {showFooter && (
        <SurveyPageFooter
          canContinue={canContinue}
          onBackClick={onBackClick}
          onContinueClick={onContinueClick}
          continueButtonText={continueButtonText}
          statusMessage={statusMessage}
          statusType={statusType}
          showStatus={showStatus}
          disabled={disabled}
          isLoading={isLoading}
          loadingText={loadingText}
        />
      )}
    </div>
  );
};

export default SurveyLayout;
