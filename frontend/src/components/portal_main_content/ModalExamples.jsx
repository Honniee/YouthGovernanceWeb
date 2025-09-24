import React from 'react';
import { Filter, ArrowUpDown, Archive, Users, Settings } from 'lucide-react';
import { Modal, FilterModal, SortModal, BulkModal, useFilterModal, useSortModal, useBulkModal } from './index';

/**
 * Examples of how to use the Modal components
 * This file demonstrates various use cases and configurations
 */

// Example 1: Staff Management Filter Modal (matches current StaffManagement)
export const StaffFilterModalExample = () => {
  const filterModal = useFilterModal({ status: 'all' });

  const filterConfig = [
    {
      id: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'all', label: 'All Status' },
        { value: 'active', label: 'Active' },
        { value: 'deactivated', label: 'Deactivated' }
      ],
      defaultValue: 'all'
    }
  ];

  return (
    <div>
      <button
        ref={filterModal.triggerRef}
        onClick={filterModal.toggleModal}
        className={`inline-flex items-center border rounded-lg font-medium transition-all duration-200 px-3 py-2 ${
          filterModal.isOpen || filterModal.hasActiveFilters
            ? 'border-blue-500 text-blue-600 bg-blue-50' 
            : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
        }`}
      >
        <Filter className="w-4 h-4 mr-2" />
        Filters
        {filterModal.hasActiveFilters && (
          <div className="ml-2 px-1.5 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full border border-green-200">
            Active
          </div>
        )}
      </button>

      <FilterModal
        isOpen={filterModal.isOpen}
        onClose={filterModal.closeModal}
        triggerRef={filterModal.triggerRef}
        filters={filterConfig}
        values={filterModal.filterValues}
        onChange={filterModal.updateFilterValues}
        onClear={filterModal.clearFilters}
      />
    </div>
  );
};

// Example 2: Staff Management Sort Modal
export const StaffSortModalExample = () => {
  const sortModal = useSortModal('last_name', 'asc');

  const sortFields = [
    { value: 'last_name', label: 'Last Name' },
    { value: 'first_name', label: 'First Name' },
    { value: 'email', label: 'Email' },
    { value: 'created_at', label: 'Date Created' },
    { value: 'is_active', label: 'Status' }
  ];

  return (
    <div>
      <button
        ref={sortModal.triggerRef}
        onClick={sortModal.toggleModal}
        className={`inline-flex items-center border rounded-lg font-medium transition-all duration-200 px-3 py-2 ${
          sortModal.isOpen || !sortModal.isDefaultSort
            ? 'border-blue-500 text-blue-600 bg-blue-50' 
            : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
        }`}
      >
        <ArrowUpDown className="w-4 h-4 mr-2" />
        Sort
        {!sortModal.isDefaultSort && (
          <div className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full border border-blue-200">
            {sortFields.find(f => f.value === sortModal.sortBy)?.label} 
            {sortModal.sortOrder === 'asc' ? ' ↑' : ' ↓'}
          </div>
        )}
      </button>

      <SortModal
        isOpen={sortModal.isOpen}
        onClose={sortModal.closeModal}
        triggerRef={sortModal.triggerRef}
        sortFields={sortFields}
        sortBy={sortModal.sortBy}
        sortOrder={sortModal.sortOrder}
        onSortChange={sortModal.updateSort}
        onReset={sortModal.resetSort}
        defaultSortBy="last_name"
        defaultSortOrder="asc"
      />
    </div>
  );
};

