import React from 'react';
import { Home, RefreshCw, Bug, ArrowLeft, AlertCircle } from 'lucide-react';
import sanJoseLogo from '../assets/logos/san_jose_logo.webp';
import api from '../services/api';
import logger from '../utils/logger.js';

/**
 * Enhanced ErrorBoundary Component
 * Catches React errors and displays user-friendly error UI
 * Logs errors to backend for monitoring
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorId: null,
      isRetrying: false
    };
    this.resetKey = 0;
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  async componentDidCatch(error, errorInfo) {
    // Log the error using logger
    logger.error('Error caught by ErrorBoundary', error, {
      componentStack: errorInfo.componentStack,
      route: this.props.route || window.location.pathname
    });
    
    // Store error details
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Log error to backend for monitoring
    try {
      const errorData = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        route: this.props.route || window.location.pathname,
        userId: localStorage.getItem('userId') || 'anonymous'
      };

      // Try to log to backend (don't block if it fails)
      try {
        const response = await api.post('/system/errors', errorData, {
          timeout: 5000 // 5 second timeout
        });
        this.setState({ errorId: response.data?.errorId || null });
      } catch (logError) {
        // Silently fail - error logging shouldn't break the error boundary
        logger.warn('Failed to log error to backend', { error: logError });
      }
    } catch (loggingError) {
      // Silently fail if error logging itself fails
      logger.warn('Error logging failed', { error: loggingError });
    }
  }

  handleRefresh = () => {
    // Reset the error boundary and reload the page
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorId: null,
      isRetrying: false
    });
    this.resetKey += 1;
    window.location.reload();
  };

  handleRetry = () => {
    // Reset error boundary without reloading
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null,
      isRetrying: true
    });
    this.resetKey += 1;
    
    // Reset after a short delay
    setTimeout(() => {
      this.setState({ isRetrying: false });
    }, 100);
  };

  handleGoBack = () => {
    // Go back in history
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/';
    }
  };

  render() {
    if (this.state.hasError && !this.state.isRetrying) {
      const { fallback: Fallback } = this.props;
      
      // Use custom fallback if provided
      if (Fallback) {
        return (
          <Fallback
            error={this.state.error}
            errorInfo={this.state.errorInfo}
            errorId={this.state.errorId}
            onRetry={this.handleRetry}
            onRefresh={this.handleRefresh}
            onGoBack={this.handleGoBack}
          />
        );
      }

      return (
        <div className="min-h-screen bg-white flex items-center justify-center px-4">
          <div className="max-w-md w-full text-center">
            {/* Logo */}
            <div className="mb-8">
              <img 
                src={sanJoseLogo} 
                alt="San Jose Logo" 
                className="h-20 w-20 object-contain mx-auto mb-4"
              />
              <h1 className="text-xl font-bold text-green-900">LYDO</h1>
              <p className="text-sm text-green-600">San Jose, Batangas</p>
            </div>

            {/* Error Icon */}
            <div className="mb-8">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-orange-600" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                {this.props.title || 'Something went wrong'}
              </h2>
              <p className="text-gray-600 mb-4">
                {this.props.message || 'We encountered an unexpected error. Our team has been notified and is working on a fix.'}
              </p>
              
              {this.state.errorId && (
                <p className="text-xs text-gray-500 mb-4">
                  Error ID: {this.state.errorId}
                </p>
              )}
              
              {/* Show error details in development */}
              {(import.meta.env.DEV || process.env.NODE_ENV === 'development') && this.state.error && (
                <details className="mt-4 p-4 bg-gray-100 rounded-lg text-left text-sm">
                  <summary className="cursor-pointer font-medium text-gray-700 mb-2">
                    Error Details (Development)
                  </summary>
                  <pre className="text-red-600 whitespace-pre-wrap break-words max-h-48 overflow-auto">
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack && (
                      <div className="mt-2 text-xs">
                        {this.state.errorInfo.componentStack}
                      </div>
                    )}
                  </pre>
                </details>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button 
                onClick={this.handleRetry}
                className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
                Try Again
              </button>
              
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={this.handleGoBack}
                  className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Go Back
                </button>
                
                <button 
                  onClick={() => window.location.href = '/'}
                  className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Home
                </button>
              </div>
            </div>

            {/* Contact Info */}
            <div className="mt-8 pt-8 border-t border-gray-200">
              <p className="text-sm text-gray-500 mb-2">Problem persists?</p>
              <button 
                onClick={() => window.location.href = '/data-subject-rights'} 
                className="text-green-600 hover:text-green-700 text-sm font-medium underline bg-transparent border-none cursor-pointer"
              >
                Report this issue
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Reset and re-render children on retry
    return <React.Fragment key={this.resetKey}>{this.props.children}</React.Fragment>;
  }
}

export default ErrorBoundary; 