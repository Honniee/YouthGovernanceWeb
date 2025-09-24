import React from 'react';
import { 
  Calendar, 
  Users, 
  Building, 
  Pin, 
  BarChart3,
  Plus,
  AlertCircle,
  Clock
} from 'lucide-react';
import { extractTermStats } from '../../utils/termStats';

/**
 * Reusable Active Term Banner Component
 * Displays comprehensive information about the active SK term
 * 
 * @param {Object} props
 * @param {Object} props.activeTerm - Active term data object
 * @param {boolean} props.hasActiveTerm - Whether there's an active term
 * @param {boolean} props.isLoading - Loading state
 * @param {Function} props.onNavigateToTerms - Callback to navigate to terms page
 * @param {Function} props.onNavigateToReport - Callback to navigate to term report
 * @param {Function} props.onCreateTerm - Callback to create new term
 * @param {string} props.variant - Banner variant ('management' | 'report' | 'terms')
 */
const ActiveTermBanner = ({ 
  activeTerm, 
  hasActiveTerm, 
  isLoading = false,
  onNavigateToTerms,
  onNavigateToReport,
  onCreateTerm,
  variant = 'management'
}) => {
  // Helper function to get days remaining for active term
  const getActiveTermDaysRemaining = (endDate) => {
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
          <span className="ml-3 text-gray-600">Loading term information...</span>
        </div>
      </div>
    );
  }

  // Show active term banner
  if (hasActiveTerm && activeTerm) {
    const daysRemaining = getActiveTermDaysRemaining(activeTerm.endDate);
    const normalized = extractTermStats(activeTerm);
    const completionPercent = normalized?.percent || 0;
    const filledPositions = normalized?.filled || 0;
    const totalPositions = normalized?.total || 0;
    const barangaysCount = normalized?.barangays || 0;

    return (
      <div className="relative bg-blue-50 border border-blue-200 rounded-lg shadow-sm">
        {/* Pin Icon - Decorative "pinned" effect */}
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow-lg transform rotate-12">
          <Pin className="w-3 h-3 text-white" />
        </div>

        {/* Desktop Layout */}
        <div className="hidden md:block px-5 py-4">
          <div className="flex items-center justify-between">
            {/* Left: Term Info */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-gray-900 font-medium text-base">{activeTerm.termName}</h3>
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                    Active
                  </span>
                </div>
                <div className="flex items-center space-x-3 mt-1">
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-3 h-3 text-gray-500" />
                    <p className="text-gray-500 text-sm">
                      {new Date(activeTerm.startDate).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                      })} - {new Date(activeTerm.endDate).toLocaleDateString('en-US', { 
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
                      {filledPositions}/{totalPositions} Positions
                      <span className="ml-1 text-xs text-gray-400">
                        ({totalPositions - filledPositions} vacant)
                      </span>
                    </p>
                  </div>
                  <div className="w-px h-4 bg-gray-300"></div>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-500 text-xs font-medium">Term Progress</span>
                    <span className="text-blue-600 text-sm font-semibold">{completionPercent}%</span>
                    <div className="w-16 bg-gray-200 rounded-full h-1.5">
                      <div 
                        className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${completionPercent}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="w-px h-4 bg-gray-300"></div>
                  <div className="flex items-center space-x-1">
                    <Building className="w-3 h-3 text-gray-500" />
                    <p className="text-gray-500 text-sm">{barangaysCount} Barangays</p>
                  </div>
                  <div className="w-px h-4 bg-gray-300"></div>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-500 text-xs">Positions:</span>
                    <span className="text-xs text-blue-600 font-medium">{normalized?.byPosition?.chairpersons || 0} Chair</span>
                    <span className="text-xs text-green-600 font-medium">{normalized?.byPosition?.secretaries || 0} Sec</span>
                    <span className="text-xs text-purple-600 font-medium">{normalized?.byPosition?.treasurers || 0} Treas</span>
                    <span className="text-xs text-orange-600 font-medium">{normalized?.byPosition?.councilors || 0} Council</span>
                  </div>
                </div>
              </div>
            </div>

                         {/* Right: Actions */}
             <div className="flex items-center space-x-3">
               {variant === 'management' && onNavigateToReport && (
                 <button
                   onClick={onNavigateToReport}
                   className="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                 >
                   <BarChart3 className="w-4 h-4 mr-2" />
                   Term Report
                 </button>
               )}
               {variant === 'terms' && onNavigateToReport && (
                 <button
                   onClick={onNavigateToReport}
                   className="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                 >
                   <BarChart3 className="w-4 h-4 mr-2" />
                   Term Report
                 </button>
               )}
             </div>
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden px-4 py-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="text-gray-900 font-medium text-sm truncate">{activeTerm.termName}</h3>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full flex-shrink-0">
                  Active
                </span>
              </div>
              
              <div className="flex items-center space-x-3 text-xs text-gray-500 mb-2">
                <div className="flex items-center space-x-1">
                  <Calendar className="w-3 h-3" />
                  <span className="truncate">
                    {new Date(activeTerm.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {" "}-{" "}
                    {new Date(activeTerm.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <div className="w-px h-3 bg-gray-300"></div>
                <div className="flex items-center space-x-1">
                  <Users className="w-3 h-3" />
                  <span>{filledPositions}/{totalPositions}</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 text-xs text-gray-500 mb-2">
                <span>{barangaysCount} Barangays</span>
                <div className="w-px h-3 bg-gray-300"></div>
                <span>
                  {daysRemaining !== null ? (
                    daysRemaining > 0 ? `Ends in ${daysRemaining}d` : 
                    daysRemaining === 0 ? 'Ends today' : 
                    `Ended ${Math.abs(daysRemaining)}d ago`
                  ) : ''}
                </span>
              </div>
              
              <div className="flex items-center space-x-1 text-xs text-gray-500 mb-2">
                <span className="text-blue-600 font-medium">{normalized?.byPosition?.chairpersons || 0} Chair</span>
                <span className="text-gray-400">•</span>
                <span className="text-green-600 font-medium">{normalized?.byPosition?.secretaries || 0} Sec</span>
                <span className="text-gray-400">•</span>
                <span className="text-purple-600 font-medium">{normalized?.byPosition?.treasurers || 0} Treas</span>
                <span className="text-gray-400">•</span>
                <span className="text-orange-600 font-medium">{normalized?.byPosition?.councilors || 0} Council</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500">Progress</span>
                <span className="text-xs font-semibold text-blue-600">{completionPercent}%</span>
                <div className="flex-1 bg-gray-200 rounded-full h-1.5 max-w-20">
                  <div 
                    className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${completionPercent}%` }}
                  ></div>
                </div>
              </div>
            </div>
            
                         {variant === 'management' && onNavigateToReport && (
               <button
                 onClick={onNavigateToReport}
                 className="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex-shrink-0"
               >
                 <BarChart3 className="w-3 h-3 mr-1" />
                 Report
               </button>
             )}
             {variant === 'terms' && onNavigateToReport && (
               <button
                 onClick={onNavigateToReport}
                 className="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex-shrink-0"
               >
                 <BarChart3 className="w-3 h-3 mr-1" />
                 Report
               </button>
             )}
          </div>
        </div>
      </div>
    );
  }

  // Show no active term banner
  return (
    <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-lg shadow-sm">
      {/* Desktop Layout */}
      <div className="hidden md:block px-6 py-5">
        <div className="flex items-center justify-between">
          {/* Left: Content */}
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-amber-700" />
            </div>
            <div>
              <h3 className="text-amber-900 font-semibold text-lg mb-1">No Active SK Term</h3>
              <p className="text-amber-800 text-sm mb-2">
                Currently there is no active electoral term. Create a new term or activate a term to start managing SK officials.
              </p>
              <div className="flex items-center space-x-4 text-xs text-amber-700">
                <div className="flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>Ready for new term</span>
                </div>
                <div className="w-px h-3 bg-amber-300"></div>
                <div className="flex items-center space-x-1">
                  <Users className="w-3 h-3" />
                  <span>Officials can be assigned</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center space-x-3">
            {onCreateTerm && (
              <button
                onClick={onCreateTerm}
                className="inline-flex items-center px-4 py-2 bg-amber-700 text-white text-sm font-medium rounded-lg hover:bg-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New Term
              </button>
            )}
            {onNavigateToTerms && (
              <button
                onClick={onNavigateToTerms}
                className="inline-flex items-center px-4 py-2 bg-white text-amber-700 text-sm font-medium rounded-lg border border-amber-300 hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-colors"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Go to SK Terms
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden px-4 py-4">
        <div className="flex items-start space-x-3">
          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Calendar className="w-5 h-5 text-amber-700" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-amber-900 font-semibold text-base mb-1">No Active SK Term</h3>
            <p className="text-amber-800 text-sm mb-3">
              Currently there is no active electoral term. Create a new term or activate a term to start managing SK officials.
            </p>
            <div className="flex flex-col space-y-2">
              {onCreateTerm && (
                <button
                  onClick={onCreateTerm}
                  className="inline-flex items-center justify-center px-3 py-2 bg-amber-700 text-white text-sm font-medium rounded-lg hover:bg-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Term
                </button>
              )}
              {onNavigateToTerms && (
                <button
                  onClick={onNavigateToTerms}
                  className="inline-flex items-center justify-center px-4 py-2 bg-white text-amber-700 text-sm font-medium rounded-lg border border-amber-300 hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-colors"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Go to SK Terms
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActiveTermBanner;
