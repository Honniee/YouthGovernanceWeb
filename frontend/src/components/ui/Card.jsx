import React from 'react';
import { theme } from '../../theme/index.js';

const Card = ({ 
  variant = 'default', 
  children, 
  className = '', 
  hover = false,
  padding = 'normal',
  ...props 
}) => {
  // Base styles using theme
  const baseStyles = `
    bg-white border border-gray-200 rounded-lg
    transition-all duration-200
  `;

  // Variant styles
  const variantStyles = {
    default: 'shadow-md',
    elevated: 'shadow-lg',
    flat: 'shadow-none border-2',
    outlined: 'shadow-none border-2 border-blue-200',
  };

  // Hover effects
  const hoverStyles = hover ? 'hover:shadow-lg hover:-translate-y-1' : '';

  // Padding styles
  const paddingStyles = {
    none: 'p-0',
    small: 'p-4',
    normal: 'p-6',
    large: 'p-8',
  };

  const combinedClassName = `
    ${baseStyles}
    ${variantStyles[variant] || variantStyles.default}
    ${hoverStyles}
    ${paddingStyles[padding] || paddingStyles.normal}
    ${className}
  `.replace(/\s+/g, ' ').trim();

  return (
    <div 
      className={combinedClassName}
      {...props}
    >
      {children}
    </div>
  );
};

// Card sub-components for better structure
Card.Header = ({ children, className = '', ...props }) => (
  <div 
    className={`border-b border-gray-200 pb-4 mb-4 ${className}`}
    {...props}
  >
    {children}
  </div>
);

Card.Body = ({ children, className = '', ...props }) => (
  <div 
    className={`${className}`}
    {...props}
  >
    {children}
  </div>
);

Card.Footer = ({ children, className = '', ...props }) => (
  <div 
    className={`border-t border-gray-200 pt-4 mt-4 ${className}`}
    {...props}
  >
    {children}
  </div>
);

export default Card; 