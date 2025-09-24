import React, { useEffect, useState } from 'react';

/**
 * PageHero
 * Reusable hero section with background video (or image via children),
 * optional parallax effect, and configurable overlay/min-height.
 */
const PageHero = ({
  title,
  subtitle,
  videoSrc,
  overlayClass = 'bg-black/95',
  minHeightClass = '',
  parallax = false,
  showDivider = false,
  dividerClass = 'mt-3 h-1 w-20 bg-white/70 rounded',
  overline = '',
  // Optional color tint and vignette for background mood
  showTint = true,
  tintClass = 'bg-[#24345A]/90',
  vignette = true,
  adjustForHeader = true,
  children,
}) => {
  const [parallaxY, setParallaxY] = useState(0);

  useEffect(() => {
    if (!parallax) return;
    let rafId = 0;
    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        setParallaxY(window.scrollY * 0.5);
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onScroll);
    };
  }, [parallax]);

  return (
    <section className={`relative overflow-hidden py-16 ${adjustForHeader ? '-mt-12 sm:mt-0' : ''} ${minHeightClass}`}>
      {videoSrc && (
        <video
          className="absolute left-0 right-0 w-full object-cover will-change-transform pointer-events-none blur-sm md:blur-[3px]"
          style={parallax ? { top: '-60px', height: 'calc(100% + 120px)', transform: `translateY(${ -Math.min(120, parallaxY * 0.5) }px)` } : { top: 0, height: '100%' }}
          autoPlay
          muted
          loop
          playsInline
        >
          <source src={videoSrc} type="video/mp4" />
        </video>
      )}
      <div className={`absolute inset-0 ${overlayClass}`} aria-hidden="true" />
      {showTint && (
        <div className={`absolute inset-0 ${tintClass}`} aria-hidden="true" />
      )}
      {vignette && (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/35" aria-hidden="true" />
      )}

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {overline && (
          <div className="text-xs tracking-widest uppercase text-white/80 mb-3">{overline}</div>
        )}
        {title && (
          <h1 className="text-2xl md:text-3xl font-extrabold uppercase text-white tracking-wide">{title}</h1>
        )}
        {showDivider && (
          <div className={`${dividerClass} mx-auto`} aria-hidden="true" />
        )}
        {subtitle && (
          <p className="mt-4 text-lg text-white max-w-3xl mx-auto font-medium leading-relaxed">{subtitle}</p>
        )}
        {children}
      </div>
    </section>
  );
};

export default PageHero;


