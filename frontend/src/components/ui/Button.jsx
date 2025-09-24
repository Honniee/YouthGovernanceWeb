import React from 'react';
import { theme } from '../../theme/index.js';

const Button = ({ 
  variant = 'primary', 
  size = 'medium', 
  children, 
  className = '', 
  disabled = false,
  ...props 
}) => {
  // Base styles using theme
  const baseStyles = `
    inline-flex items-center justify-center
    font-medium transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
  `;

  // Variant styles
  const variantStyles = {
    primary: `
      bg-blue-600 text-white border border-transparent
      hover:bg-blue-700 focus:ring-blue-500
      shadow-sm hover:shadow-md
    `,
    secondary: `
      bg-gray-200 text-gray-800 border border-gray-300
      hover:bg-gray-300 focus:ring-gray-500
    `,
    outline: `
      bg-transparent text-blue-600 border border-blue-600
      hover:bg-blue-50 focus:ring-blue-500
    `,
    ghost: `
      bg-transparent text-gray-600 border border-transparent
      hover:bg-gray-100 focus:ring-gray-500
    `,
    success: `
      bg-green-600 text-white border border-transparent
      hover:bg-green-700 focus:ring-green-500
      shadow-sm hover:shadow-md
    `,
    warning: `
      bg-yellow-500 text-white border border-transparent
      hover:bg-yellow-600 focus:ring-yellow-500
      shadow-sm hover:shadow-md
    `,
    error: `
      bg-red-600 text-white border border-transparent
      hover:bg-red-700 focus:ring-red-500
      shadow-sm hover:shadow-md
    `,
  };

  // Size styles
  const sizeStyles = {
    small: 'px-3 py-1.5 text-sm rounded-md',
    medium: 'px-4 py-2 text-base rounded-md',
    large: 'px-6 py-3 text-lg rounded-lg',
  };

  const combinedClassName = `
    ${baseStyles}
    ${variantStyles[variant] || variantStyles.primary}
    ${sizeStyles[size] || sizeStyles.medium}
    ${className}
  `.replace(/\s+/g, ' ').trim();

  return (
    <button 
      className={combinedClassName}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button; 