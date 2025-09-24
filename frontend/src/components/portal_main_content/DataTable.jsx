import React from 'react';
import { Grid, List } from 'lucide-react';
import { ActionMenu, Avatar, Status } from './index';

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
            console.warn(`DataTable: Missing keyField '${keyField}' for item at index ${index}, using fallback key '${itemKey}'`, item);
          }
          const isSelected = selectedItems.includes(itemKey);
          
          return (
            <div 
              key={itemKey} 
              className={`group bg-white rounded-xl border border-gray-200 p-5 ${styling.cardHover} transition-all duration-300 relative overflow-hidden`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between mb-4">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onSelectItem(itemKey)}
                  className={`rounded border-gray-300 ${themeColors.checkbox} focus:ring-2 transition-colors duration-200`}
                />
                {getActionMenuItems && onActionClick && (
                  <ActionMenu
                    items={getActionMenuItems(item)}
                    onAction={(actionId) => onActionClick(actionId, item)}
                    size="md"
                    position="auto"
                  />
                )}
              </div>
              
              {/* Card Content */}
              <div className="flex items-start mb-4">
                {displayFields.avatar && (
                  <Avatar 
                    user={{
                      firstName: item[displayFields.avatar.firstName],
                      lastName: item[displayFields.avatar.lastName],
                      personalEmail: item[displayFields.avatar.email],
                      profilePicture: item[displayFields.avatar.picture]
                    }}
                    size="lg"
                    color={themeColors.avatar}
                  />
                )}
                <div className="ml-4 flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 mb-2 ${themeColors.hover} transition-colors duration-200 text-lg">
                    {getFieldValue(item, displayFields.title)}
                  </h3>
                  {displayFields.subtitle && (
                    <div className="text-sm text-gray-600">
                      {getFieldValue(item, displayFields.subtitle)}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Card Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <div className="flex items-center space-x-3">
                  {displayFields.status && (
                    <Status 
                      status={getFieldValue(item, displayFields.status)}
                      variant="badge"
                      size="sm"
                    />
                  )}
                  {displayFields.badge && (
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs ${getFieldValue(item, displayFields.badge).className}`}>
                      {getFieldValue(item, displayFields.badge).text}
                    </span>
                  )}
                </div>
                {displayFields.date && (
                  <span className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-md">
                    {formatDate(getFieldValue(item, displayFields.date))}
                  </span>
                )}
              </div>

              {/* Subtle accent line */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 via-blue-400 to-purple-400 opacity-60 group-hover:opacity-100 transition-opacity duration-300"></div>
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
            console.warn(`DataTable: Missing keyField '${keyField}' for item at index ${index}, using fallback key '${itemKey}'`, item);
          }
          const isSelected = selectedItems.includes(itemKey);
          
          return (
            <div 
              key={itemKey} 
              className={`px-3 sm:px-5 py-3 sm:py-4 flex items-center justify-between ${styling.listHover} transition-all duration-300 relative border-l-2 border-transparent`}
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
                      profilePicture: item[displayFields.avatar.picture]
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
                  <ActionMenu
                    items={getActionMenuItems(item)}
                    onAction={(actionId) => onActionClick(actionId, item)}
                    size="sm"
                    position="auto"
                  />
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