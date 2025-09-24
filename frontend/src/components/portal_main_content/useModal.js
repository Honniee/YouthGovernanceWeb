import { useState, useCallback, useRef } from 'react';

/**
 * Custom hook for managing modal state
 * Provides consistent patterns for modal handling across components
 */
const useModal = (initialState = false) => {
  const [isOpen, setIsOpen] = useState(initialState);
  const triggerRef = useRef(null);

  const openModal = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggleModal = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  return {
    isOpen,
    openModal,
    closeModal,
    toggleModal,
    triggerRef,
    setIsOpen
  };
};

/**
 * Hook for managing filter modal state with filter values
 */
export const useFilterModal = (initialFilters = {}) => {
  const modal = useModal();
  const [filterValues, setFilterValues] = useState(initialFilters);
  const [hasActiveFilters, setHasActiveFilters] = useState(false);

  const updateFilterValues = useCallback((newValues) => {
    setFilterValues(newValues);
    
    // Check if any filters are active
    const isActive = Object.values(newValues).some(value => {
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      return value && value !== '';
    });
    setHasActiveFilters(isActive);
  }, []);

  const clearFilters = useCallback(() => {
    setFilterValues(initialFilters);
    setHasActiveFilters(false);
  }, [initialFilters]);

  const resetFilters = useCallback(() => {
    setFilterValues(initialFilters);
    setHasActiveFilters(false);
  }, [initialFilters]);

  return {
    ...modal,
    filterValues,
    hasActiveFilters,
    updateFilterValues,
    clearFilters,
    resetFilters,
    setFilterValues
  };
};

/**
 * Hook for managing sort modal state with sort values
 */
export const useSortModal = (defaultSortBy = '', defaultSortOrder = 'asc') => {
  const modal = useModal();
  const [sortBy, setSortBy] = useState(defaultSortBy);
  const [sortOrder, setSortOrder] = useState(defaultSortOrder);

  const updateSort = useCallback((field, order) => {
    setSortBy(field);
    setSortOrder(order);
  }, []);

  const resetSort = useCallback(() => {
    setSortBy(defaultSortBy);
    setSortOrder(defaultSortOrder);
  }, [defaultSortBy, defaultSortOrder]);

  const isDefaultSort = sortBy === defaultSortBy && sortOrder === defaultSortOrder;

  return {
    ...modal,
    sortBy,
    sortOrder,
    updateSort,
    resetSort,
    isDefaultSort,
    setSortBy,
    setSortOrder
  };
};

/**
 * Hook for managing bulk modal state with action values
 */
export const useBulkModal = () => {
  const modal = useModal();
  const [selectedAction, setSelectedAction] = useState('');
  const [fieldValues, setFieldValues] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const updateFieldValues = useCallback((newValues) => {
    setFieldValues(newValues);
  }, []);

  const resetBulkModal = useCallback(() => {
    setSelectedAction('');
    setFieldValues({});
    setIsProcessing(false);
    setProgress(0);
  }, []);

  const startProcessing = useCallback(() => {
    setIsProcessing(true);
    setProgress(0);
  }, []);

  const updateProgress = useCallback((newProgress) => {
    setProgress(newProgress);
  }, []);

  const finishProcessing = useCallback(() => {
    setIsProcessing(false);
    setProgress(100);
    // Auto-close modal after processing
    setTimeout(() => {
      modal.closeModal();
      resetBulkModal();
    }, 1000);
  }, [modal, resetBulkModal]);

  return {
    ...modal,
    selectedAction,
    fieldValues,
    isProcessing,
    progress,
    setSelectedAction,
    updateFieldValues,
    resetBulkModal,
    startProcessing,
    updateProgress,
    finishProcessing
  };
};

export default useModal;






























