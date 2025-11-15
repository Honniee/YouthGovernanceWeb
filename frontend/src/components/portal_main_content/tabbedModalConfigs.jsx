import {
  Mail,
  MapPin,
  Calendar,
  LogOut,
  User,
  Shield,
  Briefcase,
  FileText,
  Settings,
  Send,
  Activity,
  Phone,
  AlertCircle,
  AlertTriangle
} from 'lucide-react';

const fullName = (data) =>
  [data.firstName, data.middleName, data.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();

export const staffDetailConfig = {
  header: {
    coverClass: 'from-slate-200 via-slate-300 to-slate-400',
    title: fullName,
    subtitle: (data) => data.lydoId || 'Staff Member',
    avatar: (data) => ({
      user: {
        firstName: data.firstName,
        lastName: data.lastName,
        personalEmail: data.personalEmail,
        profilePicture: data.profilePicture
      }
    }),
    verified: (data) => !!data.emailVerified,
    meta: (data) => [
      { icon: Mail, value: data.email || data.personalEmail },
      { icon: MapPin, value: data.barangayName }
    ].filter((item) => item.value),
    pills: (data) => [data.roleName || data.role || 'Staff'].filter(Boolean)
  },
  tabs: [
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      sections: [
        {
          title: 'Full Name',
          variant: 'main',
          layout: 'grid',
          fields: [
            { key: 'firstName', label: 'First Name', placeholder: 'First Name', editable: true, width: 'half', variant: 'pill', readOnlyStyle: 'input' },
            { key: 'lastName', label: 'Last Name', placeholder: 'Last Name', editable: true, width: 'half', variant: 'pill', readOnlyStyle: 'input' },
            { key: 'middleName', label: 'Middle Name', placeholder: 'Middle Name', editable: true, width: 'half', variant: 'pill', readOnlyStyle: 'input' },
            { key: 'suffix', label: 'Suffix', placeholder: 'Jr., Sr.', editable: true, width: 'half', variant: 'pill', readOnlyStyle: 'input' }
          ]
        },
        {
          title: 'Account',
          variant: 'main',
          layout: 'grid',
          fields: [
            { key: 'personalEmail', label: 'Personal Email', type: 'email', editable: true, width: 'full', placeholder: 'name@example.com', variant: 'pill', readOnlyStyle: 'input' },
            { key: 'email', label: 'Organization Email', type: 'email', editable: false, width: 'full', placeholder: 'name@lydo.gov.ph', variant: 'pill', readOnlyStyle: 'input' }
          ]
        },
        
      ]
    },
    {
      id: 'account',
      label: 'Account',
      icon: Settings,
      sections: [
        {
          title: 'Account Status',
          toggles: [
            {
              key: 'isActive',
              label: 'Active',
              description: 'Allow this staff member to sign in.',
              value: (data) => (data.isActive && !data.deactivated),
              editable: false
            }
          ]
        }
      ]
    }
  ]
};

