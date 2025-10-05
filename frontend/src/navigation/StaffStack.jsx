import React from 'react';
import { Routes, Route } from 'react-router-dom';

// Staff Layout
import StaffLayout from '../components/layouts/StaffLayout';
import ProtectedRoute from '../components/ProtectedRoute';

// Staff Pages
import StaffDashboard from '../pages/staff/StaffDashboard';

// Removed user management imports for staff stack








import StaffProfile from '../pages/staff/StaffProfile';
import ChangePassword from '../pages/staff/ChangePassword';
import Notifications from '../pages/staff/Notifications';
import Announcements from '../pages/staff/Announcements';
import AnnouncementCreate from '../pages/staff/AnnouncementCreate';
import AnnouncementEdit from '../pages/staff/AnnouncementEdit';
import AnnouncementDetail from '../pages/staff/AnnouncementDetail';
import AnnouncementsFeatured from '../pages/staff/AnnouncementsFeatured';

import PortalNotFound from '../components/porrtal/PortalNotFound';

const StaffStack = () => {
  return (
    <ProtectedRoute requiredRole="lydo_staff">
    <StaffLayout>
      <Routes>
        <Route path="/" element={<StaffDashboard />} />
        <Route path="/dashboard" element={<StaffDashboard />} />
        {/* User management and admin-only routes removed for staff */}

        {/* Staff Announcements */}
        <Route path="/announcements" element={<Announcements />} />
        <Route path="/announcements/create" element={<AnnouncementCreate />} />
        <Route path="/announcements/:id/edit" element={<AnnouncementEdit />} />
        <Route path="/announcements/:id" element={<AnnouncementDetail />} />
        <Route path="/announcements/featured" element={<AnnouncementsFeatured />} />
        <Route path="/profile" element={<StaffProfile />} />
        <Route path="/change-password" element={<ChangePassword />} />
        <Route path="/notifications" element={<Notifications />} />
        
        {/* Fallback for unknown routes under /staff */
        }
        <Route path="*" element={<PortalNotFound homePath="/staff/dashboard" />} />
      </Routes>
    </StaffLayout>
    </ProtectedRoute>
  );
};

export default StaffStack; 