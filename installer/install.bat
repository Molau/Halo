@echo off
REM HALOpy Installer Launcher
REM This batch file runs the PowerShell installer with proper execution policy

echo ========================================
echo HALOpy Installer
echo ========================================
echo.
echo Starting installation...
echo.

REM Run PowerShell script with execution policy bypass
powershell.exe -ExecutionPolicy Bypass -File "%~dp0install.ps1"

REM Check if PowerShell script failed
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Installation encountered an error.
    echo Press any key to exit...
    pause >nul
)
