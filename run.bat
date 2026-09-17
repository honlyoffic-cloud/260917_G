@echo off
cd /d "%~dp0"
echo ===================================================
echo   TaskFlow 할일 관리 웹 애플리케이션 시작
echo   브라우저 주소: http://127.0.0.1:5000
echo ===================================================
timeout /t 1 /nobreak >nul
start http://127.0.0.1:5000
python app.py
pause
