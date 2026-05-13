@echo off
title Shree Kamakshi Jewellers
echo ============================================
echo   Starting Shree Kamakshi Jewellers...
echo ============================================
echo.

:: Start the backend server
cd /d "%~dp0backend"

:: Open browser after a short delay
start "" cmd /c "timeout /t 3 >nul & start http://localhost:3000/JWE.HTML"

:: Run the server (this keeps the window open)
node server.js

pause
