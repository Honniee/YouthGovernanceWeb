import { useState, useCallback, useEffect, useMemo } from 'react';

/**
 * Custom hook for managing pagination state
 * Provides consistent pagination patterns across components
 */
const usePagination = ({
  initialPage = 1,
  initialItemsPerPage = 10,
  totalItems = 0,
  onPageChange,
  onItemsPerPageChange,
  resetOnItemsChange = true,
  maxItemsPerPage = 100
} = {}) => {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [itemsPerPage, setItemsPerPage] = useState(initialItemsPerPage);

  // Calculate derived values
  const totalPages = useMemo(() => Math.ceil(totalItems / itemsPerPage), [totalItems, itemsPerPage]);
  const startIndex = useMemo(() => (currentPage - 1) * itemsPerPage, [currentPage, itemsPerPage]);
  const endIndex = useMemo(() => Math.min(startIndex + itemsPerPage - 1, totalItems - 1), [startIndex, itemsPerPage, totalItems]);
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;

  // Reset to first page if current page exceeds total pages
  useEffect(() => {
    if (totalItems > 0 && currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalItems, currentPage, totalPages]);

  // Reset to first page when items per page changes
  useEffect(() => {
    if (resetOnItemsChange) {
      setCurrentPage(1);
    }
  }, [itemsPerPage, resetOnItemsChange]);

  // Handle page change
  const handlePageChange = useCallback((page) => {
    if (page < 1 || page > totalPages) return;
    
    setCurrentPage(page);
    onPageChange?.(page);
  }, [totalPages, onPageChange]);

  // Handle items per page change
  const handleItemsPerPageChange = useCallback((newItemsPerPage) => {
    if (newItemsPerPage < 1 || newItemsPerPage > maxItemsPerPage) return;
    
    setItemsPerPage(newItemsPerPage);
    onItemsPerPageChange?.(newItemsPerPage);
  }, [maxItemsPerPage, onItemsPerPageChange]);

  // Navigation helpers
  const goToFirstPage = useCallback(() => {
    handlePageChange(1);
  }, [handlePageChange]);

  const goToLastPage = useCallback(() => {
    handlePageChange(totalPages);
  }, [handlePageChange, totalPages]);

  const goToNextPage = useCallback(() => {
    if (hasNextPage) {
      handlePageChange(currentPage + 1);
    }
  }, [hasNextPage, handlePageChange, currentPage]);

  const goToPreviousPage = useCallback(() => {
    if (hasPreviousPage) {
      handlePageChange(currentPage - 1);
    }
  }, [hasPreviousPage, handlePageChange, currentPage]);

  // Reset pagination
  const resetPagination = useCallback(() => {
    setCurrentPage(initialPage);
    setItemsPerPage(initialItemsPerPage);
  }, [initialPage, initialItemsPerPage]);

  // Get items for current page (for client-side pagination)
  const getPaginatedItems = useCallback((items) => {
    if (!Array.isArray(items)) return [];
    return items.slice(startIndex, startIndex + itemsPerPage);
  }, [startIndex, itemsPerPage]);

  // Generate page info text
  const getPageInfo = useCallback((itemName = 'items', itemNamePlural) => {
    if (totalItems === 0) {
      return `No ${itemNamePlural || itemName + 's'} found`;
    }
    
    const start = startIndex + 1;
    const end = Math.min(startIndex + itemsPerPage, totalItems);
    const name = totalItems === 1 ? itemName : (itemNamePlural || itemName + 's');
    
    return `Showing ${start} to ${end} of ${totalItems} ${name}`;
  }, [startIndex, itemsPerPage, totalItems]);

  return {
    // State
    currentPage,
    itemsPerPage,
    totalPages,
    totalItems,
    
    // Derived values
    startIndex,
    endIndex,
    hasNextPage,
    hasPreviousPage,
    
    // Handlers
    handlePageChange,
    handleItemsPerPageChange,
    
    // Navigation
    goToFirstPage,
    goToLastPage,
    goToNextPage,
    goToPreviousPage,
    
    // Utilities
    resetPagination,
    getPaginatedItems,
    getPageInfo,
    
    // Setters (for advanced use cases)
    setCurrentPage,
    setItemsPerPage
  };
};

/**
 * Hook for server-side pagination
 * Manages state and provides params for API calls
 */
export const useServerPagination = ({
  initialPage = 1,
  initialItemsPerPage = 10,
  totalItems = 0,
  onPaginationChange,
  debounceMs = 0
} = {}) => {
  const pagination = usePagination({
    initialPage,
    initialItemsPerPage,
    totalItems,
    resetOnItemsChange: true
  });

  const [debounceTimer, setDebounceTimer] = useState(null);

  // Notify parent component of pagination changes
  useEffect(() => {
    if (debounceMs > 0) {
      // Clear existing timer
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      // Set new timer
      const timer = setTimeout(() => {
        onPaginationChange?.({
          page: pagination.currentPage,
          limit: pagination.itemsPerPage,
          offset: pagination.startIndex
        });
      }, debounceMs);

      setDebounceTimer(timer);

      // Cleanup
      return () => {
        if (timer) {
          clearTimeout(timer);
        }
      };
    } else {
      onPaginationChange?.({
        page: pagination.currentPage,
        limit: pagination.itemsPerPage,
        offset: pagination.startIndex
      });
    }
  }, [pagination.currentPage, pagination.itemsPerPage, onPaginationChange, debounceMs]);

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);

  return {
    ...pagination,
    // API params for server calls
    paginationParams: {
      page: pagination.currentPage,
      limit: pagination.itemsPerPage,
      offset: pagination.startIndex
    }
  };
};

/**
 * Hook for client-side pagination
 * Handles pagination of local data arrays
 */
export const useClientPagination = ({
  data = [],
  initialItemsPerPage = 10,
  filterFn,
  sortFn
} = {}) => {
  // Process data (filter + sort)
  const processedData = useMemo(() => {
    let result = [...data];
    
    if (filterFn) {
      result = result.filter(filterFn);
    }
    
    if (sortFn) {
      result = result.sort(sortFn);
    }
    
    return result;
  }, [data, filterFn, sortFn]);

  const pagination = usePagination({
    initialItemsPerPage,
    totalItems: processedData.length,
    resetOnItemsChange: true
  });

  // Get current page items
  const currentPageItems = useMemo(() => {
    return pagination.getPaginatedItems(processedData);
  }, [processedData, pagination.getPaginatedItems]);

  return {
    ...pagination,
    items: currentPageItems,
    allItems: processedData
  };
};

export default usePagination;






























