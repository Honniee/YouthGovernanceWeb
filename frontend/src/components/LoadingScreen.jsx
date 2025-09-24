import React from 'react';
import sanJoseLogo from '../assets/logos/san_jose_logo.webp';
import { useAuth } from '../context/AuthContext';

const LoadingScreen = ({ message }) => {
  const { isAuthenticated, user } = useAuth();
  return (
    <div className="fixed inset-0 bg-white flex items-center justify-center z-50 px-10">
      <div className="flex flex-col items-center justify-center text-center">
        {/* Logo */}
        <img
          src={sanJoseLogo}
          alt="San Jose Logo"
          className="w-35 h-35 mb-9 object-contain"
          style={{ width: '140px', height: '140px' }}
        />
        
        {/* Title Section */}
        <div className="flex flex-col items-center mb-5">
          <h1 className="text-base font-bold text-green-800 text-center mb-2 tracking-wide">
            Municipality of San Jose
          </h1>
          <h2 className="text-2xl font-bold text-green-900 text-center mb-3 leading-7">
            Local Youth Development Office
          </h2>
          <p className="text-base font-semibold text-green-600 text-center italic tracking-widest">
            Connect. Engage. Govern.
          </p>
        </div>

        

        {/* Custom message if provided */}
        {message && (
          <div className="mt-2 mb-3">
            <p className="text-sm text-green-600 text-center">{message}</p>
          </div>
        )}

        {/* Loader */}
        <div className="mt-5">
          <div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen; 