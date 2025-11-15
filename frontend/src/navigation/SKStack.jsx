import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';

// SK Layout
import SKLayout from '../components/layouts/SKLayout';
import ProtectedRoute from '../components/ProtectedRoute';
import LoadingScreen from '../components/LoadingScreen';

// Lazy load SK Pages
const SKDashboard = lazy(() => import('../pages/sk/SKDashboard'));
const SKProfile = lazy(() => import('../pages/sk/SKProfile'));
const ChangePassword = lazy(() => import('../pages/sk/ChangePassword'));
const Notifications = lazy(() => import('../pages/sk/Notifications'));
const ValidationQueue = lazy(() => import('../pages/sk/ValidationQueue'));
const Announcements = lazy(() => import('../pages/sk/Announcements'));
const AnnouncementDetail = lazy(() => import('../pages/sk/AnnouncementDetail'));
const AnnouncementsFeatured = lazy(() => import('../pages/sk/AnnouncementsFeatured'));
const SurveyBatch = lazy(() => import('../pages/sk/SurveyBatch'));
const SurveyBatchReport = lazy(() => import('../pages/sk/SurveyBatchReport'));
const PortalNotFound = lazy(() => import('../components/porrtal/PortalNotFound'));

const SKStack = () => {
  return (
    <ProtectedRoute requiredRole="sk_official">
    <SKLayout>
      <Routes>
        <Route path="/" element={
          <Suspense fallback={<LoadingScreen />}>
            <SKDashboard />
          </Suspense>
        } />
        <Route path="/dashboard" element={
          <Suspense fallback={<LoadingScreen />}>
            <SKDashboard />
          </Suspense>
        } />
        <Route path="/profile" element={
          <Suspense fallback={<LoadingScreen />}>
            <SKProfile />
          </Suspense>
        } />
        <Route path="/change-password" element={
          <Suspense fallback={<LoadingScreen />}>
            <ChangePassword />
          </Suspense>
        } />
        <Route path="/notifications" element={
          <Suspense fallback={<LoadingScreen />}>
            <Notifications />
          </Suspense>
        } />
        <Route path="/survey/validation" element={
          <Suspense fallback={<LoadingScreen />}>
            <ValidationQueue />
          </Suspense>
        } />
        
        {/* Announcements */}
        <Route path="/announcements" element={
          <Suspense fallback={<LoadingScreen />}>
            <Announcements />
          </Suspense>
        } />
        <Route path="/announcements/featured" element={
          <Suspense fallback={<LoadingScreen />}>
            <AnnouncementsFeatured />
          </Suspense>
        } />
        <Route path="/announcements/:id" element={
          <Suspense fallback={<LoadingScreen />}>
            <AnnouncementDetail />
          </Suspense>
        } />
        
        {/* Survey Batch Routes */}
        <Route path="/survey/batches" element={
          <Suspense fallback={<LoadingScreen />}>
            <SurveyBatch />
          </Suspense>
        } />
        <Route path="/survey/batches/batch-report" element={
          <Suspense fallback={<LoadingScreen />}>
            <SurveyBatchReport />
          </Suspense>
        } />
        
        {/* Fallback for unknown routes under /sk */}
        <Route path="*" element={
          <Suspense fallback={<LoadingScreen />}>
            <PortalNotFound homePath="/sk/dashboard" />
          </Suspense>
        } />
      </Routes>
    </SKLayout>
    </ProtectedRoute>
  );
};

export default SKStack; 