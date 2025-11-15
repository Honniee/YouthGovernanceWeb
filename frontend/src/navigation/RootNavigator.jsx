import React, { useEffect, useState, Suspense, lazy } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';

// Import components
import LoadingScreen from '../components/LoadingScreen';
import ScrollToTop from '../components/ScrollToTop';
import useLoading from '../hooks/useLoading';
import { useAuth } from '../context/AuthContext';
import { getDashboardRoute, shouldAutoRedirect, isPublicRoute } from '../utils/routeHelpers';
import PublicRouteGuard from '../components/PublicRouteGuard';
import LazyLoadingFallback from '../components/LazyLoadingFallback';
import logger from '../utils/logger.js';

// Lazy load public pages
const Home = lazy(() => import('../pages/public/Home'));
const About = lazy(() => import('../pages/public/About'));
const SKOfficials = lazy(() => import('../pages/public/SKOfficials'));
const LYDOCouncil = lazy(() => import('../pages/public/LYDOCouncil'));
const Login = lazy(() => import('../pages/public/Login'));
const Barangays = lazy(() => import('../pages/public/Barangays'));
const Programs = lazy(() => import('../pages/public/Announcements'));
const ProgramDetail = lazy(() => import('../pages/public/AnnouncementDetail'));
const ProgramsThisMonth = lazy(() => import('../pages/public/ProgramsThisMonth'));
const FeaturedPrograms = lazy(() => import('../pages/public/FeaturedPrograms'));
const DataSubjectRights = lazy(() => import('../pages/public/DataSubjectRights'));
const DataSubjectRightsStatus = lazy(() => import('../pages/public/DataSubjectRightsStatus'));
const SurveySubmissionStatus = lazy(() => import('../pages/public/SurveySubmissionStatus'));

// Lazy load survey pages (grouped together)
const SurveyLanding = lazy(() => import('../pages/public/survey/SurveyLanding'));
const SurveyTerms = lazy(() => import('../pages/public/survey/SurveyTerms'));
const SurveyStep1 = lazy(() => import('../pages/public/survey/SurveyStep1'));
const SurveyStep2 = lazy(() => import('../pages/public/survey/SurveyStep2'));
const SurveyStep3 = lazy(() => import('../pages/public/survey/SurveyStep3'));
const SurveyReview = lazy(() => import('../pages/public/survey/SurveyReview'));
const SurveyThankYou = lazy(() => import('../pages/public/survey/SurveyThankYou'));

// Lazy load stacks
const AdminStack = lazy(() => import('./AdminStack'));
const StaffStack = lazy(() => import('./StaffStack'));
const SKStack = lazy(() => import('./SKStack'));

// Lazy load error pages
const NotFound = lazy(() => import('../pages/errors/NotFound'));
const ServerError = lazy(() => import('../pages/errors/ServerError'));
const Unauthorized = lazy(() => import('../pages/errors/Unauthorized'));

