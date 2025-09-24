// LYDO Design System - Main Theme Export
// This is your centralized design system for consistency

import { colors, colorUsage } from './colors.js';
import { typography, typographyPresets } from './typography.js';
import { spacing, spacingPresets, borderRadius, shadows, zIndex } from './spacing.js';

// Main Theme Object
export const theme = {
  // Brand Identity
  brand: {
    name: 'Local Youth Development Office',
    shortName: 'LYDO',
    location: 'San Jose, Batangas',
    tagline: 'Empowering Youth, Building Communities',
  },

  // Design Tokens
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  zIndex,

  // Usage Guidelines
  colorUsage,
  typographyPresets,
  spacingPresets,

  // Breakpoints for Responsive Design
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },

  // Animation & Transitions
  animations: {
    duration: {
      fast: '150ms',
      normal: '200ms',
      slow: '300ms',
      slower: '500ms',
    },
    easing: {
      default: 'cubic-bezier(0.4, 0, 0.2, 1)',
      in: 'cubic-bezier(0.4, 0, 1, 1)',
      out: 'cubic-bezier(0, 0, 0.2, 1)',
      inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
  },

  // Component Presets
  components: {
    // Button Variants
    button: {
      primary: {
        backgroundColor: colors.primary[600],
        color: colors.text.white,
        padding: `${spacingPresets.components.buttonPadding.y} ${spacingPresets.components.buttonPadding.x}`,
        borderRadius: borderRadius.md,
        fontSize: typography.sizes.base,
        fontWeight: typography.weights.medium,
        transition: `all 200ms cubic-bezier(0.4, 0, 0.2, 1)`,
        '&:hover': {
          backgroundColor: colors.primary[700],
        },
      },
      secondary: {
        backgroundColor: colors.gray[200],
        color: colors.text.primary,
        padding: `${spacingPresets.components.buttonPadding.y} ${spacingPresets.components.buttonPadding.x}`,
        borderRadius: borderRadius.md,
        fontSize: typography.sizes.base,
        fontWeight: typography.weights.medium,
        transition: `all 200ms cubic-bezier(0.4, 0, 0.2, 1)`,
        '&:hover': {
          backgroundColor: colors.gray[300],
        },
      },
    },

    // Card Variants
    card: {
      default: {
        backgroundColor: colors.background.primary,
        border: `1px solid ${colors.gray[200]}`,
        borderRadius: borderRadius.lg,
        boxShadow: shadows.md,
        padding: spacingPresets.components.cardPadding,
      },
      elevated: {
        backgroundColor: colors.background.primary,
        borderRadius: borderRadius.lg,
        boxShadow: shadows.lg,
        padding: spacingPresets.components.cardPaddingLarge,
      },
    },

    // Input Variants
    input: {
      default: {
        border: `1px solid ${colors.gray[300]}`,
        borderRadius: borderRadius.md,
        padding: `${spacingPresets.components.inputPadding.y} ${spacingPresets.components.inputPadding.x}`,
        fontSize: typography.sizes.base,
        fontFamily: typography.fonts.primary.join(', '),
        '&:focus': {
          borderColor: colors.primary[500],
          outline: 'none',
          boxShadow: `0 0 0 3px ${colors.primary[100]}`,
        },
      },
    },
  },
};

// Helper Functions for Easy Usage
export const getColor = (colorPath) => {
  const path = colorPath.split('.');
  let result = colors;
  for (const key of path) {
    result = result[key];
  }
  return result;
};

export const getSpacing = (size) => spacing[size];

export const getTypography = (preset) => {
  const [category, variant] = preset.split('.');
  return typographyPresets[category]?.[variant] || typographyPresets.body.normal;
};

// Export individual systems for direct use
export {
  colors,
  colorUsage,
  typography,
  typographyPresets,
  spacing,
  spacingPresets,
  borderRadius,
  shadows,
  zIndex,
};

// Default export
export default theme; 