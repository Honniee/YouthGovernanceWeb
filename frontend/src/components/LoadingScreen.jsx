import React from 'react';
import sanJoseLogo from '../assets/logos/san_jose_logo.webp';
import { useAuth } from '../context/AuthContext';

const LoadingScreen = ({ message }) => {
  const { isAuthenticated, user } = useAuth();
  return (
    <div className="fixed inset-0 bg-white flex items-center justify-center z-50 px-4 sm:px-6 lg:px-10">
      <div className="flex flex-col items-center justify-center text-center max-w-4xl mx-auto">
        {/* Logo */}
        <img
          src={sanJoseLogo}
          alt="San Jose Logo"
          className="mb-6 sm:mb-8 lg:mb-9 object-contain"
          style={{ 
            width: '80px', 
            height: '80px',
            '@media (min-width: 640px)': { width: '120px', height: '120px' },
            '@media (min-width: 1024px)': { width: '140px', height: '140px' }
          }}
        />
        
        {/* Title Section */}
        <div className="flex flex-col items-center mb-4 sm:mb-5">
          <h1 className="text-sm sm:text-base lg:text-lg font-bold text-green-800 text-center mb-2 tracking-wide">
            Municipality of San Jose
          </h1>
          <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-green-900 text-center mb-3 leading-tight">
            Local Youth Development Office
          </h2>
          <p className="text-sm sm:text-base lg:text-lg font-semibold text-green-600 text-center italic tracking-widest">
            Connect. Engage. Govern.
          </p>
        </div>

        {/* Custom message if provided */}
        {message && (
          <div className="mt-2 mb-3">
            <p className="text-xs sm:text-sm text-green-600 text-center">{message}</p>
          </div>
        )}

        {/* Loader */}
        <div className="mt-4 sm:mt-5">
          <div className="w-6 h-6 sm:w-8 sm:h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen; 