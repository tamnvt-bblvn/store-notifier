const fs = require("fs");
const path = require("path");

/** Ưu tiên `.venv` rồi tới `venv` — PM2 không đọc shell đã `activate`; phải trỏ đúng binary. */
function resolveVenvPython() {
  const isWin = process.platform === "win32";
  const names = [".venv", "venv"];
  const rel = isWin
    ? ["Scripts", "python.exe"]
    : ["bin", "python"];
  for (const dir of names) {
    const p = path.join(__dirname, dir, ...rel);
    if (fs.existsSync(p)) return p;
  }
  return path.join(__dirname, "venv", ...rel);
}

const pythonBin = resolveVenvPython();

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
