import React from 'react';

const FormFooter = ({ onBack, onNext, nextLabel = 'Next', backLabel = 'Back', disabled = false }) => {
  return (
    <div className="sticky bottom-0 inset-x-0 bg-white/95 backdrop-blur border-t border-gray-200 py-3 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex gap-3">
          {onBack && (
            <button type="button" onClick={onBack} className="flex-1 inline-flex items-center justify-center px-4 py-2 rounded-lg ring-1 ring-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50">
              {backLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onNext}
            disabled={disabled}
            className={`flex-1 inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-semibold shadow ${disabled ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-[#24345A] text-white hover:bg-[#1a2a4a]'}`}
          >
            {nextLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FormFooter;


