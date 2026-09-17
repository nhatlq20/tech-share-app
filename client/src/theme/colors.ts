/**
 * Bảng màu chính thức cho TechShare (tuân thủ theme-skill.md)
 * Theme: Trắng & Xanh dương (Light mode mặc định)
 */

export const colors = {
  light: {
    primary: '#2563EB',
    primaryDark: '#1D4ED8',
    primaryLight: '#DBEAFE',
    background: '#FFFFFF',
    surface: '#F8FAFC',
    border: '#E2E8F0',
    textPrimary: '#0F172A',
    textSecondary: '#64748B',
    success: '#16A34A',
    warning: '#F59E0B',
    error: '#DC2626',
    ratingStar: '#FBBF24',
  },
  dark: {
    primary: '#60A5FA',
    primaryDark: '#3B82F6',
    primaryLight: '#1E3A5F',
    background: '#0B1220',
    surface: '#151E2E',
    border: '#1F2A3D',
    textPrimary: '#F1F5F9',
    textSecondary: '#94A3B8',
    success: '#16A34A',
    warning: '#F59E0B',
    error: '#DC2626',
    ratingStar: '#FBBF24',
  },
};

export type ThemeMode = 'light' | 'dark';
export type ThemeColors = typeof colors.light;
