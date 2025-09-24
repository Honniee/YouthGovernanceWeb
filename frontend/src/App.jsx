
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import RootNavigator from './navigation/RootNavigator';
import ErrorBoundary from './components/ErrorBoundary';
import { NoticeProvider } from './context/NoticeContext';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import './App.css';

function App() {
  return (
    <ErrorBoundary>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <NoticeProvider>
            <ToastProvider>
              <RootNavigator />
            </ToastProvider>
          </NoticeProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
