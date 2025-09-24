import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Calendar, User, Mail, FileText, Hash, MapPin, Phone, Globe } from 'lucide-react';
import { Avatar } from './index';

/**
 * GenericEditModal Component
 * 
 * A highly reusable modal component for editing any type of data.
 * Can be used for staff, surveys, events, projects, or any other entity.
 * 
 * @param {Object} props - Component properties
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Function to close the modal
 * @param {Object} props.data - Data object to edit
 * @param {Function} props.onSave - Function called when saving changes
 * @param {Object} props.config - Configuration for modal appearance and behavior
 * @param {boolean} [props.isSaving=false] - Whether save operation is in progress
 * @param {string} [props.className=''] - Additional CSS classes
 */
const GenericEditModal = ({ 
  isOpen, 
  onClose, 
  data,
  onSave,
  config = {},
  isSaving = false,
  className = '' 
}) => {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [hasChanges, setHasChanges] = useState(false);

  // Default configuration
  const defaultConfig = {
    title: 'Edit Details',
    subtitle: null,
    avatar: null, // { user: {}, size: 'lg', color: 'blue' }
    sections: [],
    maxWidth: 'max-w-2xl',
    primaryColor: 'blue',
    validation: {} // { fieldKey: { required: true, type: 'email', minLength: 3 } }
  };

  const modalConfig = { ...defaultConfig, ...config };

  // Initialize form data when data changes
  useEffect(() => {
    if (data) {
      const initialData = {};
      modalConfig.sections?.forEach(section => {
        section.fields?.forEach(field => {
          if (field.editable !== false) {
            initialData[field.key] = data[field.key] || field.defaultValue || '';
          }
        });
      });
      setFormData(initialData);
      setHasChanges(false);
      setErrors({});
    }
  }, [data, modalConfig.sections]);

  // Check if form has changes
  useEffect(() => {
    if (!data) return;
    
    const hasFormChanges = modalConfig.sections?.some(section =>
      section.fields?.some(field => {
        if (field.editable === false) return false;
        return formData[field.key] !== (data[field.key] || field.defaultValue || '');
      })
    );
    
    setHasChanges(hasFormChanges || false);
  }, [formData, data, modalConfig.sections]);

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

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));
    
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateField = (fieldKey, value, validation) => {
    const errors = [];

    if (validation.required && (!value || value.toString().trim() === '')) {
      errors.push(`${validation.label || fieldKey} is required`);
    }

    if (value && validation.type === 'email') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        errors.push('Please enter a valid email address');
      }
    }

    if (value && validation.minLength && value.toString().length < validation.minLength) {
      errors.push(`Minimum ${validation.minLength} characters required`);
    }

    if (value && validation.maxLength && value.toString().length > validation.maxLength) {
      errors.push(`Maximum ${validation.maxLength} characters allowed`);
    }

    if (value && validation.pattern && !validation.pattern.test(value)) {
      errors.push(validation.message || 'Invalid format');
    }

    return errors;
  };

  const validateForm = () => {
    const newErrors = {};

    modalConfig.sections?.forEach(section => {
      section.fields?.forEach(field => {
        if (field.editable !== false && modalConfig.validation[field.key]) {
          const fieldErrors = validateField(
            field.key, 
            formData[field.key], 
            modalConfig.validation[field.key]
          );
          if (fieldErrors.length > 0) {
            newErrors[field.key] = fieldErrors[0]; // Show first error
          }
        }
      });
    });

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
      ...data,
      ...formData
    });
  };

  const handleClose = () => {
    if (hasChanges && !isSaving) {
      if (confirm('You have unsaved changes. Are you sure you want to close?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const renderField = (field) => {
    const value = formData[field.key] || '';
    const error = errors[field.key];
    const isReadOnly = field.editable === false;

    if (isReadOnly) {
      return (
        <div key={field.key} className={field.className || ''}>
          <label className="block text-sm font-medium text-gray-500 mb-1">
            {field.label} (Read-only)
          </label>
          <input
            type="text"
            value={data[field.key] || ''}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
            disabled
          />
        </div>
      );
    }

    switch (field.type) {
      case 'textarea':
        return (
          <div key={field.key} className={field.className || ''}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label} {modalConfig.validation[field.key]?.required && '*'}
            </label>
            <textarea
              name={field.key}
              value={value}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-${modalConfig.primaryColor}-500 focus:border-${modalConfig.primaryColor}-500 transition-colors ${
                error ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder={field.placeholder}
              rows={field.rows || 3}
              disabled={isSaving}
            />
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          </div>
        );

      case 'select':
        return (
          <div key={field.key} className={field.className || ''}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label} {modalConfig.validation[field.key]?.required && '*'}
            </label>
            <select
              name={field.key}
              value={value}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-${modalConfig.primaryColor}-500 focus:border-${modalConfig.primaryColor}-500 transition-colors ${
                error ? 'border-red-300' : 'border-gray-300'
              }`}
              disabled={isSaving}
            >
              {field.options?.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          </div>
        );

      case 'checkbox':
        return (
          <div key={field.key} className={`flex items-center ${field.className || ''}`}>
            <input
              type="checkbox"
              name={field.key}
              checked={value}
              onChange={handleInputChange}
              className={`h-4 w-4 text-${modalConfig.primaryColor}-600 focus:ring-${modalConfig.primaryColor}-500 border-gray-300 rounded`}
              disabled={isSaving}
            />
            <label className="ml-2 block text-sm text-gray-900">
              {field.label}
            </label>
          </div>
        );

      default:
        return (
          <div key={field.key} className={field.className || ''}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label} {modalConfig.validation[field.key]?.required && '*'}
            </label>
            <input
              type={field.type || 'text'}
              name={field.key}
              value={value}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-${modalConfig.primaryColor}-500 focus:border-${modalConfig.primaryColor}-500 transition-colors ${
                error ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder={field.placeholder}
              disabled={isSaving}
            />
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          </div>
        );
    }
  };

  const renderSection = (section, index) => (
    <div key={index} className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 flex items-center">
        {section.icon && getFieldIcon(section.icon)}
        {section.title}
      </h3>
      
      <div className={`space-y-4 ${section.layout === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : ''}`}>
        {section.fields?.map(renderField)}
      </div>
    </div>
  );

  if (!isOpen || !data) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/30 backdrop-blur-[2px]"
      onClick={handleClose}
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
            onClick={handleClose}
            disabled={isSaving}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="space-y-6">
            {modalConfig.sections?.map(renderSection)}
          </div>
        </form>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-500">
            {hasChanges && !isSaving && '* You have unsaved changes'}
          </div>
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={isSaving || !hasChanges}
              className={`inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-${modalConfig.primaryColor}-600 border border-transparent rounded-lg hover:bg-${modalConfig.primaryColor}-700 focus:ring-2 focus:ring-${modalConfig.primaryColor}-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default GenericEditModal;
