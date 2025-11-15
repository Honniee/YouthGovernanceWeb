import { useEffect, useRef, useState } from 'react';

/**
 * useIntersectionObserver Hook
 * Observes when an element enters the viewport
 */
export function useIntersectionObserver(options = {}) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);
  const elementRef = useRef(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isVisible = entry.isIntersecting;
        setIsIntersecting(isVisible);
        
        // Once intersected, keep it true even if it leaves viewport
        if (isVisible && !hasIntersected) {
          setHasIntersected(true);
        }
      },
      {
        threshold: options.threshold || 0.1,
        rootMargin: options.rootMargin || '50px',
        ...options
      }
    );

    observer.observe(element);

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [options.threshold, options.rootMargin, hasIntersected]);

  return { elementRef, isIntersecting, hasIntersected };
}

/**
 * useLazyLoad Hook
 * Simple lazy loading hook that triggers when element is visible
 */
export function useLazyLoad(options = {}) {
  const { elementRef, hasIntersected } = useIntersectionObserver(options);
  return { elementRef, shouldLoad: hasIntersected };
}


