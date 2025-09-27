// =================================================================
// 🏗️ src/components/layouts/PublicLayout.jsx - Reusable Public Page Wrapper
// =================================================================

import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import PublicHeader from '../website/PublicHeader';
import ScrollToTop from '../website/ScrollToTop';
import CookieBanner from '../website/CookieBanner';
import Footer from '../website/Footer';
import { useNotice } from '../../context/NoticeContext';

export default function PublicLayout({ 
  children, 
  backgroundColor = 'bg-gray-50',
  showHeader = true,
  showFooter = true,
  showScrollToTop = true,
  showCookieBanner = true,
  headerProps = {},
  footerProps = {}
}) {
  const { showNotice } = useNotice();
  const location = useLocation();

  // Ensure public pages start at the top when this layout mounts or route changes
  useEffect(() => {
    const snapToTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };
    snapToTop();
    requestAnimationFrame(snapToTop);
    const t1 = setTimeout(snapToTop, 80);
    const t2 = setTimeout(snapToTop, 180);
    const t3 = setTimeout(snapToTop, 320);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [location.pathname, location.search]);

  return (
    <div className={`min-h-screen ${backgroundColor}`}>
      {/* Government Style Header */}
      {showHeader && <PublicHeader {...headerProps} />}

      {/* Dynamic Spacer - adjusts based on notice banner visibility */}
      {showHeader && (
        <div className={showNotice ? "h-[140px]" : "h-[104px]"}></div>
      )}
      
      {/* Main Content */}
      <main>
        {children}
      </main>

      {/* Footer */}
      {showFooter && <Footer {...footerProps} />}
      
      {/* Scroll to Top Button */}
      {showScrollToTop && <ScrollToTop />}
      
      {/* Cookie Consent Banner */}
      {showCookieBanner && <CookieBanner />}
    </div>
  );
}
