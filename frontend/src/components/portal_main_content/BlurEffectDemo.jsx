import React, { useState } from 'react';
import { ViewStaffModal, EditStaffModal, GenericViewModal, GenericEditModal } from './index';
import { getModalConfig, processModalConfig } from './modalConfigs';

/**
 * Blur Effect Demo Component
 * 
 * Demonstrates the beautiful blur backdrop effect across all modal types.
 * Shows how the background content becomes elegantly blurred while maintaining visibility.
 */
const BlurEffectDemo = () => {
  const [showStaffView, setShowStaffView] = useState(false);
  const [showStaffEdit, setShowStaffEdit] = useState(false);
  const [showSurveyView, setShowSurveyView] = useState(false);
  const [showEventEdit, setShowEventEdit] = useState(false);

  // Sample data
  const sampleStaff = {
    lydoId: 'LYDO001',
    firstName: 'John',
    lastName: 'Doe',
    middleName: 'Michael',
    personalEmail: 'john.doe@personal.com',
    email: 'john.doe@lydo.org',
    phoneNumber: '+1-555-0123',
    isActive: true,
    deactivated: false,
    emailVerified: true,
    createdAt: '2023-01-15T10:30:00Z',
    updatedAt: '2024-01-10T14:20:00Z',
    createdBy: 'System Admin'
  };

  const sampleSurvey = {
    id: 'SUR001',
    title: 'Youth Engagement Survey 2024',
    description: 'Annual survey to assess youth engagement in community programs.',
    category: 'feedback',
    status: 'active',
    startDate: '2024-01-01',
    endDate: '2024-03-31',
    totalResponses: 245,
    completionRate: 78,
    createdAt: '2023-12-15T09:00:00Z'
  };

  const sampleEvent = {
    eventCode: 'EVT001',
    title: 'Youth Leadership Summit 2024',
    description: 'Annual summit for young leaders.',
    status: 'active',
    startDate: '2024-02-15T09:00:00Z',
    endDate: '2024-02-17T17:00:00Z',
    venue: 'Convention Center',
    capacity: 500
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Hero Section with Rich Background */}
      <div className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        
        {/* Content Cards */}
        <div className="relative z-10 p-8 max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              ✨ Blur Effect Modal System
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Experience the modern, elegant blur backdrop that makes your modals stand out beautifully
            </p>
          </div>

          {/* Rich Content Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            
            {/* Staff Management Card */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                  <span className="text-white text-xl">👥</span>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">Staff Management</h3>
                  <p className="text-gray-600 text-sm">Employee profiles & details</p>
                </div>
              </div>
              <div className="space-y-3">
                <button
                  onClick={() => setShowStaffView(true)}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  View Staff Details
                </button>
                <button
                  onClick={() => setShowStaffEdit(true)}
                  className="w-full px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                >
                  Edit Staff Member
                </button>
              </div>
            </div>

            {/* Survey Management Card */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                  <span className="text-white text-xl">📊</span>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">Survey Management</h3>
                  <p className="text-gray-600 text-sm">Research & feedback tools</p>
                </div>
              </div>
              <div className="space-y-3">
                <button
                  onClick={() => setShowSurveyView(true)}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  View Survey Details
                </button>
                <button className="w-full px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors">
                  Create New Survey
                </button>
              </div>
            </div>

            {/* Event Management Card */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                  <span className="text-white text-xl">🎉</span>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">Event Management</h3>
                  <p className="text-gray-600 text-sm">Programs & activities</p>
                </div>
              </div>
              <div className="space-y-3">
                <button className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                  View Event Details
                </button>
                <button
                  onClick={() => setShowEventEdit(true)}
                  className="w-full px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                >
                  Edit Event
                </button>
              </div>
            </div>
          </div>

          {/* Feature Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-8 text-white">
              <h3 className="text-2xl font-bold mb-4">🌟 Modern Design</h3>
              <ul className="space-y-2">
                <li>• iOS/macOS style blur effects</li>
                <li>• Elegant transparency layers</li>
                <li>• Smooth animations</li>
                <li>• Consistent across all modals</li>
              </ul>
            </div>
            <div className="bg-gradient-to-r from-green-500 to-blue-600 rounded-2xl p-8 text-white">
              <h3 className="text-2xl font-bold mb-4">⚡ Enhanced UX</h3>
              <ul className="space-y-2">
                <li>• Background content remains visible</li>
                <li>• Clear focus on modal content</li>
                <li>• Improved depth perception</li>
                <li>• Premium app feel</li>
              </ul>
            </div>
          </div>

          {/* Sample Content */}
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 border border-white/30">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Background Content for Demo</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-medium text-gray-800 mb-2">📈 Analytics Dashboard</h4>
                <div className="space-y-2">
                  <div className="h-2 bg-blue-200 rounded"></div>
                  <div className="h-2 bg-green-200 rounded w-3/4"></div>
                  <div className="h-2 bg-purple-200 rounded w-1/2"></div>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-800 mb-2">📊 Performance Metrics</h4>
                <div className="space-y-2">
                  <div className="h-2 bg-orange-200 rounded w-5/6"></div>
                  <div className="h-2 bg-red-200 rounded w-2/3"></div>
                  <div className="h-2 bg-yellow-200 rounded w-4/5"></div>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-800 mb-2">🎯 Goal Tracking</h4>
                <div className="space-y-2">
                  <div className="h-2 bg-indigo-200 rounded w-3/5"></div>
                  <div className="h-2 bg-pink-200 rounded w-4/4"></div>
                  <div className="h-2 bg-teal-200 rounded w-2/3"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ViewStaffModal
        isOpen={showStaffView}
        onClose={() => setShowStaffView(false)}
        staffMember={sampleStaff}
      />

      <EditStaffModal
        isOpen={showStaffEdit}
        onClose={() => setShowStaffEdit(false)}
        staffMember={sampleStaff}
        onSave={(data) => {
          console.log('Saving:', data);
          setShowStaffEdit(false);
        }}
      />

      <GenericViewModal
        isOpen={showSurveyView}
        onClose={() => setShowSurveyView(false)}
        data={sampleSurvey}
        config={processModalConfig(
          getModalConfig('survey', 'view'),
          sampleSurvey
        )}
      />

      <GenericEditModal
        isOpen={showEventEdit}
        onClose={() => setShowEventEdit(false)}
        data={sampleEvent}
        config={processModalConfig(
          getModalConfig('event', 'edit'),
          sampleEvent
        )}
        onSave={(data) => {
          console.log('Saving event:', data);
          setShowEventEdit(false);
        }}
      />
    </div>
  );
};

export default BlurEffectDemo;




























