import React, { useState } from 'react';
import DataTable from './DataTable';
import { Eye, Edit, Trash2, UserCheck, UserX } from 'lucide-react';

/**
 * Simple examples of how to use the DataTable component
 * This file demonstrates basic usage of the current DataTable implementation
 */

// Example 1: Staff Management DataTable (simple version)
export const StaffDataTableExample = ({ staffData = [], onAction }) => {
  const [selectedItems, setSelectedItems] = useState([]);
  const [viewMode, setViewMode] = useState('grid');

  const handleSelectItem = (itemId) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleSelectAll = () => {
    if (selectedItems.length === staffData.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(staffData.map(item => item.id));
    }
  };

  const getActionMenuItems = (item) => [
    { id: 'view', label: 'View Details', icon: Eye, color: 'text-blue-600' },
    { id: 'edit', label: 'Edit Staff', icon: Edit, color: 'text-gray-700' },
    { 
      id: item.isActive ? 'deactivate' : 'activate', 
      label: item.isActive ? 'Deactivate' : 'Activate', 
      icon: item.isActive ? UserX : UserCheck, 
      color: 'text-gray-700' 
    }
  ];

  return (
    <div className="space-y-4">
      {/* View Mode Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'grid'
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Grid View
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'list'
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            List View
          </button>
        </div>

        {/* Selection Info */}
        {selectedItems.length > 0 && (
          <div className="text-sm text-gray-600">
            {selectedItems.length} of {staffData.length} selected
          </div>
        )}
      </div>

      {/* DataTable */}
      <DataTable
        data={staffData}
        selectedItems={selectedItems}
        onSelectItem={handleSelectItem}
        onSelectAll={handleSelectAll}
        getActionMenuItems={getActionMenuItems}
        onActionClick={onAction}
        viewMode={viewMode}
        keyField="id"
        displayFields={{
          avatar: { firstName: 'firstName', lastName: 'lastName', email: 'personalEmail', picture: 'profilePicture' },
          title: (item) => `${item.firstName} ${item.lastName}`,
          subtitle: 'personalEmail',
          status: (item) => item.isActive && !item.deactivated ? 'active' : 'deactivated',
          date: 'createdAt'
        }}
        selectAllLabel="Select All Staff"
        emptyMessage="No staff members found"
        styling={{
          gridCols: 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3',
          cardHover: 'hover:border-green-300 hover:shadow-lg',
          listHover: 'hover:bg-gray-50',
          theme: 'green'
        }}
      />
    </div>
  );
};

// Example 2: Simple User List
export const SimpleUserTableExample = () => {
  const [selectedItems, setSelectedItems] = useState([]);
  
  const mockData = [
    { id: 1, firstName: 'John', lastName: 'Doe', personalEmail: 'john@example.com', isActive: true, createdAt: '2024-01-01' },
    { id: 2, firstName: 'Jane', lastName: 'Smith', personalEmail: 'jane@example.com', isActive: true, createdAt: '2024-01-02' },
    { id: 3, firstName: 'Bob', lastName: 'Johnson', personalEmail: 'bob@example.com', isActive: false, createdAt: '2024-01-03' }
  ];

  const handleSelectItem = (itemId) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleSelectAll = () => {
    if (selectedItems.length === mockData.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(mockData.map(item => item.id));
    }
  };

  const getActionMenuItems = () => [
    { id: 'view', label: 'View Details', icon: Eye, color: 'text-blue-600' },
    { id: 'edit', label: 'Edit User', icon: Edit, color: 'text-gray-700' }
  ];

  return (
    <DataTable
      data={mockData}
      selectedItems={selectedItems}
      onSelectItem={handleSelectItem}
      onSelectAll={handleSelectAll}
      getActionMenuItems={getActionMenuItems}
      onActionClick={(actionId, item) => console.log(actionId, item)}
      viewMode="list"
      keyField="id"
      displayFields={{
        avatar: { firstName: 'firstName', lastName: 'lastName', email: 'personalEmail' },
        title: (item) => `${item.firstName} ${item.lastName}`,
        subtitle: 'personalEmail',
        status: (item) => item.isActive ? 'active' : 'inactive',
        date: 'createdAt'
      }}
      selectAllLabel="Select All Users"
      emptyMessage="No users found"
    />
  );
};

// Example 3: Grid vs List View Comparison
export const GridListComparisonExample = () => {
  const [selectedItems, setSelectedItems] = useState([]);
  
  const mockData = [
    { id: 1, firstName: 'John', lastName: 'Doe', personalEmail: 'john@example.com', isActive: true, createdAt: '2024-01-01' },
    { id: 2, firstName: 'Jane', lastName: 'Smith', personalEmail: 'jane@example.com', isActive: true, createdAt: '2024-01-02' },
    { id: 3, firstName: 'Bob', lastName: 'Johnson', personalEmail: 'bob@example.com', isActive: false, createdAt: '2024-01-03' }
  ];

  const handleSelectItem = (itemId) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleSelectAll = () => {
    if (selectedItems.length === mockData.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(mockData.map(item => item.id));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Grid View</h3>
        <DataTable
          data={mockData}
          selectedItems={selectedItems}
          onSelectItem={handleSelectItem}
          onSelectAll={handleSelectAll}
          viewMode="grid"
          keyField="id"
          displayFields={{
            avatar: { firstName: 'firstName', lastName: 'lastName', email: 'personalEmail' },
            title: (item) => `${item.firstName} ${item.lastName}`,
            subtitle: 'personalEmail',
            status: (item) => item.isActive ? 'active' : 'inactive',
            date: 'createdAt'
          }}
        />
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">List View</h3>
        <DataTable
          data={mockData}
          selectedItems={selectedItems}
          onSelectItem={handleSelectItem}
          onSelectAll={handleSelectAll}
          viewMode="list"
          keyField="id"
          displayFields={{
            avatar: { firstName: 'firstName', lastName: 'lastName', email: 'personalEmail' },
            title: (item) => `${item.firstName} ${item.lastName}`,
            subtitle: 'personalEmail',
            status: (item) => item.isActive ? 'active' : 'inactive',
            date: 'createdAt'
          }}
        />
      </div>
    </div>
  );
};

export default {
  StaffDataTableExample,
  SimpleUserTableExample,
  GridListComparisonExample
};