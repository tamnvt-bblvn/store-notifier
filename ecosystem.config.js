const path = require("path");

// PM2 chạy trong WSL → process.platform là "linux", dùng Python của venv Linux.
// Tạo venv trong WSL (không dùng chung venv Windows):  python3 -m venv venv && ./venv/bin/pip install -r requirements.txt
//
// Nếu vẫn start PM2 từ Windows (PowerShell): nhánh win32 dùng python.exe trong venv Windows.
const pythonBin =
  process.platform === "win32"
    ? path.join(__dirname, "venv", "Scripts", "python.exe")
    : path.join(__dirname, "venv", "bin", "python");

module.exports = {
  apps: [
    {
      name: "store-notifier",
      cwd: __dirname,
      script: pythonBin,
      args: "-m src.bot",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_restarts: 10,
      min_uptime: "10s",
      max_memory_restart: "500M",
      env: {
        PYTHONUNBUFFERED: "1",
      },
      error_file: path.join(__dirname, "logs", "pm2-error.log"),
      out_file: path.join(__dirname, "logs", "pm2-out.log"),
      merge_logs: true,
      time: true,
    },
  ],
};
