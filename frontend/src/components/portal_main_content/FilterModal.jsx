import React from 'react';
import Modal from './Modal';

/**
 * FilterModal Component - Reusable filter modal with configurable fields
 * Supports various filter types: select, multiselect, date, search, etc.
 */
const FilterModal = ({
  isOpen = false,
  onClose,
  triggerRef,
  title = 'Advanced Filters',
  filters = [],
  values = {},
  onChange,
  onClear,
  onApply,
  size = 'md',
  showApplyButton = true,
  showClearButton = true,
  applyButtonText = 'Apply Filters',
  clearButtonText = 'Clear Filters',
  className = '',
  ...props
}) => {
  // Handle filter value change
  const handleFilterChange = (filterId, value) => {
    const newValues = { ...values, [filterId]: value };
    onChange?.(newValues);
  };

  // Handle clear all filters
  const handleClear = () => {
    const clearedValues = {};
    filters.forEach(filter => {
      if (filter.type === 'multiselect') {
        clearedValues[filter.id] = [];
      } else {
        clearedValues[filter.id] = filter.defaultValue || '';
      }
    });
    onChange?.(clearedValues);
    onClear?.(clearedValues);
  };

  // Handle apply filters
  const handleApply = () => {
    onApply?.(values);
    onClose?.();
  };

  // Render filter field based on type
  const renderFilterField = (filter) => {
    const value = values[filter.id] || filter.defaultValue || '';

    switch (filter.type) {
      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => handleFilterChange(filter.id, e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            disabled={filter.disabled}
          >
            {filter.placeholder && (
              <option value="">{filter.placeholder}</option>
            )}
            {filter.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'multiselect':
        return (
          <div 
            className="space-y-2 max-h-32 overflow-y-auto"
            style={{ 
              WebkitOverflowScrolling: 'touch',
              touchAction: 'pan-y'
            }}
          >
            {filter.options?.map((option) => (
              <label key={option.value} className="flex items-center">
                <input
                  type="checkbox"
                  checked={Array.isArray(value) && value.includes(option.value)}
                  onChange={(e) => {
                    const currentValues = Array.isArray(value) ? value : [];
                    const newValues = e.target.checked
                      ? [...currentValues, option.value]
                      : currentValues.filter(v => v !== option.value);
                    handleFilterChange(filter.id, newValues);
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                  disabled={filter.disabled}
                />
                <span className="text-sm text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
        );

      case 'date':
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => handleFilterChange(filter.id, e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            disabled={filter.disabled}
          />
        );

      case 'daterange':
        return (
          <div className="space-y-2">
            <input
              type="date"
              value={value?.start || ''}
              onChange={(e) => handleFilterChange(filter.id, { ...value, start: e.target.value })}
              placeholder="Start date"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              disabled={filter.disabled}
            />
            <input
              type="date"
              value={value?.end || ''}
              onChange={(e) => handleFilterChange(filter.id, { ...value, end: e.target.value })}
              placeholder="End date"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              disabled={filter.disabled}
            />
          </div>
        );

      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleFilterChange(filter.id, e.target.value)}
            placeholder={filter.placeholder}
            min={filter.min}
            max={filter.max}
            step={filter.step}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            disabled={filter.disabled}
          />
        );

      case 'text':
      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleFilterChange(filter.id, e.target.value)}
            placeholder={filter.placeholder}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            disabled={filter.disabled}
          />
        );
    }
  };

  // Check if any filters are active
  const hasActiveFilters = filters.some(filter => {
    const value = values[filter.id];
    if (filter.type === 'multiselect') {
      return Array.isArray(value) && value.length > 0;
    }
    return value && value !== filter.defaultValue;
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      triggerRef={triggerRef}
      title={title}
      size={size}
      variant="dropdown"
      className={className}
      {...props}
    >
      {/* Filter Fields */}
      <div 
        className="p-4 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto"
        style={{ 
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-y'
        }}
      >
        {filters.map((filter) => (
          <div key={filter.id}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {filter.label}
              {filter.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {filter.description && (
              <p className="text-xs text-gray-500 mb-2">{filter.description}</p>
            )}
            {renderFilterField(filter)}
          </div>
        ))}

        {filters.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No filters available
          </div>
        )}
      </div>

      {/* Actions */}
      {(showClearButton || showApplyButton) && (
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          {showClearButton && (
            <button
              onClick={handleClear}
              disabled={!hasActiveFilters}
              className="text-sm text-gray-600 hover:text-gray-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {clearButtonText}
            </button>
          )}
          
          {showApplyButton && (
            <button
              onClick={handleApply}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
            >
              {applyButtonText}
            </button>
          )}
        </div>
      )}
    </Modal>
  );
};

export default FilterModal;


