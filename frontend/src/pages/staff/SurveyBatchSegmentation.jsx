import React, { useState, useEffect } from 'react';
import { 
  Users, 
  TrendingUp, 
  Target, 
  AlertCircle,
  RefreshCw,
  Eye,
  Download,
  Loader,
  CheckCircle,
  Clock,
  XCircle,
  Lightbulb
} from 'lucide-react';
import clusteringService from '../../services/clusteringService';
import skService from '../../services/skService';
import { showSuccessToast, showErrorToast } from '../../components/universal';
import logger from '../../utils/logger.js';

/**
 * Survey Batch Segmentation Component
 * Shows K-Means clustering results for a specific survey batch
 * 
 * @param {Object} props
 * @param {string} props.batchId - The survey batch ID
 * @param {string} props.batchName - The survey batch name
 */
const SurveyBatchSegmentation = ({ batchId, batchName }) => {
  const [segments, setSegments] = useState([]);
  const [stats, setStats] = useState(null);
  const [runs, setRuns] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [selectedBarangay, setSelectedBarangay] = useState('all');
  const [scope, setScope] = useState('municipality');
  const [loading, setLoading] = useState(true);
  const [runningClustering, setRunningClustering] = useState(false);
  const [error, setError] = useState(null);
  const [selectedSegment, setSelectedSegment] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);

  // Load barangays on mount
  useEffect(() => {
    const loadBarangays = async () => {
      try {
        const barangayList = skService.getAllBarangays();
        setBarangays(barangayList);
      } catch (err) {
        logger.error('Error loading barangays', err);
      }
    };
    loadBarangays();
  }, []);

  // Fetch segmentation data when filters change
  useEffect(() => {
    if (batchId) {
      fetchSegmentationData();
    }
  }, [batchId, scope, selectedBarangay]);

  // Fetch recommendations when segment is selected
  useEffect(() => {
    if (selectedSegment) {
      fetchRecommendations(selectedSegment.segment_id);
    }
  }, [selectedSegment]);

  const fetchSegmentationData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch segments, stats, and runs for this batch
      const filters = {
        scope: scope,
        barangayId: (scope === 'barangay' && selectedBarangay !== 'all') ? selectedBarangay : null,
        batchId: batchId
      };

      const [segmentsResponse, statsResponse, runsResponse] = await Promise.all([
        clusteringService.getSegments(filters),
        clusteringService.getClusteringStats(filters),
        clusteringService.getClusteringRuns({ ...filters, limit: 5 })
      ]);

      // Extract data from responses (API returns { success: true, data: [...] })
      const segmentsData = segmentsResponse.data || segmentsResponse || [];
      const statsData = statsResponse.data || statsResponse || null;
      const runsData = runsResponse.data || runsResponse || [];

      logger.debug('Fetched segmentation data', {
        segments: segmentsData.length,
        stats: statsData,
        runs: runsData.length,
        scope: scope,
        barangayId: filters.barangayId
      });

      setSegments(Array.isArray(segmentsData) ? segmentsData : []);
      setStats(statsData);
      setRuns(Array.isArray(runsData) ? runsData : []);
    } catch (err) {
      logger.error('Error fetching segmentation data', err, { batchId });
      setError(err.message || 'Failed to load segmentation data');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecommendations = async (segmentId) => {
    setLoadingRecommendations(true);
    try {
      const response = await clusteringService.getRecommendations({ segmentId });
      logger.debug('Full API response', { hasData: !!response, hasRecommendations: !!response?.data });
      
      // Handle nested response structure
      let recommendationsData = response.data || response || [];
      
      // If data is an object with 'all' property, use that
      if (recommendationsData && typeof recommendationsData === 'object' && !Array.isArray(recommendationsData)) {
        recommendationsData = recommendationsData.all || [];
      }
      
      logger.debug('Extracted recommendations', { count: recommendationsData?.length || 0 });
      setRecommendations(Array.isArray(recommendationsData) ? recommendationsData : []);
    } catch (err) {
      logger.error('Error fetching recommendations', err, { batchId, segmentId: selectedSegment });
      setRecommendations([]);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  // Handle scope change
  const handleScopeChange = (newScope) => {
    setScope(newScope);
    if (newScope === 'municipality') {
      setSelectedBarangay('all');
    }
  };

  // Run clustering for this batch
  const handleRunClustering = async () => {
    const scopeText = scope === 'barangay' ? `barangay ${barangays.find(b => b.id === selectedBarangay)?.name || ''}` : 'municipality-wide';
    if (!confirm(`Run clustering for "${batchName}" (${scopeText})?\n\nThis will create youth segments based on validated responses in this batch.\n\nEstimated time: 10-30 seconds`)) {
      return;
    }

    setRunningClustering(true);
    setError(null);
    try {
      const response = await clusteringService.runClustering({
        scope: scope,
        barangayId: (scope === 'barangay' && selectedBarangay !== 'all') ? selectedBarangay : null,
        batchId: batchId
      });

      // Response structure: { success: true, message: "...", data: { runId, segments, metrics } }
      const result = response.data || response;
      const metrics = result.metrics || {};
      const segments = result.segments || [];

      showSuccessToast(
        'Clustering Completed',
        `${segments.length} segments created for ${metrics.totalYouth || 0} youth`
      );

      // Refresh data
      await fetchSegmentationData();
    } catch (err) {
      logger.error('Error running clustering', err, { batchId, scope, selectedBarangay });
      const errorMessage = err.message || 'Failed to run clustering';
      setError(errorMessage);
      showErrorToast('Clustering Failed', errorMessage);
    } finally {
      setRunningClustering(false);
    }
  };

  // Get priority badge color
  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get quality interpretation
  const getQualityInterpretation = (score) => {
    if (score >= 0.7) return { text: 'Excellent', color: 'text-green-600' };
    if (score >= 0.5) return { text: 'Good', color: 'text-blue-600' };
    if (score >= 0.3) return { text: 'Fair', color: 'text-yellow-600' };
    return { text: 'Poor', color: 'text-red-600' };
  };

  // Get run status color
  const getRunStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'running': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'failed': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Modal header styling similar to Analytics modal
  const getModalMeta = (segment) => {
    const priority = (segment?.priority_level || '').toLowerCase();
    if (priority === 'high') {
      return { grad: 'from-red-50 to-rose-50', iconBg: 'bg-red-100', iconColor: 'text-red-600' };
    }
    if (priority === 'medium') {
      return { grad: 'from-yellow-50 to-amber-50', iconBg: 'bg-yellow-100', iconColor: 'text-yellow-600' };
    }
    if (priority === 'low') {
      return { grad: 'from-green-50 to-emerald-50', iconBg: 'bg-green-100', iconColor: 'text-green-600' };
    }
    return { grad: 'from-gray-50 to-slate-50', iconBg: 'bg-gray-100', iconColor: 'text-gray-600' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Target className="w-5 h-5 text-blue-600 animate-pulse" />
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-3 font-medium">Loading segmentation data...</p>
          <p className="text-xs text-gray-500 mt-1">Fetching segments and metrics</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <div>
              <span className="text-red-600 font-semibold">Error: </span>
              <span className="text-red-700">{error}</span>
            </div>
          </div>
        </div>
      )}

      {/* Action Bar with Filters */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Card Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Youth Segmentation</h3>
              <p className="text-xs text-gray-600">K-Means analysis for {batchName}</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Scope Selector */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Scope:</label>
              <div className="flex gap-1">
                <button
                  onClick={() => handleScopeChange('municipality')}
                  className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                    scope === 'municipality'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Municipality
                </button>
                <button
                  onClick={() => handleScopeChange('barangay')}
                  className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                    scope === 'barangay'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Barangay
                </button>
              </div>
            </div>

            {/* Barangay Dropdown (only show when scope is 'barangay') */}
            {scope === 'barangay' && (
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Barangay:</label>
                <select
                  value={selectedBarangay}
                  onChange={(e) => setSelectedBarangay(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent min-w-[180px]"
                >
                  <option value="all">Select Barangay</option>
                  {barangays.map(barangay => (
                    <option key={barangay.id} value={barangay.id}>
                      {barangay.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Current View Indicator */}
            <div className="text-sm text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200">
              {scope === 'municipality' 
                ? 'Viewing: Municipality-Wide'
                : `Viewing: ${barangays.find(b => b.id === selectedBarangay)?.name || 'Select a barangay'}`}
            </div>
          </div>

          {/* Run Clustering Button */}
          <button
            onClick={handleRunClustering}
            disabled={runningClustering || (scope === 'barangay' && selectedBarangay === 'all')}
            className={`inline-flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
              runningClustering || (scope === 'barangay' && selectedBarangay === 'all')
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {runningClustering ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Run Clustering
              </>
            )}
          </button>
        </div>
      </div>

      {/* Statistics Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600">Youth Analyzed</div>
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {stats.summary?.totalYouth || stats.totalYouth || 0}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              From this batch
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600">Active Segments</div>
              <Target className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {stats.summary?.totalSegments || stats.activeSegments || 0}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Youth groups created
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600">Quality Score</div>
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            {(stats.latestRun?.overall_silhouette_score || stats.lastRun?.overall_silhouette_score) ? (
              <>
                <div className="text-2xl font-bold text-gray-900">
                  {((stats.latestRun?.overall_silhouette_score || stats.lastRun?.overall_silhouette_score) * 100).toFixed(1)}%
                </div>
                <div className={`text-xs mt-1 ${getQualityInterpretation(stats.latestRun?.overall_silhouette_score || stats.lastRun?.overall_silhouette_score).color}`}>
                  {getQualityInterpretation(stats.latestRun?.overall_silhouette_score || stats.lastRun?.overall_silhouette_score).text}
                </div>
              </>
            ) : (
              <div className="text-lg text-gray-400">Not available</div>
            )}
          </div>
        </div>
      )}

      {/* Segments Grid */}
      {segments.length > 0 ? (
        <div>
          <h4 className="text-md font-semibold text-gray-900 mb-4">
            Youth Segments ({segments.length})
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {segments.map(segment => (
              <div
                key={segment.segment_id}
                className="bg-white rounded-xl border border-gray-200 hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
                onClick={() => setSelectedSegment(segment)}
              >
                {/* Header */}
                <div className="px-5 py-3 bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-gray-100 flex items-start justify-between">
                  <h5 className="text-sm font-semibold text-gray-900 flex-1 pr-2 truncate">{segment.segment_name}</h5>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getPriorityColor(segment.priority_level)}`}>{segment.priority_level?.toUpperCase()}</span>
                </div>

                {/* Stats */}
                <div className="p-5 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Youth Count:</span>
                    <span className="font-semibold text-gray-900">{segment.youth_count}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Percentage:</span>
                    <span className="font-semibold text-gray-900">{Number(segment.percentage || 0).toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Avg Age:</span>
                    <span className="font-semibold text-gray-900">{Number(segment.avg_age || 0).toFixed(1)} yrs</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Employment:</span>
                    <span className={`font-semibold ${
                      (Number(segment.employment_rate || 0) * 100) < 30 ? 'text-red-600' :
                      (Number(segment.employment_rate || 0) * 100) < 60 ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {(Number(segment.employment_rate || 0) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Education:</span>
                    <span className="font-semibold text-gray-900">
                      {segment.avg_education_level ? 
                        (Number(segment.avg_education_level) < 4 ? 'Elementary' :
                         Number(segment.avg_education_level) < 5 ? 'High School' :
                         Number(segment.avg_education_level) < 7 ? 'College' : 'Graduate') 
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Civic Engagement:</span>
                    <span className={`font-semibold ${
                      (Number(segment.civic_engagement_rate || 0) * 100) >= 60 ? 'text-green-600' :
                      (Number(segment.civic_engagement_rate || 0) * 100) >= 40 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {(Number(segment.civic_engagement_rate || 0) * 100).toFixed(0)}%
                    </span>
                  </div>
                  {/* Description */}
                  <p className="text-xs text-gray-600 line-clamp-2">
                    {segment.segment_description}
                  </p>
                </div>

                {/* Footer */}
                <div className="px-5 pb-5">
                  <button className="w-full py-2 text-xs font-medium text-green-600 hover:text-green-700 border border-green-600 rounded-lg hover:bg-green-50 transition-colors">
                    View Details →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Target className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Segments Available
          </h3>
          <p className="text-gray-600 mb-4 max-w-md mx-auto">
            Run clustering analysis to generate youth segments from validated responses in this batch.
          </p>
          <button
            onClick={handleRunClustering}
            disabled={runningClustering}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
          >
            {runningClustering ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Run Clustering Now
              </>
            )}
          </button>
        </div>
      )}

      {/* Clustering Run History */}
      {runs.length > 0 && (
        <div>
          <h4 className="text-md font-semibold text-gray-900 mb-4">
            Recent Clustering Runs
          </h4>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Youth
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Segments
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Quality
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {runs.map(run => (
                  <tr key={run.run_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {new Date(run.started_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {run.total_responses}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {run.segments_created}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {run.overall_silhouette_score ? (
                        <span className={getQualityInterpretation(run.overall_silhouette_score).color}>
                          {(run.overall_silhouette_score * 100).toFixed(1)}%
                        </span>
                      ) : 'N/A'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getRunStatusColor(run.run_status)}`}>
                        {run.run_status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
                        {run.run_status === 'running' && <Clock className="w-3 h-3 mr-1" />}
                        {run.run_status === 'failed' && <XCircle className="w-3 h-3 mr-1" />}
                        {run.run_status?.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Segment Detail Modal */}
      {selectedSegment && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60"
          onClick={() => setSelectedSegment(null)}
        >
          <div 
            className="bg-white rounded-xl shadow-xl w-full max-w-3xl border border-gray-200 overflow-hidden max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => { const meta = getModalMeta(selectedSegment); return (
              <div className={`px-5 py-4 border-b border-gray-100 bg-gradient-to-r ${meta.grad}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-lg ${meta.iconBg} flex items-center justify-center`}>
                      <Target className={`w-4 h-4 ${meta.iconColor}`} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">{selectedSegment.segment_name}</h3>
                      <span className={`inline-flex items-center mt-1 px-2 py-0.5 rounded text-[11px] font-medium border ${getPriorityColor(selectedSegment.priority_level)}`}>
                        {selectedSegment.priority_level?.toUpperCase()} PRIORITY
                      </span>
                    </div>
                  </div>
                  <button aria-label="Close" className="p-2 rounded-lg text-gray-600 hover:bg-gray-100" onClick={()=>setSelectedSegment(null)}>
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ); })()}

            <div className="p-5">
              <p className="text-gray-600 mb-6">{selectedSegment.segment_description}</p>
            
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Youth Count</div>
                <div className="text-2xl font-bold text-gray-900">{selectedSegment.youth_count}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Percentage</div>
                <div className="text-2xl font-bold text-gray-900">{Number(selectedSegment.percentage || 0).toFixed(0)}%</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Average Age</div>
                <div className="text-2xl font-bold text-gray-900">{Number(selectedSegment.avg_age || 0).toFixed(1)} yrs</div>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
                <div className="text-sm text-blue-700 mb-1">Employment Rate</div>
                <div className={`text-2xl font-bold ${
                  (Number(selectedSegment.employment_rate || 0) * 100) < 30 ? 'text-red-600' :
                  (Number(selectedSegment.employment_rate || 0) * 100) < 60 ? 'text-yellow-600' :
                  'text-green-600'
                }`}>
                  {(Number(selectedSegment.employment_rate || 0) * 100).toFixed(0)}%
                </div>
                <div className="text-xs text-blue-600 mt-1">
                  {(Number(selectedSegment.employment_rate || 0) * 100) < 30 ? 'Need job programs' :
                   (Number(selectedSegment.employment_rate || 0) * 100) < 60 ? 'Moderate employment' :
                   'High employment'}
                </div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
                <div className="text-sm text-purple-700 mb-1">Civic Engagement</div>
                <div className={`text-2xl font-bold ${
                  (Number(selectedSegment.civic_engagement_rate || 0) * 100) >= 60 ? 'text-green-600' :
                  (Number(selectedSegment.civic_engagement_rate || 0) * 100) >= 40 ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {(Number(selectedSegment.civic_engagement_rate || 0) * 100).toFixed(0)}%
                </div>
                <div className="text-xs text-purple-600 mt-1">
                  {(Number(selectedSegment.civic_engagement_rate || 0) * 100) >= 60 ? 'Highly engaged' :
                   (Number(selectedSegment.civic_engagement_rate || 0) * 100) >= 40 ? 'Moderately engaged' :
                   'Low engagement'}
                </div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
                <div className="text-sm text-green-700 mb-1">Education Level</div>
                <div className="text-lg font-bold text-gray-900">
                  {selectedSegment.avg_education_level ? 
                    (Number(selectedSegment.avg_education_level) < 4 ? 'Elementary' :
                     Number(selectedSegment.avg_education_level) < 5 ? 'High School' :
                     Number(selectedSegment.avg_education_level) < 7 ? 'College' : 'Graduate') 
                    : 'N/A'}
                </div>
                <div className="text-xs text-green-600 mt-1">
                  Avg: {Number(selectedSegment.avg_education_level || 0).toFixed(1)}
                </div>
              </div>
            </div>

            {/* Characteristics Breakdown (if available) */}
            {selectedSegment.characteristics && (
              <div className="border-t border-gray-200 pt-4 mb-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Segment Characteristics</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(() => {
                    try {
                      const chars = typeof selectedSegment.characteristics === 'string' 
                        ? JSON.parse(selectedSegment.characteristics) 
                        : selectedSegment.characteristics;
                      
                      return (
                        <>
                          {chars.employment && (
                            <div className="bg-blue-50 rounded p-3 text-sm">
                              <div className="font-semibold text-blue-900 mb-1">Employment</div>
                              <div className="text-blue-700">
                                Dominant: {chars.employment.dominantStatus || 'N/A'}
                              </div>
                            </div>
                          )}
                          {chars.education && (
                            <div className="bg-green-50 rounded p-3 text-sm">
                              <div className="font-semibold text-green-900 mb-1">Education</div>
                              <div className="text-green-700">
                                Dominant: {chars.education.dominantLevel || 'N/A'}
                              </div>
                            </div>
                          )}
                          {chars.civicEngagement && (
                            <div className="bg-purple-50 rounded p-3 text-sm">
                              <div className="font-semibold text-purple-900 mb-1">Civic Activity</div>
                              <div className="text-purple-700">
                                Registered Voters: {chars.civicEngagement.registeredSK || 0}
                              </div>
                              <div className="text-purple-700">
                                KK Attendance: {chars.civicEngagement.attendedKK || 0}
                              </div>
                            </div>
                          )}
                          {chars.demographics && (
                            <div className="bg-gray-50 rounded p-3 text-sm">
                              <div className="font-semibold text-gray-900 mb-1">Demographics</div>
                              <div className="text-gray-700">
                                Age Range: {chars.demographics.minAge || 0} - {chars.demographics.maxAge || 0} yrs
                              </div>
                            </div>
                          )}
                        </>
                      );
                    } catch (e) {
                      return null;
                    }
                  })()}
                </div>
              </div>
            )}

            {/* Recommended Actions Section */}
            <div className="mt-6 border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <Lightbulb className="w-5 h-5 mr-2 text-yellow-500" />
                Recommended Actions
              </h3>
              
              {loadingRecommendations ? (
                <div className="flex items-center justify-center py-8">
                  <Loader className="w-6 h-6 text-green-600 animate-spin" />
                  <span className="ml-2 text-gray-600">Loading recommendations...</span>
                </div>
              ) : recommendations.length > 0 ? (
                <div className="space-y-2">
                  {recommendations.map((rec, index) => (
                    <div 
                      key={rec.recommendation_id}
                      className="border-l-4 border-green-500 bg-green-50 p-3 rounded"
                    >
                      <div className="flex items-start">
                        <div className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-xs mr-3">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 text-sm mb-1">
                            {rec.program_name || rec.program_title}
                          </h4>
                          <p className="text-xs text-gray-700 mb-2">
                            {rec.description || rec.program_description}
                          </p>
                          <div className="flex items-center gap-2 text-xs">
                            <span className={`px-2 py-0.5 rounded font-medium ${
                              (rec.priority_rank === 1 || rec.priority === 'high')
                                ? 'bg-red-100 text-red-700' 
                                : (rec.priority_rank === 2 || rec.priority === 'medium')
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-green-100 text-green-700'
                            }`}>
                              {rec.priority_rank === 1 ? 'HIGH' : rec.priority_rank === 2 ? 'MEDIUM' : rec.priority?.toUpperCase() || 'LOW'}
                            </span>
                            <span className="text-gray-600">
                              Impact: {rec.expected_impact || rec.estimated_impact || 'Medium'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Lightbulb className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No recommended actions available for this segment.</p>
                </div>
              )}
            </div>

              <button
                onClick={() => {
                  setSelectedSegment(null);
                  setRecommendations([]);
                }}
                className="w-full mt-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SurveyBatchSegmentation;

