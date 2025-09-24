import React from 'react';
import { Avatar, Status } from './index';

/**
 * Reusability Demo - Shows how Avatar and Status components can be used
 * across different pages, contexts, and use cases in your application
 */
const ReusabilityDemo = () => {
  return (
    <div className="p-6 space-y-8 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Component Reusability Demo</h1>
        <p className="text-gray-600 mb-8">
          See how Avatar and Status components can be reused across different pages and contexts.
        </p>

        {/* Different Page Examples */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Staff Management Page */}
          <section className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">📋 Staff Management Page</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Avatar 
                    user={{firstName: 'John', lastName: 'Doe', personalEmail: 'john@lydo.com'}}
                    size="sm"
                    color="blue"
                  />
                  <div>
                    <p className="font-medium text-gray-900">John Doe</p>
                    <p className="text-xs text-gray-600">Staff Member</p>
                  </div>
                </div>
                <Status status="active" size="sm" />
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Avatar 
                    user={{firstName: 'Jane', lastName: 'Smith', personalEmail: 'jane@lydo.com'}}
                    size="sm"
                    color="blue"
                  />
                  <div>
                    <p className="font-medium text-gray-900">Jane Smith</p>
                    <p className="text-xs text-gray-600">Staff Member</p>
                  </div>
                </div>
                <Status status="deactivated" size="sm" />
              </div>
            </div>
          </section>

          {/* User Management Page */}
          <section className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">👥 User Management Page</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Avatar 
                    user={{firstName: 'Alice', lastName: 'Johnson', email: 'alice@email.com'}}
                    size="sm"
                    color="green"
                  />
                  <div>
                    <p className="font-medium text-gray-900">Alice Johnson</p>
                    <p className="text-xs text-gray-600">Regular User</p>
                  </div>
                </div>
                <Status status="verified" size="sm" />
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Avatar 
                    user={{firstName: 'Bob', lastName: 'Wilson', email: 'bob@email.com'}}
                    size="sm"
                    color="green"
                  />
                  <div>
                    <p className="font-medium text-gray-900">Bob Wilson</p>
                    <p className="text-xs text-gray-600">Regular User</p>
                  </div>
                </div>
                <Status status="unverified" size="sm" />
              </div>
            </div>
          </section>

          {/* Project Management Page */}
          <section className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">🚀 Project Management Page</h2>
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">Website Redesign</h3>
                  <Status status="pending" size="sm" />
                </div>
                <div className="flex items-center space-x-2">
                  <Avatar name="John Doe" size="xs" color="purple" />
                  <Avatar name="Jane Smith" size="xs" color="purple" />
                  <Avatar name="Alice Johnson" size="xs" color="purple" />
                  <span className="text-xs text-gray-600">+2 more</span>
                </div>
              </div>
              
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">Mobile App Development</h3>
                  <Status status="approved" size="sm" />
                </div>
                <div className="flex items-center space-x-2">
                  <Avatar name="Bob Wilson" size="xs" color="purple" />
                  <Avatar name="Carol Brown" size="xs" color="purple" />
                  <span className="text-xs text-gray-600">2 members</span>
                </div>
              </div>
            </div>
          </section>

          {/* Document Management Page */}
          <section className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">📄 Document Management Page</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Avatar name="Policy.pdf" size="sm" color="red" variant="soft" />
                  <div>
                    <p className="font-medium text-gray-900">Company Policy</p>
                    <p className="text-xs text-gray-600">Updated 2 days ago</p>
                  </div>
                </div>
                <Status status="published" size="sm" />
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Avatar name="Report.pdf" size="sm" color="red" variant="soft" />
                  <div>
                    <p className="font-medium text-gray-900">Monthly Report</p>
                    <p className="text-xs text-gray-600">Draft version</p>
                  </div>
                </div>
                <Status status="draft" size="sm" />
              </div>
            </div>
          </section>

          {/* Notifications Page */}
          <section className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">🔔 Notifications Page</h2>
            <div className="space-y-4">
              <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                <Avatar 
                  user={{firstName: 'System', lastName: ''}}
                  size="sm"
                  color="blue"
                  variant="solid"
                />
                <div className="flex-1">
                  <p className="text-sm text-gray-900">System maintenance scheduled</p>
                  <p className="text-xs text-gray-600">2 hours ago</p>
                </div>
                <Status status="info" size="xs" variant="dot" />
              </div>
              
              <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                <Avatar 
                  user={{firstName: 'Alert', lastName: ''}}
                  size="sm"
                  color="red"
                  variant="solid"
                />
                <div className="flex-1">
                  <p className="text-sm text-gray-900">Security alert detected</p>
                  <p className="text-xs text-gray-600">5 hours ago</p>
                </div>
                <Status status="warning" size="xs" variant="dot" />
              </div>
            </div>
          </section>

          {/* Settings Page */}
          <section className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">⚙️ Settings Page</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Avatar 
                    user={{firstName: 'Current', lastName: 'User'}}
                    size="md"
                    color="blue"
                    showTooltip={true}
                  />
                  <div>
                    <p className="font-medium text-gray-900">Profile Settings</p>
                    <p className="text-xs text-gray-600">Manage your account</p>
                  </div>
                </div>
                <Status status="success" size="sm" variant="minimal" />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Two-Factor Authentication</span>
                  <Status status="active" size="xs" variant="pill" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Email Notifications</span>
                  <Status status="inactive" size="xs" variant="pill" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Data Backup</span>
                  <Status status="pending" size="xs" variant="pill" />
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Different Status Types Across Pages */}
        <section className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mt-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">🏷️ Different Status Types Across Pages</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Staff Management Statuses</h3>
              <div className="space-y-2">
                <Status status="active" size="sm" />
                <Status status="deactivated" size="sm" />
                <Status status="inactive" size="sm" />
              </div>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900 mb-3">User Management Statuses</h3>
              <div className="space-y-2">
                <Status status="verified" size="sm" />
                <Status status="unverified" size="sm" />
                <Status status="pending" size="sm" />
              </div>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Project Statuses</h3>
              <div className="space-y-2">
                <Status status="approved" size="sm" />
                <Status status="rejected" size="sm" />
                <Status status="pending" size="sm" />
              </div>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Document Statuses</h3>
              <div className="space-y-2">
                <Status status="published" size="sm" />
                <Status status="draft" size="sm" />
                <Status status="pending" size="sm" />
              </div>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900 mb-3">System Statuses</h3>
              <div className="space-y-2">
                <Status status="success" size="sm" />
                <Status status="error" size="sm" />
                <Status status="warning" size="sm" />
                <Status status="info" size="sm" />
              </div>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Custom Statuses</h3>
              <div className="space-y-2">
                <Status status="active" customLabel="Online" color="green" size="sm" />
                <Status status="inactive" customLabel="Offline" color="gray" size="sm" />
                <Status status="pending" customLabel="Processing" color="blue" size="sm" />
              </div>
            </div>
          </div>
        </section>

        {/* Configuration Examples */}
        <section className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">🔧 Easy Configuration for Different Pages</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Avatar Configurations</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Staff Management:</h4>
                  <pre className="bg-gray-100 rounded p-3 text-xs overflow-x-auto">
{`<Avatar 
  user={staffMember} 
  size="md" 
  color="blue" 
/>`}
                  </pre>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">User Profile:</h4>
                  <pre className="bg-gray-100 rounded p-3 text-xs overflow-x-auto">
{`<Avatar 
  user={currentUser} 
  size="lg" 
  color="green" 
  showTooltip={true}
/>`}
                  </pre>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Team Members (small):</h4>
                  <pre className="bg-gray-100 rounded p-3 text-xs overflow-x-auto">
{`<Avatar 
  name={member.name} 
  size="xs" 
  color="purple" 
/>`}
                  </pre>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Status Configurations</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Staff Status:</h4>
                  <pre className="bg-gray-100 rounded p-3 text-xs overflow-x-auto">
{`<Status 
  status={isActive ? 'active' : 'deactivated'} 
  variant="badge" 
  size="sm" 
/>`}
                  </pre>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Process Status:</h4>
                  <pre className="bg-gray-100 rounded p-3 text-xs overflow-x-auto">
{`<Status 
  status="pending" 
  variant="pill" 
  size="md" 
  color="blue"
/>`}
                  </pre>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Notification Status:</h4>
                  <pre className="bg-gray-100 rounded p-3 text-xs overflow-x-auto">
{`<Status 
  status="warning" 
  variant="dot" 
  size="xs" 
/>`}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Summary */}
        <section className="bg-blue-50 rounded-lg p-6 border border-blue-200">
          <h2 className="text-xl font-semibold text-blue-900 mb-4">✅ Reusability Benefits</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-blue-900 mb-2">One Component, Many Uses</h3>
              <ul className="space-y-1 text-sm text-blue-800">
                <li>• Staff Management: Staff member avatars & status</li>
                <li>• User Management: User profiles & verification status</li>
                <li>• Projects: Team member avatars & project status</li>
                <li>• Documents: File icons & publication status</li>
                <li>• Notifications: System alerts & priority levels</li>
                <li>• Settings: User profile & feature status</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium text-blue-900 mb-2">Consistent Design</h3>
              <ul className="space-y-1 text-sm text-blue-800">
                <li>• Same color scheme across all pages</li>
                <li>• Unified size and styling options</li>
                <li>• Consistent user experience</li>
                <li>• Easy maintenance and updates</li>
                <li>• Automatic color alignment with tabs</li>
                <li>• No duplicate CSS or logic</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ReusabilityDemo;





























