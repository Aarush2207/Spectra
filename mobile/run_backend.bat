@echo off
title Spectra AI Backend Server
echo ===================================================
echo Starting Spectra AI Scam Detection Backend...
echo Local Address: http://127.0.0.1:8000
echo Android Emulator: http://10.0.2.2:8000
echo API Docs: http://127.0.0.1:8000/docs
echo ===================================================
cd /d "%~dp0backend"
if exist "C:\Users\aarus\AppData\Local\Programs\Python\Python310\python.exe" (
    "C:\Users\aarus\AppData\Local\Programs\Python\Python310\python.exe" -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
) else (
    python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
)
pause
