import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useNotice } from '../../context/NoticeContext';

const ImportantNoticeBanner = () => {
  const { showNotice, setShowNotice } = useNotice();

  // Don't render if notice is not visible
  if (!showNotice) return null;

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

  return (
    <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 relative overflow-hidden">
      <div className="max-w-screen-2xl mx-auto px-3 sm:px-6 lg:px-8 py-1.5 flex items-center justify-between">
        {/* Scrolling Text Container */}
        <div className="overflow-hidden whitespace-nowrap flex-1 mr-2">
          <div ref={trackRef} className="inline-block will-change-transform">
            <span className="text-xs font-medium">
              🚨 <strong>Important Notice:</strong> LYDO office hours have been extended on Thursdays until 7:00 PM. • New youth registration deadline: December 31, 2024. • KK Survey now available online. • Youth Leadership Training starts January 2025. • Contact us for more information: (043) 756-XXXX
            </span>
          </div>
        </div>
        
        {/* Close Button - Aligned with Login position */}
        <div className="flex-shrink-0">
          <button
            onClick={() => setShowNotice(false)}
            className="bg-red-500 hover:bg-red-600 text-white rounded-full p-1 transition-colors shadow-md"
            aria-label="Close notice"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportantNoticeBanner;