export const skDetailConfig = {
  header: {
    coverClass: 'from-purple-200 via-purple-300 to-purple-400',
    title: fullName,
    subtitle: (data) => data.skId || 'SK Official',
    avatar: (data) => ({
      user: {
        firstName: data.firstName,
        lastName: data.lastName,
        personalEmail: data.personalEmail,
        profilePicture: data.profilePicture
      }
    }),
    verified: (data) => !!data.emailVerified,
    meta: (data) => [
      { icon: Mail, value: data.personalEmail },
      { icon: MapPin, value: data.barangayName },
      { icon: Calendar, value: data.termName }
    ].filter((item) => item.value),
    pills: (data) => [data.position || 'SK Official'].filter(Boolean)
  },
  tabs: [
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      sections: [
        {
          variant: 'main',
          title: 'Personal Information',
          layout: 'grid',
          fields: [
            { key: 'firstName', label: 'First Name', editable: true, width: 'half', variant: 'pill', readOnlyStyle: 'input' },
            { key: 'lastName', label: 'Last Name', editable: true, width: 'half', variant: 'pill', readOnlyStyle: 'input' },
            { key: 'middleName', label: 'Middle Name', editable: true, width: 'half', variant: 'pill', readOnlyStyle: 'input' },
            { key: 'suffix', label: 'Suffix', editable: true, width: 'half', variant: 'pill', readOnlyStyle: 'input' },
            { key: 'age', label: 'Age', type: 'number', editable: true, width: 'half', variant: 'pill', readOnlyStyle: 'input' },
            { key: 'gender', label: 'Gender', editable: true, width: 'half', variant: 'pill', readOnlyStyle: 'input' },
            { key: 'schoolOrCompany', label: 'School / Company', editable: true, width: 'full', variant: 'pill', readOnlyStyle: 'input' }
          ]
        }
      ]
    },
    {
      id: 'contact',
      label: 'Contact',
      icon: Mail,
      sections: [
        {
          variant: 'main',
          title: 'Contact Details',
          layout: 'grid',
          fields: [
            { key: 'personalEmail', label: 'Personal Email', type: 'email', editable: true, width: 'full', variant: 'pill', readOnlyStyle: 'input' },
            { key: 'email', label: 'Organization Email', type: 'email', editable: false, width: 'full', variant: 'pill', readOnlyStyle: 'input' },
            { key: 'contactNumber', label: 'Contact Number', editable: true, width: 'full', variant: 'pill', readOnlyStyle: 'input' }
          ]
        }
      ]
    },
    {
      id: 'governance',
      label: 'SK Governance',
      icon: Briefcase,
      sections: [
        {
          variant: 'main',
          title: 'Governance Information',
          layout: 'grid',
          fields: [
            { key: 'termName', label: 'Term', width: 'full', variant: 'pill', readOnlyStyle: 'input' },
            { key: 'barangayName', label: 'Barangay', width: 'half', variant: 'pill', readOnlyStyle: 'input' },
            { key: 'position', label: 'Position', width: 'half', variant: 'pill', readOnlyStyle: 'input' }
          ]
        }
      ]
    },
    {
      id: 'settings',
      label: 'Account',
      icon: Settings,
      sections: [
        {
          variant: 'main',
          title: 'Account Status',
          toggles: [
            {
              key: 'isActive',
              label: 'Active',
              description: 'Allow this SK official to access the system.',
              value: (data) => data.isActive && !data.deactivated,
              editable: false
            }
          ]
        },
        {
          title: 'Account Metadata',
          layout: 'grid',
          fields: [
            { key: 'createdAt', label: 'Created At', type: 'datetime', width: 'half', variant: 'pill', readOnlyStyle: 'input' },
            { key: 'updatedAt', label: 'Last Updated', type: 'datetime', width: 'half', variant: 'pill', readOnlyStyle: 'input' }
          ]
        }
      ]
    }
  ]
};

export const youthDetailConfig = {
  header: {
    coverClass: 'from-emerald-200 via-emerald-300 to-emerald-400',
    title: fullName,
    subtitle: (data) => data.id,
    avatar: (data) => ({
      user: {
        firstName: data.firstName,
        lastName: data.lastName,
        personalEmail: data.email
      }
    }),
    verified: (data) => !!data.isInVotersList,
    meta: (data) => [
      { icon: Mail, value: data.email },
      { icon: MapPin, value: data.barangay }
    ].filter((item) => item.value),
    pills: (data) => [data.eligibilityStatus || data.status].filter(Boolean)
  },
  tabs: [
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      sections: [
        {
          variant: 'main',
          title: 'Personal Information',
          layout: 'grid',
          fields: [
            { key: 'firstName', label: 'First Name', editable: true, width: 'half', variant: 'pill', readOnlyStyle: 'input' },
            { key: 'lastName', label: 'Last Name', editable: true, width: 'half', variant: 'pill', readOnlyStyle: 'input' },
            { key: 'middleName', label: 'Middle Name', editable: true, width: 'half', variant: 'pill', readOnlyStyle: 'input' },
            { key: 'suffix', label: 'Suffix', editable: true, width: 'half', variant: 'pill', readOnlyStyle: 'input' },
            { key: 'age', label: 'Age', width: 'half', variant: 'pill', readOnlyStyle: 'input' },
            { key: 'gender', label: 'Gender', width: 'half', variant: 'pill', readOnlyStyle: 'input' },
            { key: 'birthday', label: 'Birthday', type: 'date', width: 'half', variant: 'pill', readOnlyStyle: 'input' },
            { key: 'barangay', label: 'Barangay', width: 'half', variant: 'pill', readOnlyStyle: 'input' }
          ]
        }
      ]
    },
    {
      id: 'contact',
      label: 'Contact',
      icon: Mail,
      sections: [
        {
          variant: 'main',
          title: 'Contact Details',
          layout: 'grid',
          fields: [
            { key: 'email', label: 'Email', type: 'email', width: 'full', variant: 'pill', readOnlyStyle: 'input' },
            { key: 'phone', label: 'Contact Number', width: 'full', variant: 'pill', readOnlyStyle: 'input' },
            { key: 'validatedBy', label: 'Validated By', width: 'half', variant: 'pill', readOnlyStyle: 'input' },
            { key: 'validatedAt', label: 'Validated At', type: 'datetime', width: 'half', variant: 'pill', readOnlyStyle: 'input' }
          ]
        }
      ]
    },
    {
      id: 'surveyTracking',
      label: 'Survey Tracking',
      icon: Briefcase,
      sections: [
        {
          title: 'Validation',
          layout: 'grid',
          fields: [
            { key: 'validatedBy', label: 'Validated By', width: 'half', variant: 'pill', readOnlyStyle: 'input' },
            { key: 'validatedAt', label: 'Validated At', type: 'datetime', width: 'half', variant: 'pill', readOnlyStyle: 'input' },
            { key: 'validationTier', label: 'Validation Tier', width: 'half', variant: 'pill', readOnlyStyle: 'input' },
            {
              key: 'isInVotersList',
              label: 'In Voters List',
              width: 'half',
              renderValue: (value) => (
                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] md:px-4 md:py-2.5 md:text-sm text-gray-600 shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)]">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${value ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {value ? 'Yes' : 'No'}
                  </span>
                </div>
              )
            }
          ]
        },
        {
          variant: 'main',
          title: 'Survey Activity',
          layout: 'grid',
          fields: [
            { key: 'surveysCompleted', label: 'Surveys Completed', width: 'half', variant: 'pill', readOnlyStyle: 'input' },
            { key: 'lastSurveyDate', label: 'Last Survey', type: 'datetime', width: 'half', variant: 'pill', readOnlyStyle: 'input' }
          ]
        }
      ]
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      sections: [
        {
          variant: 'main',
          title: 'Account Metadata',
          layout: 'grid',
          fields: [
            { key: 'createdAt', label: 'Created At', type: 'datetime', width: 'half', variant: 'pill', readOnlyStyle: 'input' },
            {
              key: 'status',
              label: 'Status',
              type: 'status',
              value: (data) => data.status || data.eligibilityStatus
            }
          ]
        }
      ]
    }
  ]
};

