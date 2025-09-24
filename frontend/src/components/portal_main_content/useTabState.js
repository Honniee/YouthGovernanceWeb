import { useState, useCallback } from 'react';

/**
 * Custom hook for managing tab state
 * @param {string} defaultTab - Initial active tab
 * @param {function} onTabChange - Optional callback when tab changes
 * @returns {object} - Tab state and handlers
 */
const useTabState = (defaultTab, onTabChange) => {
  const [activeTab, setActiveTab] = useState(defaultTab);

  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId);
    if (onTabChange) {
      onTabChange(tabId);
    }
  }, [onTabChange]);

  const resetTab = useCallback(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  return {
    activeTab,
    setActiveTab: handleTabChange,
    resetTab
  };
};

export default useTabState;






























