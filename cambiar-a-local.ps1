# Script para cambiar app.json a local para desarrollo

Write-Host "🔄 Cambiando app.json a local..." -ForegroundColor Yellow

$appJsonPath = "app.json"
$content = Get-Content $appJsonPath -Raw

# Cambiar apiUrl a local
$content = $content -replace '"apiUrl":\s*"[^"]*"', '"apiUrl": "http://192.168.20.53:3000"'

Set-Content -Path $appJsonPath -Value $content -NoNewline

Write-Host "✅ app.json cambiado a local" -ForegroundColor Green
Write-Host "💻 Ahora puedes desarrollar localmente" -ForegroundColor Cyan
Write-Host "   Reinicia Expo si está corriendo" -ForegroundColor Cyan
