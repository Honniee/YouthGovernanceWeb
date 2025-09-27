import React from 'react';
import { Routes, Route } from 'react-router-dom';

// Admin Layout
import AdminLayout from '../components/layouts/AdminLayout';
import ProtectedRoute from '../components/ProtectedRoute';

// Admin Pages
import AdminDashboard from '../pages/admin/AdminDashboard';

import StaffManagement from '../pages/admin/StaffManagement';
import SKManagement from '../pages/admin/SKManagement';
import YouthManagement from '../pages/admin/YouthManagement';

import SKTerms from '../pages/admin/SKTerms';
import SKTermReport from '../pages/admin/SKTermReport';

import VoterListUpload from '../pages/admin/VoterListUpload';
import SurveyBatches from '../pages/admin/SurveyBatch';
import SurveyBatchReport from '../pages/admin/SurveyBatchReport';

import Announcements from '../pages/admin/Announcements';
import AnnouncementManagement from '../pages/admin/AnnouncementManagement';
import AnnouncementForm from '../pages/admin/AnnouncementForm';

import AuditLogs from '../pages/admin/ActivityLogs';
import TermHistory from '../pages/admin/TermHistory';
import SystemHealth from '../pages/admin/SystemHealth';
import AdminProfile from '../pages/admin/AdminProfile';
import ChangePassword from '../pages/admin/ChangePassword';
import Notifications from '../pages/admin/Notifications';
import PortalNotFound from '../components/porrtal/PortalNotFound';

const AdminStack = () => {
  return (
    <ProtectedRoute requiredRole="admin">
    <AdminLayout>
      <Routes>
        <Route path="/" element={<AdminDashboard />} />
        <Route path="/dashboard" element={<AdminDashboard />} />
        <Route path="/users/lydo-staff" element={<StaffManagement />} />
        <Route path="/users/sk-officials" element={<SKManagement />} />
        <Route path="/users/youth" element={<YouthManagement />} />
        
        <Route path="/sk-governance/terms" element={<SKTerms />} />
        <Route path="/sk-governance/term-report" element={<SKTermReport />} />
        <Route path="/sk-governance/term-history" element={<TermHistory />} />

        <Route path="/survey/voter-lists" element={<VoterListUpload />} />
        <Route path="/survey/batches" element={<SurveyBatches />} />
        <Route path="/survey/batches/batch-report" element={<SurveyBatchReport />} />

        <Route path="/announcements" element={<Announcements />} />
        <Route path="/announcements/create" element={<AnnouncementForm />} />
        <Route path="/announcements/edit/:id" element={<AnnouncementForm />} />
        
        <Route path="/system/audit-logs" element={<AuditLogs />} />
        <Route path="/system/health" element={<SystemHealth />} />
        <Route path="/profile" element={<AdminProfile />} />
        <Route path="/change-password" element={<ChangePassword />} />
        <Route path="/notifications" element={<Notifications />} />
        
        {/* Fallback for unknown routes under /admin */}
        <Route path="*" element={<PortalNotFound homePath="/admin/dashboard" />} />
      </Routes>
    </AdminLayout>
    </ProtectedRoute>
  );
};

export default AdminStack; 