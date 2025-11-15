/**
 * Modal Configuration Examples
 * 
 * This file contains example configurations for using GenericViewModal and GenericEditModal
 * with different types of data across your application.
 */

// ==========================================
// STAFF MODAL CONFIGURATION
// ==========================================
export const staffModalConfig = {
  view: {
    title: 'Staff Details',
    subtitle: (data) => data.lydoId,
    avatar: (data) => ({
      user: {
        firstName: data.firstName,
        lastName: data.lastName,
        personalEmail: data.personalEmail,
        profilePicture: data.profilePicture
      },
      size: 'lg',
      color: 'blue'
    }),
    maxWidth: 'max-w-2xl',
    primaryColor: 'blue',
    sections: [
      {
        title: 'Personal Information',
        icon: 'user',
        layout: 'grid',
        fields: [
          { key: 'firstName', label: 'First Name' },
          { key: 'lastName', label: 'Last Name' },
          { key: 'middleName', label: 'Middle Name' },
          { key: 'suffix', label: 'Suffix' },
          { key: 'lydoId', label: 'LYDO ID', format: 'id' },
          { key: 'roleId', label: 'Role ID' }
        ]
      },
      {
        title: 'Contact Information',
        icon: 'email',
        layout: 'grid',
        fields: [
          { key: 'personalEmail', label: 'Personal Email', format: 'email' },
          { key: 'email', label: 'Organization Email', format: 'email' },
          { key: 'phoneNumber', label: 'Phone Number', format: 'phone' }
        ]
      },
      {
        title: 'Status Information',
        icon: 'user',
        fields: [
          { 
            key: 'status', 
            label: 'Current Status', 
            format: 'status',
            value: (data) => data.isActive && !data.deactivated ? 'active' : 'deactivated'
          },
          { key: 'emailVerified', label: 'Email Verified', format: 'boolean' },
          { key: 'deactivatedAt', label: 'Deactivated At', format: 'datetime' }
        ]
      },
      {
        title: 'Account Information',
        icon: 'calendar',
        layout: 'grid',
        fields: [
          { key: 'createdAt', label: 'Created At', format: 'datetime' },
          { key: 'updatedAt', label: 'Last Updated', format: 'datetime' },
          { key: 'createdBy', label: 'Created By' }
        ]
      }
    ]
  },
  edit: {
    title: 'Edit Staff Member',
    subtitle: (data) => data.lydoId,
    avatar: (data) => ({
      user: {
        firstName: data.firstName,
        lastName: data.lastName,
        personalEmail: data.personalEmail,
        profilePicture: data.profilePicture
      },
      size: 'lg',
      color: 'blue'
    }),
    maxWidth: 'max-w-2xl',
    primaryColor: 'blue',
    validation: {
      firstName: { required: true, label: 'First Name' },
      lastName: { required: true, label: 'Last Name' },
      personalEmail: { required: true, type: 'email', label: 'Personal Email' }
    },
    sections: [
      {
        title: 'Personal Information',
        icon: 'user',
        layout: 'grid',
        fields: [
          { key: 'firstName', label: 'First Name', type: 'text', placeholder: 'John' },
          { key: 'lastName', label: 'Last Name', type: 'text', placeholder: 'Doe' },
          { key: 'middleName', label: 'Middle Name', type: 'text', placeholder: 'Michael' },
          { key: 'suffix', label: 'Suffix', type: 'text', placeholder: 'Jr., Sr., III' },
          { key: 'lydoId', label: 'LYDO ID', editable: false },
          { key: 'email', label: 'Organization Email', editable: false }
        ]
      },
      {
        title: 'Contact Information',
        icon: 'email',
        fields: [
          { 
            key: 'personalEmail', 
            label: 'Personal Email', 
            type: 'email', 
            placeholder: 'john.doe@example.com' 
          }
        ]
      }
    ]
  }
};

