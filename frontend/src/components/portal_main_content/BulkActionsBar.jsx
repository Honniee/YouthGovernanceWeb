import React from 'react';
import { Archive } from 'lucide-react';
import { ExportButton } from './index';

/**
 * BulkActionsBar Component
 * 
 * A reusable component for displaying bulk action controls when items are selected.
 * Features a gradient background, selection count, and action buttons.
 * 
 * @param {Object} props - Component properties
 * @param {number} props.selectedCount - Number of selected items
 * @param {string} [props.itemName='item'] - Name of the items (e.g., 'staff member', 'user')
 * @param {string} [props.itemNamePlural='items'] - Plural name of the items
 * @param {Function} props.onBulkAction - Callback when bulk actions button is clicked
 * @param {Object} [props.exportConfig] - Export configuration object
 * @param {Array} [props.exportConfig.formats=['csv', 'pdf']] - Available export formats
 * @param {Function} [props.exportConfig.onExport] - Export handler function
 * @param {boolean} [props.exportConfig.isExporting=false] - Whether export is in progress
 * @param {string} [props.exportConfig.label='Export'] - Export button label
 * @param {string} [props.exportConfig.size='md'] - Export button size
 * @param {string} [props.exportConfig.position='auto'] - Export button position strategy
 * @param {boolean} [props.exportConfig.responsive=true] - Whether to show only icon on mobile
 * @param {string} [props.gradientFrom='from-blue-50'] - Starting gradient color
 * @param {string} [props.gradientTo='to-indigo-50'] - Ending gradient color
 * @param {string} [props.borderColor='border-blue-200'] - Border color
 * @param {string} [props.primaryColor='blue'] - Primary color theme
 * @param {string} [props.className=''] - Additional CSS classes
 */
const BulkActionsBar = ({
  selectedCount,
  itemName = 'item',
  itemNamePlural = 'items',
  onBulkAction,
  exportConfig,
  gradientFrom = 'from-blue-50',
  gradientTo = 'to-indigo-50',
  borderColor = 'border-blue-200',
  primaryColor = 'blue',
  className = ''
}) => {
  if (!selectedCount || selectedCount === 0) {
    return null;
  }

  // Color configurations based on primary color
  const colorConfig = {
    blue: {
      gradient: 'from-blue-50 to-indigo-50',
      border: 'border-blue-200',
      countBg: 'bg-blue-100',
      countText: 'text-blue-600',
      text: 'text-blue-700',
      buttonBg: 'bg-blue-600',
      buttonHover: 'hover:bg-blue-700'
    },
    green: {
      gradient: 'from-green-50 to-emerald-50',
      border: 'border-green-200',
      countBg: 'bg-green-100',
      countText: 'text-green-600',
      text: 'text-green-700',
      buttonBg: 'bg-green-600',
      buttonHover: 'hover:bg-green-700'
    },
    purple: {
      gradient: 'from-purple-50 to-violet-50',
      border: 'border-purple-200',
      countBg: 'bg-purple-100',
      countText: 'text-purple-600',
      text: 'text-purple-700',
      buttonBg: 'bg-purple-600',
      buttonHover: 'hover:bg-purple-700'
    },
    red: {
      gradient: 'from-red-50 to-rose-50',
      border: 'border-red-200',
      countBg: 'bg-red-100',
      countText: 'text-red-600',
      text: 'text-red-700',
      buttonBg: 'bg-red-600',
      buttonHover: 'hover:bg-red-700'
    },
    gray: {
      gradient: 'from-gray-50 to-slate-50',
      border: 'border-gray-200',
      countBg: 'bg-gray-100',
      countText: 'text-gray-600',
      text: 'text-gray-700',
      buttonBg: 'bg-gray-600',
      buttonHover: 'hover:bg-gray-700'
    }
  };

  const colors = colorConfig[primaryColor] || colorConfig.blue;

  // Use provided colors or fall back to theme colors
  const finalGradient = `bg-gradient-to-r ${gradientFrom !== 'from-blue-50' ? gradientFrom : colors.gradient.split(' ')[0]} ${gradientTo !== 'to-indigo-50' ? gradientTo : colors.gradient.split(' ')[1]}`;
  const finalBorder = borderColor !== 'border-blue-200' ? borderColor : colors.border;

  const displayItemName = selectedCount === 1 ? itemName : itemNamePlural;

  return (
    <div className={`${finalGradient} border-t ${finalBorder} px-5 py-4 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
        {/* Left side - Selection info */}
        <div className="flex items-center space-x-3">
          <div className={`w-8 h-8 ${colors.countBg} rounded-full flex items-center justify-center`}>
            <span className={`${colors.countText} font-semibold text-sm`}>
              {selectedCount}
            </span>
          </div>
          <span className={`text-sm font-medium ${colors.text}`}>
            {selectedCount} {displayItemName} selected
          </span>
        </div>

        {/* Right side - Action buttons */}
        <div className="flex items-center space-x-2">
          {/* Bulk Actions Button */}
          <button 
            onClick={onBulkAction}
            className={`inline-flex items-center px-3 py-2 ${colors.buttonBg} text-white text-sm font-medium rounded-lg ${colors.buttonHover} transition-all duration-200`}
          >
            <Archive className="w-4 h-4 mr-2" />
            Bulk Actions
          </button>

          {/* Export Button (optional) */}
          {exportConfig && (
            <ExportButton
              formats={exportConfig.formats || ['csv', 'pdf']}
              onExport={exportConfig.onExport}
              isExporting={exportConfig.isExporting || false}
              label={exportConfig.label || 'Export'}
              size={exportConfig.size || 'md'}
              position={exportConfig.position || 'auto'}
              responsive={exportConfig.responsive !== false} // Default to true
              customFormats={exportConfig.customFormats || {}}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkActionsBar;

