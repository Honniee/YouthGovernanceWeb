// =================================================================
// 🏗️ src/components/layouts/PublicLayout.jsx - Reusable Public Page Wrapper
// =================================================================

import React, { useEffect, useState, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import PublicHeader from '../website/PublicHeader';
import ScrollToTop from '../website/ScrollToTop';
import CookieBanner from '../website/CookieBanner';
import Footer from '../website/Footer';
import NoticeContext from '../../context/NoticeContext';

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
  // Safely get notice context - use useContext directly to handle missing provider gracefully
  const noticeContext = useContext(NoticeContext);
  const showNotice = noticeContext?.showNotice || false;
  
  const location = useLocation();
  const [headerHeight, setHeaderHeight] = useState(0);

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

  // Dynamically compute and expose header stack height via CSS variable
  useEffect(() => {
    const updateHeaderOffset = () => {
      const headerEl = document.querySelector('header');
      const h = headerEl?.offsetHeight || 0;
      setHeaderHeight(h);
      document.documentElement.style.setProperty('--header-offset', `${h}px`);
    };

    updateHeaderOffset();

    let ro;
    const headerEl = document.querySelector('header');
    if (headerEl && 'ResizeObserver' in window) {
      ro = new ResizeObserver(updateHeaderOffset);
      ro.observe(headerEl);
    }

    window.addEventListener('resize', updateHeaderOffset);
    window.addEventListener('scroll', updateHeaderOffset, { passive: true });
    return () => {
      window.removeEventListener('resize', updateHeaderOffset);
      window.removeEventListener('scroll', updateHeaderOffset);
      if (ro) ro.disconnect();
    };
  }, [showNotice]);

  return (
    <div className={`min-h-screen ${backgroundColor}`}>
      {/* Government Style Header */}
      {showHeader && <PublicHeader {...headerProps} />}

      {/* Dynamic Spacer - adjusts based on notice banner visibility */}
      {showHeader && (
        <div style={{ height: headerHeight }}></div>
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
