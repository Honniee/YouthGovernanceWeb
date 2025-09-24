import React from 'react';

const HeaderMainContent = ({ 
  title, 
  description, 
  children, 
  className = '',
  showBorder = true,
  showShadow = true,
  padding = 'px-5 py-4'
}) => {
  return (
    <div className={`bg-white rounded-xl border border-gray-100 ${showShadow ? 'shadow-sm' : ''} overflow-hidden ${className}`}>
      <div className={`${padding} ${showBorder ? 'border-b border-gray-100' : ''}`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 mb-1">{title}</h1>
            {description && (
              <p className="text-sm text-gray-600">{description}</p>
            )}
          </div>
          {children && (
            <div className="flex items-center space-x-3">
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HeaderMainContent;

