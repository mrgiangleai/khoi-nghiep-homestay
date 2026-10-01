# Khởi Nghiệp Homestay

Prototype game quản lý kinh doanh homestay 2.5D sử dụng Three.js.

## Chạy local

Vì game sử dụng ES module và import Three.js từ CDN, cần mở bằng một static server thay vì mở trực tiếp bằng `file://`:

```bash
python3 -m http.server 8000
```

Sau đó truy cập `http://localhost:8000`.

## Gameplay hiện tại

- Vốn ban đầu: 100.000.000 ₫.
- Một căn nhà với hai phòng cơ bản.
- Giá thuê ban đầu: 200.000 ₫/ngày/phòng.
- Một ngày trong game kéo dài 48 giây (2 giây = 1 giờ game).
- Khách check-in sau 14:00 và check-out trước 12:00 ngày tiếp theo.
- Phòng sau checkout bắt buộc phải được dọn.
- Có thể tự dọn hoặc thuê người dọn.
- Có nâng cấp vật phẩm, marketing và sổ doanh thu.
- Shop mở rộng nhà đang ở trạng thái Coming Soon.

Phiên bản prototype chưa lưu tiến trình. GitHub Pages là static hosting nên Git chỉ lưu source code, không nhận dữ liệu phiên chơi trực tiếp từ trình duyệt.

## GitHub Pages

Repository có workflow tại `.github/workflows/deploy-pages.yml`. Sau khi bật GitHub Pages dùng GitHub Actions trong phần Settings, mỗi lần push lên `main` hoặc `master` sẽ triển khai lại game.
