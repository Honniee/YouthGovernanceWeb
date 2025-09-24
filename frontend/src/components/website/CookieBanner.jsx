import React, { useState, useEffect } from 'react';
import { X, Cookie, Shield, Settings, Check } from 'lucide-react';
import { applyCookiePreferences, getCookiePreferences, hasGivenConsent } from '../../utils/cookieManager';

const CookieBanner = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [cookiePreferences, setCookiePreferences] = useState({
    necessary: true, // Always required
    analytics: false,
    functional: false
  });

  // Check if user has already given consent
  useEffect(() => {
    if (!hasGivenConsent()) {
      // Show banner after a short delay for better UX
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1500);
      return () => clearTimeout(timer);
    } else {
      // Load saved preferences
      const savedPrefs = getCookiePreferences();
      setCookiePreferences(savedPrefs);
    }
  }, []);

  // Handle accepting all cookies
  const handleAcceptAll = () => {
    const allAccepted = {
      necessary: true,
      analytics: true,
      functional: true
    };
    
    saveCookieConsent(allAccepted);
    setIsVisible(false);
  };

  // Handle accepting only necessary cookies
  const handleAcceptNecessary = () => {
    const necessaryOnly = {
      necessary: true,
      analytics: false,
      functional: false
    };
    
    saveCookieConsent(necessaryOnly);
    setIsVisible(false);
  };

  // Handle custom preferences
  const handleSavePreferences = () => {
    saveCookieConsent(cookiePreferences);
    setIsVisible(false);
    setShowSettings(false);
  };

  // Save consent to localStorage and apply cookies
  const saveCookieConsent = (preferences) => {
    localStorage.setItem('cookieConsent', 'true');
    localStorage.setItem('cookiePreferences', JSON.stringify(preferences));
    localStorage.setItem('cookieConsentDate', new Date().toISOString());
    
    // Apply cookie preferences
    applyCookiePreferences(preferences);
    
    setCookiePreferences(preferences);
  };



  // Handle preference change
  const handlePreferenceChange = (category) => {
    if (category === 'necessary') return; // Can't disable necessary cookies
    
    setCookiePreferences(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:right-auto sm:max-w-md lg:max-w-lg z-50">
      <div className="bg-white rounded-lg shadow-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200">
        {!showSettings ? (
          // Main cookie banner
          <div className="p-6">
            <div className="flex items-start gap-3 mb-4">
              <Cookie className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  We value your privacy
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  We use cookies to enhance your browsing experience, serve personalized content, 
                  and analyze our traffic. Some cookies are necessary for the website to function, 
                  while others help us understand how you interact with our site.
                </p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 sm:p-4 mb-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Cookie Categories:</h4>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• <strong>Necessary:</strong> Required for basic website functionality</li>
                <li>• <strong>Analytics:</strong> Help us understand how visitors use our site</li>
                <li>• <strong>Functional:</strong> Remember your preferences and settings</li>
              </ul>
            </div>

            <div className="flex flex-col gap-2 sm:gap-3 sm:flex-row">
              <button
                onClick={handleAcceptAll}
                className="flex-1 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
              >
                Accept All
              </button>
              <button
                onClick={handleAcceptNecessary}
                className="flex-1 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
              >
                Necessary Only
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="flex-1 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-blue-600 border border-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200 flex items-center justify-center gap-1 sm:gap-2"
              >
                <Settings className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Customize</span>
                <span className="sm:hidden">Settings</span>
              </button>
            </div>

            <div className="mt-4 text-center">
              <button
                onClick={() => window.open('/privacy-policy', '_blank')}
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                Read our Privacy Policy
              </button>
            </div>
          </div>
        ) : (
          // Cookie settings panel
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Cookie Preferences</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              {/* Necessary Cookies */}
              <div className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-900">Necessary Cookies</h4>
                  <p className="text-xs text-gray-600 mt-1">
                    These cookies are essential for the website to function and cannot be disabled.
                  </p>
                </div>
                <div className="flex items-center ml-4">
                  <Check className="w-5 h-5 text-green-600" />
                  <span className="text-xs text-gray-500 ml-1">Always Active</span>
                </div>
              </div>

              {/* Analytics Cookies */}
              <div className="flex items-start justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-900">Analytics Cookies</h4>
                  <p className="text-xs text-gray-600 mt-1">
                    Help us understand how visitors interact with our website by collecting anonymous information.
                  </p>
                </div>
                <label className="flex items-center ml-4">
                  <input
                    type="checkbox"
                    checked={cookiePreferences.analytics}
                    onChange={() => handlePreferenceChange('analytics')}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </label>
              </div>

              {/* Functional Cookies */}
              <div className="flex items-start justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-900">Functional Cookies</h4>
                  <p className="text-xs text-gray-600 mt-1">
                    Remember your preferences and provide enhanced, personalized features.
                  </p>
                </div>
                <label className="flex items-center ml-4">
                  <input
                    type="checkbox"
                    checked={cookiePreferences.functional}
                    onChange={() => handlePreferenceChange('functional')}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </label>
              </div>


            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSavePreferences}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors duration-200"
              >
                Save Preferences
              </button>
              <button
                onClick={handleAcceptAll}
                className="flex-1 px-4 py-2 text-sm font-medium text-blue-600 border border-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
              >
                Accept All
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CookieBanner; 