const RootNavigator = () => {
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Smart loading logic: show loading until auth is ready OR minimum time
  const [showLoading, setShowLoading] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLoading(false);
    }, 2000); // Reduced to 2 seconds for better UX

    // If authentication is complete, stop loading immediately
    if (!authLoading && (isAuthenticated || !user)) {
      setShowLoading(false);
      clearTimeout(timer);
    }

    return () => clearTimeout(timer);
  }, [authLoading, isAuthenticated, user]);

  // Debug logging for authentication state
  useEffect(() => {
    logger.debug('RootNavigator Auth State', {
      showLoading,
      authLoading,
      isAuthenticated,
      userId: user?.id,
      userType: user?.userType || user?.user_type,
      role: user?.role,
      currentPath: location.pathname
    });
  }, [showLoading, authLoading, isAuthenticated, user, location.pathname]);

  // SIMPLIFIED Auto-redirect logic: Only redirect authenticated users from login page
  useEffect(() => {
    const shouldRedirect = !showLoading && !authLoading && isAuthenticated && user && location.pathname === '/login';
    logger.debug('RootNavigator redirect check', {
      showLoading,
      authLoading,
      isAuthenticated,
      userId: user?.id,
      userType: user?.userType || user?.user_type,
      currentPath: location.pathname,
      shouldRedirect
    });
    
    // Only redirect after loading is complete and user is authenticated
    if (shouldRedirect) {
      const dashboardRoute = getDashboardRoute(user);
      logger.debug(`Redirecting authenticated user from login to: ${dashboardRoute}`, { dashboardRoute });
      navigate(dashboardRoute, { replace: true });
    }
  }, [showLoading, authLoading, isAuthenticated, user, location.pathname, navigate]);

  // REMOVED: Aggressive popstate blocking that was causing refresh issues

  // SIMPLIFIED: Only block unauthorized dashboard access
  useEffect(() => {
    logger.debug('RootNavigator dashboard access check', {
      isAuthenticated,
      userType: user?.userType || user?.user_type,
      authLoading,
      showLoading,
      currentPath: location.pathname
    });
    
    if (isAuthenticated && user && !authLoading && !showLoading) {
      const currentPath = location.pathname;
      const userType = user.userType || user.user_type;
      const dashboardRoute = getDashboardRoute(user);
      
      // Only redirect if user is on wrong dashboard route
      if (currentPath.startsWith('/admin') && userType !== 'admin') {
        logger.debug(`Redirecting ${userType} from admin to ${dashboardRoute}`, { userType, dashboardRoute });
        navigate(dashboardRoute, { replace: true });
      } else if (currentPath.startsWith('/staff') && userType !== 'lydo_staff') {
        logger.debug(`Redirecting ${userType} from staff to ${dashboardRoute}`, { userType, dashboardRoute });
        navigate(dashboardRoute, { replace: true });
      } else if (currentPath.startsWith('/sk') && userType !== 'sk_official') {
        logger.debug(`Redirecting ${userType} from sk to ${dashboardRoute}`, { userType, dashboardRoute });
        navigate(dashboardRoute, { replace: true });
      }
    }
  }, [isAuthenticated, user, authLoading, showLoading, location.pathname, navigate]);

  // Show loading screen while app initializes or auth is loading
  // But don't show it on login page to avoid interference
  if ((showLoading || authLoading) && location.pathname !== '/login') {
    return <LoadingScreen />;
  }

  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* Public Pages - PROTECTED by PublicRouteGuard */}
        <Route path="/" element={
          <PublicRouteGuard>
            <Suspense fallback={<LoadingScreen />}>
              <Home />
            </Suspense>
          </PublicRouteGuard>
        } />
        <Route path="/about" element={
          <PublicRouteGuard>
            <Suspense fallback={<LoadingScreen />}>
              <About />
            </Suspense>
          </PublicRouteGuard>
        } />
        <Route path="/programs" element={
          <PublicRouteGuard>
            <Suspense fallback={<LoadingScreen />}>
              <Programs />
            </Suspense>
          </PublicRouteGuard>
        } />
        <Route path="/programs/this-month" element={
          <PublicRouteGuard>
            <Suspense fallback={<LoadingScreen />}>
              <ProgramsThisMonth />
            </Suspense>
          </PublicRouteGuard>
        } />
        <Route path="/programs/featured" element={
          <PublicRouteGuard>
            <Suspense fallback={<LoadingScreen />}>
              <FeaturedPrograms />
            </Suspense>
          </PublicRouteGuard>
        } />
        <Route path="/programs/:id" element={
          <PublicRouteGuard>
            <Suspense fallback={<LoadingScreen />}>
              <ProgramDetail />
            </Suspense>
          </PublicRouteGuard>
        } />
        <Route path="/sk-officials" element={
          <PublicRouteGuard>
            <Suspense fallback={<LoadingScreen />}>
              <SKOfficials />
            </Suspense>
          </PublicRouteGuard>
        } />
        <Route path="/kk-survey" element={
          <PublicRouteGuard>
            <Suspense fallback={<LoadingScreen message="Loading survey..." />}>
              <SurveyLanding />
            </Suspense>
          </PublicRouteGuard>
        } />
        <Route path="/kk-survey/step-1" element={
          <PublicRouteGuard>
            <Suspense fallback={<LoadingScreen message="Loading survey terms..." />}>
              <SurveyTerms />
            </Suspense>
          </PublicRouteGuard>
        } />
        <Route path="/kk-survey/step-2" element={
          <PublicRouteGuard>
            <Suspense fallback={<LoadingScreen message="Loading survey..." />}>
              <SurveyStep1 />
            </Suspense>
          </PublicRouteGuard>
        } />
        <Route path="/kk-survey/step-3" element={
          <PublicRouteGuard>
            <Suspense fallback={<LoadingScreen message="Loading survey..." />}>
              <SurveyStep2 />
            </Suspense>
          </PublicRouteGuard>
        } />
        <Route path="/kk-survey/step-4" element={
          <PublicRouteGuard>
            <Suspense fallback={<LoadingScreen message="Loading survey..." />}>
              <SurveyStep3 />
            </Suspense>
          </PublicRouteGuard>
        } />
        <Route path="/kk-survey/step-5" element={
          <PublicRouteGuard>
            <Suspense fallback={<LoadingScreen message="Loading review..." />}>
              <SurveyReview />
            </Suspense>
          </PublicRouteGuard>
        } />
        <Route path="/kk-survey/thank-you" element={
          <PublicRouteGuard>
            <Suspense fallback={<LoadingScreen message="Loading..." />}>
              <SurveyThankYou />
            </Suspense>
          </PublicRouteGuard>
        } />
        <Route path="/lydo-council" element={
          <PublicRouteGuard>
            <Suspense fallback={<LoadingScreen />}>
              <LYDOCouncil />
            </Suspense>
          </PublicRouteGuard>
        } />
        <Route path="/barangays" element={
          <PublicRouteGuard>
            <Suspense fallback={<LoadingScreen />}>
              <Barangays />
            </Suspense>
          </PublicRouteGuard>
        } />
        <Route path="/login" element={
          <PublicRouteGuard>
            <Suspense fallback={null}>
              <Login />
            </Suspense>
          </PublicRouteGuard>
        } />
        <Route path="/data-subject-rights" element={
          <PublicRouteGuard>
            <Suspense fallback={<LoadingScreen />}>
              <DataSubjectRights />
            </Suspense>
          </PublicRouteGuard>
        } />
        <Route path="/data-subject-rights/status" element={
          <PublicRouteGuard>
            <Suspense fallback={<LoadingScreen />}>
              <DataSubjectRightsStatus />
            </Suspense>
          </PublicRouteGuard>
        } />
        <Route path="/survey-submission/status" element={
          <PublicRouteGuard>
            <Suspense fallback={<LoadingScreen />}>
              <SurveySubmissionStatus />
            </Suspense>
          </PublicRouteGuard>
        } />
        
        {/* Role-based Dashboard Routes */}
        <Route path="/admin/*" element={
          <Suspense fallback={<LoadingScreen />}>
            <AdminStack />
          </Suspense>
        } />
        <Route path="/staff/*" element={
          <Suspense fallback={<LoadingScreen />}>
            <StaffStack />
          </Suspense>
        } />
        <Route path="/sk/*" element={
          <Suspense fallback={<LoadingScreen />}>
            <SKStack />
          </Suspense>
        } />
        
        {/* Error Pages */}
        <Route path="/unauthorized" element={
          <Suspense fallback={<LoadingScreen />}>
            <Unauthorized />
          </Suspense>
        } />
        <Route path="/500" element={
          <Suspense fallback={<LoadingScreen />}>
            <ServerError />
          </Suspense>
        } />
        <Route path="*" element={
          <Suspense fallback={<LoadingScreen />}>
            <NotFound />
          </Suspense>
        } />
      </Routes>
    </>
  );
};

export default RootNavigator; 