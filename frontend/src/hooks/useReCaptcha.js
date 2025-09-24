import { useState, useRef, useCallback } from 'react';

/**
 * Custom hook for reCAPTCHA management
 * 
 * @param {Object} options - Hook options
 * @param {boolean} options.required - Whether reCAPTCHA is required (default: true)
 * @param {Function} options.onSuccess - Callback when verification succeeds
 * @param {Function} options.onError - Callback when verification fails
 * 
 * @returns {Object} Hook return object
 */
export const useReCaptcha = (options = {}) => {
  const { 
    required = true, 
    onSuccess, 
    onError 
  } = options;

  const recaptchaRef = useRef(null);
  const [token, setToken] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Handle verification success
  const handleVerify = useCallback((recaptchaToken) => {
    setToken(recaptchaToken);
    setIsVerified(true);
    setError('');
    setIsLoading(false);
    
    if (onSuccess) {
      onSuccess(recaptchaToken);
    }
  }, [onSuccess]);

  // Handle verification error
  const handleError = useCallback(() => {
    setToken('');
    setIsVerified(false);
    setError('reCAPTCHA verification failed');
    setIsLoading(false);
    
    if (onError) {
      onError();
    }
  }, [onError]);

  // Handle expiration
  const handleExpire = useCallback(() => {
    setToken('');
    setIsVerified(false);
    setError('reCAPTCHA expired. Please verify again.');
    setIsLoading(false);
    
    if (onError) {
      onError();
    }
  }, [onError]);

  // Reset reCAPTCHA
  const reset = useCallback(() => {
    if (recaptchaRef.current) {
      recaptchaRef.current.reset();
    }
    setToken('');
    setIsVerified(false);
    setError('');
    setIsLoading(false);
  }, []);

  // Validate reCAPTCHA (for form submission)
  const validate = useCallback(() => {
    if (required && !isVerified) {
      setError('Please complete the reCAPTCHA verification');
      return false;
    }
    setError('');
    return true;
  }, [required, isVerified]);

  // Get current token value
  const getValue = useCallback(() => {
    return recaptchaRef.current ? recaptchaRef.current.getValue() : token;
  }, [token]);

  return {
    // Ref for the component
    ref: recaptchaRef,
    
    // State
    token,
    isVerified,
    error,
    isLoading,
    
    // Event handlers
    onVerify: handleVerify,
    onError: handleError,
    onExpire: handleExpire,
    
    // Methods
    reset,
    validate,
    getValue,
    
    // Computed values
    isValid: isVerified || !required,
    hasError: !!error
  };
};

export default useReCaptcha; 