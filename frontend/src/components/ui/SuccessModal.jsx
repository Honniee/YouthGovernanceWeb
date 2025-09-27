import React from 'react';
import { X, CheckCircle } from 'lucide-react';

const SuccessModal = ({ isOpen, message, onClose, title = 'Success' }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm overflow-y-auto h-full w-full z-[9999] flex items-center justify-center p-4">
      {/* Modal with responsive design */}
      <div className="relative bg-white rounded-xl shadow-2xl w-11/12 max-w-sm sm:max-w-md border border-gray-200/50 transform transition-all duration-300 ease-out">
        {/* Header */}
        <div className="bg-green-50 rounded-t-xl p-4 sm:p-6 pb-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-full border border-green-300">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-800">{title}</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-all duration-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Body */}
        <div className="bg-gray-50 rounded-b-xl p-4 sm:p-6">
          <p className="text-gray-700 leading-relaxed text-sm sm:text-base mb-6 text-center">{message}</p>
          
          {/* Centered OK button */}
          <div className="flex justify-center">
            <button
              onClick={onClose}
              className="px-8 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 shadow-md min-w-[100px]"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuccessModal;
