import React from 'react';
import { Grid, List } from 'lucide-react';
import { ActionMenu, Avatar, Status } from './index';
import logger from '../../utils/logger.js';

/**
 * DataTable Component
 * 
 * A unified component that can display data in both grid and list views.
 * Features selection, action menus, and responsive design.
 * 
 * @param {Object} props - Component properties
 * @param {Array} props.data - Array of data items to display
 * @param {Array} props.selectedItems - Array of selected item IDs
 * @param {Function} props.onSelectItem - Callback when an item is selected/deselected
 * @param {Function} props.onSelectAll - Callback when select all is toggled
 * @param {Function} props.getActionMenuItems - Function to get action menu items for an item
 * @param {Function} props.onActionClick - Callback when an action is clicked
 * @param {Function} [props.onCardClick] - Callback when a card/row is clicked (opens modal, etc.)
 * @param {string} [props.viewMode='grid'] - View mode: 'grid' or 'list'
 * @param {string} [props.keyField='id'] - Field to use as unique key
 * @param {Object} [props.displayFields] - Configuration for which fields to display
 * @param {string} [props.displayFields.avatar] - Avatar field configuration
 * @param {string} [props.displayFields.title] - Title field configuration
 * @param {string} [props.displayFields.subtitle] - Subtitle field configuration
 * @param {string} [props.displayFields.status] - Status field configuration
 * @param {string} [props.displayFields.date] - Date field configuration
 * @param {string} [props.selectAllLabel='Select All Items'] - Label for select all checkbox
 * @param {string} [props.emptyMessage='No items found'] - Message when no data
 * @param {Object} [props.styling] - Styling configuration
 * @param {string} [props.styling.gridCols='grid-cols-1 lg:grid-cols-2'] - Grid layout
 * @param {string} [props.styling.cardHover='hover:border-blue-300 hover:shadow-lg'] - Card hover effects
 * @param {string} [props.styling.listHover='hover:bg-gray-50'] - List row hover effects
 * @param {string} [props.styling.theme='blue'] - Color theme: 'blue', 'green', etc.
 * @param {string} [props.className=''] - Additional CSS classes
 */
