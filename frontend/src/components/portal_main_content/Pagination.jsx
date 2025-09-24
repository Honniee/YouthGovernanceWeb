import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

/**
 * Pagination Component - Comprehensive pagination with items per page selector
 * Handles page navigation, info display, and responsive design
 */
const Pagination = ({
  currentPage = 1,
  totalItems = 0,
  itemsPerPage = 10,
  onPageChange,
  onItemsPerPageChange,
  itemName = 'items',
  itemNamePlural,
  showItemsPerPage = true,
  showInfo = true,
  showFirstLast = false,
  maxPages = 5,
  itemsPerPageOptions = [5, 10, 20, 50, 100],
  size = 'md', // 'sm', 'md', 'lg'
  variant = 'default', // 'default', 'simple', 'compact'
  className = '',
  disabled = false,
  ...props
}) => {
  // Calculate pagination values
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startItem = totalItems > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);
  const hasPrevious = currentPage > 1;
  const hasNext = currentPage < totalPages;

  // Get plural form of item name
  const pluralName = itemNamePlural || (itemName + 's');

  // Size configurations
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          container: 'px-3 py-2',
          button: 'px-2 py-1 text-xs',
          select: 'px-2 py-1 text-xs',
          text: 'text-xs',
          icon: 'w-3 h-3'
        };
      case 'lg':
        return {
          container: 'px-6 py-4',
          button: 'px-4 py-3 text-base',
          select: 'px-3 py-2 text-base',
          text: 'text-base',
          icon: 'w-5 h-5'
        };
      default: // md
        return {
          container: 'px-5 py-3',
          button: 'px-3 py-2 text-sm',
          select: 'px-2 py-1 text-sm',
          text: 'text-sm',
          icon: 'w-4 h-4'
        };
    }
  };

  const sizeClasses = getSizeClasses();

  // Generate page numbers with smart range
  const getPageNumbers = () => {
    if (totalPages <= maxPages) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages = [];
    const halfMax = Math.floor(maxPages / 2);

    if (currentPage <= halfMax) {
      // Show first pages
      for (let i = 1; i <= maxPages; i++) {
        pages.push(i);
      }
    } else if (currentPage > totalPages - halfMax) {
      // Show last pages
      for (let i = totalPages - maxPages + 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show middle pages
      for (let i = currentPage - halfMax; i <= currentPage + halfMax; i++) {
        pages.push(i);
      }
    }

    return pages;
  };

  // Handle page change
  const handlePageChange = (page) => {
    if (disabled || page < 1 || page > totalPages || page === currentPage) return;
    onPageChange?.(page);
  };

  // Handle items per page change
  const handleItemsPerPageChange = (newItemsPerPage) => {
    if (disabled) return;
    onItemsPerPageChange?.(newItemsPerPage);
  };

  // Render pagination buttons
  const renderPageButton = (page, isActive = false) => (
    <button
      key={page}
      onClick={() => handlePageChange(page)}
      disabled={disabled || isActive}
      className={`
        ${sizeClasses.button} rounded-lg font-medium transition-all duration-200
        ${isActive
          ? 'bg-blue-600 text-white shadow-sm'
          : 'text-gray-700 hover:bg-white hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed'
        }
      `}
    >
      {page}
    </button>
  );

  // Render navigation button
  const renderNavButton = (onClick, disabled, icon, label) => (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`
        p-2 border border-gray-200 rounded-lg hover:bg-white hover:border-gray-300 
        disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200
      `}
    >
      {React.cloneElement(icon, { className: sizeClasses.icon })}
    </button>
  );

  // Don't render if no items
  if (totalItems === 0) return null;

  // Simple variant - just prev/next
  if (variant === 'simple') {
    return (
      <div className={`flex items-center justify-between ${sizeClasses.container} bg-gray-50/50 border-t border-gray-100 ${className}`} {...props}>
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={disabled || !hasPrevious}
          className={`
            inline-flex items-center ${sizeClasses.button} text-gray-700 bg-white border border-gray-200 rounded-lg
            hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200
          `}
        >
          <ChevronLeft className={`${sizeClasses.icon} mr-2`} />
          Previous
        </button>
        
        <span className={`${sizeClasses.text} text-gray-600`}>
          Page {currentPage} of {totalPages}
        </span>
        
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={disabled || !hasNext}
          className={`
            inline-flex items-center ${sizeClasses.button} text-gray-700 bg-white border border-gray-200 rounded-lg
            hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200
          `}
        >
          Next
          <ChevronRight className={`${sizeClasses.icon} ml-2`} />
        </button>
      </div>
    );
  }

  // Compact variant - minimal spacing
  if (variant === 'compact') {
    return (
      <div className={`flex items-center justify-center space-x-1 ${sizeClasses.container} ${className}`} {...props}>
        {renderNavButton(
          () => handlePageChange(currentPage - 1),
          disabled || !hasPrevious,
          <ChevronLeft />,
          'Previous page'
        )}
        
        <div className="flex items-center space-x-1">
          {getPageNumbers().map(page => renderPageButton(page, page === currentPage))}
        </div>
        
        {renderNavButton(
          () => handlePageChange(currentPage + 1),
          disabled || !hasNext,
          <ChevronRight />,
          'Next page'
        )}
      </div>
    );
  }

  // Default variant - full featured
  return (
    <div className={`${sizeClasses.container} border-t border-gray-100 bg-gray-50/50 ${className}`} {...props}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
        {/* Info Display */}
        {showInfo && (
          <div className={`${sizeClasses.text} text-gray-600`}>
            {totalItems > 0 ? (
              <>
                Showing <span className="font-medium text-gray-900">{startItem}</span> to{' '}
                <span className="font-medium text-gray-900">{endItem}</span> of{' '}
                <span className="font-medium text-gray-900">{totalItems}</span>{' '}
                {totalItems === 1 ? itemName : pluralName}
              </>
            ) : (
              <span>No {pluralName} found</span>
            )}
          </div>
        )}

        {/* Items Per Page Selector */}
        {showItemsPerPage && (
          <div className="flex items-center space-x-2">
            <label className={`${sizeClasses.text} text-gray-600`}>Items per page:</label>
            <select
              value={itemsPerPage}
              onChange={(e) => handleItemsPerPageChange(parseInt(e.target.value))}
              disabled={disabled}
              className={`
                ${sizeClasses.select} border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200
              `}
            >
              {itemsPerPageOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center space-x-2">
          {/* First Page Button */}
          {showFirstLast && (
            <>
              {renderNavButton(
                () => handlePageChange(1),
                disabled || currentPage === 1,
                <ChevronsLeft />,
                'First page'
              )}
            </>
          )}

          {/* Previous Button */}
          {renderNavButton(
            () => handlePageChange(currentPage - 1),
            disabled || !hasPrevious,
            <ChevronLeft />,
            'Previous page'
          )}

          {/* Page Numbers */}
          <div className="flex items-center space-x-1">
            {getPageNumbers().map(page => renderPageButton(page, page === currentPage))}
          </div>

          {/* Next Button */}
          {renderNavButton(
            () => handlePageChange(currentPage + 1),
            disabled || !hasNext,
            <ChevronRight />,
            'Next page'
          )}

          {/* Last Page Button */}
          {showFirstLast && (
            <>
              {renderNavButton(
                () => handlePageChange(totalPages),
                disabled || currentPage === totalPages,
                <ChevronsRight />,
                'Last page'
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Pagination;






























