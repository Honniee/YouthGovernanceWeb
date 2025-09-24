import React from 'react';
import { CheckCircle, Circle, Clock } from 'lucide-react';

const SurveyProgressTracker = ({ currentStep, totalSteps, stepNames }) => {
  const getStepIcon = (stepIndex) => {
    if (stepIndex < currentStep) {
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    } else if (stepIndex === currentStep) {
      return <Clock className="w-5 h-5 text-blue-600" />;
    } else {
      return <Circle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStepStatus = (stepIndex) => {
    if (stepIndex < currentStep) {
      return 'completed';
    } else if (stepIndex === currentStep) {
      return 'current';
    } else {
      return 'upcoming';
    }
  };

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">Survey Progress</h3>
        <span className="text-xs text-gray-500">Step {currentStep} of {totalSteps}</span>
      </div>
      
      <div className="space-y-3">
        {stepNames.map((stepName, index) => {
          const status = getStepStatus(index);
          const isCompleted = status === 'completed';
          const isCurrent = status === 'current';
          
          return (
            <div key={index} className="flex items-center gap-3">
              {getStepIcon(index)}
              <span className={`text-sm ${
                isCompleted ? 'text-green-700 font-medium' :
                isCurrent ? 'text-blue-700 font-semibold' :
                'text-gray-500'
              }`}>
                {stepName}
              </span>
              {isCompleted && (
                <span className="text-xs text-green-600 font-medium">✓ Done</span>
              )}
              {isCurrent && (
                <span className="text-xs text-blue-600 font-medium">Current</span>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Progress Bar */}
      <div className="mt-4">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Progress</span>
          <span>{Math.round((currentStep / totalSteps) * 100)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-[#24345A] to-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default SurveyProgressTracker;
