import React from 'react';
import { createPortal } from 'react-dom';
import { FileText, RotateCcw, X, Clock, CheckCircle } from 'lucide-react';

const ResumeSurveyModal = ({ 
  isOpen, 
  onClose, 
  onResume, 
  onStartFresh,
  surveyData = null 
}) => {
  if (!isOpen) return null;

  // Calculate progress based on available data
  const getProgressInfo = () => {
    if (!surveyData) return { progress: 0, lastStep: 'Not started' };
    
    let completedSteps = 0;
    let lastStep = 'Not started';
    
    // Check if terms were accepted
    const termsAccepted = surveyData.terms && surveyData.terms.acceptedSections && 
      Object.values(surveyData.terms.acceptedSections).every(accepted => accepted === true);
    
    if (termsAccepted) {
      completedSteps++;
      lastStep = 'Terms & Conditions';
    }
    
    if (surveyData.personal && Object.keys(surveyData.personal).length > 0) {
      completedSteps++;
      lastStep = 'Personal Information';
    }
    if (surveyData.demographics && Object.keys(surveyData.demographics).length > 0) {
      completedSteps++;
      lastStep = 'Demographics';
    }
    if (surveyData.civic && Object.keys(surveyData.civic).length > 0) {
      completedSteps++;
      lastStep = 'Civic Engagement';
    }
    
    // Total steps is 4 (terms + 3 survey steps)
    const progress = (completedSteps / 4) * 100;
    return { progress, lastStep, completedSteps, totalSteps: 4 };
  };

  const { progress, lastStep, completedSteps, totalSteps } = getProgressInfo();
  const hasData = completedSteps > 0;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start gap-4 mb-6">
            <div className="flex-shrink-0 p-3 rounded-full bg-blue-100">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {hasData ? 'Resume Your Survey?' : 'Start New Survey'}
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                {hasData 
                  ? 'We found your previously saved survey progress. Would you like to continue where you left off?'
                  : 'Ready to start a new KK Survey? Your responses will help shape youth programs in our community.'
                }
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 p-1 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Progress Info (only show if there's saved data) */}
          {hasData && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-blue-900">Survey Progress</h4>
                  <p className="text-xs text-blue-700">Last saved: {lastStep}</p>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-blue-100 rounded-full h-2 mb-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-blue-700">
                <span>{completedSteps} of {totalSteps} steps completed</span>
                <span>{Math.round(progress)}%</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            {hasData ? (
              <>
                <button
                  onClick={onResume}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <CheckCircle className="w-4 h-4" />
                  Resume Survey
                </button>
                <button
                  onClick={onStartFresh}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  <RotateCcw className="w-4 h-4" />
                  Start Fresh
                </button>
              </>
            ) : (
              <button
                onClick={onStartFresh}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <FileText className="w-4 h-4" />
                Start New Survey
              </button>
            )}
          </div>

          {/* Help Text */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              {hasData 
                ? 'Your progress is automatically saved as you complete each step.'
                : 'Your responses will be automatically saved as you progress through the survey.'
              }
            </p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ResumeSurveyModal;
