@echo off
setlocal
cd /d "%~dp0"
echo ==========================================
echo        ArtisanAI - Local App Launcher
echo ==========================================
echo.
if not exist node_modules (npm install)
if not exist client\node_modules (npm --prefix client install)
if not exist server\node_modules (npm --prefix server install)
if not exist server\.env copy server\.env.example server\.env >nul
start "ArtisanAI Server" cmd /k "npm --prefix server run dev"
timeout /t 2 /nobreak >nul
start "ArtisanAI Client" cmd /k "npm --prefix client run dev"
timeout /t 3 /nobreak >nul
start http://localhost:5173
pause
