
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import RootNavigator from './navigation/RootNavigator';
import ErrorBoundary from './components/ErrorBoundary';
import RouteErrorBoundary from './components/RouteErrorBoundary';
import { NoticeProvider } from './context/NoticeContext';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { RealtimeProvider } from './realtime/RealtimeProvider';
import { useCacheInvalidation } from './hooks/useCachedData';
import './App.css';

// Cache invalidation wrapper
const CacheInvalidationWrapper = ({ children }) => {
  useCacheInvalidation();
  return children;
};

function App() {
  return (
    <ErrorBoundary>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <RealtimeProvider>
            <CacheInvalidationWrapper>
              <NoticeProvider>
                <ToastProvider>
                  <RouteErrorBoundary>
                    <RootNavigator />
                  </RouteErrorBoundary>
                </ToastProvider>
              </NoticeProvider>
            </CacheInvalidationWrapper>
          </RealtimeProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
