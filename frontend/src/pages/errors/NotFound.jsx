import React from 'react';
import { ArrowLeft } from 'lucide-react';
import sanJoseLogo from '../../assets/logos/san_jose_logo.webp';

const NotFound = () => {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-lg sm:max-w-xl text-center">
        {/* Logo */}
        <div className="mb-8">
          <img
            src={sanJoseLogo}
            alt="San Jose Logo"
            className="h-16 w-16 sm:h-20 sm:w-20 object-contain mx-auto mb-4"
          />
          <h1 className="text-lg sm:text-xl font-bold text-green-900 leading-tight">Local Youth Development Office</h1>
          <p className="text-xs sm:text-sm text-green-600">Municipality of San Jose, Batangas</p>
        </div>

        {/* 404 Content */}
        <div className="mb-8">
          <h1 className="text-5xl sm:text-6xl font-bold text-green-900 mb-3 sm:mb-4">404</h1>
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-3 sm:mb-4">
            Page Not Found
          </h2>
          <p className="text-gray-600 text-sm sm:text-base mb-6 sm:mb-8 px-1">
            Sorry, the page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 sm:space-y-4">
          
          <button
            onClick={() => window.history.back()}
            className="w-full border border-green-600 text-green-600 px-6 py-2.5 sm:py-3 rounded-lg hover:bg-green-50 transition-colors flex items-center justify-center"
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