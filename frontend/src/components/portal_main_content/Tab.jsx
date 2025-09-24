import React from 'react';

const Tab = ({
  id,
  label,
  shortLabel, // Mobile fallback
  count,
  color = 'blue',
  icon,
  isActive = false,
  onClick,
  disabled = false,
  variant = 'underline',
  size = 'md',
  showCount = true,
  className = ''
}) => {
  // Color mappings
  const getTabColor = (color) => {
    switch (color) {
      case 'blue': return 'border-blue-500 text-blue-600 bg-blue-50';
      case 'green': return 'border-emerald-500 text-emerald-600 bg-emerald-50';
      case 'yellow': return 'border-amber-500 text-amber-600 bg-amber-50';
      case 'red': return 'border-red-500 text-red-600 bg-red-50';
      case 'purple': return 'border-purple-500 text-purple-600 bg-purple-50';
      case 'pink': return 'border-pink-500 text-pink-600 bg-pink-50';
      case 'gray': return 'border-slate-500 text-slate-600 bg-slate-50';
      default: return 'border-blue-500 text-blue-600 bg-blue-50';
    }
  };

  const getTabBadgeColor = (color, isActive) => {
    if (isActive) {
      switch (color) {
        case 'blue': return 'bg-blue-100 text-blue-700';
        case 'green': return 'bg-emerald-100 text-emerald-700';
        case 'yellow': return 'bg-amber-100 text-amber-700';
        case 'red': return 'bg-red-100 text-red-700';
        case 'purple': return 'bg-purple-100 text-purple-700';
        case 'pink': return 'bg-pink-100 text-pink-700';
        case 'gray': return 'bg-slate-100 text-slate-700';
        default: return 'bg-blue-100 text-blue-700';
      }
    } else {
      return 'bg-gray-100 text-gray-600';
    }
  };

  const getIndicatorColor = (color) => {
    switch (color) {
      case 'blue': return 'bg-blue-500';
      case 'green': return 'bg-emerald-500';
      case 'yellow': return 'bg-amber-500';
      case 'red': return 'bg-red-500';
      case 'purple': return 'bg-purple-500';
      case 'pink': return 'bg-pink-500';
      case 'gray': return 'bg-slate-500';
      default: return 'bg-blue-500';
    }
  };

  // Size mappings
  const getSizeClasses = (size) => {
    switch (size) {
      case 'sm': return 'px-3 py-2 text-xs';
      case 'lg': return 'px-6 py-4 text-base';
      default: return 'px-4 py-3 text-sm';
    }
  };

  const getBadgeSize = (size) => {
    switch (size) {
      case 'sm': return 'ml-1.5 px-1.5 py-0.5 text-xs';
      case 'lg': return 'ml-3 px-2.5 py-1 text-sm';
      default: return 'ml-2 px-2 py-0.5 text-xs';
    }
  };

  // Variant styles
  const getVariantClasses = () => {
    const baseClasses = `
      relative flex items-center font-medium transition-all duration-200 whitespace-nowrap
      ${getSizeClasses(size)}
      ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      ${className}
    `.trim();

    switch (variant) {
      case 'pills':
        return `
          ${baseClasses}
          rounded-full
          ${isActive 
            ? getTabColor(color)
            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          }
        `.trim();
      
      case 'buttons':
        return `
          ${baseClasses}
          rounded-lg border
          ${isActive 
            ? `${getTabColor(color)} border-current`
            : 'border-gray-200 text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }
        `.trim();
      
      default: // underline
        return `
          ${baseClasses}
          border-b-2
          ${isActive
            ? getTabColor(color)
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }
        `.trim();
    }
  };

  const handleClick = () => {
    if (!disabled && onClick) {
      onClick();
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={getVariantClasses()}
      aria-selected={isActive}
      role="tab"
      tabIndex={isActive ? 0 : -1}
    >
      {/* Icon */}
      {icon && (
        <span className={`${size === 'sm' ? 'mr-1' : 'mr-2'}`}>
          {icon}
        </span>
      )}

      {/* Label */}
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">{shortLabel || label.split(' ')[0]}</span>

      {/* Count Badge */}
      {showCount && count !== undefined && (
        <span className={`
          ${getBadgeSize(size)} 
          rounded-full font-semibold
          ${getTabBadgeColor(color, isActive)}
        `}>
          {count}
        </span>
      )}

      {/* Active Indicator for underline variant */}
      {variant === 'underline' && isActive && (
        <div className={`
          absolute bottom-0 left-0 right-0 h-0.5 
          ${getIndicatorColor(color)}
        `} />
      )}
    </button>
  );
};

export default Tab;






























