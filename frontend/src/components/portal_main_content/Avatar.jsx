import React from 'react';

/**
 * Avatar Component - Reusable user avatar with consistent styling
 * Supports profile pictures, initials, and different sizes
 */
const Avatar = ({
  // User data
  user = {},
  name = '',
  email = '',
  avatarUrl = null,
  
  // Appearance
  size = 'md',
  shape = 'circle', // 'circle', 'rounded', 'square'
  variant = 'gradient', // 'gradient', 'solid', 'soft'
  color = 'blue', // Matches tab colors: 'blue', 'green', 'yellow', 'red', 'purple', 'gray'
  
  // Behavior
  showTooltip = false,
  onClick,
  className = '',
  
  // Accessibility
  alt = '',
  ...props
}) => {
  // Extract data from user object if provided
  const displayName = name || user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.displayName || '';
  const displayEmail = email || user.email || user.personalEmail || '';
  const displayAvatar = avatarUrl || user.avatar || user.profilePicture || user.profileImage || '';
  const displayAlt = alt || `${displayName} avatar` || 'User avatar';

  // Size configurations
  const getSizeClasses = () => {
    switch (size) {
      case 'xs':
        return {
          container: 'w-6 h-6',
          text: 'text-xs',
          icon: 'w-3 h-3'
        };
      case 'sm':
        return {
          container: 'w-8 h-8',
          text: 'text-xs',
          icon: 'w-4 h-4'
        };
      case 'lg':
        return {
          container: 'w-16 h-16',
          text: 'text-lg',
          icon: 'w-8 h-8'
        };
      case 'xl':
        return {
          container: 'w-20 h-20',
          text: 'text-xl',
          icon: 'w-10 h-10'
        };
      case '2xl':
        return {
          container: 'w-24 h-24',
          text: 'text-2xl',
          icon: 'w-12 h-12'
        };
      default: // md
        return {
          container: 'w-12 h-12',
          text: 'text-sm',
          icon: 'w-6 h-6'
        };
    }
  };

  // Shape configurations
  const getShapeClasses = () => {
    switch (shape) {
      case 'rounded':
        return 'rounded-lg';
      case 'square':
        return 'rounded-none';
      default: // circle
        return 'rounded-full';
    }
  };

  // Color configurations aligned with Tab component
  const getColorClasses = () => {
    const baseClasses = {
      gradient: {
        blue: 'bg-gradient-to-br from-blue-500 to-blue-600 text-white',
        green: 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white',
        yellow: 'bg-gradient-to-br from-amber-500 to-amber-600 text-white',
        red: 'bg-gradient-to-br from-red-500 to-red-600 text-white',
        purple: 'bg-gradient-to-br from-purple-500 to-purple-600 text-white',
        gray: 'bg-gradient-to-br from-slate-500 to-slate-600 text-white'
      },
      solid: {
        blue: 'bg-blue-500 text-white',
        green: 'bg-emerald-500 text-white',
        yellow: 'bg-amber-500 text-white',
        red: 'bg-red-500 text-white',
        purple: 'bg-purple-500 text-white',
        gray: 'bg-slate-500 text-white'
      },
      soft: {
        blue: 'bg-blue-100 text-blue-700',
        green: 'bg-emerald-100 text-emerald-700',
        yellow: 'bg-amber-100 text-amber-700',
        red: 'bg-red-100 text-red-700',
        purple: 'bg-purple-100 text-purple-700',
        gray: 'bg-slate-100 text-slate-700'
      }
    };

    return baseClasses[variant]?.[color] || baseClasses.gradient.blue;
  };

  // Get initials from name
  const getInitials = (name) => {
    if (!name) return '?';
    
    const words = name.trim().split(' ');
    if (words.length === 1) {
      return words[0].charAt(0).toUpperCase();
    }
    
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
  };

  const sizeClasses = getSizeClasses();
  const shapeClasses = getShapeClasses();
  const colorClasses = getColorClasses();

  const containerClasses = `
    ${sizeClasses.container}
    ${shapeClasses}
    ${displayAvatar ? '' : colorClasses}
    flex items-center justify-center font-semibold
    ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity duration-200' : ''}
    ${className}
  `.trim();

  const content = displayAvatar ? (
    <img 
      src={displayAvatar} 
      alt={displayAlt}
      className={`w-full h-full ${shapeClasses} object-cover`}
      onError={(e) => {
        // Fallback to initials if image fails to load
        e.target.style.display = 'none';
        e.target.nextSibling.style.display = 'flex';
      }}
    />
  ) : (
    <span className={`${sizeClasses.text} select-none`}>
      {getInitials(displayName)}
    </span>
  );

  const avatarElement = (
    <div 
      className={containerClasses}
      onClick={onClick}
      {...props}
    >
      {content}
      {/* Fallback initials (hidden by default, shown if image fails) */}
      {displayAvatar && (
        <span 
          className={`${sizeClasses.text} select-none ${colorClasses}`}
          style={{ display: 'none' }}
        >
          {getInitials(displayName)}
        </span>
      )}
    </div>
  );

  // Wrap with tooltip if enabled
  if (showTooltip && (displayName || displayEmail)) {
    return (
      <div className="relative group">
        {avatarElement}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
          <div className="font-medium">{displayName}</div>
          {displayEmail && <div className="text-gray-300">{displayEmail}</div>}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
        </div>
      </div>
    );
  }

  return avatarElement;
};

export default Avatar;
