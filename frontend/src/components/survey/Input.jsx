import React from 'react';
import { AlertCircle, Check } from 'lucide-react';

const Input = ({ 
  label,
  field,
  type = 'text',
  required = false,
  placeholder = '',
  disabled = false,
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
      <label className="block text-sm font-semibold text-gray-800 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type={type}
        value={value || ''}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full px-4 py-3 border rounded-xl transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
          hasError 
            ? 'border-red-300 bg-red-50 focus:ring-red-500 focus:border-red-500' 
            : isValid 
              ? 'border-green-300 bg-green-50' 
              : disabled 
                ? 'border-gray-200 bg-gray-50 text-gray-500' 
                : 'border-gray-300 bg-white'
        }`}
        {...props}
      />
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

export default Input;
