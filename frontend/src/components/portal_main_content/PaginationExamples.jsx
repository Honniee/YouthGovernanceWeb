import React, { useState } from 'react';
import { Pagination, usePagination, useServerPagination, useClientPagination } from './index';

/**
 * Examples of how to use the Pagination component
 * This file demonstrates various use cases and configurations
 */

// Example 1: Staff Management Pagination (matches current StaffManagement)
export const StaffPaginationExample = ({ totalStaff = 150, onPageChange, onItemsPerPageChange }) => {
  const pagination = usePagination({
    initialPage: 1,
    initialItemsPerPage: 10,
    totalItems: totalStaff,
    onPageChange,
    onItemsPerPageChange
  });

  return (
    <Pagination
      currentPage={pagination.currentPage}
      totalItems={totalStaff}
      itemsPerPage={pagination.itemsPerPage}
      onPageChange={pagination.handlePageChange}
      onItemsPerPageChange={pagination.handleItemsPerPageChange}
      itemName="staff member"
      itemNamePlural="staff members"
      showItemsPerPage={true}
      showInfo={true}
      size="md"
      variant="default"
    />
  );
};

// Example 2: Simple Pagination (prev/next only)
export const SimplePaginationExample = ({ totalItems = 100 }) => {
  const pagination = usePagination({
    initialItemsPerPage: 5,
    totalItems
  });

  return (
    <Pagination
      currentPage={pagination.currentPage}
      totalItems={totalItems}
      itemsPerPage={pagination.itemsPerPage}
      onPageChange={pagination.handlePageChange}
      itemName="item"
      variant="simple"
      size="md"
    />
  );
};

// Example 3: Compact Pagination (minimal design)
export const CompactPaginationExample = ({ totalItems = 50 }) => {
  const pagination = usePagination({
    initialItemsPerPage: 10,
    totalItems
  });

  return (
    <Pagination
      currentPage={pagination.currentPage}
      totalItems={totalItems}
      itemsPerPage={pagination.itemsPerPage}
      onPageChange={pagination.handlePageChange}
      variant="compact"
      size="sm"
      showItemsPerPage={false}
      showInfo={false}
    />
  );
};

// Example 4: Large Pagination with First/Last buttons
export const LargePaginationExample = ({ totalItems = 500 }) => {
  const pagination = usePagination({
    initialItemsPerPage: 20,
    totalItems
  });

  return (
    <Pagination
      currentPage={pagination.currentPage}
      totalItems={totalItems}
      itemsPerPage={pagination.itemsPerPage}
      onPageChange={pagination.handlePageChange}
      onItemsPerPageChange={pagination.handleItemsPerPageChange}
      itemName="record"
      showFirstLast={true}
      maxPages={7}
      size="lg"
      itemsPerPageOptions={[10, 20, 50, 100]}
    />
  );
};

