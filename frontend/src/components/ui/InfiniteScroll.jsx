import React, { useEffect, useRef, useCallback } from 'react';
import { useIntersectionObserver } from '../../hooks/useIntersectionObserver';

/**
 * InfiniteScroll Component
 * Implements infinite scroll for paginated lists
 */
const InfiniteScroll = ({
  children,
  onLoadMore,
  hasMore = true,
  loading = false,
  loader = null,
  threshold = 0.1,
  ...props
}) => {
  const { elementRef, isIntersecting } = useIntersectionObserver({
    threshold,
    rootMargin: '100px'
  });

  const loadingRef = useRef(false);

  useEffect(() => {
    if (isIntersecting && hasMore && !loading && !loadingRef.current) {
      loadingRef.current = true;
      onLoadMore().finally(() => {
        loadingRef.current = false;
      });
    }
  }, [isIntersecting, hasMore, loading, onLoadMore]);

  const defaultLoader = (
    <div className="flex justify-center items-center py-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
    </div>
  );

  return (
    <div {...props}>
      {children}
      {hasMore && (
        <div ref={elementRef}>
          {loading && (loader || defaultLoader)}
        </div>
      )}
    </div>
  );
};

export default InfiniteScroll;


