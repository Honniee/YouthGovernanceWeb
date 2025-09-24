import React from 'react';
import { Link } from 'react-router-dom';
import { Home, RefreshCw, AlertTriangle } from 'lucide-react';
import sanJoseLogo from '../../assets/logos/san_jose_logo.webp';

const ServerError = () => {
  const handleRefresh = () => {
    window.location.reload();
  };

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
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-6xl font-bold text-red-600 mb-4">500</h1>
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Server Error
          </h2>
          <p className="text-gray-600 mb-8">
            We're experiencing some technical difficulties. Please try again in a few moments.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          <button 
            onClick={handleRefresh}
            className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
          >
            <RefreshCw className="w-5 h-5 mr-2" />
            Try Again
          </button>
          
          <Link 
            to="/" 
            className="w-full border border-green-600 text-green-600 px-6 py-3 rounded-lg hover:bg-green-50 transition-colors flex items-center justify-center"
          >
            <Home className="w-5 h-5 mr-2" />
            Back to Home
          </Link>
        </div>

        {/* Contact Info */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500 mb-2">Still having issues?</p>
          <Link 
            to="/contact" 
            className="text-green-600 hover:text-green-700 text-sm font-medium"
          >
            Contact our support team
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ServerError; 