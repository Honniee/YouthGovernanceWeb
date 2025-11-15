import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';

// Staff Layout
import StaffLayout from '../components/layouts/StaffLayout';
import ProtectedRoute from '../components/ProtectedRoute';
import LoadingScreen from '../components/LoadingScreen';

// Lazy load Staff Pages
const StaffDashboard = lazy(() => import('../pages/staff/StaffDashboard'));








const StaffProfile = lazy(() => import('../pages/staff/StaffProfile'));
const ChangePassword = lazy(() => import('../pages/staff/ChangePassword'));
const Notifications = lazy(() => import('../pages/staff/Notifications'));
const Announcements = lazy(() => import('../pages/staff/Announcements'));
const AnnouncementCreate = lazy(() => import('../pages/staff/AnnouncementCreate'));
const AnnouncementEdit = lazy(() => import('../pages/staff/AnnouncementEdit'));
const AnnouncementDetail = lazy(() => import('../pages/staff/AnnouncementDetail'));
const AnnouncementsFeatured = lazy(() => import('../pages/staff/AnnouncementsFeatured'));
const SurveyBatches = lazy(() => import('../pages/staff/SurveyBatch'));
const SurveyBatchReport = lazy(() => import('../pages/staff/SurveyBatchReport'));
const SKTerms = lazy(() => import('../pages/staff/SKTerms'));
const SKTermReport = lazy(() => import('../pages/staff/SKTermReport'));
const PortalNotFound = lazy(() => import('../components/porrtal/PortalNotFound'));

const StaffStack = () => {
  return (
    <ProtectedRoute requiredRole="lydo_staff">
    <StaffLayout>
      <Routes>
        <Route path="/" element={
          <Suspense fallback={<LoadingScreen />}>
            <StaffDashboard />
          </Suspense>
        } />
        <Route path="/dashboard" element={
          <Suspense fallback={<LoadingScreen />}>
            <StaffDashboard />
          </Suspense>
        } />
        {/* User management and admin-only routes removed for staff */}

        {/* Staff Announcements */}
        <Route path="/announcements" element={
          <Suspense fallback={<LoadingScreen />}>
            <Announcements />
          </Suspense>
        } />
        <Route path="/announcements/create" element={
          <Suspense fallback={<LoadingScreen />}>
            <AnnouncementCreate />
          </Suspense>
        } />
        <Route path="/announcements/:id/edit" element={
          <Suspense fallback={<LoadingScreen />}>
            <AnnouncementEdit />
          </Suspense>
        } />
        <Route path="/announcements/:id" element={
          <Suspense fallback={<LoadingScreen />}>
            <AnnouncementDetail />
          </Suspense>
        } />
        <Route path="/announcements/featured" element={
          <Suspense fallback={<LoadingScreen />}>
            <AnnouncementsFeatured />
          </Suspense>
        } />
        <Route path="/profile" element={
          <Suspense fallback={<LoadingScreen />}>
            <StaffProfile />
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
        
        {/* Survey Batch Routes */}
        <Route path="/survey/batches" element={
          <Suspense fallback={<LoadingScreen />}>
            <SurveyBatches />
          </Suspense>
        } />
        <Route path="/survey/batches/batch-report" element={
          <Suspense fallback={<LoadingScreen />}>
            <SurveyBatchReport />
          </Suspense>
        } />
        
        {/* SK Governance (view-only for staff) */}
        <Route path="/sk-governance/terms" element={
          <Suspense fallback={<LoadingScreen />}>
            <SKTerms />
          </Suspense>
        } />
        <Route path="/sk-governance/term-report" element={
          <Suspense fallback={<LoadingScreen />}>
            <SKTermReport />
          </Suspense>
        } />
        
        {/* Fallback for unknown routes under /staff */}
        <Route path="*" element={
          <Suspense fallback={<LoadingScreen />}>
            <PortalNotFound homePath="/staff/dashboard" />
          </Suspense>
        } />
      </Routes>
    </StaffLayout>
    </ProtectedRoute>
  );
};

export default StaffStack; 