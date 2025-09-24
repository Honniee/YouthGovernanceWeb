import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  CheckCircle, 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  X,
  ExternalLink,
  Eye,
  Undo
} from 'lucide-react';

/**
 * Universal Toast Notification Component
 * Replaces basic browser alerts with beautiful, actionable toast notifications
 * Used across all management systems (Staff, SK Officials, SK Terms, Reports)
 */

const ToastNotification = ({
  id,
  type = 'info',
  title,
  message,
  duration = 5000,
  actions = [],
  onClose,
  onAction,
  showCloseButton = true,
  position = 'top-right',
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  // Auto-show animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Auto-dismiss timer
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onClose(id);
    }, 300);
  };

  const handleActionClick = (action) => {
    if (action.onClick) {
      action.onClick();
    }
    if (onAction) {
      onAction(action);
    }
    if (action.closeOnClick !== false) {
      handleClose();
    }
  };

  // Toast type configurations
  const typeConfig = {
    success: {
      icon: CheckCircle,
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      iconColor: 'text-green-600',
      titleColor: 'text-green-900',
      messageColor: 'text-green-700'
    },
    error: {
      icon: AlertCircle,
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      iconColor: 'text-red-600',
      titleColor: 'text-red-900',
      messageColor: 'text-red-700'
    },
    warning: {
      icon: AlertTriangle,
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      iconColor: 'text-yellow-600',
      titleColor: 'text-yellow-900',
      messageColor: 'text-yellow-700'
    },
    info: {
      icon: Info,
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      iconColor: 'text-blue-600',
      titleColor: 'text-blue-900',
      messageColor: 'text-blue-700'
    }
  };

  const config = typeConfig[type] || typeConfig.info;
  const Icon = config.icon;

  // Position classes with responsive positioning
  const positionClasses = {
    'top-right': 'top-2 right-2 sm:top-4 sm:right-4',
    'top-left': 'top-2 left-2 sm:top-4 sm:left-4',
    'top-center': 'top-2 left-2 right-2 sm:top-4 sm:left-1/2 sm:right-auto sm:transform sm:-translate-x-1/2',
    'bottom-right': 'bottom-2 right-2 sm:bottom-4 sm:right-4',
    'bottom-left': 'bottom-2 left-2 sm:bottom-4 sm:left-4',
    'bottom-center': 'bottom-2 left-2 right-2 sm:bottom-4 sm:left-1/2 sm:right-auto sm:transform sm:-translate-x-1/2'
  };

  return createPortal(
    <div
      className={`
        fixed z-[100] pointer-events-auto
        w-full max-w-sm sm:max-w-md lg:max-w-lg
        mx-2 sm:mx-0
        ${positionClasses[position]}
        transition-all duration-300 ease-out
        ${isVisible && !isLeaving 
          ? 'opacity-100 translate-y-0 scale-100' 
          : 'opacity-0 translate-y-2 scale-95'
        }
        ${className}
      `}
    >
      <div
        className={`
          ${config.bgColor} ${config.borderColor}
          border rounded-lg shadow-lg
          p-3 sm:p-4
          backdrop-blur-sm
        `}
      >
        <div className="flex items-start">
          {/* Icon */}
          <div className="flex-shrink-0">
            <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${config.iconColor}`} />
          </div>

          {/* Content */}
          <div className="ml-2 sm:ml-3 flex-1 min-w-0">
            {title && (
              <h3 className={`text-xs sm:text-sm font-medium ${config.titleColor} truncate`}>
                {title}
              </h3>
            )}
            {message && (
              <p className={`text-xs sm:text-sm ${config.messageColor} ${title ? 'mt-1' : ''} break-words leading-relaxed`}>
                {message}
              </p>
            )}

            {/* Actions */}
            {actions.length > 0 && (
              <div className="mt-2 sm:mt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-1 sm:gap-2">
                {actions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => handleActionClick(action)}
                    className={`
                      inline-flex items-center justify-center px-2 sm:px-3 py-1 sm:py-1.5 
                      text-xs font-medium rounded-md
                      transition-colors duration-200
                      ${action.variant === 'primary' 
                        ? `${config.iconColor.replace('text-', 'bg-').replace('600', '100')} ${config.iconColor} hover:${config.iconColor.replace('600', '200')}`
                        : `${config.bgColor} ${config.iconColor} hover:${config.iconColor.replace('600', '700')} border ${config.borderColor}`
                      }
                    `}
                  >
                    {action.icon && <span className="mr-1 flex-shrink-0">{action.icon}</span>}
                    <span className="truncate">{action.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Close Button */}
          {showCloseButton && (
            <div className="ml-2 sm:ml-4 flex-shrink-0">
              <button
                onClick={handleClose}
                className={`
                  inline-flex rounded-md p-1 sm:p-1.5 transition-colors duration-200
                  ${config.iconColor} hover:${config.bgColor}
                `}
              >
                <X className="w-3 h-3 sm:w-4 sm:h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ToastNotification;
