import React from 'react';
import { Routes, Route } from 'react-router-dom';

// SK Layout
import SKLayout from '../components/layouts/SKLayout';
import ProtectedRoute from '../components/ProtectedRoute';

// SK Pages
import SKDashboard from '../pages/sk/SKDashboard';

const SKStack = () => {
  return (
    <ProtectedRoute requiredRole="sk_official">
    <SKLayout>
      <Routes>
        <Route path="/" element={<SKDashboard />} />
        <Route path="/dashboard" element={<SKDashboard />} />
        
        {/* Other routes will be added when components are created */}
      </Routes>
    </SKLayout>
    </ProtectedRoute>
  );
};

export default SKStack; 