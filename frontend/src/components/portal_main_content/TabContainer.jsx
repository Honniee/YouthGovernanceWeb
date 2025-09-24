import React from 'react';

const TabContainer = ({ 
  children,
  activeTab,
  onTabChange,
  variant = 'underline', // 'underline', 'pills', 'buttons'
  size = 'md', // 'sm', 'md', 'lg'
  className = '',
  showBorder = true,
  backgroundColor = 'bg-white'
}) => {
  const baseClasses = `
    ${backgroundColor} 
    ${showBorder ? 'border-b border-gray-200 shadow-sm' : ''}
    ${className}
  `.trim();

  const navClasses = `
    flex -mb-px overflow-x-auto px-1
    ${size === 'sm' ? 'py-2' : size === 'lg' ? 'py-4' : ''}
  `.trim();

  // Clone children and pass additional props
  const enhancedChildren = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, {
        isActive: child.props.id === activeTab,
        onClick: () => onTabChange?.(child.props.id),
        variant,
        size,
        ...child.props
      });
    }
    return child;
  });

  return (
    <div className={baseClasses}>
      <nav className={navClasses}>
        {enhancedChildren}
      </nav>
    </div>
  );
};

export default TabContainer;
