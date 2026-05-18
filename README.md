# store-notifier

Bot Discord chuyển tin từ **một kênh tổng** sang các **kênh đích** khi nội dung (hoặc embed Google Play / webhook) chứa **từ khóa** đã cấu hình.

Hành vi giống mẫu: chỉ xử lý tin từ `SOURCE_CHANNEL_ID`, so khớp từ khóa theo thứ tự trong JSON, **dừng sau lần khớp đầu tiên** (`break`).

## Yêu cầu

- Python **3.10+** (dùng `str | None`; có thể hạ xuống 3.9 nếu sửa type hints).
- Tài khoản bot và server Discord nơi bot được mời.

## Discord Developer Portal

1. [Applications](https://discord.com/developers/applications) → ứng dụng của bạn → **Bot**.
2. Bật **Privileged Gateway Intents** → **Message Content Intent** (bot cần đọc nội dung tin nhắn).
3. **Reset Token** / copy token vào `.env` (`DISCORD_TOKEN`), **không** đưa token vào git.
4. Mời bot vào server với quyền tối thiểu trên kênh nguồn và kênh đích:
   - View Channel
   - Read Message History
   - Send Messages
   - Embed Links

Có thể dùng [Permission Calculator](https://discordapi.com/permissions.html) để tạo URL mời (ví dụ quyền thường dùng: `277025508416` tùy nhu cầu — kiểm tra lại trên calculator).

## Cài đặt (Windows, PowerShell)

```powershell
cd D:\Workspace\bblvn\bot\store-notifier

python -m venv venv
.\venv\Scripts\Activate.ps1

pip install -r requirements.txt

Copy-Item .env.example .env
# Sửa .env: điền DISCORD_TOKEN, SOURCE_CHANNEL_ID, CHANNEL_MAP_JSON
```

### `CHANNEL_MAP_JSON`

Một object JSON: mỗi **key** là từ khóa (tên app, package name, …), **value** là ID kênh đích (chuỗi số hoặc số trong JSON).

Ví dụ trong `.env` (một dòng, không xuống dòng):

```env
CHANNEL_MAP_JSON={"App_A":"111222333444555666","com.example.game":"777666555444333222"}
```

Nếu PowerShell làm khó với dấu ngoặc, có thể lưu JSON vào file riêng và đọc bằng script — mặc định dự án chỉ đọc biến `CHANNEL_MAP_JSON`.

## Chạy bot

Từ thư mục gốc dự án (đã activate venv):

```powershell
python -m src.bot
```

Log sẽ in `Bot online: ...` khi kết nối thành công.

## Cấu trúc

| File | Mô tả |
|------|--------|
| `src/config.py` | Đọc `.env`, parse `CHANNEL_MAP_JSON` |
| `src/bot.py` | `on_message`: lọc kênh nguồn, khớp từ khóa, gửi embed clone hoặc text |

## Ghi chú

- Tin nhắn chỉ có embed (không `content`): vẫn so khớp qua `title` + `description` của embed đầu tiên.
- Embed được gửi lại bằng bản clone (`Embed.from_dict`) để tránh lỗi khi tái sử dụng embed gốc.
- Xóa tin ở kênh tổng sau khi chuyển **không** bật sẵn; có thể thêm `await message.delete()` trong `src/bot.py` nếu bot có quyền Manage Messages.
