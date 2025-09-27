import React, { useState, useEffect, useRef } from 'react';

// Simple scroll reveal hook
const useScrollReveal = () => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return [ref, isVisible];
};

const PageHero = ({ 
  badge,
  title,
  subtitle,
  description,
  backgroundGradient = "from-[#24345A] via-[#1a2a47] to-[#0f1a2e]",
  showBackgroundEffects = true,
  className = ""
}) => {
  const [heroRef, heroVisible] = useScrollReveal();

  return (
    <section className={`relative overflow-hidden bg-gradient-to-br ${backgroundGradient} text-white -mt-16 sm:-mt-20 md:mt-0 ${className}`}>
      {showBackgroundEffects && (
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-white to-transparent rounded-full blur-xl" />
          <div className="absolute bottom-20 right-10 w-40 h-40 bg-gradient-to-tl from-white to-transparent rounded-full blur-xl" />
          <div className="absolute top-1/2 left-1/2 w-24 h-24 bg-gradient-to-br from-white to-transparent rounded-full blur-lg" />
        </div>
      )}
      
      <div 
        ref={heroRef}
        className={`relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-24 transition-all duration-1000 ease-out ${
          heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        <div className="text-center">
          {badge && (
            <div className="inline-flex items-center px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-xs font-semibold uppercase tracking-wider mb-3 sm:mb-4">
              {badge}
            </div>
          )}
          
          {title && (
            <h1 className="text-xl sm:text-2xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4">
              {title}
            </h1>
          )}
          
          {subtitle && (
            <p className="text-sm sm:text-base md:text-xl text-white/90 mb-2">
              {subtitle}
            </p>
          )}
          
          {description && (
            <p className="text-xs sm:text-sm text-white/80">
              {description}
            </p>
          )}
        </div>
      </div>
    </section>
  );
};

export default PageHero;
