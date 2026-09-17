import React, { createContext, useContext, useState } from 'react';
import { colors, ThemeColors, ThemeMode } from './colors';

export * from './colors';

export const defaultTheme: ThemeColors = colors.light;

export function getOrderStatusColor(
  status: 'pending' | 'approved' | 'active' | 'completed' | 'rejected' | 'cancelled' | string,
  mode: ThemeMode = 'light'
): { bg: string; text: string; border: string } {
  const currentColors = mode === 'dark' ? colors.dark : colors.light;

  switch (status.toLowerCase()) {
    case 'pending':
    case 'chờ duyệt':
      return {
        bg: mode === 'light' ? '#FEF3C7' : 'rgba(245, 158, 11, 0.2)',
        text: currentColors.warning,
        border: currentColors.warning,
      };
    case 'approved':
    case 'active':
    case 'đang thuê':
    case 'sẵn sàng':
    case 'available':
      return {
        bg: currentColors.primaryLight,
        text: currentColors.primary,
        border: currentColors.primary,
      };
    case 'completed':
    case 'hoàn thành':
    case 'thành công':
      return {
        bg: mode === 'light' ? '#DCFCE7' : 'rgba(22, 163, 74, 0.2)',
        text: currentColors.success,
        border: currentColors.success,
      };
    case 'rejected':
    case 'cancelled':
    case 'dispute':
    case 'từ chối':
    case 'hủy đơn':
    case 'khiếu nại':
      return {
        bg: mode === 'light' ? '#FEE2E2' : 'rgba(220, 38, 38, 0.2)',
        text: currentColors.error,
        border: currentColors.error,
      };
    default:
      return {
        bg: currentColors.surface,
        text: currentColors.textSecondary,
        border: currentColors.border,
      };
  }
}

export const trustBadgeStyles = {
  light: {
    backgroundColor: colors.light.primaryLight,
    color: colors.light.primary,
    borderColor: colors.light.primary,
  },
  dark: {
    backgroundColor: colors.dark.primaryLight,
    color: colors.dark.primary,
    borderColor: colors.dark.primary,
  },
};

export interface ThemeContextType {
  mode: ThemeMode;
  theme: ThemeColors;
  toggleTheme: () => void;
  setMode: (mode: ThemeMode) => void;
}

const defaultContextValue: ThemeContextType = {
  mode: 'light',
  theme: colors.light,
  toggleTheme: () => {},
  setMode: () => {},
};

const ThemeContext = createContext(defaultContextValue);

export function ThemeProvider({
  children,
  initialMode = 'light',
}: {
  children: any;
  initialMode?: ThemeMode;
}) {
  const [mode, setMode] = useState(initialMode as ThemeMode);

  const toggleTheme = () => {
    setMode((prev: ThemeMode) => (prev === 'light' ? 'dark' : 'light'));
  };

  const currentTheme = mode === 'dark' ? colors.dark : colors.light;

  return (
    <ThemeContext.Provider
      value={{
        mode,
        theme: currentTheme,
        toggleTheme,
        setMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
