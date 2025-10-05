import React, { useState } from 'react';
import ReCaptchaComponent from '../ui/ReCaptchaComponent';
import { useReCaptcha } from '../../hooks/useReCaptcha';

/**
 * Test component to verify reCAPTCHA responsiveness
 * This component helps test the reCAPTCHA on different screen sizes
 */
const ReCaptchaResponsiveTest = () => {
  const [testResults, setTestResults] = useState([]);
  
  // Initialize reCAPTCHA hook
  const recaptcha = useReCaptcha({
    required: true,
    onSuccess: (token) => {
      setTestResults(prev => [...prev, {
        timestamp: new Date().toLocaleTimeString(),
        event: 'reCAPTCHA Verified',
        token: token ? 'Token received' : 'No token'
      }]);
    },
    onError: () => {
      setTestResults(prev => [...prev, {
        timestamp: new Date().toLocaleTimeString(),
        event: 'reCAPTCHA Error',
        token: 'Verification failed'
      }]);
    }
  });

  const clearResults = () => {
    setTestResults([]);
    recaptcha.reset();
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">reCAPTCHA Responsive Test</h2>
      
      {/* Screen size indicator */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">Current Screen Size</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <div className="font-medium text-gray-700">Mobile</div>
            <div className="text-gray-600">&lt; 640px</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-gray-700">Tablet</div>
            <div className="text-gray-600">641px - 1024px</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-gray-700">Desktop</div>
            <div className="text-gray-600">&gt; 1024px</div>
          </div>
        </div>
      </div>

      {/* reCAPTCHA Test Area */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">reCAPTCHA Widget Test</h3>
        <div className="border-2 border-dashed border-gray-300 p-6 rounded-lg">
          <div className="w-full max-w-full overflow-hidden">
            <ReCaptchaComponent
              ref={recaptcha.ref}
              onVerify={recaptcha.onVerify}
              onError={recaptcha.onError}
              onExpire={recaptcha.onExpire}
              className="w-full"
            />
          </div>
        </div>
        
        {/* Instructions */}
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h4 className="font-semibold text-yellow-800 mb-2">Testing Instructions:</h4>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• Resize your browser window to test different screen sizes</li>
            <li>• On mobile: The reCAPTCHA should be horizontally scrollable if needed</li>
            <li>• All images in the challenge grid should be visible and selectable</li>
            <li>• The reCAPTCHA should not be cropped or cut off</li>
          </ul>
        </div>
      </div>

      {/* Test Results */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Test Results</h3>
          <button
            onClick={clearResults}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Clear Results
          </button>
        </div>
        
        {testResults.length === 0 ? (
          <div className="text-gray-500 text-center py-4">
            No test results yet. Complete the reCAPTCHA to see results.
          </div>
        ) : (
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {testResults.map((result, index) => (
              <div key={index} className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-700">{result.event}</span>
                  <span className="text-sm text-gray-500">{result.timestamp}</span>
                </div>
                <div className="text-sm text-gray-600 mt-1">{result.token}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Responsive Design Notes */}
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <h4 className="font-semibold text-green-800 mb-2">Responsive Design Features:</h4>
        <ul className="text-sm text-green-700 space-y-1">
          <li>• <strong>Mobile (&lt; 640px):</strong> Horizontal scrolling enabled, minimum width 320px</li>
          <li>• <strong>Tablet (641px - 1024px):</strong> Horizontal scrolling if needed, centered layout</li>
          <li>• <strong>Desktop (&gt; 1024px):</strong> Full width, no scrolling needed</li>
          <li>• <strong>Touch scrolling:</strong> Smooth scrolling on mobile devices</li>
          <li>• <strong>Custom scrollbars:</strong> Styled scrollbars for better UX</li>
        </ul>
      </div>
    </div>
  );
};

export default ReCaptchaResponsiveTest;



