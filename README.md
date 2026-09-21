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

