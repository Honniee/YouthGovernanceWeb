import React from 'react';
import ErrorBoundary from './ErrorBoundary';
import { useLocation } from 'react-router-dom';

/**
 * RouteErrorBoundary Component
 * Route-specific error boundary that captures route information
 */
export const RouteErrorBoundary = ({ children, ...props }) => {
  const location = useLocation();

  return (
    <ErrorBoundary route={location.pathname} {...props}>
      {children}
    </ErrorBoundary>
  );
};

export default RouteErrorBoundary;


