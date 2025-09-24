import React from 'react';

const Button = ({ 
  children, 
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
  onClick,
  type = 'button',
  icon = null,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variants = {
    primary: disabled 
      ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
      : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg',
    secondary: disabled
      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
      : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    outline: disabled
      ? 'border border-gray-300 text-gray-400 cursor-not-allowed'
      : 'border border-gray-300 text-gray-700 hover:bg-gray-50',
    danger: disabled
      ? 'bg-red-300 text-red-500 cursor-not-allowed'
      : 'bg-red-600 text-white hover:bg-red-700'
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm rounded-lg',
    md: 'px-4 py-2 text-sm rounded-xl',
    lg: 'px-6 py-3 text-base rounded-xl'
  };
  
  const focusRings = {
    primary: 'focus:ring-blue-500',
    secondary: 'focus:ring-gray-500',
    outline: 'focus:ring-gray-500',
    danger: 'focus:ring-red-500'
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${focusRings[variant]} ${className}`}
      {...props}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {children}
    </button>
  );
};

export default Button;
