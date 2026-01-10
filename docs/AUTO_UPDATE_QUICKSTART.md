# Quick Start: Enable Auto-Update

## Step 1: Configure Repository

Edit `src/halo/web/app.py` (around line 36):

```python
app.config.update({
    # ... other settings ...
    'UPDATE_REPO': 'your-username/HALOpy',  # ⬅️ SET THIS
})
```

**Example**:
```python
'UPDATE_REPO': 'astro-community/HALOpy',
```

## Step 2: Create GitHub Release

1. **Update version** in `resources/strings_de.json` and `resources/strings_en.json`:
   ```json
   "app": {
     "version": "3.0.0",
     "version_date": "2026-01-10"
   }
   ```

2. **Commit and tag**:
   ```bash
   git add resources/strings_*.json
   git commit -m "Release 3.0.0"
   git tag v3.0.0
   git push origin main --tags
   ```

3. **Create release on GitHub**:
   - Go to: `https://github.com/your-username/HALOpy/releases/new`
   - Select tag: `v3.0.0`
   - Click "Publish release"

## Step 3: Test

1. **Restart application**:
   ```bash
   python run.py
   ```

2. **On next startup**, update check happens automatically

3. **To test update prompt**:
   - Create a new release with version `3.0.1`
   - Restart app → should see update dialog

## Verify Configuration

Run test script:
```bash
python temp/test_autoupdate.py
```

Should show:
```
UPDATE_REPO: 'your-username/HALOpy'
  Status: ✅ ENABLED
Update Blueprint: ✅ Registered
```

## Disable Auto-Update

Set to empty string in `app.py`:
```python
'UPDATE_REPO': '',  # Disabled
```

---

That's it! Users will now be prompted for updates on startup.

**See also**:
- [docs/AUTO_UPDATE.md](AUTO_UPDATE.md) - Complete guide
- [docs/AUTO_UPDATE_SUMMARY.md](AUTO_UPDATE_SUMMARY.md) - Implementation details