export const validationQueueConfig = {
  header: {
    coverClass: 'from-slate-200 via-slate-300 to-slate-400',
    title: (data) => fullName(data) || data.responseId || 'Validation Item',
    subtitle: (data) => data.queueId,
    avatar: (data) => ({
      user: {
        firstName: data.firstName,
        lastName: data.lastName,
        personalEmail: data.email
      }
    }),
    verified: (data) => data.validationStatus === 'approved',
    meta: (data) => [
      { icon: Mail, value: data.email },
      { icon: MapPin, value: data.barangay }
    ].filter((item) => item.value),
    pills: (data) => [
      data.validationStatus ? data.validationStatus.toUpperCase() : null,
      data.voterMatchType ? data.voterMatchType.replace('_', ' ') : null
    ].filter(Boolean)
  },
  tabs: [
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      sections: [
        {
          variant: 'main',
          title: 'Youth Details',
          layout: 'grid',
          fields: [
            { key: 'firstName', label: 'First Name', width: 'half', variant: 'pill', readOnlyStyle: 'input' },
            { key: 'lastName', label: 'Last Name', width: 'half', variant: 'pill', readOnlyStyle: 'input' },
            { key: 'middleName', label: 'Middle Name', width: 'half', variant: 'pill', readOnlyStyle: 'input' },
            { key: 'suffix', label: 'Suffix', width: 'half', variant: 'pill', readOnlyStyle: 'input' },
            { key: 'age', label: 'Age', width: 'half', variant: 'pill', readOnlyStyle: 'input' },
            { key: 'gender', label: 'Gender', width: 'half', variant: 'pill', readOnlyStyle: 'input' }
          ]
        }
      ]
    },
    {
      id: 'validation',
      label: 'Validation',
      icon: Shield,
      sections: [
        {
          variant: 'main',
          title: 'Validation Details',
          layout: 'grid',
          fields: [
            { key: 'validationStatus', label: 'Status', type: 'status', width: 'half', variant: 'pill', readOnlyStyle: 'input' },
            { key: 'validationTier', label: 'Tier', width: 'half', variant: 'pill', readOnlyStyle: 'input' },
            { key: 'validationScore', label: 'Score', width: 'half', variant: 'pill', readOnlyStyle: 'input' },
            { key: 'validatorName', label: 'Validated By', width: 'half', variant: 'pill', readOnlyStyle: 'input' }
          ]
        },
        {
          variant: 'main',
          title: 'Contact Information',
          layout: 'grid',
          fields: [
            { key: 'contactNumber', label: 'Contact Number', width: 'half', variant: 'pill', readOnlyStyle: 'input' },
            { key: 'email', label: 'Email', width: 'half', variant: 'pill', readOnlyStyle: 'input' }
          ]
        },
        {
          variant: 'main',
          title: 'Notes',
          fields: [
            {
              key: 'validationComments',
              label: 'Comments',
              type: 'textarea',
              editable: true,
              placeholder: 'Write validation notes...'
            }
          ]
        }
      ]
    }
  ]
};

