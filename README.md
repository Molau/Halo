# HALOpy - Modern HALO Observation Database
*Programm zur Erfassung von Halobeobachtungen*

Python web application for atmospheric halo observations, modernized from the original Borland Pascal software (early 1990s).

## Architecture

### Backend (Python/Flask)
- `models/` - Data structures (Observation, Observer, FilterMask)
- `services/` - Business logic (database operations, analysis, validation)
- `io/` - File I/O (CSV format, v2.5)
- `resources/` - i18n JSON strings (German/English)
- `api/` - REST API endpoints
- `web/` - Flask application

### Frontend (HTML/CSS/JavaScript)
- Responsive web interface
- Multi-language support (German/English)
- Works on desktop, tablet, and mobile

### Data
- `data/` - Observation CSV files
- 102,920 observations (1986-2005)
- 160 observers, 99 halo types, 39 regions

## Data Import/Export

### CSV Export Settings (from original HALO software)
When exporting observations from the original HALO application, use these settings:
- **Separator**: Comma (`,`)
- **Splitting**: Schlüsselelemente (key elements)

These settings ensure the CSV file has the correct 20+ field format that HALOpy expects.

## Deployment Options

### Local Development
```bash
pip install -r requirements.txt
python -m halo.web
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

Original DOS software by Sirko Molau, translated to Python in 2025-2026.
