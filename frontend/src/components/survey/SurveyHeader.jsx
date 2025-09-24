import React from 'react';

const SurveyHeader = ({ 
  title,
  subtitle,
  badge,
  className = ''
}) => {
  return (
    <div className={`text-center mb-8 ${className}`}>
      {badge && (
        <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold mb-4">
          {badge}
        </div>
      )}
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
        {title}
      </h1>
      {subtitle && (
        <p className="text-sm sm:text-base text-gray-700 max-w-2xl mx-auto mb-6">
          {subtitle}
        </p>
      )}
    </div>
  );
};

export default SurveyHeader;
