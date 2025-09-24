// LYDO Typography System - Centralized Typography for Consistency

export const typography = {
  // Font Families
  fonts: {
    primary: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
    secondary: ['Georgia', 'Times New Roman', 'serif'],
    mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'monospace'],
  },

  // Font Sizes (using rem for scalability)
  sizes: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px (default)
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
    '5xl': '3rem',    // 48px
    '6xl': '3.75rem', // 60px
    '7xl': '4.5rem',  // 72px
  },

  // Font Weights
  weights: {
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },

  // Line Heights
  lineHeights: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75',
    loose: '2',
  },

  // Letter Spacing
  letterSpacing: {
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
};

// Typography Presets for Common Use Cases
export const typographyPresets = {
  // Headings
  headings: {
    h1: {
      fontSize: typography.sizes['5xl'],
      fontWeight: typography.weights.bold,
      lineHeight: typography.lineHeights.tight,
      letterSpacing: typography.letterSpacing.tight,
      fontFamily: typography.fonts.primary.join(', '),
    },
    h2: {
      fontSize: typography.sizes['4xl'],
      fontWeight: typography.weights.bold,
      lineHeight: typography.lineHeights.tight,
      letterSpacing: typography.letterSpacing.tight,
      fontFamily: typography.fonts.primary.join(', '),
    },
    h3: {
      fontSize: typography.sizes['3xl'],
      fontWeight: typography.weights.semibold,
      lineHeight: typography.lineHeights.normal,
      fontFamily: typography.fonts.primary.join(', '),
    },
    h4: {
      fontSize: typography.sizes['2xl'],
      fontWeight: typography.weights.semibold,
      lineHeight: typography.lineHeights.normal,
      fontFamily: typography.fonts.primary.join(', '),
    },
    h5: {
      fontSize: typography.sizes.xl,
      fontWeight: typography.weights.medium,
      lineHeight: typography.lineHeights.normal,
      fontFamily: typography.fonts.primary.join(', '),
    },
    h6: {
      fontSize: typography.sizes.lg,
      fontWeight: typography.weights.medium,
      lineHeight: typography.lineHeights.normal,
      fontFamily: typography.fonts.primary.join(', '),
    },
  },

  // Body Text
  body: {
    large: {
      fontSize: typography.sizes.lg,
      fontWeight: typography.weights.normal,
      lineHeight: typography.lineHeights.relaxed,
      fontFamily: typography.fonts.primary.join(', '),
    },
    normal: {
      fontSize: typography.sizes.base,
      fontWeight: typography.weights.normal,
      lineHeight: typography.lineHeights.normal,
      fontFamily: typography.fonts.primary.join(', '),
    },
    small: {
      fontSize: typography.sizes.sm,
      fontWeight: typography.weights.normal,
      lineHeight: typography.lineHeights.normal,
      fontFamily: typography.fonts.primary.join(', '),
    },
  },

  // Special Text
  special: {
    lead: {
      fontSize: typography.sizes.xl,
      fontWeight: typography.weights.normal,
      lineHeight: typography.lineHeights.relaxed,
      fontFamily: typography.fonts.primary.join(', '),
    },
    caption: {
      fontSize: typography.sizes.sm,
      fontWeight: typography.weights.normal,
      lineHeight: typography.lineHeights.normal,
      color: '#6b7280', // text-gray-500
      fontFamily: typography.fonts.primary.join(', '),
    },
    overline: {
      fontSize: typography.sizes.xs,
      fontWeight: typography.weights.semibold,
      lineHeight: typography.lineHeights.normal,
      letterSpacing: typography.letterSpacing.widest,
      textTransform: 'uppercase',
      fontFamily: typography.fonts.primary.join(', '),
    },
  },

  // Interactive Elements
  interactive: {
    button: {
      fontSize: typography.sizes.base,
      fontWeight: typography.weights.medium,
      lineHeight: typography.lineHeights.normal,
      fontFamily: typography.fonts.primary.join(', '),
    },
    link: {
      fontSize: typography.sizes.base,
      fontWeight: typography.weights.medium,
      lineHeight: typography.lineHeights.normal,
      fontFamily: typography.fonts.primary.join(', '),
      textDecoration: 'underline',
    },
    label: {
      fontSize: typography.sizes.sm,
      fontWeight: typography.weights.medium,
      lineHeight: typography.lineHeights.normal,
      fontFamily: typography.fonts.primary.join(', '),
    },
  },
}; 