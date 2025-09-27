import React from 'react';
import { Routes, Route } from 'react-router-dom';

// SK Layout
import SKLayout from '../components/layouts/SKLayout';
import ProtectedRoute from '../components/ProtectedRoute';
import PortalNotFound from '../components/porrtal/PortalNotFound';

// SK Pages
import SKDashboard from '../pages/sk/SKDashboard';

const SKStack = () => {
  return (
    <ProtectedRoute requiredRole="sk_official">
    <SKLayout>
      <Routes>
        <Route path="/" element={<SKDashboard />} />
        <Route path="/dashboard" element={<SKDashboard />} />
        
        {/* Fallback for unknown routes under /sk */}
        <Route path="*" element={<PortalNotFound homePath="/sk/dashboard" />} />
      </Routes>
    </SKLayout>
    </ProtectedRoute>
  );
};

export default SKStack; 