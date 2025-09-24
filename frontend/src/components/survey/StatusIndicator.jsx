import React from 'react';

const StatusIndicator = ({ 
  status = 'incomplete',
  size = 'md',
  className = ''
}) => {
  const statusConfig = {
    complete: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      border: 'border-green-200',
      label: 'Complete'
    },
    incomplete: {
      bg: 'bg-amber-100',
      text: 'text-amber-800',
      border: 'border-amber-200',
      label: 'Incomplete'
    },
    error: {
      bg: 'bg-red-100',
      text: 'text-red-800',
      border: 'border-red-200',
      label: 'Error'
    },
    pending: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      border: 'border-yellow-200',
      label: 'Pending'
    }
  };

  const sizes = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  const config = statusConfig[status] || statusConfig.incomplete;

  return (
    <span className={`inline-flex items-center font-semibold rounded-full border ${config.bg} ${config.text} ${config.border} ${sizes[size]} ${className}`}>
      {config.label}
    </span>
  );
};

export default StatusIndicator;
