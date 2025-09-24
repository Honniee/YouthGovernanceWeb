import React from 'react';
import { createPortal } from 'react-dom';
import { X, User, Mail, Calendar, Shield, MapPin, Phone } from 'lucide-react';
import { Avatar, Status } from './index';

/**
 * ViewStaffModal Component
 * 
 * A modal component for displaying detailed staff member information.
 * Shows comprehensive staff details in a clean, organized layout.
 * 
 * @param {Object} props - Component properties
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Function to close the modal
 * @param {Object} props.staffMember - Staff member object to display
 * @param {string} [props.className=''] - Additional CSS classes
 */
const ViewStaffModal = ({ 
  isOpen, 
  onClose, 
  staffMember,
  className = '' 
}) => {
  if (!isOpen || !staffMember) return null;

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'N/A';
    }
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 bg-black/30 backdrop-blur-[2px]"
      onClick={onClose}
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
                firstName: staffMember.firstName,
                lastName: staffMember.lastName,
                personalEmail: staffMember.personalEmail,
                profilePicture: staffMember.profilePicture
              }}
              size="md"
              color="blue"
              className="sm:hidden"
            />
            <Avatar 
              user={{
                firstName: staffMember.firstName,
                lastName: staffMember.lastName,
                personalEmail: staffMember.personalEmail,
                profilePicture: staffMember.profilePicture
              }}
              size="lg"
              color="blue"
              className="hidden sm:block"
            />
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 truncate">
                {staffMember.firstName} {staffMember.lastName}
              </h2>
              <p className="text-sm sm:text-base text-gray-600 truncate">{staffMember.lydoId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(95vh-140px)] sm:max-h-[calc(90vh-140px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <User className="w-5 h-5 mr-2 text-blue-600" />
                Personal Information
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Full Name</label>
                  <p className="text-gray-900">
                    {staffMember.firstName} {staffMember.middleName ? staffMember.middleName + ' ' : ''}{staffMember.lastName}
                    {staffMember.suffix ? ', ' + staffMember.suffix : ''}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-500">LYDO ID</label>
                  <p className="text-gray-900 font-mono">{staffMember.lydoId}</p>
                </div>

                {staffMember.roleId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Role ID</label>
                    <p className="text-gray-900">{staffMember.roleId}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Mail className="w-5 h-5 mr-2 text-blue-600" />
                Contact Information
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Personal Email</label>
                  <p className="text-gray-900">{staffMember.personalEmail || 'N/A'}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-500">Organization Email</label>
                  <p className="text-gray-900">{staffMember.email || 'N/A'}</p>
                </div>

                {staffMember.phoneNumber && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Phone Number</label>
                    <p className="text-gray-900">{staffMember.phoneNumber}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Status Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Shield className="w-5 h-5 mr-2 text-blue-600" />
                Status Information
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Current Status</label>
                  <div className="mt-1">
                    <Status 
                      status={staffMember.isActive && !staffMember.deactivated ? 'active' : 'deactivated'}
                      variant="badge"
                      size="md"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-500">Email Verified</label>
                  <p className="text-gray-900">{staffMember.emailVerified ? 'Yes' : 'No'}</p>
                </div>

                {staffMember.deactivated && staffMember.deactivatedAt && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Deactivated At</label>
                    <p className="text-gray-900">{formatDateTime(staffMember.deactivatedAt)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Account Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                Account Information
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Created At</label>
                  <p className="text-gray-900">{formatDateTime(staffMember.createdAt)}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-500">Last Updated</label>
                  <p className="text-gray-900">{formatDateTime(staffMember.updatedAt)}</p>
                </div>

                {staffMember.createdBy && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Created By</label>
                    <p className="text-gray-900">{staffMember.createdBy}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-4 sm:p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ViewStaffModal;
