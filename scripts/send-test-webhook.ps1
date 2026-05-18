# Gửi payload giống thông báo NSMB lên webhook (kênh nguồn bot đang theo dõi).
# Dùng:
#   .\scripts\send-test-webhook.ps1 -WebhookUrl "https://discord.com/api/webhooks/..."
# hoặc:
#   $env:DISCORD_WEBHOOK_URL = "https://..."
#   .\scripts\send-test-webhook.ps1

param(
    [string] $WebhookUrl = $env:DISCORD_WEBHOOK_URL
)

$ErrorActionPreference = "Stop"
if (-not $WebhookUrl) {
    Write-Error "Thiếu URL: đặt `$env:DISCORD_WEBHOOK_URL hoặc truyền -WebhookUrl"
    exit 1
}

$root = Split-Path -Parent $PSScriptRoot
$jsonPath = Join-Path $root "test-webhook.json"
if (-not (Test-Path $jsonPath)) {
    Write-Error "Không thấy $jsonPath"
    exit 1
}

& curl.exe -X POST $WebhookUrl -H "Content-Type: application/json" -d "@$jsonPath"
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

Write-Host "Đã gửi. Kiểm tra kênh webhook và kênh đích bot forward."
