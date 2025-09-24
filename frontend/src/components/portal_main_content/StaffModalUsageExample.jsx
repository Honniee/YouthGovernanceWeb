import React, { useState } from 'react';
import { GenericViewModal, GenericEditModal } from './index';
import { getModalConfig, processModalConfig } from './modalConfigs';

/**
 * Example: Using Generic Modals for Staff Management
 * 
 * This shows how you can replace ViewStaffModal and EditStaffModal 
 * with the generic versions using configuration.
 */
const StaffModalUsageExample = () => {
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedStaffMember, setSelectedStaffMember] = useState(null);
  const [isEditingSaving, setIsEditingSaving] = useState(false);

  // Sample staff data
  const sampleStaff = {
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
  };

  // This is how you would handle the action menu clicks
  const handleActionClick = async (action, item) => {
    switch (action) {
      case 'view':
        setSelectedStaffMember(item);
        setShowViewModal(true);
        break;
      case 'edit':
        setSelectedStaffMember(item);
        setShowEditModal(true);
        break;
      // ... other actions
    }
  };

  // This is how you would handle saving edits
  const handleEditSave = async (updatedStaffMember) => {
    setIsEditingSaving(true);
    try {
      const updateData = {
        firstName: updatedStaffMember.firstName,
        lastName: updatedStaffMember.lastName,
        middleName: updatedStaffMember.middleName,
        suffix: updatedStaffMember.suffix,
        personalEmail: updatedStaffMember.personalEmail
      };

      // Here you would call your staff service
      // const response = await staffService.updateStaff(updatedStaffMember.lydoId, updateData);
      
      console.log('Would save:', updateData);
      alert('Staff member updated successfully!');
      
      setShowEditModal(false);
      setSelectedStaffMember(null);
      // loadStaffData(); // Reload data
    } catch (error) {
      console.error('Error updating staff:', error);
      alert('Error updating staff member');
    } finally {
      setIsEditingSaving(false);
    }
  };

  // Get processed configurations
  const viewConfig = selectedStaffMember ? processModalConfig(
    getModalConfig('staff', 'view'),
    selectedStaffMember
  ) : {};

  const editConfig = selectedStaffMember ? processModalConfig(
    getModalConfig('staff', 'edit'),
    selectedStaffMember
  ) : {};

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Staff Management with Generic Modals</h1>
      
      {/* Demo buttons */}
      <div className="space-x-4 mb-8">
        <button
          onClick={() => handleActionClick('view', sampleStaff)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          View Staff Details
        </button>
        <button
          onClick={() => handleActionClick('edit', sampleStaff)}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          Edit Staff Member
        </button>
      </div>

      {/* Usage Instructions */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">How to Integrate:</h2>
        <div className="space-y-3 text-sm">
          <p><strong>1. Replace imports:</strong></p>
          <code className="block bg-gray-100 p-2 rounded text-xs">
            // Old:<br/>
            import {`{ViewStaffModal, EditStaffModal}`} from './index';<br/><br/>
            // New:<br/>
            import {`{GenericViewModal, GenericEditModal}`} from './index';<br/>
            import {`{getModalConfig, processModalConfig}`} from './modalConfigs';
          </code>
          
          <p><strong>2. Update your modal JSX:</strong></p>
          <code className="block bg-gray-100 p-2 rounded text-xs">
            {`<GenericViewModal
              isOpen={showViewModal}
              onClose={() => {
                setShowViewModal(false);
                setSelectedStaffMember(null);
              }}
              data={selectedStaffMember}
              config={processModalConfig(
                getModalConfig('staff', 'view'),
                selectedStaffMember
              )}
            />`}
          </code>
          
          <p><strong>3. Benefits:</strong></p>
          <ul className="list-disc ml-6 space-y-1">
            <li>Same modals work for staff, surveys, events, etc.</li>
            <li>Configuration-driven - easy to modify without code changes</li>
            <li>Consistent styling and behavior across all entity types</li>
            <li>New entity types just need new config, no new components</li>
          </ul>
        </div>
      </div>

      {/* Generic Modals */}
      <GenericViewModal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setSelectedStaffMember(null);
        }}
        data={selectedStaffMember}
        config={viewConfig}
      />

      <GenericEditModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedStaffMember(null);
        }}
        data={selectedStaffMember}
        config={editConfig}
        onSave={handleEditSave}
        isSaving={isEditingSaving}
      />
    </div>
  );
};

export default StaffModalUsageExample;




