export const dataSubjectRequestDetailConfig = {
  header: {
    coverClass: 'from-indigo-200 via-indigo-300 to-indigo-400',
    title: (data) => data.requester_name || 'Data Subject Request',
    subtitle: (data) => `Request ID: ${data.request_id || 'N/A'}`,
    avatar: (data) => ({
      user: {
        firstName: data.requester_name?.split(' ')[0] || '',
        lastName: data.requester_name?.split(' ').slice(1).join(' ') || '',
        personalEmail: data.requester_email,
        profilePicture: null
      }
    }),
    verified: (data) => data.identity_verified || false,
    meta: (data) => [
      { icon: Mail, value: data.requester_email },
      { icon: Calendar, value: data.requested_at ? new Date(data.requested_at).toLocaleDateString() : null }
    ].filter((item) => item.value),
    pills: (data) => [
      data.request_type ? data.request_type.replace('_', ' ').toUpperCase() : null,
      data.request_status ? data.request_status.toUpperCase() : null
    ].filter(Boolean)
  },
  tabs: [
    {
      id: 'overview',
      label: 'Overview',
      icon: FileText,
      sections: [
        {
          variant: 'main',
          title: 'Request Information',
          layout: 'grid',
          fields: [
            { key: 'request_type', label: 'Request Type', width: 'half', variant: 'pill', readOnlyStyle: 'input' },
            { key: 'request_status', label: 'Status', type: 'status', width: 'half', variant: 'pill', readOnlyStyle: 'input' },
            { key: 'requester_name', label: 'Requester Name', width: 'half', variant: 'pill', readOnlyStyle: 'input' },
            { key: 'requester_email', label: 'Requester Email', type: 'email', width: 'half', variant: 'pill', readOnlyStyle: 'input' },
            { key: 'requester_phone', label: 'Requester Phone', width: 'half', variant: 'pill', readOnlyStyle: 'input' },
            { key: 'youth_id', label: 'Youth ID', width: 'half', variant: 'pill', readOnlyStyle: 'input' },
            { key: 'requested_at', label: 'Requested At', type: 'datetime', width: 'half', variant: 'pill', readOnlyStyle: 'input' },
            { key: 'due_date', label: 'Due Date', type: 'date', width: 'half', variant: 'pill', readOnlyStyle: 'input' },
            { key: 'assigned_to_name', label: 'Assigned To', width: 'half', variant: 'pill', readOnlyStyle: 'input' }
          ]
        },
        {
          variant: 'main',
          title: 'Request Description',
          fields: [
            {
              key: 'request_description',
              label: 'Description',
              type: 'textarea',
              editable: false,
              placeholder: 'No description provided'
            }
          ]
        }
      ]
    },
    {
      id: 'processing',
      label: 'Processing',
      icon: Settings,
      sections: [
        {
          variant: 'main',
          title: 'Assignment & Status',
          layout: 'grid',
          fields: [
            { key: 'assigned_to_name', label: 'Assigned To', width: 'half', variant: 'pill', readOnlyStyle: 'input' },
            { key: 'request_status', label: 'Status', type: 'status', width: 'half', variant: 'pill', readOnlyStyle: 'input' },
            { key: 'identity_verified', label: 'Identity Verified', width: 'half', variant: 'pill', readOnlyStyle: 'input' },
            { key: 'verification_method', label: 'Verification Method', width: 'half', variant: 'pill', readOnlyStyle: 'input' },
            { key: 'verification_date', label: 'Verification Date', type: 'datetime', width: 'half', variant: 'pill', readOnlyStyle: 'input' }
          ]
        },
        {
          variant: 'main',
          title: 'Internal Notes',
          fields: [
            {
              key: 'notes',
              label: 'Notes',
              type: 'textarea',
              editable: true,
              placeholder: 'Add internal notes about this request...'
            }
          ]
        }
      ]
    },
    {
      id: 'history',
      label: 'History',
      icon: Activity,
      sections: [
        {
          variant: 'main',
          title: 'Request Timeline',
          layout: 'grid',
          fields: [
            { key: 'requested_at', label: 'Requested At', type: 'datetime', width: 'half', variant: 'pill', readOnlyStyle: 'input' },
            { key: 'updated_at', label: 'Last Updated', type: 'datetime', width: 'half', variant: 'pill', readOnlyStyle: 'input' },
            { key: 'completed_at', label: 'Completed At', type: 'datetime', width: 'half', variant: 'pill', readOnlyStyle: 'input' },
            { key: 'rejected_at', label: 'Rejected At', type: 'datetime', width: 'half', variant: 'pill', readOnlyStyle: 'input' }
          ]
        }
      ]
    },
    {
      id: 'response',
      label: 'Response',
      icon: Send,
      sections: [
        {
          variant: 'main',
          title: 'Response Information',
          layout: 'grid',
          fields: [
            { key: 'response_text', label: 'Response Text', type: 'textarea', width: 'full', variant: 'pill', readOnlyStyle: 'input' },
            { key: 'response_file_path', label: 'Response File', width: 'half', variant: 'pill', readOnlyStyle: 'input' },
            { key: 'rejection_reason', label: 'Rejection Reason', type: 'textarea', width: 'full', variant: 'pill', readOnlyStyle: 'input' }
          ]
        }
      ]
    }
  ]
};

