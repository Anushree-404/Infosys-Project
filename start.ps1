# IrriSmart — Start All Services
# Run this script from the project root: .\start.ps1

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  IrriSmart - AI Irrigation System" -ForegroundColor Green
Write-Host "  Starting all services..." -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""

# Check PostgreSQL
$pg = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue | Where-Object { $_.Status -eq "Running" }
if ($pg) {
    Write-Host "  [OK] PostgreSQL: Running" -ForegroundColor Green
} else {
    Write-Host "  [!] PostgreSQL not running - start it from services.msc" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "  Starting Backend  (http://localhost:5000)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd e:\Infosys-project\backend; npm run dev"

Start-Sleep -Seconds 2

Write-Host "  Starting Frontend (http://localhost:3000)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd e:\Infosys-project\frontend; npm run dev"

Start-Sleep -Seconds 2

Write-Host "  Starting ML Service (http://localhost:8000)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd e:\Infosys-project\ml\fastapi_service; python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  All services starting in new windows!" -ForegroundColor Green
Write-Host ""
Write-Host "  Frontend  : http://localhost:3000" -ForegroundColor White
Write-Host "  Backend   : http://localhost:5000/api/docs" -ForegroundColor White
Write-Host "  ML Service: http://localhost:8000/docs" -ForegroundColor White
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
