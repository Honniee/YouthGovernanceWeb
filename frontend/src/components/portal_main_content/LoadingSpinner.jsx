import React from 'react';

/**
 * LoadingSpinner Component
 * 
 * A reusable loading spinner component that can be used throughout the application.
 * Supports different sizes, variants, and customizable messages.
 * 
 * @param {Object} props - Component properties
 * @param {string} [props.size='md'] - Size of the spinner ('xs', 'sm', 'md', 'lg', 'xl')
 * @param {string} [props.variant='spinner'] - Type of loading indicator ('spinner', 'dots', 'pulse', 'bars')
 * @param {string} [props.message='Loading...'] - Loading message text
 * @param {boolean} [props.showMessage=true] - Whether to show the loading message
 * @param {boolean} [props.center=true] - Whether to center the loading indicator
 * @param {string} [props.color='blue'] - Color theme ('blue', 'green', 'purple', 'gray', 'red')
 * @param {string} [props.height='h-64'] - Container height when centered
 * @param {string} [props.className=''] - Additional CSS classes
 */
const LoadingSpinner = ({
  size = 'md',
  variant = 'spinner',
  message = 'Loading...',
  showMessage = true,
  center = true,
  color = 'blue',
  height = 'h-64',
  className = ''
}) => {
  // Size configurations
  const sizeConfig = {
    xs: {
      spinner: 'h-4 w-4',
      text: 'text-xs',
      spacing: 'space-y-2'
    },
    sm: {
      spinner: 'h-5 w-5',
      text: 'text-sm',
      spacing: 'space-y-2'
    },
    md: {
      spinner: 'h-8 w-8',
      text: 'text-base',
      spacing: 'space-y-4'
    },
    lg: {
      spinner: 'h-12 w-12',
      text: 'text-lg',
      spacing: 'space-y-4'
    },
    xl: {
      spinner: 'h-16 w-16',
      text: 'text-xl',
      spacing: 'space-y-6'
    }
  };

  // Color configurations
  const colorConfig = {
    blue: {
      spinner: 'border-blue-600',
      text: 'text-blue-600',
      dots: 'bg-blue-600',
      pulse: 'bg-blue-200',
      bars: 'bg-blue-600'
    },
    green: {
      spinner: 'border-green-600',
      text: 'text-green-600',
      dots: 'bg-green-600',
      pulse: 'bg-green-200',
      bars: 'bg-green-600'
    },
    purple: {
      spinner: 'border-purple-600',
      text: 'text-purple-600',
      dots: 'bg-purple-600',
      pulse: 'bg-purple-200',
      bars: 'bg-purple-600'
    },
    gray: {
      spinner: 'border-gray-600',
      text: 'text-gray-600',
      dots: 'bg-gray-600',
      pulse: 'bg-gray-200',
      bars: 'bg-gray-600'
    },
    red: {
      spinner: 'border-red-600',
      text: 'text-red-600',
      dots: 'bg-red-600',
      pulse: 'bg-red-200',
      bars: 'bg-red-600'
    }
  };

  const currentSize = sizeConfig[size];
  const currentColor = colorConfig[color];

  // Render different loading variants
  const renderLoadingIndicator = () => {
    switch (variant) {
      case 'spinner':
        return (
          <div className={`animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 ${currentSize.spinner}`}></div>
        );
      
      case 'dots':
        return (
          <div className="flex space-x-1">
            <div className={`${currentColor.dots} rounded-full animate-bounce`} style={{ width: currentSize.spinner.includes('h-4') ? '4px' : currentSize.spinner.includes('h-5') ? '5px' : currentSize.spinner.includes('h-8') ? '8px' : currentSize.spinner.includes('h-12') ? '12px' : '16px', height: currentSize.spinner.includes('h-4') ? '4px' : currentSize.spinner.includes('h-5') ? '5px' : currentSize.spinner.includes('h-8') ? '8px' : currentSize.spinner.includes('h-12') ? '12px' : '16px', animationDelay: '0ms' }}></div>
            <div className={`${currentColor.dots} rounded-full animate-bounce`} style={{ width: currentSize.spinner.includes('h-4') ? '4px' : currentSize.spinner.includes('h-5') ? '5px' : currentSize.spinner.includes('h-8') ? '8px' : currentSize.spinner.includes('h-12') ? '12px' : '16px', height: currentSize.spinner.includes('h-4') ? '4px' : currentSize.spinner.includes('h-5') ? '5px' : currentSize.spinner.includes('h-8') ? '8px' : currentSize.spinner.includes('h-12') ? '12px' : '16px', animationDelay: '150ms' }}></div>
            <div className={`${currentColor.dots} rounded-full animate-bounce`} style={{ width: currentSize.spinner.includes('h-4') ? '4px' : currentSize.spinner.includes('h-5') ? '5px' : currentSize.spinner.includes('h-8') ? '8px' : currentSize.spinner.includes('h-12') ? '12px' : '16px', height: currentSize.spinner.includes('h-4') ? '4px' : currentSize.spinner.includes('h-5') ? '5px' : currentSize.spinner.includes('h-8') ? '8px' : currentSize.spinner.includes('h-12') ? '12px' : '16px', animationDelay: '300ms' }}></div>
          </div>
        );
      
      case 'pulse':
        return (
          <div className={`${currentColor.pulse} rounded-full animate-pulse ${currentSize.spinner}`}></div>
        );
      
      case 'bars':
        return (
          <div className="flex space-x-1">
            <div className={`${currentColor.bars} animate-pulse`} style={{ width: '2px', height: currentSize.spinner.includes('h-4') ? '16px' : currentSize.spinner.includes('h-5') ? '20px' : currentSize.spinner.includes('h-8') ? '32px' : currentSize.spinner.includes('h-12') ? '48px' : '64px', animationDelay: '0ms' }}></div>
            <div className={`${currentColor.bars} animate-pulse`} style={{ width: '2px', height: currentSize.spinner.includes('h-4') ? '16px' : currentSize.spinner.includes('h-5') ? '20px' : currentSize.spinner.includes('h-8') ? '32px' : currentSize.spinner.includes('h-12') ? '48px' : '64px', animationDelay: '150ms' }}></div>
            <div className={`${currentColor.bars} animate-pulse`} style={{ width: '2px', height: currentSize.spinner.includes('h-4') ? '16px' : currentSize.spinner.includes('h-5') ? '20px' : currentSize.spinner.includes('h-8') ? '32px' : currentSize.spinner.includes('h-12') ? '48px' : '64px', animationDelay: '300ms' }}></div>
          </div>
        );
      
      default:
        return (
          <div className={`animate-spin rounded-full border-2 border-transparent ${currentColor.spinner} border-t-transparent ${currentSize.spinner}`}></div>
        );
    }
  };

  // Container classes
  const containerClasses = center 
    ? `flex items-center justify-center ${height}` 
    : 'flex items-center';

  const contentClasses = `flex flex-col items-center ${currentSize.spacing} ${className}`;

  return (
    <div className={containerClasses}>
      <div className={contentClasses}>
        {renderLoadingIndicator()}
        {showMessage && (
          <p className={`${currentSize.text} ${currentColor.text} font-medium`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
};

export default LoadingSpinner;
