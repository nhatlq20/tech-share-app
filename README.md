

## ⚙️ YÊU CẦU MÔI TRƯỜNG (PREREQUISITES)

Trước khi chạy dự án, hãy đảm bảo máy tính của bạn đã cài đặt:
1. **Node.js**: Phiên bản `>= 18.x` (khuyên dùng Node LTS 20.x, 22.x hoặc 24.x). Kiểm tra bằng:
   ```bash
   node -v
   ```
2. **npm**: Đi kèm với Node.js (`npm -v`).
3. **Ứng dụng Expo Go**: Cài đặt sẵn trên điện thoại [Android (Google Play)](https://play.google.com/store/apps/details?id=host.exp.exponent) hoặc [iOS (App Store)](https://apps.apple.com/app/expo-go/id982107779). *(Hoặc máy ảo Android Studio / iOS Simulator)*.

---

## 🚀 HƯỚNG DẪN CÀI ĐẶT & CHẠY DỰ ÁN (A-Z)

### CÁCH 1: Khởi chạy nhanh từ thư mục gốc (Khuyên dùng)

Dự án đã được tích hợp sẵn script chạy tại thư mục gốc:

#### Bước 1: Cài đặt toàn bộ thư viện cho cả Backend & Client
Mở Terminal tại thư mục gốc của dự án:
```bash
npm run install:all
```

#### Bước 2: Cấu hình biến môi trường Backend (`server/.env`)
Kiểm tra file `server/.env` (đã có sẵn mẫu tại `server/.env.example`):
```ini
PORT=5000
MONGODB_URI=mongodb+srv://qnhat202005_db_user:qnhat202005@tech-share.0srn8rv.mongodb.net/techshare?retryWrites=true&w=majority&appName=tech-share
JWT_SECRET=techshare_mma301_super_secret_jwt_key_2026
GEMINI_API_KEY=your_gemini_api_key_here
NODE_ENV=development
```
> **Lưu ý về Gemini AI**: Để sử dụng tính năng tổng hợp review AI, lấy khóa miễn phí tại [Google AI Studio](https://aistudio.google.com) và điền vào `GEMINI_API_KEY`.

#### Bước 3: Nạp dữ liệu mẫu ban đầu (Seed Data)
Để có sẵn dữ liệu 10 thiết bị mẫu và 3 tài khoản demo:
```bash
npm run server:seed
```

#### Bước 4: Chạy đồng thời Backend Server và Mobile App
Mở **2 cửa sổ Terminal**:
* **Terminal 1 (Backend Server)**:
  ```bash
  npm run server
  ```
  *(Server sẽ chạy tại `http://localhost:5000` và kết nối MongoDB Atlas)*

* **Terminal 2 (Expo Client App)**:
  ```bash
  npm start
  # Hoặc xoá cache Metro: npm run client:clear
  ```

---

### CÁCH 2: Khởi chạy thủ công từng thư mục

#### 1. Khởi chạy Backend Server (`server/`)
```bash
cd server
npm install
npm run seed     # Nạp dữ liệu mẫu thiết bị (chỉ cần chạy 1 lần đầu)
npm run dev      # Khởi động server với tính năng tự động reload
```

#### 2. Khởi chạy Ứng dụng Mobile (`client/`)
```bash
cd client
npm install
npx expo start -c   # Cờ -c giúp xoá cache Metro bundler
```

