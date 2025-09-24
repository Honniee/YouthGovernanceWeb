import React from 'react';
import Avatar from './Avatar';

/**
 * Avatar Component Examples
 * Demonstrates various configurations and use cases
 */
const AvatarExamples = () => {
  // Sample user data
  const sampleUsers = [
    {
      id: 1,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      profilePicture: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
    },
    {
      id: 2,
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com'
    },
    {
      id: 3,
      firstName: 'Alice',
      lastName: 'Johnson',
      email: 'alice.johnson@example.com'
    }
  ];

  return (
    <div className="p-6 space-y-8 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Avatar Component Examples</h1>
        <p className="text-gray-600 mb-8">Reusable avatar component with consistent styling aligned with tab colors.</p>

        {/* Basic Usage */}
        <section className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Usage</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <Avatar user={sampleUsers[0]} />
              <p className="text-sm text-gray-600 mt-2">With Image</p>
            </div>
            <div className="text-center">
              <Avatar user={sampleUsers[1]} />
              <p className="text-sm text-gray-600 mt-2">Initials Only</p>
            </div>
            <div className="text-center">
              <Avatar name="Bob Wilson" />
              <p className="text-sm text-gray-600 mt-2">Name Prop</p>
            </div>
            <div className="text-center">
              <Avatar />
              <p className="text-sm text-gray-600 mt-2">Default</p>
            </div>
          </div>
        </section>

        {/* Sizes */}
        <section className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Different Sizes</h2>
          <div className="flex items-end space-x-6">
            <div className="text-center">
              <Avatar user={sampleUsers[1]} size="xs" />
              <p className="text-sm text-gray-600 mt-2">XS</p>
            </div>
            <div className="text-center">
              <Avatar user={sampleUsers[1]} size="sm" />
              <p className="text-sm text-gray-600 mt-2">SM</p>
            </div>
            <div className="text-center">
              <Avatar user={sampleUsers[1]} size="md" />
              <p className="text-sm text-gray-600 mt-2">MD</p>
            </div>
            <div className="text-center">
              <Avatar user={sampleUsers[1]} size="lg" />
              <p className="text-sm text-gray-600 mt-2">LG</p>
            </div>
            <div className="text-center">
              <Avatar user={sampleUsers[1]} size="xl" />
              <p className="text-sm text-gray-600 mt-2">XL</p>
            </div>
            <div className="text-center">
              <Avatar user={sampleUsers[1]} size="2xl" />
              <p className="text-sm text-gray-600 mt-2">2XL</p>
            </div>
          </div>
        </section>

        {/* Colors (aligned with tabs) */}
        <section className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Colors (Aligned with Tab Colors)</h2>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-6">
            <div className="text-center">
              <Avatar user={sampleUsers[2]} color="blue" />
              <p className="text-sm text-gray-600 mt-2">Blue</p>
            </div>
            <div className="text-center">
              <Avatar user={sampleUsers[2]} color="green" />
              <p className="text-sm text-gray-600 mt-2">Green</p>
            </div>
            <div className="text-center">
              <Avatar user={sampleUsers[2]} color="yellow" />
              <p className="text-sm text-gray-600 mt-2">Yellow</p>
            </div>
            <div className="text-center">
              <Avatar user={sampleUsers[2]} color="red" />
              <p className="text-sm text-gray-600 mt-2">Red</p>
            </div>
            <div className="text-center">
              <Avatar user={sampleUsers[2]} color="purple" />
              <p className="text-sm text-gray-600 mt-2">Purple</p>
            </div>
            <div className="text-center">
              <Avatar user={sampleUsers[2]} color="gray" />
              <p className="text-sm text-gray-600 mt-2">Gray</p>
            </div>
          </div>
        </section>

        {/* Variants */}
        <section className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Variants</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <Avatar user={sampleUsers[2]} variant="gradient" />
              <p className="text-sm text-gray-600 mt-2">Gradient (default)</p>
            </div>
            <div className="text-center">
              <Avatar user={sampleUsers[2]} variant="solid" />
              <p className="text-sm text-gray-600 mt-2">Solid</p>
            </div>
            <div className="text-center">
              <Avatar user={sampleUsers[2]} variant="soft" />
              <p className="text-sm text-gray-600 mt-2">Soft</p>
            </div>
          </div>
        </section>

        {/* Shapes */}
        <section className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Shapes</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <Avatar user={sampleUsers[2]} shape="circle" />
              <p className="text-sm text-gray-600 mt-2">Circle (default)</p>
            </div>
            <div className="text-center">
              <Avatar user={sampleUsers[2]} shape="rounded" />
              <p className="text-sm text-gray-600 mt-2">Rounded</p>
            </div>
            <div className="text-center">
              <Avatar user={sampleUsers[2]} shape="square" />
              <p className="text-sm text-gray-600 mt-2">Square</p>
            </div>
          </div>
        </section>

        {/* Interactive Features */}
        <section className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Interactive Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="text-center">
              <Avatar 
                user={sampleUsers[0]} 
                showTooltip={true}
                size="lg"
              />
              <p className="text-sm text-gray-600 mt-2">With Tooltip (hover me)</p>
            </div>
            <div className="text-center">
              <Avatar 
                user={sampleUsers[1]} 
                onClick={() => alert('Avatar clicked!')}
                size="lg"
              />
              <p className="text-sm text-gray-600 mt-2">Clickable</p>
            </div>
          </div>
        </section>

        {/* Staff Management Usage Examples */}
        <section className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Staff Management Usage</h2>
          
          {/* Grid View Example */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Grid View Style</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <Avatar 
                  user={{
                    firstName: 'John',
                    lastName: 'Doe',
                    personalEmail: 'john.doe@lydo.com'
                  }}
                  size="md"
                  color="blue"
                />
                <div>
                  <h4 className="font-semibold text-gray-900">John Doe</h4>
                  <p className="text-sm text-gray-600">john.doe@lydo.com</p>
                </div>
              </div>
            </div>
          </div>

          {/* List View Example */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">List View Style</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <Avatar 
                  user={{
                    firstName: 'Jane',
                    lastName: 'Smith',
                    personalEmail: 'jane.smith@lydo.com'
                  }}
                  size="sm"
                  color="green"
                />
                <div>
                  <h4 className="font-medium text-gray-900">Jane Smith</h4>
                  <p className="text-sm text-gray-600">jane.smith@lydo.com</p>
                </div>
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
{`<Avatar user={staffMember} />

// Or with direct props:
<Avatar 
  name="John Doe"
  email="john@example.com"
  avatarUrl="https://example.com/avatar.jpg"
/>`}
              </pre>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">StaffManagement Grid View:</h3>
              <pre className="bg-gray-100 rounded p-3 text-sm text-gray-800 overflow-x-auto">
{`<Avatar 
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

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">StaffManagement List View:</h3>
              <pre className="bg-gray-100 rounded p-3 text-sm text-gray-800 overflow-x-auto">
{`<Avatar 
  user={item}
  size="sm"
  color="blue"
/>`}
              </pre>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AvatarExamples;
