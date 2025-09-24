import React from 'react';

const SaveResumeBanner = ({ isSaving, lastSavedAt }) => {
  return (
    <div className="w-full bg-gray-50 border-b border-gray-200 py-2">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center gap-2 text-xs text-gray-600">
          <span className={`inline-block w-2 h-2 rounded-full ${isSaving ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
          {isSaving ? 'Saving…' : `Last saved: ${lastSavedAt ? new Date(lastSavedAt).toLocaleTimeString() : 'Not yet saved'}`}
        </div>
      </div>
    </div>
  );
};

export default SaveResumeBanner;


