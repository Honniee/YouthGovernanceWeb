import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft, Search } from 'lucide-react';
import sanJoseLogo from '../../assets/logos/san_jose_logo.webp';

const NotFound = () => {
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
          <h1 className="text-xl font-bold text-green-900">Local Youth Development Office</h1>
          <p className="text-sm text-green-600">Municipality of San Jose, Batangas</p>
        </div>

        {/* 404 Content */}
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-green-900 mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Page Not Found
          </h2>
          <p className="text-gray-600 mb-8">
            Sorry, the page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          
          <button 
            onClick={() => window.history.back()}
            className="w-full border border-green-600 text-green-600 px-6 py-3 rounded-lg hover:bg-green-50 transition-colors flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Go Back
          </button>
        </div>

      </div>
    </div>
  );
};

export default NotFound; 