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
  CheckCircle2
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { HeaderMainContent } from '../../components/portal_main_content';
import AdminDashboardSurveyAnalytics from './AdminDashboardSurveyAnalytics';
import surveyBatchesService from '../../services/surveyBatchesService';
import statisticsService from '../../services/statisticsService';
import activityService from '../../services/activityService';
import staffService from '../../services/staffService';
import skService from '../../services/skService';
import api from '../../services/api';
import { useActiveTerm } from '../../hooks/useActiveTerm';
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

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [activeTab, setActiveTab] = useState('overview');
  
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
  
  // Filter and search state
  const [selectedBarangay, setSelectedBarangay] = useState('All Barangays');
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

  useEffect(() => {
    fetchDashboardData();
    // Set up auto-refresh every 5 minutes
    const interval = setInterval(fetchDashboardData, 300000);
    return () => clearInterval(interval);
  }, []);

  // Realtime: refresh on SK term changes
  useRealtime('skTerm:activated', () => fetchDashboardData());
  useRealtime('skTerm:completed', () => fetchDashboardData());
  useRealtime('skTerm:extended', () => fetchDashboardData());

  // Load SK barangay completion stats
  const loadSKBarangayCompletion = async (activeOfficialsCount = null) => {
    console.log('📊 loadSKBarangayCompletion called', { hasActiveTerm, activeTerm, activeOfficialsCount });
    if (!hasActiveTerm || !activeTerm?.termId) {
      console.log('📊 No active term, skipping loadSKBarangayCompletion');
      setSkBarangayCompletion({ completed: 0, total: 0, isLoading: false });
      setSkPositionFilledRate({ filled: 0, total: 0, percentage: 0, isLoading: false });
      return;
    }

    try {
      setSkBarangayCompletion(prev => ({ ...prev, isLoading: true }));
      setSkPositionFilledRate(prev => ({ ...prev, isLoading: true }));
      
      // Get all barangay vacancies
      const vacanciesResp = await skService.getAllBarangayVacancies(activeTerm.termId);
      
      console.log('📊 SK Barangay Completion Debug - Vacancies Response:', vacanciesResp);
      
      // Get active officials count - use parameter first, then state, then fallback
      const currentStats = stats.sk;
      const activeOfficials = activeOfficialsCount !== null 
        ? activeOfficialsCount 
        : (currentStats?.activeOfficials || currentStats?.totalOfficials || 0);
      
      console.log('📊 Active Officials Count:', { activeOfficialsCount, fromState: currentStats?.activeOfficials, final: activeOfficials });
      
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
        
        let completedCount = 0;
        let totalBarangays = 0;
        let totalFilledPositions = 0;

        // Process each barangay
        Object.entries(vacanciesResp.data).forEach(([barangayId, barangayData]) => {
          totalBarangays++;
          const vacancies = barangayData?.vacancies || {};
          
          console.log(`📊 Processing barangay ${barangayId}:`, { barangayData, vacancies });
          
          // Check if all positions are filled
          let allPositionsFilled = true;
          let barangayFilledCount = 0;
          
          requiredPositions.forEach(position => {
            const positionData = vacancies[position];
            const required = POSITION_LIMITS[position];
            const current = positionData?.current || 0;
            
            console.log(`  Position ${position}: current=${current}, required=${required}`);
            
            totalFilledPositions += current;
            barangayFilledCount += current;
            
            if (current < required) {
              allPositionsFilled = false;
            }
          });
          
          if (allPositionsFilled && barangayFilledCount > 0) {
            completedCount++;
          }
        });
        
        console.log('📊 SK Completion Stats:', {
          totalBarangays,
          completedCount,
          totalFilledPositions,
          activeOfficialsFromStats: activeOfficials
        });

        setSkBarangayCompletion({
          completed: completedCount,
          total: totalBarangays,
          isLoading: false
        });

        // Calculate position filled rate
        // Total possible positions = totalBarangays * 10 (1 Chairperson + 1 Secretary + 1 Treasurer + 7 Councilors)
        const totalPossiblePositions = totalBarangays > 0 ? totalBarangays * 10 : 0;
        
        // If we couldn't get filled positions from vacancies (might be empty), use activeOfficials as fallback
        const finalFilledPositions = totalFilledPositions > 0 
          ? totalFilledPositions 
          : activeOfficials;

        const filledPercentage = totalPossiblePositions > 0 
          ? Math.round((finalFilledPositions / totalPossiblePositions) * 100) 
          : 0;

        console.log('📊 Position Filled Rate:', {
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
        console.warn('📊 No vacancy data received, using stats fallback');
        // Fallback: use stats if available
        const totalBarangays = 33; // Default to 33 barangays
        const totalPossiblePositions = totalBarangays * 10;
        const filledPositions = activeOfficials;
        const filledPercentage = totalPossiblePositions > 0 
          ? Math.round((filledPositions / totalPossiblePositions) * 100) 
          : 0;
        
        console.log('📊 Using fallback calculation:', {
          totalBarangays,
          totalPossiblePositions,
          filledPositions,
          filledPercentage
        });
        
        setSkBarangayCompletion({ completed: 0, total: totalBarangays, isLoading: false });
        setSkPositionFilledRate({ 
          filled: filledPositions, 
          total: totalPossiblePositions, 
          percentage: filledPercentage, 
          isLoading: false 
        });
      }
    } catch (error) {
      console.error('Error loading SK barangay completion:', error);
      setSkBarangayCompletion({ completed: 0, total: 0, isLoading: false });
      setSkPositionFilledRate({ filled: 0, total: 0, percentage: 0, isLoading: false });
    }
  };

  // Load SK barangay completion when active term changes
  useEffect(() => {
    if (hasActiveTerm && activeTerm) {
      loadSKBarangayCompletion();
    } else {
      setSkBarangayCompletion({ completed: 0, total: 0, isLoading: false });
      setSkPositionFilledRate({ filled: 0, total: 0, percentage: 0, isLoading: false });
    }
  }, [hasActiveTerm, activeTerm?.termId, stats.sk.activeOfficials, stats.sk.totalOfficials]);

  const fetchDashboardData = async () => {
    try {
      // Don't block the entire page, just show loading in content area
      setIsLoadingStats(true);
      
      // Update last refresh time
      setLastRefresh(new Date());
      
      // Fetch all dashboard data in parallel
      const [
        dashboardStatsResp,
        validationStatsResp,
        surveyStatsResp,
        recentActivityResp,
        barangaysResp,
        staffStatsResp,
        skStatsResp
      ] = await Promise.all([
        statisticsService.getAdminDashboardStatistics(),
        api.get('/validation-queue/stats').catch(() => ({ data: { success: false, data: null } })),
        surveyBatchesService.getDashboardStatistics().catch(() => ({ success: false, data: null })),
        activityService.getRecentActivity(10).catch(() => ({ success: false, data: [] })),
        api.get('/barangays?sortBy=youth_count&sortOrder=desc').catch(() => ({ data: { success: false, data: [] } })),
        staffService.getStaffStats().catch(() => ({ success: false, data: {} })),
        skService.getSKStatistics().catch(() => ({ success: false, data: {} }))
      ]);

      console.log('📊 Dashboard fetch results:', {
        barangays: barangaysResp?.data?.success,
        barangaysCount: barangaysResp?.data?.data?.length || 0
      });

      // Update dashboard statistics
      if (dashboardStatsResp?.success && dashboardStatsResp?.data) {
        setDashboardStats(dashboardStatsResp.data);
        const stats = dashboardStatsResp.data;
        
        // Update stats state with real data
        setStats({
          youth: {
            total: stats.youth?.total || 0,
            active: stats.youth?.active || 0,
            ageWarning: stats.youth?.ageWarning || 0,
            archived: stats.youth?.archived || 0,
            newThisMonth: stats.youth?.newThisMonth || 0,
            validationRate: stats.youth?.validationRate || 0,
            growthRate: stats.youth?.growthRate || 0,
            retentionRate: stats.youth?.retentionRate || 0,
            engagementScore: stats.youth?.engagementScore || 0,
            demographicDistribution: stats.youth?.demographicDistribution || {}
          },
          surveys: {
            active: stats.surveys?.activeBatches || 0,
            total: stats.surveys?.totalResponses || 0,
            pending: validationStatsResp?.data?.data?.pending || 0,
            completed: stats.surveys?.completedResponses || 0,
            completionRate: stats.surveys?.completionRate || 0,
            avgResponseTime: stats.surveys?.avgResponseTime || 0,
            responseRate: stats.surveys?.responseRate || 0,
            qualityScore: stats.surveys?.qualityScore || 0,
            satisfactionScore: stats.surveys?.satisfactionScore || 0,
            trendData: stats.surveys?.trendData || []
          },
          sk: {
            activeTerms: stats.sk?.activeTerms || 0,
            totalOfficials: stats.sk?.totalOfficials || 0,
            activeBarangays: stats.sk?.activeBarangays || 0,
            termCompletionRate: stats.sk?.termCompletionRate || 0,
            efficiencyScore: stats.sk?.efficiencyScore || 0,
            participationRate: stats.sk?.participationRate || 0,
            termPerformance: stats.sk?.termPerformance || {}
          },
          system: {
            announcements: stats.announcements?.total || 0,
            published: stats.announcements?.published || 0,
            drafts: stats.announcements?.drafts || 0,
            uptime: '99.9%',
            apiResponseTime: 120,
            databaseHealth: 'Healthy',
            activeUsers: stats.system?.activeUsers || 0,
            failedLogins: stats.system?.failedLogins || 0,
            errorRate: stats.system?.errorRate || 0,
            performanceScore: stats.system?.performanceScore || 0,
            reliabilityIndex: stats.system?.reliabilityIndex || 0,
            scalabilityRating: 'Excellent',
            securityScore: stats.system?.securityScore || 0
          },
          voters: {
            total: stats.voters?.total || 0,
            matched: stats.voters?.matched || 0,
            unmatched: stats.voters?.unmatched || 0,
            uploadSuccessRate: stats.voters?.uploadSuccessRate || 0,
            matchAccuracy: stats.voters?.matchAccuracy || 0,
            dataQualityScore: stats.voters?.dataQualityScore || 0,
            processingEfficiency: stats.voters?.processingEfficiency || 0
          },
          activity: {
            totalActivities: stats.activity?.totalActivities || 0,
            todayActivities: stats.activity?.todayActivities || 0,
            adminActions: stats.activity?.adminActions || 0,
            staffActions: stats.activity?.staffActions || 0,
            skActions: stats.activity?.skActions || 0,
            youthActions: stats.activity?.youthActions || 0,
            peakHours: stats.activity?.peakHours || '',
            mostActiveDay: stats.activity?.mostActiveDay || '',
            userEngagementTrend: stats.activity?.userEngagementTrend || 'stable',
            securityScore: stats.activity?.securityScore || 0
          }
        });
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

      // Update survey stats
      if (surveyStatsResp?.success && surveyStatsResp?.data) {
        const surveyData = surveyStatsResp.data;
        setStats(prev => ({
          ...prev,
          surveys: {
            ...prev.surveys,
            active: surveyData.activeBatches || prev.surveys.active,
            total: surveyData.totalResponses || prev.surveys.total
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

      // Update staff statistics
      if (staffStatsResp?.success && staffStatsResp?.data) {
        const staffData = staffStatsResp.data;
        setStats(prev => ({
          ...prev,
          staff: {
            ...prev.staff, // Preserve existing metrics (productivityScore, taskCompletionRate, etc.)
            total: staffData.total || 0,
            active: staffData.active || 0,
            deactivated: staffData.deactivated || 0,
            // Use API data if available, otherwise keep defaults
            productivityScore: staffData.productivityScore || prev.staff?.productivityScore || 88.9,
            taskCompletionRate: staffData.taskCompletionRate || prev.staff?.taskCompletionRate || 94.2
          }
        }));
      }

            // Update SK statistics
      if (skStatsResp?.success && skStatsResp?.data) {
        const skData = skStatsResp.data;
        const activeOfficials = skData.active || 0;
        const totalOfficials = skData.total || 0;
        
        console.log('📊 SK Statistics received:', { activeOfficials, totalOfficials, skData });
        
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
       
       // Note: activeTerm is loaded by useActiveTerm hook automatically

      // Update barangay options for filter dropdown
      if (barangaysResp?.data?.success && barangaysResp?.data?.data) {
        const barangays = Array.isArray(barangaysResp.data.data) 
          ? barangaysResp.data.data 
          : [];
        const barangayNames = ['All Barangays', ...barangays.map(b => b.barangay_name || b.name).filter(Boolean)];
        setBarangayOptions(barangayNames);
      }

      // Load barangay distribution for horizontal stacked chart
      const loadBarangayDistribution = async () => {
        if (barangaysResp?.data?.success && barangaysResp?.data?.data) {
          const barangays = Array.isArray(barangaysResp.data.data) 
            ? barangaysResp.data.data 
            : [];
          
          // Get top 10 barangays by youth count
          const topBarangays = barangays
            .slice(0, 10)
            .sort((a, b) => (parseInt(b.youth_count || b.youthCount || 0)) - (parseInt(a.youth_count || a.youthCount || 0)));
          
          // Fetch gender data for each barangay
          const chartData = await Promise.all(
            topBarangays.map(async (barangay) => {
              try {
                const barangayId = barangay.barangay_id || barangay.id;
                if (!barangayId) {
                  // Fallback: use estimated 50/50 split
                  const total = Number(parseInt(barangay.youth_count || barangay.youthCount || 0, 10));
                  return total > 0 ? {
                    name: String(barangay.barangay_name || barangay.name || 'Unknown'),
                    Male: Number(Math.floor(total * 0.5)),
                    Female: Number(Math.ceil(total * 0.5))
                  } : null;
                }
                
                const genderResp = await api.get(`/barangays/${barangayId}`).catch(() => null);
                if (genderResp?.data?.success && genderResp?.data?.data?.statistics?.youth) {
                  const stats = genderResp.data.data.statistics.youth;
                  const male = Number(parseInt(stats.male_count || 0, 10));
                  const female = Number(parseInt(stats.female_count || 0, 10));
                  return {
                    name: String(barangay.barangay_name || barangay.name || 'Unknown'),
                    Male: male,
                    Female: female
                  };
                }
                
                // Fallback: use estimated 50/50 split
                const total = Number(parseInt(barangay.youth_count || barangay.youthCount || 0, 10));
                return total > 0 ? {
                  name: String(barangay.barangay_name || barangay.name || 'Unknown'),
                  Male: Number(Math.floor(total * 0.5)),
                  Female: Number(Math.ceil(total * 0.5))
                } : null;
              } catch (error) {
                // Fallback: use estimated 50/50 split
                const total = Number(parseInt(barangay.youth_count || barangay.youthCount || 0, 10));
                return total > 0 ? {
                  name: String(barangay.barangay_name || barangay.name || 'Unknown'),
                  Male: Number(Math.floor(total * 0.5)),
                  Female: Number(Math.ceil(total * 0.5))
                } : null;
              }
            })
          );
          
          // Ensure all values are numbers and filter valid data - preserve Male and Female
          const validData = chartData
            .filter(Boolean)
            .map(item => {
              const male = Number(item.Male) || 0;
              const female = Number(item.Female) || 0;
              const total = male + female;
              return {
                name: String(item.name || 'Unknown'),
                Male: male,
                Female: female,
                count: total
              };
            })
            .filter(item => item.count > 0)
            .sort((a, b) => b.count - a.count);
          
          console.log('📊 Raw chartData:', chartData);
          console.log('📊 Valid data:', validData);
          console.log('📊 First item details:', validData[0] ? {
            name: validData[0].name,
            count: validData[0].count,
            countType: typeof validData[0].count,
            countIsNumber: typeof validData[0].count === 'number'
          } : 'No data');
          
          if (validData.length > 0) {
            console.log('✅ Setting barangay distribution with', validData.length, 'items');
            setBarangayDistribution(validData);
          } else {
            console.warn('⚠️ No valid barangay distribution data');
            // Set empty array explicitly
            setBarangayDistribution([]);
          }
        }
      };
      
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
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  // Fetch active survey batch and its responses
  const fetchActiveSurvey = async () => {
    try {
      setIsLoadingActiveSurvey(true);
      
      // Get active survey batches
      const batchesResp = await surveyBatchesService.getSurveyBatches({
        status: 'active',
        limit: 1,
        includeStats: true
      });

      if (batchesResp?.success && batchesResp?.data?.data?.length > 0) {
        const activeBatch = batchesResp.data.data[0];
        setActiveSurveyBatch(activeBatch);

        // Fetch responses for the active batch
        const responsesResp = await surveyBatchesService.getBatchResponses(activeBatch.batchId || activeBatch.batch_id, {
          limit: 10000 // High limit to get all responses
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
      console.error('Error fetching active survey:', error);
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

  // Apply filters function
  const applyFilters = () => {
    console.log('Filters applied:', { searchQuery, selectedBarangay, dateRange });
    
    // Filter barangay distribution data
    if (selectedBarangay && selectedBarangay !== 'All Barangays') {
      // Filter the chart data by selected barangay
      const filtered = barangayDistribution.filter(item => 
        item.name.toLowerCase().includes(selectedBarangay.toLowerCase())
      );
      setFilteredData({ barangayDistribution: filtered });
    } else {
      setFilteredData(null);
    }
    
    // Note: Search and date range filters would require backend API calls
    // For now, we'll just filter the local barangay distribution
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
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition" onClick={onClick}>
        {/* Header with gradient */}
        <div className={`px-5 py-3 bg-gradient-to-r ${colors.grad} border-b border-gray-100`}>
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
        <div className="p-5">
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
          <Button size="sm" onClick={() => window.location.href = '/admin/survey/validation'}>
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

  // Barangay options for filter - populated from real data
  const [barangayOptions, setBarangayOptions] = useState(['All Barangays']);

  // Filter and Search Component
  const FilterAndSearch = () => (
    <div className="mb-6">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search Bar */}
        <div className="flex-1">
          <div className="relative">
            <input
              type="text"
              placeholder="Search users, surveys, or any data..."
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

        {/* Barangay Filter */}
        <div className="lg:w-64">
          <select
            value={selectedBarangay}
            onChange={(e) => setSelectedBarangay(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
          >
            {barangayOptions.map((barangay) => (
              <option key={barangay} value={barangay}>
                {barangay}
              </option>
            ))}
          </select>
        </div>

        {/* Date Range Filter */}
        <div className="lg:w-48">
          <input
            type="date"
            value={dateRange.from}
            onChange={(e) => setDateRange({...dateRange, from: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            placeholder="From Date"
          />
        </div>

        <div className="lg:w-48">
          <input
            type="date"
            value={dateRange.to}
            onChange={(e) => setDateRange({...dateRange, to: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            placeholder="To Date"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedBarangay('All Barangays');
              setDateRange({ from: '', to: '' });
              setFilteredData(null);
              fetchDashboardData();
            }}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          >
            Clear
          </button>
          <button
            onClick={() => {
              console.log('Applying filters:', { searchQuery, selectedBarangay, dateRange });
              // Filter data based on selections
              applyFilters();
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          >
            Apply
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

    return (
    <div className="space-y-8">
      {/* Executive Summary KPIs - 6 cards on left (3 rows, 2 columns), chart on right */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left side - 6 cards in 3 rows × 2 columns grid */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-6">
        <StatCard
          title="Total Staff"
          value={stats.staff.total.toLocaleString()}
          icon={UserCheck}
          color="blue"
          subtitle="Total Staff Members"
          insights="Total staff members in the system"
          onClick={() => navigate('/admin/users/lydo-staff')}
        />
        <StatCard
          title="Active Staff"
          value={stats.staff.active.toLocaleString()}
          icon={UserCheck}
          color="green"
          subtitle="Active Staff Members"
          insights="Active staff members in the system"
          onClick={() => navigate('/admin/users/lydo-staff')}
        />
        <StatCard
          title="Current SK Term"
          value={hasActiveTerm && activeTerm ? (activeTerm.termName || 'N/A') : 'No Active Term'}
          icon={Calendar}
          color="indigo"
          subtitle={hasActiveTerm && activeTerm ? "Active Term" : 'No active term available'}
          trend={hasActiveTerm && activeTerm ? `${activeTerm.startDate ? new Date(activeTerm.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'} - ${activeTerm.endDate ? new Date(activeTerm.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}` : ''}
          insights={hasActiveTerm && activeTerm ? `${activeTerm.startDate ? new Date(activeTerm.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'} - ${activeTerm.endDate ? new Date(activeTerm.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}` : 'No active SK term'}
          onClick={() => navigate('/admin/sk-governance/terms')}
        />
        <StatCard
          title="Completion of SK Officials"
          value={`${skBarangayCompletion.completed}/${skBarangayCompletion.total}`}
          icon={CheckCircle2}
          color="green"
          subtitle="Barangays with Full Officials"
          insights={skBarangayCompletion.total > 0 ? `${skBarangayCompletion.completed} out of ${skBarangayCompletion.total} barangays have all positions filled` : 'No data available'}
          onClick={() => navigate('/admin/users/sk-officials')}
        />
        <StatCard
          title="Filled Rate of Position"
          value={`${skPositionFilledRate.percentage}%`}
          icon={TrendingUp}
          color="blue"
          subtitle="Position Fill Rate"
          insights={skPositionFilledRate.total > 0 ? `${skPositionFilledRate.filled} out of ${skPositionFilledRate.total} positions filled across all barangays` : 'No data available'}
          onClick={() => navigate('/admin/users/sk-officials')}
        />
        <StatCard
          title="Current SK Users"
          value={hasActiveTerm ? (stats.sk.activeOfficials || stats.sk.totalOfficials || 0).toLocaleString() : '0'}
          icon={Users}
          color="teal"
          subtitle="Based on Active Term"
          insights={hasActiveTerm ? `SK officials for ${activeTerm?.termName || 'current term'}` : 'No active term'}
          onClick={() => navigate('/admin/users/sk-officials')}
        />
        </div>
        
        {/* Right side - Chart spanning 2 columns (same width as before) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <MapPin className="w-4 h-4 text-blue-600" />
              </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Youth Distribution by Barangay</h3>
                  <p className="text-xs text-gray-600">Top 10 barangays by gender</p>
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
              <div className="flex items-center justify-center h-[450px]">
                <div className="text-center">
                  <MapPin className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-xs text-gray-600 font-medium">No data available</p>
                </div>
              </div>
            )}
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
                onClick={() => navigate('/admin/survey/batches')}
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
                onClick={() => window.location.href = '/admin/sk-governance/terms'}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                View Terms
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <QuickAction
              title="Create Survey Batch"
              icon={Plus}
              onClick={() => navigate('/admin/survey/batches')}
              description="Create a new survey batch for data collection"
            />
            <QuickAction
              title="Post Announcement"
              icon={Bell}
              onClick={() => navigate('/admin/announcements/create')}
              color="blue"
              description="Create and publish a new announcement"
            />
            <QuickAction
              title="View Validation Queue"
              icon={Eye}
              onClick={() => navigate('/admin/survey/validation')}
              color="yellow"
              description="Review pending survey validations"
            />
            <QuickAction
              title="Export Reports"
              icon={Download}
              onClick={() => navigate('/admin/reports/generator')}
              color="purple"
              description="Export system data and analytics"
            />
          </div>
        </Card>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Age Warnings"
          value={stats.youth.ageWarning}
          icon={AlertCircle}
          color="orange"
          subtitle="Youth turning 30 soon"
          onClick={() => navigate('/admin/users/youth?filter=age_warning')}
        />
        <StatCard
          title="Pending Validations"
          value={validationQueue.pending}
          icon={Clock}
          color="yellow"
          subtitle="Requires review"
          onClick={() => navigate('/admin/survey/validation')}
        />
        <StatCard
          title="Announcements"
          value={stats.system.announcements}
          icon={Bell}
          color="indigo"
          subtitle={`${stats.system.published} published`}
          onClick={() => navigate('/admin/announcements')}
        />
        <StatCard
          title="Active Users"
          value={stats.system.activeUsers}
          icon={UserCheck}
          color="teal"
          subtitle="Currently online"
          onClick={() => navigate('/admin/system/audit-logs')}
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
              onClick={() => navigate('/admin/system/audit-logs')}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
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
        title="Admin Dashboard"
        description="Comprehensive overview of the LYDO Youth Governance System"
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

export default AdminDashboard;