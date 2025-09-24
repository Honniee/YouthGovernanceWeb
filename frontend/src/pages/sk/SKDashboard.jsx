import React from 'react';
import { Users, Megaphone, Calendar, Plus, BarChart3 } from 'lucide-react';

const SKDashboard = () => {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SK Dashboard</h1>
          <p className="text-gray-600">Overview of your barangay youth governance</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors">
          <Plus className="w-4 h-4" />
          New Announcement
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-700 grid place-items-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-gray-500">Registered Youth</div>
              <div className="text-lg font-semibold text-gray-900">1,234</div>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-700 grid place-items-center">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-gray-500">Active Announcements</div>
              <div className="text-lg font-semibold text-gray-900">7</div>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-700 grid place-items-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-gray-500">Upcoming Events</div>
              <div className="text-lg font-semibold text-gray-900">3</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-900">Quick Actions</h2>
          <BarChart3 className="w-4 h-4 text-gray-400" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Create Announcement', icon: Megaphone },
            { label: 'Add Event', icon: Calendar },
            { label: 'Manage Youth', icon: Users },
            { label: 'View Reports', icon: BarChart3 },
          ].map(({ label, icon: Icon }) => (
            <button key={label} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
              <div className="w-8 h-8 rounded-md bg-purple-100 text-purple-700 grid place-items-center">
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium text-gray-800">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SKDashboard;

