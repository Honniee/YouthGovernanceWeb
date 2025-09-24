// LYDO Spacing System - Centralized Spacing for Consistency

export const spacing = {
  // Base spacing units (in rem)
  0: '0',
  px: '1px',
  0.5: '0.125rem',  // 2px
  1: '0.25rem',     // 4px
  1.5: '0.375rem',  // 6px
  2: '0.5rem',      // 8px
  2.5: '0.625rem',  // 10px
  3: '0.75rem',     // 12px
  3.5: '0.875rem',  // 14px
  4: '1rem',        // 16px
  5: '1.25rem',     // 20px
  6: '1.5rem',      // 24px
  7: '1.75rem',     // 28px
  8: '2rem',        // 32px
  9: '2.25rem',     // 36px
  10: '2.5rem',     // 40px
  11: '2.75rem',    // 44px
  12: '3rem',       // 48px
  14: '3.5rem',     // 56px
  16: '4rem',       // 64px
  20: '5rem',       // 80px
  24: '6rem',       // 96px
  28: '7rem',       // 112px
  32: '8rem',       // 128px
  36: '9rem',       // 144px
  40: '10rem',      // 160px
  44: '11rem',      // 176px
  48: '12rem',      // 192px
  52: '13rem',      // 208px
  56: '14rem',      // 224px
  60: '15rem',      // 240px
  64: '16rem',      // 256px
  72: '18rem',      // 288px
  80: '20rem',      // 320px
  96: '24rem',      // 384px
};

// Semantic Spacing for Common Use Cases
export const spacingPresets = {
  // Component Internal Spacing
  components: {
    buttonPadding: {
      x: spacing[4],    // 16px horizontal
      y: spacing[2],    // 8px vertical
    },
    buttonPaddingLarge: {
      x: spacing[6],    // 24px horizontal
      y: spacing[3],    // 12px vertical
    },
    cardPadding: spacing[6],        // 24px
    cardPaddingLarge: spacing[8],   // 32px
    inputPadding: {
      x: spacing[3],    // 12px horizontal
      y: spacing[2],    // 8px vertical
    },
  },

  // Layout Spacing
  layout: {
    sectionSpacing: spacing[16],    // 64px between sections
    containerPadding: spacing[4],   // 16px container padding
    containerPaddingLarge: spacing[6], // 24px large container padding
    maxWidth: '1280px',             // Max container width
  },

  // Content Spacing
  content: {
    paragraphSpacing: spacing[4],   // 16px between paragraphs
    headingSpacing: spacing[6],     // 24px around headings
    listItemSpacing: spacing[2],    // 8px between list items
  },

  // Grid Spacing
  grid: {
    gapSmall: spacing[4],           // 16px grid gap
    gapMedium: spacing[6],          // 24px grid gap
    gapLarge: spacing[8],           // 32px grid gap
  },

  // Navigation Spacing
  navigation: {
    itemSpacing: spacing[6],        // 24px between nav items
    dropdownSpacing: spacing[2],    // 8px dropdown items
  },
};

// Border Radius System
export const borderRadius = {
  none: '0',
  sm: '0.125rem',     // 2px
  base: '0.25rem',    // 4px (default)
  md: '0.375rem',     // 6px
  lg: '0.5rem',       // 8px
  xl: '0.75rem',      // 12px
  '2xl': '1rem',      // 16px
  '3xl': '1.5rem',    // 24px
  full: '9999px',     // Fully rounded
};

// Shadow System
export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
};

// Z-Index Scale
export const zIndex = {
  auto: 'auto',
  0: '0',
  10: '10',
  20: '20',
  30: '30',
  40: '40',
  50: '50',      // Modals, overlays
  modal: '50',
  popover: '40',
  dropdown: '30',
  header: '20',
  tooltip: '60',
}; 