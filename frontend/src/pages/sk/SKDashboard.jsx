import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  FileText, 
  Shield, 
  Activity,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  BarChart3,
  MapPin,
  Calendar,
  Bell,
  Plus,
  Eye,
  Download,
  RefreshCw,
  UserCheck,
  Database,
  Server,
  Zap,
  TrendingDown,
  Archive,
  AlertTriangle,
  Info,
  XCircle,
  Lock,
  Unlock,
  UserPlus,
  Monitor,
  Key,
  Upload,
  Edit,
  ArrowRight,
  CheckCircle2,
  UserX
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { HeaderMainContent } from '../../components/portal_main_content';
import AdminDashboardSurveyAnalytics from '../admin/AdminDashboardSurveyAnalytics';
import surveyBatchesService from '../../services/surveyBatchesService';
import activityService from '../../services/activityService';
import skService from '../../services/skService';
import api from '../../services/api';
import { useActiveTerm } from '../../hooks/useActiveTerm';
import logger from '../../utils/logger.js';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import '../../styles/dashboard.css';
import { useRealtime } from '../../realtime/useRealtime';
import { useAuth } from '../../context/AuthContext';

const SKDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [activeTab, setActiveTab] = useState('overview');
  
  // Get SK user's barangay for filtering
  const skBarangay = user?.barangayName || user?.barangay_name || user?.barangay_id || user?.barangayId || null;
  const skBarangayId = user?.barangay_id || user?.barangayId || null;
  
  // Active SK Term hook
  const { activeTerm, hasActiveTerm, isLoading: isLoadingActiveTerm } = useActiveTerm();
  
  // SK Barangay Completion State
  const [skBarangayCompletion, setSkBarangayCompletion] = useState({
    completed: 0,
    total: 0,
    isLoading: false
  });

  // SK Position Filled Rate State
  const [skPositionFilledRate, setSkPositionFilledRate] = useState({
    filled: 0,
    total: 0,
    percentage: 0,
    isLoading: false
  });
  
  // Filter and search state (SK users only see their barangay, no filter needed)
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [filteredData, setFilteredData] = useState(null);
  
  // Enhanced analytics state with business intelligence features
  const [stats, setStats] = useState({
    // Youth Management with Analytics
    youth: { 
      total: 1247, 
      active: 1156, 
      ageWarning: 67, 
      archived: 24, 
      newThisMonth: 45,
      validationRate: 89.2,
      // Analytics metrics
      growthRate: 12.5,
      retentionRate: 94.8,
      engagementScore: 87.3,
      demographicDistribution: {
        '15-20': 45.2,
        '21-25': 35.1,
        '26-29': 15.8,
        '30+': 3.9
      }
    },
    
    // Survey System with Performance Analytics
    surveys: { 
      active: 2, 
      total: 8456, 
      pending: 127, 
      completed: 8329, 
      completionRate: 91.3,
      avgResponseTime: 2.4,
      // Advanced metrics
      responseRate: 78.5,
      qualityScore: 92.1,
      satisfactionScore: 88.7,
      trendData: [
        { month: 'Jan', responses: 1200 },
        { month: 'Feb', responses: 1350 },
        { month: 'Mar', responses: 1180 },
        { month: 'Apr', responses: 1420 },
        { month: 'May', responses: 1580 },
        { month: 'Jun', responses: 1720 }
      ]
    },
    
    // SK Governance with Performance Metrics
    sk: { 
      activeTerms: 3, 
      totalOfficials: 132, 
      activeBarangays: 33,
      termCompletionRate: 94.5,
      // Performance analytics
      efficiencyScore: 91.2,
      participationRate: 87.4,
      termPerformance: {
        excellent: 45,
        good: 38,
        average: 15,
        needsImprovement: 2
      }
    },
    
    // Staff Management with Productivity Metrics
    staff: {
      total: 12,
      active: 11,
      admin: 3,
      staff: 8,
      // Productivity metrics
      productivityScore: 88.9,
      taskCompletionRate: 94.2,
      workloadDistribution: {
        admin: 35,
        staff: 65
      }
    },
    
    // System Health with Performance Analytics
    system: { 
      announcements: 156, 
      published: 142, 
      drafts: 14, 
      uptime: '99.9%',
      apiResponseTime: 120,
      databaseHealth: 'Healthy',
      activeUsers: 24,
      failedLogins: 3,
      errorRate: 0.2,
      // Performance metrics
      performanceScore: 96.8,
      reliabilityIndex: 99.1,
      scalabilityRating: 'Excellent',
      securityScore: 94.5
    },
    
    // Voter Data with Match Analytics
    voters: {
      total: 15420,
      matched: 12890,
      unmatched: 2530,
      uploadSuccessRate: 98.7,
      // Match analytics
      matchAccuracy: 96.3,
      dataQualityScore: 91.8,
      processingEfficiency: 89.4
    },
    
    // Activity & Security with Behavioral Analytics
    activity: {
      totalActivities: 15420,
      todayActivities: 89,
      adminActions: 234,
      staffActions: 1456,
      skActions: 2890,
      youthActions: 10840,
      // Behavioral insights
      peakHours: '2:00 PM - 4:00 PM',
      mostActiveDay: 'Tuesday',
      userEngagementTrend: 'increasing',
      securityScore: 92.7
    }
  });
  
  const [recentActivity, setRecentActivity] = useState([
    { id: 1, action: 'Survey validation completed', user: 'John Doe', time: '2 minutes ago', type: 'success' },
    { id: 2, action: 'New youth registration', user: 'Maria Santos', time: '5 minutes ago', type: 'info' },
    { id: 3, action: 'SK Term activated', user: 'System', time: '15 minutes ago', type: 'success' },
    { id: 4, action: 'Survey batch closed', user: 'Admin', time: '1 hour ago', type: 'warning' },
    { id: 5, action: 'System backup completed', user: 'System', time: '2 hours ago', type: 'info' }
  ]);
  
  const [validationQueue, setValidationQueue] = useState({ 
    pending: 0, 
    completed: 0, 
    rejected: 0,
    completedToday: 0
  });
  
  const [systemAlerts, setSystemAlerts] = useState([]);
  
  // Real data state
  const [dashboardStats, setDashboardStats] = useState(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [barangayDistribution, setBarangayDistribution] = useState([]);

  // Active survey batch state
  const [activeSurveyBatch, setActiveSurveyBatch] = useState(null);
  const [activeSurveyResponses, setActiveSurveyResponses] = useState([]);
  const [isLoadingActiveSurvey, setIsLoadingActiveSurvey] = useState(false);

  // Fetch active survey batch on mount
  useEffect(() => {
    const loadActiveSurvey = async () => {
      if (!skBarangayId) return;
      
      try {
        const batchesResp = await surveyBatchesService.getSurveyBatches({
          status: 'active',
          limit: 1,
          includeStats: true,
          barangay: skBarangayId
        });
        
        if (batchesResp?.success && batchesResp?.data?.data?.length > 0) {
          setActiveSurveyBatch(batchesResp.data.data[0]);
        } else {
          setActiveSurveyBatch(null);
        }
      } catch (error) {
        logger.error('Error fetching active survey batch', error);
        setActiveSurveyBatch(null);
      }
    };
    
    loadActiveSurvey();
  }, [skBarangayId]);

  useEffect(() => {
    if (skBarangayId) {
    fetchDashboardData();
    // Set up auto-refresh every 5 minutes
    const interval = setInterval(fetchDashboardData, 300000);
    return () => clearInterval(interval);
    }
  }, [skBarangayId, activeTerm?.termId]);

  // Realtime: refresh on SK term changes
  useRealtime('skTerm:activated', () => fetchDashboardData());
  useRealtime('skTerm:completed', () => fetchDashboardData());
  useRealtime('skTerm:extended', () => fetchDashboardData());

  // Load SK barangay completion stats (only for SK user's barangay)
  const loadSKBarangayCompletion = async (activeOfficialsCount = null) => {
    logger.debug('loadSKBarangayCompletion called', { hasActiveTerm, hasActiveTerm: !!activeTerm?.termId, activeOfficialsCount, skBarangayId });
    if (!hasActiveTerm || !activeTerm?.termId || !skBarangayId) {
      logger.debug('No active term or barangay, skipping loadSKBarangayCompletion');
      setSkBarangayCompletion({ completed: 0, total: 1, isLoading: false });
      setSkPositionFilledRate({ filled: 0, total: 10, percentage: 0, isLoading: false });
      return;
    }

    try {
      setSkBarangayCompletion(prev => ({ ...prev, isLoading: true }));
      setSkPositionFilledRate(prev => ({ ...prev, isLoading: true }));
      
      // Get vacancies for SK user's barangay only
      const vacanciesResp = await skService.getAllBarangayVacancies(activeTerm.termId);
      
      logger.debug('SK Barangay Completion Debug - Vacancies Response', { success: vacanciesResp.success, hasData: !!vacanciesResp.data });
      
      // Get active officials count - use parameter first, then state, then fallback
      const currentStats = stats.sk;
      const activeOfficials = activeOfficialsCount !== null 
        ? activeOfficialsCount 
        : (currentStats?.activeOfficials || currentStats?.totalOfficials || 0);
      
      logger.debug('Active Officials Count', { activeOfficialsCount, fromState: currentStats?.activeOfficials, final: activeOfficials });
      
      if (vacanciesResp.success && vacanciesResp.data) {
        // POSITION_LIMITS: Chairperson=1, Secretary=1, Treasurer=1, Councilor=7
        const POSITION_LIMITS = {
          'SK Chairperson': 1,
          'SK Secretary': 1,
          'SK Treasurer': 1,
          'SK Councilor': 7
        };
        
        const requiredPositions = Object.keys(POSITION_LIMITS);
        const totalRequiredPerBarangay = Object.values(POSITION_LIMITS).reduce((sum, limit) => sum + limit, 0); // 10 positions total
        
        // Process only SK user's barangay
        const barangayData = vacanciesResp.data[skBarangayId];
        let completedCount = 0;
        let totalFilledPositions = 0;

        if (barangayData) {
          const vacancies = barangayData?.vacancies || {};
          
          logger.debug('Processing SK user\'s barangay', { skBarangayId, hasVacancies: !!vacancies });
          
          // Check if all positions are filled
          let allPositionsFilled = true;
          let barangayFilledCount = 0;
          
          requiredPositions.forEach(position => {
            const positionData = vacancies[position];
            const required = POSITION_LIMITS[position];
            const current = positionData?.current || 0;
            
            logger.debug('Position check', { position, current, required });
            
            totalFilledPositions += current;
            barangayFilledCount += current;
            
            if (current < required) {
              allPositionsFilled = false;
            }
          });
          
          if (allPositionsFilled && barangayFilledCount > 0) {
            completedCount = 1;
          }

          logger.debug('SK User Barangay Completion Stats', {
            barangayId: skBarangayId,
            completed: completedCount,
            totalFilledPositions,
            activeOfficialsFromStats: activeOfficials
          });

        setSkBarangayCompletion({
          completed: completedCount,
            total: 1, // Only 1 barangay for SK user
          isLoading: false
        });

          // Calculate position filled rate for SK user's barangay only
          // Total possible positions = 10 (1 Chairperson + 1 Secretary + 1 Treasurer + 7 Councilors)
          const totalPossiblePositions = 10;
          
          // Use filled positions from vacancies or fallback to activeOfficials
        const finalFilledPositions = totalFilledPositions > 0 
          ? totalFilledPositions 
          : activeOfficials;

        const filledPercentage = totalPossiblePositions > 0 
          ? Math.round((finalFilledPositions / totalPossiblePositions) * 100) 
          : 0;

          logger.debug('SK User Barangay Position Filled Rate', {
            totalFilledPositions,
            finalFilledPositions,
            totalPossiblePositions,
            filledPercentage,
            activeOfficials
          });

        setSkPositionFilledRate({
          filled: finalFilledPositions,
          total: totalPossiblePositions,
          percentage: filledPercentage,
          isLoading: false
        });
        } else {
          // No data for SK user's barangay
          logger.warn('No vacancy data for SK user barangay, using fallback', { skBarangayId });
          const totalPossiblePositions = 10;
          const filledPositions = activeOfficials;
          const filledPercentage = totalPossiblePositions > 0 
            ? Math.round((filledPositions / totalPossiblePositions) * 100) 
            : 0;
          
          setSkBarangayCompletion({ completed: 0, total: 1, isLoading: false });
          setSkPositionFilledRate({ 
            filled: filledPositions, 
            total: totalPossiblePositions, 
            percentage: filledPercentage, 
            isLoading: false 
          });
        }
      } else {
        logger.warn('No vacancy data received, using stats fallback');
        // Fallback: use stats if available
        const totalPossiblePositions = 10;
        const filledPositions = activeOfficials;
        const filledPercentage = totalPossiblePositions > 0 
          ? Math.round((filledPositions / totalPossiblePositions) * 100) 
          : 0;
        
        setSkBarangayCompletion({ completed: 0, total: 1, isLoading: false });
        setSkPositionFilledRate({ 
          filled: filledPositions, 
          total: totalPossiblePositions, 
          percentage: filledPercentage, 
          isLoading: false 
        });
      }
    } catch (error) {
      logger.error('Error loading SK barangay completion', error, { skBarangayId, termId: activeTerm?.termId });
      setSkBarangayCompletion({ completed: 0, total: 1, isLoading: false });
      setSkPositionFilledRate({ filled: 0, total: 10, percentage: 0, isLoading: false });
    }
  };

  // Load SK barangay completion when active term or barangay changes
  useEffect(() => {
    if (hasActiveTerm && activeTerm && skBarangayId) {
      loadSKBarangayCompletion();
    } else {
      setSkBarangayCompletion({ completed: 0, total: 1, isLoading: false });
      setSkPositionFilledRate({ filled: 0, total: 10, percentage: 0, isLoading: false });
    }
  }, [hasActiveTerm, activeTerm?.termId, stats.sk.activeOfficials, stats.sk.totalOfficials, skBarangayId]);

  const fetchDashboardData = async () => {
    if (!skBarangayId) {
      logger.warn('SK Dashboard: No barangay ID available, skipping data fetch');
      setIsLoadingStats(false);
      return;
    }

    try {
      // Don't block the entire page, just show loading in content area
      setIsLoadingStats(true);
      
      // Update last refresh time
      setLastRefresh(new Date());
      
      // Fetch all dashboard data in parallel with barangay filtering for SK users
      const [
        validationStatsResp,
        surveyStatsResp,
        recentActivityResp,
        barangayResp,
        skStatsResp
      ] = await Promise.all([
        api.get(`/validation-queue/stats${skBarangayId ? `?barangay=${skBarangayId}` : ''}`).catch(() => ({ data: { success: false, data: null } })),
        surveyBatchesService.getDashboardStatistics({ barangay: skBarangayId }).catch(() => ({ success: false, data: null })),
        activityService.getRecentActivity(10, { barangayId: skBarangayId }).catch(() => ({ success: false, data: [] })),
        api.get(`/barangays/${skBarangayId}`).catch(() => ({ data: { success: false, data: null } })),
        skService.getSKStatistics({ barangayId: skBarangayId, termId: activeTerm?.termId }).catch(() => ({ success: false, data: {} }))
      ]);

      logger.debug('SK Dashboard fetch results', { barangay: skBarangay, barangayId: skBarangayId });

      // Update stats with barangay-specific data
      // Get youth stats from barangay response
      if (barangayResp?.data?.success && barangayResp?.data?.data?.statistics) {
        const barangayData = barangayResp.data.data;
        const youthStats = barangayData.statistics?.youth || {};
        
        setStats(prev => ({
          ...prev,
          youth: {
            total: youthStats.total_count || youthStats.total || 0,
            active: youthStats.active_count || youthStats.active || 0,
            ageWarning: youthStats.age_warning_count || youthStats.ageWarning || 0,
            archived: youthStats.archived_count || youthStats.archived || 0,
            newThisMonth: youthStats.new_this_month || youthStats.newThisMonth || 0,
            validationRate: youthStats.validation_rate || youthStats.validationRate || 0,
            growthRate: prev.youth?.growthRate || 0,
            retentionRate: prev.youth?.retentionRate || 0,
            engagementScore: prev.youth?.engagementScore || 0,
            demographicDistribution: youthStats.demographic_distribution || prev.youth?.demographicDistribution || {}
          }
        }));
      }

      // Update validation queue stats
      if (validationStatsResp?.data?.success && validationStatsResp?.data?.data) {
        const vqStats = validationStatsResp.data.data;
        setValidationQueue({
          pending: vqStats.pending || 0,
          completed: vqStats.completed || 0,
          rejected: vqStats.rejected || 0,
          completedToday: vqStats.completedToday || vqStats.completed || 0
        });
      }

      // Update survey stats (barangay-filtered)
      if (surveyStatsResp?.success && surveyStatsResp?.data) {
        const surveyData = surveyStatsResp.data;
        setStats(prev => ({
          ...prev,
          surveys: {
            ...prev.surveys,
            active: surveyData.activeBatches || prev.surveys.active,
            total: surveyData.totalResponses || surveyData.total || prev.surveys.total,
            completed: surveyData.completedResponses || surveyData.completed || prev.surveys.completed,
            completionRate: surveyData.completionRate || prev.surveys.completionRate,
            pending: validationStatsResp?.data?.data?.pending || prev.surveys.pending
          }
        }));
      }

      // Update recent activity
      if (recentActivityResp?.success && recentActivityResp?.data) {
        const activities = Array.isArray(recentActivityResp.data) 
          ? recentActivityResp.data 
          : recentActivityResp.data?.data || recentActivityResp.data?.logs || [];
        
        const formattedActivities = activities.map((activity, index) => {
          // Format timestamp
          let timeDisplay = 'Just now';
          if (activity.timestamp || activity.created_at) {
            const timestamp = new Date(activity.timestamp || activity.created_at);
            const now = new Date();
            const diffMs = now - timestamp;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            
            if (diffMins < 1) timeDisplay = 'Just now';
            else if (diffMins < 60) timeDisplay = `${diffMins} min ago`;
            else if (diffHours < 24) timeDisplay = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
            else timeDisplay = timestamp.toLocaleDateString();
          }
          
          // Determine type based on success or category
          let activityType = 'info';
          if (activity.success === false) activityType = 'error';
          else if (activity.category === 'warning' || activity.level === 'warning') activityType = 'warning';
          else if (activity.success === true) activityType = 'success';
          
          return {
            id: activity.id || activity.log_id || index + 1,
            action: activity.action || activity.resource_name || activity.resource || 'Activity',
            user: activity.userType || activity.user_type || 'System',
            time: timeDisplay,
            type: activityType
          };
        });
        
        setRecentActivity(formattedActivities);
      }

      // Update SK statistics (barangay-filtered)
      if (skStatsResp?.success && skStatsResp?.data) {
        const skData = skStatsResp.data;
        const activeOfficials = skData.active || 0;
        const totalOfficials = skData.total || 0;
        
        logger.debug('SK Statistics received', { activeOfficials, totalOfficials, hasData: !!skData });
        
        setStats(prev => ({
          ...prev,
          sk: {
            ...prev.sk,
            activeOfficials: activeOfficials,
            totalOfficials: totalOfficials,
            inactiveOfficials: skData.inactive || 0
          }
        }));
        
        // Reload SK barangay completion after stats are loaded, passing the activeOfficials count
        if (hasActiveTerm && activeTerm) {
          loadSKBarangayCompletion(activeOfficials);
        }
      }
       
      // Load barangay distribution for SK user's barangay only
      const loadBarangayDistribution = async () => {
        logger.debug('Loading barangay distribution', {
          hasBarangayResp: !!barangayResp?.data,
          skBarangayId,
          skBarangay
        });

        if (barangayResp?.data?.success && barangayResp?.data?.data) {
          const barangayData = barangayResp.data.data;
          const youthStats = barangayData.statistics?.youth || {};
          
          logger.debug('Youth Stats from API', { hasStats: !!youthStats });
          
          // Parse the counts - handle both string and number types
          const male = parseInt(youthStats.male_count || youthStats.male || 0, 10) || 0;
          const female = parseInt(youthStats.female_count || youthStats.female || 0, 10) || 0;
          const totalFromGender = male + female;
          const totalFromStats = parseInt(youthStats.total_count || youthStats.total || youthStats.active_count || 0, 10) || 0;
          const total = totalFromGender > 0 ? totalFromGender : totalFromStats;
          
          logger.debug('Processed counts', { 
            male, 
            female, 
            totalFromGender, 
            totalFromStats, 
            total
          });
          
          if (total > 0) {
            // If we have gender breakdown, use it; otherwise estimate 50/50
            const finalMale = male > 0 ? male : (total > 0 ? Math.floor(total * 0.5) : 0);
            const finalFemale = female > 0 ? female : (total > 0 ? Math.ceil(total * 0.5) : 0);
            
            const chartData = [{
              name: String(barangayData.barangay_name || skBarangay || 'Your Barangay'),
              Male: finalMale,
              Female: finalFemale,
              count: total
            }];
            
            logger.debug('SK Barangay Distribution data set', { chartDataCount: chartData.length });
            setBarangayDistribution(chartData);
          } else {
            logger.warn('No youth data found (total is 0)', { skBarangayId });
            setBarangayDistribution([]);
          }
        } else {
          logger.warn('Barangay API response failed or missing', {
            success: barangayResp?.data?.success,
            hasData: !!barangayResp?.data?.data,
            error: barangayResp?.data?.message
          });
          
          // Fallback: check if we have youth data from barangay response even if structure is different
          if (barangayResp?.data?.data) {
            const barangayData = barangayResp.data.data;
            // Try to get any youth count data
            const anyYouthTotal = barangayData.statistics?.youth?.total_count || 
                                  barangayData.statistics?.youth?.active_count ||
                                  barangayData.statistics?.youth?.total ||
                                  0;
            
            if (anyYouthTotal > 0) {
              logger.debug('Using fallback from barangay data', { anyYouthTotal });
              const chartData = [{
                name: String(barangayData.barangay_name || skBarangay || 'Your Barangay'),
                Male: Math.floor(anyYouthTotal * 0.5),
                Female: Math.ceil(anyYouthTotal * 0.5),
                count: anyYouthTotal
              }];
              setBarangayDistribution(chartData);
            } else {
              logger.warn('No youth data available in any form', { skBarangayId });
              setBarangayDistribution([]);
            }
          } else {
            setBarangayDistribution([]);
          }
        }
      };
      
      // Call the function to load distribution
      loadBarangayDistribution();

      // Generate system alerts based on real data
      const alerts = [];
      const pendingValidations = validationStatsResp?.data?.data?.pending || 0;
      if (pendingValidations > 100) {
        alerts.push({
          id: 1,
          type: 'warning',
          message: `High validation queue (${pendingValidations} pending)`,
          action: 'Review Queue',
          priority: 'high'
        });
      }
      setSystemAlerts(alerts);
      
    } catch (error) {
      logger.error('Error fetching dashboard data', error, { skBarangayId });
    } finally {
      setIsLoadingStats(false);
    }
  };

  // Fetch active survey batch and its responses (filtered by SK user's barangay)
  const fetchActiveSurvey = async () => {
    if (!skBarangayId) return;
    
    try {
      setIsLoadingActiveSurvey(true);
      
      // Get active survey batches (SK users see all active batches)
      const batchesResp = await surveyBatchesService.getSurveyBatches({
        status: 'active',
        limit: 1,
        includeStats: true
      });

      if (batchesResp?.success && batchesResp?.data?.data?.length > 0) {
        const activeBatch = batchesResp.data.data[0];
        setActiveSurveyBatch(activeBatch);

        // Fetch responses for the active batch (filtered by SK user's barangay)
        const responsesResp = await surveyBatchesService.getBatchResponses(activeBatch.batchId || activeBatch.batch_id, {
          limit: 10000, // High limit to get all responses
          barangay: skBarangayId // Filter by SK user's barangay
        });

        if (responsesResp?.success) {
          const items = Array.isArray(responsesResp?.data?.data)
            ? responsesResp.data.data
            : Array.isArray(responsesResp?.data)
              ? responsesResp.data
              : Array.isArray(responsesResp?.items)
                ? responsesResp.items
                : Array.isArray(responsesResp?.data?.items)
                  ? responsesResp.data.items
                  : [];
          setActiveSurveyResponses(items);
        } else {
          setActiveSurveyResponses([]);
        }
      } else {
        setActiveSurveyBatch(null);
        setActiveSurveyResponses([]);
      }
      } catch (error) {
        logger.error('Error fetching active survey', error);
      setActiveSurveyBatch(null);
      setActiveSurveyResponses([]);
    } finally {
      setIsLoadingActiveSurvey(false);
    }
  };

  // Fetch active survey when switching to survey-analytics tab
  useEffect(() => {
    if (activeTab === 'survey-analytics') {
      fetchActiveSurvey();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Apply filters function (SK users only filter by search, no barangay filter)
  const applyFilters = () => {
    logger.debug('Filters applied', { searchQuery, dateRange });
    
    // SK users only see their barangay, so no barangay filtering needed
    // Search and date range filters would require backend API calls
    // The search query can be used to filter activity logs or other data
  };

  // StatCard matching AdminDashboardSurveyAnalytics design
  const StatCard = ({ title, value, icon: Icon, color, trend, subtitle, onClick, analytics, insights }) => {
    const getColorClasses = (color) => {
      switch (color) {
        case 'blue':
          return {
            grad: 'from-blue-50 to-indigo-50',
            iconBg: 'bg-blue-100',
            iconColor: 'text-blue-600',
            badge: 'bg-blue-50 text-blue-700 border-blue-200'
          };
        case 'green':
          return {
            grad: 'from-green-50 to-emerald-50',
            iconBg: 'bg-green-100',
            iconColor: 'text-green-600',
            badge: 'bg-green-50 text-green-700 border-green-200'
          };
        case 'yellow':
        case 'amber':
          return {
            grad: 'from-amber-50 to-yellow-50',
            iconBg: 'bg-amber-100',
            iconColor: 'text-amber-600',
            badge: 'bg-amber-50 text-amber-700 border-amber-200'
          };
        case 'purple':
          return {
            grad: 'from-purple-50 to-indigo-50',
            iconBg: 'bg-purple-100',
            iconColor: 'text-purple-600',
            badge: 'bg-purple-50 text-purple-700 border-purple-200'
          };
        case 'orange':
          return {
            grad: 'from-orange-50 to-amber-50',
            iconBg: 'bg-orange-100',
            iconColor: 'text-orange-600',
            badge: 'bg-orange-50 text-orange-700 border-orange-200'
          };
        case 'red':
          return {
            grad: 'from-red-50 to-rose-50',
            iconBg: 'bg-red-100',
            iconColor: 'text-red-600',
            badge: 'bg-red-50 text-red-700 border-red-200'
          };
        default:
          return {
            grad: 'from-gray-50 to-gray-50',
            iconBg: 'bg-gray-100',
            iconColor: 'text-gray-600',
            badge: 'bg-gray-50 text-gray-700 border-gray-200'
          };
      }
    };

    const colors = getColorClasses(color);
    // Badge shows trend number if available, otherwise subtitle text
    const badgeText = trend !== undefined && trend !== null 
      ? (typeof trend === 'number' ? trend.toLocaleString() : String(trend))
      : subtitle || '';

    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition h-full flex flex-col" onClick={onClick}>
        {/* Header with gradient */}
        <div className={`px-5 py-2.5 bg-gradient-to-r ${colors.grad} border-b border-gray-100`}>
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg ${colors.iconBg} flex items-center justify-center`}>
              <Icon className={`w-4 h-4 ${colors.iconColor}`} />
              </div>
            <div>
              <h4 className="text-xs font-semibold text-gray-900">{title}</h4>
              {subtitle && <p className="text-[11px] text-gray-600">{subtitle}</p>}
            </div>
            </div>
          </div>
        {/* Body */}
        <div className="p-4 flex-1 flex flex-col justify-between">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-3xl font-bold text-gray-900">{value}</div>
            </div>
            {badgeText && (
              <span className={`px-2 py-1 text-xs rounded-lg border ${colors.badge}`}>
                {badgeText}
              </span>
          )}
        </div>
        {/* Analytics Section - Compact */}
        {analytics && (
            <div className="mt-4 space-y-2">
              {analytics.score && (
                <div className="p-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-700">Score</span>
                    <span className="text-xs font-bold text-gray-900">{analytics.score}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div 
                      className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${analytics.score}%` }}
                    ></div>
                  </div>
                </div>
              )}
              
              {analytics.trend && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Trend</span>
                  <div className="flex items-center space-x-1">
                    {analytics.trend > 0 ? (
                      <TrendingUp className="h-3 w-3 text-green-500" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-500" />
                    )}
                    <span className={`font-medium ${analytics.trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {analytics.trend > 0 ? '+' : ''}{analytics.trend}%
                    </span>
                  </div>
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
  };

  // Advanced Analytics Components - Matching System Design
  const AnalyticsChart = ({ title, data, type = 'bar', insights }) => (
    <div className="analytics-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {insights && (
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-xs text-green-600 font-medium">{insights}</span>
          </div>
        )}
      </div>
      
      {type === 'bar' && (
        <div className="space-y-3">
          {data.map((item, index) => (
            <div key={index} className="flex items-center justify-between">
              <span className="text-sm text-gray-600 w-20">{item.label}</span>
              <div className="flex-1 mx-3">
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${item.percentage}%` }}
                  ></div>
                </div>
              </div>
              <span className="text-sm font-medium text-gray-900 w-12 text-right">{item.value}</span>
            </div>
          ))}
        </div>
      )}
      
      {type === 'line' && (
        <div className="h-32 flex items-end space-x-2">
          {data.map((item, index) => (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div 
                className="w-full bg-gradient-to-t from-blue-500 to-blue-300 rounded-t"
                style={{ height: `${(item.value / Math.max(...data.map(d => d.value))) * 100}%` }}
              ></div>
              <span className="text-xs text-gray-500 mt-1">{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // KPI Performance Indicator - Matching System Design
  const KPIIndicator = ({ title, value, target, status, insights }) => (
    <div className="kpi-indicator p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-gray-700">{title}</h4>
        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
          status === 'excellent' ? 'bg-green-100 text-green-800' :
          status === 'good' ? 'bg-blue-100 text-blue-800' :
          status === 'average' ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
        }`}>
          {status}
        </div>
      </div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xl font-bold text-gray-900">{value}</span>
        <span className="text-sm text-gray-500">Target: {target}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all duration-500 ${
            status === 'excellent' ? 'bg-green-500' :
            status === 'good' ? 'bg-blue-500' :
            status === 'average' ? 'bg-yellow-500' :
            'bg-red-500'
          }`}
          style={{ width: `${Math.min((value / target) * 100, 100)}%` }}
        ></div>
      </div>
      {insights && (
        <p className="text-xs text-gray-500 mt-2 italic">{insights}</p>
      )}
    </div>
  );

  // Business Intelligence Insights - Matching Announcements Style
  const BusinessInsights = ({ insights }) => (
    <div className="business-insights p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Activity className="h-5 w-5 text-blue-500 mr-2" />
          Business Intelligence Insights
        </h3>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-xs text-gray-500">Live Analysis</span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
        {insights.map((insight, index) => (
          <div key={index} className="group relative h-full">
            {/* Card */}
            <div className="relative rounded-2xl overflow-hidden shadow-sm transition-all duration-200 group-hover:shadow-lg h-full flex flex-col bg-white ring-1 ring-gray-200">
              {/* Header with Icon and Type Badge */}
              <div className="p-6 pb-4">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    insight.type === 'positive' ? 'bg-green-100' :
                    insight.type === 'warning' ? 'bg-yellow-100' :
                    'bg-blue-100'
                  }`}>
                    {insight.type === 'positive' ? (
                      <TrendingUp className="h-6 w-6 text-green-600" />
                    ) : insight.type === 'warning' ? (
                      <AlertTriangle className="h-6 w-6 text-yellow-600" />
                    ) : (
                      <Info className="h-6 w-6 text-blue-600" />
                    )}
                  </div>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${
                    insight.type === 'positive' ? 'bg-green-100 text-green-800 border-green-200' :
                    insight.type === 'warning' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                    'bg-blue-100 text-blue-800 border-blue-200'
                  }`}>
                    {insight.type === 'positive' ? 'Positive' : insight.type === 'warning' ? 'Warning' : 'Info'}
                  </span>
                </div>
                
                {/* Title */}
                <h4 className="text-lg font-semibold text-gray-900 mb-3 line-clamp-2">
                  {insight.title}
                </h4>
                
                {/* Description */}
                <p className="text-gray-600 text-sm mb-4 leading-relaxed line-clamp-3 flex-1">
                  {insight.description}
                </p>
              </div>

              {/* Impact Section */}
              {insight.impact && (
                <div className="px-6 pb-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center text-sm text-gray-600">
                      <div className="w-1 h-1 bg-gray-400 rounded-full mr-2"></div>
                      <span className="font-medium">Impact:</span>
                      <span className="ml-1">{insight.impact}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-auto px-6 pb-6">
                <div className="relative inline-flex items-center text-gray-400 group-hover:text-blue-600 transition-colors w-32">
                  <span className="absolute left-0 text-sm font-medium opacity-0 transition-opacity duration-200 pointer-events-none group-hover:opacity-100">View details</span>
                  <ArrowRight className="w-5 h-5 transform transition-transform duration-200 group-hover:translate-x-20" />
                </div>
                <div className="flex-1" />
                <div className="text-xs text-gray-500">
                  {new Date().toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const QuickAction = ({ title, icon: Icon, onClick, color = "blue", description }) => (
    <button
      onClick={onClick}
      className={`w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 ${
        color === 'blue' ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 focus:ring-blue-500 border border-blue-200' :
        color === 'green' ? 'bg-green-50 text-green-700 hover:bg-green-100 focus:ring-green-500 border border-green-200' :
        color === 'yellow' ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 focus:ring-yellow-500 border border-yellow-200' :
        color === 'red' ? 'bg-red-50 text-red-700 hover:bg-red-100 focus:ring-red-500 border border-red-200' :
        'bg-gray-50 text-gray-700 hover:bg-gray-100 focus:ring-gray-500 border border-gray-200'
      }`}
      title={description}
    >
      <div className="flex items-center space-x-3">
        <Icon className="h-5 w-5" />
        <span className="font-medium">{title}</span>
      </div>
    </button>
  );

  const AlertCard = ({ alert }) => (
    <div className={`alert-card p-4 ${
      alert.type === 'error' ? 'error' :
      alert.type === 'warning' ? 'warning' :
      'info'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {alert.type === 'error' ? (
            <XCircle className="h-5 w-5 text-red-500" />
          ) : alert.type === 'warning' ? (
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
          ) : (
            <Info className="h-5 w-5 text-blue-500" />
          )}
          <div>
            <p className="font-medium text-gray-900">{alert.message}</p>
            <p className="text-sm text-gray-500">Priority: {alert.priority}</p>
          </div>
        </div>
        {alert.action && (
          <Button size="sm" onClick={() => navigate('/sk/survey/validation')}>
            {alert.action}
          </Button>
        )}
      </div>
    </div>
  );

  // Tab configuration (simplified)
  const tabs = [
    { 
      id: 'overview', 
      label: 'Overview', 
      icon: BarChart3, 
      count: null,
      description: 'System overview and key metrics'
    },
    { 
      id: 'survey-analytics', 
      label: 'Survey Analytics', 
      icon: FileText, 
      count: null,
      description: 'Survey performance and validation analytics'
    }
  ];


  // Filter and Search Component (SK users only see their barangay, no filter needed)
  const FilterAndSearch = () => (
    <div className="mb-6">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search Bar */}
        <div className="flex-1">
          <div className="relative">
            <input
              type="text"
              placeholder="Search surveys, activities, or any data..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Barangay Info (Display only, not filterable) */}
        {skBarangay && (
          <div className="lg:w-64 flex items-center px-3 py-2 border border-gray-300 rounded-lg bg-gray-50">
            <MapPin className="w-4 h-4 text-gray-500 mr-2" />
            <span className="text-sm text-gray-700 font-medium">{skBarangay}</span>
        </div>
        )}

        {/* Action Button */}
        <div className="flex gap-2">
          <button
            onClick={() => {
              setSearchQuery('');
              setDateRange({ from: '', to: '' });
              setFilteredData(null);
              fetchDashboardData();
            }}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );

  // Tab Navigation Component - Matching System Design
  const TabNavigation = () => (
    <div className="bg-white border-b border-gray-200 mb-6">
      <div className="flex space-x-1 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                isActive
                  ? 'border-green-500 text-green-600 bg-green-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              title={tab.description}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span className={`px-2 py-1 text-xs rounded-full ${
                  isActive
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {tab.count.toLocaleString()}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  // Show page structure immediately, only content area shows loading

  // Enhanced Overview Tab with Business Analytics (simplified)
  const OverviewTab = () => {
    // Show loading state only for content area
    if (isLoadingStats) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[600px]">
          <div className="text-center space-y-4">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-blue-600 animate-pulse" />
              </div>
            </div>
            <div className="flex flex-col items-center space-y-1">
              <p className="text-sm text-gray-600 font-medium">Loading dashboard data...</p>
              <p className="text-xs text-gray-500">Fetching system data and statistics</p>
            </div>
          </div>
      </div>
    );
  }

    // Calculate term days remaining
    const calculateTermDaysRemaining = () => {
      if (!hasActiveTerm || !activeTerm?.endDate) return null;
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const endDate = new Date(activeTerm.endDate);
        endDate.setHours(0, 0, 0, 0);
        const timeDiff = endDate.getTime() - today.getTime();
        const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
        return daysRemaining;
      } catch (error) {
        logger.error('Error calculating term days remaining', error);
        return null;
      }
    };

    // Calculate survey batch days remaining
    const calculateSurveyDaysRemaining = () => {
      if (!activeSurveyBatch?.endDate && !activeSurveyBatch?.end_date) return null;
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const endDate = new Date(activeSurveyBatch.endDate || activeSurveyBatch.end_date);
        endDate.setHours(0, 0, 0, 0);
        const timeDiff = endDate.getTime() - today.getTime();
        const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
        return daysRemaining;
      } catch (error) {
        logger.error('Error calculating survey days remaining', error);
        return null;
      }
    };

    const termDaysRemaining = calculateTermDaysRemaining();
    const surveyDaysRemaining = calculateSurveyDaysRemaining();

    // Sync left column height with Youth Distribution chart height
    useEffect(() => {
      const syncHeights = () => {
        const chart = document.getElementById('youth-distribution-chart');
        const leftColumn = document.getElementById('left-cards-grid');
        if (chart && leftColumn) {
          const chartHeight = chart.offsetHeight;
          leftColumn.style.height = `${chartHeight}px`;
          leftColumn.style.display = 'grid';
        }
      };

      // Sync on mount and after delays for content to render
      syncHeights();
      const timeout1 = setTimeout(syncHeights, 100);
      const timeout2 = setTimeout(syncHeights, 500);
      window.addEventListener('resize', syncHeights);

      return () => {
        clearTimeout(timeout1);
        clearTimeout(timeout2);
        window.removeEventListener('resize', syncHeights);
      };
    }, [barangayDistribution, filteredData]);

    return (
    <div className="space-y-6">
      {/* Executive Summary KPIs - 6 cards on left (3 rows, 2 columns), right side with chart and cards */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left side - 6 cards in 3 rows × 2 columns grid - matches height of Youth Distribution chart */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-4 content-start" id="left-cards-grid">
          {/* Row 1, Column 1: Current SK Term */}
        <StatCard
          title="Current SK Term"
          value={hasActiveTerm && activeTerm ? (activeTerm.termName || 'N/A') : 'No Active Term'}
          icon={Calendar}
          color="indigo"
          subtitle={hasActiveTerm && activeTerm ? "Active Term" : 'No active term available'}
            trend={termDaysRemaining !== null ? `${termDaysRemaining} days` : (hasActiveTerm && activeTerm ? `${activeTerm.startDate ? new Date(activeTerm.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'} - ${activeTerm.endDate ? new Date(activeTerm.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}` : '')}
          insights={hasActiveTerm && activeTerm ? `${activeTerm.startDate ? new Date(activeTerm.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'} - ${activeTerm.endDate ? new Date(activeTerm.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}` : 'No active SK term'}
            onClick={() => navigate('/sk/term')}
        />
          {/* Row 1, Column 2: Completion of SK Officials */}
        <StatCard
          title="Completion of SK Officials"
          value={`${skBarangayCompletion.completed}/${skBarangayCompletion.total}`}
          icon={CheckCircle2}
          color="green"
            subtitle="Barangay with Full Officials"
            insights={skBarangayCompletion.total > 0 ? `${skBarangayCompletion.completed === 1 ? 'All positions filled' : 'Some positions vacant'} in ${skBarangay || 'your barangay'}` : 'No data available'}
            onClick={() => navigate('/sk/officials')}
          />
          {/* Row 2, Column 1: Active Survey Batch */}
          <StatCard
            title="Active Survey Batch"
            value={activeSurveyBatch ? (activeSurveyBatch.batchName || activeSurveyBatch.batch_name || 'N/A') : 'No Active Batch'}
            icon={FileText}
            color="green"
            subtitle={activeSurveyBatch ? "Active Batch" : 'No active batch available'}
            trend={surveyDaysRemaining !== null ? `${surveyDaysRemaining} days` : ''}
            insights={activeSurveyBatch ? `${activeSurveyBatch.batchName || activeSurveyBatch.batch_name || 'Active Batch'}` : 'No active survey batch'}
            onClick={() => navigate('/sk/survey/batches')}
          />
          {/* Row 2, Column 2: Filled Rate of Position */}
        <StatCard
          title="Filled Rate of Position"
          value={`${skPositionFilledRate.percentage}%`}
          icon={TrendingUp}
          color="blue"
          subtitle="Position Fill Rate"
            insights={skPositionFilledRate.total > 0 ? `${skPositionFilledRate.filled} out of ${skPositionFilledRate.total} positions filled in ${skBarangay || 'your barangay'}` : 'No data available'}
            onClick={() => navigate('/sk/officials')}
        />
          {/* Row 3, Column 1: My Barangay Officials */}
        <StatCard
            title="My Barangay Officials"
          value={hasActiveTerm ? (stats.sk.activeOfficials || stats.sk.totalOfficials || 0).toLocaleString() : '0'}
          icon={Users}
          color="teal"
            subtitle="SK Officials in My Barangay"
            insights={hasActiveTerm ? `SK officials for ${activeTerm?.termName || 'current term'} in ${skBarangay || 'your barangay'}` : 'No active term'}
            onClick={() => navigate('/sk/officials')}
          />
          {/* Row 3, Column 2: Total Youth */}
          <StatCard
            title="Total Youth"
            value={stats.youth.total.toLocaleString()}
            icon={Users}
            color="blue"
            subtitle={`In ${skBarangay || 'your barangay'}`}
            insights={`Total youth registered in ${skBarangay || 'your barangay'}`}
            onClick={() => {}}
        />
        </div>
        
        {/* Right side - 4 rows × 2 columns grid */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-4 content-start">
          {/* Row 1: Youth Distribution Chart (spans 2 columns) - this determines the left column height */}
          <div className="col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden" id="youth-distribution-chart">
          <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <MapPin className="w-4 h-4 text-blue-600" />
              </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Youth Distribution</h3>
                  <p className="text-xs text-gray-600">{skBarangay || 'Your barangay'} by gender</p>
                </div>
            </div>
          </div>
          <div className="p-5">
            {(filteredData?.barangayDistribution || barangayDistribution).length > 0 ? (
              <div className="space-y-3">
                {(filteredData?.barangayDistribution || barangayDistribution).map((item, index) => {
                  const displayData = filteredData?.barangayDistribution || barangayDistribution;
                  const maxCount = Math.max(...displayData.map(d => (d.Male || 0) + (d.Female || 0) || d.count || 0));
                  const maleCount = item.Male || 0;
                  const femaleCount = item.Female || 0;
                  const totalCount = maleCount + femaleCount || item.count || 0;
                  const malePercentage = maxCount > 0 ? (maleCount / maxCount) * 100 : 0;
                  const femalePercentage = maxCount > 0 ? (femaleCount / maxCount) * 100 : 0;
                  
                  return (
                    <div key={index} className="flex items-center gap-3">
                      {/* Barangay Name - Fixed width */}
                      <div className="w-32 text-right">
                        <span className="text-sm font-semibold text-gray-700 truncate block">
                          {item.name}
                        </span>
                      </div>
                      
                      {/* Stacked Bar */}
                      <div className="flex-1 relative">
                        <div className="w-full bg-gray-100 rounded-full h-8 overflow-hidden flex">
                          {/* Male segment (left) */}
                          {maleCount > 0 && (
                            <div
                              className="h-8 flex items-center justify-end pr-2 bar-segment"
                              style={{ 
                                width: `${malePercentage}%`,
                                backgroundColor: '#9cadce',
                                transition: 'width 1.2s ease-out',
                                transitionDelay: `${index * 0.1}s`,
                                animation: 'slideInBar 1.2s ease-out',
                                animationDelay: `${index * 0.1}s`,
                                animationFillMode: 'both'
                              }}
                            >
                              {malePercentage > 8 && (
                                <span 
                                  className="text-xs font-bold text-white bar-count"
                                  style={{
                                    animation: 'fadeInCount 0.6s ease-out',
                                    animationDelay: `${index * 0.1 + 0.8}s`,
                                    animationFillMode: 'both'
                                  }}
                                >
                                  {maleCount}
                                </span>
                              )}
                            </div>
                          )}
                          {/* Female segment (right) */}
                          {femaleCount > 0 && (
                            <div
                              className="h-8 flex items-center justify-end pr-3 bar-segment"
                              style={{ 
                                width: `${femalePercentage}%`,
                                backgroundColor: '#D198B7',
                                transition: 'width 1.2s ease-out',
                                transitionDelay: `${index * 0.1 + 0.15}s`,
                                animation: 'slideInBar 1.2s ease-out',
                                animationDelay: `${index * 0.1 + 0.15}s`,
                                animationFillMode: 'both'
                              }}
                            >
                              {femalePercentage > 8 && (
                                <span 
                                  className="text-xs font-bold text-white bar-count"
                                  style={{
                                    animation: 'fadeInCount 0.6s ease-out',
                                    animationDelay: `${index * 0.1 + 1}s`,
                                    animationFillMode: 'both'
                                  }}
                                >
                                  {femaleCount}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Total count on the right */}
                      <div className="w-16 text-left">
                        <span className="text-sm font-bold text-gray-900">
                          {totalCount}
                        </span>
                      </div>
                    </div>
                  );
                })}
                
                {/* Legend */}
                <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#9cadce' }}></div>
                    <span className="text-xs font-medium text-gray-700">Male</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#D198B7' }}></div>
                    <span className="text-xs font-medium text-gray-700">Female</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center" style={{ minHeight: '450px' }}>
                <div className="text-center">
                  <MapPin className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-xs text-gray-600 font-medium">No data available</p>
                </div>
              </div>
            )}
          </div>
          </div>
          {/* Row 2: Two cards side by side */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-900">Active Surveys</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats.surveys.active || 0}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-900">Total Responses</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats.surveys.total?.toLocaleString() || 0}</p>
                </div>
              </div>
            </div>
          </div>
          {/* Row 3: Two cards side by side */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-900">Pending Validation</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats.surveys.pending || 0}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-900">Completion Rate</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats.surveys.completionRate || 0}%</p>
                </div>
              </div>
            </div>
          </div>
          {/* Row 4: Two cards side by side */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Users className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-900">Validated Youth</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats.youth.validated?.toLocaleString() || stats.youth.total?.toLocaleString() || 0}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-teal-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-900">Participation Rate</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats.sk.participationRate || 0}%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Survey Batch Status & SK Governance Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Survey Batch Status Overview */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-green-50 to-emerald-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Survey Batch Status</h3>
                  <p className="text-xs text-gray-600">Current batch overview</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/sk/survey/batches')}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                View All
              </button>
            </div>
          </div>
          <div className="p-5">
            <div className="space-y-4">
              {/* Active Batches */}
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Activity className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Active Batches</p>
                    <p className="text-xs text-gray-600">Currently collecting data</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-600">{stats.surveys.active}</p>
                  <p className="text-xs text-gray-500">batches</p>
                </div>
              </div>

              {/* Total Responses */}
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Total Responses</p>
                    <p className="text-xs text-gray-600">Completed surveys</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-green-600">{stats.surveys.total.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">{stats.surveys.completionRate}% rate</p>
                </div>
              </div>

              {/* Pending Validation */}
              <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Pending Validation</p>
                    <p className="text-xs text-gray-600">Requires review</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-amber-600">{stats.surveys.pending}</p>
                  <p className="text-xs text-gray-500">responses</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Completion Rate</span>
                  <span className="text-lg font-bold text-gray-900">{stats.surveys.completionRate}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-emerald-500 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${stats.surveys.completionRate}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SK Governance Panel */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">SK Governance</h3>
                  <p className="text-xs text-gray-600">Current term overview</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/sk/term')}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                View Term
              </button>
            </div>
          </div>
          <div className="p-5">
            <div className="space-y-4">
              {/* Term Completion */}
              <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Term Completion</p>
                    <p className="text-xs text-gray-600">Current term progress</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-indigo-600">{stats.sk.termCompletionRate}%</p>
                  <p className="text-xs text-gray-500">completed</p>
                </div>
              </div>

              {/* Efficiency Score */}
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Efficiency Score</p>
                    <p className="text-xs text-gray-600">Performance rating</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-purple-600">{stats.sk.efficiencyScore}%</p>
                  <p className="text-xs text-gray-500">score</p>
                </div>
              </div>

              {/* Active Officials */}
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Active Officials</p>
                    <p className="text-xs text-gray-600">SK officers</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-600">{stats.sk.activeOfficials || 45}</p>
                  <p className="text-xs text-gray-500">officials</p>
                </div>
              </div>

              {/* Participation Rate */}
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Participation Rate</span>
                  <span className="text-lg font-bold text-gray-900">{stats.sk.participationRate}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${stats.sk.participationRate}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-black mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <QuickAction
              title="View Validation Queue"
              icon={Eye}
              onClick={() => navigate('/sk/survey/validation')}
              color="yellow"
              description="Review pending survey validations for your barangay"
            />
            <QuickAction
              title="View Survey Batches"
              icon={FileText}
              onClick={() => navigate('/sk/survey/batches')}
              color="blue"
              description="View active and past survey batches"
            />
            <QuickAction
              title="View Announcements"
              icon={Bell}
              onClick={() => navigate('/sk/announcements')}
              color="indigo"
              description="View LYDO announcements"
            />
          </div>
        </Card>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Total Youth"
          value={stats.youth.total.toLocaleString()}
          icon={Users}
          color="blue"
          subtitle={`In ${skBarangay || 'your barangay'}`}
          onClick={() => {}}
        />
        <StatCard
          title="Pending Validations"
          value={validationQueue.pending}
          icon={Clock}
          color="yellow"
          subtitle="Requires review"
          onClick={() => navigate('/sk/survey/validation')}
        />
        <StatCard
          title="Active Surveys"
          value={stats.surveys.active}
          icon={FileText}
          color="green"
          subtitle="Active batches"
          onClick={() => navigate('/sk/survey/batches')}
        />
      </div>

      {/* Recent Activity & Announcements Snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity Feed */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Recent Activity</h3>
                  <p className="text-xs text-gray-600">Latest system actions</p>
                </div>
              </div>
              <button
              onClick={() => {}}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium opacity-50 cursor-not-allowed"
                disabled
              >
                View All
              </button>
            </div>
          </div>
          <div className="p-5">
            <div className="space-y-3">
              {recentActivity && recentActivity.length > 0 ? (
                (searchQuery 
                  ? recentActivity.filter(activity => 
                      activity.action?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      activity.user?.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                  : recentActivity
                ).map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      activity.type === 'success' ? 'bg-green-100' :
                      activity.type === 'warning' ? 'bg-yellow-100' :
                      activity.type === 'error' ? 'bg-red-100' :
                      'bg-blue-100'
                    }`}>
                  {activity.type === 'success' ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : activity.type === 'warning' ? (
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      ) : activity.type === 'error' ? (
                        <XCircle className="h-4 w-4 text-red-600" />
                      ) : (
                        <Info className="h-4 w-4 text-blue-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{activity.action}</p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        <span className="font-medium">{activity.user}</span>
                        <span className="mx-1">•</span>
                        <span>{activity.time}</span>
                    </p>
                  </div>
                </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Activity className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">No recent activity</p>
              </div>
              )}
          </div>
          </div>
        </div>
      </div>
    </div>
  );
  };

  

  const SurveysTab = () => {
    if (isLoadingActiveSurvey) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600 animate-pulse" />
        </div>
      </div>
            <p className="text-sm text-gray-600 mt-3 font-medium">Loading survey analytics...</p>
            <p className="text-xs text-gray-500 mt-1">Fetching active survey data</p>
        </div>
      </div>
      );
    }

    return (
      <div className="space-y-8">
        <AdminDashboardSurveyAnalytics
          responses={activeSurveyResponses}
          startDate={activeSurveyBatch?.startDate || activeSurveyBatch?.start_date}
          endDate={activeSurveyBatch?.endDate || activeSurveyBatch?.end_date}
          activeSurvey={activeSurveyBatch}
        />
    </div>
  );
  };

  

  

  

  // Tab Content Renderer (simplified)
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab />;
      case 'survey-analytics':
        return <SurveysTab />;
      default:
        return <OverviewTab />;
    }
  };

  return (
    <>
      <style>{`
        @keyframes slideInBar {
          from {
            width: 0% !important;
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes fadeInCount {
          from {
            opacity: 0;
            transform: translateX(-8px) scale(0.8);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
        .bar-segment {
          min-width: 0;
        }
        .bar-count {
          opacity: 0;
        }
      `}</style>
    <div className="space-y-6">
      <HeaderMainContent
        title="SK Dashboard"
        description={`Overview of ${skBarangay || 'your barangay'} statistics and activities`}
      >
        <div className="text-sm text-gray-500">
          Last updated: {lastRefresh.toLocaleString()}
        </div>
        <button
          onClick={fetchDashboardData}
          disabled={isLoadingStats}
          className="inline-flex items-center px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingStats ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </HeaderMainContent>

      {/* Filter and Search */}
      <FilterAndSearch />

      {/* Tab Navigation */}
      <TabNavigation />

      {/* Tab Content */}
      {renderTabContent()}
    </div>
    </>
  );
};

export default SKDashboard;