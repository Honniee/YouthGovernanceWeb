import React from 'react';

const SurveySummary = ({ 
  title = "Personal Information Summary",
  subtitle = "Review your provided information before proceeding",
  fields = [],
  className = ''
}) => {
  return (
    <div className={`mt-8 bg-white rounded-xl shadow-sm border border-gray-200 ${className}`}>
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {subtitle && (
          <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
        )}
      </div>
      
      <div className="p-6">
        <div className="space-y-4">
          {fields.map((field, index) => (
            <div 
              key={index}
              className={`border-l-4 pl-4 ${field.hasValue ? 'border-green-500' : 'border-amber-400'}`}
            >
              <div className="text-sm">
                <span className="text-gray-600">{field.label}:</span>
                <span className={`ml-2 font-medium ${field.hasValue ? 'text-gray-900' : 'text-gray-500'}`}>
                  {field.value || '-'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SurveySummary;