// Example 5: Server-side Pagination
export const ServerPaginationExample = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalItems, setTotalItems] = useState(0);

  const handlePaginationChange = async ({ page, limit, offset }) => {
    setLoading(true);
    try {
      // Simulate API call
      console.log('Fetching data:', { page, limit, offset });
      // const response = await api.getData({ page, limit });
      // setData(response.data);
      // setTotalItems(response.total);
      
      // Mock data
      setTimeout(() => {
        setData(Array.from({ length: limit }, (_, i) => ({ id: offset + i + 1, name: `Item ${offset + i + 1}` })));
        setTotalItems(95); // Mock total
        setLoading(false);
      }, 500);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setLoading(false);
    }
  };

  const pagination = useServerPagination({
    initialPage: 1,
    initialItemsPerPage: 10,
    totalItems,
    onPaginationChange: handlePaginationChange
  });

  return (
    <div>
      {/* Data Display */}
      <div className="mb-4">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : (
          <div className="space-y-2">
            {data.map(item => (
              <div key={item.id} className="p-3 bg-white border rounded">
                {item.name}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={pagination.currentPage}
        totalItems={pagination.totalItems}
        itemsPerPage={pagination.itemsPerPage}
        onPageChange={pagination.handlePageChange}
        onItemsPerPageChange={pagination.handleItemsPerPageChange}
        itemName="item"
        disabled={loading}
      />
    </div>
  );
};

// Example 6: Client-side Pagination
export const ClientPaginationExample = () => {
  // Mock data
  const allData = Array.from({ length: 47 }, (_, i) => ({
    id: i + 1,
    name: `User ${i + 1}`,
    email: `user${i + 1}@example.com`,
    status: i % 3 === 0 ? 'inactive' : 'active'
  }));

  const [filterStatus, setFilterStatus] = useState('all');

  const pagination = useClientPagination({
    data: allData,
    initialItemsPerPage: 8,
    filterFn: item => filterStatus === 'all' || item.status === filterStatus,
    sortFn: (a, b) => a.name.localeCompare(b.name)
  });

  return (
    <div>
      {/* Filter */}
      <div className="mb-4">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg"
        >
          <option value="all">All Users</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Data Display */}
      <div className="mb-4 space-y-2">
        {pagination.items.map(item => (
          <div key={item.id} className="p-3 bg-white border rounded flex justify-between items-center">
            <div>
              <div className="font-medium">{item.name}</div>
              <div className="text-sm text-gray-600">{item.email}</div>
            </div>
            <span className={`px-2 py-1 rounded text-xs ${
              item.status === 'active' 
                ? 'bg-green-100 text-green-700' 
                : 'bg-gray-100 text-gray-700'
            }`}>
              {item.status}
            </span>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={pagination.currentPage}
        totalItems={pagination.totalItems}
        itemsPerPage={pagination.itemsPerPage}
        onPageChange={pagination.handlePageChange}
        onItemsPerPageChange={pagination.handleItemsPerPageChange}
        itemName="user"
        itemsPerPageOptions={[5, 8, 15, 30]}
      />
    </div>
  );
};

// Example 7: Different Sizes Showcase
export const PaginationSizesExample = () => {
  const totalItems = 100;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Small Size</h3>
        <Pagination
          currentPage={1}
          totalItems={totalItems}
          itemsPerPage={10}
          onPageChange={() => {}}
          size="sm"
          itemName="item"
        />
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Medium Size (Default)</h3>
        <Pagination
          currentPage={3}
          totalItems={totalItems}
          itemsPerPage={10}
          onPageChange={() => {}}
          size="md"
          itemName="item"
        />
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Large Size</h3>
        <Pagination
          currentPage={5}
          totalItems={totalItems}
          itemsPerPage={10}
          onPageChange={() => {}}
          size="lg"
          itemName="item"
          showFirstLast={true}
        />
      </div>
    </div>
  );
};

// Example 8: Different Variants Showcase
export const PaginationVariantsExample = () => {
  const totalItems = 75;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Default Variant</h3>
        <Pagination
          currentPage={2}
          totalItems={totalItems}
          itemsPerPage={10}
          onPageChange={() => {}}
          variant="default"
          itemName="item"
        />
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Simple Variant</h3>
        <Pagination
          currentPage={3}
          totalItems={totalItems}
          itemsPerPage={10}
          onPageChange={() => {}}
          variant="simple"
          itemName="item"
        />
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Compact Variant</h3>
        <Pagination
          currentPage={4}
          totalItems={totalItems}
          itemsPerPage={10}
          onPageChange={() => {}}
          variant="compact"
          itemName="item"
        />
      </div>
    </div>
  );
};

export default {
  StaffPaginationExample,
  SimplePaginationExample,
  CompactPaginationExample,
  LargePaginationExample,
  ServerPaginationExample,
  ClientPaginationExample,
  PaginationSizesExample,
  PaginationVariantsExample
};






























