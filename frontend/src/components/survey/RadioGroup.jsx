import React from 'react';
import { AlertCircle, Check } from 'lucide-react';

const RadioGroup = ({ 
  label,
  field,
  options = [],
  required = false,
  value,
  onChange,
  onBlur,
  error = '',
  touched = false,
  className = '',
  ...props
}) => {
  const hasError = touched && error;
  const isValid = touched && value && !error;

  return (
    <div className={`mb-6 ${className}`}>
      <label className="block text-sm font-semibold text-gray-800 mb-3">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="space-y-3">
        {options.map((option, index) => (
          <label key={index} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors">
            <input
              type="radio"
              name={field}
              value={option}
              checked={value === option}
              onChange={onChange}
              onBlur={onBlur}
              className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              {...props}
            />
            <span className="text-gray-700">{option}</span>
          </label>
        ))}
      </div>
      {hasError && (
        <div className="flex items-center gap-1 mt-2 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}
      {isValid && (
        <div className="flex items-center gap-1 mt-2 text-green-600 text-sm">
          <Check className="w-4 h-4" />
          Looks good!
        </div>
      )}
    </div>
  );
};

export default RadioGroup;
