---
name: techshare-theme
description: Bảng màu và quy tắc áp dụng theme "Trắng - Xanh dương" cho ứng dụng TechShare (React Native/Expo). Dùng skill này bất cứ khi nào code hoặc thiết kế UI cho TechShare - màn hình mới, component, mockup - để đảm bảo màu sắc nhất quán giữa các thành viên trong nhóm, kể cả khi người dùng chỉ nói "làm UI cho màn hình X" mà không nhắc lại theme.
---

# TechShare Theme — Trắng & Xanh dương

Bảng màu chính thức cho toàn bộ giao diện TechShare (đồ án MMA301). Áp dụng bảng này cho **mọi** màn hình, component, hoặc mockup được tạo ra, trừ khi người dùng yêu cầu khác.

## Nguyên tắc chọn màu
Xanh dương làm màu thương hiệu vì tạo cảm giác tin cậy — phù hợp với một app có cọc tiền, hợp đồng điện tử, xác thực eKYC. Nền trắng/sáng giữ giao diện sạch để ảnh thiết bị (sản phẩm) là điểm nhấn thị giác chính, không bị màu nền cạnh tranh.

## Light Mode (mặc định)

| Vai trò | Mã màu | Dùng cho |
|---|---|---|
| Primary | `#2563EB` | Nút CTA, tab đang active, link |
| Primary Dark | `#1D4ED8` | Trạng thái pressed/hover của Primary |
| Primary Light | `#DBEAFE` | Nền badge, chip filter, highlight nhẹ |
| Background | `#FFFFFF` | Nền chính toàn app |
| Surface | `#F8FAFC` | Nền card, input field |
| Border | `#E2E8F0` | Viền card, divider |
| Text Primary | `#0F172A` | Tiêu đề, nội dung chính |
| Text Secondary | `#64748B` | Mô tả phụ, placeholder |
| Success | `#16A34A` | Đơn `completed`, trạng thái thành công |
| Warning | `#F59E0B` | Đơn `pending`, sắp hết hạn trả máy |
| Error/Danger | `#DC2626` | Hủy đơn, dispute, cảnh báo |
| Rating Star | `#FBBF24` | Sao đánh giá — cố tình khác `Warning` để không gây nhầm lẫn |

## Dark Mode

| Vai trò | Mã màu |
|---|---|
| Background | `#0B1220` |
| Surface (card) | `#151E2E` |
| Primary | `#60A5FA` |
| Border | `#1F2A3D` |
| Text Primary | `#F1F5F9` |
| Text Secondary | `#94A3B8` |

> Primary ở Dark Mode sáng hơn bản Light (`#60A5FA` thay vì `#2563EB`) để đủ độ tương phản trên nền tối. Success/Warning/Error/Rating Star giữ nguyên mã ở cả hai mode.

## Quy tắc áp dụng theo màn hình

- **Onboarding & CTA chính** (Đặt thuê ngay, Đăng ký): nút full-width màu `Primary`, chữ trắng, bo góc 12px.
- **Trust badge (`isVerified`)**: nền `Primary Light` + icon check màu `Primary` — không dùng xanh lá để tránh trùng với `Success`.
- **Bản đồ GPS marker**: marker mặc định dùng `Primary`; marker máy sắp hết ngày trống dùng `Warning`.
- **Trạng thái đơn thuê** (dùng đúng bảng màu, không tự chế thêm màu khác):
  - `pending` → `Warning`
  - `approved` / `active` → `Primary`
  - `completed` → `Success`
  - `rejected` / `cancelled` → `Error`
- **Rating sao**: luôn `Rating Star (#FBBF24)`, không dùng `Warning`.

## Khi implement trong React Native / Expo

Định nghĩa màu tập trung một chỗ (VD: `theme/colors.js`), không hardcode mã hex rải rác trong từng component:

```js
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
```

Khi tạo component/màn hình mới cho TechShare, luôn import từ `theme/colors.js` thay vì viết mã hex trực tiếp.
