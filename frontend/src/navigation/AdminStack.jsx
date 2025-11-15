import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';

// Admin Layout
import AdminLayout from '../components/layouts/AdminLayout';
import ProtectedRoute from '../components/ProtectedRoute';
import LoadingScreen from '../components/LoadingScreen';

// Lazy load Admin Pages
const AdminDashboard = lazy(() => import('../pages/admin/AdminDashboard'));
const StaffManagement = lazy(() => import('../pages/admin/StaffManagement'));
const SKManagement = lazy(() => import('../pages/admin/SKManagement'));
const YouthManagement = lazy(() => import('../pages/admin/YouthManagement'));
const SKTerms = lazy(() => import('../pages/admin/SKTerms'));
const SKTermReport = lazy(() => import('../pages/admin/SKTermReport'));
const VoterListUpload = lazy(() => import('../pages/admin/VoterListUpload'));
const SurveyBatches = lazy(() => import('../pages/admin/SurveyBatch'));
const SurveyBatchReport = lazy(() => import('../pages/admin/SurveyBatchReport'));
const Announcements = lazy(() => import('../pages/admin/Announcements'));
const AnnouncementCreate = lazy(() => import('../pages/admin/AnnouncementCreate'));
const AnnouncementEdit = lazy(() => import('../pages/admin/AnnouncementEdit'));
const AnnouncementDetail = lazy(() => import('../pages/admin/AnnouncementDetail'));
const AnnouncementsFeatured = lazy(() => import('../pages/admin/AnnouncementsFeatured'));
const AuditLogs = lazy(() => import('../pages/admin/ActivityLogs'));
const ValidationLogs = lazy(() => import('../pages/admin/ValidationLogs'));
const SystemNotice = lazy(() => import('../pages/admin/SystemNotice'));
const LYDOCouncilAdmin = lazy(() => import('../pages/admin/LYDOCouncil'));
const SystemHealth = lazy(() => import('../pages/admin/SystemHealth'));
const AdminProfile = lazy(() => import('../pages/admin/AdminProfile'));
const ChangePassword = lazy(() => import('../pages/admin/ChangePassword'));
const Notifications = lazy(() => import('../pages/admin/Notifications'));
const ValidationQueue = lazy(() => import('../pages/admin/ValidationQueue'));
const ReportGenerator = lazy(() => import('../pages/admin/ReportGenerator'));
const SurveyTracking = lazy(() => import('../pages/admin/SurveyTracking'));
const DataSubjectRequests = lazy(() => import('../pages/admin/DataSubjectRequests'));
const PortalNotFound = lazy(() => import('../components/porrtal/PortalNotFound'));

const AdminStack = () => {
  return (
    <ProtectedRoute requiredRole="admin">
    <AdminLayout>
      <Routes>
        <Route path="/" element={
          <Suspense fallback={<LoadingScreen />}>
            <AdminDashboard />
          </Suspense>
        } />
        <Route path="/dashboard" element={
          <Suspense fallback={<LoadingScreen />}>
            <AdminDashboard />
          </Suspense>
        } />
        <Route path="/users/lydo-staff" element={
          <Suspense fallback={<LoadingScreen />}>
            <StaffManagement />
          </Suspense>
        } />
        <Route path="/users/sk-officials" element={
          <Suspense fallback={<LoadingScreen />}>
            <SKManagement />
          </Suspense>
        } />
        <Route path="/users/youth" element={
          <Suspense fallback={<LoadingScreen />}>
            <YouthManagement />
          </Suspense>
        } />
        
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
        <Route path="/system/notice" element={
          <Suspense fallback={<LoadingScreen />}>
            <SystemNotice />
          </Suspense>
        } />
        <Route path="/content/lydo-council" element={
          <Suspense fallback={<LoadingScreen />}>
            <LYDOCouncilAdmin />
          </Suspense>
        } />

        <Route path="/survey/voter-lists" element={
          <Suspense fallback={<LoadingScreen />}>
            <VoterListUpload />
          </Suspense>
        } />
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
        <Route path="/survey/validation" element={
          <Suspense fallback={<LoadingScreen />}>
            <ValidationQueue />
          </Suspense>
        } />
        <Route path="/survey/tracking" element={
          <Suspense fallback={<LoadingScreen />}>
            <SurveyTracking />
          </Suspense>
        } />
        

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
        <Route path="/announcements/create" element={
          <Suspense fallback={<LoadingScreen />}>
            <AnnouncementCreate />
          </Suspense>
        } />
        <Route path="/announcements/:id" element={
          <Suspense fallback={<LoadingScreen />}>
            <AnnouncementDetail />
          </Suspense>
        } />
        <Route path="/announcements/:id/edit" element={
          <Suspense fallback={<LoadingScreen />}>
            <AnnouncementEdit />
          </Suspense>
        } />
        
        <Route path="/system/audit-logs" element={
          <Suspense fallback={<LoadingScreen />}>
            <AuditLogs />
          </Suspense>
        } />
        <Route path="/audit/validation" element={
          <Suspense fallback={<LoadingScreen />}>
            <ValidationLogs />
          </Suspense>
        } />
        <Route path="/system/health" element={
          <Suspense fallback={<LoadingScreen />}>
            <SystemHealth />
          </Suspense>
        } />
        <Route path="/reports/generator" element={
          <Suspense fallback={<LoadingScreen />}>
            <ReportGenerator />
          </Suspense>
        } />
        <Route path="/data-privacy/data-subject-requests" element={
          <Suspense fallback={<LoadingScreen />}>
            <DataSubjectRequests />
          </Suspense>
        } />
        <Route path="/profile" element={
          <Suspense fallback={<LoadingScreen />}>
            <AdminProfile />
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
        
        {/* Fallback for unknown routes under /admin */}
        <Route path="*" element={
          <Suspense fallback={<LoadingScreen />}>
            <PortalNotFound homePath="/admin/dashboard" />
          </Suspense>
        } />
      </Routes>
    </AdminLayout>
    </ProtectedRoute>
  );
};

export default AdminStack; 