import React, { useEffect, useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';

// Import components
import LoadingScreen from '../components/LoadingScreen';
import useLoading from '../hooks/useLoading';
import { useAuth } from '../context/AuthContext';
import { getDashboardRoute, shouldAutoRedirect, isPublicRoute } from '../utils/routeHelpers';
import PublicRouteGuard from '../components/PublicRouteGuard';

import Home from '../pages/public/Home';
import About from '../pages/public/About';
import SKOfficials from '../pages/public/SKOfficials';
import SurveyLanding from '../pages/public/survey/SurveyLanding';
import SurveyTerms from '../pages/public/survey/SurveyTerms';
import SurveyStep1 from '../pages/public/survey/SurveyStep1';
import SurveyStep2 from '../pages/public/survey/SurveyStep2';
import SurveyStep3 from '../pages/public/survey/SurveyStep3';
import SurveyReview from '../pages/public/survey/SurveyReview';
import SurveyThankYou from '../pages/public/survey/SurveyThankYou';
import LYDOCouncil from '../pages/public/LYDOCouncil';
import Login from '../pages/public/Login';
import Programs from '../pages/public/Announcements';
import ProgramDetail from '../pages/public/AnnouncementDetail';
import ProgramsThisMonth from '../pages/public/ProgramsThisMonth';
import FeaturedPrograms from '../pages/public/FeaturedPrograms';
import Barangays from '../pages/public/Barangays';

import AdminStack from './AdminStack';
import StaffStack from './StaffStack';
import SKStack from './SKStack';
import NotFound from '../pages/errors/NotFound';
import ServerError from '../pages/errors/ServerError';
import Unauthorized from '../pages/errors/Unauthorized';

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
    console.log('🔍 RootNavigator Auth State:', {
      showLoading,
      authLoading,
      isAuthenticated,
      user: user ? { 
        id: user.id, 
        userType: user.userType || user.user_type, 
        role: user.role,
        email: user.email 
      } : null,
      currentPath: location.pathname
    });
  }, [showLoading, authLoading, isAuthenticated, user, location.pathname]);

  // SIMPLIFIED Auto-redirect logic: Only redirect authenticated users from login page
  useEffect(() => {
    console.log('🔍 RootNavigator redirect check:', {
      showLoading,
      authLoading,
      isAuthenticated,
      user: user ? { id: user.id, userType: user.userType || user.user_type } : null,
      currentPath: location.pathname,
      shouldRedirect: !showLoading && !authLoading && isAuthenticated && user && location.pathname === '/login'
    });
    
    // Only redirect after loading is complete and user is authenticated
    if (!showLoading && !authLoading && isAuthenticated && user && location.pathname === '/login') {
      const dashboardRoute = getDashboardRoute(user);
      console.log(`🔄 Redirecting authenticated user from login to: ${dashboardRoute}`);
      navigate(dashboardRoute, { replace: true });
    }
  }, [showLoading, authLoading, isAuthenticated, user, location.pathname, navigate]);

  // REMOVED: Aggressive popstate blocking that was causing refresh issues

  // SIMPLIFIED: Only block unauthorized dashboard access
  useEffect(() => {
    console.log('🔍 RootNavigator dashboard access check:', {
      isAuthenticated,
      user: user ? { userType: user.userType || user.user_type } : null,
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
        console.log(`🚫 Redirecting ${userType} from admin to ${dashboardRoute}`);
        navigate(dashboardRoute, { replace: true });
      } else if (currentPath.startsWith('/staff') && userType !== 'lydo_staff') {
        console.log(`🚫 Redirecting ${userType} from staff to ${dashboardRoute}`);
        navigate(dashboardRoute, { replace: true });
      } else if (currentPath.startsWith('/sk') && userType !== 'sk_official') {
        console.log(`🚫 Redirecting ${userType} from sk to ${dashboardRoute}`);
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
    <Routes>
      {/* Public Pages - PROTECTED by PublicRouteGuard */}
      <Route path="/" element={
        <PublicRouteGuard>
          <Home />
        </PublicRouteGuard>
      } />
      <Route path="/about" element={
        <PublicRouteGuard>
          <About />
        </PublicRouteGuard>
      } />
      <Route path="/programs" element={
        <PublicRouteGuard>
          <Programs />
        </PublicRouteGuard>
      } />
      <Route path="/programs/this-month" element={
        <PublicRouteGuard>
          <ProgramsThisMonth />
        </PublicRouteGuard>
      } />
      <Route path="/programs/featured" element={
        <PublicRouteGuard>
          <FeaturedPrograms />
        </PublicRouteGuard>
      } />
      <Route path="/programs/:id" element={
        <PublicRouteGuard>
          <ProgramDetail />
        </PublicRouteGuard>
      } />
      <Route path="/sk-officials" element={
        <PublicRouteGuard>
          <SKOfficials />
        </PublicRouteGuard>
      } />
      <Route path="/kk-survey" element={
        <PublicRouteGuard>
          <SurveyLanding />
        </PublicRouteGuard>
      } />
      <Route path="/kk-survey/step-1" element={
        <PublicRouteGuard>
          <SurveyTerms />
        </PublicRouteGuard>
      } />
      <Route path="/kk-survey/step-2" element={
        <PublicRouteGuard>
          <SurveyStep1 />
        </PublicRouteGuard>
      } />
      <Route path="/kk-survey/step-3" element={
        <PublicRouteGuard>
          <SurveyStep2 />
        </PublicRouteGuard>
      } />
      <Route path="/kk-survey/step-4" element={
        <PublicRouteGuard>
          <SurveyStep3 />
        </PublicRouteGuard>
      } />
      <Route path="/kk-survey/step-5" element={
        <PublicRouteGuard>
          <SurveyReview />
        </PublicRouteGuard>
      } />
      <Route path="/kk-survey/thank-you" element={
        <PublicRouteGuard>
          <SurveyThankYou />
        </PublicRouteGuard>
      } />
      <Route path="/lydo-council" element={
        <PublicRouteGuard>
          <LYDOCouncil />
        </PublicRouteGuard>
      } />
      <Route path="/barangays" element={
        <PublicRouteGuard>
          <Barangays />
        </PublicRouteGuard>
      } />
      <Route path="/login" element={
        <PublicRouteGuard>
          <Login />
        </PublicRouteGuard>
      } />
      
      {/* Role-based Dashboard Routes */}
      <Route path="/admin/*" element={<AdminStack />} />
      <Route path="/staff/*" element={<StaffStack />} />
      <Route path="/sk/*" element={<SKStack />} />
      
      {/* Error Pages */}
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="/500" element={<ServerError />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default RootNavigator; 