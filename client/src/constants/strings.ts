/**
 * TechShare Strings Dictionary
 * Centralized strings repository for multi-language and anti-hardcoding standard.
 */

export const STRINGS = {
  COMMON: {
    CONFIRM: 'Confirm',
    CANCEL: 'Cancel',
    LOGOUT: 'Log Out',
    SAVE: 'Save',
    CLOSE: 'Close',
    HOT: 'HOT',
    LOADING: 'Loading...',
    ERROR: 'An error occurred',
    SUCCESS: 'Success',
    CURRENCY_SUFFIX: 'VND',
    BULLET_SEPARATOR: '•',
    PEAK_LABEL: 'Peak: ',
    MILLION_SUFFIX: 'M',
    THOUSAND_SUFFIX: 'k',
    ZERO: '0',
  },

  OWNER_DASHBOARD: {
    TOP_BAR_TITLE: 'Owner Dashboard',
    TOP_BAR_SUBTITLE: 'TechShare Owner Hub',
    LOGOUT_MODAL_SUBTITLE: 'Are you sure you want to sign out from TechShare Owner Hub?',
    TRUST_PREFIX: 'Trust: ',
    MENU_ACCESSIBILITY_LABEL: 'Open owner navigation menu',
    NOTIFICATION_ACCESSIBILITY_LABEL: 'View notifications',
    LOGOUT_ACCESSIBILITY_LABEL: 'Sign out',

    // Alert Messages
    DEVICE_RENTED_ALERT_TITLE: 'Device Currently Rented',
    DEVICE_RENTED_ALERT_MSG:
      'This device is actively on rent. You can only modify availability after receiving it back and completing the order.',
    DEVICE_PAUSE_ALERT_TITLE: 'Pause Device Listing',
    DEVICE_PAUSE_ALERT_MSG: (name: string) =>
      `Are you sure you want to pause listing for "${name}"?\n\nRenters will not be able to find or book it until you re-enable it.`,
    DEVICE_AVAILABLE_SUCCESS: 'Device is now available on the rental marketplace.',
    DEVICE_STATUS_UPDATE_ERROR: 'Unable to update device status. Please try again.',

    // Chart Legends & Defaults
    CHART_WEEK_LEGEND: 'Revenue last 7 days (VND)',
    CHART_MONTH_LEGEND: 'Weekly revenue this month (VND)',
    DEFAULT_WEEK_LABELS: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as readonly string[],

    // Top Bar tabs info
    TOPBAR_KPI_TITLE: 'KPI & Performance Hub',
    TOPBAR_KPI_SUBTITLE: 'Performance metrics & net revenue',
    TOPBAR_FLEET_TITLE: 'My Device Inventory',
    TOPBAR_FLEET_SUBTITLE: (count: number) => `Manage ${count} devices • Toggle listing`,
    TOPBAR_AI_TITLE: 'AI Smart Assistant',
    TOPBAR_AI_SUBTITLE: 'Dynamic pricing & revenue optimization',

    // Tabs
    TAB_OVERVIEW: 'Performance & Revenue',
    TAB_FLEET: 'Device Fleet',
    TAB_AI_TOOLS: 'AI Tools',

    // Period selector
    PERIOD_WEEK: 'Week',
    PERIOD_MONTH: 'Month',

    // Performance Section
    SECTION_PERFORMANCE: 'Performance & Revenue',
    KPI_NET_REVENUE: 'Net Revenue',
    KPI_RENTAL_COUNT: 'Total Rentals',
    KPI_ACTIVE_RENTALS: 'Active Rentals',
    KPI_OCCUPANCY_RATE: 'Occupancy Rate',
    UNIT_RENTAL_COUNT: 'orders',
    UNIT_DEVICES: 'devices',

    // Wallet Section
    WALLET_AVAILABLE_BALANCE: 'Available Balance',
    WALLET_WITHDRAW_BUTTON: 'Withdraw',
    WALLET_ESCROW_HOLDING: 'Escrow Holding',
    WALLET_MONTHLY_REVENUE: 'Monthly Revenue',
    WALLET_WITHDRAW_ALERT_TITLE: 'Bank Withdrawal Request',
    WALLET_WITHDRAW_ALERT_MSG: (balance: string) =>
      `Current available balance: ${balance}.\nWithdrawal request to linked Vietcombank account (*8899) is being processed in 5-10 minutes.`,

    // Fleet Section
    FLEET_MAIN_TITLE: 'My Device Fleet',
    FLEET_MAIN_SUBTITLE: (count: number) =>
      `Total ${count} devices • Manage availability`,
    FLEET_ADD_DEVICE_BTN: 'Add Device',
    FLEET_ADD_DEVICE_NEW_BTN: 'List New Device',
    FLEET_FILTER_ALL: (count: number) => `All (${count})`,
    FLEET_FILTER_RENTED: (count: number) => `Rented (${count})`,
    FLEET_FILTER_AVAILABLE: (count: number) => `Available (${count})`,
    FLEET_EMPTY_TITLE: 'No matching devices',
    FLEET_EMPTY_RENTED_DESC: 'No devices currently on rent.',
    FLEET_EMPTY_DEFAULT_DESC: 'No devices found in this category.',
    FLEET_STATUS_RENTED: 'Rented',
    FLEET_STATUS_AVAILABLE: 'Available',
    FLEET_STATUS_MAINTENANCE: 'Hidden',
    FLEET_SWITCH_ENABLE: 'Enable Listing',
    FLEET_PRICE_UNIT: 'VND/day',
    FLEET_RENTAL_COUNT_SUFFIX: 'rentals',
    FLEET_TOTAL_EARNED: (amount: string) => `Earned: ${amount}`,
    FLEET_SWITCH_CONFIRM_TITLE: 'Confirm Status Change',
    FLEET_SWITCH_CONFIRM_MSG: (name: string, isAvailable: boolean) =>
      `Are you sure you want to ${isAvailable ? 'hide' : 'make available'} "${name}"?`,
  },

  AI_TOOLS: {
    HEADER_TITLE: 'AI Smart Assistant',
    HEADER_SUBTITLE:
      'Exclusive AI toolset helping owners optimize rental rates, increase occupancy, and auto-generate listings.',

    SMART_PRICING_TITLE: 'AI Dynamic Pricing',
    SMART_PRICING_DESC:
      'Real-time competitive pricing recommendations to maximize total earnings and device utilization.',
    SMART_PRICING_ACTION: 'Analyze Market Rates',
    SMART_PRICING_ALERT_TITLE: 'AI Smart Pricing Assistant',
    SMART_PRICING_ALERT_MSG:
      'Market demand analysis: Sony A7 IV has high demand this weekend. Optimal suggested rate: 480,000 VND/day (+7%).',

    AUTO_LISTING_TITLE: 'AI Listing Copywriter',
    AUTO_LISTING_DESC:
      'Automatically generates catchy titles, rich technical descriptions, and auto-fills spec sheets.',
    AUTO_LISTING_ACTION: 'Create Listing with AI',
    AUTO_LISTING_ALERT_TITLE: 'AI Copywriter',
    AUTO_LISTING_ALERT_MSG: 'Navigate to List Device screen to activate AI drafting.',

    DEMAND_FORECAST_TITLE: 'AI Rental Demand Forecast',
    DEMAND_FORECAST_DESC:
      'Analyzes upcoming holidays and tech events to predict high-demand gadget categories.',
    DEMAND_FORECAST_ACTION: 'View Seasonal Trends',
    DEMAND_FORECAST_ALERT_TITLE: 'AI Demand Forecast',
    DEMAND_FORECAST_ALERT_MSG:
      'Upcoming holiday forecast:\n• Cameras & Gimbals: +42% travel rental demand.\n• Gaming laptops: +28%.\nRecommendation: Keep these devices ready for early bookings.',

    TRUST_REVIEW_TITLE: 'AI Reputation & Review Optimizer',
    TRUST_REVIEW_DESC:
      'Analyzes renter feedback, highlights strengths, and suggests service improvements to maintain Top Owner badge.',
    TRUST_REVIEW_ACTION: 'View Feedback Report',
    TRUST_REVIEW_ALERT_TITLE: 'AI Reputation Optimizer',
    TRUST_REVIEW_ALERT_MSG:
      'Current trust score: 100/100.\n100% 5-star reviews praise: Punctual handover, spotless device, fully charged accessories.',
  },

  ANALYTICS: {
    UTILIZATION_RATE_LABEL: 'Fleet Utilization Rate',
    RENTED_DEVICES_RATIO: (rented: number, total: number) =>
      `${rented} / ${total} devices currently rented`,
    TOTAL_DEVICES: 'Total Devices',
    RENTED_DEVICES: 'Currently Rented',
    AVAILABLE_DEVICES: 'Available',
    TOTAL_REVENUE: 'Cumulative Total Revenue',
    REVENUE_GROWTH_STABLE: 'Steady Growth',
    REVENUE_GROWTH_PCT: (pct: number) => `${pct >= 0 ? '+' : ''}${pct}%`,
    REVENUE_GROWTH_SUB_DEFAULT: 'Net revenue from completed rental orders',
    REVENUE_GROWTH_SUB_COMPARE: 'compared to previous period',
    CHART_DAILY_LABEL: 'Daily Revenue Trend',
    CHART_WEEKLY_LABEL: 'Weekly Revenue Trend',
    RENTER_PREFIX: 'Renter: ',
    STATUS_COMPLETED: 'Completed',
  },
} as const;