// ==========================================
// SURVEY MODAL CONFIGURATION
// ==========================================
export const surveyModalConfig = {
  view: {
    title: 'Survey Details',
    subtitle: (data) => `Survey ID: ${data.id}`,
    maxWidth: 'max-w-3xl',
    primaryColor: 'green',
    sections: [
      {
        title: 'Survey Information',
        icon: 'text',
        layout: 'grid',
        fields: [
          { key: 'title', label: 'Survey Title' },
          { key: 'description', label: 'Description' },
          { key: 'category', label: 'Category' },
          { key: 'status', label: 'Status', format: 'status' }
        ]
      },
      {
        title: 'Survey Settings',
        icon: 'calendar',
        layout: 'grid',
        fields: [
          { key: 'startDate', label: 'Start Date', format: 'date' },
          { key: 'endDate', label: 'End Date', format: 'date' },
          { key: 'maxResponses', label: 'Max Responses', format: 'number' },
          { key: 'isPublic', label: 'Public Survey', format: 'boolean' }
        ]
      },
      {
        title: 'Statistics',
        icon: 'number',
        layout: 'grid',
        fields: [
          { key: 'totalResponses', label: 'Total Responses', format: 'number' },
          { key: 'completionRate', label: 'Completion Rate', value: (data) => `${data.completionRate}%` },
          { key: 'averageTime', label: 'Avg. Completion Time', value: (data) => `${data.averageTime} minutes` }
        ]
      },
      {
        title: 'Audit Information',
        icon: 'calendar',
        layout: 'grid',
        fields: [
          { key: 'createdAt', label: 'Created At', format: 'datetime' },
          { key: 'updatedAt', label: 'Last Updated', format: 'datetime' },
          { key: 'createdBy', label: 'Created By' }
        ]
      }
    ]
  },
  edit: {
    title: 'Edit Survey',
    subtitle: (data) => `Survey ID: ${data.id}`,
    maxWidth: 'max-w-3xl',
    primaryColor: 'green',
    validation: {
      title: { required: true, label: 'Survey Title', minLength: 3 },
      description: { required: true, label: 'Description', minLength: 10 },
      startDate: { required: true, label: 'Start Date' },
      endDate: { required: true, label: 'End Date' }
    },
    sections: [
      {
        title: 'Survey Information',
        icon: 'text',
        fields: [
          { 
            key: 'title', 
            label: 'Survey Title', 
            type: 'text', 
            placeholder: 'Enter survey title' 
          },
          { 
            key: 'description', 
            label: 'Description', 
            type: 'textarea', 
            placeholder: 'Describe the purpose of this survey',
            rows: 4
          },
          { 
            key: 'category', 
            label: 'Category', 
            type: 'select',
            options: [
              { value: '', label: 'Select Category' },
              { value: 'feedback', label: 'Feedback' },
              { value: 'research', label: 'Research' },
              { value: 'evaluation', label: 'Evaluation' },
              { value: 'other', label: 'Other' }
            ]
          }
        ]
      },
      {
        title: 'Survey Settings',
        icon: 'calendar',
        layout: 'grid',
        fields: [
          { key: 'startDate', label: 'Start Date', type: 'date' },
          { key: 'endDate', label: 'End Date', type: 'date' },
          { 
            key: 'maxResponses', 
            label: 'Max Responses', 
            type: 'number', 
            placeholder: '100' 
          },
          { key: 'isPublic', label: 'Make this survey public', type: 'checkbox' }
        ]
      },
      {
        title: 'Read-Only Information',
        icon: 'number',
        layout: 'grid',
        fields: [
          { key: 'id', label: 'Survey ID', editable: false },
          { key: 'totalResponses', label: 'Total Responses', editable: false },
          { key: 'createdAt', label: 'Created At', editable: false }
        ]
      }
    ]
  }
};

