# HALOpy Auto-Update Feature

## Overview

HALOpy includes an auto-update mechanism that checks for new releases on GitHub and allows users to download and install updates with a single click.

## How It Works

1. **On Startup**: The application checks GitHub for the latest release
2. **Version Comparison**: Compares current version with latest available version
3. **User Prompt**: If a newer version exists, prompts user to update
4. **Download & Extract**: Downloads release ZIP from GitHub
5. **File Replacement**: Copies updated files (excludes data and config)
6. **Restart**: Automatically restarts the application with new code

## Configuration

### Enable Auto-Update

Edit `src/halo/web/app.py` and set the `UPDATE_REPO` configuration:

```python
app.config.update({
    # ...
    'UPDATE_REPO': 'owner/HALOpy',  # Replace with your GitHub repository
})
```

**Example**:
```python
'UPDATE_REPO': 'astro-community/HALOpy',
```

### Disable Auto-Update

Leave `UPDATE_REPO` empty (default):

```python
'UPDATE_REPO': '',  # Disabled
```

## Requirements

- GitHub repository with releases (tagged versions)
- Internet connection for update checks
- Write permissions to application directory

## What Gets Updated

**Updated files**:
- Python source code (`src/halo/`)
- Templates (`templates/`)
- Static files (`static/`)
- Documentation (`docs/`)
- Configuration templates

**Preserved files** (NOT overwritten):
- User data (`data/` directory)
- User configuration (`resources/halo.cfg`)
- Observer database (`resources/halobeo.csv`)

## Version Numbering

The update system uses semantic versioning (e.g., `3.0.0`):
- GitHub releases should be tagged as `v3.0.0` or `3.0.0`
- Version in `resources/strings_de.json` and `strings_en.json` under `app.version`

**Example tag structure**:
```
v3.0.0
v3.0.1
v3.1.0
```

## Creating Releases

1. Update version number in `resources/strings_de.json` and `strings_en.json`:
   ```json
   "app": {
     "version": "3.1.0",
     "version_date": "2026-01-15"
   }
   ```

2. Commit changes and tag:
   ```bash
   git add resources/strings_*.json
   git commit -m "Release 3.1.0"
   git tag v3.1.0
   git push origin main --tags
   ```

3. Create GitHub release from tag (GitHub will automatically create ZIP)

## User Experience

When an update is available:

1. **Prompt appears** on startup:
   - DE: "Eine neue Version ist verfügbar: 3.1.0 (aktuell: 3.0.0). Möchten Sie die neue Version herunterladen und installieren?"
   - EN: "A new version is available: 3.1.0 (current: 3.0.0). Do you want to download and install it?"

2. **User clicks OK**:
   - Progress modal: "Aktualisierung wird heruntergeladen..." / "Downloading update..."
   - Files are replaced automatically
   - Application restarts

3. **User clicks Cancel**:
   - Continue with current version
   - Check again on next startup

## Troubleshooting

**Update check fails silently**:
- Check internet connection
- Verify repository name in `UPDATE_REPO`
- Check GitHub API rate limits

**Download fails**:
- Ensure GitHub release exists with proper tag
- Check file permissions in application directory
- Verify sufficient disk space

**Application doesn't restart**:
- Manually restart using `python halo.py`
- Check console for error messages

## Security Considerations

- Updates download from GitHub's official servers only
- No third-party servers involved
- User must explicitly confirm update
- User data and configuration preserved
- Original files overwritten (no backup created automatically)

## Development Mode

During development, set `UPDATE_REPO` to empty string to disable update checks.

## Technical Details

**Backend**:
- `src/halo/services/updater.py`: Update download and extraction logic
- `src/halo/api/update.py`: REST API endpoints (`/api/update`, `/api/restart`)

**Frontend**:
- `static/js/main.js`: `checkForUpdates()` function
- Checks GitHub API: `https://api.github.com/repos/{owner}/{repo}/releases/latest`
- Downloads ZIP: `https://github.com/{owner}/{repo}/archive/refs/tags/{tag}.zip`

**i18n**:
- `resources/strings_de.json` and `strings_en.json`: Update dialog texts

---

*Last updated: 2026-01-10*
