import React, { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * CollapsibleForm Component
 * 
 * A reusable collapsible form container with header, icon, and form content.
 * Features smooth animations and customizable styling.
 * 
 * @param {Object} props - Component properties
 * @param {string} props.title - Form title
 * @param {string} props.description - Form description
 * @param {React.ReactNode} props.icon - Icon component for the header
 * @param {React.ReactNode} props.children - Form content (form elements)
 * @param {boolean} [props.defaultCollapsed=true] - Whether form starts collapsed
 * @param {Function} [props.onToggle] - Callback when form is toggled
 * @param {string} [props.iconBgColor='bg-blue-100'] - Icon background color
 * @param {string} [props.iconTextColor='text-blue-600'] - Icon text color
 * @param {string} [props.collapsedBg='bg-gray-50'] - Background when collapsed
 * @param {string} [props.expandedBg='bg-emerald-50'] - Background when expanded
 * @param {string} [props.borderColor='border-gray-100'] - Border color
 * @param {string} [props.maxHeight='max-h-[calc(100vh-200px)]'] - Maximum height for form content
 * @param {boolean} [props.sticky=true] - Whether to make the form sticky
 * @param {string} [props.stickyTop='top-4'] - Sticky position from top
 * @param {string} [props.className=''] - Additional CSS classes
 */
const CollapsibleForm = ({
  title,
  description,
  icon,
  children,
  defaultCollapsed = true,
  onToggle,
  iconBgColor = 'bg-blue-100',
  iconTextColor = 'text-blue-600',
  collapsedBg = 'bg-gray-50',
  expandedBg = 'bg-emerald-50',
  borderColor = 'border-gray-100',
  maxHeight = 'max-h-[calc(100vh-200px)]',
  sticky = true,
  stickyTop = 'top-4',
  className = ''
}) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  // Sync with external state changes
  useEffect(() => {
    setIsCollapsed(defaultCollapsed);
  }, [defaultCollapsed]);

  const handleToggle = () => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    if (onToggle) {
      onToggle(newCollapsed);
    }
  };

  const containerClasses = `
    bg-white rounded-xl border ${borderColor} shadow-sm overflow-hidden
    ${sticky ? `sticky ${stickyTop}` : ''}
    ${className}
  `.trim();

  const headerClasses = `
    w-full px-5 py-4 flex items-center justify-between transition-colors duration-200
    ${isCollapsed 
      ? `${collapsedBg} border-b ${borderColor}` 
      : `${expandedBg} border-b border-emerald-200`}
  `.trim();

  return (
    <div className={containerClasses}>
      {/* Header */}
      <button
        type="button"
        onClick={handleToggle}
        className={headerClasses}
      >
        <div className="flex items-center">
          <div className={`w-10 h-10 ${iconBgColor} rounded-full flex items-center justify-center mr-3`}>
            <div className={`w-5 h-5 ${iconTextColor}`}>
              {icon}
            </div>
          </div>
          <div className="text-left">
            <h2 className="text-lg font-bold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-600">{description}</p>
          </div>
        </div>
        <ChevronDown 
          className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
            isCollapsed ? 'rotate-180' : 'rotate-0'
          }`} 
        />
      </button>

      {/* Form Content */}
      <div className={`transition-all duration-300 ${isCollapsed ? 'hidden' : 'block'}`}>
        <div className={`p-5 space-y-4 ${maxHeight} overflow-y-auto`}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default CollapsibleForm;













