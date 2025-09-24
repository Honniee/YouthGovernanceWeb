import { useState, useCallback } from 'react';

/**
 * Custom hook for managing ActionMenu state
 * Simplifies action menu usage and provides consistent patterns
 */
const useActionMenu = () => {
  const [openMenuId, setOpenMenuId] = useState(null);

  const handleMenuToggle = useCallback((menuId) => {
    setOpenMenuId(currentId => currentId === menuId ? null : menuId);
  }, []);

  const closeMenu = useCallback(() => {
    setOpenMenuId(null);
  }, []);

  const isMenuOpen = useCallback((menuId) => {
    return openMenuId === menuId;
  }, [openMenuId]);

  return {
    openMenuId,
    isMenuOpen,
    handleMenuToggle,
    closeMenu
  };
};

export default useActionMenu;






























