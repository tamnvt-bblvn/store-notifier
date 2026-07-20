# Unified Slack & Discord Routing Bot Design

## 1. Mục tiêu (Goal)
Gộp chức năng của 2 dự án (Python `store-notifier` và Node.js `slack-to-discord-bot`) vào làm một dự án Node.js duy nhất. 
Con bot mới này sẽ đảm nhận 2 luồng công việc (2 chuyện):
1. **Discord-to-Discord Routing (Chức năng cũ của Python):** Lắng nghe tin nhắn từ các kênh nguồn (Source Channels) trên Discord, quét keyword và chuyển tiếp (forward) đến các kênh đích.
2. **Slack-to-Discord Routing (Chức năng mới):** Nhận sự kiện trực tiếp từ Slack, quét keyword và chuyển tiếp thẳng đến các kênh đích.

Đồng thời, thay vì quản lý cấu hình bằng cách hardcode, bot sẽ dùng Database (SQLite) và cho phép các Manager tự đăng ký nhận tin nhắn thông qua Slash Command trên Discord (`/subscribe`).

## 2. Kiến trúc tổng thể (Architecture)
- **Ngôn ngữ & Runtime:** Node.js.
- **Thư viện chính:** 
  - `@slack/bolt`: Lắng nghe Webhook từ Slack.
  - `discord.js`: Tương tác với Discord API (Nhận tin nhắn, gửi tin nhắn, xử lý Slash Commands).
  - `better-sqlite3` (hoặc `sqlite3`): Cơ sở dữ liệu siêu nhẹ dạng file cục bộ.
- **Token:** Sử dụng chung `DISCORD_BOT_TOKEN` của con bot Python hiện tại (sau khi tắt con bot Python đi để tránh xung đột).

## 3. Các thành phần chính (Components)

### 3.1. Database Layer (SQLite)
Tạo một file database `database.sqlite` với bảng `subscriptions`:
- `id`: Khóa chính
- `channel_id`: ID của kênh Discord đích sẽ nhận tin.
- `keyword`: Từ khóa nhận diện app (VD: `com.zubuu.ai.chat.app`).

### 3.2. Discord Interaction Handler (Tự phục vụ)
Đăng ký 3 Slash Commands trên Discord:
- `/subscribe <keyword>`: Lưu `channel_id` hiện tại và `keyword` vào database. Kênh này bắt đầu nhận thông báo liên quan đến keyword.
- `/unsubscribe <keyword>`: Xóa cấu hình. Kênh ngừng nhận thông báo.
- `/subscriptions`: Liệt kê các keyword mà kênh hiện tại đang đăng ký.

### 3.3. Luồng 1: Slack to Discord
- Lắng nghe tin nhắn từ Slack qua hàm `app.message()`.
- Chuyển đổi định dạng nội dung (với logic fix lỗi hiển thị vừa làm).
- Lấy danh sách tất cả các `keyword` trong Database. Nếu nội dung Slack chứa `keyword` nào, dùng `discord.js` gửi tin nhắn thẳng vào các `channel_id` đã đăng ký keyword đó.

### 3.4. Luồng 2: Discord to Discord (Port từ Python sang)
- Lắng nghe sự kiện `messageCreate` của `discord.js`.
- Bỏ qua tin nhắn của chính Bot.
- Kiểm tra xem tin nhắn có xuất phát từ `SOURCE_CHANNEL_IDS` (kênh đích lấy từ `.env`) hay không.
- Nếu đúng, tổng hợp text và nội dung embeds (giống hệt logic của file `bot.py`), quét keyword trong Database, clone Embeds và gửi thông báo `📢 Thông báo mới cho **{keyword}**:` sang các `channel_id` đích.

## 4. Kế hoạch chuyển đổi (Migration)
1. Cài đặt các package cần thiết (`discord.js`, `better-sqlite3`).
2. Code các module SQLite, Discord Slash Commands.
3. Code tính năng Discord-to-Discord.
4. Cập nhật tính năng Slack-to-Discord để dùng SQLite thay vì Webhook tĩnh.
5. Cập nhật `.env` để bổ sung `DISCORD_BOT_TOKEN` và `SOURCE_CHANNEL_IDS`.
6. Tắt server chạy file `bot.py` cũ và khởi động dự án Node.js mới.
