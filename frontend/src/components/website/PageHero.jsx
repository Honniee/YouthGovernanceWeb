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
  backgroundGradient = "from-[#24345A] via-[#24345A]/95 to-[#24345A]/80",
  showBackgroundEffects = true,
  className = ""
}) => {
  const [heroRef, heroVisible] = useScrollReveal();

  return (
    <section className={`relative overflow-hidden bg-gradient-to-br ${backgroundGradient} text-white ${className}`}>
      {showBackgroundEffects && (
        <div className="absolute inset-0">
          {/* Original gradient effects */}
          <div className="opacity-10">
            <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-white to-transparent rounded-full blur-xl" />
            <div className="absolute bottom-20 right-10 w-40 h-40 bg-gradient-to-tl from-white to-transparent rounded-full blur-xl" />
            <div className="absolute top-1/2 left-1/2 w-24 h-24 bg-gradient-to-br from-white to-transparent rounded-full blur-lg" />
          </div>
          
          {/* Confetti and Sparkle Effects */}
          <div className="opacity-30">
            {/* Confetti lines */}
            <div className="absolute top-8 left-1/4 w-8 h-0.5 bg-white/40 rotate-45" />
            <div className="absolute top-12 right-1/3 w-6 h-0.5 bg-white/40 -rotate-12" />
            <div className="absolute top-16 left-1/3 w-4 h-0.5 bg-white/40 rotate-12" />
            <div className="absolute top-20 right-1/4 w-10 h-0.5 bg-white/40 -rotate-45" />
            <div className="absolute top-24 left-1/2 w-6 h-0.5 bg-white/40 rotate-30" />
            <div className="absolute top-28 right-1/5 w-8 h-0.5 bg-white/40 -rotate-30" />
            <div className="absolute top-32 left-1/6 w-5 h-0.5 bg-white/40 rotate-60" />
            <div className="absolute top-36 right-1/3 w-7 h-0.5 bg-white/40 -rotate-60" />
            
            {/* Additional confetti for more coverage */}
            <div className="absolute top-40 left-1/5 w-4 h-0.5 bg-white/40 rotate-15" />
            <div className="absolute top-44 right-1/6 w-6 h-0.5 bg-white/40 -rotate-15" />
            <div className="absolute top-48 left-2/3 w-8 h-0.5 bg-white/40 rotate-45" />
            <div className="absolute top-52 right-2/5 w-5 h-0.5 bg-white/40 -rotate-45" />
            
            {/* Sparkle dots */}
            <div className="absolute top-10 left-1/5 w-1 h-1 bg-white/60 rounded-full" />
            <div className="absolute top-14 right-1/4 w-1 h-1 bg-white/60 rounded-full" />
            <div className="absolute top-18 left-2/3 w-1 h-1 bg-white/60 rounded-full" />
            <div className="absolute top-22 right-1/6 w-1 h-1 bg-white/60 rounded-full" />
            <div className="absolute top-26 left-1/6 w-1 h-1 bg-white/60 rounded-full" />
            <div className="absolute top-30 right-1/2 w-1 h-1 bg-white/60 rounded-full" />
            <div className="absolute top-34 left-3/4 w-1 h-1 bg-white/60 rounded-full" />
            <div className="absolute top-38 right-1/8 w-1 h-1 bg-white/60 rounded-full" />
            <div className="absolute top-42 left-1/3 w-1 h-1 bg-white/60 rounded-full" />
            <div className="absolute top-46 right-3/4 w-1 h-1 bg-white/60 rounded-full" />
          </div>
        </div>
      )}
      
      <div 
        ref={heroRef}
        className={`relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 md:py-12 transition-all duration-1000 ease-out ${
          heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        <div className="text-center">
          {badge && (
            <div className="inline-flex items-center px-2 py-0.5 sm:px-2.5 sm:py-0.5 md:px-3 md:py-1 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-2 sm:mb-3 md:mb-4">
              {badge}
            </div>
          )}
          
          {title && (
            <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold mb-3 sm:mb-4">
              {title}
            </h1>
          )}
          
          {subtitle && (
            <p className="text-sm sm:text-base md:text-lg text-white/90 mb-2">
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
