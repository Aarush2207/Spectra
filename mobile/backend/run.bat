@echo off
echo Starting Spectra AI Backend Server...
cd /d "%~dp0"
"C:\Users\aarus\AppData\Local\Programs\Python\Python310\python.exe" -m pip install -r requirements.txt
"C:\Users\aarus\AppData\Local\Programs\Python\Python310\python.exe" main.py
pause
