# Nhà Nhỏ 2D

Game quản lý homestay 2D độc lập, nằm trong thư mục riêng `homestay-2d/`.

## Chạy game

Từ thư mục dự án gốc:

```bash
python3 -m http.server 8000
```

Mở [http://localhost:8000/homestay-2d/](http://localhost:8000/homestay-2d/).

## Nội dung game

- Canvas 2D thuần, không dùng Three.js.
- Nền cảnh 2D anime dễ thương tại `assets/homestay-scene.png`, có marker phòng động.
- Trên màn hình rộng dùng nền ngang; trên iPhone tự chuyển sang `assets/homestay-scene-portrait.png` theo tỷ lệ 9:16.
- Hai phòng, vốn khởi điểm 100 triệu đồng, một ngày game dài 48 giây.
- Mỗi ngày có lịch khách ngẫu nhiên từ 14:00 đến 21:30; khách trả phòng vào buổi sáng ngày kế tiếp.
- Doanh thu chỉ ghi khi khách trả phòng; sau đó phòng chuyển sang trạng thái cần dọn.
- Dọn phòng, thuê người dọn, nâng cấp tiện nghi, chạy marketing và theo dõi sổ sách.
- Tiến trình tự lưu bằng `localStorage` trong trình duyệt.
- Có thể bấm trực tiếp vào phòng trong cảnh để mở quản lý phòng.
