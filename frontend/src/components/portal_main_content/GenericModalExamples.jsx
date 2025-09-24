import React, { useState } from 'react';
import { GenericViewModal, GenericEditModal } from './index';
import { getModalConfig, processModalConfig } from './modalConfigs';

/**
 * Generic Modal Examples
 * 
 * This component demonstrates how to use GenericViewModal and GenericEditModal
 * with different types of data (staff, surveys, events).
 */
const GenericModalExamples = () => {
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentEntity, setCurrentEntity] = useState(null);
  const [entityType, setEntityType] = useState('staff');
  const [isSaving, setIsSaving] = useState(false);

  // Sample data for different entity types
  const sampleData = {
    staff: {
      lydoId: 'LYDO001',
      firstName: 'John',
      lastName: 'Doe',
      middleName: 'Michael',
      suffix: 'Jr.',
      personalEmail: 'john.doe@personal.com',
      email: 'john.doe@lydo.org',
      phoneNumber: '+1-555-0123',
      roleId: 'ADMIN',
      isActive: true,
      deactivated: false,
      emailVerified: true,
      createdAt: '2023-01-15T10:30:00Z',
      updatedAt: '2024-01-10T14:20:00Z',
      createdBy: 'System Admin',
      profilePicture: null
    },
    survey: {
      id: 'SUR001',
      title: 'Youth Engagement Survey 2024',
      description: 'Annual survey to assess youth engagement in community programs and gather feedback for improvements.',
      category: 'feedback',
      status: 'active',
      startDate: '2024-01-01',
      endDate: '2024-03-31',
      maxResponses: 1000,
      isPublic: true,
      totalResponses: 245,
      completionRate: 78,
      averageTime: 12,
      createdAt: '2023-12-15T09:00:00Z',
      updatedAt: '2024-01-05T16:45:00Z',
      createdBy: 'Survey Admin'
    },
    event: {
      eventCode: 'EVT001',
      title: 'Youth Leadership Summit 2024',
      description: 'Annual summit bringing together young leaders from across the region to discuss community issues and develop action plans.',
      status: 'active',
      startDate: '2024-02-15T09:00:00Z',
      endDate: '2024-02-17T17:00:00Z',
      timezone: 'PST',
      venue: 'Convention Center',
      address: '123 Main Street\nDowntown, CA 90210',
      capacity: 500,
      registeredCount: 342,
      createdAt: '2023-11-20T11:30:00Z',
      updatedAt: '2024-01-08T10:15:00Z'
    }
  };

  const handleViewClick = (type) => {
    setEntityType(type);
    setCurrentEntity(sampleData[type]);
    setShowViewModal(true);
  };

  const handleEditClick = (type) => {
    setEntityType(type);
    setCurrentEntity(sampleData[type]);
    setShowEditModal(true);
  };

  const handleSave = async (updatedData) => {
    setIsSaving(true);
    
    // Simulate API call
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('Saving updated data:', updatedData);
      alert(`${entityType} updated successfully!`);
      setShowEditModal(false);
    } catch (error) {
      console.error('Error saving:', error);
      alert('Error saving changes');
    } finally {
      setIsSaving(false);
    }
  };

  // Get processed configurations
  const viewConfig = currentEntity ? processModalConfig(
    getModalConfig(entityType, 'view'),
    currentEntity
  ) : {};

  const editConfig = currentEntity ? processModalConfig(
    getModalConfig(entityType, 'edit'),
    currentEntity
  ) : {};

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Generic Modal Examples</h1>
        <p className="text-gray-600 mb-6">
          Demonstration of reusable GenericViewModal and GenericEditModal components 
          that can be configured to work with any type of data across your application.
        </p>
      </div>

      {/* Staff Examples */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <span className="w-3 h-3 bg-blue-500 rounded-full mr-3"></span>
          Staff Management
        </h2>
        <p className="text-gray-600 mb-4">
          View and edit staff member information with organized sections for personal, contact, and status details.
        </p>
        <div className="flex space-x-3">
          <button
            onClick={() => handleViewClick('staff')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            View Staff Details
          </button>
          <button
            onClick={() => handleEditClick('staff')}
            className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
          >
            Edit Staff Member
          </button>
        </div>
      </div>

      {/* Survey Examples */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <span className="w-3 h-3 bg-green-500 rounded-full mr-3"></span>
          Survey Management
        </h2>
        <p className="text-gray-600 mb-4">
          View survey details with statistics and settings, or edit survey configuration with form validation.
        </p>
        <div className="flex space-x-3">
          <button
            onClick={() => handleViewClick('survey')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            View Survey Details
          </button>
          <button
            onClick={() => handleEditClick('survey')}
            className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
          >
            Edit Survey
          </button>
        </div>
      </div>

      {/* Event Examples */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <span className="w-3 h-3 bg-purple-500 rounded-full mr-3"></span>
          Event Management
        </h2>
        <p className="text-gray-600 mb-4">
          View event information including dates, location, and capacity, or edit event details with datetime fields.
        </p>
        <div className="flex space-x-3">
          <button
            onClick={() => handleViewClick('event')}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            View Event Details
          </button>
          <button
            onClick={() => handleEditClick('event')}
            className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
          >
            Edit Event
          </button>
        </div>
      </div>

      {/* Configuration Info */}
      <div className="bg-gray-50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">How It Works</h3>
        <div className="text-sm text-gray-600 space-y-2">
          <p>• <strong>Configuration-driven:</strong> All modal content is defined in modalConfigs.js</p>
          <p>• <strong>Reusable components:</strong> Same GenericViewModal and GenericEditModal for all entities</p>
          <p>• <strong>Flexible field types:</strong> Text, email, textarea, select, checkbox, date, datetime</p>
          <p>• <strong>Smart validation:</strong> Required fields, email validation, length constraints</p>
          <p>• <strong>Dynamic values:</strong> Functions can compute values based on entity data</p>
          <p>• <strong>Consistent styling:</strong> Color themes and layouts configured per entity type</p>
        </div>
      </div>

      {/* View Modal */}
      <GenericViewModal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setCurrentEntity(null);
        }}
        data={currentEntity}
        config={viewConfig}
      />

      {/* Edit Modal */}
      <GenericEditModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setCurrentEntity(null);
        }}
        data={currentEntity}
        config={editConfig}
        onSave={handleSave}
        isSaving={isSaving}
      />
    </div>
  );
};

export default GenericModalExamples;




























