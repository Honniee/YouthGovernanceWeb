import React from 'react';
import { X, AlertCircle } from 'lucide-react';

const ErrorModal = ({ isOpen, message, onClose, title = 'Error' }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/30 backdrop-blur-sm overflow-y-auto h-full w-full z-[9999] flex items-center justify-center p-4"
      onClick={(e) => {
        // Prevent any clicks from bubbling up
        e.stopPropagation();
      }}
    >
      {/* Modal with responsive design */}
      <div 
        className="relative bg-white rounded-xl shadow-2xl w-11/12 max-w-sm sm:max-w-md border border-gray-200/50 transform transition-all duration-300 ease-out"
        onClick={(e) => {
          // Prevent modal content clicks from bubbling up
          e.stopPropagation();
        }}
      >
        {/* Header */}
        <div className="bg-red-50 rounded-t-xl p-4 sm:p-6 pb-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-100 rounded-full border border-red-300">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-800">{title}</h3>
            </div>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onClose) onClose();
              }}
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
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onClose) onClose();
              }}
              className="px-8 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200 shadow-md min-w-[100px]"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorModal;