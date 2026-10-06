/**
 * Quy chuẩn chống Hardcode - TechShare Constants & Config
 * Quản lý tập trung các hằng số cấu hình, Magic Numbers và API Endpoints
 */

export const CONFIG = {
  // ── 1. MAGIC NUMBERS: ANIMATIONS & TIMINGS ──
  ANIMATION: {
    NOTIF_BADGE_SCALE: 1.45,
    NOTIF_BADGE_DURATION_MS: 160,
    SPRING_FRICTION: 4,
    SPRING_TENSION: 70,
    ACTIVE_OPACITY_BUTTON: 0.8,
    ACTIVE_OPACITY_CARD: 0.7,
    ACTIVE_OPACITY_PILL: 0.75,
  },

  // ── 2. MAGIC NUMBERS: LIMITS & THRESHOLDS ──
  LIMITS: {
    MAX_UNREAD_DISPLAY: 99,
    MIN_PERCENT: 0,
    MAX_PERCENT: 100,
    CHART_CEILING_MULTIPLIER: 1.18,
    DEFAULT_PAGE_SIZE: 10,
    MAX_TRUST_SCORE: 100,
    PROGRESS_BAR_HEIGHT: 10,
  },

  // ── 3. CURRENCY & UNIT FORMATTING ──
  CURRENCY: {
    LOCALE: 'vi-VN',
    SYMBOL: 'đ',
    MILLION_THRESHOLD: 1_000_000,
    THOUSAND_THRESHOLD: 1_000,
    DECIMAL_PLACES_SHORT: 1,
  },
  COMMON: {
    CURRENCY_SUFFIX: 'đ',
  },

  // ── 4. CHART CONFIG & DIMENSIONS ──
  CHART: {
    HEIGHT: 205,
    ANALYTICS_HEIGHT: 164,
    TRACK_HEIGHT: 116,
    MAX_BAR_HEIGHT: 112,
    MIN_BAR_HEIGHT: 6,
    MIN_PEAK_VALUE: 100_000,
    CEILING_MULTIPLIER: 1.18,
    DOT_RADIUS: '5',
    DOT_STROKE_WIDTH: '2.5',
    LINE_STROKE_WIDTH: 2.5,
    DASH_ARRAY: '4',
    GRID_STROKE_WIDTH: 1,
    SEGMENTS: 4,
    SHADOW_OPACITY: 0.35,
    SHADOW_FROM_OPACITY: 0.45,
    SHADOW_TO_OPACITY: 0.02,
  },

  // ── 4. API ENDPOINTS CHÍNH ──
  ENDPOINTS: {
    AUTH: {
      LOGIN: '/api/auth/login',
      REGISTER: '/api/auth/register',
      PROFILE: '/api/auth/profile',
    },
    OWNER: {
      DASHBOARD: '/api/owner/dashboard',
      ANALYTICS: '/api/owner/analytics',
      FLEET: '/api/owner/devices',
    },
    DEVICES: {
      BASE: '/api/devices',
      DETAIL: (id: string) => `/api/devices/${id}`,
      AVAILABILITY: (id: string) => `/api/devices/${id}/availability`,
    },
    BOOKINGS: {
      BASE: '/api/bookings',
      OWNER_BOOKINGS: '/api/bookings/owner',
      UPDATE_STATUS: (id: string) => `/api/bookings/${id}/status`,
    },
    NOTIFICATIONS: {
      BASE: '/api/notifications',
      UNREAD_COUNT: '/api/notifications/unread-count',
      MARK_ALL_READ: '/api/notifications/mark-all-read',
    },
  },
} as const;
