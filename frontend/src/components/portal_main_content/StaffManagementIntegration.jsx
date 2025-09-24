import React from 'react';
import { Avatar, Status } from './index';

/**
 * StaffManagement Integration Example
 * Shows how to integrate Avatar and Status components into StaffManagement
 */
const StaffManagementIntegration = () => {
  // Sample staff data (matching StaffManagement structure)
  const sampleStaff = [
    {
      lydoId: 1,
      firstName: 'John',
      lastName: 'Doe',
      personalEmail: 'john.doe@lydo.com',
      profilePicture: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
      isActive: true,
      deactivated: false,
      createdAt: '2024-01-15T10:30:00Z'
    },
    {
      lydoId: 2,
      firstName: 'Jane',
      lastName: 'Smith',
      personalEmail: 'jane.smith@lydo.com',
      profilePicture: null,
      isActive: false,
      deactivated: true,
      createdAt: '2024-01-10T14:22:00Z'
    },
    {
      lydoId: 3,
      firstName: 'Alice',
      lastName: 'Johnson',
      personalEmail: 'alice.johnson@lydo.com',
      profilePicture: null,
      isActive: true,
      deactivated: false,
      createdAt: '2024-01-12T09:15:00Z'
    }
  ];

  return (
    <div className="p-6 space-y-8 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">StaffManagement Integration</h1>
        <p className="text-gray-600 mb-8">Examples showing how to integrate Avatar and Status components into StaffManagement views.</p>

        {/* Grid View Integration */}
        <section className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Grid View Integration</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {sampleStaff.map((item) => (
              <div key={item.lydoId} className="group bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-lg transition-all duration-200">
                <div className="flex items-start justify-between mb-3">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
                  />
                  <button className="text-gray-400 hover:text-gray-600">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                    </svg>
                  </button>
                </div>
                
                <div className="flex items-center mb-3">
                  {/* NEW: Using Avatar component */}
                  <Avatar 
                    user={{
                      firstName: item.firstName,
                      lastName: item.lastName,
                      personalEmail: item.personalEmail,
                      profilePicture: item.profilePicture
                    }}
                    size="md"
                    color="blue"
                    showTooltip={true}
                  />
                  <div className="ml-3 flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors duration-200">
                      {item.firstName} {item.lastName}
                    </h3>
                    <p className="text-sm text-gray-600">{item.personalEmail}</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  {/* NEW: Using Status component */}
                  <Status 
                    status={item.isActive && !item.deactivated ? 'active' : 'deactivated'}
                    variant="badge"
                    size="sm"
                  />
                  <span className="text-xs text-gray-500">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* List View Integration */}
        <section className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">List View Integration</h2>
          <div className="divide-y divide-gray-100">
            {sampleStaff.map((item) => (
              <div key={item.lydoId} className="px-3 sm:px-5 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between hover:bg-gray-50 transition-colors duration-200 space-y-3 sm:space-y-0 relative">
                {/* Left side - Checkbox, Avatar, and Info */}
                <div className="flex items-center space-x-3 sm:space-x-4">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
                  />
                  {/* NEW: Using Avatar component */}
                  <Avatar 
                    user={{
                      firstName: item.firstName,
                      lastName: item.lastName,
                      personalEmail: item.personalEmail,
                      profilePicture: item.profilePicture
                    }}
                    size="sm"
                    color="blue"
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-gray-900 truncate">{item.firstName} {item.lastName}</h3>
                    <p className="text-sm text-gray-600 truncate">{item.personalEmail}</p>
                  </div>
                </div>
                
                {/* Right side - Status, Date, and Actions */}
                <div className="flex items-center space-x-3 sm:space-x-4">
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-3">
                    {/* NEW: Using Status component */}
                    <Status 
                      status={item.isActive && !item.deactivated ? 'active' : 'deactivated'}
                      variant="badge"
                      size="sm"
                    />
                    <span className="text-xs sm:text-sm text-gray-500 text-center">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <button className="text-gray-400 hover:text-gray-600">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Code Replacement Examples */}
        <section className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Code Replacement Examples</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Avatar Replacement</h3>
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Old Avatar Code (Lines 469-491):</h4>
                  <pre className="bg-red-50 border border-red-200 rounded p-3 text-sm text-gray-800 overflow-x-auto">
{`const Avatar = ({ item, size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };
  
  if (item.profilePicture) {
    return (
      <img 
        src={item.profilePicture} 
        alt={\`\${item.firstName} \${item.lastName}\`}
        className={\`\${sizeClasses[size]} rounded-full object-cover\`}
      />
    );
  }
  
  return (
    <div className={\`\${sizeClasses[size]} rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm\`}>
      {item.firstName ? item.firstName.charAt(0).toUpperCase() : 'S'}
    </div>
  );
};`}
                  </pre>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">New Avatar Usage:</h4>
                  <pre className="bg-green-50 border border-green-200 rounded p-3 text-sm text-gray-800 overflow-x-auto">
{`import { Avatar } from '../../components/portal_main_content';

// Usage in render:
<Avatar 
  user={{
    firstName: item.firstName,
    lastName: item.lastName,
    personalEmail: item.personalEmail,
    profilePicture: item.profilePicture
  }}
  size="md"
  color="blue"
  showTooltip={true}
/>`}
                  </pre>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Status Replacement</h3>
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Old Status Code (Lines 453-464 + 868-870):</h4>
                  <pre className="bg-red-50 border border-red-200 rounded p-3 text-sm text-gray-800 overflow-x-auto">
{`const getStatusColor = (status) => {
  switch (status) {
    case 'active':
    case 'Active': 
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'deactivated':
    case 'Deactivated': 
      return 'bg-amber-50 text-amber-700 border-amber-200';
    default: 
      return 'bg-gray-50 text-gray-700 border-gray-200';
  }
};

// Usage:
<span className={\`px-2 py-1 rounded-full text-xs font-medium border \${getStatusColor(item.isActive && !item.deactivated ? 'active' : 'deactivated')}\`}>
  {item.isActive && !item.deactivated ? 'Active' : 'Deactivated'}
</span>`}
                  </pre>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">New Status Usage:</h4>
                  <pre className="bg-green-50 border border-green-200 rounded p-3 text-sm text-gray-800 overflow-x-auto">
{`import { Status } from '../../components/portal_main_content';

// Usage in render:
<Status 
  status={item.isActive && !item.deactivated ? 'active' : 'deactivated'}
  variant="badge"
  size="sm"
/>`}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Benefits of Using New Components</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Avatar Component Benefits</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span><strong>Consistent styling</strong> across all views</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span><strong>Color alignment</strong> with tab system</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span><strong>Built-in tooltip</strong> support</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span><strong>Flexible user data</strong> input</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span><strong>Fallback handling</strong> for failed images</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span><strong>Multiple size options</strong></span>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Status Component Benefits</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span><strong>Tab color alignment</strong> (Green/Yellow)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span><strong>Built-in icons</strong> for status types</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span><strong>Multiple variants</strong> (badge, pill, dot, etc.)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span><strong>Automatic color mapping</strong></span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span><strong>Extensible</strong> for new status types</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span><strong>No manual color logic</strong> needed</span>
                </li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default StaffManagementIntegration;





























