import React from 'react';
import { useNavigate } from 'react-router-dom';

const PortalNotFound = ({ title = 'Page not found', message = "The page you’re looking for doesn’t exist or you don’t have access.", homePath = '/' }) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-8 sm:py-12">
      <div className="text-center w-full max-w-xl">
        <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-red-50 text-red-600 mb-3 sm:mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 leading-tight">{title}</h1>
        <p className="mt-2 text-sm sm:text-base text-gray-600 px-1">
          {message}
        </p>
        <div className="mt-5 sm:mt-6 flex items-center justify-center">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex justify-center w-full sm:w-auto items-center px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default PortalNotFound;


