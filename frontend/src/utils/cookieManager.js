/**
 * Cookie Management Utility
 * Handles cookie consent and manages different cookie categories
 */

// Cookie categories
export const COOKIE_CATEGORIES = {
  NECESSARY: 'necessary',
  ANALYTICS: 'analytics', 
  FUNCTIONAL: 'functional'
};

// Default cookie preferences
export const DEFAULT_PREFERENCES = {
  [COOKIE_CATEGORIES.NECESSARY]: true,  // Always required
  [COOKIE_CATEGORIES.ANALYTICS]: false,
  [COOKIE_CATEGORIES.FUNCTIONAL]: false
};

/**
 * Get current cookie preferences
 */
export const getCookiePreferences = () => {
  try {
    const preferences = localStorage.getItem('cookiePreferences');
    return preferences ? JSON.parse(preferences) : DEFAULT_PREFERENCES;
  } catch (error) {
    console.error('Error getting cookie preferences:', error);
    return DEFAULT_PREFERENCES;
  }
};

/**
 * Check if user has given cookie consent
 */
export const hasGivenConsent = () => {
  return localStorage.getItem('cookieConsent') === 'true';
};

/**
 * Check if specific cookie category is enabled
 */
export const isCategoryEnabled = (category) => {
  if (category === COOKIE_CATEGORIES.NECESSARY) return true; // Always enabled
  
  const preferences = getCookiePreferences();
  return preferences[category] || false;
};

/**
 * Set a cookie with category check
 */
export const setCookie = (name, value, days = 30, category = COOKIE_CATEGORIES.NECESSARY) => {
  // Always allow necessary cookies
  if (category === COOKIE_CATEGORIES.NECESSARY || isCategoryEnabled(category)) {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Strict;Secure`;
    return true;
  }
  return false;
};

/**
 * Get a cookie value
 */
export const getCookie = (name) => {
  const nameEQ = name + "=";
  const cookies = document.cookie.split(';');
  
  for (let i = 0; i < cookies.length; i++) {
    let cookie = cookies[i];
    while (cookie.charAt(0) === ' ') cookie = cookie.substring(1, cookie.length);
    if (cookie.indexOf(nameEQ) === 0) return cookie.substring(nameEQ.length, cookie.length);
  }
  return null;
};

/**
 * Delete a cookie
 */
export const deleteCookie = (name) => {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:01 GMT;path=/`;
};

/**
 * Clear all cookies by category
 */
export const clearCookiesByCategory = (category) => {
  // Define cookies by category
  const cookiesByCategory = {
    [COOKIE_CATEGORIES.ANALYTICS]: [
      '_ga', '_ga_*', '_gid', '_gat', '_gtag_*', // Google Analytics
      '_fbp', '_fbc', // Facebook Pixel
      '__utma', '__utmb', '__utmc', '__utmz' // Legacy Google Analytics
    ],
    [COOKIE_CATEGORIES.FUNCTIONAL]: [
      'user_preferences',
      'theme_preference', 
      'language_preference',
      'layout_preference'
    ]
  };

  const cookiesToClear = cookiesByCategory[category] || [];
  
  cookiesToClear.forEach(cookieName => {
    // Handle wildcard cookies (like _ga_*)
    if (cookieName.includes('*')) {
      const prefix = cookieName.replace('*', '');
      const allCookies = document.cookie.split(';');
      
      allCookies.forEach(cookie => {
        const cookieNameOnly = cookie.split('=')[0].trim();
        if (cookieNameOnly.startsWith(prefix)) {
          deleteCookie(cookieNameOnly);
        }
      });
    } else {
      deleteCookie(cookieName);
    }
  });
};

/**
 * Initialize analytics tracking (Google Analytics example)
 */
export const initializeAnalytics = () => {
  if (!isCategoryEnabled(COOKIE_CATEGORIES.ANALYTICS)) return;
  
  // Example: Initialize Google Analytics
  // Replace 'GA_MEASUREMENT_ID' with your actual measurement ID
  const GA_MEASUREMENT_ID = 'G-XXXXXXXXXX';
  
  if (typeof window !== 'undefined' && !window.gtag) {
    // Load Google Analytics script
    const script = document.createElement('script');
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    script.async = true;
    document.head.appendChild(script);
    
    // Initialize gtag
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    window.gtag = gtag;
    
    gtag('js', new Date());
    gtag('config', GA_MEASUREMENT_ID, {
      anonymize_ip: true,
      cookie_flags: 'SameSite=Strict;Secure'
    });
    
    console.log('Google Analytics initialized');
  }
};

/**
 * Track page view (only if analytics enabled)
 */
export const trackPageView = (page_path) => {
  if (!isCategoryEnabled(COOKIE_CATEGORIES.ANALYTICS)) return;
  
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', 'GA_MEASUREMENT_ID', {
      page_path: page_path
    });
  }
};

/**
 * Track custom event (only if analytics enabled)
 */
export const trackEvent = (action, category, label, value) => {
  if (!isCategoryEnabled(COOKIE_CATEGORIES.ANALYTICS)) return;
  
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value
    });
  }
};

/**
 * Apply cookie preferences (called when user updates settings)
 */
export const applyCookiePreferences = (preferences) => {
  // Clear cookies for disabled categories
  Object.keys(COOKIE_CATEGORIES).forEach(key => {
    const category = COOKIE_CATEGORIES[key];
    
    if (category === COOKIE_CATEGORIES.NECESSARY) return; // Never clear necessary
    
    if (!preferences[category]) {
      clearCookiesByCategory(category);
    }
  });
  
  // Initialize enabled features
  if (preferences[COOKIE_CATEGORIES.ANALYTICS]) {
    initializeAnalytics();
  }
  
  // Initialize functional features
  if (preferences[COOKIE_CATEGORIES.FUNCTIONAL]) {
    // Enable enhanced functionality
    console.log('Functional cookies enabled - enhanced features available');
  }
};

/**
 * Get cookie consent info for display
 */
export const getConsentInfo = () => {
  const consentDate = localStorage.getItem('cookieConsentDate');
  const preferences = getCookiePreferences();
  
  return {
    hasConsent: hasGivenConsent(),
    consentDate: consentDate ? new Date(consentDate) : null,
    preferences: preferences,
    enabledCategories: Object.keys(preferences).filter(key => preferences[key])
  };
}; 