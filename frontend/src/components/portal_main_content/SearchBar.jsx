import React, { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';

/**
 * SearchBar Component - Unified search input with responsive mobile/desktop behavior
 * Handles expandable mobile search, indicators, debouncing, and keyboard shortcuts
 */
const SearchBar = ({
  value = '',
  onChange,
  onClear,
  placeholder = 'Search...',
  disabled = false,
  autoFocus = false,
  showIndicator = true,
  indicatorText = 'Search',
  indicatorColor = 'orange',
  expandOnMobile = true,
  debounceMs = 0,
  size = 'md', // 'sm', 'md', 'lg'
  variant = 'default', // 'default', 'minimal', 'outlined'
  className = '',
  containerClassName = '',
  ...props
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [internalValue, setInternalValue] = useState(value);
  const [debounceTimer, setDebounceTimer] = useState(null);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  // Size configurations
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          input: 'pl-8 pr-4 py-1.5 text-sm',
          icon: 'w-3.5 h-3.5 left-2.5',
          button: 'p-1.5',
          container: 'w-64',
          expandedContainer: 'w-60'
        };
      case 'lg':
        return {
          input: 'pl-12 pr-4 py-3 text-base',
          icon: 'w-5 h-5 left-4',
          button: 'p-3',
          container: 'w-96 md:w-[28rem]',
          expandedContainer: 'w-80'
        };
      default: // md
        return {
          input: 'pl-10 pr-4 py-2',
          icon: 'w-4 h-4 left-3',
          button: 'p-2',
          container: 'w-80 md:w-96',
          expandedContainer: 'w-72'
        };
    }
  };

  // Variant configurations
  const getVariantClasses = () => {
    switch (variant) {
      case 'minimal':
        return 'border-none bg-gray-50 hover:bg-gray-100 focus:bg-white focus:ring-1';
      case 'outlined':
        return 'border-2 border-gray-300 focus:border-blue-500';
      default:
        return 'border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500';
    }
  };

  // Indicator color configurations
  const getIndicatorColor = () => {
    switch (indicatorColor) {
      case 'blue':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'green':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'red':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'purple':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'orange':
      default:
        return 'bg-orange-100 text-orange-700 border-orange-200';
    }
  };

  const sizeClasses = getSizeClasses();
  const variantClasses = getVariantClasses();
  const indicatorClasses = getIndicatorColor();

  // Handle input change with debouncing
  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInternalValue(newValue);

    // Clear existing timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Set new timer if debouncing is enabled
    if (debounceMs > 0) {
      const timer = setTimeout(() => {
        onChange?.(newValue);
      }, debounceMs);
      setDebounceTimer(timer);
    } else {
      onChange?.(newValue);
    }
  };

  // Handle clear
  const handleClear = () => {
    setInternalValue('');
    onChange?.('');
    onClear?.();
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Handle mobile expand
  const handleExpand = () => {
    setIsExpanded(true);
    // Focus input after animation
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);
  };

  // Handle mobile collapse
  const handleCollapse = () => {
    setIsExpanded(false);
    setInternalValue('');
    onChange?.('');
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e) => {
    switch (e.key) {
      case 'Escape':
        if (internalValue) {
          handleClear();
        } else if (expandOnMobile && isExpanded) {
          handleCollapse();
        } else {
          inputRef.current?.blur();
        }
        break;
      case 'Enter':
        e.preventDefault();
        // Trigger immediate search if debounced
        if (debounceMs > 0 && debounceTimer) {
          clearTimeout(debounceTimer);
          onChange?.(internalValue);
        }
        break;
    }
  };

  // Click outside handler for mobile
  useEffect(() => {
    if (!expandOnMobile || !isExpanded) return;

    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        if (!internalValue) {
          setIsExpanded(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [expandOnMobile, isExpanded, internalValue]);

  // Sync internal value with prop value
  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);

  // Mobile expandable version
  if (expandOnMobile) {
    return (
      <div className={`relative ${containerClassName}`} ref={containerRef}>
        {/* Mobile: Collapsible search button */}
        <div className="md:hidden">
          {!isExpanded ? (
            // Collapsed state - just the search icon
            <button
              onClick={handleExpand}
              disabled={disabled}
              className={`rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 ${sizeClasses.button} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              aria-label="Open search"
            >
              <Search className={sizeClasses.icon.replace('left-', 'w-').replace(' h-', ' h-')} />
            </button>
          ) : (
            // Expanded state - full search input (positioned to avoid covering other buttons)
            <div className={`fixed inset-x-4 top-20 z-50 transition-all duration-300 ease-in-out ${isExpanded ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}`}>
              <div className="relative">
                <Search className={`absolute top-1/2 transform -translate-y-1/2 text-gray-400 ${sizeClasses.icon}`} />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder={placeholder}
                  value={internalValue}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  disabled={disabled}
                  autoFocus={autoFocus}
                  className={`
                    ${sizeClasses.input} w-full
                    ${variantClasses}
                    rounded-lg transition-all duration-200 bg-white shadow-lg border-2 border-blue-200
                    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                    ${className}
                  `}
                  {...props}
                />
                
                {/* Clear button */}
                {internalValue && (
                  <button
                    onClick={handleClear}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                
                {/* Search indicator */}
                {showIndicator && internalValue && (
                  <div className={`absolute -top-2 -right-2 px-1.5 py-0.5 text-xs font-medium rounded-full border ${indicatorClasses}`}>
                    {indicatorText}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Desktop: Always visible search input */}
        <div className="hidden md:block relative">
          <Search className={`absolute top-1/2 transform -translate-y-1/2 text-gray-400 ${sizeClasses.icon}`} />
          <input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={internalValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            autoFocus={autoFocus}
            className={`
              ${sizeClasses.input} ${sizeClasses.container}
              ${variantClasses}
              rounded-lg transition-all duration-200
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              ${className}
            `}
            {...props}
          />
          
          {/* Clear button */}
          {internalValue && (
            <button
              onClick={handleClear}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          
          {/* Search indicator */}
          {showIndicator && internalValue && (
            <div className={`absolute -top-2 -right-2 px-1.5 py-0.5 text-xs font-medium rounded-full border ${indicatorClasses}`}>
              {indicatorText}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Non-expandable version (always visible)
  return (
    <div className={`relative ${containerClassName}`} ref={containerRef}>
      <Search className={`absolute top-1/2 transform -translate-y-1/2 text-gray-400 ${sizeClasses.icon}`} />
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={internalValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        autoFocus={autoFocus}
        className={`
          ${sizeClasses.input} ${sizeClasses.container}
          ${variantClasses}
          rounded-lg transition-all duration-200
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${className}
        `}
        {...props}
      />
      
      {/* Clear button */}
      {internalValue && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Clear search"
        >
          <X className="w-4 h-4" />
        </button>
      )}
      
      {/* Search indicator */}
      {showIndicator && internalValue && (
        <div className={`absolute -top-2 -right-2 px-1.5 py-0.5 text-xs font-medium rounded-full border ${indicatorClasses}`}>
          {indicatorText}
        </div>
      )}
    </div>
  );
};

export default SearchBar;








