# HALOpy - Program to Collect and Analyse HALO Observation

Python web application for maintenance of halo observations, modernized from the original Borland Pascal software (early 1990s).

## Architecture

### Backend (Python/Flask)
- `models/` - Data structures (Observation dataclass, constants, halo calculations)
- `services/` - Configuration persistence (settings.py)
- `io/` - CSV file handler (ObservationCSV class)
- `resources/` - i18n JSON strings (German/English), help files, observer metadata
- `api/` - REST API endpoints (routes.py with astronomy calculations, update.py with auto-updater)
- `web/` - Flask application

### Frontend (HTML/CSS/JavaScript)
- Responsive web interface
- Multi-language support (German/English)
- Works on desktop, tablet, and mobile

### Data
- `data/` - Observation CSV files (.CSV format)
- `resources/` - Observer metadata (halobeo.csv)

## Data Import/Export

HALOpy uses **CSV format** for all observation data storage. This simplifies data handling and makes files human-readable.

### CSV Export Settings (from original HALO software)
When exporting observations from the original HALO application, use these settings:
- **Separator**: Comma (`,`)
- **Splitting**: Schlüsselelemente (key elements)

These settings ensure the CSV file has the correct 20+ field format that HALOpy expects.

### Migration from Binary Format
The original HALO software used compressed binary files (.HAL, .BEO). To migrate:
1. Export your data from the original HALO software using the CSV export function
2. Use the settings above to generate compatible CSV files
3. Import into HALOpy

## Deployment Options

### Local Development
```bash
pip install -r requirements.txt
python run.py
# Opens browser at http://localhost:5000
```

### Local Server
Run on a machine in your home/lab network, accessible from other devices.

### Cloud Deployment
Deploy to:
- Heroku
- AWS Elastic Beanstalk
- Google Cloud Run
- DigitalOcean App Platform

## Requirements

- Python 3.10+
- Flask web framework
- Modern web browser

## License

MIT License - See [LICENSE](LICENSE) file for details.

Copyright (c) 1992-2026 Sirko Molau

Free to use, modify, and distribute. Attribution appreciated.

## Original Software

Original DOS software by Sirko Molau in 1992, translated to Python in 2025-2026.
