@echo off
title InvoiceWise — Automated Setup & Launch
echo ======================================================
echo 🚀 InvoiceWise — Automated Setup & Environment Launcher
echo ======================================================
node setup.js
if %ERRORLEVEL% EQU 0 (
  echo.
  echo Starting InvoiceWise Server...
  npm start
) else (
  echo.
  echo ❌ Setup encountered an error. Please ensure Node.js is installed.
  pause
)
