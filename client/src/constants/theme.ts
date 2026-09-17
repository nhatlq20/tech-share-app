/**
 * TechShare Design System Tokens
 * Tuân thủ 100% tài liệu quy chuẩn giao diện theme-skill.md
 */

export const theme = {
  colors: {
    primary: {
      50: '#EFF6FF',
      500: '#3B82F6',
      600: '#2563EB',
      700: '#1D4ED8',
    },
    success: {
      50: '#ECFDF5',
      500: '#10B981',
      600: '#059669',
    },
    warning: {
      50: '#FFFBEB',
      500: '#F59E0B',
      600: '#D97706',
    },
    danger: {
      50: '#FEF2F2',
      500: '#EF4444',
      600: '#DC2626',
    },
    indigo: {
      50: '#EEF2FF',
      500: '#6366F1',
      600: '#4F46E5',
    },
    slate: {
      50: '#F8FAFC',
      100: '#F1F5F9',
      200: '#E2E8F0',
      400: '#94A3B8',
      600: '#475569',
      800: '#1E293B',
      900: '#0F172A',
    },
    white: '#FFFFFF',
  },

  // Surfaces & Text (Light Mode mặc định)
  background: '#F8FAFC',
  card: '#FFFFFF',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  border: '#E2E8F0',

  // 8-Point Grid Spacing
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },

  // Border Radii
  radii: {
    sm: 6,
    md: 12,
    lg: 16,
    full: 9999,
  },

  // Shadows đa nền tảng
  shadows: {
    card: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 3,
    },
    subtle: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 1.5,
    },
  },

  // Typography Scale
  typography: {
    heading: {
      fontSize: 20,
      fontWeight: '700' as const,
      color: '#0F172A',
    },
    subheading: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: '#0F172A',
    },
    kpi: {
      fontSize: 22,
      fontWeight: '800' as const,
      color: '#0F172A',
    },
    body: {
      fontSize: 14,
      fontWeight: '500' as const,
      color: '#0F172A',
    },
    caption: {
      fontSize: 12,
      fontWeight: '400' as const,
      color: '#64748B',
    },
    badge: {
      fontSize: 11,
      fontWeight: '700' as const,
    },
  },
};

export type ThemeTokens = typeof theme;
