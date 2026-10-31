Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "Starting Spectra AI Scam Detection Backend..." -ForegroundColor Green
Write-Host "Local Address: http://127.0.0.1:8000" -ForegroundColor White
Write-Host "Android Emulator: http://10.0.2.2:8000" -ForegroundColor White
Write-Host "API Docs: http://127.0.0.1:8000/docs" -ForegroundColor Yellow
Write-Host "===================================================" -ForegroundColor Cyan
Set-Location "$PSScriptRoot\backend"
$pythonPath = "C:\Users\aarus\AppData\Local\Programs\Python\Python310\python.exe"
if (Test-Path $pythonPath) {
    & $pythonPath -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
} else {
    python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
}
