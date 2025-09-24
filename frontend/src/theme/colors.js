// LYDO Color System - Centralized Colors for Consistency

export const colors = {
  // Primary Brand Colors (Blue - Government/Trust)
  primary: {
    50: '#eff6ff',   // Very light blue
    100: '#dbeafe',  // Light blue
    200: '#bfdbfe',  // Lighter blue
    300: '#93c5fd',  // Light blue
    400: '#60a5fa',  // Medium light blue
    500: '#3b82f6',  // Primary blue (main brand)
    600: '#2563eb',  // Main blue (buttons, links)
    700: '#1d4ed8',  // Dark blue (hover states)
    800: '#1e40af',  // Darker blue
    900: '#1e3a8a',  // Very dark blue
  },

  // Secondary Colors (Green - Growth/Youth)
  secondary: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',   // Secondary green
    600: '#16a34a',   // Main green
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },

  // Accent Colors
  accent: {
    yellow: '#fbbf24',    // Achievement/Awards
    orange: '#f97316',    // Events/Activities
    purple: '#8b5cf6',    // Community Service
    pink: '#ec4899',      // Youth Programs
    indigo: '#6366f1',    // Governance
    teal: '#14b8a6',      // Reports/Data
  },

  // Neutral Colors (Gray Scale)
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },

  // Semantic Colors (Status/Feedback)
  semantic: {
    success: '#10b981',   // Green for success
    warning: '#f59e0b',   // Yellow for warnings
    error: '#ef4444',     // Red for errors
    info: '#3b82f6',      // Blue for information
  },

  // Background Colors
  background: {
    primary: '#ffffff',   // Main background
    secondary: '#f9fafb', // Section backgrounds
    accent: '#f3f4f6',    // Card backgrounds
    dark: '#1f2937',      // Dark sections
  },

  // Text Colors
  text: {
    primary: '#111827',   // Main text
    secondary: '#6b7280', // Secondary text
    muted: '#9ca3af',     // Muted text
    white: '#ffffff',     // White text
    link: '#2563eb',      // Link text
    linkHover: '#1d4ed8', // Link hover
  },
};

// Color Usage Guidelines
export const colorUsage = {
  // For buttons
  buttons: {
    primary: colors.primary[600],
    primaryHover: colors.primary[700],
    secondary: colors.gray[200],
    secondaryHover: colors.gray[300],
    success: colors.semantic.success,
    warning: colors.semantic.warning,
    error: colors.semantic.error,
  },

  // For cards and containers
  cards: {
    background: colors.background.primary,
    border: colors.gray[200],
    shadow: 'rgba(0, 0, 0, 0.1)',
  },

  // For forms
  forms: {
    inputBorder: colors.gray[300],
    inputFocus: colors.primary[500],
    inputError: colors.semantic.error,
    label: colors.text.primary,
    placeholder: colors.text.muted,
  },
}; 