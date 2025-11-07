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
import AnnouncementCreate from '../pages/admin/AnnouncementCreate';
import AnnouncementEdit from '../pages/admin/AnnouncementEdit';
import AnnouncementDetail from '../pages/admin/AnnouncementDetail';
import AnnouncementsFeatured from '../pages/admin/AnnouncementsFeatured';

import AuditLogs from '../pages/admin/ActivityLogs';
import ValidationLogs from '../pages/admin/ValidationLogs';
import SystemNotice from '../pages/admin/SystemNotice';
import LYDOCouncilAdmin from '../pages/admin/LYDOCouncil';
import SystemHealth from '../pages/admin/SystemHealth';
import AdminProfile from '../pages/admin/AdminProfile';
import ChangePassword from '../pages/admin/ChangePassword';
import Notifications from '../pages/admin/Notifications';
import ValidationQueue from '../pages/admin/ValidationQueue';
import ReportGenerator from '../pages/admin/ReportGenerator';
import SurveyTracking from '../pages/admin/SurveyTracking';
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
        <Route path="/system/notice" element={<SystemNotice />} />
        <Route path="/content/lydo-council" element={<LYDOCouncilAdmin />} />

        <Route path="/survey/voter-lists" element={<VoterListUpload />} />
        <Route path="/survey/batches" element={<SurveyBatches />} />
        <Route path="/survey/batches/batch-report" element={<SurveyBatchReport />} />
        <Route path="/survey/validation" element={<ValidationQueue />} />
        <Route path="/survey/tracking" element={<SurveyTracking />} />
        

        <Route path="/announcements" element={<Announcements />} />
        <Route path="/announcements/featured" element={<AnnouncementsFeatured />} />
        <Route path="/announcements/create" element={<AnnouncementCreate />} />
        <Route path="/announcements/:id" element={<AnnouncementDetail />} />
        <Route path="/announcements/:id/edit" element={<AnnouncementEdit />} />
        
        <Route path="/system/audit-logs" element={<AuditLogs />} />
        <Route path="/audit/validation" element={<ValidationLogs />} />
        <Route path="/system/health" element={<SystemHealth />} />
        <Route path="/reports/generator" element={<ReportGenerator />} />
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