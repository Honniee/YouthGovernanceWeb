import React from 'react';
import PublicLayout from '../layouts/PublicLayout';

const SurveyLayout = ({ 
  children, 
  showHeader = false, 
  showFooter = false, 
  showScrollToTop = false, 
  showCookieBanner = false,
  className = ''
}) => {
  return (
    <PublicLayout
      showHeader={showHeader}
      showFooter={showFooter}
      showScrollToTop={showScrollToTop}
      showCookieBanner={showCookieBanner}
    >
      <div className={`min-h-screen bg-white ${className}`}>
        {children}
      </div>
    </PublicLayout>
  );
};

export default SurveyLayout;
