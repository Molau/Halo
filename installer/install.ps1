<#
.SYNOPSIS
    HALOpy Installation Script
.DESCRIPTION
    Automated installer for HALOpy - similar to the original HALO.EXE installer.
    Downloads Python, installs dependencies, and sets up HALOpy.
.NOTES
    Run as Administrator for Python installation
    
.USAGE
    To run this unsigned script:
    Right-click install.ps1 -> "Run with PowerShell"
    OR
    Run install.bat (easiest)
#>

# Configuration
$PYTHON_VERSION = "3.11.7"
$PYTHON_INSTALLER_URL = "https://www.python.org/ftp/python/$PYTHON_VERSION/python-$PYTHON_VERSION-amd64.exe"
$HALOPY_REPO_URL = "https://github.com/Molau/Halo/archive/refs/heads/main.zip"
$DEFAULT_INSTALL_DIR = "$env:USERPROFILE\HALOpy"

# Colors for output
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

function Write-Header {
    param([string]$Message)
    Write-Host ""
    Write-ColorOutput Green "==========================================================="
    Write-ColorOutput Green "  $Message"
    Write-ColorOutput Green "==========================================================="
    Write-Host ""
}

function Write-Step {
    param([string]$Message)
    Write-ColorOutput Cyan "[*] $Message"
}

function Write-Success {
    param([string]$Message)
    Write-ColorOutput Green "[OK] $Message"
}

function Write-Error-Message {
    param([string]$Message)
    Write-ColorOutput Red "[ERROR] $Message"
}

# Check for Administrator privileges
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

# Start installation
Clear-Host
Write-Header "HALOpy Installation"

if (-not $isAdmin) {
    Write-ColorOutput Yellow "==========================================================="
    Write-ColorOutput Yellow "  WARNING: Not running as Administrator!"
    Write-ColorOutput Yellow "==========================================================="
    Write-Host ""
    Write-ColorOutput Yellow "This script is not running with Administrator privileges."
    Write-Host "Python installation may fail without admin rights."
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  1. Close this window and run PowerShell as Administrator"
    Write-Host "  2. Continue anyway (Python installation will be skipped if it fails)"
    Write-Host ""
    $continue = Read-Host "Do you want to continue anyway? (Y/N) [N]"
    if ($continue -ne "Y" -and $continue -ne "y") {
        Write-Host "Installation cancelled. Please run as Administrator."
        Write-Host "Press any key to exit..."
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        exit 1
    }
    Write-Host ""
}

Write-Host "This script will install HALOpy on your computer."
Write-Host ""

# Ask for installation directory
Write-ColorOutput Cyan "Where do you want to install HALOpy?"
Write-Host "Default: $DEFAULT_INSTALL_DIR"
$userInput = Read-Host "Press Enter for default or type a different path"

if ([string]::IsNullOrWhiteSpace($userInput)) {
    $INSTALL_DIR = $DEFAULT_INSTALL_DIR
} else {
    $INSTALL_DIR = $userInput
}

Write-Host ""
Write-Success "Installation directory: $INSTALL_DIR"
Write-Host ""
Write-Host "Press any key to continue or Ctrl+C to cancel..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Step 1: Check for Python
Write-Header "Step 1: Checking Python Installation"

$pythonInstalled = $false
$pythonPath = $null

# Check if py launcher exists (most reliable)
try {
    $pyVersion = & py -3 --version 2>&1
    if ($pyVersion -match "Python 3") {
        $pythonInstalled = $true
        Write-Success "Python is already installed: $pyVersion"
    }
} catch {
    # py launcher not found
}

# Fallback: check if python is in PATH
if (-not $pythonInstalled) {
    try {
        $pythonVersion = & python --version 2>&1
        if ($pythonVersion -match "Python 3") {
            $pythonInstalled = $true
            $pythonPath = (Get-Command python).Source
            Write-Success "Python is already installed: $pythonVersion"
            Write-Host "  Location: $pythonPath"
        }
    } catch {
        # Python not found
    }
}

# Install Python if not found
if (-not $pythonInstalled) {
    Write-Step "Python not found. Downloading Python $PYTHON_VERSION..."
    
    $tempInstaller = "$env:TEMP\python-installer.exe"
    
    try {
        Invoke-WebRequest -Uri $PYTHON_INSTALLER_URL -OutFile $tempInstaller -UseBasicParsing
        Write-Success "Python installer downloaded"
        
        Write-Step "Installing Python (this may take a few minutes)..."
        $installArgs = "/quiet InstallAllUsers=1 PrependPath=1 Include_test=0"
        Start-Process -FilePath $tempInstaller -ArgumentList $installArgs -Wait -NoNewWindow
        
        # Refresh PATH
        $machinePath = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
        $userPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
        $env:Path = $machinePath + ";" + $userPath
        
        Write-Success "Python installed successfully"
        
        # Clean up installer
        Remove-Item $tempInstaller -Force
    }
    catch {
        Write-Error-Message "Failed to download or install Python: $_"
        Write-Host "Please download Python manually from: https://www.python.org/downloads/"
        exit 1
    }
}

# Step 2: Download HALOpy
Write-Header "Step 2: Downloading HALOpy"

# Create installation directory if it doesn't exist
if (-not (Test-Path $INSTALL_DIR)) {
    Write-Step "Creating installation directory: $INSTALL_DIR"
    New-Item -ItemType Directory -Path $INSTALL_DIR -Force | Out-Null
}

