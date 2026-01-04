import csv
from pathlib import Path
from typing import Dict, Any


class Settings:
    """Simple CSV-backed settings store compatible with halo.cfg.

    Format:
        key,value\n
        Example keys:
            - INPUT_MODE: 'M' or 'N'
            - ACTIVE_OBSERVERS_ONLY: '0' or '1'
    """

    DEFAULT_FILENAME = 'HALO.CFG'

    @staticmethod
    def _cfg_path(root_path: Path) -> Path:
        # Store cfg in resources folder alongside halobeo.csv (metadata, not observation data)
        resources_dir = root_path / 'resources'
        resources_dir.mkdir(parents=True, exist_ok=True)
        return resources_dir / Settings.DEFAULT_FILENAME

    @staticmethod
    def load_into(app_config: Dict[str, Any], root_path: Path) -> None:
        cfg_file = Settings._cfg_path(root_path)
        if not cfg_file.exists():
            # Create with current defaults
            Settings.save_from(app_config, root_path)
            return

        try:
            with open(cfg_file, 'r', encoding='utf-8', newline='') as f:
                reader = csv.reader(f)
                for row in reader:
                    if len(row) < 2:
                        continue
                    key, value = row[0], row[1]
                    if key == 'INPUT_MODE':
                        app_config['INPUT_MODE'] = value if value in ('M', 'N') else app_config.get('INPUT_MODE', 'N')
                    elif key == 'ACTIVE_OBSERVERS_ONLY':
                        app_config['ACTIVE_OBSERVERS_ONLY'] = value in ('1', 'true', 'True')
                    elif key == 'FIXED_OBSERVER':
                        app_config['FIXED_OBSERVER'] = value
        except Exception:
            # On any error, keep existing defaults
            pass

    @staticmethod
    def save_from(app_config: Dict[str, Any], root_path: Path) -> None:
        cfg_file = Settings._cfg_path(root_path)
        rows = [
            ['INPUT_MODE', app_config.get('INPUT_MODE', 'N')],
            ['ACTIVE_OBSERVERS_ONLY', '1' if app_config.get('ACTIVE_OBSERVERS_ONLY', False) else '0'],
            ['FIXED_OBSERVER', app_config.get('FIXED_OBSERVER', '')],
        ]
        with open(cfg_file, 'w', encoding='utf-8', newline='') as f:
            writer = csv.writer(f)
            writer.writerows(rows)

    @staticmethod
    def save_key(app_config: Dict[str, Any], root_path: Path, key: str, value: Any) -> None:
        # Update app_config, then write full set
        app_config[key] = value
        Settings.save_from(app_config, root_path)
