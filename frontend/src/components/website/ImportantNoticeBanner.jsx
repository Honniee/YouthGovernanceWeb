import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useNotice } from '../../context/NoticeContext';

const ImportantNoticeBanner = () => {
  const { showNotice, setShowNotice, notice, loading } = useNotice();

  // Don't render if notice is not visible
  if (loading || !showNotice) return null;

  // Smooth marquee that persists position across navigations
  const trackRef = useRef(null);
  const offsetRef = useRef(0);
  const lastTsRef = useRef(0);
  const rafRef = useRef(0);

  useEffect(() => {
    // Restore last offset in sessionStorage so navigation won't reset position
    const saved = sessionStorage.getItem('noticeMarqueeOffset');
    if (saved) offsetRef.current = parseFloat(saved) || 0;

    const speedPxPerSec = 60; // tune: slower, readable

    const step = (ts) => {
      if (!lastTsRef.current) lastTsRef.current = ts;
      const dt = (ts - lastTsRef.current) / 1000; // seconds
      lastTsRef.current = ts;

      const track = trackRef.current;
      if (track && track.firstChild) {
        const container = track.parentElement;
        const contentWidth = track.firstChild.getBoundingClientRect().width;
        const containerWidth = container.getBoundingClientRect().width;

        offsetRef.current += speedPxPerSec * dt;
        // Loop smoothly when the whole content has passed
        const total = contentWidth + containerWidth;
        if (offsetRef.current > total) offsetRef.current -= total;
        const translateX = containerWidth - offsetRef.current;
        track.style.transform = `translateX(${translateX}px)`;
      }

      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);

    const handleVisibility = () => {
      if (document.hidden) {
        // store when tab is hidden
        sessionStorage.setItem('noticeMarqueeOffset', String(offsetRef.current));
        cancelAnimationFrame(rafRef.current);
        lastTsRef.current = 0;
      } else {
        rafRef.current = requestAnimationFrame(step);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      sessionStorage.setItem('noticeMarqueeOffset', String(offsetRef.current));
      cancelAnimationFrame(rafRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const typeClass = (() => {
    switch (notice?.type) {
      case 'success': return 'bg-green-100 border-green-500 text-green-800';
      case 'warning': return 'bg-yellow-100 border-yellow-500 text-yellow-800';
      case 'danger': return 'bg-red-100 border-red-500 text-red-800';
      default: return 'bg-gray-100 border-gray-400 text-gray-800';
    }
  })();

  const handleClose = () => {
    // Persist dismissal for 24h
    localStorage.setItem('noticeDismissedAt', String(Date.now()));
    setShowNotice(false);
  };

  return (
    <div className={`${typeClass} border-l-4 relative overflow-hidden`}>
      <div className="max-w-screen-2xl mx-auto px-2 sm:px-6 lg:px-8 py-1 sm:py-1.5 flex items-center justify-between">
        {/* Scrolling Text Container */}
        <div className="overflow-hidden whitespace-nowrap flex-1 mr-2" aria-live="polite" role="status">
          <div ref={trackRef} className="inline-block will-change-transform">
            <span className="text-xs sm:text-xs font-medium">
              {notice?.text || 'Important notice'}
            </span>
          </div>
        </div>
        
        {/* Close Button - Aligned with Login position */}
        {notice?.dismissible !== false && (
          <div className="flex-shrink-0">
            <button
              onClick={handleClose}
              className="bg-black/70 hover:bg-black text-white rounded-full p-0.5 sm:p-1 transition-colors shadow-md"
              aria-label="Close notice"
            >
              <X className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportantNoticeBanner;
