# ADAA Project Startup Script
# Run this to start both backend and frontend

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   ADAA Project - Starting Services    " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (!(Test-Path "backend") -or !(Test-Path "frontend")) {
    Write-Host "ERROR: Must run this script from ADAA-Project root directory" -ForegroundColor Red
    Write-Host "Current directory: $(Get-Location)" -ForegroundColor Yellow
    exit 1
}

Write-Host "[1/4] Activating Python virtual environment..." -ForegroundColor Yellow
cd backend
& .\.venv_backend\Scripts\Activate.ps1

Write-Host "[2/4] Starting Backend Server..." -ForegroundColor Yellow
Write-Host "       Backend will run at: http://127.0.0.1:8000" -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; & .\.venv_backend\Scripts\Activate.ps1; uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"

Write-Host "[3/4] Waiting for backend to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

Write-Host "[4/4] Starting Frontend Server..." -ForegroundColor Yellow
cd ..\frontend
Write-Host "       Frontend will run at: http://localhost:5173" -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm run dev"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "   Services Started Successfully!      " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Backend:  http://127.0.0.1:8000" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C in each terminal window to stop the services" -ForegroundColor Yellow
Write-Host ""

cd ..