// Example 3: Bulk Operations Modal
export const BulkOperationsModalExample = ({ selectedCount = 3 }) => {
  const bulkModal = useBulkModal();

  const bulkActions = [
    {
      id: 'activate',
      label: 'Activate',
      confirmationMessage: 'This will activate all selected staff members.'
    },
    {
      id: 'deactivate',
      label: 'Deactivate',
      confirmationMessage: 'This will deactivate all selected staff members.'
    },
    {
      id: 'delete',
      label: 'Delete',
      destructive: true,
      confirmationMessage: 'This will permanently delete all selected staff members.'
    }
  ];

  const additionalFields = [
    {
      id: 'reason',
      label: 'Reason for deactivation',
      type: 'textarea',
      placeholder: 'Optional: Provide a reason...',
      showFor: ['deactivate'],
      required: false
    }
  ];

  const handleExecute = async (action, fieldValues) => {
    bulkModal.startProcessing();
    
    // Simulate progress
    for (let i = 0; i <= 100; i += 20) {
      await new Promise(resolve => setTimeout(resolve, 200));
      bulkModal.updateProgress(i);
    }
    
    bulkModal.finishProcessing();
    alert(`Bulk ${action} completed!`);
  };

  return (
    <div>
      <button
        onClick={bulkModal.openModal}
        className="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-all duration-200"
      >
        <Archive className="w-4 h-4 mr-2" />
        Bulk Actions
      </button>

      <BulkModal
        isOpen={bulkModal.isOpen}
        onClose={bulkModal.closeModal}
        selectedCount={selectedCount}
        actions={bulkActions}
        selectedAction={bulkModal.selectedAction}
        onActionChange={bulkModal.setSelectedAction}
        onExecute={handleExecute}
        isProcessing={bulkModal.isProcessing}
        progress={bulkModal.progress}
        showProgress={true}
        additionalFields={additionalFields}
        fieldValues={bulkModal.fieldValues}
        onFieldChange={bulkModal.updateFieldValues}
      />
    </div>
  );
};

// Example 4: Advanced Filter Modal with Multiple Field Types
export const AdvancedFilterModalExample = () => {
  const filterModal = useFilterModal({
    status: 'all',
    roles: [],
    dateRange: { start: '', end: '' },
    department: '',
    isRemote: false
  });

  const advancedFilters = [
    {
      id: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'all', label: 'All Status' },
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
        { value: 'pending', label: 'Pending' }
      ]
    },
    {
      id: 'roles',
      label: 'Roles',
      type: 'multiselect',
      options: [
        { value: 'admin', label: 'Admin' },
        { value: 'manager', label: 'Manager' },
        { value: 'staff', label: 'Staff' },
        { value: 'intern', label: 'Intern' }
      ]
    },
    {
      id: 'dateRange',
      label: 'Date Range',
      type: 'daterange',
      description: 'Filter by date range'
    },
    {
      id: 'department',
      label: 'Department',
      type: 'select',
      options: [
        { value: '', label: 'All Departments' },
        { value: 'engineering', label: 'Engineering' },
        { value: 'marketing', label: 'Marketing' },
        { value: 'sales', label: 'Sales' },
        { value: 'hr', label: 'Human Resources' }
      ]
    },
    {
      id: 'isRemote',
      label: 'Remote Work',
      type: 'checkbox'
    }
  ];

  return (
    <div>
      <button
        ref={filterModal.triggerRef}
        onClick={filterModal.toggleModal}
        className="inline-flex items-center border rounded-lg font-medium transition-all duration-200 px-3 py-2 border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50"
      >
        <Filter className="w-4 h-4 mr-2" />
        Advanced Filters
        {filterModal.hasActiveFilters && (
          <span className="ml-2 w-2 h-2 bg-blue-500 rounded-full"></span>
        )}
      </button>

      <FilterModal
        isOpen={filterModal.isOpen}
        onClose={filterModal.closeModal}
        triggerRef={filterModal.triggerRef}
        title="Advanced Filters"
        filters={advancedFilters}
        values={filterModal.filterValues}
        onChange={filterModal.updateFilterValues}
        onClear={filterModal.clearFilters}
        size="lg"
      />
    </div>
  );
};

// Example 5: Settings Modal (Overlay Mode)
export const SettingsModalExample = () => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
      >
        <Settings className="w-4 h-4 mr-2" />
        Settings
      </button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Application Settings"
        size="lg"
        variant="overlay"
        position="center"
      >
        <div className="p-6 space-y-6">
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Appearance</h4>
            <div className="space-y-3">
              <label className="flex items-center">
                <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-3" />
                <span className="text-sm text-gray-700">Dark mode</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-3" />
                <span className="text-sm text-gray-700">Compact view</span>
              </label>
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Notifications</h4>
            <div className="space-y-3">
              <label className="flex items-center">
                <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-3" />
                <span className="text-sm text-gray-700">Email notifications</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-3" />
                <span className="text-sm text-gray-700">Push notifications</span>
              </label>
            </div>
          </div>
        </div>
        
        <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end space-x-3">
          <button
            onClick={() => setIsOpen(false)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Save Changes
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default {
  StaffFilterModalExample,
  StaffSortModalExample,
  BulkOperationsModalExample,
  AdvancedFilterModalExample,
  SettingsModalExample
};






























