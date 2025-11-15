import React, { useState, useEffect } from 'react';
import { useLazyLoad } from '../../hooks/useIntersectionObserver';
import { Loader2 } from 'lucide-react';

/**
 * LazyImage Component
 * Lazy-loads images with placeholder and blur-up effect
 */
const LazyImage = ({
  src,
  alt = '',
  className = '',
  placeholder = null,
  blurDataURL = null,
  onLoad,
  onError,
  fallback = null,
  ...props
}) => {
  const { elementRef, shouldLoad } = useLazyLoad({
    threshold: 0.01,
    rootMargin: '50px'
  });
  const [imageSrc, setImageSrc] = useState(blurDataURL || placeholder || null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    if (!shouldLoad || !src) return;

    // Start loading the actual image
    const img = new Image();
    
    img.onload = () => {
      setImageSrc(src);
      setIsLoading(false);
      setImageLoaded(true);
      if (onLoad) onLoad();
    };

    img.onerror = () => {
      setIsLoading(false);
      setHasError(true);
      if (onError) onError();
    };

    img.src = src;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [shouldLoad, src, onLoad, onError]);

  // Show placeholder while loading
  if (!shouldLoad || isLoading) {
    return (
      <div
        ref={elementRef}
        className={`bg-gray-200 animate-pulse flex items-center justify-center ${className}`}
        {...props}
      >
        {placeholder ? (
          <img src={placeholder} alt="" className="opacity-0 w-full h-full object-cover" />
        ) : (
          <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
        )}
        {blurDataURL && (
          <img
            src={blurDataURL}
            alt=""
            className="absolute inset-0 w-full h-full object-cover filter blur-sm"
            aria-hidden="true"
          />
        )}
      </div>
    );
  }

  // Show error fallback
  if (hasError) {
    if (fallback) {
      return (
        <div ref={elementRef} className={className} {...props}>
          {typeof fallback === 'string' ? (
            <img src={fallback} alt={alt} className="w-full h-full object-cover" />
          ) : (
            fallback
          )}
        </div>
      );
    }
    
    return (
      <div
        ref={elementRef}
        className={`bg-gray-200 flex items-center justify-center ${className}`}
        {...props}
      >
        <span className="text-gray-400 text-sm">Failed to load image</span>
      </div>
    );
  }

  // Show loaded image
  return (
    <img
      ref={elementRef}
      src={imageSrc || src}
      alt={alt}
      className={`${imageLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300 ${className}`}
      onLoad={() => {
        setImageLoaded(true);
        if (onLoad) onLoad();
      }}
      onError={() => {
        setHasError(true);
        if (onError) onError();
      }}
      {...props}
    />
  );
};

export default LazyImage;


