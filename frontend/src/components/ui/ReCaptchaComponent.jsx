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
        
        {/* reCAPTCHA Widget with mobile-responsive container */}
        <div className="recaptcha-widget-container">
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
      
      {/* Mobile-responsive CSS */}
      <style>{`
        .recaptcha-container {
          width: 100%;
          max-width: 100%;
          overflow: hidden;
          position: relative;
          z-index: 10;
        }
        
        .recaptcha-widget-container {
          width: 100%;
          max-width: 100%;
          overflow-x: auto;
          overflow-y: visible;
          padding: 0;
          margin: 0;
        }
        
        .recaptcha-widget {
          width: 100%;
          min-width: 304px; /* Minimum width for reCAPTCHA */
          max-width: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        
        /* Mobile-specific styles */
        @media (max-width: 640px) {
          .recaptcha-container {
            width: 100% !important;
            max-width: 100% !important;
            overflow-x: visible !important;
            overflow-y: visible !important;
            -webkit-overflow-scrolling: touch !important;
            padding: 0 !important;
            margin: 0 !important;
            display: flex !important;
            justify-content: center !important;
            /* Remove any transforms that interfere with touch */
            transform: none !important;
          }
          
          .recaptcha-widget-container {
            width: 100% !important;
            max-width: 100% !important;
            overflow-x: visible !important;
            overflow-y: visible !important;
            padding: 0 !important;
            margin: 0 !important;
            min-width: 304px !important;
            /* Remove transform to fix touch issues */
            transform: none !important;
            /* Better mobile touch handling */
            -webkit-tap-highlight-color: transparent;
            touch-action: manipulation;
          }
          
          /* Make sure the reCAPTCHA iframe doesn't get cut off */
          .recaptcha-widget iframe {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 304px !important;
            height: auto !important;
            overflow: visible !important;
            /* Ensure iframe is touch-friendly */
            pointer-events: auto !important;
            -webkit-tap-highlight-color: transparent;
            touch-action: manipulation;
          }
          
          .recaptcha-widget {
            /* Better mobile touch handling */
            -webkit-tap-highlight-color: transparent;
            touch-action: manipulation;
            pointer-events: auto !important;
          }
          
          /* Fix for reCAPTCHA challenge container */
          .g-recaptcha {
            width: 100% !important;
            max-width: 100% !important;
            overflow: visible !important;
            /* Remove transform to fix touch issues */
            transform: none !important;
            /* Better mobile touch handling */
            -webkit-tap-highlight-color: transparent;
            touch-action: manipulation;
            pointer-events: auto !important;
          }
          
          /* Ensure the challenge grid is fully accessible */
          .g-recaptcha iframe {
            width: 304px !important;
            height: 78px !important;
            overflow: visible !important;
          }
          
          /* Fix for the challenge popup on mobile */
          .recaptcha-checkbox-border {
            width: 304px !important;
            height: 78px !important;
          }
          
          /* Ensure challenge popup is fully visible */
          .recaptcha-challenge-popup {
            width: 100% !important;
            max-width: 100% !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            position: fixed !important;
            z-index: 9999 !important;
          }
          
          /* Fix for the 3x3 grid challenge */
          .recaptcha-challenge-grid {
            width: 100% !important;
            max-width: 304px !important;
            overflow: visible !important;
          }
          
          /* Ensure challenge images are properly sized */
          .recaptcha-challenge-image {
            width: 100% !important;
            height: auto !important;
            max-width: 304px !important;
          }
        }
        
        /* Tablet styles */
        @media (min-width: 641px) and (max-width: 1024px) {
          .recaptcha-widget-container {
            overflow-x: auto;
            overflow-y: visible;
          }
          
          .recaptcha-widget {
            min-width: 304px;
            width: 100%;
            justify-content: center;
          }
        }
        
        /* Desktop styles */
        @media (min-width: 1025px) {
          .recaptcha-widget-container {
            overflow: visible;
          }
          
          .recaptcha-widget {
            width: 100%;
            justify-content: center;
          }
        }
        
        /* Force reCAPTCHA to be responsive */
        .recaptcha-widget :global(div[data-sitekey]) {
          width: 100% !important;
          max-width: 100% !important;
        }
        
        .recaptcha-widget :global(iframe) {
          width: 100% !important;
          max-width: 100% !important;
          min-width: 304px !important;
        }
        
        /* Enhanced mobile responsiveness for reCAPTCHA challenge modal */
        @media (max-width: 640px) {
          .g-recaptcha-bubble-arrow {
            display: none !important;
          }
          
          .g-recaptcha-bubble {
            width: 100vw !important;
            max-width: 100vw !important;
            left: 0 !important;
            right: 0 !important;
            margin: 0 !important;
            padding: 10px !important;
            box-sizing: border-box !important;
            transform: none !important;
            position: fixed !important;
            top: 50% !important;
            transform: translateY(-50%) !important;
            z-index: 99999 !important;
          }
          
          /* Make challenge container responsive */
          .g-recaptcha-bubble-content {
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          
          /* Responsive challenge grid */
          .g-recaptcha-challenge {
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          
          /* Make challenge images responsive */
          .g-recaptcha-challenge-image img {
            width: 100% !important;
            height: auto !important;
            max-width: 100% !important;
            object-fit: contain !important;
          }
          
          /* Responsive challenge grid layout */
          .g-recaptcha-challenge-grid {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 2px !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          
          /* Individual challenge cells */
          .g-recaptcha-challenge-cell {
            width: 100% !important;
            height: auto !important;
            aspect-ratio: 1 !important;
            padding: 0 !important;
            margin: 0 !important;
            border: 1px solid #ccc !important;
            cursor: pointer !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
          }
          
          /* Challenge cell images */
          .g-recaptcha-challenge-cell img {
            width: 100% !important;
            height: 100% !important;
            object-fit: cover !important;
            display: block !important;
          }
          
          /* Challenge instructions */
          .g-recaptcha-challenge-instructions {
            width: 100% !important;
            max-width: 100% !important;
            padding: 10px !important;
            margin: 0 0 10px 0 !important;
            text-align: center !important;
            font-size: 14px !important;
            line-height: 1.4 !important;
          }
          
          /* Challenge buttons */
          .g-recaptcha-challenge-buttons {
            width: 100% !important;
            max-width: 100% !important;
            padding: 10px !important;
            margin: 10px 0 0 0 !important;
            display: flex !important;
            justify-content: center !important;
            gap: 10px !important;
          }
          
          .g-recaptcha-challenge-button {
            padding: 8px 16px !important;
            font-size: 14px !important;
            border-radius: 4px !important;
            border: 1px solid #ccc !important;
            background: #fff !important;
            cursor: pointer !important;
            min-width: 80px !important;
          }
        }
      `}</style>
    </div>
  );
});

ReCaptchaComponent.displayName = 'ReCaptchaComponent';

export default ReCaptchaComponent; 