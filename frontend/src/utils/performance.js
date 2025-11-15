import React from 'react';

/**
 * Performance Utilities
 * Helper functions for React performance optimization
 */

/**
 * Memoized component wrapper
 */
export const memo = React.memo;

/**
 * Create a memoized component with custom comparison
 */
export function memoWithComparison(Component, areEqual) {
  return React.memo(Component, areEqual);
}

/**
 * Memoize a function result
 */
export function useMemo(callback, dependencies) {
  return React.useMemo(callback, dependencies);
}

/**
 * Memoize a callback function
 */
export function useCallback(callback, dependencies) {
  return React.useCallback(callback, dependencies);
}

/**
 * Deep comparison for React.memo
 */
export function deepEqual(obj1, obj2) {
  if (obj1 === obj2) return true;
  if (obj1 == null || obj2 == null) return false;
  if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return false;
  
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  
  if (keys1.length !== keys2.length) return false;
  
  for (const key of keys1) {
    if (!keys2.includes(key)) return false;
    if (!deepEqual(obj1[key], obj2[key])) return false;
  }
  
  return true;
}

/**
 * Shallow comparison for React.memo
 */
export function shallowEqual(obj1, obj2) {
  if (obj1 === obj2) return true;
  if (obj1 == null || obj2 == null) return false;
  if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return false;
  
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  
  if (keys1.length !== keys2.length) return false;
  
  for (const key of keys1) {
    if (obj1[key] !== obj2[key]) return false;
  }
  
  return true;
}

/**
 * Memoize expensive computations
 */
export function memoize(fn) {
  const cache = new Map();
  
  return function memoized(...args) {
    const key = JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = fn(...args);
    cache.set(key, result);
    
    return result;
  };
}

/**
 * Throttle function calls
 */
export function throttle(func, delay) {
  let timeoutId;
  let lastExecTime = 0;
  
  return function throttled(...args) {
    const currentTime = Date.now();
    
    if (currentTime - lastExecTime > delay) {
      func(...args);
      lastExecTime = currentTime;
    } else {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func(...args);
        lastExecTime = Date.now();
      }, delay - (currentTime - lastExecTime));
    }
  };
}

/**
 * Debounce function calls
 */
export function debounce(func, delay) {
  let timeoutId;
  
  return function debounced(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}


