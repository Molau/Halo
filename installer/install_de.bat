@echo off
REM HALOpy Installationsstarter (Deutsch)
REM Diese Batch-Datei führt das PowerShell-Installationsprogramm mit der richtigen Ausführungsrichtlinie aus

echo ========================================
echo HALOpy Installation
echo ========================================
echo.
echo Installation wird gestartet...
echo.

REM Führen Sie ein PowerShell-Skript mit Ausführungsrichtlinien-Bypass aus
powershell.exe -ExecutionPolicy Bypass -File "%~dp0install_de.ps1"

REM Überprüfen Sie, ob das PowerShell-Skript fehlgeschlagen ist
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Bei der Installation ist ein Fehler aufgetreten.
    echo Drücken Sie eine beliebige Taste zum Beenden...
    pause >nul
)
