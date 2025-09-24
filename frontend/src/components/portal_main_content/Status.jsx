import React from 'react';
import { 
  UserCheck, 
  UserX, 
  User, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  Pause,
  Play,
  Shield,
  ShieldAlert
} from 'lucide-react';

/**
 * Status Component - Reusable status indicator aligned with tab colors
 * Supports different status types, variants, and styling options
 */
const Status = ({
  // Status data
  status = 'active',
  label = '',
  
  // Appearance
  variant = 'badge', // 'badge', 'dot', 'pill', 'outline', 'minimal'
  size = 'md', // 'xs', 'sm', 'md', 'lg'
  color = 'auto', // 'auto', 'blue', 'green', 'yellow', 'red', 'purple', 'gray'
  showIcon = true,
  
  // Behavior
  interactive = false,
  onClick,
  className = '',
  
  // Custom
  customIcon,
  customLabel,
  ...props
}) => {
  // Status configurations aligned with tab colors
  const getStatusConfig = (status) => {
    const configs = {
      // User/Staff statuses (aligned with StaffManagement tabs)
      active: {
        color: 'green',
        icon: <CheckCircle className="w-4 h-4" />,
        label: 'Active',
        description: 'User is active and can access the system'
      },
      deactivated: {
        color: 'yellow',
        icon: <UserX className="w-4 h-4" />,
        label: 'Deactivated',
        description: 'User is deactivated and cannot access the system'
      },
      inactive: {
        color: 'gray',
        icon: <User className="w-4 h-4" />,
        label: 'Inactive',
        description: 'User is inactive'
      },
      archived: {
        color: 'gray',
        icon: <UserX className="w-4 h-4" />,
        label: 'Archived',
        description: 'Item has been archived'
      },
      
      // SK Term statuses
      completed: {
        color: 'gray',
        icon: <CheckCircle className="w-4 h-4" />,
        label: 'Completed',
        description: 'SK term has been completed'
      },
      upcoming: {
        color: 'yellow',
        icon: <Clock className="w-4 h-4" />,
        label: 'Upcoming',
        description: 'SK term is scheduled to start'
      },
      
      // General statuses
      pending: {
        color: 'blue',
        icon: <Clock className="w-4 h-4" />,
        label: 'Pending',
        description: 'Action is pending'
      },
      approved: {
        color: 'green',
        icon: <CheckCircle className="w-4 h-4" />,
        label: 'Approved',
        description: 'Item has been approved'
      },
      rejected: {
        color: 'red',
        icon: <XCircle className="w-4 h-4" />,
        label: 'Rejected',
        description: 'Item has been rejected'
      },
      warning: {
        color: 'yellow',
        icon: <AlertCircle className="w-4 h-4" />,
        label: 'Warning',
        description: 'Attention required'
      },
      error: {
        color: 'red',
        icon: <XCircle className="w-4 h-4" />,
        label: 'Error',
        description: 'An error has occurred'
      },
      success: {
        color: 'green',
        icon: <CheckCircle className="w-4 h-4" />,
        label: 'Success',
        description: 'Operation completed successfully'
      },
      info: {
        color: 'blue',
        icon: <AlertCircle className="w-4 h-4" />,
        label: 'Info',
        description: 'Information notice'
      },
      
      // Process statuses
      draft: {
        color: 'yellow',
        icon: <Pause className="w-4 h-4" />,
        label: 'Draft',
        description: 'Item is in draft state'
      },
      published: {
        color: 'green',
        icon: <Play className="w-4 h-4" />,
        label: 'Published',
        description: 'Item is published'
      },
      // Closed state (used by Survey Batches)
      closed: {
        color: 'gray',
        icon: <XCircle className="w-4 h-4" />,
        label: 'Closed',
        description: 'Item is closed'
      },
      
      // Security statuses
      verified: {
        color: 'green',
        icon: <Shield className="w-4 h-4" />,
        label: 'Verified',
        description: 'Identity verified'
      },
      unverified: {
        color: 'yellow',
        icon: <ShieldAlert className="w-4 h-4" />,
        label: 'Unverified',
        description: 'Identity not verified'
      }
    };

    return configs[status.toLowerCase()] || configs.inactive;
  };

  // Color configurations aligned with Tab component
  const getColorClasses = (colorName) => {
    const colorMap = {
      blue: {
        badge: 'bg-blue-100 text-blue-700 border-blue-200',
        dot: 'bg-blue-500',
        pill: 'bg-blue-500 text-white',
        outline: 'border-blue-500 text-blue-600',
        minimal: 'text-blue-600'
      },
      green: {
        badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        dot: 'bg-emerald-500',
        pill: 'bg-emerald-500 text-white',
        outline: 'border-emerald-500 text-emerald-600',
        minimal: 'text-emerald-600'
      },
      yellow: {
        badge: 'bg-amber-100 text-amber-700 border-amber-200',
        dot: 'bg-amber-500',
        pill: 'bg-amber-500 text-white',
        outline: 'border-amber-500 text-amber-600',
        minimal: 'text-amber-600'
      },
      red: {
        badge: 'bg-red-100 text-red-700 border-red-200',
        dot: 'bg-red-500',
        pill: 'bg-red-500 text-white',
        outline: 'border-red-500 text-red-600',
        minimal: 'text-red-600'
      },
      purple: {
        badge: 'bg-purple-100 text-purple-700 border-purple-200',
        dot: 'bg-purple-500',
        pill: 'bg-purple-500 text-white',
        outline: 'border-purple-500 text-purple-600',
        minimal: 'text-purple-600'
      },
      gray: {
        badge: 'bg-slate-100 text-slate-700 border-slate-200',
        dot: 'bg-slate-500',
        pill: 'bg-slate-500 text-white',
        outline: 'border-slate-500 text-slate-600',
        minimal: 'text-slate-600'
      }
    };

    return colorMap[colorName] || colorMap.gray;
  };

  // Size configurations
  const getSizeClasses = () => {
    switch (size) {
      case 'xs':
        return {
          badge: 'px-1.5 py-0.5 text-xs',
          dot: 'w-2 h-2',
          pill: 'px-2 py-0.5 text-xs',
          icon: 'w-3 h-3'
        };
      case 'sm':
        return {
          badge: 'px-2 py-0.5 text-xs',
          dot: 'w-2.5 h-2.5',
          pill: 'px-2.5 py-0.5 text-xs',
          icon: 'w-3.5 h-3.5'
        };
      case 'lg':
        return {
          badge: 'px-3 py-1 text-sm',
          dot: 'w-4 h-4',
          pill: 'px-4 py-1 text-sm',
          icon: 'w-5 h-5'
        };
      default: // md
        return {
          badge: 'px-2.5 py-0.5 text-xs',
          dot: 'w-3 h-3',
          pill: 'px-3 py-1 text-xs',
          icon: 'w-4 h-4'
        };
    }
  };

  const statusConfig = getStatusConfig(status);
  const finalColor = color === 'auto' ? statusConfig.color : color;
  const colorClasses = getColorClasses(finalColor);
  const sizeClasses = getSizeClasses();
  const displayLabel = customLabel || label || statusConfig.label;
  const displayIcon = customIcon || statusConfig.icon;

  // Base classes for interactive states
  const interactiveClasses = interactive ? 'cursor-pointer hover:opacity-80 transition-opacity duration-200' : '';

  // Variant-specific rendering
  const renderVariant = () => {
    switch (variant) {
      case 'dot':
        return (
          <div className={`flex items-center space-x-2 ${className} ${interactiveClasses}`} onClick={onClick} {...props}>
            <div className={`${sizeClasses.dot} rounded-full ${colorClasses.dot}`} />
            {displayLabel && <span className="text-sm text-gray-700">{displayLabel}</span>}
          </div>
        );

      case 'pill':
        return (
          <span 
            className={`
              inline-flex items-center rounded-full font-medium
              ${sizeClasses.pill} ${colorClasses.pill}
              ${className} ${interactiveClasses}
            `}
            onClick={onClick}
            {...props}
          >
            {showIcon && displayIcon && (
              <span className="mr-1.5">
                {React.cloneElement(displayIcon, { className: sizeClasses.icon })}
              </span>
            )}
            {displayLabel}
          </span>
        );

      case 'outline':
        return (
          <span 
            className={`
              inline-flex items-center rounded-lg border font-medium bg-white
              ${sizeClasses.badge} ${colorClasses.outline}
              ${className} ${interactiveClasses}
            `}
            onClick={onClick}
            {...props}
          >
            {showIcon && displayIcon && (
              <span className="mr-1.5">
                {React.cloneElement(displayIcon, { className: sizeClasses.icon })}
              </span>
            )}
            {displayLabel}
          </span>
        );

      case 'minimal':
        return (
          <span 
            className={`
              inline-flex items-center font-medium
              ${sizeClasses.badge} ${colorClasses.minimal}
              ${className} ${interactiveClasses}
            `}
            onClick={onClick}
            {...props}
          >
            {showIcon && displayIcon && (
              <span className="mr-1.5">
                {React.cloneElement(displayIcon, { className: sizeClasses.icon })}
              </span>
            )}
            {displayLabel}
          </span>
        );

      default: // badge
        return (
          <span 
            className={`
              inline-flex items-center rounded-full font-medium border
              ${sizeClasses.badge} ${colorClasses.badge}
              ${className} ${interactiveClasses}
            `}
            onClick={onClick}
            {...props}
          >
            {showIcon && displayIcon && (
              <span className="mr-1.5">
                {React.cloneElement(displayIcon, { className: sizeClasses.icon })}
              </span>
            )}
            {displayLabel}
          </span>
        );
    }
  };

  return renderVariant();
};

export default Status;











