import React from 'react';
import Status from './Status';

/**
 * Status Component Examples
 * Demonstrates various configurations and use cases aligned with tab colors
 */
const StatusExamples = () => {
  return (
    <div className="p-6 space-y-8 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Status Component Examples</h1>
        <p className="text-gray-600 mb-8">Reusable status component aligned with tab color scheme for consistent UI.</p>

        {/* Staff Management Statuses */}
        <section className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Staff Management Statuses (Aligned with Tabs)</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center space-y-2">
              <Status status="active" />
              <p className="text-sm text-gray-600">Active (Green - matches "Active" tab)</p>
            </div>
            <div className="text-center space-y-2">
              <Status status="deactivated" />
              <p className="text-sm text-gray-600">Deactivated (Yellow - matches "Deactivated" tab)</p>
            </div>
            <div className="text-center space-y-2">
              <Status status="inactive" />
              <p className="text-sm text-gray-600">Inactive (Gray)</p>
            </div>
          </div>
        </section>

        {/* Variants */}
        <section className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Different Variants</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Badge (default):</h3>
              <div className="flex flex-wrap gap-3">
                <Status status="active" variant="badge" />
                <Status status="deactivated" variant="badge" />
                <Status status="pending" variant="badge" />
                <Status status="error" variant="badge" />
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Pill:</h3>
              <div className="flex flex-wrap gap-3">
                <Status status="active" variant="pill" />
                <Status status="deactivated" variant="pill" />
                <Status status="pending" variant="pill" />
                <Status status="error" variant="pill" />
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Outline:</h3>
              <div className="flex flex-wrap gap-3">
                <Status status="active" variant="outline" />
                <Status status="deactivated" variant="outline" />
                <Status status="pending" variant="outline" />
                <Status status="error" variant="outline" />
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Dot:</h3>
              <div className="flex flex-wrap gap-3">
                <Status status="active" variant="dot" />
                <Status status="deactivated" variant="dot" />
                <Status status="pending" variant="dot" />
                <Status status="error" variant="dot" />
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Minimal:</h3>
              <div className="flex flex-wrap gap-3">
                <Status status="active" variant="minimal" />
                <Status status="deactivated" variant="minimal" />
                <Status status="pending" variant="minimal" />
                <Status status="error" variant="minimal" />
              </div>
            </div>
          </div>
        </section>

        {/* Sizes */}
        <section className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Different Sizes</h2>
          <div className="space-y-3">
            <div className="flex items-center space-x-4">
              <Status status="active" size="xs" />
              <span className="text-sm text-gray-600">XS</span>
            </div>
            <div className="flex items-center space-x-4">
              <Status status="active" size="sm" />
              <span className="text-sm text-gray-600">SM</span>
            </div>
            <div className="flex items-center space-x-4">
              <Status status="active" size="md" />
              <span className="text-sm text-gray-600">MD (default)</span>
            </div>
            <div className="flex items-center space-x-4">
              <Status status="active" size="lg" />
              <span className="text-sm text-gray-600">LG</span>
            </div>
          </div>
        </section>

        {/* All Status Types */}
        <section className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">All Available Status Types</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <Status status="active" />
            <Status status="deactivated" />
            <Status status="inactive" />
            <Status status="pending" />
            <Status status="approved" />
            <Status status="rejected" />
            <Status status="warning" />
            <Status status="error" />
            <Status status="success" />
            <Status status="info" />
            <Status status="draft" />
            <Status status="published" />
            <Status status="verified" />
            <Status status="unverified" />
          </div>
        </section>

        {/* Custom Colors */}
        <section className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Custom Colors (Tab-Aligned)</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="text-center space-y-2">
              <Status status="active" color="blue" />
              <p className="text-xs text-gray-600">Blue</p>
            </div>
            <div className="text-center space-y-2">
              <Status status="active" color="green" />
              <p className="text-xs text-gray-600">Green</p>
            </div>
            <div className="text-center space-y-2">
              <Status status="active" color="yellow" />
              <p className="text-xs text-gray-600">Yellow</p>
            </div>
            <div className="text-center space-y-2">
              <Status status="active" color="red" />
              <p className="text-xs text-gray-600">Red</p>
            </div>
            <div className="text-center space-y-2">
              <Status status="active" color="purple" />
              <p className="text-xs text-gray-600">Purple</p>
            </div>
            <div className="text-center space-y-2">
              <Status status="active" color="gray" />
              <p className="text-xs text-gray-600">Gray</p>
            </div>
          </div>
        </section>

        {/* Interactive Features */}
        <section className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Interactive Features</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Clickable:</h3>
              <Status 
                status="active" 
                interactive={true}
                onClick={() => alert('Status clicked!')}
              />
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Without Icon:</h3>
              <Status status="active" showIcon={false} />
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Custom Label:</h3>
              <Status status="active" customLabel="Custom Status" />
            </div>
          </div>
        </section>

        {/* Staff Management Usage Examples */}
        <section className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Staff Management Usage Examples</h2>
          
          {/* Grid View Example */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Grid View Style</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-gray-900">John Doe</h4>
                  <p className="text-sm text-gray-600">john.doe@lydo.com</p>
                </div>
                <div className="flex items-center space-x-3">
                  <Status status="active" variant="badge" size="sm" />
                  <span className="text-xs text-gray-500">Created: 2024-01-15</span>
                </div>
              </div>
            </div>
          </div>

          {/* List View Example */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">List View Style</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                    JS
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Jane Smith</h4>
                    <p className="text-sm text-gray-600">jane.smith@lydo.com</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Status status="deactivated" variant="badge" size="sm" />
                  <span className="text-xs text-gray-500">2024-01-10</span>
                </div>
              </div>
            </div>
          </div>

          {/* Dynamic Status Example */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Dynamic Status Logic</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Active Staff Member:</span>
                <Status 
                  status={true && !false ? 'active' : 'deactivated'} 
                  variant="badge" 
                  size="sm" 
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Deactivated Staff Member:</span>
                <Status 
                  status={false || true ? 'deactivated' : 'active'} 
                  variant="badge" 
                  size="sm" 
                />
              </div>
            </div>
          </div>
        </section>

        {/* Code Examples */}
        <section className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Code Examples</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Basic Usage:</h3>
              <pre className="bg-gray-100 rounded p-3 text-sm text-gray-800 overflow-x-auto">
{`<Status status="active" />`}
              </pre>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">StaffManagement Grid/List View:</h3>
              <pre className="bg-gray-100 rounded p-3 text-sm text-gray-800 overflow-x-auto">
{`<Status 
  status={item.isActive && !item.deactivated ? 'active' : 'deactivated'}
  variant="badge"
  size="sm"
/>`}
              </pre>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">With Custom Styling:</h3>
              <pre className="bg-gray-100 rounded p-3 text-sm text-gray-800 overflow-x-auto">
{`<Status 
  status="active"
  variant="pill"
  size="md"
  color="green"
  showIcon={true}
/>`}
              </pre>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Replace Current StaffManagement Status:</h3>
              <pre className="bg-gray-100 rounded p-3 text-sm text-gray-800 overflow-x-auto">
{`// Old way:
<span className={\`px-2 py-1 rounded-full text-xs font-medium border \${getStatusColor(status)}\`}>
  {status}
</span>

// New way:
<Status 
  status={item.isActive && !item.deactivated ? 'active' : 'deactivated'}
  variant="badge"
  size="sm"
/>`}
              </pre>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default StatusExamples;





























