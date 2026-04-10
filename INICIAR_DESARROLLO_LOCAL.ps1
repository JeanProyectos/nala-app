# Script para iniciar desarrollo local de la App

Write-Host "📱 Iniciando desarrollo local de NALA App..." -ForegroundColor Cyan
Write-Host ""

# Verificar que estamos en el directorio correcto
if (-not (Test-Path "app.json")) {
    Write-Host "❌ Error: No se encontró app.json" -ForegroundColor Red
    Write-Host "   Ejecuta este script desde: C:\Proyectos Jean Git\nala-app" -ForegroundColor Yellow
    exit 1
}

# Verificar configuración de API
$appJson = Get-Content "app.json" -Raw | ConvertFrom-Json
$apiUrl = $appJson.expo.extra.apiUrl

Write-Host "🔍 Configuración actual:" -ForegroundColor Cyan
Write-Host "   API URL: $apiUrl" -ForegroundColor Gray

if ($apiUrl -notlike "*192.168.20.53*" -and $apiUrl -notlike "*localhost*" -and $apiUrl -notlike "*127.0.0.1*") {
    Write-Host ""
    Write-Host "⚠️  ADVERTENCIA: La app está configurada para producción!" -ForegroundColor Yellow
    Write-Host "   URL actual: $apiUrl" -ForegroundColor Gray
    Write-Host ""
    $response = Read-Host "¿Deseas cambiar a local? (S/N)"
    if ($response -eq "S" -or $response -eq "s") {
        .\cambiar-a-local.ps1
        Write-Host "✅ Cambiado a local" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "📦 Verificando dependencias..." -ForegroundColor Cyan
if (-not (Test-Path "node_modules")) {
    Write-Host "   Instalando dependencias..." -ForegroundColor Yellow
    npm install
}

Write-Host ""
Write-Host "🚀 Iniciando Expo..." -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 Opciones:" -ForegroundColor Yellow
Write-Host "   - Presiona 'a' para abrir en Android" -ForegroundColor Gray
Write-Host "   - Presiona 'i' para abrir en iOS (si tienes Mac)" -ForegroundColor Gray
Write-Host "   - Escanea el QR con Expo Go en tu móvil" -ForegroundColor Gray
Write-Host "   - Presiona Ctrl+C para detener" -ForegroundColor Gray
Write-Host ""

# Iniciar Expo
npx expo start
