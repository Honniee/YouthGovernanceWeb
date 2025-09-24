import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal } from 'lucide-react';

/**
 * ActionMenu Component - A robust dropdown menu with smart positioning
 * Fixes issues with movement, cropping, and mobile display
 */
const ActionMenu = ({
  items = [],
  onAction,
  triggerIcon = <MoreHorizontal className="w-4 h-4" />,
  triggerClassName = "text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 transition-colors",
  menuClassName = "",
  disabled = false,
  position = "auto", // "auto", "left", "right", "top", "bottom"
  size = "md", // "sm", "md", "lg"
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, placement: 'bottom-right' });
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  // Menu size configurations
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'min-w-40 text-xs';
      case 'lg':
        return 'min-w-56 text-base';
      default:
        return 'min-w-48 text-sm';
    }
  };

  // Calculate optimal menu position to prevent cropping
  const calculatePosition = () => {
    if (!triggerRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    // Menu dimensions (estimated)
    const menuWidth = size === 'sm' ? 160 : size === 'lg' ? 224 : 192; // min-w-40/48/56 in pixels
    const menuHeight = items.length * 40 + 16; // Estimated height based on items

    let placement = 'bottom-right';
    let top = triggerRect.bottom + 4;
    let left = triggerRect.right - menuWidth;

    // Smart positioning logic
    if (position === 'auto') {
      // Check if menu would overflow on the right
      if (left < 8) {
        left = triggerRect.left;
        placement = 'bottom-left';
      }

      // Check if menu would overflow at the bottom
      if (top + menuHeight > viewport.height - 8) {
        top = triggerRect.top - menuHeight - 4;
        placement = placement.includes('left') ? 'top-left' : 'top-right';
      }

      // Ensure minimum margins
      left = Math.max(8, Math.min(left, viewport.width - menuWidth - 8));
      top = Math.max(8, Math.min(top, viewport.height - menuHeight - 8));
    } else {
      // Manual positioning
      switch (position) {
        case 'left':
          left = triggerRect.left - menuWidth - 4;
          top = triggerRect.top;
          placement = 'left';
          break;
        case 'right':
          left = triggerRect.right + 4;
          top = triggerRect.top;
          placement = 'right';
          break;
        case 'top':
          left = triggerRect.right - menuWidth;
          top = triggerRect.top - menuHeight - 4;
          placement = 'top-right';
          break;
        case 'bottom':
        default:
          left = triggerRect.right - menuWidth;
          top = triggerRect.bottom + 4;
          placement = 'bottom-right';
          break;
      }
    }

    setMenuPosition({ top, left, placement });
  };

  // Handle trigger click
  const handleTriggerClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (disabled) return;

    if (!isOpen) {
      calculatePosition();
    }
    setIsOpen(!isOpen);
  };

  // Handle menu item click
  const handleItemClick = (item, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsOpen(false);
    
    if (onAction && !item.disabled) {
      onAction(item.id || item.action, item);
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (triggerRef.current && !triggerRef.current.contains(e.target) &&
          menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const handleScroll = () => {
      setIsOpen(false);
    };

    const handleResize = () => {
      if (isOpen) {
        calculatePosition();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    document.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen]);

  // Update position when window scrolls or resizes
  useEffect(() => {
    if (isOpen) {
      calculatePosition();
    }
  }, [isOpen]);

  return (
    <>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        onClick={handleTriggerClick}
        disabled={disabled}
        className={`${triggerClassName} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        {...props}
      >
        {triggerIcon}
      </button>

      {/* Menu Portal */}
      {isOpen && createPortal(
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-[9998]"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu */}
          <div
            ref={menuRef}
            className={`
              fixed z-[9999] bg-white rounded-lg shadow-lg border border-gray-200 py-1
              ${getSizeClasses()}
              ${menuClassName}
            `}
            style={{
              top: menuPosition.top,
              left: menuPosition.left,
            }}
            role="menu"
            aria-orientation="vertical"
          >
            {items.map((item, index) => {
              if (item.type === 'divider') {
                return (
                  <div
                    key={`divider-${index}`}
                    className="my-1 border-t border-gray-100"
                  />
                );
              }

              return (
                <button
                  key={item.id || item.action || index}
                  onClick={(e) => handleItemClick(item, e)}
                  disabled={item.disabled}
                  className={`
                    w-full px-4 py-2 text-left flex items-center transition-colors
                    ${item.disabled 
                      ? 'opacity-50 cursor-not-allowed text-gray-400' 
                      : `text-gray-700 hover:bg-gray-50 ${item.destructive ? 'hover:text-red-600 hover:bg-red-50' : ''}`
                    }
                    ${item.className || ''}
                  `}
                  role="menuitem"
                >
                  {item.icon && (
                    <span className="mr-3 flex-shrink-0">
                      {item.icon}
                    </span>
                  )}
                  <span className="flex-1">{item.label}</span>
                  {item.shortcut && (
                    <span className="ml-3 text-xs text-gray-400">
                      {item.shortcut}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </>,
        document.body
      )}
    </>
  );
};

export default ActionMenu;






























