import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * Base Modal Component - Universal modal with smart positioning and responsive behavior
 * Handles mobile overlay vs desktop dropdown positioning automatically
 */
const Modal = ({
  isOpen = false,
  onClose,
  triggerRef,
  children,
  title,
  size = 'md', // 'sm', 'md', 'lg', 'xl', 'full'
  position = 'auto', // 'auto', 'center', 'dropdown'
  variant = 'default', // 'default', 'overlay', 'dropdown'
  showCloseButton = true,
  closeOnBackdrop = true,
  closeOnEscape = true,
  className = '',
  contentClassName = '',
  backdropClassName = '',
  ...props
}) => {
  const [modalPosition, setModalPosition] = useState({ top: 0, left: 0, placement: 'bottom' });
  const modalRef = useRef(null);

  // Size configurations
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          desktop: 'w-64 max-h-[60vh]',
          mobile: 'max-w-sm'
        };
      case 'lg':
        return {
          desktop: 'w-96 max-h-[80vh]',
          mobile: 'max-w-lg'
        };
      case 'xl':
        return {
          desktop: 'w-[32rem] max-h-[85vh]',
          mobile: 'max-w-2xl'
        };
      case 'full':
        return {
          desktop: 'w-[90vw] max-w-4xl max-h-[90vh]',
          mobile: 'max-w-full'
        };
      default: // md
        return {
          desktop: 'w-80 max-h-[70vh]',
          mobile: 'max-w-md'
        };
    }
  };

  // Calculate optimal position for dropdown mode
  const calculatePosition = () => {
    if (!triggerRef?.current || variant === 'overlay') return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    // Modal dimensions (estimated based on size)
    const sizeClasses = getSizeClasses();
    const modalWidth = parseInt(sizeClasses.desktop.match(/w-(\d+)/)?.[1]) * 4 || 320; // Convert Tailwind to px
    const modalHeight = 400; // Estimated height

    let placement = 'bottom';
    let top = triggerRect.bottom + 8;
    let left = triggerRect.left;

    // Smart positioning logic
    if (position === 'auto') {
      // Check if modal would overflow on the right
      if (left + modalWidth > viewport.width - 16) {
        left = triggerRect.right - modalWidth;
      }

      // Check if modal would overflow at the bottom
      if (top + modalHeight > viewport.height - 16) {
        top = triggerRect.top - modalHeight - 8;
        placement = 'top';
      }

      // Ensure minimum margins
      left = Math.max(16, Math.min(left, viewport.width - modalWidth - 16));
      top = Math.max(16, Math.min(top, viewport.height - modalHeight - 16));
    }

    setModalPosition({ top, left, placement });
  };

  // Handle backdrop click with touch support
  const handleBackdropClick = (e) => {
    if (closeOnBackdrop && e.target === e.currentTarget) {
      onClose?.();
    }
  };

  // Mobile-specific backdrop handler (more restrictive)
  const handleMobileBackdropClick = (e) => {
    // Only close if it's a direct click on backdrop, not during scroll
    if (closeOnBackdrop && e.target === e.currentTarget && e.type === 'click') {
      onClose?.();
    }
  };

  // Prevent modal close during scroll/touch interactions
  const handleModalContentInteraction = (e) => {
    e.stopPropagation();
  };

  // Handle escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEscape, onClose]);

  // Update position when modal opens or window resizes
  useEffect(() => {
    if (isOpen && variant === 'dropdown') {
      calculatePosition();
    }
  }, [isOpen, variant]);

  // Lock body scroll on mobile when modal is open
  useEffect(() => {
    if (!isOpen) return;

    // Only lock scroll on mobile/tablet
    if (window.innerWidth < 1024) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleResize = () => {
      if (variant === 'dropdown') {
        calculatePosition();
      }
    };

    const handleScroll = () => {
      // Only close on scroll for desktop dropdown, never on mobile
      if (variant === 'dropdown' && window.innerWidth >= 1024) {
        onClose?.();
      }
    };

    window.addEventListener('resize', handleResize);
    document.addEventListener('scroll', handleScroll, true);

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen, variant, onClose]);

  if (!isOpen) return null;

  const sizeClasses = getSizeClasses();

  // Mobile overlay version (always full screen on mobile)
  const renderMobileModal = () => (
    <div className="fixed inset-0 z-[9999] lg:hidden">
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/30 backdrop-blur-[2px] transition-opacity ${backdropClassName}`}
        onClick={handleMobileBackdropClick}
      />
      
      {/* Modal */}
      <div 
        className="fixed inset-4 bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col"
        onClick={handleModalContentInteraction}
        onTouchStart={handleModalContentInteraction}
        onTouchMove={handleModalContentInteraction}
        onTouchEnd={handleModalContentInteraction}
        style={{
          // Prevent any scroll-related interference
          overscrollBehavior: 'contain'
        }}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="p-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
            {title && (
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 p-2 -mr-2"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
        
        {/* Content - Enhanced scrolling for mobile */}
        <div 
          className={`flex-1 overflow-auto ${contentClassName}`}
          style={{ 
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-y',
            overscrollBehavior: 'contain',
            // Ensure smooth scrolling on all mobile devices
            scrollBehavior: 'smooth'
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );

  // Desktop dropdown version
  const renderDesktopModal = () => {
    if (variant === 'overlay' || position === 'center') {
      // Center overlay mode for desktop
      return (
        <div className="hidden lg:flex fixed inset-0 z-[9999] items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className={`fixed inset-0 bg-black/30 backdrop-blur-[2px] transition-opacity ${backdropClassName}`}
            onClick={handleBackdropClick}
          />
          
          {/* Modal */}
          <div
            ref={modalRef}
            className={`
              relative bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col
              ${sizeClasses.desktop} ${className}
            `}
            {...props}
          >
            {/* Header */}
            {(title || showCloseButton) && (
              <div className="p-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
                {title && (
                  <h3 className="text-base font-semibold text-gray-900">{title}</h3>
                )}
                {showCloseButton && (
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 p-1"
                    aria-label="Close modal"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
            
            {/* Content */}
            <div className={`flex-1 overflow-hidden ${contentClassName}`}>
              {children}
            </div>
          </div>
        </div>
      );
    }

    // Dropdown mode for desktop
    return (
      <div className="hidden lg:block">
        {/* Backdrop */}
        <div
          className="fixed inset-0 z-[9998]"
          onClick={handleBackdropClick}
        />
        
        {/* Modal */}
        <div
          ref={modalRef}
          className={`
            fixed z-[9999] bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden
            ${sizeClasses.desktop} ${className}
          `}
          style={{
            top: modalPosition.top,
            left: modalPosition.left,
          }}
          {...props}
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <div className="p-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              {title && (
                <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
              )}
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 p-1"
                  aria-label="Close modal"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
          
          {/* Content */}
          <div className={`overflow-hidden ${contentClassName}`}>
            {children}
          </div>
        </div>
      </div>
    );
  };

  return createPortal(
    <>
      {renderMobileModal()}
      {renderDesktopModal()}
    </>,
    document.body
  );
};

export default Modal;


