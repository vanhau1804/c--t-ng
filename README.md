# Hoàng Gia Tướng Kỳ

Web chơi Cờ Tướng và Cờ Úp bằng React + TypeScript. Chạy hoàn toàn trên trình duyệt, không cần máy chủ.

## Chạy thử

```bash
npm install
npm run dev        # chạy ở máy, mở địa chỉ hiện ra
npm test           # chạy toàn bộ kiểm thử
npm run build      # ra một tệp duy nhất: dist/index.html
```

`dist/index.html` đã nhúng sẵn JS và CSS, chỉ cần đưa tệp này lên bất kỳ chỗ lưu trữ web tĩnh nào (GitHub Pages, Netlify, Vercel, một thư mục trên máy chủ…). Chữ dùng Google Fonts nên cần có mạng để đúng phông; không có mạng vẫn chơi được với phông dự phòng.

## Đưa lên GitHub Pages

1. Tạo kho mới trên GitHub rồi đẩy mã lên nhánh `main`.
2. Vào **Settings → Pages → Build and deployment → Source** chọn **GitHub Actions**.
3. Mỗi lần đẩy lên `main`, quy trình trong `.github/workflows/deploy.yml` sẽ kiểm tra kiểu, chạy kiểm thử, dựng bản chơi và đưa lên `https://<tên-tài-khoản>.github.io/<tên-kho>/`.

## Chức năng

- Cờ Tướng và Cờ Úp, đấu với máy hoặc hai người chung một máy.
- Máy có ba mức: Dễ, Trung bình, Khó.
- Đồng hồ có cộng giây sau mỗi nước, chọn 3 / 5 / 10 / 15 / 30 phút.
- Chọn quân hiện nước đi hợp lệ, đánh dấu nước vừa đi, quân đã ăn, Đi lại, Xin hàng.
- Biểu ngữ "Chiếu tướng!", màn hình kết quả khi chiếu bí, hết nước đi, hết giờ hay xin hàng.
- Bàn tay nhón quân đi (tắt được), âm thanh tạo bằng Web Audio (tắt được).
- Chạy tốt trên điện thoại. Tên kỳ thủ và số trận thắng lưu trong trình duyệt.

Địa chỉ trang dạng `#co-tuong-may`, `#co-tuong-hai`, `#co-up-may`, `#co-up-hai`.

## Cấu trúc

```
src/
  engine/              phần luật và máy, không phụ thuộc React
    rules.ts           luật đi quân, chiếu tướng, hai Tướng đối mặt, thế khai cuộc
    ai.ts              máy đánh ba mức (minimax cắt tỉa alpha-beta)
    controller.ts      điều khiển một ván: lượt, đồng hồ, hoạt ảnh tay, máy, âm thanh
    sound.ts           âm thanh bằng Web Audio
    glyphs.ts          chữ Hán và tên quân
  ui/                  giao diện React
    Lobby.tsx          sảnh
    GamePage.tsx       màn hình ván cờ
    BoardView.tsx      bàn cờ và quân
    Hand.tsx           bàn tay đi quân
    Overlays.tsx       biểu ngữ chiếu tướng, màn hình kết quả
  styles.css
```

## Kiểm thử

`npm test` gồm kiểm thử luật (đếm nước đi từ thế khai cuộc khớp số liệu chuẩn 44 / 1.920 / 79.666 / 3.290.240), máy đánh, điều khiển ván và giao diện.

## Luật Cờ Úp đang dùng

- Tướng ngửa, 15 quân còn lại mỗi bên được xáo ngẫu nhiên và úp xuống các ô xuất phát.
- Quân úp đi theo quân ở ô nó đang đứng, đi xong thì lật ngửa và từ đó đi theo quân thật.
- Sĩ và Tượng đã lật không còn bị giới hạn trong cung hay phần sân nhà.
- Quân úp bị ăn cũng được lật lên.

Nếu muốn đổi Sĩ và Tượng về bị giới hạn như Cờ Tướng thường, sửa trong `pseudoMoves` (`src/engine/rules.ts`): bỏ điều kiện `free`.

## Chưa có

- Chơi online giữa hai máy (cần máy chủ).
- Luật hòa, cấm chiếu mãi và đuổi mãi.
- Sách khai cuộc cho máy. Máy mức Khó đôi khi đi qua lại lặp nước.
- Thời lượng ván trong bảng chọn thời gian là ước tính, chưa dựa trên số liệu thật.
