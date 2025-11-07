import React from 'react';

const HeaderMainContent = ({ 
  title, 
  description, 
  children, 
  className = '',
  showBorder = true,
  showShadow = false,
  padding = 'px-4 sm:px-6 py-3 sm:py-4',
  leading = null
}) => {
  return (
    <div className={`${className}`}>
      <div className={`${padding} ${showBorder ? 'border-b border-gray-200' : ''}`}>
        {/* Mobile Layout */}
        <div className="flex flex-col space-y-3 sm:hidden">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {leading}
              <h1 className="text-base font-bold text-gray-900 truncate">{title}</h1>
            </div>
            {description && (
              <p className="text-xs text-gray-600 mt-1">{description}</p>
            )}
          </div>
          {children && (
            <div className="flex items-center justify-between gap-2 flex-wrap">
              {children}
            </div>
          )}
        </div>
        
        {/* Desktop Layout */}
        <div className="hidden sm:flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            {leading}
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-gray-900 mb-1 truncate">{title}</h1>
              {description && (
                <p className="text-sm text-gray-600">{description}</p>
              )}
            </div>
          </div>
          {children && (
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HeaderMainContent;