// ==========================================
// EVENT MODAL CONFIGURATION
// ==========================================
export const eventModalConfig = {
  view: {
    title: 'Event Details',
    subtitle: (data) => data.eventCode,
    maxWidth: 'max-w-2xl',
    primaryColor: 'purple',
    sections: [
      {
        title: 'Event Information',
        icon: 'calendar',
        fields: [
          { key: 'title', label: 'Event Title' },
          { key: 'description', label: 'Description' },
          { key: 'eventCode', label: 'Event Code' },
          { key: 'status', label: 'Status', format: 'status' }
        ]
      },
      {
        title: 'Date & Time',
        icon: 'calendar',
        layout: 'grid',
        fields: [
          { key: 'startDate', label: 'Start Date', format: 'datetime' },
          { key: 'endDate', label: 'End Date', format: 'datetime' },
          { key: 'timezone', label: 'Timezone' }
        ]
      },
      {
        title: 'Location & Capacity',
        icon: 'location',
        layout: 'grid',
        fields: [
          { key: 'venue', label: 'Venue' },
          { key: 'address', label: 'Address' },
          { key: 'capacity', label: 'Capacity', format: 'number' },
          { key: 'registeredCount', label: 'Registered', format: 'number' }
        ]
      }
    ]
  },
  edit: {
    title: 'Edit Event',
    subtitle: (data) => data.eventCode,
    maxWidth: 'max-w-2xl',
    primaryColor: 'purple',
    validation: {
      title: { required: true, label: 'Event Title' },
      startDate: { required: true, label: 'Start Date' },
      endDate: { required: true, label: 'End Date' },
      venue: { required: true, label: 'Venue' }
    },
    sections: [
      {
        title: 'Event Information',
        icon: 'calendar',
        fields: [
          { key: 'title', label: 'Event Title', type: 'text' },
          { key: 'description', label: 'Description', type: 'textarea', rows: 3 },
          { key: 'eventCode', label: 'Event Code', editable: false }
        ]
      },
      {
        title: 'Date & Time',
        icon: 'calendar',
        layout: 'grid',
        fields: [
          { key: 'startDate', label: 'Start Date', type: 'datetime-local' },
          { key: 'endDate', label: 'End Date', type: 'datetime-local' },
          { 
            key: 'timezone', 
            label: 'Timezone', 
            type: 'select',
            options: [
              { value: 'PST', label: 'Pacific Time (PST)' },
              { value: 'EST', label: 'Eastern Time (EST)' },
              { value: 'CST', label: 'Central Time (CST)' },
              { value: 'MST', label: 'Mountain Time (MST)' }
            ]
          }
        ]
      },
      {
        title: 'Location & Capacity',
        icon: 'location',
        fields: [
          { key: 'venue', label: 'Venue', type: 'text' },
          { key: 'address', label: 'Address', type: 'textarea', rows: 2 },
          { key: 'capacity', label: 'Capacity', type: 'number' }
        ]
      }
    ]
  }
};

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Get modal configuration based on entity type and modal type
 * @param {string} entityType - 'staff', 'survey', 'event', etc.
 * @param {string} modalType - 'view' or 'edit'
 * @returns {Object} Modal configuration object
 */
export const getModalConfig = (entityType, modalType) => {
  const configs = {
    staff: staffModalConfig,
    survey: surveyModalConfig,
    event: eventModalConfig
  };

  const entityConfig = configs[entityType];
  if (!entityConfig) {
    // Import logger dynamically to avoid circular dependencies
    import('../../utils/logger.js').then(({ default: logger }) => {
      logger.warn('No modal configuration found for entity type', { entityType });
    }).catch(() => {});
    return {};
  }

  const config = entityConfig[modalType];
  if (!config) {
    // Import logger dynamically to avoid circular dependencies
    import('../../utils/logger.js').then(({ default: logger }) => {
      logger.warn('No modal configuration found', { modalType, entityType });
    }).catch(() => {});
    return {};
  }

  return config;
};

/**
 * Process dynamic configuration values (functions) with actual data
 * @param {Object} config - Modal configuration
 * @param {Object} data - Entity data
 * @returns {Object} Processed configuration
 */
export const processModalConfig = (config, data) => {
  const processedConfig = { ...config };

  // Process dynamic subtitle
  if (typeof config.subtitle === 'function') {
    processedConfig.subtitle = config.subtitle(data);
  }

  // Process dynamic avatar
  if (typeof config.avatar === 'function') {
    processedConfig.avatar = config.avatar(data);
  }

  // Process dynamic field values
  if (config.sections) {
    processedConfig.sections = config.sections.map(section => ({
      ...section,
      fields: section.fields?.map(field => ({
        ...field,
        value: typeof field.value === 'function' ? field.value(data) : field.value
      }))
    }));
  }

  return processedConfig;
};




























