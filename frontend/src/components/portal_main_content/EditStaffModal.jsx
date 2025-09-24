import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, User, Mail } from 'lucide-react';
import { Avatar } from './index';
import { ConfirmationModal } from '../universal';
import useConfirmation from '../../hooks/useConfirmation';

/**
 * EditStaffModal Component
 * 
 * A modal component for editing staff member information.
 * Provides a form interface for updating staff details.
 * 
 * @param {Object} props - Component properties
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Function to close the modal
 * @param {Object} props.staffMember - Staff member object to edit
 * @param {Function} props.onSave - Function called when saving changes
 * @param {boolean} [props.isSaving=false] - Whether save operation is in progress
 * @param {string} [props.className=''] - Additional CSS classes
 */
const EditStaffModal = ({ 
  isOpen, 
  onClose, 
  staffMember,
  onSave,
  isSaving = false,
  className = '' 
}) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    suffix: '',
    personalEmail: ''
  });

  const [errors, setErrors] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  
  // Confirmation modal hook
  const confirmation = useConfirmation();

  // Initialize form data when staff member changes
  useEffect(() => {
    if (staffMember) {
      const newFormData = {
        firstName: staffMember.firstName || '',
        lastName: staffMember.lastName || '',
        middleName: staffMember.middleName || '',
        suffix: staffMember.suffix || '',
        personalEmail: staffMember.personalEmail || ''
      };
      setFormData(newFormData);
      setHasChanges(false);
      setErrors({});
    }
  }, [staffMember]);

  // Check if form has changes
  useEffect(() => {
    if (!staffMember) return;
    
    const hasFormChanges = (
      formData.firstName !== (staffMember.firstName || '') ||
      formData.lastName !== (staffMember.lastName || '') ||
      formData.middleName !== (staffMember.middleName || '') ||
      formData.suffix !== (staffMember.suffix || '') ||
      formData.personalEmail !== (staffMember.personalEmail || '')
    );
    
    setHasChanges(hasFormChanges);
  }, [formData, staffMember]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.personalEmail.trim()) {
      newErrors.personalEmail = 'Personal email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.personalEmail)) {
      newErrors.personalEmail = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    if (!hasChanges) {
      onClose();
      return;
    }

    // Call the onSave function with the updated data
    onSave({
      ...staffMember,
      ...formData
    });
  };

  const handleClose = async () => {
    if (hasChanges && !isSaving) {
      const confirmed = await confirmation.showConfirmation({
        title: "Unsaved Changes",
        message: "You have unsaved changes. Are you sure you want to close?",
        confirmText: "Close Without Saving",
        cancelText: "Continue Editing",
        variant: "warning"
      });
      
      if (confirmed) {
        confirmation.hideConfirmation();
        onClose();
      }
    } else {
      onClose();
    }
  };

  if (!isOpen || !staffMember) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 bg-black/30 backdrop-blur-[2px]"
      onClick={handleClose}
    >
      <div 
        className={`bg-white rounded-xl shadow-2xl w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
            <Avatar 
              user={{
                firstName: formData.firstName || staffMember.firstName,
                lastName: formData.lastName || staffMember.lastName,
                personalEmail: formData.personalEmail || staffMember.personalEmail,
                profilePicture: staffMember.profilePicture
              }}
              size="md"
              color="blue"
              className="sm:hidden"
            />
            <Avatar 
              user={{
                firstName: formData.firstName || staffMember.firstName,
                lastName: formData.lastName || staffMember.lastName,
                personalEmail: formData.personalEmail || staffMember.personalEmail,
                profilePicture: staffMember.profilePicture
              }}
              size="lg"
              color="blue"
              className="hidden sm:block"
            />
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 truncate">Edit Staff Member</h2>
              <p className="text-sm sm:text-base text-gray-600 truncate">{staffMember.lydoId}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isSaving}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto max-h-[calc(95vh-200px)] sm:max-h-[calc(90vh-200px)]">
          <div className="space-y-4 sm:space-y-6">
            
            {/* Personal Information */}
            <div className="space-y-3 sm:space-y-4">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center">
                <User className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-blue-600" />
                Personal Information
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                      errors.firstName ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="John"
                    disabled={isSaving}
                  />
                  {errors.firstName && (
                    <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                      errors.lastName ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Doe"
                    disabled={isSaving}
                  />
                  {errors.lastName && (
                    <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Middle Name
                  </label>
                  <input
                    type="text"
                    name="middleName"
                    value={formData.middleName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Michael"
                    disabled={isSaving}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Suffix
                  </label>
                  <input
                    type="text"
                    name="suffix"
                    value={formData.suffix}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Jr., Sr., III"
                    disabled={isSaving}
                  />
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-3 sm:space-y-4">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center">
                <Mail className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-blue-600" />
                Contact Information
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Personal Email *
                </label>
                <input
                  type="email"
                  name="personalEmail"
                  value={formData.personalEmail}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    errors.personalEmail ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="john.doe@example.com"
                  disabled={isSaving}
                />
                {errors.personalEmail && (
                  <p className="mt-1 text-sm text-red-600">{errors.personalEmail}</p>
                )}
              </div>

              {/* Read-only fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    LYDO ID (Read-only)
                  </label>
                  <input
                    type="text"
                    value={staffMember.lydoId}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
                    disabled
                  />
                </div>

                {staffMember.email && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Organization Email (Read-only)
                    </label>
                    <input
                      type="email"
                      value={staffMember.email}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
                      disabled
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 sm:p-6 border-t border-gray-200 bg-gray-50 gap-3 sm:gap-0">
          <div className="text-xs sm:text-sm text-gray-500 order-2 sm:order-1">
            {hasChanges && !isSaving && '* You have unsaved changes'}
          </div>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto order-1 sm:order-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSaving}
              className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={isSaving || !hasChanges}
              className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
        
        {/* Universal Confirmation Modal - Beautiful replacement for browser confirm() */}
        <ConfirmationModal {...confirmation.modalProps} />
      </div>
    </div>,
    document.body
  );
};

export default EditStaffModal;
