/**
 * Quy chuẩn chống Hardcode - TechShare Strings Dictionary
 * Toàn bộ chuỗi hiển thị tĩnh được quản lý tập trung tại đây.
 * Tuyệt đối không hardcode văn bản trực tiếp trong JSX.
 */

export const STRINGS = {
  COMMON: {
    CONFIRM: 'Xác nhận',
    CANCEL: 'Hủy',
    LOGOUT: 'Đăng xuất',
    SAVE: 'Lưu',
    CLOSE: 'Đóng',
    HOT: 'HOT',
    LOADING: 'Đang tải...',
    ERROR: 'Đã xảy ra lỗi',
    SUCCESS: 'Thành công',
    CURRENCY_SUFFIX: 'đ',
    BULLET_SEPARATOR: '•',
    PEAK_LABEL: 'Đỉnh: ',
    MILLION_SUFFIX: 'M',
    THOUSAND_SUFFIX: 'k',
    ZERO: '0',
  },

  OWNER_DASHBOARD: {
    TOP_BAR_TITLE: 'Bảng Điều Khiển Chủ Máy',
    TOP_BAR_SUBTITLE: 'TechShare Owner Hub',
    LOGOUT_MODAL_SUBTITLE: 'Bạn có chắc chắn muốn đăng xuất khỏi TechShare Owner Hub?',
    TRUST_PREFIX: 'Uy tín: ',
    MENU_ACCESSIBILITY_LABEL: 'Mở menu quản lý chủ máy',
    NOTIFICATION_ACCESSIBILITY_LABEL: 'Xem thông báo',
    LOGOUT_ACCESSIBILITY_LABEL: 'Đăng xuất',

    // Alert Messages
    DEVICE_RENTED_ALERT_TITLE: 'Thiết bị đang cho thuê',
    DEVICE_RENTED_ALERT_MSG:
      'Thiết bị này đang có khách thuê hoạt động. Bạn chỉ có thể thay đổi trạng thái sau khi đã nhận lại máy và hoàn tất đơn thuê.',
    DEVICE_PAUSE_ALERT_TITLE: 'Tạm dừng cho thuê thiết bị',
    DEVICE_PAUSE_ALERT_MSG: (name: string) =>
      `Bạn có chắc chắn muốn tạm dừng cho thuê thiết bị "${name}"?\n\nKhách hàng sẽ không thể tìm thấy máy trên sàn cho đến khi bạn bật lại.`,
    DEVICE_AVAILABLE_SUCCESS: 'Thiết bị đã sẵn sàng hiển thị trên sàn cho thuê.',
    DEVICE_STATUS_UPDATE_ERROR: 'Không thể cập nhật trạng thái máy lúc này. Vui lòng thử lại.',

    // Chart Legends & Defaults
    CHART_WEEK_LEGEND: 'Doanh thu 7 ngày qua (VNĐ)',
    CHART_MONTH_LEGEND: 'Doanh thu các tuần trong tháng (VNĐ)',
    DEFAULT_WEEK_LABELS: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'] as readonly string[],

    // Top Bar tabs info
    TOPBAR_KPI_TITLE: 'Bảng điều khiển KPI',
    TOPBAR_KPI_SUBTITLE: 'Chỉ số hiệu suất & doanh thu thuần',
    TOPBAR_FLEET_TITLE: 'Kho thiết bị của tôi',
    TOPBAR_FLEET_SUBTITLE: (count: number) => `Quản lý ${count} máy • Bật/tắt cho thuê`,
    TOPBAR_AI_TITLE: 'Trợ lý Thông minh AI',
    TOPBAR_AI_SUBTITLE: 'Định giá & tự động hóa tối ưu doanh thu',

    // Tabs
    TAB_OVERVIEW: 'Hiệu suất & Doanh thu',
    TAB_FLEET: 'Kho thiết bị',
    TAB_AI_TOOLS: 'Trợ lý AI',

    // Period selector
    PERIOD_WEEK: 'Tuần',
    PERIOD_MONTH: 'Tháng',

    // Performance Section
    SECTION_PERFORMANCE: 'Hiệu Suất & Doanh Thu',
    KPI_NET_REVENUE: 'Doanh thu thuần',
    KPI_RENTAL_COUNT: 'Lượt cho thuê',
    KPI_ACTIVE_RENTALS: 'Đang cho thuê',
    KPI_OCCUPANCY_RATE: 'Tỷ lệ lấp đầy',
    UNIT_RENTAL_COUNT: 'lượt',
    UNIT_DEVICES: 'máy',

    // Wallet Section
    WALLET_AVAILABLE_BALANCE: 'Số dư ví khả dụng',
    WALLET_WITHDRAW_BUTTON: 'Rút tiền',
    WALLET_ESCROW_HOLDING: 'Cọc đang giữ hộ (Escrow)',
    WALLET_MONTHLY_REVENUE: 'Doanh thu tháng này',
    WALLET_WITHDRAW_ALERT_TITLE: 'Yêu cầu rút tiền về ngân hàng',
    WALLET_WITHDRAW_ALERT_MSG: (balance: string) =>
      `Số dư khả dụng hiện tại: ${balance}.\nLệnh rút tiền về tài khoản ngân hàng liên kết Vietcombank (*8899) đang được xử lý trong 5-10 phút.`,

    // Fleet Section
    FLEET_MAIN_TITLE: 'Kho Máy Của Tôi',
    FLEET_MAIN_SUBTITLE: (count: number) =>
      `Tổng cộng ${count} thiết bị • Quản lý tình trạng cho thuê`,
    FLEET_ADD_DEVICE_BTN: 'Đăng máy',
    FLEET_ADD_DEVICE_NEW_BTN: 'Đăng thiết bị mới',
    FLEET_FILTER_ALL: (count: number) => `Tất cả (${count})`,
    FLEET_FILTER_RENTED: (count: number) => `Đang thuê (${count})`,
    FLEET_FILTER_AVAILABLE: (count: number) => `Sẵn sàng (${count})`,
    FLEET_EMPTY_TITLE: 'Không có thiết bị phù hợp',
    FLEET_EMPTY_RENTED_DESC: 'Hiện chưa có thiết bị nào đang trong trạng thái cho thuê.',
    FLEET_EMPTY_DEFAULT_DESC: 'Hiện không có thiết bị nào trong danh mục này.',
    FLEET_STATUS_RENTED: 'Đang thuê',
    FLEET_STATUS_AVAILABLE: 'Sẵn sàng',
    FLEET_STATUS_MAINTENANCE: 'Tạm ẩn',
    FLEET_SWITCH_ENABLE: 'Bật cho thuê',
    FLEET_PRICE_UNIT: 'đ/ngày',
    FLEET_RENTAL_COUNT_SUFFIX: 'lượt thuê',
    FLEET_TOTAL_EARNED: (amount: string) => `Thu về: ${amount}`,
    FLEET_SWITCH_CONFIRM_TITLE: 'Xác nhận thay đổi trạng thái',
    FLEET_SWITCH_CONFIRM_MSG: (name: string, isAvailable: boolean) =>
      `Bạn có chắc muốn ${isAvailable ? 'tạm ẩn' : 'bật cho thuê lại'} thiết bị "${name}"?`,
  },

  AI_TOOLS: {
    HEADER_TITLE: 'Trợ Lý Thông Minh AI',
    HEADER_SUBTITLE:
      'Bộ công cụ trí tuệ nhân tạo độc quyền giúp chủ máy tối ưu giá thuê, tăng tỷ lệ lấp đầy và tự động soạn tin.',

    SMART_PRICING_TITLE: 'Định giá Thông minh AI',
    SMART_PRICING_DESC:
      'Gợi ý mức giá cạnh tranh nhất theo thời gian thực để tối đa hóa doanh thu và tỷ lệ lấp đầy máy.',
    SMART_PRICING_ACTION: 'Phân tích giá thị trường',
    SMART_PRICING_ALERT_TITLE: 'Trợ lý Định giá Thông minh AI',
    SMART_PRICING_ALERT_MSG:
      'AI phân tích nhu cầu thị trường hiện tại: Model Sony A7 IV đang có nhu cầu cao cuối tuần này, giá thuê đề xuất tối ưu: 480.000 đ/ngày (+7%).',

    AUTO_LISTING_TITLE: 'Trợ lý Soạn Tin Đăng AI',
    AUTO_LISTING_DESC:
      'Tự động sinh tiêu đề cuốn hút, mô tả chi tiết và điền bảng thông số kỹ thuật chuẩn công nghệ.',
    AUTO_LISTING_ACTION: 'Đăng máy với AI',
    AUTO_LISTING_ALERT_TITLE: 'Soạn bài AI',
    AUTO_LISTING_ALERT_MSG: 'Chuyển sang màn hình Đăng thiết bị để kích hoạt.',

    DEMAND_FORECAST_TITLE: 'Dự báo Nhu cầu Thuê AI',
    DEMAND_FORECAST_DESC:
      'Phân tích lịch nghỉ lễ và sự kiện công nghệ sắp diễn ra để dự báo trước các dòng máy sẽ cháy hàng.',
    DEMAND_FORECAST_ACTION: 'Xem xu hướng mùa vụ',
    DEMAND_FORECAST_ALERT_TITLE: 'Dự báo Nhu cầu Thuê AI',
    DEMAND_FORECAST_ALERT_MSG:
      'Dự báo dịp nghỉ lễ sắp tới:\n• Máy ảnh & Gimbal: Tăng +42% nhu cầu thuê du lịch.\n• Laptop gaming: Tăng +28%.\nKhuyến nghị: Bật sẵn sàng các thiết bị này để đón khách đặt sớm.',

    TRUST_REVIEW_TITLE: 'Tối ưu Uy tín & Đánh giá AI',
    TRUST_REVIEW_DESC:
      'Tự động trích xuất phản hồi khen/chê từ khách thuê, gợi ý cách cải thiện dịch vụ để giữ danh hiệu Top Owner.',
    TRUST_REVIEW_ACTION: 'Xem báo cáo đánh giá',
    TRUST_REVIEW_ALERT_TITLE: 'Tối ưu Uy tín & Đánh giá AI',
    TRUST_REVIEW_ALERT_MSG:
      'Điểm uy tín hiện tại: 100/100.\n100% đánh giá 5 sao từ khách thuê gần nhất khen ngợi: Giao máy đúng giờ, thiết bị sạch sẽ, pin sạc đầy đủ.',
  },

  ANALYTICS: {
    UTILIZATION_RATE_LABEL: 'Tỷ lệ lấp đầy kho',
    RENTED_DEVICES_RATIO: (rented: number, total: number) =>
      `${rented} / ${total} máy đang cho thuê`,
    TOTAL_DEVICES: 'Tổng thiết bị',
    RENTED_DEVICES: 'Đang cho thuê',
    AVAILABLE_DEVICES: 'Sẵn sàng thuê',
    TOTAL_REVENUE: 'Tổng Doanh Thu Tích Lũy',
    REVENUE_GROWTH_STABLE: 'Tăng trưởng ổn định',
    REVENUE_GROWTH_PCT: (pct: number) => `${pct >= 0 ? '+' : ''}${pct}%`,
    REVENUE_GROWTH_SUB_DEFAULT: 'Doanh thu thuần từ các đơn thuê hoàn tất',
    REVENUE_GROWTH_SUB_COMPARE: 'so với chu kỳ trước',
    CHART_DAILY_LABEL: 'Biến động doanh thu theo ngày',
    CHART_WEEKLY_LABEL: 'Biến động doanh thu theo tuần',
    RENTER_PREFIX: 'Khách thuê: ',
    STATUS_COMPLETED: 'Hoàn tất',
  },
} as const;