export const surveyTrackingConfig = {
  header: {
    coverClass: 'from-cyan-200 via-cyan-300 to-cyan-400',
    title: (data) => data.title || 'Survey Response',
    subtitle: (data) => data.id,
    avatar: () => ({ type: 'emoji', value: '📝' }),
    meta: (data) => [
      { icon: Calendar, value: data.submittedAt },
      { icon: MapPin, value: data.barangay }
    ].filter((item) => item.value),
    pills: (data) => [data.status || 'Pending'].filter(Boolean)
  },
  tabs: [
    {
      id: 'response',
      label: 'Response',
      icon: FileText,
      sections: [
        {
          title: 'Details',
          layout: 'grid',
          fields: [
            { key: 'batchName', label: 'Batch', width: 'half' },
            { key: 'youthId', label: 'Youth ID', width: 'half' },
            { key: 'status', label: 'Status', type: 'status', width: 'half' }
          ]
        },
        {
          title: 'Answers',
          render: ({ data }) => (
            <div className="space-y-3 text-sm text-gray-900">
              {(data.answers || []).map((answer, index) => (
                <div key={index} className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
                  <p className="font-medium text-gray-700">{answer.question}</p>
                  <p>{answer.value}</p>
                </div>
              ))}
            </div>
          )
        }
      ]
    },
    {
      id: 'validation',
      label: 'Validation',
      icon: Shield,
      sections: [
        {
          title: 'Validation Details',
          layout: 'grid',
          fields: [
            { key: 'validationStatus', label: 'Status', type: 'status', width: 'half' },
            { key: 'validationTier', label: 'Tier', width: 'half' },
            { key: 'validationScore', label: 'Score', width: 'half' },
            { key: 'validatedBy', label: 'Validated By', width: 'half' }
          ]
        }
      ]
    }
  ]
};

export const councilDetailConfig = {
  header: {
    coverClass: 'from-indigo-200 via-indigo-300 to-indigo-400',
    title: fullName,
    subtitle: (data) => data.councilId,
    avatar: (data) => ({
      user: {
        firstName: data.firstName,
        lastName: data.lastName,
        personalEmail: data.email,
        profilePicture: data.profilePicture
      }
    }),
    meta: (data) => [
      { icon: Mail, value: data.email },
      { icon: MapPin, value: data.barangayName }
    ].filter((item) => item.value),
    pills: (data) => [data.position || 'Council Member'].filter(Boolean)
  },
  tabs: [
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      sections: [
        {
          title: 'Member Details',
          layout: 'grid',
          fields: [
            { key: 'firstName', label: 'First Name', width: 'half' },
            { key: 'lastName', label: 'Last Name', width: 'half' },
            { key: 'position', label: 'Position', width: 'half' },
            { key: 'committee', label: 'Committee', width: 'half' }
          ]
        }
      ]
    },
    {
      id: 'contact',
      label: 'Contact',
      icon: Mail,
      sections: [
        {
          title: 'Contact Information',
          layout: 'grid',
          fields: [
            { key: 'email', label: 'Email', type: 'email', width: 'half' },
            { key: 'phone', label: 'Phone Number', width: 'half' }
          ]
        }
      ]
    }
  ]
};

export default {
  staff: staffDetailConfig,
  sk: skDetailConfig,
  youth: youthDetailConfig,
  validationQueue: validationQueueConfig,
  surveyTracking: surveyTrackingConfig,
  council: councilDetailConfig
};

