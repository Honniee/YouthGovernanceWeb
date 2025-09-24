import React, { forwardRef } from 'react';
import { Filter, ChevronDown } from 'lucide-react';

/**
 * FilterButton Component - Reusable filter button with consistent styling
 * Supports active states, filter indicators, and responsive design
 */
const FilterButton = forwardRef(({
  // State
  isOpen = false,
  hasActiveFilters = false,
  activeFilterCount = 0,
  disabled = false,
  
  // Handlers
  onClick,
  
  // Appearance
  size = 'md', // 'sm', 'md', 'lg'
  variant = 'default', // 'default', 'primary', 'green'
  responsive = true, // If true, hides text on mobile
  
  // Labels
  label = 'Filter',
  
  // Styling
  className = '',
  
  // Advanced
  showIndicator = true,
  indicatorStyle = 'count', // 'count', 'dot'
  
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
    if (isOpen || hasActiveFilters) {
      switch (variant) {
        case 'primary':
          return `${baseClasses} border-blue-500 text-blue-600 bg-blue-50`;
        case 'green':
          return `${baseClasses} border-green-500 text-green-600 bg-green-50`;
        default:
          return `${baseClasses} border-green-500 text-green-600 bg-green-50`;
      }
    }
    
    // Default/inactive state styling
    switch (variant) {
      case 'primary':
        return `${baseClasses} border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50`;
      case 'green':
        return `${baseClasses} border-gray-200 text-gray-700 hover:border-green-300 hover:bg-green-50`;
      default:
        return `${baseClasses} border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50`;
    }
  };

  // Filter indicator styling
  const getIndicatorClasses = () => {
    const baseClasses = 'px-1.5 py-0.5 text-xs font-medium rounded-full border';
    
    if (hasActiveFilters) {
      switch (variant) {
        case 'primary':
          return `${baseClasses} bg-blue-100 text-blue-700 border-blue-200`;
        case 'green':
          return `${baseClasses} bg-green-100 text-green-700 border-green-200`;
        default:
          return `${baseClasses} bg-green-100 text-green-700 border-green-200`;
      }
    }
    
    return `${baseClasses} bg-gray-100 text-gray-700 border-gray-200`;
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
      <Filter className={`${sizeClasses.icon} ${responsive ? sizeClasses.spacing : 'mr-2'}`} />
      
      {responsive ? (
        // Responsive: hide text on mobile/small, show on tablet+
        <span className="hidden md:inline">{label}</span>
      ) : (
        // Always show text
        label
      )}
      
      <ChevronDown className={`${sizeClasses.icon} ${sizeClasses.chevronSpacing}`} />
      
      {/* Filter Indicator */}
      {showIndicator && hasActiveFilters && (
        <div className={`ml-2 ${indicatorClasses}`}>
          {indicatorStyle === 'count' ? activeFilterCount : '•'}
        </div>
      )}
    </button>
  );
});

FilterButton.displayName = 'FilterButton';

export default FilterButton;
