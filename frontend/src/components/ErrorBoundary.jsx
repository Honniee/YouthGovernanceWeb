import React from 'react';
import { Home, RefreshCw, Bug } from 'lucide-react';
import sanJoseLogo from '../assets/logos/san_jose_logo.webp';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to an error reporting service
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  handleRefresh = () => {
    // Reset the error boundary and reload the page
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
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
                <Bug className="w-8 h-8 text-orange-600" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                Something went wrong
              </h2>
              <p className="text-gray-600 mb-8">
                We encountered an unexpected error. Our team has been notified and is working on a fix.
              </p>
              
              {/* Show error details in development */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4 p-4 bg-gray-100 rounded-lg text-left text-sm">
                  <summary className="cursor-pointer font-medium text-gray-700 mb-2">
                    Error Details (Development)
                  </summary>
                  <pre className="text-red-600 whitespace-pre-wrap break-words">
                    {this.state.error.toString()}
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-4">
              <button 
                onClick={this.handleRefresh}
                className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
                Reload Page
              </button>
              
              <button 
                onClick={() => window.location.href = '/'}
                className="w-full border border-green-600 text-green-600 px-6 py-3 rounded-lg hover:bg-green-50 transition-colors flex items-center justify-center"
              >
                <Home className="w-5 h-5 mr-2" />
                Back to Home
              </button>
            </div>

            {/* Contact Info */}
            <div className="mt-8 pt-8 border-t border-gray-200">
              <p className="text-sm text-gray-500 mb-2">Problem persists?</p>
              <button 
                onClick={() => window.location.href = '/contact'} 
                className="text-green-600 hover:text-green-700 text-sm font-medium underline bg-transparent border-none cursor-pointer"
              >
                Report this issue
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 