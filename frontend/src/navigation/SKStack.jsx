import React from 'react';
import { Routes, Route } from 'react-router-dom';

// SK Layout
import SKLayout from '../components/layouts/SKLayout';
import ProtectedRoute from '../components/ProtectedRoute';
import PortalNotFound from '../components/porrtal/PortalNotFound';

// SK Pages
import SKDashboard from '../pages/sk/SKDashboard';
import SKProfile from '../pages/sk/SKProfile';
import ChangePassword from '../pages/sk/ChangePassword';
import Notifications from '../pages/sk/Notifications';
import ValidationQueue from '../pages/sk/ValidationQueue';
import Announcements from '../pages/sk/Announcements';
import AnnouncementDetail from '../pages/sk/AnnouncementDetail';
import AnnouncementsFeatured from '../pages/sk/AnnouncementsFeatured';
import SurveyBatch from '../pages/sk/SurveyBatch';
import SurveyBatchReport from '../pages/sk/SurveyBatchReport';

const SKStack = () => {
  return (
    <ProtectedRoute requiredRole="sk_official">
    <SKLayout>
      <Routes>
        <Route path="/" element={<SKDashboard />} />
        <Route path="/dashboard" element={<SKDashboard />} />
        <Route path="/profile" element={<SKProfile />} />
        <Route path="/change-password" element={<ChangePassword />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/survey/validation" element={<ValidationQueue />} />
        
        {/* Announcements */}
        <Route path="/announcements" element={<Announcements />} />
        <Route path="/announcements/featured" element={<AnnouncementsFeatured />} />
        <Route path="/announcements/:id" element={<AnnouncementDetail />} />
        
        {/* Survey Batch Routes */}
        <Route path="/survey/batches" element={<SurveyBatch />} />
        <Route path="/survey/batches/batch-report" element={<SurveyBatchReport />} />
        
        {/* Fallback for unknown routes under /sk */}
        <Route path="*" element={<PortalNotFound homePath="/sk/dashboard" />} />
      </Routes>
    </SKLayout>
    </ProtectedRoute>
  );
};

export default SKStack; 