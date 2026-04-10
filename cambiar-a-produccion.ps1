# Script para cambiar app.json a producción antes de build APK

Write-Host "🔄 Cambiando app.json a producción..." -ForegroundColor Yellow

$appJsonPath = "app.json"
$content = Get-Content $appJsonPath -Raw

# Cambiar apiUrl a producción
$content = $content -replace '"apiUrl":\s*"[^"]*"', '"apiUrl": "https://nala-api.patasypelos.xyz"'

Set-Content -Path $appJsonPath -Value $content -NoNewline

Write-Host "✅ app.json cambiado a producción" -ForegroundColor Green
Write-Host "📱 Ahora puedes generar el APK con:" -ForegroundColor Cyan
Write-Host "   npx eas build --profile production --platform android --non-interactive" -ForegroundColor Cyan
Write-Host ""
Write-Host "IMPORTANTE: NO OLVIDES volver a local despues del build!" -ForegroundColor Red
