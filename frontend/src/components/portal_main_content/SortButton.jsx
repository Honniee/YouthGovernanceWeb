import React, { forwardRef } from 'react';
import { ArrowUpDown, ChevronDown } from 'lucide-react';

/**
 * SortButton Component - Reusable sort button with consistent styling
 * Supports active states, sort indicators, and responsive design
 */
const SortButton = forwardRef(({
  // State
  isOpen = false,
  isActive = false, // Whether sorting is applied (non-default)
  sortOrder = 'asc', // 'asc', 'desc'
  disabled = false,
  
  // Handlers
  onClick,
  
  // Appearance
  size = 'md', // 'sm', 'md', 'lg'
  variant = 'default', // 'default', 'primary', 'blue'
  responsive = true, // If true, hides text on mobile/small tablets
  
  // Labels
  label = 'Sort',
  
  // Styling
  className = '',
  
  // Advanced
  showIndicator = true,
  indicatorStyle = 'arrow', // 'arrow', 'dot'
  
  ...props
}, ref) => {
  
  // Size configurations
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          button: 'px-2 py-1.5 text-xs',
          icon: 'w-3.5 h-3.5',
          spacing: 'md:mr-2',
          chevronSpacing: 'ml-1'
        };
      case 'lg':
        return {
          button: 'px-4 py-3 text-base',
          icon: 'w-5 h-5',
          spacing: 'md:mr-2',
          chevronSpacing: 'ml-2'
        };
      default: // md
        return {
          button: 'px-2 py-1.5 md:px-3 md:py-2 text-sm',
          icon: 'w-3.5 h-3.5 md:w-4 md:h-4',
          spacing: 'md:mr-2',
          chevronSpacing: 'ml-1'
        };
    }
  };

  // Variant and state-based styling
  const getVariantClasses = () => {
    const baseClasses = 'inline-flex items-center border rounded-lg font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed';
    
    // Active/open state styling
    if (isOpen || isActive) {
      switch (variant) {
        case 'primary':
          return `${baseClasses} border-gray-500 text-gray-600 bg-gray-50`;
        case 'blue':
          return `${baseClasses} border-blue-500 text-blue-600 bg-blue-50`;
        default:
          return `${baseClasses} border-blue-500 text-blue-600 bg-blue-50`;
      }
    }
    
    // Default/inactive state styling
    switch (variant) {
      case 'primary':
        return `${baseClasses} border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50`;
      case 'blue':
        return `${baseClasses} border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50`;
      default:
        return `${baseClasses} border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50`;
    }
  };

  // Sort indicator styling
  const getIndicatorClasses = () => {
    const baseClasses = 'px-1.5 py-0.5 text-xs font-medium rounded-full border';
    
    if (isActive) {
      switch (variant) {
        case 'primary':
          return `${baseClasses} bg-gray-100 text-gray-700 border-gray-200`;
        case 'blue':
          return `${baseClasses} bg-blue-100 text-blue-700 border-blue-200`;
        default:
          return `${baseClasses} bg-blue-100 text-blue-700 border-blue-200`;
      }
    }
    
    return `${baseClasses} bg-gray-100 text-gray-700 border-gray-200`;
  };

  // Get sort indicator content
  const getSortIndicator = () => {
    if (indicatorStyle === 'arrow') {
      return sortOrder === 'asc' ? '↑' : '↓';
    }
    return '•';
  };

  const sizeClasses = getSizeClasses();
  const variantClasses = getVariantClasses();
  const indicatorClasses = getIndicatorClasses();

  return (
    <button
      ref={ref}
      onClick={onClick}
      disabled={disabled}
      className={`${variantClasses} ${sizeClasses.button} ${className}`}
      {...props}
    >
      <ArrowUpDown className={`${sizeClasses.icon} ${responsive ? sizeClasses.spacing : 'mr-2'}`} />
      
      {responsive ? (
        // Responsive: hide text on mobile/small, show on tablet+
        <span className="hidden md:inline">{label}</span>
      ) : (
        // Always show text
        label
      )}
      
      <ChevronDown className={`${sizeClasses.icon} ${sizeClasses.chevronSpacing}`} />
      
      {/* Sort Indicator */}
      {showIndicator && isActive && (
        <div className={`ml-2 ${indicatorClasses}`}>
          {getSortIndicator()}
        </div>
      )}
    </button>
  );
});

SortButton.displayName = 'SortButton';

export default SortButton;
