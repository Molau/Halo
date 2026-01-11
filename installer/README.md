# HALOpy Installation Guide

## Quick Install (Windows)

HALOpy includes an automated installer similar to the original HALO program.

### Installation Steps

1. **Download the installer script**
   - Download `install.ps1` from https://github.com/Molau/Halo/tree/main/installer
   - Or download from the [Releases](https://github.com/Molau/Halo/releases) page

2. **Run the installer**
   - Right-click on `install.ps1`
   - Select "Run with PowerShell"
   - If prompted, allow the script to run as Administrator

3. **Follow the prompts**
   - The installer will automatically:
     - ✓ Check for Python (install if needed)
     - ✓ Download HALOpy files from GitHub
     - ✓ Install all dependencies
     - ✓ Create start script (halo.bat)
     - ✓ Optionally create desktop shortcut

4. **Start HALOpy**
   - Double-click `halo.bat` in `C:\ASTRO\HALOpy`
   - Or use the desktop shortcut
   - Your browser will open to http://localhost:5000

### What Gets Installed

- **Python 3.11.7** (if not already installed)
- **HALOpy** in `C:\ASTRO\HALOpy`
- **Python dependencies** (Flask, pandas, etc.)
- **halo.bat** start script
- **data/** directory for your observation files

### Manual Installation (Alternative)

If you prefer manual installation or the automated installer doesn't work:

1. **Install Python**
   - Download from https://www.python.org/downloads/
   - Version 3.10 or newer
   - During installation: Check "Add Python to PATH"

2. **Download HALOpy**
   - Download ZIP from https://github.com/Molau/Halo/archive/refs/heads/main.zip
   - Extract to `C:\ASTRO\HALOpy`

3. **Install Dependencies**
   ```powershell
   cd C:\ASTRO\HALOpy
   python -m pip install -r requirements.txt
   ```

4. **Run HALOpy**
   ```powershell
   python halo.py
   ```

### Troubleshooting

**"Scripts are disabled on this system"**
- Open PowerShell as Administrator
- Run: `Set-ExecutionPolicy RemoteSigned`
- Try the installer again

**Python not found after installation**
- Close and reopen PowerShell/Command Prompt
- Check PATH: `python --version`
- If still not working, reinstall Python with "Add to PATH" checked

**Dependencies won't install**
- Update pip: `python -m pip install --upgrade pip`
- Install manually: `python -m pip install -r requirements.txt`

**Port 5000 already in use**
- Another program is using port 5000
- Edit `halo.py` and change port number
- Or stop the other program

**Download fails**
- Check internet connection
- Try downloading manually from: https://github.com/Molau/Halo/archive/refs/heads/main.zip
- Extract to `C:\ASTRO\HALOpy`

### Uninstallation

To remove HALOpy:

1. Delete `C:\ASTRO\HALOpy` directory
2. Delete desktop shortcut (if created)
3. Optionally uninstall Python (if only used for HALOpy)

### System Requirements

- **OS**: Windows 10 or newer
- **Python**: 3.10 or newer (installed automatically)
- **Disk Space**: ~200 MB (Python + HALOpy + dependencies)
- **Browser**: Any modern web browser (Chrome, Firefox, Edge, etc.)
- **Internet**: Required for initial download

---

## For Developers

If you're developing HALOpy:

1. Clone the repository: `git clone https://github.com/Molau/Halo.git`
2. Install dependencies manually: `pip install -r requirements.txt`
3. See main [README.md](../README.md) for development setup

---

*Last updated: 2026-01-11*