const DataTable = ({
  data = [],
  selectedItems = [],
  onSelectItem,
  onSelectAll,
  getActionMenuItems,
  onActionClick,
  onCardClick,
  viewMode = 'grid',
  keyField = 'id',
  displayFields = {
    avatar: { firstName: 'firstName', lastName: 'lastName', email: 'personalEmail', picture: 'profilePicture' },
    title: (item) => `${item.firstName} ${item.lastName}`,
    subtitle: 'personalEmail',
    status: (item) => item.isActive && !item.deactivated ? 'active' : 'deactivated',
    date: 'createdAt'
  },
  selectAllLabel = 'Select All Items',
  emptyMessage = 'No items found',
  styling = {
    gridCols: 'grid-cols-1 lg:grid-cols-2',
    cardHover: 'hover:border-blue-300 hover:shadow-lg',
    listHover: 'hover:bg-gray-50',
    theme: 'blue'
  },
  className = ''
}) => {
  // Helper functions
  const getFieldValue = (item, field) => {
    if (typeof field === 'function') {
      return field(item);
    }
    if (typeof field === 'string') {
      return item[field];
    }
    return field;
  };

  // Get theme colors
  const getThemeColors = (theme) => {
    const themes = {
      blue: {
        checkbox: 'text-blue-600 focus:ring-blue-500',
        hover: 'group-hover:text-blue-600',
        avatar: 'blue'
      },
      green: {
        checkbox: 'text-green-600 focus:ring-green-500',
        hover: '${themeColors.hover}',
        avatar: 'green'
      }
    };
    return themes[theme] || themes.blue;
  };

  const themeColors = getThemeColors(styling.theme);
  const hasFooter = Boolean(
    (displayFields && (displayFields.status || displayFields.position || displayFields.badge || displayFields.extraBadges || displayFields.date))
  );

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'N/A';
    }
  };

  const isAllSelected = data.length > 0 && selectedItems.length === data.length;

  // Grid View Component
  const GridView = () => (
    <div>
      {/* Grid View Header with Select All */}
      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={isAllSelected}
            onChange={onSelectAll}
            className={`rounded border-gray-300 ${themeColors.checkbox} focus:ring-2`}
          />
          <span className="ml-3 font-medium text-gray-900">{selectAllLabel}</span>
        </label>
      </div>
      
      {/* Grid Cards */}
      <div className={`grid ${styling.gridCols} gap-4 p-5`}>
        {data.map((item, index) => {
          const itemKey = item[keyField] || `item-${index}`;
          // Debug logging for key generation
          if (process.env.NODE_ENV === 'development' && !item[keyField]) {
            logger.warn('DataTable: Missing keyField', { keyField, index, itemKey, item });
          }
          const isSelected = selectedItems.includes(itemKey);
          
          return (
            <div 
              key={itemKey} 
              onClick={onCardClick ? (e) => {
                // Don't trigger card click if clicking checkbox or action menu
                if (e.target.closest('input[type="checkbox"]') || e.target.closest('[data-action-menu]')) {
                  return;
                }
                onCardClick(item);
              } : undefined}
              className={`group bg-white rounded-lg border border-gray-200 p-4 sm:p-5 ${styling.cardHover} transition-all duration-200 relative overflow-hidden shadow-sm hover:shadow-md ${onCardClick ? 'cursor-pointer' : ''}`}
            >
              {/* Card Header - Top Right */}
              <div className="flex items-start justify-between mb-3">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onSelectItem(itemKey)}
                  className={`rounded border-gray-300 ${themeColors.checkbox} focus:ring-2 transition-colors duration-200`}
                />
                {getActionMenuItems && onActionClick && (
                  <div data-action-menu onClick={(e) => e.stopPropagation()}>
                    <ActionMenu
                      items={getActionMenuItems(item)}
                      onAction={(actionId) => onActionClick(actionId, item)}
                      size="md"
                      position="auto"
                    />
                  </div>
                )}
              </div>
              
              {/* Card Content - Centered Avatar Layout */}
              <div className="flex flex-col items-center text-center mb-4">
                {displayFields.avatar && (
                  <div className="mb-4">
                    <Avatar 
                      user={{
                        firstName: item[displayFields.avatar.firstName],
                        lastName: item[displayFields.avatar.lastName],
                        personalEmail: item[displayFields.avatar.email],
                        profilePicture: item[displayFields.avatar.picture],
                        updatedAt: item.updatedAt || item.updated_at
                      }}
                      size="xl"
                      color={themeColors.avatar}
                    />
                  </div>
                )}
                <div className="w-full flex flex-col items-center">
                  {displayFields.status && (
                    <div className="flex items-center justify-center mb-3">
                      <Status 
                        status={getFieldValue(item, displayFields.status)}
                        variant="badge"
                        size="xs"
                      />
                    </div>
                  )}
                  <h3 className="font-semibold text-gray-900 mb-2 text-base leading-tight">
                    {getFieldValue(item, displayFields.title)}
                  </h3>
                  {displayFields.email && (
                    <div className="text-sm text-gray-600 mb-2 truncate w-full text-center">
                      {typeof displayFields.email === 'function' ? (
                        displayFields.email(item)
                      ) : (
                        getFieldValue(item, displayFields.email)
                      )}
                    </div>
                  )}
                  {displayFields.subtitle && (
                    <div className="w-full flex flex-col items-center gap-2">
                      {typeof displayFields.subtitle === 'function' ? (
                        displayFields.subtitle(item)
                      ) : (
                        <div className="text-sm text-gray-500 truncate w-full text-center">
                          {getFieldValue(item, displayFields.subtitle)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Card Footer - Bottom */}
              {hasFooter && (
                <div className="flex flex-col gap-2 pt-3 border-t border-gray-100">
                  {(displayFields.position || displayFields.badge || displayFields.extraBadges) && (
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      {displayFields.position && (
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                          {typeof displayFields.position === 'function' ? (
                            displayFields.position(item)
                          ) : (
                            getFieldValue(item, displayFields.position)
                          )}
                        </span>
                      )}
                      {displayFields.extraBadges && (() => {
                        const badges = typeof displayFields.extraBadges === 'function' 
                          ? displayFields.extraBadges(item) 
                          : getFieldValue(item, displayFields.extraBadges);
                        if (!Array.isArray(badges)) return null;
                        return badges.map((badge, idx) => (
                          <span 
                            key={idx}
                            className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${badge.className || 'bg-gray-50 text-gray-700 border-gray-200'}`}
                          >
                            {badge.text}
                          </span>
                        ));
                      })()}
                      {displayFields.badge && (
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs ${getFieldValue(item, displayFields.badge).className}`}>
                          {getFieldValue(item, displayFields.badge).text}
                        </span>
                      )}
                    </div>
                  )}
                  {displayFields.date && (
                    <div className="text-center">
                      <span className="text-xs text-gray-400">
                        {displayFields.dateLabel || 'Joined'} {formatDate(getFieldValue(item, displayFields.date))}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  // List View Component
  const ListView = () => (
    <div className="overflow-visible relative">
      {/* List View Header with Select All */}
      <div className="px-3 sm:px-5 py-3 border-b border-gray-100 bg-gray-50/50">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={isAllSelected}
            onChange={onSelectAll}
            className={`rounded border-gray-300 ${themeColors.checkbox} focus:ring-2`}
          />
          <span className="ml-3 font-medium text-gray-900 text-sm sm:text-base">{selectAllLabel}</span>
        </label>
      </div>
      
      {/* List Rows */}
      <div className="divide-y divide-gray-100">
        {data.map((item, index) => {
          const itemKey = item[keyField] || `item-${index}`;
          // Debug logging for key generation
          if (process.env.NODE_ENV === 'development' && !item[keyField]) {
            logger.warn('DataTable: Missing keyField', { keyField, index, itemKey, item });
          }
          const isSelected = selectedItems.includes(itemKey);
          
          return (
            <div 
              key={itemKey} 
              onClick={onCardClick ? (e) => {
                // Don't trigger card click if clicking checkbox or action menu
                if (e.target.closest('input[type="checkbox"]') || e.target.closest('[data-action-menu]')) {
                  return;
                }
                onCardClick(item);
              } : undefined}
              className={`px-3 sm:px-5 py-3 sm:py-4 flex items-center justify-between ${styling.listHover} transition-all duration-300 relative border-l-2 border-transparent ${onCardClick ? 'cursor-pointer' : ''}`}
            >
              {/* Left side - Checkbox, Avatar, and Info */}
              <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onSelectItem(itemKey)}
                  className={`rounded border-gray-300 ${themeColors.checkbox} focus:ring-2 transition-colors duration-200 flex-shrink-0`}
                />
                {displayFields.avatar && (
                  <Avatar 
                    user={{
                      firstName: item[displayFields.avatar.firstName],
                      lastName: item[displayFields.avatar.lastName],
                      personalEmail: item[displayFields.avatar.email],
                      profilePicture: item[displayFields.avatar.picture],
                      updatedAt: item.updatedAt || item.updated_at
                    }}
                    size="sm"
                    color={themeColors.avatar}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-gray-900 truncate text-sm sm:text-base ${themeColors.hover} transition-colors duration-200">
                    {getFieldValue(item, displayFields.title)}
                  </h3>
                  {displayFields.subtitle && (
                    <div className="text-xs sm:text-sm text-gray-600 mt-0.5 truncate">
                      {getFieldValue(item, displayFields.subtitle)}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Right side - Status, Badge, Date, and Actions */}
              <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
                <div className="flex items-center space-x-2">
                  {displayFields.status && (
                    <Status 
                      status={getFieldValue(item, displayFields.status)}
                      variant="badge"
                      size="xs"
                    />
                  )}
                  {displayFields.badge && (
                    <span className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs ${getFieldValue(item, displayFields.badge).className}`}>
                      {getFieldValue(item, displayFields.badge).text}
                    </span>
                  )}
                </div>
                {displayFields.date && (
                  <span className="text-xs text-gray-500 bg-gray-50 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md hidden sm:inline">
                    {formatDate(getFieldValue(item, displayFields.date))}
                  </span>
                )}
                {getActionMenuItems && onActionClick && (
                  <div data-action-menu onClick={(e) => e.stopPropagation()}>
                    <ActionMenu
                      items={getActionMenuItems(item)}
                      onAction={(actionId) => onActionClick(actionId, item)}
                      size="sm"
                      position="auto"
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // Empty State
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            {viewMode === 'grid' ? (
              <Grid className="w-6 h-6 text-gray-400" />
            ) : (
              <List className="w-6 h-6 text-gray-400" />
            )}
          </div>
          <p className="text-gray-500 font-medium">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {viewMode === 'grid' ? <GridView /> : <ListView />}
    </div>
  );
};

export default DataTable;