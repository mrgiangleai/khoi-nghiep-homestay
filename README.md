# Nhà Nhỏ 2D · Quản lý homestay

Game quản lý homestay 2D độc lập. Bản đang chạy ở thư mục gốc đã thay cho bản 2.5D cũ.

## Chạy local

Game dùng ES module, nên cần mở bằng static server thay vì `file://`:

```bash
python3 -m http.server 8000
```

Sau đó truy cập `http://localhost:8000/`.

## Gameplay

- Vốn ban đầu: 100.000.000 ₫.
- Canvas 2D thuần, hai phòng, vốn ban đầu 100.000.000 ₫.
- Một ngày game dài 48 giây; lịch khách xuất hiện từ 14:00 đến 21:30.
- Khách trả phòng vào buổi sáng hôm sau; doanh thu được ghi đúng lúc trả phòng.
- Phòng sau checkout cần dọn; có thể tự dọn hoặc thuê người dọn.
- Có nâng cấp tiện nghi, marketing, sổ sách và tự lưu bằng `localStorage`.
- Toàn bộ ảnh cảnh dùng phong cách 2D anime dễ thương; có bản ngang và bản dọc 9:16 cho màn hình iPhone.

## Bản 2.5D cũ

Bản cũ được giữ nguyên tại [`legacy-2.5d/`](./legacy-2.5d/), gồm source Three.js trước khi chuyển sang bản 2D.

## GitHub Pages

Workflow triển khai nằm tại `.github/workflows/deploy-pages.yml`. Push lên `master` hoặc `main` sẽ triển khai lại game.
