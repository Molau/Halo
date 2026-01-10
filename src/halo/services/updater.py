"""Auto-update service for downloading and installing releases from GitHub.

Copyright (c) 1992-2026 Sirko Molau
Licensed under MIT License - see LICENSE file for details.
"""

import os
import sys
import shutil
import zipfile
import tempfile
from pathlib import Path
from urllib.request import urlopen


def _download_zip(url: str, dest_path: Path) -> None:
    with urlopen(url) as resp, open(dest_path, 'wb') as out:
        shutil.copyfileobj(resp, out)


def _copy_tree(src: Path, dst: Path, exclude: list[str]) -> None:
    for root, dirs, files in os.walk(src):
        rel_root = Path(root).relative_to(src)
        # Skip excluded paths
        skip = False
        for ex in exclude:
            ex_path = Path(ex)
            if rel_root.parts[:len(ex_path.parts)] == ex_path.parts:
                skip = True
                break
        if skip:
            continue
        # Ensure destination directory exists
        target_dir = dst / rel_root
        target_dir.mkdir(parents=True, exist_ok=True)
        # Copy files
        for f in files:
            src_file = Path(root) / f
            rel_file = (rel_root / f).as_posix()
            # Exclude specific files
            if any(rel_file.startswith(ex) for ex in exclude):
                continue
            shutil.copy2(src_file, target_dir / f)


def update_from_github(repo: str, tag: str | None, root_path: Path) -> dict:
    """Download latest release or specified tag zip from GitHub and update files.

    Args:
        repo: "owner/repo" string
        tag: tag name (if None, latest from default branch is used)
        root_path: project root path
    Returns:
        dict with result
    """
    if not repo:
        return {"success": False, "error": "No repository configured"}

    # Determine zip URL
    zip_url = None
    if tag:
        zip_url = f"https://github.com/{repo}/archive/refs/tags/{tag}.zip"
    else:
        # Default branch zip
        zip_url = f"https://github.com/{repo}/archive/refs/heads/main.zip"

    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            tmpdir_path = Path(tmpdir)
            zip_path = tmpdir_path / "update.zip"
            _download_zip(zip_url, zip_path)

            extract_dir = tmpdir_path / "extract"
            extract_dir.mkdir(parents=True, exist_ok=True)
            with zipfile.ZipFile(zip_path, 'r') as zf:
                zf.extractall(extract_dir)

            # Find top-level folder in zip
            subdirs = [p for p in extract_dir.iterdir() if p.is_dir()]
            if not subdirs:
                return {"success": False, "error": "Invalid archive structure"}
            source_root = subdirs[0]

            # Copy selected directories/files
            exclude = [
                "data",
                "resources/halo.cfg",
            ]
            _copy_tree(source_root, root_path, exclude)

        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}


def restart_server(root_path: Path) -> None:
    """Spawn a new server process and exit the current one."""
    try:
        run_py = root_path / 'run.py'
        python_exec = sys.executable
        # Start new process
        shutil.which(python_exec)
        os.spawnl(os.P_NOWAIT, python_exec, python_exec, str(run_py))
    except Exception:
        # Fallback to subprocess
        import subprocess
        subprocess.Popen([python_exec, str(run_py)])
    finally:
        # Terminate current process
        os._exit(0)