$tempZip = "$env:TEMP\halopy.zip"
$extractPath = "$env:TEMP\halopy-extract"

Write-Step "Downloading HALOpy from GitHub..."
Write-Host "  Repository: https://github.com/Molau/Halo"

try {
    Invoke-WebRequest -Uri $HALOPY_REPO_URL -OutFile $tempZip -UseBasicParsing
    Write-Success "HALOpy downloaded"
    
    Write-Step "Extracting files..."
    
    # Remove old extraction folder if exists
    if (Test-Path $extractPath) {
        Remove-Item $extractPath -Recurse -Force
    }
    
    Expand-Archive -Path $tempZip -DestinationPath $extractPath -Force
    
    # Move files from extracted folder to install directory
    $extractedFolder = Get-ChildItem -Path $extractPath -Directory | Select-Object -First 1
    Copy-Item -Path "$($extractedFolder.FullName)\*" -Destination $INSTALL_DIR -Recurse -Force
    
    Write-Success "Files extracted to $INSTALL_DIR"
    
    # Clean up
    Remove-Item $tempZip -Force
    Remove-Item $extractPath -Recurse -Force
}
catch {
    Write-Error-Message "Failed to download HALOpy: $_"
    Write-Host "You can manually download from: https://github.com/Molau/Halo/archive/refs/heads/main.zip"
    exit 1
}

# Step 3: Install Dependencies
Write-Header "Step 3: Installing Python Dependencies"

Set-Location $INSTALL_DIR

if (Test-Path "requirements.txt") {
    Write-Step "Installing dependencies from requirements.txt..."
    
    try {
        # Use py launcher which is most reliable
        & py -3 -m pip install --upgrade pip 2>&1 | Out-Null
        & py -3 -m pip install -r requirements.txt
        
        Write-Success "Dependencies installed successfully"
    }
    catch {
        Write-Error-Message "Failed to install dependencies: $_"
        Write-Host "You can install manually with: py -3 -m pip install -r requirements.txt"
    }
}
else {
    Write-ColorOutput Yellow "Warning: requirements.txt not found"
}

# Step 4: Create Start Script
Write-Header "Step 4: Creating Start Script"

$batContent = @"
@echo off
REM HALOpy Launcher
REM Created by install.ps1

cd /d "%~dp0"

REM Use py launcher (more reliable on Windows 10/11)
py -3 halo.py

if errorlevel 1 (
    echo.
    echo Error: Could not start HALOpy
    echo Make sure Python 3 is installed
    echo.
    pause
)
"@

$batPath = Join-Path $INSTALL_DIR "halo.bat"
Set-Content -Path $batPath -Value $batContent -Encoding ASCII

Write-Success "Start script created: halo.bat"

# Step 5: Create Desktop Shortcut (optional)
Write-Header "Step 5: Creating Desktop Shortcut"

$createShortcut = Read-Host "Create desktop shortcut? (Y/N) [Y]"
if ($createShortcut -eq "" -or $createShortcut -eq "Y" -or $createShortcut -eq "y") {
    try {
        $WshShell = New-Object -ComObject WScript.Shell
        $desktopPath = [Environment]::GetFolderPath("Desktop")
        $shortcutPath = Join-Path $desktopPath "HALOpy.lnk"
        
        $shortcut = $WshShell.CreateShortcut($shortcutPath)
        $shortcut.TargetPath = $batPath
        $shortcut.WorkingDirectory = $INSTALL_DIR
        $shortcut.Description = "HALOpy - Halo Observation Recording System"
        $shortcut.Save()
        
        Write-Success "Desktop shortcut created"
    }
    catch {
        Write-Error-Message "Could not create desktop shortcut: $_"
    }
}

# Step 6: Create data directory
Write-Header "Step 6: Setting Up Data Directory"

$dataDir = Join-Path $INSTALL_DIR "data"
if (-not (Test-Path $dataDir)) {
    New-Item -ItemType Directory -Path $dataDir -Force | Out-Null
    Write-Success "Data directory created: $dataDir"
}
else {
    Write-Success "Data directory exists: $dataDir"
}

# Installation Complete
Write-Header "Installation Complete!"

Write-Host ""
Write-ColorOutput Green "HALOpy has been successfully installed!"
Write-Host ""
Write-Host "Installation directory: $INSTALL_DIR"
Write-Host ""
Write-ColorOutput Cyan "To start HALOpy:"
Write-Host "  1. Double-click on: $batPath"
Write-Host "  2. Or run from command prompt: cd `"$INSTALL_DIR`" ; .\halo.bat"
Write-Host ""
Write-ColorOutput Yellow "First-time setup:"
Write-Host "  - Place your observation files (.HAL, .CSV) in: $dataDir"
Write-Host "  - Open your web browser to: http://localhost:5000"
Write-Host "  - The program runs a local web server"
Write-Host ""

$startNow = Read-Host "Start HALOpy now? (Y/N) [N]"
if ($startNow -eq "Y" -or $startNow -eq "y") {
    Write-Host ""
    Write-Step "Starting HALOpy..."
    Start-Process -FilePath $batPath -WorkingDirectory $INSTALL_DIR
    Write-Host "HALOpy is starting. Your web browser should open automatically."
    Write-Host "If not, open your browser and go to: http://localhost:5000"
}

Write-Host ""
Write-ColorOutput Green "Thank you for installing HALOpy!"
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
