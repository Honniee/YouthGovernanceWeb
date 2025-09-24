import React from 'react';
import Modal from './Modal';
import { ArrowUp, ArrowDown } from 'lucide-react';

/**
 * SortModal Component - Reusable sort modal with configurable sort fields
 * Supports field selection and sort direction (ASC/DESC)
 */
const SortModal = ({
  isOpen = false,
  onClose,
  triggerRef,
  title = 'Sort Options',
  sortFields = [],
  sortBy = '',
  sortOrder = 'asc',
  onSortChange,
  onReset,
  size = 'md',
  showResetButton = true,
  showApplyButton = true,
  applyButtonText = 'Apply Sort',
  resetButtonText = 'Reset to Default',
  defaultSortBy = '',
  defaultSortOrder = 'asc',
  className = '',
  ...props
}) => {
  // Handle sort field change
  const handleSortByChange = (field) => {
    onSortChange?.(field, sortOrder);
  };

  // Handle sort order change
  const handleSortOrderChange = (order) => {
    onSortChange?.(sortBy, order);
  };

  // Handle reset to default
  const handleReset = () => {
    onSortChange?.(defaultSortBy, defaultSortOrder);
    onReset?.();
  };

  // Handle apply sort
  const handleApply = () => {
    onClose?.();
  };

  // Check if current sort is different from default
  const isDefaultSort = sortBy === defaultSortBy && sortOrder === defaultSortOrder;

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
      {/* Sort Fields */}
      <div className="p-4 space-y-4">
        {/* Sort By Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sort By
          </label>
          <select
            value={sortBy}
            onChange={(e) => handleSortByChange(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            {sortFields.map((field) => (
              <option key={field.value} value={field.value}>
                {field.label}
              </option>
            ))}
          </select>
        </div>

        {/* Sort Order */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sort Order
          </label>
                     <div className="space-y-2">
             <label className="flex items-center cursor-pointer">
               <input
                 type="radio"
                 name="sortOrder"
                 value="asc"
                 checked={sortOrder === 'asc'}
                 onChange={(e) => handleSortOrderChange(e.target.value)}
                 className="w-4 h-4 text-blue-600 bg-white border-gray-300 focus:ring-blue-500 focus:ring-2 mr-3"
                 style={{
                   appearance: 'none',
                   borderRadius: '50%',
                   border: '2px solid #d1d5db',
                   backgroundColor: sortOrder === 'asc' ? '#2563eb' : '#ffffff'
                 }}
               />
               <ArrowUp className="w-4 h-4 text-gray-400 mr-2" />
               <span className="text-sm text-gray-700">
                 Ascending (A-Z, 1-9, Oldest first)
               </span>
             </label>
             
             <label className="flex items-center cursor-pointer">
               <input
                 type="radio"
                 name="sortOrder"
                 value="desc"
                 checked={sortOrder === 'desc'}
                 onChange={(e) => handleSortOrderChange(e.target.value)}
                 className="w-4 h-4 text-blue-600 bg-white border-gray-300 focus:ring-blue-500 focus:ring-2 mr-3"
                 style={{
                   appearance: 'none',
                   borderRadius: '50%',
                   border: '2px solid #d1d5db',
                   backgroundColor: sortOrder === 'desc' ? '#2563eb' : '#ffffff'
                 }}
               />
               <ArrowDown className="w-4 h-4 text-gray-400 mr-2" />
               <span className="text-sm text-gray-700">
                 Descending (Z-A, 9-1, Newest first)
               </span>
             </label>
           </div>
        </div>

        {/* Current Sort Display */}
        {sortBy && (
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center text-sm">
              <span className="text-blue-700 font-medium">Current sort:</span>
              <span className="ml-2 text-blue-600">
                {sortFields.find(f => f.value === sortBy)?.label || sortBy}
              </span>
              {sortOrder === 'asc' ? (
                <ArrowUp className="w-4 h-4 text-blue-600 ml-1" />
              ) : (
                <ArrowDown className="w-4 h-4 text-blue-600 ml-1" />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      {(showResetButton || showApplyButton) && (
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          {showResetButton && (
            <button
              onClick={handleReset}
              disabled={isDefaultSort}
              className="text-sm text-gray-600 hover:text-gray-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resetButtonText}
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

export default SortModal;






















