# 🍜 Bữa sáng ngẫu nhiên (Lucky Wheel)

Ứng dụng web chọn ngẫu nhiên một món ăn từ danh sách bằng bánh xe may mắn (lucky wheel).

## Tính năng

- **Bánh xe may mắn**: Quay và dừng đúng ô món được chọn, hiệu ứng giống game lucky wheel.
- **Danh sách món do bạn nhập**: Thêm / xóa món; dữ liệu mặc định: Bánh canh, Cháo, Bún, Phở, Mì Quảng.
- **Lưu trên trình duyệt**: Danh sách món lưu trong `localStorage`, không cần backend.

## Chạy local

Mở trực tiếp file hoặc dùng server tĩnh:

```bash
# Cách 1: Mở file (một số trình duyệt có thể chặn)
open index.html

# Cách 2: Dùng Python
python3 -m http.server 8080
# Mở http://localhost:8080

# Cách 3: Dùng npx
npx serve .
# Mở http://localhost:3000
```

## Deploy lên Cloudflare Pages

### Cách 1: Deploy bằng Wrangler CLI (Direct Upload)

1. Cài Wrangler (nếu chưa có): `npm i -g wrangler`
2. Đăng nhập: `npx wrangler login`
3. Deploy:

```bash
npx wrangler pages deploy . --project-name=breakfast-rng
```

Lần đầu sẽ hỏi tạo project mới; chọn Yes. Sau khi deploy xong, bạn sẽ có URL dạng `https://breakfast-rng.pages.dev`.

### Cách 2: Kéo thả thư mục trên Dashboard

1. Vào [Cloudflare Dashboard](https://dash.cloudflare.com) → **Pages** → **Create a project** → **Upload assets**.
2. Đặt tên project (ví dụ `breakfast-rng`).
3. Kéo thả toàn bộ thư mục dự án (chứa `index.html`, `css/`, `js/`) vào ô upload.
4. Deploy; site sẽ có địa chỉ `https://<tên-project>.pages.dev`.

### Cách 3: Kết nối Git (GitHub/GitLab)

1. Đẩy code lên GitHub/GitLab.
2. Trong Cloudflare Dashboard → **Pages** → **Create** → **Connect to Git**.
3. Chọn repo và branch.
4. Cấu hình build:
   - **Build command**: `exit 0` (không build, dùng file tĩnh sẵn).
   - **Build output directory**: `/` (root).
5. Deploy; mỗi lần push sẽ tự deploy lại.

## Cấu trúc thư mục

```
breakfast-rng/
├── index.html      # Trang chính
├── css/
│   └── style.css   # Giao diện
├── js/
│   └── app.js      # Logic bánh xe + danh sách món
├── wrangler.toml   # Cấu hình Cloudflare (tùy chọn)
└── README.md
```

## Yêu cầu

- Trình duyệt hỗ trợ ES5+, Canvas, localStorage.
- Không cần Node hay build step để chạy; deploy lên Cloudflare chỉ cần upload thư mục hoặc dùng Wrangler.
