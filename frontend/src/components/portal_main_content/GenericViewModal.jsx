import React from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, User, Mail, FileText, Hash, MapPin, Phone, Globe } from 'lucide-react';
import { Avatar, Status } from './index';

/**
 * GenericViewModal Component
 * 
 * A highly reusable modal component for displaying any type of data.
 * Can be used for staff, surveys, events, projects, or any other entity.
 * 
 * @param {Object} props - Component properties
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Function to close the modal
 * @param {Object} props.data - Data object to display
 * @param {Object} props.config - Configuration for modal appearance and behavior
 * @param {string} [props.className=''] - Additional CSS classes
 */
const GenericViewModal = ({ 
  isOpen, 
  onClose, 
  data,
  config = {},
  className = '' 
}) => {
  if (!isOpen || !data) return null;

  // Default configuration
  const defaultConfig = {
    title: 'View Details',
    subtitle: null,
    avatar: null, // { user: {}, size: 'lg', color: 'blue' }
    sections: [],
    maxWidth: 'max-w-2xl',
    primaryColor: 'blue'
  };

  const modalConfig = { ...defaultConfig, ...config };

  // Icon mapping for common field types
  const getFieldIcon = (iconType) => {
    const iconMap = {
      user: User,
      email: Mail,
      phone: Phone,
      calendar: Calendar,
      date: Calendar,
      text: FileText,
      description: FileText,
      id: Hash,
      number: Hash,
      location: MapPin,
      address: MapPin,
      website: Globe,
      url: Globe
    };
    
    const IconComponent = iconMap[iconType] || FileText;
    return <IconComponent className={`w-5 h-5 mr-2 text-${modalConfig.primaryColor}-600`} />;
  };

  const formatValue = (value, format) => {
    if (!value) return 'N/A';
    
    switch (format) {
      case 'date':
        try {
          return new Date(value).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
        } catch {
          return value;
        }
      
      case 'datetime':
        try {
          return new Date(value).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        } catch {
          return value;
        }
      
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        }).format(value);
      
      case 'number':
        return new Intl.NumberFormat('en-US').format(value);
      
      case 'email':
        return value;
      
      case 'phone':
        return value;
      
      case 'boolean':
        return value ? 'Yes' : 'No';
      
      case 'status':
        return (
          <Status 
            status={value}
            variant="badge"
            size="md"
          />
        );
      
      default:
        return value;
    }
  };

  const renderField = (field) => {
    const value = field.value || data[field.key];
    const formattedValue = formatValue(value, field.format);

    return (
      <div key={field.key} className={field.className || ''}>
        <label className="block text-sm font-medium text-gray-500 mb-1">
          {field.label}
        </label>
        <div className="text-gray-900">
          {field.format === 'status' ? formattedValue : (
            <p>{formattedValue}</p>
          )}
        </div>
      </div>
    );
  };

  const renderSection = (section, index) => (
    <div key={index} className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 flex items-center">
        {section.icon && getFieldIcon(section.icon)}
        {section.title}
      </h3>
      
      <div className={`space-y-3 ${section.layout === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : ''}`}>
        {section.fields?.map(renderField)}
      </div>
    </div>
  );

  return createPortal(
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/30 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div 
        className={`bg-white rounded-xl shadow-2xl ${modalConfig.maxWidth} w-full max-h-[90vh] overflow-hidden ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            {modalConfig.avatar && (
              <Avatar {...modalConfig.avatar} />
            )}
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {modalConfig.title}
              </h2>
              {modalConfig.subtitle && (
                <p className="text-gray-600">{modalConfig.subtitle}</p>
              )}
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
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="space-y-6">
            {modalConfig.sections?.map(renderSection)}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className={`px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-${modalConfig.primaryColor}-500 focus:border-${modalConfig.primaryColor}-500 transition-colors`}
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default GenericViewModal;
