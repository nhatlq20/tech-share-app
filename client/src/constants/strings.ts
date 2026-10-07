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
    RETRY: 'Retry',
    TOTAL: 'Total',
    DATE: 'Date',
    STATUS: 'Status',
    PLEASE_SELECT: 'Please select',
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

  OWNER_ANALYTICS: {
    TOP_BAR_TITLE: 'Revenue & Analytics',
    TOP_BAR_SUBTITLE: 'Cash flow & rental fleet performance reports',
    MENU_ACCESSIBILITY_LABEL: 'Open owner navigation menu',
    ROLE_REQUIRED_TITLE: 'Owner Access Required',
    ROLE_REQUIRED_SUBTITLE: 'You need to sign in with an Owner account to access analytics.',
    LOADING_TEXT: 'Loading revenue analytics...',
    ERROR_TITLE: 'Unable to Load Analytics',
    SECTION_REVENUE_TREND: 'Revenue Fluctuation',
    SECTION_UTILIZATION: 'Fleet Utilization Performance',
    SECTION_DEVICE_STATS: 'Device Status Breakdown',
    SECTION_PAYMENT_HISTORY: 'Payment History & Statements',
    EMPTY_PAYMENT_TITLE: 'No Payment Transactions Yet',
    EMPTY_PAYMENT_DESC: 'Revenue collected from completed rentals will appear here.',
    WEEKDAYS: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as readonly string[],
    VN_WEEKDAYS: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'] as readonly string[],
  },

  AVAILABILITY: {
    MODAL_TITLE: 'Manage Availability',
    DESCRIPTION: 'Block dates when you need to use this device.',
    MODE_SINGLE: 'Single dates',
    MODE_RANGE: 'Date range',
    PREV_MONTH_ACCESSIBILITY: 'Previous month',
    NEXT_MONTH_ACCESSIBILITY: 'Next month',
    WEEKDAYS: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as readonly string[],
    SELECTED_TITLE: 'Selected blocked dates',
    NO_DATES_SELECTED: 'No blocked dates selected.',
    BLOCKED_DATE_ITEM: (date: string) => `Blocked Date: ${date}`,
    TOTAL_DAYS: (count: number) => `Total: ${count} days`,
    START_DATE: (date: string) => `Start Date: ${date}`,
    END_DATE: (date: string) => `End Date: ${date}`,
    PLEASE_SELECT: 'Please select',
    SAVE_CHANGES: 'Save Changes',
    ALERT_SELECT_RANGE: 'Please select start date and end date',
    ALERT_SELECT_SINGLE: 'Please select at least one date',
    ALERT_SUCCESS_TITLE: 'Success',
    ALERT_SUCCESS_MSG: 'Updated blocked dates successfully.',
    ALERT_ERROR_TITLE: 'Error',
    ALERT_ERROR_MSG: 'Failed to update blocked dates. Please try again.',
    MONTH_NAME: (date: Date) => date.toLocaleString('default', { month: 'long' }),
  },

  ADMIN_SIDEBAR: {
    BRAND_TITLE: 'TechShare Admin',
    BRAND_SUBTITLE: 'Control Center',
    DEFAULT_ADMIN_NAME: 'Administrator',
    DEFAULT_ADMIN_EMAIL: 'admin@techshare.vn',
    ROLE_BADGE: 'System Administrator',
    SECTION_HEADER: 'SYSTEM ADMINISTRATION',
    MENU_OVERVIEW: 'Dashboard & KPIs',
    MENU_USERS: 'User Management',
    MENU_DEVICES: 'Device Moderation',
    MENU_DISPUTES: 'Deposit Disputes',
    MENU_EKYC: 'eKYC Reviews',
    MENU_VOUCHERS: 'Vouchers & Promotions',
    LOGOUT_BUTTON: 'Sign Out of Admin Session',
    LOGOUT_CONFIRM_SUBTITLE: 'Are you sure you want to end this session and sign out of TechShare Admin?',
  },

  OWNER_SIDEBAR: {
    BRAND_TITLE: 'TechShare Owner',
    BRAND_SUBTITLE: 'Owner Operations Portal',
    DEFAULT_OWNER_NAME: 'Owner',
    DEFAULT_OWNER_EMAIL: 'owner@techshare.vn',
    ROLE_BADGE: 'Top Owner',
    TRUST_LABEL: (score: number) => `Trust: ${score}`,
    SECTION_HEADER: 'OWNER MENU',
    MENU_OVERVIEW: 'Dashboard & KPIs',
    MENU_ANALYTICS: 'Revenue & Analytics',
    MENU_ORDERS: 'Pending Bookings',
    MENU_FLEET: 'My Device Inventory',
    MENU_POST_DEVICE: 'List a New Device',
    MENU_WALLET: 'Revenue & Deposit Wallet',
    MENU_AI_TOOLS: 'AI Assistant',
    MENU_RENTER_MODE: 'Switch to Renter Mode',
    MENU_NOTIFICATIONS: 'System Notifications',
    TASKS_SUFFIX: 'tasks',
    NEW_SUFFIX: 'new',
    LOGOUT_BUTTON: 'Sign Out of Owner Session',
    LOGOUT_CONFIRM_TITLE: 'Confirm Sign Out',
    LOGOUT_CONFIRM_SUBTITLE: 'Are you sure you want to end this session and sign out of TechShare Owner?',
  },

  OWNER_NAV: {
    BOOKING_MANAGE_TITLE: 'Booking Management',
    BOOKING_MANAGE_DRAWER: 'Booking Management',
    ANALYTICS_TITLE: 'Owner Analytics',
    ANALYTICS_DRAWER: 'Revenue & Analytics',
    POST_DEVICE_TITLE: 'Post Device',
    POST_DEVICE_DRAWER: 'List New Device',
    NOTIFICATION_TITLE: 'Notification',
    NOTIFICATION_DRAWER: 'System Notifications',
  },

  LOGOUT_MODAL: {
    DEFAULT_TITLE: 'Confirm Sign Out',
    DEFAULT_SUBTITLE: 'Are you sure you want to end this session and sign out of your account?',
    DEFAULT_CONFIRM: 'Log Out',
    DEFAULT_CANCEL: 'Cancel',
    CLOSE_ACCESSIBILITY: 'Close modal',
  },

  DEVICE_STATUS: {
    LABEL_GROUP: 'Device status',
    AVAILABLE: 'Available',
    MAINTENANCE: 'Maintenance',
    HIDDEN: 'Hidden',
  },

  NOTIFICATION_SCREEN: {
    HEADER_TITLE: 'Notifications',
    MENU_ACCESSIBILITY_LABEL: 'Open owner navigation menu',
    BACK_ACCESSIBILITY_LABEL: 'Back',
    MARK_ALL_READ: 'Mark all as read',
    LOADING: 'Loading notifications...',
    EMPTY_TITLE: 'No notifications',
    EMPTY_SUBTITLE_ALL: 'You will receive updates about rental orders and new offers here.',
    EMPTY_SUBTITLE_FILTER: 'No notifications match this filter.',
    DELETE_ACCESSIBILITY_LABEL: 'Delete notification',
    TABS: {
      ALL: 'All',
      ORDER: 'Orders',
      REMINDER: 'Reminders',
      SYSTEM: 'System',
      PROMO: 'Promotions',
    },
    TYPES: {
      ORDER: 'Order',
      REMINDER: 'Reminder',
      PROMO: 'Promotion',
      MESSAGE: 'Message',
      SYSTEM: 'System',
    },
    TIME: {
      JUST_NOW: 'Just now',
      MINUTES_AGO: (mins: number) => `${mins}m ago`,
      HOURS_AGO: (hours: number) => `${hours}h ago`,
      YESTERDAY: 'Yesterday',
      DAYS_AGO: (days: number) => `${days}d ago`,
    },
  },

  MY_DEVICES: {
    TITLE: 'My Devices',
    SUBTITLE: 'Manage your listed devices',
    BACK_ACCESSIBILITY_LABEL: 'Back to Profile',
    LOADING: 'Loading your devices...',
    ERROR_TITLE: 'Unable to load devices',
    ERROR_DEFAULT: 'Cannot load your devices. Please check the server.',
    PRICE_UNIT: ' / day',
    RENTALS_LABEL: 'Rentals',
    RATING_LABEL: 'Rating',
    DEVICE_STATUS_LABEL: 'Device Status',
    MANAGE_AVAILABILITY: 'Manage Availability',
    EMPTY_TITLE: 'No devices yet',
    EMPTY_DESC: "You haven't listed any devices.",
  },

  BOOKING_MANAGE: {
    HEADER_TITLE: 'Booking Management',
    HEADER_SUBTITLE: 'Approve, Handover & Track',
    SCAN_QR: 'Scan QR',
    SEARCH_PLACEHOLDER: 'Search by code, device or renter name...',
    METRIC_PENDING: 'Pending',
    METRIC_ACTIVE: 'Active Rentals',
    METRIC_REVENUE: 'Active Revenue',
    TAB_PENDING: 'Pending',
    TAB_RENTING: 'Active & Renting',
    TAB_HISTORY: 'History',
    LOADING_ORDERS: 'Loading your booking orders...',
    CLEAR_SEARCH: 'Clear search filter',
    EMPTY_PENDING_TITLE: 'No pending bookings',
    EMPTY_RENTING_TITLE: 'No devices currently rented',
    EMPTY_HISTORY_TITLE: 'No order history yet',
    EMPTY_PENDING_SUB: 'All rental requests have been reviewed. When a renter books a device, it will appear here.',
    EMPTY_RENTING_SUB: 'Approved bookings waiting for handover or active ongoing rentals will appear here.',
    EMPTY_HISTORY_SUB: 'Completed, cancelled, or rejected booking records are archived here.',
    CONFIRM_APPROVE_TITLE: 'Confirm Approval 📦',
    CONFIRM_APPROVE_MSG: (code: string, renterName: string) =>
      `Approve booking #${code} for ${renterName}?\n\nInstant confirmation notification will be sent to the renter.`,
    APPROVE_NOW: 'Approve Now',
    APPROVE_SUCCESS_TITLE: 'Approved Successfully! 🎉',
    APPROVE_SUCCESS_MSG: (code: string) =>
      `Booking #${code} is approved. Please prepare the device for handover.`,
    APPROVE_ERROR_DEFAULT: 'Unable to approve booking at this time.',
    HANDOVER_TITLE: 'Device Handover 📱',
    HANDOVER_MSG: (deviceName: string, renterName: string) =>
      `Confirm handover of "${deviceName}" to ${renterName}?\n\nThe booking will activate and the rental period begins now.`,
    CONFIRM_HANDOVER: 'Confirm Handover',
    HANDOVER_SUCCESS_TITLE: 'Handover Successful 🎉',
    HANDOVER_SUCCESS_MSG: (code: string) =>
      `Device handed over. Booking #${code} is now active.`,
    HANDOVER_ERROR_DEFAULT: 'Unable to handover booking at this time.',
    COMPLETE_TITLE: 'Receive Device & Complete 💰',
    COMPLETE_MSG: (deviceName: string, deposit: string, income: string) =>
      `Have you inspected "${deviceName}" and confirmed it is returned in good condition?\n\n• Deposit: ${deposit} VND will be refunded to renter.\n• Earnings: +${income} VND will be credited to your wallet.`,
    CONFIRM_COMPLETE: 'Confirm & Complete',
    RECHECK: 'Recheck',
    COMPLETE_SUCCESS_TITLE: 'Rental Completed 🎉',
    COMPLETE_SUCCESS_MSG: (code: string) =>
      `Booking #${code} is completed. Deposit refunded and earnings credited.`,
    COMPLETE_ERROR_DEFAULT: 'Unable to complete booking at this time.',
    ALREADY_RATED_TITLE: 'Already Rated',
    ALREADY_RATED_MSG: 'You have already rated the renter for this booking.',
    REJECT_MODAL_TITLE: 'Reject Booking Request',
    REJECT_MODAL_DESC: (code: string) =>
      `Select a reason for declining booking #${code}. This reason will be provided to the renter.`,
    REJECT_SUCCESS_TITLE: 'Booking Rejected',
    REJECT_SUCCESS_MSG: (code: string) => `Booking #${code} has been rejected.`,
    REJECT_ERROR_DEFAULT: 'Unable to reject booking at this time.',
    CONFIRM_REJECT: 'Confirm Rejection',
    CUSTOM_REASON_PLACEHOLDER: 'Enter detailed reason for rejection...',
    REJECT_REASONS: [
      'Device under maintenance or unavailable',
      'Unexpected personal scheduling conflict',
      'Inconvenient pickup/handover time or location',
      'Renter unresponsive to verification requests',
      'Other reason',
    ] as readonly string[],
    OTHER_REASON: 'Other reason',
    DEFAULT_RENTER_NAME: 'renter',
    DEFAULT_DEVICE_NAME: 'device',
  },
} as const;

