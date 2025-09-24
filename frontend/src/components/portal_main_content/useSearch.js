import { useState, useCallback, useEffect } from 'react';

/**
 * Custom hook for managing search state with debouncing and history
 * Provides consistent search patterns across components
 */
const useSearch = ({
  initialValue = '',
  debounceMs = 300,
  onSearch,
  onClear,
  minLength = 0,
  maxHistory = 10
} = {}) => {
  const [query, setQuery] = useState(initialValue);
  const [debouncedQuery, setDebouncedQuery] = useState(initialValue);
  const [isSearching, setIsSearching] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);
  const [suggestions, setSuggestions] = useState([]);

  // Debounce the search query
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length >= minLength || query === '') {
        setDebouncedQuery(query);
        setIsSearching(false);
      }
    }, debounceMs);

    if (query.length >= minLength && query !== debouncedQuery) {
      setIsSearching(true);
    }

    return () => clearTimeout(timer);
  }, [query, debounceMs, minLength, debouncedQuery]);

  // Call onSearch when debounced query changes
  useEffect(() => {
    if (onSearch) {
      onSearch(debouncedQuery);
    }
  }, [debouncedQuery, onSearch]);

  // Handle search input change
  const handleSearch = useCallback((value) => {
    setQuery(value);
  }, []);

  // Handle search clear
  const handleClear = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
    setIsSearching(false);
    if (onClear) {
      onClear();
    }
  }, [onClear]);

  // Handle search submit (e.g., when Enter is pressed)
  const handleSubmit = useCallback(() => {
    if (query.trim() && query.length >= minLength) {
      // Add to search history
      setSearchHistory(prev => {
        const newHistory = [query, ...prev.filter(item => item !== query)];
        return newHistory.slice(0, maxHistory);
      });
      
      // Trigger immediate search
      setDebouncedQuery(query);
      setIsSearching(false);
      
      if (onSearch) {
        onSearch(query);
      }
    }
  }, [query, minLength, maxHistory, onSearch]);

  // Get search suggestions based on history
  const getSuggestions = useCallback((inputValue) => {
    if (!inputValue || inputValue.length < minLength) {
      return [];
    }
    
    return searchHistory
      .filter(item => 
        item.toLowerCase().includes(inputValue.toLowerCase()) && 
        item !== inputValue
      )
      .slice(0, 5);
  }, [searchHistory, minLength]);

  // Update suggestions when query changes
  useEffect(() => {
    setSuggestions(getSuggestions(query));
  }, [query, getSuggestions]);

  // Clear history
  const clearHistory = useCallback(() => {
    setSearchHistory([]);
  }, []);

  // Check if currently has active search
  const hasActiveSearch = debouncedQuery.length >= minLength;

  return {
    // Search state
    query,
    debouncedQuery,
    isSearching,
    hasActiveSearch,
    
    // Search history and suggestions
    searchHistory,
    suggestions,
    
    // Search handlers
    handleSearch,
    handleClear,
    handleSubmit,
    clearHistory,
    getSuggestions,
    
    // Utilities
    setQuery,
    setSearchHistory,
    setSuggestions
  };
};

export default useSearch;






























