# TECHSHARE - NỀN TẢNG CHIA SẺ/CHO THUÊ THIẾT BỊ CÔNG NGHỆ & TỔNG HỢP REVIEW AI
>
> **DỰ ÁN MÔN HỌC MMA301 - CROSS-PLATFORM MOBILE APPLICATIONS DEVELOPMENT (20% TỔNG ĐIỂM)**  
> **Quy mô nhóm**: 5 thành viên | **Công nghệ**: React Native (Expo SDK 57), Node.js, MongoDB Atlas (Unified NoSQL), Google Gemini AI

---

## 📱 TỔNG QUAN DỰ ÁN

**TechShare** là ứng dụng di động kết nối cộng đồng người làm nội dung (Reviewer, Creator) và người đam mê công nghệ:

- **Chia sẻ & Cho thuê ngắn hạn**: Thuê máy flagship, laptop đồ họa, máy ảnh mirrorless, lens, drone... với chi phí hợp lý và thủ tục minh bạch.
- **Trợ lý AI tổng hợp Review**: Tích hợp Google Gemini AI tự động phân tích hàng trăm bài đánh giá, rút trích ưu/nhược điểm và gợi ý thiết bị phù hợp với nhu cầu.
- **Tìm kiếm thông minh trên Bản đồ**: Định vị vị trí các thiết bị cho thuê quanh bán kính người dùng với `react-native-maps`, `expo-location` và MongoDB GeoJSON `2dsphere`.
- **Trải nghiệm Ngoại tuyến (Offline-First)**: Lưu đệm các thiết bị yêu thích và đơn nháp qua AsyncStorage đồng nhất dữ liệu NoSQL với MongoDB Atlas để xem lại khi không có kết nối Internet.

---

## 🚀 HƯỚNG DẪN CÀI ĐẶT & CHẠY DỰ ÁN

### 1. Khởi chạy Backend Server (`server/`)

```bash
cd server
npm install
# Tạo file .env từ .env.example (cấu hình MONGODB_URI và GEMINI_API_KEY)
npm run dev       # Khởi chạy server tại http://localhost:5000
npm run seed      # Nạp dữ liệu mẫu 10 thiết bị công nghệ (tuỳ chọn)
```

### 2. Khởi chạy Mobile App (`client/`)

```bash
cd client
npm install
npx expo start
```

- Quét mã QR bằng ứng dụng **Expo Go** trên điện thoại Android/iOS (cùng mạng Wi-Fi với máy tính).
- Hoặc bấm phím `a` để mở trên Android Emulator, bấm `w` để chạy trên Web.

---

## 👥 PHÂN CHIA NHIỆM VỤ 5 THÀNH VIÊN

Xem chi tiết bảng phân công và kịch bản demo 15 phút tại: [docs/TEAM_ROLES.md](file:///E:/Repo/tech-share/docs/TEAM_ROLES.md).
