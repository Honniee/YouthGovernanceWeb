import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Download, ChevronDown, FileText, FileSpreadsheet } from 'lucide-react';

/**
 * ExportButton Component - Reusable export button with dropdown options
 * Supports multiple export formats with consistent styling and behavior
 */
const ExportButton = ({
  // Export options
  formats = ['csv', 'pdf'], // Available export formats
  onExport, // Function called when export is triggered: (format) => void
  
  // State
  isExporting = false,
  disabled = false,
  
  // Appearance
  variant = 'primary', // 'primary', 'secondary', 'outline'
  size = 'md', // 'sm', 'md', 'lg'
  
  // Labels
  label = 'Export',
  loadingLabel = 'Exporting...',
  
  // Responsive
  responsive = false, // If true, shows only icon on mobile
  
  // Positioning
  position = 'auto', // 'auto', 'fixed', 'absolute'
  align = 'left', // 'left', 'right', 'center'
  
  // Styling
  className = '',
  dropdownClassName = '',
  
  // Advanced
  customFormats = {}, // Custom format configurations
  showIcons = true,
  closeOnSelect = true,
  
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, placement: 'bottom-right' });
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);

  // Default format configurations
  const defaultFormats = {
    csv: {
      label: 'Export as CSV',
      icon: <FileSpreadsheet className="w-4 h-4" />,
      description: 'Comma-separated values file'
    },
    pdf: {
      label: 'Export as PDF',
      icon: <FileText className="w-4 h-4" />,
      description: 'Portable document format',
      styles: [] // Removed default styles for cleaner interface
    },
    json: {
      label: 'Export as JSON',
      icon: <FileText className="w-4 h-4" />,
      description: 'JavaScript object notation'
    },
    xlsx: {
      label: 'Export as Excel',
      icon: <FileSpreadsheet className="w-4 h-4" />,
      description: 'Microsoft Excel file'
    }
  };

  // Merge custom formats with defaults
  const formatConfigs = { ...defaultFormats, ...customFormats };

  // Size configurations
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          button: 'px-2.5 py-1.5 text-xs',
          icon: 'w-3.5 h-3.5',
          dropdown: 'min-w-40'
        };
      case 'lg':
        return {
          button: 'px-4 py-3 text-base',
          icon: 'w-5 h-5',
          dropdown: 'min-w-56'
        };
      default: // md
        return {
          button: 'px-3 py-2 text-sm',
          icon: 'w-4 h-4',
          dropdown: 'min-w-48'
        };
    }
  };

  // Variant configurations
  const getVariantClasses = () => {
    const baseClasses = 'inline-flex items-center font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';
    
    switch (variant) {
      case 'secondary':
        return `${baseClasses} bg-gray-600 text-white hover:bg-gray-700`;
      case 'outline':
        return `${baseClasses} border border-blue-600 text-blue-600 bg-white hover:bg-blue-50`;
      default: // primary
        return `${baseClasses} bg-blue-600 text-white hover:bg-blue-700`;
    }
  };

  const sizeClasses = getSizeClasses();
  const variantClasses = getVariantClasses();

  // Handle export selection
  const handleExport = (format, style = null) => {
    if (onExport) {
      onExport(format, style);
    }
    
    if (closeOnSelect) {
      setIsOpen(false);
    }
  };

  // Handle click outside and events (copied from ActionMenu)
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (buttonRef.current && !buttonRef.current.contains(e.target) &&
          dropdownRef.current && !dropdownRef.current.contains(e.target)) {
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

  // Update position when dropdown opens (copied from ActionMenu)
  useEffect(() => {
    if (isOpen) {
      calculatePosition();
    }
  }, [isOpen]);

  // Calculate optimal dropdown position (copied from ActionMenu)
  const calculatePosition = () => {
    if (!buttonRef.current) return;

    const triggerRect = buttonRef.current.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    // Dropdown dimensions (estimated)
    const dropdownWidth = responsive ? 180 : (sizeClasses.dropdown.includes('min-w-56') ? 224 : sizeClasses.dropdown.includes('min-w-40') ? 160 : 192);
    const dropdownHeight = formats.length * 40 + 16; // Estimated height based on formats

    let placement = 'bottom-right';
    let top = triggerRect.bottom + 4;
    let left = triggerRect.right - dropdownWidth;

    // Smart positioning logic
    if (position === 'auto') {
      // Check if dropdown would overflow on the left
      if (left < 8) {
        left = triggerRect.left;
        placement = 'bottom-left';
      }

      // Check if dropdown would overflow at the bottom
      if (top + dropdownHeight > viewport.height - 8) {
        top = triggerRect.top - dropdownHeight - 4;
        placement = placement.includes('left') ? 'top-left' : 'top-right';
      }

      // Ensure minimum margins
      left = Math.max(8, Math.min(left, viewport.width - dropdownWidth - 8));
      top = Math.max(8, Math.min(top, viewport.height - dropdownHeight - 8));
    } else {
      // Handle other positioning modes
      switch (align) {
        case 'right':
          left = triggerRect.right - dropdownWidth;
          break;
        case 'left':
          left = triggerRect.left;
          break;
        default:
          left = triggerRect.right - dropdownWidth;
          break;
      }
    }

    setDropdownPosition({ top, left, placement });
  };

  // Render dropdown content
  const renderDropdown = () => {
    const dropdownContent = (
      <div 
        ref={dropdownRef}
        className={`
          fixed z-[9999] bg-white rounded-lg shadow-lg border border-gray-200 py-1
          ${responsive ? 'min-w-44 max-w-56' : sizeClasses.dropdown}
          ${dropdownClassName}
        `}
        style={{
          top: dropdownPosition.top,
          left: dropdownPosition.left,
        }}
      >
        {formats.map((format) => {
          const config = formatConfigs[format];
          if (!config) return null;

          // Handle PDF with styles
          if (format === 'pdf' && Array.isArray(config.styles) && config.styles.length > 0) {
            return (
              <div key={format} className="px-2 py-1">
                <div className="flex items-center px-2 py-1 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {showIcons && config.icon && (
                    <span className="mr-2">{config.icon}</span>
                  )}
                  PDF Export Styles
                </div>
                {config.styles.map((style) => (
                  <button
                    key={`${format}-${style.value}`}
                    onClick={() => handleExport(format, style.value)}
                    disabled={disabled || isExporting}
                    className="w-full flex items-start px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 rounded"
                  >
                    <div className="text-left ml-4">
                      <div className="font-medium">{style.label}</div>
                      <div className="text-xs text-gray-500">{style.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            );
          }

          // Handle other formats normally
          return (
            <button
              key={format}
              onClick={() => handleExport(format)}
              disabled={disabled || isExporting}
              className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {showIcons && config.icon && (
                <span className="mr-3">{config.icon}</span>
              )}
              <div className="text-left">
                <div className="font-medium">{config.label}</div>
                {config.description && (
                  <div className="text-xs text-gray-500">{config.description}</div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    );

    // Always use portal to prevent cropping issues
    return createPortal(
      <>
        {/* Backdrop */}
        <div 
          className="fixed inset-0 z-[9998]" 
          onClick={() => setIsOpen(false)}
        />
        {dropdownContent}
      </>,
      document.body
    );
  };

  return (
    <div className={`relative ${className}`} {...props}>
      <button
        ref={buttonRef}
        onClick={() => {
          if (!isOpen) {
            calculatePosition();
          }
          setIsOpen(!isOpen);
        }}
        disabled={disabled || isExporting}
        className={`${variantClasses} ${sizeClasses.button}`}
        title={responsive ? (isExporting ? loadingLabel : label) : undefined} // Show tooltip on mobile when responsive
      >
        <Download className={`${sizeClasses.icon} ${responsive ? '' : 'mr-2'}`} />
        {responsive ? (
          // Responsive mode: show text only on tablet screens and up
          <>
            <span className="hidden md:inline ml-2">{isExporting ? loadingLabel : label}</span>
            <ChevronDown className={`${sizeClasses.icon} ml-2 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </>
        ) : (
          // Normal mode: always show text
          <>
            {isExporting ? loadingLabel : label}
            <ChevronDown className={`${sizeClasses.icon} ml-2 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </>
        )}
      </button>

      {isOpen && renderDropdown()}
    </div>
  );
};

export default ExportButton;

