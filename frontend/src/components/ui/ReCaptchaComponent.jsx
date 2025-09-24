import React, { useRef, useImperativeHandle, forwardRef, useState } from 'react';
import ReCaptcha from 'react-google-recaptcha';
import { AlertCircle, Shield } from 'lucide-react';

/**
 * Reusable reCAPTCHA Component
 * 
 * @param {Object} props - Component props
 * @param {Function} props.onVerify - Callback when reCAPTCHA is verified (token)
 * @param {Function} props.onError - Callback when reCAPTCHA fails
 * @param {Function} props.onExpire - Callback when reCAPTCHA expires
 * @param {string} props.theme - Theme: 'light' or 'dark' (default: 'light')
 * @param {string} props.size - Size: 'compact' or 'normal' (default: 'normal')
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.showError - Whether to show error messages (default: true)
 * @param {string} props.errorMessage - Custom error message
 * @param {boolean} props.required - Whether reCAPTCHA is required (default: true)
 */
const ReCaptchaComponent = forwardRef(({
  onVerify,
  onError,
  onExpire,
  theme = 'light',
  size = 'normal',
  className = '',
  showError = true,
  errorMessage = '',
  required = true
}, ref) => {
  const recaptchaRef = useRef(null);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Get site key from environment
  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    // Reset the reCAPTCHA
    reset: () => {
      if (recaptchaRef.current) {
        recaptchaRef.current.reset();
        setIsVerified(false);
        setError('');
      }
    },
    
    // Get current token
    getValue: () => {
      return recaptchaRef.current ? recaptchaRef.current.getValue() : null;
    },
    
    // Check if verified
    isVerified: () => isVerified,
    
    // Execute reCAPTCHA (for invisible reCAPTCHA)
    execute: () => {
      if (recaptchaRef.current) {
        return recaptchaRef.current.execute();
      }
      return null;
    }
  }));

  // Handle successful verification
  const handleVerify = (token) => {
    if (token) {
      setIsVerified(true);
      setError('');
      setIsLoading(false);
      
      // Call parent callback
      if (onVerify) {
        onVerify(token);
      }
    }
  };

  // Handle verification error
  const handleError = () => {
    setIsVerified(false);
    setError('reCAPTCHA verification failed. Please try again.');
    setIsLoading(false);
    
    // Call parent callback
    if (onError) {
      onError();
    }
  };

  // Handle expiration
  const handleExpire = () => {
    setIsVerified(false);
    setError('reCAPTCHA expired. Please verify again.');
    setIsLoading(false);
    
    // Call parent callback
    if (onExpire) {
      onExpire();
    }
  };

  // Handle loading state
  const handleLoad = () => {
    setIsLoading(true);
  };

  // If no site key, show error
  if (!siteKey) {
    return (
      <div className={`flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg ${className}`}>
        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
        <div className="text-sm text-red-700">
          <strong>reCAPTCHA Error:</strong> Site key not configured. Please check your environment variables.
        </div>
      </div>
    );
  }

  return (
    <div className={`recaptcha-container ${className}`}>
      {/* reCAPTCHA Widget */}
      <div className="flex flex-col space-y-2">
        {/* Loading indicator */}
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            Loading reCAPTCHA...
          </div>
        )}
        
        {/* reCAPTCHA Widget */}
        <div className="recaptcha-widget">
          <ReCaptcha
            ref={recaptchaRef}
            sitekey={siteKey}
            onChange={handleVerify}
            onErrored={handleError}
            onExpired={handleExpire}
            onLoad={handleLoad}
            theme={theme}
            size={size}
          />
        </div>
        
        {/* Success indicator */}
        {isVerified && (
          <div className="flex items-center gap-2 text-sm text-green-700">
            <Shield className="w-4 h-4 text-green-600" />
            Verified successfully
          </div>
        )}
        
        {/* Error message */}
        {showError && (error || errorMessage) && (
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span>{errorMessage || error}</span>
          </div>
        )}
        
        {/* Required indicator */}
        {required && !isVerified && (
          <div className="text-xs text-gray-500">
            * reCAPTCHA verification is required
          </div>
        )}
      </div>
    </div>
  );
});

ReCaptchaComponent.displayName = 'ReCaptchaComponent';

export default ReCaptchaComponent; 