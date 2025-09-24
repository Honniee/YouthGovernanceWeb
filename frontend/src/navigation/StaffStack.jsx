import React from 'react';
import { Routes, Route } from 'react-router-dom';

// Staff Layout
import StaffLayout from '../components/layouts/StaffLayout';
import ProtectedRoute from '../components/ProtectedRoute';

// Staff Pages
import StaffDashboard from '../pages/staff/StaffDashboard';

const StaffStack = () => {
  return (
    <ProtectedRoute requiredRole="lydo_staff">
    <StaffLayout>
      <Routes>
        <Route path="/" element={<StaffDashboard />} />
        <Route path="/dashboard" element={<StaffDashboard />} />
        {/* Other routes will be added when components are created */}
      </Routes>
    </StaffLayout>
    </ProtectedRoute>
  );
};

export default StaffStack; 