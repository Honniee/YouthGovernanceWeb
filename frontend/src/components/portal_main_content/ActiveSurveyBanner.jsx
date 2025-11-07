import React from 'react';
import { 
  ClipboardList, 
  Users, 
  Pin, 
  BarChart3,
  Plus,
  AlertCircle,
  Clock,
  Eye
} from 'lucide-react';

/**
 * Reusable Active Survey Banner Component
 * Displays comprehensive information about active survey batches
 * 
 * @param {Object} props
 * @param {Object} props.activeSurvey - Active survey data object
 * @param {boolean} props.hasActiveSurvey - Whether there's an active survey
 * @param {boolean} props.isLoading - Loading state
 * @param {Function} props.onNavigateToActive - Callback to navigate to active surveys tab
 * @param {Function} props.onCreateSurvey - Callback to create new survey
 * @param {Function} props.onViewSurvey - Callback to view survey details
 * @param {string} props.variant - Banner variant ('management' | 'report' | 'surveys')
 */
const ActiveSurveyBanner = ({ 
  activeSurvey, 
  hasActiveSurvey, 
  isLoading = false,
  onNavigateToActive,
  onCreateSurvey,
  onViewSurvey,
  variant = 'management'
}) => {
  // Helper function to get days remaining for active survey
  const getActiveSurveyDaysRemaining = (endDate) => {
    if (!endDate) return null;
    const end = new Date(endDate).getTime();
    const today = new Date().setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading survey information...</span>
        </div>
      </div>
    );
  }

  // Show active survey banner
  if (hasActiveSurvey && activeSurvey) {
    const daysRemaining = getActiveSurveyDaysRemaining(activeSurvey.endDate || activeSurvey.end_date);
    const totalResponses = activeSurvey.statisticsTotalResponses || activeSurvey.statistics_total_responses || 0;
    const totalYouths = activeSurvey.statisticsTotalYouths || activeSurvey.statistics_total_youths || 0;

    return (
      <div className="relative bg-blue-50 border border-blue-200 rounded-lg shadow-sm">
        {/* Pin Icon - Decorative "pinned" effect */}
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow-lg transform rotate-12">
          <Pin className="w-3 h-3 text-white" />
        </div>

        {/* Desktop Layout */}
        <div className="hidden md:block px-5 py-4">
          <div className="flex items-center justify-between">
            {/* Left: Survey Info */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-gray-900 font-medium text-base">{activeSurvey.batchName || activeSurvey.batch_name}</h3>
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                    Active
                  </span>
                  <span className="inline-flex items-center px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                    {activeSurvey.batchId || activeSurvey.batch_id}
                  </span>
                </div>
                <div className="flex items-center space-x-3 mt-1">
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-gray-500" />
                    <p className="text-gray-500 text-sm">
                      {new Date(activeSurvey.startDate || activeSurvey.start_date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                      })} - {new Date(activeSurvey.endDate || activeSurvey.end_date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                      })}
                      {daysRemaining !== null && (
                        <span className="ml-2">
                          {daysRemaining > 0 ? `• Ends in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}` : 
                           daysRemaining === 0 ? '• Ends today' : 
                           `• Ended ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) !== 1 ? 's' : ''} ago`}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="w-px h-4 bg-gray-300"></div>
                  <div className="flex items-center space-x-1">
                    <Users className="w-3 h-3 text-gray-500" />
                    <p className="text-gray-500 text-sm">
                      {totalResponses}/{totalYouths} Responses
                      <span className="ml-1 text-xs text-gray-400">
                        ({totalYouths - totalResponses} pending)
                      </span>
                    </p>
                  </div>
                  {/* Removed response rate and target display */}
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center space-x-3">
              {onViewSurvey && (
                <button
                  onClick={() => onViewSurvey(activeSurvey)}
                  className="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Survey Report
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <ClipboardList className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className="text-gray-900 font-medium text-sm">{activeSurvey.batchName || activeSurvey.batch_name}</h3>
                  <span className="inline-flex items-center px-1 py-0.5 sm:px-1.5 sm:py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                    {activeSurvey.batchId || activeSurvey.batch_id}
                  </span>
                </div>
                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                  Active
                </span>
              </div>
            </div>
            <div className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center shadow-lg transform rotate-12">
              <Pin className="w-2.5 h-2.5 text-white" />
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center space-x-1">
              <Clock className="w-3 h-3 text-gray-500" />
              <p className="text-gray-500 text-xs">
                {new Date(activeSurvey.startDate || activeSurvey.start_date).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric',
                  year: 'numeric'
                })} - {new Date(activeSurvey.endDate || activeSurvey.end_date).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric',
                  year: 'numeric'
                })}
              </p>
            </div>
            
            {daysRemaining !== null && (
              <div className="flex items-center space-x-1">
                <AlertCircle className="w-3 h-3 text-gray-500" />
                <p className="text-gray-500 text-xs">
                  {daysRemaining > 0 
                    ? `Ends in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`
                    : daysRemaining === 0 
                      ? 'Ends today'
                      : `Ended ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) !== 1 ? 's' : ''} ago`
                  }
                </p>
              </div>
            )}
            
              <div className="flex items-center justify-between pt-2">
              <div className="flex items-center space-x-3">
                <div className="text-center">
                  <div className="text-sm font-bold text-gray-900">{totalResponses.toLocaleString()}</div>
                  <div className="text-xs text-gray-500">Responses</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {onViewSurvey && (
                  <button
                    onClick={onViewSurvey}
                    className="inline-flex items-center px-2 py-1 border border-blue-300 text-blue-700 text-xs font-medium rounded hover:bg-blue-50 transition-colors"
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    Survey Report
                  </button>
                )}
                <button
                  onClick={onNavigateToActive}
                  className="inline-flex items-center px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
                >
                  <BarChart3 className="w-3 h-3 mr-1" />
                  Active
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show no active survey banner (styled like No Active SK Term)
  return (
    <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-lg shadow-sm">
      {/* Desktop Layout */}
      <div className="hidden md:block px-6 py-5">
        <div className="flex items-center justify-between">
          {/* Left: Content */}
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <ClipboardList className="w-6 h-6 text-amber-700" />
            </div>
            <div>
              <h3 className="text-amber-900 font-semibold text-lg mb-1">No Active Survey</h3>
              <p className="text-amber-800 text-sm mb-2">
                {variant === 'management' 
                  ? 'Create a new survey batch to start collecting youth data.'
                  : 'Currently there is no active survey running.'}
              </p>
              <div className="flex items-center space-x-4 text-xs text-amber-700">
                <div className="flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>Ready to launch</span>
                </div>
                <div className="w-px h-3 bg-amber-300"></div>
                <div className="flex items-center space-x-1">
                  <Users className="w-3 h-3" />
                  <span>Participants can be collected</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center space-x-3">
            {onCreateSurvey && (
              <button
                onClick={onCreateSurvey}
                className="inline-flex items-center px-4 py-2 bg-amber-700 text-white text-sm font-medium rounded-lg hover:bg-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Survey
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden px-4 py-4">
        <div className="flex items-start space-x-3">
          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <ClipboardList className="w-5 h-5 text-amber-700" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-amber-900 font-semibold text-base mb-1">No Active Survey</h3>
            <p className="text-amber-800 text-sm mb-3">
              {variant === 'management' 
                ? 'Create a new survey batch to start collecting youth data.'
                : 'Currently there is no active survey running.'}
            </p>
            <div className="flex flex-col space-y-2">
              {onCreateSurvey && (
                <button
                  onClick={onCreateSurvey}
                  className="inline-flex items-center justify-center px-3 py-2 bg-amber-700 text-white text-sm font-medium rounded-lg hover:bg-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Survey
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActiveSurveyBanner;
