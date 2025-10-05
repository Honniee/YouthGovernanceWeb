import React from 'react';
import { ArrowLeft, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';

const SurveyPageFooter = ({ 
  canContinue = false,
  onBackClick,
  onContinueClick,
  backButtonText = 'Back',
  continueButtonText = 'Continue',
  statusMessage = '',
  statusType = 'warning', // 'success', 'warning', 'error'
  showStatus = true,
  disabled = false,
  isLoading = false,
  loadingText = 'Processing...'
}) => {
  
  const getStatusConfig = () => {
    switch (statusType) {
      case 'success':
        return {
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          iconColor: 'text-green-600',
          icon: ShieldCheck
        };
      case 'error':
        return {
          bgColor: 'bg-red-100',
          textColor: 'text-red-800',
          iconColor: 'text-red-600',
          icon: AlertCircle
        };
      case 'warning':
      default:
        return {
          bgColor: 'bg-amber-100',
          textColor: 'text-amber-800',
          iconColor: 'text-amber-600',
          icon: AlertCircle
        };
    }
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  const handleBackClick = () => {
    if (onBackClick) {
      onBackClick();
    }
  };

  const handleContinueClick = () => {
    if (onContinueClick && canContinue && !disabled && !isLoading) {
      onContinueClick();
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 backdrop-blur supports-[backdrop-filter]:bg-white/85 bg-white/95 shadow-lg">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        {/* Desktop layout */}
        <div className="hidden sm:grid grid-cols-3 items-center gap-3">
          {/* Back Button */}
          <div className="flex">
            <button
              onClick={handleBackClick}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold transition-colors bg-gray-100 hover:bg-gray-200 text-gray-700"
            >
              <ArrowLeft className="w-4 h-4" />
              {backButtonText}
            </button>
          </div>

          {/* Status Indicator */}
          {showStatus && (
            <div className="flex justify-center">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusConfig.bgColor} ${statusConfig.textColor}`}>
                {statusMessage}
              </span>
            </div>
          )}

          {/* Continue Button */}
          <div className="flex justify-end">
            <button
              onClick={handleContinueClick}
              disabled={!canContinue || disabled || isLoading}
              className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold transition-all ${
                !canContinue || disabled || isLoading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
              }`}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>{loadingText}</span>
                </>
              ) : (
                <>
                  <span>{continueButtonText}</span>
                  <ArrowRight className="w-4 h-4" />
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
                onClick={handleBackClick}
                className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg transition-colors hover:bg-gray-100"
                title={backButtonText}
              >
                <div className="w-6 h-6 rounded-full flex items-center justify-center bg-gray-100">
                  <ArrowLeft className="w-3.5 h-3.5 text-gray-600" />
                </div>
                <span className="text-xs font-medium text-gray-600">
                  {backButtonText.split(' ')[0]} {/* Show only first word on mobile */}
                </span>
              </button>

              {/* Status Indicator */}
              {showStatus && (
                <div className="flex flex-col items-center gap-0.5">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${statusConfig.bgColor}`}>
                    <StatusIcon className={`w-3.5 h-3.5 ${statusConfig.iconColor}`} />
                  </div>
                  <span className={`text-xs font-medium ${statusConfig.textColor}`}>
                    {statusMessage.split(' ')[0]} {/* Show only first word on mobile */}
                  </span>
                </div>
              )}

              {/* Continue Button */}
              <button
                onClick={handleContinueClick}
                disabled={!canContinue || disabled || isLoading}
                className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg transition-colors ${
                  !canContinue || disabled || isLoading
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-blue-50'
                }`}
                title={continueButtonText}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  !canContinue || disabled || isLoading
                    ? 'bg-gray-300'
                    : 'bg-blue-600 shadow-md'
                }`}>
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
                  ) : (
                    <ArrowRight className={`w-3.5 h-3.5 ${
                      !canContinue || disabled || isLoading ? 'text-gray-500' : 'text-white'
                    }`} />
                  )}
                </div>
                <span className={`text-xs font-medium ${
                  !canContinue || disabled || isLoading ? 'text-gray-500' : 'text-blue-600'
                }`}>
                  {continueButtonText.split(' ').pop()} {/* Show only last word on mobile */}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SurveyPageFooter;

