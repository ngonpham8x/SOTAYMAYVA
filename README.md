# 🧵 Sổ May & Sửa Quần Áo Thuê Thông Minh

Ứng dụng quản lý tiệm may, tự động nhận dạng bóc tách công đoạn may mặc, tính tiền sửa đồ thuê, tạo phiếu thanh toán tích hợp VietQR và thống kê doanh thu theo ngày / tuần / tháng / năm.

---

## 🌟 Tính Năng Nổi Bật

1. **Bóc tách công đoạn & tính tiền tức thì**:
   - Tự động nhận diện cú pháp tiếng Việt theo nội dung công đoạn và giá tiền.
   - Hỗ trợ đầy đủ đơn vị tiền tệ: `k`, `nghìn`, `tr`, `triệu`, số âm, tiền tạm ứng, giảm giá.
2. **Quét ảnh sổ tay & hóa đơn (AI OCR Vision)**:
   - Chụp trực tiếp từ camera hoặc tải ảnh sổ tay ghi chép, AI sẽ tự động đọc chữ và điền vào bảng.
3. **Phiếu thanh toán & QR Chuyển khoản (VietQR)**:
   - In hóa đơn A4/K80 hoặc tải ảnh phiếu thu.
   - Tự động tạo mã QR VietQR đúng chuẩn Napas 247 kèm số tài khoản và số tiền cần thanh toán.
4. **Quản lý sổ tay & Thống kê doanh thu**:
   - Phân loại rõ ràng giữa: *May mới* và *Sửa đồ thuê*.
   - Báo cáo chi tiết thu nhập, tiền công thợ, công đoạn làm nhiều nhất.
   - Xuất dữ liệu Excel (.xlsx) chuẩn mẫu kế toán.
5. **Logo Web & PWA App**:
   - Biểu tượng sắc nét, hỗ trợ cài đặt trực tiếp lên màn hình chính điện thoại (Android & iOS).

---

## 🚀 Cài Đặt & Chạy Cục Bộ (Local Development)

```bash
# 1. Cài đặt dependencies
npm install

# 2. Khởi chạy môi trường phát triển
npm run dev
```
Truy cập trình duyệt tại: `http://localhost:3000`

---

## 🌐 Đẩy lên GitHub và deploy Vercel

### 1. Đẩy mã nguồn lên GitHub

Tạo một repository **Private** trên GitHub, sau đó thay URL bên dưới bằng URL repository đó:

```bash
git init
git add .
git commit -m "feat: khởi tạo SOTAYMAYVA"
git branch -M main
git remote add origin https://github.com/<tai-khoan-cua-ban>/<ten-repo>.git
git push -u origin main
```

### 2. Cấu hình sao lưu riêng tư và email hằng ngày

Trước khi deploy, trong Vercel chọn **Storage** → tạo một **Vercel Blob store có Access = Private** và kết nối nó với project. Vercel sẽ tự thêm `BLOB_READ_WRITE_TOKEN`; không đưa token này vào mã nguồn.

Sau đó, tại **Project Settings → Environment Variables**, thêm cho cả Production và Preview:

| Biến | Giá trị |
| --- | --- |
| `APP_LOGIN_EMAIL_1` / `APP_LOGIN_PASSWORD_1` | Email và mật khẩu của người đăng nhập thứ nhất, chỉ lưu trên Vercel |
| `APP_LOGIN_EMAIL_2` / `APP_LOGIN_PASSWORD_2` | Email và mật khẩu của người đăng nhập thứ hai, chỉ lưu trên Vercel |
| `APP_LOGIN_ACCOUNTS` | Tùy chọn: chuỗi JSON cho tài khoản được quản lý tập trung |
| `APP_SESSION_SECRET` | Chuỗi ngẫu nhiên tối thiểu 32 ký tự để ký phiên đăng nhập |
| `BACKUP_TARGET_EMAILS` | Một hoặc nhiều email nhận file khôi phục, cách nhau bằng dấu phẩy/chấm phẩy |
| `SMTP_HOST` | Máy chủ SMTP, ví dụ `smtp.gmail.com` |
| `SMTP_PORT` | `465` (SSL) hoặc `587` (STARTTLS) |
| `SMTP_USER` | Tài khoản gửi email |
| `SMTP_PASS` | App password / mật khẩu SMTP, không dùng mật khẩu email thông thường |
| `SMTP_FROM` | Địa chỉ hiển thị khi gửi (tùy chọn) |
| `CRON_SECRET` | Chuỗi ngẫu nhiên tối thiểu 16 ký tự |

`APP_LOGIN_ACCOUNTS`, `APP_SESSION_SECRET`, `BACKUP_TARGET_EMAILS`, mật khẩu SMTP, Blob token và `CRON_SECRET` không xuất hiện trong giao diện web, JavaScript trình duyệt, hay repository. Ứng dụng lưu bản khôi phục mới nhất trong Blob riêng tư; trước khi xóa đơn hoặc xóa toàn bộ sổ, bản dữ liệu trước đó được giữ lại để phục hồi. Lịch Cron gửi tệp JSON mỗi ngày lúc `00:00 UTC` (khoảng 07:00 giờ Việt Nam; với Vercel Hobby có thể chạy trong giờ đó).

### 3. Deploy lên Vercel

1. Đăng nhập vào [Vercel](https://vercel.com).
2. Chọn **"Add New..."** -> **"Project"**.
3. Kết nối với tài khoản GitHub và chọn kho lưu trữ vừa tạo.
4. Tại phần thiết lập cấu hình:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Thêm `GEMINI_API_KEY` nếu sử dụng AI OCR/giọng nói, cùng các biến sao lưu ở trên.
6. Bấm **Deploy**. Vercel sẽ tự tạo API và lịch gửi email tự động từ `vercel.json`.
